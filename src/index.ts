/**
 * Bun server: serves the SPA, a Wikidata-backed card API, and the multiplayer
 * WebSocket protocol (rooms, shared decks, score sync). See src/lib/mp-protocol.ts
 * for the client⇄server message contract.
 */
import { serve } from "bun";
import index from "./index.html";
import { TRIVIA_DATA, type TriviaCard } from "./data/trivia";
import { maskSpoilers, shuffle } from "./lib/utils";
import type { Category } from "./hooks/useGameState";
import type { ClientMessage, MPPlayer, MPRoomStatus } from "./lib/mp-protocol";

// ─── Multiplayer Types ────────────────────────────────────────────────────────

interface Room {
  code: string;
  category: Category | null;
  timer: number;
  players: Map<string, MPPlayer>;
  /** Sockets keyed by player id */
  sockets: Map<string, ServerWebSocket<WSData>>;
  status: MPRoomStatus;
  /** Shared masked deck dealt to all players simultaneously */
  deck: TriviaCard[];
  /** Next Wikidata page to serve when players ask for more cards */
  dealPage: number;
  /** Timestamp of last top-up deal (throttles request_cards) */
  lastDealAt?: number;
  createdAt: number;
}

interface WSData {
  playerId: string;
  roomCode: string | null;
}

type ServerWebSocket<T> = import("bun").ServerWebSocket<T>;

// ─── Room Store ───────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

/** Prune rooms older than 2 hours with no active players */
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.sockets.size === 0 && now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}, 10 * 60 * 1000); // run every 10 minutes

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function generatePlayerId(): string {
  return crypto.randomUUID();
}

/** Broadcast a JSON message to every connected player in a room */
function broadcast(room: Room, msg: object, excludeId?: string) {
  const payload = JSON.stringify(msg);
  for (const [id, ws] of room.sockets) {
    if (id !== excludeId && ws.readyState === 1 /* OPEN */) {
      ws.send(payload);
    }
  }
}

function getPlayerList(room: Room): MPPlayer[] {
  return Array.from(room.players.values());
}

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  "history",
  "cinema",
  "science",
  "general",
  "culture",
]);

// ─── WebSocket Message Handlers ───────────────────────────────────────────────

function handleCreateRoom(
  ws: ServerWebSocket<WSData>,
  payload: { nickname: string; category: Category; timer?: number }
) {
  const { nickname, category, timer } = payload;
  if (!nickname?.trim() || nickname.trim().length < 2 || nickname.trim().length > 16) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid nickname (2–16 characters)." }));
    return;
  }
  if (!VALID_CATEGORIES.has(category)) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid category." }));
    return;
  }

  const code = generateRoomCode();
  const playerId = generatePlayerId();

  const player: MPPlayer = {
    id: playerId,
    nickname: nickname.trim(),
    score: 0,
    lives: 3,
    isHost: true,
    status: "waiting",
  };

  const room: Room = {
    code,
    category,
    timer: typeof timer === "number" && timer >= 0 ? timer : 0,
    players: new Map([[playerId, player]]),
    sockets: new Map([[playerId, ws]]),
    status: "waiting",
    deck: [],
    dealPage: 0,
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  ws.data.playerId = playerId;
  ws.data.roomCode = code;
  ws.subscribe(`room:${code}`);

  ws.send(
    JSON.stringify({
      type: "room_joined",
      roomCode: code,
      playerId,
      isHost: true,
      players: getPlayerList(room),
      status: room.status,
      category: room.category,
      timer: room.timer,
    })
  );
}

function handleJoinRoom(
  ws: ServerWebSocket<WSData>,
  payload: { roomCode: string; nickname: string }
) {
  const { roomCode, nickname } = payload;
  const code = (roomCode || "").trim().toUpperCase();

  if (!code || code.length !== 6) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid room code." }));
    return;
  }
  if (!nickname?.trim() || nickname.trim().length < 2 || nickname.trim().length > 16) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid nickname (2–16 characters)." }));
    return;
  }

  const room = rooms.get(code);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", message: "Room not found. Check your code!" }));
    return;
  }

  const nick = nickname.trim();

  // Mid-game rejoin: a dropped player reclaims their seat (matched by nickname)
  if (room.status !== "waiting") {
    const existing = Array.from(room.players.values()).find(
      (p) => p.nickname.toLowerCase() === nick.toLowerCase()
    );

    // No seat to reclaim (or it's still actively connected) — regular join rules apply
    if (!existing || room.sockets.get(existing.id)?.readyState === 1) {
      ws.send(JSON.stringify({ type: "error", message: "Game already in progress." }));
      return;
    }

    const oldId = existing.id;
    const playerId = generatePlayerId();
    room.sockets.delete(oldId);
    room.players.delete(oldId);
    existing.id = playerId;
    room.players.set(playerId, existing);
    room.sockets.set(playerId, ws);
    ws.data.playerId = playerId;
    ws.data.roomCode = code;
    ws.subscribe(`room:${code}`);

    // The seat survives a drop, but the player's personal board state does not —
    // they replay the shared deck from the top. Reset and announce it.
    if (room.status === "playing") {
      existing.score = 0;
      existing.lives = 3;
      existing.status = "playing";
    }

    ws.send(
      JSON.stringify({
        type: "room_joined",
        roomCode: code,
        playerId,
        isHost: existing.isHost,
        players: getPlayerList(room),
        status: room.status,
        // Mid-game rejoins need the shared deck to resume play
        ...(room.status === "playing" ? { category: room.category, deck: room.deck } : {}),
      })
    );

    broadcast(room, { type: "player_left", playerId: oldId });
    broadcast(room, { type: "player_joined", player: existing }, playerId);
    if (room.status === "playing") {
      broadcast(room, { type: "score_update", playerId, score: 0, lives: 3 }, playerId);
    }
    return;
  }

  if (room.players.size >= 8) {
    ws.send(JSON.stringify({ type: "error", message: "Room is full (max 8 players)." }));
    return;
  }
  if (Array.from(room.players.values()).some((p) => p.nickname.toLowerCase() === nick.toLowerCase())) {
    ws.send(JSON.stringify({ type: "error", message: "That nickname is taken in this room." }));
    return;
  }

  const playerId = generatePlayerId();
  const player: MPPlayer = {
    id: playerId,
    nickname: nick,
    score: 0,
    lives: 3,
    isHost: false,
    status: "waiting",
  };

  room.players.set(playerId, player);
  room.sockets.set(playerId, ws);
  ws.data.playerId = playerId;
  ws.data.roomCode = code;
  ws.subscribe(`room:${code}`);

  // Tell the joiner about the current room state
  ws.send(
    JSON.stringify({
      type: "room_joined",
      roomCode: code,
      playerId,
      isHost: false,
      players: getPlayerList(room),
      status: room.status,
      category: room.category,
      timer: room.timer,
    })
  );

  // Tell everyone else that a new player joined
  broadcast(room, { type: "player_joined", player }, playerId);
}

async function handleStartGame(ws: ServerWebSocket<WSData>) {
  const { playerId, roomCode } = ws.data;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player?.isHost) {
    ws.send(JSON.stringify({ type: "error", message: "Only the host can start the game." }));
    return;
  }
  // "finished" is allowed so the host can run it back with PLAY AGAIN
  if (room.status === "playing") return;
  if (room.players.size < 2) {
    ws.send(JSON.stringify({ type: "error", message: "Need at least 2 players to start." }));
    return;
  }

  room.status = "playing";
  room.deck = (await getDeck(room.category || "general")) ?? [];

  // Reset all player stats for fresh game
  for (const p of room.players.values()) {
    p.score = 0;
    p.lives = 3;
    p.status = "playing";
  }

  broadcast(room, {
    type: "game_started",
    category: room.category,
    deck: room.deck,
    timer: room.timer,
  });
}

function handleScoreUpdate(
  ws: ServerWebSocket<WSData>,
  payload: { score: number; lives: number }
) {
  const { playerId, roomCode } = ws.data;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  // Validate: score can only increase; lives can only decrease (anti-cheat)
  if (
    typeof payload.score !== "number" ||
    typeof payload.lives !== "number" ||
    payload.score < player.score ||
    payload.lives > player.lives ||
    payload.lives < 0 ||
    payload.score > 9999
  ) {
    return; // Silently drop invalid update
  }

  player.score = payload.score;
  player.lives = payload.lives;

  broadcast(room, { type: "score_update", playerId, score: player.score, lives: player.lives });
}

function handlePlayerFinished(ws: ServerWebSocket<WSData>, payload: { finalScore: number }) {
  const { playerId, roomCode } = ws.data;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  player.status = "finished";
  player.score = Math.max(player.score, payload.finalScore ?? player.score);

  broadcast(room, { type: "player_finished", playerId, finalScore: player.score });

  // Check if all players are done (disconnected players count as done —
  // they may never come back, and their seat is kept for the scoreboard)
  const allDone = Array.from(room.players.values()).every(
    (p) => p.status === "finished" || !room.sockets.has(p.id)
  );
  if (allDone) {
    room.status = "finished";
    broadcast(room, { type: "game_over", players: getPlayerList(room) });
  }
}

function handleReturnToLobby(ws: ServerWebSocket<WSData>) {
  const { playerId, roomCode } = ws.data;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  // Only allow returning to lobby when the game is finished
  if (room.status !== "finished") return;

  // Reset room status
  room.status = "waiting";
  room.deck = [];
  room.dealPage = 0;

  // Reset all player states
  for (const p of room.players.values()) {
    p.score = 0;
    p.lives = 3;
    p.status = "waiting";
  }

  // Broadcast to all players so they transition back to the lobby
  broadcast(room, {
    type: "room_returned_to_lobby",
    roomCode: room.code,
    players: getPlayerList(room),
    category: room.category,
    timer: room.timer,
  });
}

function handleLeaveRoom(ws: ServerWebSocket<WSData>) {
  // Re-use the existing disconnect logic to cleanly remove the player
  handleDisconnect(ws);
  // Clear the ws data so it doesn't try to leave again on close
  ws.data.playerId = "";
  ws.data.roomCode = null;
}

function handleChangeCategory(
  ws: ServerWebSocket<WSData>,
  payload: { category: string }
) {
  const { playerId, roomCode } = ws.data;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player?.isHost) {
    ws.send(JSON.stringify({ type: "error", message: "Only the host can change the category." }));
    return;
  }
  if (room.status !== "waiting") return;

  if (!VALID_CATEGORIES.has(payload.category)) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid category." }));
    return;
  }

  room.category = payload.category as Category;
  broadcast(room, { type: "category_changed", category: room.category });
}

function handleChangeTimer(
  ws: ServerWebSocket<WSData>,
  payload: { timer: number }
) {
  const { playerId, roomCode } = ws.data;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player?.isHost) {
    ws.send(JSON.stringify({ type: "error", message: "Only the host can change the timer." }));
    return;
  }
  if (room.status !== "waiting") return;

  const timer = typeof payload.timer === "number" && payload.timer >= 0 ? payload.timer : 0;
  room.timer = timer;
  broadcast(room, { type: "timer_changed", timer: room.timer });
}

// ─── Shared deck top-ups ──────────────────────────────────────────────────────

const DEAL_COOLDOWN_MS = 4000;

/** Any player can ask for more shared cards when the deck runs low. The server
 *  deals ONE fresh page and broadcasts it to everyone, so all decks stay identical.
 *  An empty batch signals "pool exhausted" so clients stop asking. */
async function handleRequestCards(ws: ServerWebSocket<WSData>) {
  const { playerId, roomCode } = ws.data;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room || room.status !== "playing") return;
  if (!room.players.has(playerId)) return;

  const now = Date.now();
  if (room.lastDealAt && now - room.lastDealAt < DEAL_COOLDOWN_MS) return;
  room.lastDealAt = now;

  const dealtIds = new Set(room.deck.map((c) => c.id));
  const nextPage = room.dealPage + 1;
  let pageCards = await getDeck(room.category || "general", nextPage);

  if (pageCards === null) {
    // Transient failure (rate limit / network) — retry once before giving up
    await new Promise((r) => setTimeout(r, 1500));
    pageCards = await getDeck(room.category || "general", nextPage);
  }
  if (pageCards === null) return; // say nothing; clients re-request after cooldown

  if (pageCards.length === 0) {
    // Bottom of the Wikidata pool — tell clients so they stop requesting
    broadcast(room, { type: "cards_dealt", cards: [] });
    return;
  }

  const fresh = pageCards.filter((c) => !dealtIds.has(c.id));
  if (fresh.length === 0) {
    // Page fully overlapped with what's already dealt; try the next one next time
    broadcast(room, { type: "cards_dealt", cards: [] });
    return;
  }

  room.dealPage = nextPage;
  room.deck.push(...fresh);
  broadcast(room, { type: "cards_dealt", cards: fresh });
}

function handleDisconnect(ws: ServerWebSocket<WSData>) {
  const { playerId, roomCode } = ws.data;
  if (!roomCode || !playerId) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  room.sockets.delete(playerId);
  ws.unsubscribe(`room:${roomCode}`);

  // Everyone gone — clean up the room immediately
  if (room.sockets.size === 0) {
    rooms.delete(roomCode);
    return;
  }

  if (room.status === "waiting") {
    // Lobby: leaving removes you entirely
    room.players.delete(playerId);

    // If host left, promote next player to host
    if (!Array.from(room.players.values()).some((p) => p.isHost)) {
      const nextPlayer = room.players.values().next().value;
      if (nextPlayer) {
        nextPlayer.isHost = true;
        broadcast(room, { type: "player_left", playerId });
        broadcast(room, { type: "host_changed", playerId: nextPlayer.id });
        return;
      }
    }

    broadcast(room, { type: "player_left", playerId });
    return;
  }

  // In-game / finished: keep the seat reserved so the player can rejoin
  // with their score intact. If fewer than 2 players remain connected
  // during play, there is nobody to play against — end the game.
  if (room.status === "playing" && room.sockets.size < 2) {
    room.status = "finished";
    broadcast(room, { type: "game_over", players: getPlayerList(room) });
  }

  // If the host dropped, hand the crown to a connected player so the
  // room stays administrable even if the host never comes back.
  const hostGone = !Array.from(room.players.values()).some(
    (p) => p.isHost && room.sockets.has(p.id)
  );
  if (hostGone) {
    const nextHost = Array.from(room.players.values()).find((p) => room.sockets.has(p.id));
    if (nextHost) {
      nextHost.isHost = true;
      broadcast(room, { type: "host_changed", playerId: nextHost.id });
    }
  }
}

function parseWikidataYear(dateStr: string): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^([+-]?\d+)/);
  if (match) {
    const year = parseInt(match[1] ?? "", 10);
    if (isNaN(year) || year < -3000 || year > 2026) return null;
    return year;
  }
  return null;
}

function getWikimediaImageUrl(imagePropValue?: string): string | null {
  if (!imagePropValue) return null;
  let filename = imagePropValue;
  if (filename.includes("Special:FilePath/")) {
    filename = filename.split("Special:FilePath/").pop() || filename;
  } else if (filename.includes("http")) {
    filename = decodeURIComponent(filename.split("/").pop() || filename);
  }
  filename = decodeURIComponent(filename).replace(/ /g, "_");
  if (!filename) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=400`;
}

const CATEGORY_SPARQL: Record<string, string> = {
  // NOTE: no LIMIT here — buildSparqlQuery() pages results with LIMIT/OFFSET
  // so top-up deals can serve genuinely fresh cards.
  history: `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image ?sitelinks WHERE {
      ?item wdt:P17 wd:Q668 ;
            wdt:P18 ?image ;
            wikibase:sitelinks ?sitelinks .
      { ?item wdt:P31 wd:Q178561 ; wdt:P585 ?date . }
      UNION
      { ?item wdt:P31 wd:Q1190554 ; wdt:P585 ?date . }
      FILTER(?sitelinks > 3)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?sitelinks)
  `,
  cinema: `
    # Landmark Hindi cinema + notable Malayalam cinema only (audience-facing mix)
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image ?sitelinks WHERE {
      ?item wdt:P31 wd:Q11424 ;
            wdt:P495 wd:Q668 ;
            wdt:P577 ?date ;
            wdt:P364 ?lang ;
            wikibase:sitelinks ?sitelinks .
      OPTIONAL { ?item wdt:P18 ?image . }
      FILTER(?lang IN (wd:Q11051, wd:Q36236))
      FILTER(?sitelinks > 5)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?sitelinks)
  `,
  science: `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image ?sitelinks WHERE {
      ?item wdt:P17 wd:Q668 ;
            wdt:P18 ?image ;
            wikibase:sitelinks ?sitelinks .
      { ?item wdt:P31 wd:Q26540 ; wdt:P619 ?date . }
      UNION
      { ?item wdt:P31 wd:Q223799 ; wdt:P619 ?date . }
      UNION
      { ?item wdt:P31 wd:Q3918 ; wdt:P571 ?date . }
      FILTER(?sitelinks > 5)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?sitelinks)
  `,
  culture: `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image ?sitelinks WHERE {
      ?item wdt:P17 wd:Q668 ;
            wdt:P18 ?image ;
            wikibase:sitelinks ?sitelinks .
      { ?item wdt:P31 wd:Q23413 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q16560 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q839954 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q180968 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q193290 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q44539 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q32815 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q44613 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P1435 wd:Q9259 ; wdt:P571 ?date . }
      FILTER(?sitelinks > 10)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?sitelinks)
  `
};


function filterHighQualityWikidataCards(bindings: any[], category: string): TriviaCard[] {
  const cards: TriviaCard[] = [];
  // One card per Wikidata item — rows can repeat when an item has several
  // publication dates or images.
  const seenQids = new Set<string>();
  // Filters out boilerplate/low-quality Wikidata entries (settlements, admin
  // units, disambiguation pages, generic infrastructure). Notability itself is
  // handled by the sitelinks threshold in each SPARQL query, so significant
  // structures (famous temples, landmark bridges, superlatives) survive while
  // obscure trivia articles are dropped before they get here.
  const EXCLUDE_PATTERNS = [
    /wikimedia/i, /wikipedia/i, /subdivision/i, /administrative unit/i,
    /item/i, /category/i, /disambiguation/i, /human settlement in India/i,
    /inscription/i, /hero stone/i, /hospital/i, /school/i, /demolished/i,
    /zamindar/i, /residence/i, /undefined/i, /building in/i, /office/i, /bank/i,
    /village/i, /district/i, /constituency/i, /railway station/i, /bus station/i
  ];

  for (const b of bindings) {
    const qid = (b.item?.value || "").split("/").pop() || "";
    if (!qid || seenQids.has(qid)) continue;
    const title = (b.itemLabel?.value || "").trim();
    const description = (b.itemDescription?.value || "").trim();
    const year = parseWikidataYear(b.date?.value || "");
    const image = getWikimediaImageUrl(b.image?.value);

    if (!title || title.length < 3 || /^Q\d+$/i.test(title)) continue;
    if (year === null) continue;
    if (!description || description.length < 10) continue;
    if (EXCLUDE_PATTERNS.some(p => p.test(title) || p.test(description))) continue;

    seenQids.add(qid);
    cards.push({
      id: `wikidata_${category}_${qid}`,
      title: maskSpoilers(title),
      description: maskSpoilers(description),
      year,
      category: category as any,
      image: image ?? ""
    });
  }

  return cards;
}

// ─── Mythology balance ────────────────────────────────────────────────────────

/** Detects religious-mythology content (epics, scriptures, deities). Used to
 *  CAP such cards per deck rather than exclude them: the audience is general,
 *  so decks include a little of it (Vedas, Ramayana, origins of Hinduism) but
 *  never let it dominate history/culture. */
const MYTHOLOGY_PATTERN =
  /\b(mytholog\w*|epic poetry|ramayana|mahabharata|ramcharitmanas|veda[s]?|vedic|upanishad\w*|purana\w*|itihasa|bhagavad[ -]gita|bhagavata|scripture\w*|deit(y|ies)|god[dess]? of|avatar of)\b/i;

const MAX_MYTHOLOGY_CARDS_PER_DECK = 4;

/** Keep at most MAX_MYTHOLOGY_CARDS_PER_DECK religious/mythology cards */
function applyMythologyQuota(cards: TriviaCard[]): TriviaCard[] {
  let kept = 0;
  return cards.filter((c) => {
    const religious =
      MYTHOLOGY_PATTERN.test(c.title) || MYTHOLOGY_PATTERN.test(c.description);
    if (!religious) return true;
    kept += 1;
    return kept <= MAX_MYTHOLOGY_CARDS_PER_DECK;
  });
}

// ─── Wikidata fetch (cached, paged) ──────────────────────────────────────────

const PAGE_SIZE = 40;
const SPARQL_CACHE_TTL_MS = 10 * 60 * 1000;
const sparqlCache = new Map<string, { cards: TriviaCard[]; at: number }>();

function buildSparqlQuery(category: string, page: number): string {
  return `${CATEGORY_SPARQL[category]}\nLIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}`;
}

/** Fetch one page of dynamic cards for a category.
 *  Returns null on TRANSIENT failure (network/rate limit) vs [] when the pool
 *  genuinely has no more items — callers treat these differently. */
async function fetchDynamicWikidataCards(category: string, page = 0): Promise<TriviaCard[] | null> {
  // "general" pulls from every category's SPARQL query in parallel
  if (category === "general") {
    const results = await Promise.all(
      Object.keys(CATEGORY_SPARQL).map((cat) => fetchDynamicWikidataCards(cat, page))
    );
    // One failed category fails the batch — partial decks would be misleading
    if (results.some((r) => r === null)) return null;
    return (results as TriviaCard[][]).flat();
  }

  const sparqlQuery = CATEGORY_SPARQL[category];
  if (!sparqlQuery) return [];

  const cacheKey = `${category}:${page}`;
  const cached = sparqlCache.get(cacheKey);
  if (cached && Date.now() - cached.at < SPARQL_CACHE_TTL_MS) return cached.cards;

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(buildSparqlQuery(category, page))}&format=json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "IndianTriviaGame/2.0 (contact@indiantrivia.app)",
        "Accept": "application/sparql-results+json"
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    const bindings = data.results?.bindings || [];
    const cards = filterHighQualityWikidataCards(bindings, category);
    sparqlCache.set(cacheKey, { cards, at: Date.now() });
    return cards;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[Wikidata SPARQL Fetch Fallback] Category ${category}:`, (err as Error).message);
    return null;
  }
}

/** Build a shuffled, spoiler-masked deck for the given pool page.
 *  Page 0 leads with the curated set and is always playable (falls back to
 *  curated-only if Wikidata is down); later pages serve fresh Wikidata cards
 *  for top-ups and return null on transient failure.
 *  Used by both /api/wikidata and multiplayer dealing. */
async function getDeck(category: Category, page = 0): Promise<TriviaCard[] | null> {
  const seenTitles = new Set<string>();
  let deck: TriviaCard[] = [];

  if (page === 0) {
    let curated = TRIVIA_DATA.filter((c) => c.category === category);
    if (category === "general" || curated.length < 2) {
      curated = [...TRIVIA_DATA];
    }
    deck = shuffle(
      curated.map((card) => ({
        ...card,
        title: maskSpoilers(card.title || ""),
        description: maskSpoilers(card.description || ""),
      }))
    );
    for (const c of deck) seenTitles.add(c.title.toLowerCase());
  }

  const dynamicCards = await fetchDynamicWikidataCards(category, page);
  if (dynamicCards === null) {
    // Transient failure: page 0 still plays with curated cards alone
    return page === 0 ? deck : null;
  }

  deck.push(
    ...shuffle(
      dynamicCards.filter((c) => {
        const normTitle = c.title.toLowerCase();
        if (seenTitles.has(normTitle)) return false;
        seenTitles.add(normTitle);
        return true;
      })
    )
  );

  return applyMythologyQuota(deck);
}

const server = serve<WSData>({
  routes: {
    "/*": index,

    "/api/wikidata": async (req: Request) => {
      const url = new URL(req.url);
      const category = url.searchParams.get("category") || "general";

      try {
        // page 0 is always playable (curated fallback), so never null here
        const deck = (await getDeck(category as Category)) ?? [];

        return new Response(JSON.stringify(deck), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
          }
        });
      } catch (err: any) {
        console.error(`[API Error]`, err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
  },

  // ─── WebSocket Upgrade ────────────────────────────────────────────────────
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: { playerId: "", roomCode: null } satisfies WSData,
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 500 });
    }
    // All other requests fall through to routes
    return new Response("Not Found", { status: 404 });
  },

  // ─── WebSocket Handlers ───────────────────────────────────────────────────
  websocket: {
    idleTimeout: 60, // 60s — Bun will ping automatically; close stale connections

    message(ws, raw) {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw as string);
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON." }));
        return;
      }

      switch (msg.type) {
        case "create_room":
          handleCreateRoom(ws, { nickname: msg.nickname, category: msg.category, timer: msg.timer });
          break;
        case "join_room":
          handleJoinRoom(ws, { roomCode: msg.roomCode, nickname: msg.nickname });
          break;
        case "start_game":
          handleStartGame(ws);
          break;
        case "score_update":
          handleScoreUpdate(ws, { score: msg.score, lives: msg.lives });
          break;
        case "player_finished":
          handlePlayerFinished(ws, { finalScore: msg.finalScore });
          break;
        case "request_cards":
          handleRequestCards(ws);
          break;
        case "return_to_lobby":
          handleReturnToLobby(ws);
          break;
        case "leave_room":
          handleLeaveRoom(ws);
          break;
        case "change_category":
          handleChangeCategory(ws, { category: msg.category });
          break;
        case "change_timer":
          handleChangeTimer(ws, { timer: msg.timer });
          break;
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
        default:
          ws.send(JSON.stringify({ type: "error", message: `Unknown message type: ${(msg as any).type}` }));
      }
    },

    close(ws) {
      handleDisconnect(ws);
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
console.log(`🎮 WebSocket multiplayer endpoint: ws://${server.hostname}:${server.port}/ws`);
