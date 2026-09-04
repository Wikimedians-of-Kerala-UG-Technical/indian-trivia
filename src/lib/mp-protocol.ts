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
      category?: Category | null;
      deck?: TriviaCard[];
      timer?: number;
    }
  | { type: "player_joined"; player: MPPlayer }
  | { type: "player_left"; playerId: string }
  | { type: "host_changed"; playerId: string }
  | { type: "game_started"; category: Category; deck: TriviaCard[]; timer?: number }
  | { type: "cards_dealt"; cards: TriviaCard[] }
  | { type: "score_update"; playerId: string; score: number; lives: number }
  | { type: "player_finished"; playerId: string; finalScore: number }
  | { type: "game_over"; players: MPPlayer[] }
  | { type: "room_returned_to_lobby"; roomCode: string; players: MPPlayer[]; category: Category | null; timer?: number }
  | { type: "category_changed"; category: Category }
  | { type: "timer_changed"; timer: number }
  | { type: "error"; message: string }
  | { type: "pong" };

// Messages TO the server (outbound)
export type ClientMessage =
  | { type: "create_room"; nickname: string; category: Category; timer?: number }
  | { type: "join_room"; roomCode: string; nickname: string }
  | { type: "start_game" }
  | { type: "request_cards" }
  | { type: "score_update"; score: number; lives: number }
  | { type: "player_finished"; finalScore: number }
  | { type: "return_to_lobby" }
  | { type: "leave_room" }
  | { type: "change_category"; category: Category }
  | { type: "change_timer"; timer: number }
  | { type: "ping" };

export type MPRoomStatus = "waiting" | "playing" | "finished";
