/**
 * Multiplayer connection + room state. Owns the WebSocket lifecycle
 * (connect, heartbeat, auto-reconnect with backoff) and translates server
 * messages into React state. Game rules stay in useGameState; this hook only
 * mirrors room/score state and exposes senders for it.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { Category } from "./useGameState";
import type { TriviaCard } from "../data/trivia";
import type { ClientMessage, MPRoomStatus, MPPlayer, ServerMessage } from "../lib/mp-protocol";

export type { MPPlayer };

// ─── Hook State Types ────────────────────────────────────────────────────────

export type MultiplayerStatus =
  | "idle"         // not connected
  | "connecting"   // WS handshake in progress
  | "lobby"        // in room, waiting for host to start
  | "playing"      // game running
  | "results"      // game finished, showing results
  | "error";       // unrecoverable error

export interface MPRoomState {
  roomCode: string;
  players: MPPlayer[];
  category: Category | null;
  /** Server-dealt shared deck every player plays through */
  deck: TriviaCard[];
  timer: number;
  status: MPRoomStatus;
}
// ─── Hook ────────────────────────────────────────────────────────────────────

const PING_INTERVAL_MS = 25_000;
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000]; // max 3 attempts

export function useMultiplayer() {
  const [status, setStatus] = useState<MultiplayerStatus>("idle");
  const [room, setRoom] = useState<MPRoomState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectInfoRef = useRef<{ nickname: string; roomCode: string } | null>(null);
  const lastNickRef = useRef("");
  const myIdRef = useRef<string | null>(null);
  /** Set when the server signals the shared-card pool is exhausted */
  const deckExhaustedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (wsRef.current) {
      // Prevent onclose handler from triggering reconnect on intentional close
      wsRef.current.onclose = null;
      wsRef.current.close(1000, "client_cleanup");
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const startPing = useCallback(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    pingTimerRef.current = setInterval(() => {
      send({ type: "ping" });
    }, PING_INTERVAL_MS);
  }, [send]);

  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case "room_joined":
          setMyId(msg.playerId);
          myIdRef.current = msg.playerId;
          setIsHost(msg.isHost);
          setRoom({
            roomCode: msg.roomCode,
            players: msg.players,
            category: msg.category ?? null,
            deck: msg.deck ?? [],
            timer: msg.timer ?? 0,
            status: msg.status,
          });
          // Arm auto-reconnect now that we know which room we belong to
          reconnectInfoRef.current = { nickname: lastNickRef.current, roomCode: msg.roomCode };
          if (msg.status === "finished") {
            setStatus("results");
          } else if (msg.status === "playing") {
            // Mid-game rejoin — jump straight back into the running game
            setStatus("playing");
          } else {
            setStatus("lobby");
          }
          break;

        case "player_joined":
          setRoom((prev) =>
            prev ? { ...prev, players: [...prev.players, msg.player] } : prev
          );
          break;

        case "player_left":
          setRoom((prev) =>
            prev ? { ...prev, players: prev.players.filter((p) => p.id !== msg.playerId) } : prev
          );
          break;

        case "host_changed":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  players: prev.players.map((p) => ({ ...p, isHost: p.id === msg.playerId })),
                }
              : prev
          );
          if (msg.playerId === myIdRef.current) setIsHost(true);
          break;

        case "game_started":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  category: msg.category,
                  timer: msg.timer ?? prev.timer,
                  deck: msg.deck,
                  status: "playing",
                }
              : prev
          );
          deckExhaustedRef.current = false;
          setStatus("playing");
          break;

        case "cards_dealt":
          // Server-dealt top-up — appended identically for every player.
          // An empty batch means the shared pool is exhausted.
          setRoom((prev) =>
            prev ? { ...prev, deck: [...prev.deck, ...msg.cards] } : prev
          );
          deckExhaustedRef.current = msg.cards.length === 0;
          break;

        case "score_update":
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map((p) =>
                p.id === msg.playerId ? { ...p, score: msg.score, lives: msg.lives } : p
              ),
            };
          });
          break;

        case "player_finished":
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map((p) =>
                p.id === msg.playerId ? { ...p, status: "finished", score: msg.finalScore } : p
              ),
            };
          });
          break;

        case "game_over":
          setRoom((prev) =>
            prev ? { ...prev, players: msg.players, status: "finished" } : prev
          );
          setStatus("results");
          break;

        case "category_changed":
          setRoom((prev) =>
            prev ? { ...prev, category: msg.category } : prev
          );
          break;

        case "timer_changed":
          setRoom((prev) =>
            prev ? { ...prev, timer: msg.timer } : prev
          );
          break;

        case "room_returned_to_lobby":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  players: msg.players,
                  category: msg.category,
                  deck: [],
                  status: "waiting",
                }
              : prev
          );
          deckExhaustedRef.current = false;
          setStatus("lobby");
          break;

        case "error":
          setError(msg.message);
          setStatus("error");
          break;

        case "pong":
          // Heartbeat acknowledged — connection is alive
          break;
      }
    },
    []
  );

  const connect = useCallback(
    (url: string, onOpen: () => void) => {
      cleanup();
      setStatus("connecting");
      setError(null);

      const wsUrl = url.startsWith("ws")
        ? url
        : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}${url}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        reconnectAttemptRef.current = 0;
        startPing();
        onOpen();
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch {
          console.error("[Multiplayer] Failed to parse server message:", event.data);
        }
      };

      ws.onerror = () => {
        // onerror is always followed by onclose — let onclose handle state
        console.error("[Multiplayer] WebSocket error");
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);

        // Don't reconnect on clean close or if we have no room to rejoin
        if (event.code === 1000 || !reconnectInfoRef.current) {
          if (isMountedRef.current) {
            setStatus("idle");
          }
          return;
        }

        // Attempt reconnect with backoff; server restores our seat by nickname
        const attempt = reconnectAttemptRef.current;
        if (attempt < RECONNECT_DELAYS_MS.length) {
          const delay = RECONNECT_DELAYS_MS[attempt];
          reconnectAttemptRef.current += 1;
          console.warn(`[Multiplayer] Disconnected. Reconnecting in ${delay}ms (attempt ${attempt + 1})...`);
          setStatus("connecting");
          setTimeout(() => {
            if (!isMountedRef.current || !reconnectInfoRef.current) return;
            const { nickname, roomCode } = reconnectInfoRef.current;
            connect("/ws", () => send({ type: "join_room", roomCode, nickname }));
          }, delay);
        } else {
          setStatus("error");
          setError("Connection lost. Please refresh and try again.");
          reconnectInfoRef.current = null;
        }
      };
    },
    [cleanup, send, startPing, handleServerMessage]
  );

  // ─── Public API ────────────────────────────────────────────────────────────

  const createRoom = useCallback(
    (nickname: string, category: Category, timer?: number) => {
      lastNickRef.current = nickname;
      reconnectInfoRef.current = null; // fresh room; no auto-reconnect to an old room
      connect("/ws", () => send({ type: "create_room", nickname, category, timer }));
    },
    [connect, send]
  );

  const joinRoom = useCallback(
    (roomCode: string, nickname: string) => {
      lastNickRef.current = nickname;
      reconnectInfoRef.current = { nickname, roomCode };
      connect("/ws", () => send({ type: "join_room", roomCode, nickname }));
    },
    [connect, send]
  );

  const startGame = useCallback(() => {
    if (isHost) send({ type: "start_game" });
  }, [isHost, send]);

  const requestMoreCards = useCallback(() => {
    if (!deckExhaustedRef.current) send({ type: "request_cards" });
  }, [send]);

  const sendScoreUpdate = useCallback(
    (score: number, lives: number) => {
      send({ type: "score_update", score, lives });
    },
    [send]
  );

  const sendPlayerFinished = useCallback(
    (finalScore: number) => {
      send({ type: "player_finished", finalScore });
    },
    [send]
  );

  const changeCategory = useCallback(
    (category: Category) => {
      send({ type: "change_category", category });
    },
    [send]
  );

  const changeTimer = useCallback(
    (timer: number) => {
      send({ type: "change_timer", timer });
    },
    [send]
  );

  const returnToLobby = useCallback(() => {
    send({ type: "return_to_lobby" });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: "leave_room" });
    reconnectInfoRef.current = null;
    cleanup();
    setStatus("idle");
    setRoom(null);
    setMyId(null);
    setIsHost(false);
    setError(null);
  }, [send, cleanup]);

  const disconnect = useCallback(() => {
    reconnectInfoRef.current = null;
    lastNickRef.current = "";
    deckExhaustedRef.current = false;
    cleanup();
    setStatus("idle");
    setRoom(null);
    setMyId(null);
    myIdRef.current = null;
    setIsHost(false);
    setError(null);
  }, [cleanup]);

  const myPlayer = room?.players.find((p) => p.id === myId) ?? null;

  return {
    status,
    room,
    myId,
    myPlayer,
    isHost,
    error,
    createRoom,
    joinRoom,
    startGame,
    requestMoreCards,
    sendScoreUpdate,
    sendPlayerFinished,
    changeCategory,
    changeTimer,
    returnToLobby,
    leaveRoom,
    disconnect,
  };
}
