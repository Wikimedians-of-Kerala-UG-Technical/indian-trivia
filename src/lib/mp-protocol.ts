import type { Category } from "../hooks/useGameState";
import type { TriviaCard } from "../data/trivia";

// ─── Shared Multiplayer Protocol (client ⇄ server) ───────────────────────────

export interface MPPlayer {
  id: string;
  nickname: string;
  score: number;
  lives: number;
  isHost: boolean;
  status: "waiting" | "playing" | "finished";
}

// Messages FROM the server (inbound)
export type ServerMessage =
  | {
      type: "room_joined";
      roomCode: string;
      playerId: string;
      isHost: boolean;
      players: MPPlayer[];
      status: MPRoomStatus;
      /** Present when joining straight into a running game (mid-game rejoin) */
      category?: Category;
      deck?: TriviaCard[];
    }
  | { type: "player_joined"; player: MPPlayer }
  | { type: "player_left"; playerId: string }
  | { type: "host_changed"; playerId: string }
  | { type: "game_started"; category: Category; deck: TriviaCard[] }
  | { type: "cards_dealt"; cards: TriviaCard[] }
  | { type: "score_update"; playerId: string; score: number; lives: number }
  | { type: "player_finished"; playerId: string; finalScore: number }
  | { type: "game_over"; players: MPPlayer[] }
  | { type: "error"; message: string }
  | { type: "pong" };

// Messages TO the server (outbound)
export type ClientMessage =
  | { type: "create_room"; nickname: string; category: Category }
  | { type: "join_room"; roomCode: string; nickname: string }
  | { type: "start_game" }
  | { type: "request_cards" }
  | { type: "score_update"; score: number; lives: number }
  | { type: "player_finished"; finalScore: number }
  | { type: "ping" };

export type MPRoomStatus = "waiting" | "playing" | "finished";
