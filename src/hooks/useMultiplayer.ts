import { useState, useEffect, useRef, useCallback } from "react";
import type { Category } from "./useGameState";

// ─── Shared Types ────────────────────────────────────────────────────────────

export type MultiplayerStatus =
  | "idle"         // not connected
  | "connecting"   // WS handshake in progress
  | "lobby"        // in room, waiting for host to start
  | "playing"      // game running
  | "results"      // game finished, showing results
  | "error";       // unrecoverable error

export interface MPPlayer {
  id: string;
  nickname: string;
  score: number;
  lives: number;
  isHost: boolean;
  status: "waiting" | "playing" | "finished";
}

export interface MPRoomState {
  roomCode: string;
  players: MPPlayer[];
  category: Category | null;
  /** Server-dealt shared deck (card IDs in order) */
  deckIds: string[];
  currentIndex: number;
  status: "waiting" | "playing" | "finished";
}

// Messages FROM the server (inbound)
type ServerMessage =
  | { type: "room_joined"; roomCode: string; playerId: string; isHost: boolean; players: MPPlayer[] }
  | { type: "player_joined"; player: MPPlayer }
  | { type: "player_left"; playerId: string }
  | { type: "game_started"; category: Category; deck: string[] }
  | { type: "score_update"; playerId: string; score: number; lives: number }
  | { type: "player_finished"; playerId: string; finalScore: number }
  | { type: "game_over"; players: MPPlayer[] }
  | { type: "room_returned_to_lobby"; roomCode: string; players: MPPlayer[]; category: Category | null }
  | { type: "error"; message: string }
  | { type: "pong" };

// Messages TO the server (outbound)
export type ClientMessage =
  | { type: "create_room"; nickname: string; category: Category }
  | { type: "join_room"; roomCode: string; nickname: string }
  | { type: "start_game" }
  | { type: "score_update"; score: number; lives: number }
  | { type: "player_finished"; finalScore: number }
  | { type: "return_to_lobby" }
  | { type: "leave_room" }
  | { type: "ping" };

// ─── Hook ────────────────────────────────────────────────────────────────────

const PING_INTERVAL_MS = 25_000;
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000]; // max 3 attempts

export function useMultiplayer() {
  const [status, setStatus] = useState<MultiplayerStatus>("idle");
  const [room, setRoom] = useState<MPRoomState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectInfoRef = useRef<{ nickname: string; roomCode: string } | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
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

        // Don't reconnect on clean close or if already reconnecting with no pending info
        if (event.code === 1000 || !reconnectInfoRef.current) {
          if (isMountedRef.current) {
            setStatus("idle");
          }
          return;
        }

        // Attempt reconnect with exponential backoff
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
    [cleanup, send, startPing]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case "room_joined":
          setMyId(msg.playerId);
          setIsHost(msg.isHost);
          setRoom({
            roomCode: msg.roomCode,
            players: msg.players,
            category: null,
            deckIds: [],
            currentIndex: 0,
            status: "waiting",
          });
          setStatus("lobby");
          break;

        case "player_joined":
          setRoom((prev) =>
            prev ? { ...prev, players: [...prev.players, msg.player] } : prev
          );
          break;

        case "player_left":
          setRoom((prev) => {
            if (!prev) return prev;
            const remaining = prev.players.filter((p) => p.id !== msg.playerId);
            // If host left, reassign host to first remaining player
            if (!remaining.some((p) => p.isHost) && remaining.length > 0) {
              remaining[0] = { ...remaining[0], isHost: true };
              if (remaining[0].id === myId) setIsHost(true);
            }
            return { ...prev, players: remaining };
          });
          break;

        case "game_started":
          setRoom((prev) =>
            prev
              ? { ...prev, category: msg.category, deckIds: msg.deck, status: "playing" }
              : prev
          );
          setGameStarted(true);
          setStatus("playing");
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

        case "room_returned_to_lobby":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  players: msg.players,
                  category: msg.category,
                  deckIds: [],
                  currentIndex: 0,
                  status: "waiting",
                }
              : prev
          );
          setGameStarted(false);
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
    [myId]
  );

  // ─── Public API ────────────────────────────────────────────────────────────

  const createRoom = useCallback(
    (nickname: string, category: Category) => {
      reconnectInfoRef.current = null; // fresh room; no auto-reconnect to old room
      connect("/ws", () => {
        send({ type: "create_room", nickname, category });
        // Optimistic reconnect info will be set in room_joined handler
      });
    },
    [connect, send]
  );

  const joinRoom = useCallback(
    (roomCode: string, nickname: string) => {
      reconnectInfoRef.current = { nickname, roomCode };
      connect("/ws", () => send({ type: "join_room", roomCode, nickname }));
    },
    [connect, send]
  );

  const startGame = useCallback(() => {
    if (isHost) send({ type: "start_game" });
  }, [isHost, send]);

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
    setGameStarted(false);
    setError(null);
  }, [send, cleanup]);

  const disconnect = useCallback(() => {
    reconnectInfoRef.current = null;
    cleanup();
    setStatus("idle");
    setRoom(null);
    setMyId(null);
    setIsHost(false);
    setGameStarted(false);
    setError(null);
  }, [cleanup]);

  const myPlayer = room?.players.find((p) => p.id === myId) ?? null;
  const opponents = room?.players.filter((p) => p.id !== myId) ?? [];

  return {
    status,
    room,
    myId,
    myPlayer,
    opponents,
    isHost,
    error,
    gameStarted,
    createRoom,
    joinRoom,
    startGame,
    sendScoreUpdate,
    sendPlayerFinished,
    returnToLobby,
    leaveRoom,
    disconnect,
  };
}
