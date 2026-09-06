import { serve } from "bun";
import index from "./index.html";
import { TRIVIA_DATA, TriviaCard } from "./data/trivia";
import { maskSpoilers } from "./lib/utils";

// ─── Multiplayer Types ────────────────────────────────────────────────────────

type Category = "history" | "cinema" | "science" | "general" | "culture";

interface MPPlayer {
  id: string;
  nickname: string;
  score: number;
  lives: number;
  isHost: boolean;
  status: "waiting" | "playing" | "finished";
}

interface Room {
  code: string;
  category: Category | null;
  timer: number;
  players: Map<string, MPPlayer>;
  /** Sockets keyed by player id */
  sockets: Map<string, ServerWebSocket<WSData>>;
  status: "waiting" | "playing" | "finished";
  /** Shared shuffled deck of card IDs dealt to all players simultaneously */
  deck: string[];
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

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

/** Send a JSON message to one specific player */
function sendTo(room: Room, playerId: string, msg: object) {
  const ws = room.sockets.get(playerId);
  if (ws?.readyState === 1) ws.send(JSON.stringify(msg));
}

function getPlayerList(room: Room): MPPlayer[] {
  return Array.from(room.players.values());
}

/** Build a deck of card IDs for the given category */
function buildDeck(category: Category): string[] {
  const cards = TRIVIA_DATA.filter((c) => c.category === category || category === "general");
  return shuffle(cards.map((c) => c.id));
}

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
  if (room.status !== "waiting") {
    ws.send(JSON.stringify({ type: "error", message: "Game already in progress." }));
    return;
  }
  if (room.players.size >= 8) {
    ws.send(JSON.stringify({ type: "error", message: "Room is full (max 8 players)." }));
    return;
  }

  const playerId = generatePlayerId();
  const player: MPPlayer = {
    id: playerId,
    nickname: nickname.trim(),
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
      category: room.category,
      timer: room.timer,
    })
  );

  // Tell everyone else that a new player joined
  broadcast(room, { type: "player_joined", player }, playerId);
}

function handleStartGame(ws: ServerWebSocket<WSData>) {
  const { playerId, roomCode } = ws.data;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player?.isHost) {
    ws.send(JSON.stringify({ type: "error", message: "Only the host can start the game." }));
    return;
  }
  if (room.status !== "waiting") return;
  if (room.players.size < 2) {
    ws.send(JSON.stringify({ type: "error", message: "Need at least 2 players to start." }));
    return;
  }

  room.status = "playing";
  room.deck = buildDeck(room.category || "general");

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

  // Check if all players are done
  const allDone = Array.from(room.players.values()).every((p) => p.status === "finished");
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

const VALID_CATEGORIES = new Set(["history", "cinema", "science", "general", "culture"]);

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

function handleDisconnect(ws: ServerWebSocket<WSData>) {
  const { playerId, roomCode } = ws.data;
  if (!roomCode || !playerId) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  room.players.delete(playerId);
  room.sockets.delete(playerId);
  ws.unsubscribe(`room:${roomCode}`);

  if (room.players.size === 0) {
    // Clean up empty rooms immediately
    rooms.delete(roomCode);
    return;
  }

  // If host left, promote next player to host
  const wasHost = !Array.from(room.players.values()).some((p) => p.isHost);
  if (wasHost) {
    const nextPlayer = room.players.values().next().value;
    if (nextPlayer) {
      nextPlayer.isHost = true;
    }
  }

  broadcast(room, { type: "player_left", playerId });

  // If only 1 player remains during a game, end it
  if (room.status === "playing" && room.players.size < 2) {
    room.status = "finished";
    broadcast(room, { type: "game_over", players: getPlayerList(room) });
  }
}

// Note: shuffle() is already defined above in the multiplayer section

function parseWikidataYear(dateStr: string): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^([+-]?\d+)/);
  if (match) {
    const year = parseInt(match[1], 10);
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
  history: `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
      ?item wdt:P17 wd:Q668 ;
            wdt:P18 ?image .
      { ?item wdt:P31 wd:Q178561 ; wdt:P585 ?date . }
      UNION
      { ?item wdt:P31 wd:Q1190554 ; wdt:P585 ?date . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 150
  `,
  cinema: `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
      ?item wdt:P31 wd:Q11424 ;
            wdt:P495 wd:Q668 ;
            wdt:P18 ?image ;
            wdt:P577 ?date .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 150
  `,
  science: `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
      ?item wdt:P17 wd:Q668 ;
            wdt:P18 ?image .
      { ?item wdt:P31 wd:Q26540 ; wdt:P619 ?date . }
      UNION
      { ?item wdt:P31 wd:Q223799 ; wdt:P619 ?date . }
      UNION
      { ?item wdt:P31 wd:Q3918 ; wdt:P571 ?date . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 150
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
    LIMIT 200
  `
};


function filterHighQualityWikidataCards(bindings: any[], category: string): TriviaCard[] {
  const cards: TriviaCard[] = [];
  const EXCLUDE_PATTERNS = [
    /wikimedia/i, /wikipedia/i, /subdivision/i, /administrative unit/i,
    /item/i, /category/i, /disambiguation/i, /human settlement in India/i,
    /inscription/i, /hero stone/i, /hospital/i, /school/i, /demolished/i,
    /zamindar/i, /residence/i, /undefined/i, /building in/i, /office/i, /bank/i,
    /village/i, /district/i, /constituency/i, /railway station/i, /bus station/i
  ];

  for (const b of bindings) {
    const qid = (b.item?.value || "").split("/").pop() || "";
    const title = (b.itemLabel?.value || "").trim();
    const description = (b.itemDescription?.value || "").trim();
    const year = parseWikidataYear(b.date?.value || "");
    const image = getWikimediaImageUrl(b.image?.value);


    if (!title || title.length < 3 || /^Q\d+$/i.test(title)) continue;


    if (!image) continue;


    if (year === null) continue;


    if (!description || description.length < 10) continue;
    if (EXCLUDE_PATTERNS.some(p => p.test(title) || p.test(description))) continue;

    cards.push({
      id: `wikidata_${category}_${qid}`,
      title: maskSpoilers(title),
      description: maskSpoilers(description),
      year,
      category: category as any,
      image
    });
  }

  return cards;
}

function processCustomSparqlBindings(bindings: any[]): TriviaCard[] {
  const cards: TriviaCard[] = [];
  
  // Auto-detect date variable names (common SPARQL patterns)
  const dateVarNames = ["date", "inception", "publicationDate", "pointInTime",
                        "startDate", "foundingDate", "dateOfBirth", "time"];
  // Auto-detect image variable names
  const imageVarNames = ["image", "img", "picture", "pic", "thumbnail"];

  for (const b of bindings) {
    const qid = (b.item?.value || "").split("/").pop() || "";
    const title = (b.itemLabel?.value || "").trim();
    const description = (b.itemDescription?.value || "").trim();

    if (!title || title.length < 3 || /^Q\d+$/i.test(title)) continue;

    // Find date from any matching variable
    let year: number | null = null;
    for (const v of dateVarNames) {
      if (b[v]?.value) {
        year = parseWikidataYear(b[v].value);
        if (year !== null) break;
      }
    }
    if (year === null) continue; // Year is mandatory for the timeline game

    // Find image from any matching variable
    let image: string | null = null;
    for (const v of imageVarNames) {
      if (b[v]?.value) {
        image = getWikimediaImageUrl(b[v].value);
        if (image) break;
      }
    }

    cards.push({
      id: `custom_${qid}`,
      title: maskSpoilers(title),
      description: maskSpoilers(description || title),
      year,
      category: "custom" as any,
      image: image || ""
    });
  }

  return cards;
}

async function fetchDynamicWikidataCards(category: string): Promise<TriviaCard[]> {
  const sparqlQuery = CATEGORY_SPARQL[category] || CATEGORY_SPARQL["history"];
  if (!sparqlQuery) return [];

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
  
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

    if (!res.ok) return [];

    const data = await res.json();
    const bindings = data.results?.bindings || [];
    const allCards = filterHighQualityWikidataCards(bindings, category);

    // Randomly sample a subset from the larger pool so each game gets different cards
    const DYNAMIC_CARDS_PER_GAME = 30;
    return shuffle(allCards).slice(0, DYNAMIC_CARDS_PER_GAME);
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[Wikidata SPARQL Fetch Fallback] Category ${category}:`, (err as any).message);
    return [];
  }
}

const server = serve<WSData>({
  routes: {
    "/*": index,

    "/api/wikidata": async req => {
      const url = new URL(req.url);
      const category = url.searchParams.get("category") || "general";

      try {
        let curatedCards = TRIVIA_DATA.filter(card => card.category === category);
        
        if (category === "general" || curatedCards.length < 2) {
          curatedCards = [...TRIVIA_DATA];
        }

        const sanitizedCurated = curatedCards.map(card => ({
          ...card,
          title: maskSpoilers(card.title || ""),
          description: maskSpoilers(card.description || "")
        }));

        const shuffledCurated = shuffle(sanitizedCurated);
        const seenTitles = new Set(shuffledCurated.map(c => c.title.toLowerCase()));

        const dynamicCards = await fetchDynamicWikidataCards(category);
        const filteredDynamic: TriviaCard[] = [];

        for (const card of dynamicCards) {
          const normTitle = card.title.toLowerCase();
          if (!seenTitles.has(normTitle)) {
            seenTitles.add(normTitle);
            filteredDynamic.push(card);
          }
        }

        const shuffledDynamic = shuffle(filteredDynamic);
        const finalDeck = [...shuffledCurated, ...shuffledDynamic];

        return new Response(JSON.stringify(finalDeck), {
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

    "/api/custom-sparql": async req => {
      if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      try {
        const body = await req.json();
        const sparqlQuery = (body.query || "").trim();

        if (!sparqlQuery || sparqlQuery.length > 5000) {
          return new Response(JSON.stringify({ error: "Invalid or too-long query (max 5000 chars)" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Safety: only allow wikibase:label SERVICE blocks
        const serviceMatches = [...sparqlQuery.matchAll(/SERVICE\s+(\S+)/gi)];
        for (const m of serviceMatches) {
          if (!m[1].includes("wikibase:label")) {
            return new Response(JSON.stringify({
              error: "Only SERVICE wikibase:label is allowed for safety"
            }), { status: 400, headers: { "Content-Type": "application/json" } });
          }
        }

        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "IndianTriviaGame/2.0 (contact@indiantrivia.app)",
            "Accept": "application/sparql-results+json"
          }
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errText = await res.text();
          return new Response(JSON.stringify({
            error: `Wikidata returned ${res.status}`,
            detail: errText.slice(0, 500)
          }), { status: 502, headers: { "Content-Type": "application/json" } });
        }

        const data = await res.json();
        const bindings = data.results?.bindings || [];
        const cards = processCustomSparqlBindings(bindings);

        return new Response(JSON.stringify({ cards, totalRaw: bindings.length }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
          }
        });
      } catch (err: any) {
        const message = err?.name === "AbortError"
          ? "Query timed out (15s limit). Try simplifying your query or reducing the LIMIT."
          : (err?.message || "Unknown error");
        return new Response(JSON.stringify({ error: message }), {
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

    open(ws) {
      // ws.data is initialized with defaults from the upgrade call
    },

    message(ws, raw) {
      let msg: { type: string; [key: string]: any };
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
          ws.send(JSON.stringify({ type: "error", message: `Unknown message type: ${msg.type}` }));
      }
    },

    close(ws) {
      handleDisconnect(ws);
    },

    drain(_ws) {
      // Bun handles backpressure automatically; nothing needed here
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
console.log(`🎮 WebSocket multiplayer endpoint: ws://${server.hostname}:${server.port}/ws`);
