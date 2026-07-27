import { useState, useRef } from "react";
import type { Category } from "../hooks/useGameState";
import type { MPPlayer, MPRoomState } from "../hooks/useMultiplayer";
import { Users, Copy, Check, Play, Wifi, WifiOff, Crown, Clock } from "lucide-react";

// ─── Lobby Screen ─────────────────────────────────────────────────────────────
interface LobbyProps {
  room: MPRoomState;
  myId: string;
  isHost: boolean;
  status: string;
  onStartGame: () => void;
  onLeave: () => void;
}

const CATEGORY_LABELS: Record<Category, string> = {
  history: "History",
  cinema: "Cinema & Arts",
  science: "Science & Tech",
  general: "General Trivia",
  culture: "Culture & Heritage",
};

const CATEGORY_COLORS: Record<Category, string> = {
  history: "bg-[#FFBE7A]",
  cinema: "bg-[#C87AFF]",
  science: "bg-[#7AFF9B]",
  general: "bg-[#FF7A9B]",
  culture: "bg-[#FFE885]",
};

export function MultiplayerLobby({ room, myId, isHost, status, onStartGame, onLeave }: LobbyProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(room.roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConnecting = status === "connecting";

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="border-brutal-thick bg-[#C87AFF] text-black shadow-brutal p-6 text-center rotate-[-0.5deg]">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Users className="w-7 h-7 stroke-[2.5]" />
          <h1 className="text-3xl font-black uppercase tracking-tight">MULTIPLAYER</h1>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest">Waiting Room</p>
      </div>

      {/* Room Code */}
      <div className="border-brutal-thick bg-white shadow-brutal p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-black mb-2">Room Code</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 border-[3px] border-black bg-[#FFF97A] px-4 py-3 shadow-brutal-sm">
            <span className="text-4xl font-black tracking-[0.25em] text-black">{room.roomCode}</span>
          </div>
          <button
            onClick={copyCode}
            className="p-3 border-[3px] border-black bg-black text-white hover:bg-zinc-800 shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            title="Copy room code"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-[10px] font-bold mt-2 text-black/60 uppercase">Share this code with friends to join!</p>
      </div>

      {/* Category */}
      {room.category && (
        <div className={`border-[3px] border-black ${CATEGORY_COLORS[room.category]} shadow-brutal-sm px-4 py-2 flex items-center gap-2`}>
          <span className="text-[10px] font-black uppercase tracking-wider">Category:</span>
          <span className="text-sm font-black uppercase">{CATEGORY_LABELS[room.category]}</span>
        </div>
      )}

      {/* Players List */}
      <div className="border-brutal-thick bg-white shadow-brutal p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-black mb-4">
          Players ({room.players.length})
        </p>
        <div className="flex flex-col gap-3">
          {room.players.map((player) => (
            <PlayerRow key={player.id} player={player} isMe={player.id === myId} />
          ))}
          {/* Empty slots */}
          {room.players.length < 2 && (
            <div className="flex items-center gap-3 border-[2px] border-dashed border-black/30 p-3">
              <div className="w-8 h-8 border-[2px] border-dashed border-black/30 flex items-center justify-center">
                <Clock className="w-4 h-4 text-black/30" />
              </div>
              <span className="text-xs font-bold text-black/40 uppercase">Waiting for players...</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {isHost ? (
          <button
            onClick={onStartGame}
            disabled={room.players.length < 2 || isConnecting}
            className="flex items-center justify-center gap-2 w-full py-4 border-brutal-thick bg-[#7AFF9B] hover:bg-[#A9FFB8] font-black text-lg text-black shadow-brutal transition-all cursor-pointer active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0"
          >
            <Play className="w-5 h-5 stroke-[2.5] fill-black" />
            {room.players.length < 2 ? "NEED 2+ PLAYERS" : "START GAME!"}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 w-full py-4 border-brutal-thick bg-[#FFF97A] font-black text-sm text-black shadow-brutal">
            <Clock className="w-5 h-5 stroke-[2.5] animate-spin" style={{ animationDuration: "3s" }} />
            WAITING FOR HOST TO START...
          </div>
        )}

        <button
          onClick={onLeave}
          className="flex items-center justify-center gap-2 w-full py-3 border-[3px] border-black bg-white hover:bg-slate-100 font-black text-sm text-black shadow-brutal-sm transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          LEAVE ROOM
        </button>
      </div>
    </div>
  );
}

function PlayerRow({ player, isMe }: { player: MPPlayer; isMe: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 border-[2px] border-black ${isMe ? "bg-[#7AE4FF]" : "bg-white"} shadow-[1px_1px_0px_rgba(0,0,0,1)]`}>
      <div className="w-8 h-8 border-[2px] border-black bg-black flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-black">{player.nickname.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-black text-sm uppercase text-black truncate block">
          {player.nickname}
          {isMe && <span className="ml-2 text-[9px] font-black bg-black text-white px-1 py-0.5">YOU</span>}
        </span>
      </div>
      {player.isHost && (
        <div className="flex items-center gap-1 border border-black bg-[#FFF97A] px-1.5 py-0.5">
          <Crown className="w-3 h-3 stroke-[2.5]" />
          <span className="text-[9px] font-black uppercase">Host</span>
        </div>
      )}
      <div className="w-2 h-2 rounded-full border border-black bg-[#7AFF9B]" title="Connected" />
    </div>
  );
}

// ─── Multiplayer Scoreboard (shown during game in the header) ─────────────────
interface ScoreboardProps {
  players: MPPlayer[];
  myId: string;
}

export function MultiplayerScoreboard({ players, myId }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sorted.map((player, idx) => (
        <div
          key={player.id}
          className={`flex items-center gap-1.5 border-[2px] border-black px-2 py-1 shadow-[1px_1px_0px_rgba(0,0,0,1)] text-black
            ${player.id === myId ? "bg-[#7AE4FF]" : "bg-white"}
            ${player.status === "finished" ? "opacity-60" : ""}`}
        >
          <span className="text-[9px] font-black text-black/50">#{idx + 1}</span>
          <span className="text-[10px] font-black uppercase truncate max-w-[60px]">{player.nickname}</span>
          <span className="text-sm font-black">{player.score}</span>
          {player.status === "finished" && <span className="text-[9px]">✓</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Join / Create Room Form ──────────────────────────────────────────────────
interface MultiplayerEntryProps {
  onCreateRoom: (nickname: string, category: Category) => void;
  onJoinRoom: (roomCode: string, nickname: string) => void;
  onBack: () => void;
  error: string | null;
  status: string;
}

const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: "history", label: "History", color: "bg-[#FFBE7A]" },
  { id: "cinema", label: "Cinema & Arts", color: "bg-[#C87AFF]" },
  { id: "science", label: "Science & Tech", color: "bg-[#7AFF9B]" },
  { id: "culture", label: "Culture & Heritage", color: "bg-[#FFE885]" },
  { id: "general", label: "General", color: "bg-[#FF7A9B]" },
];

export function MultiplayerEntry({ onCreateRoom, onJoinRoom, onBack, error, status }: MultiplayerEntryProps) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [category, setCategory] = useState<Category>("history");

  const isConnecting = status === "connecting";

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const nick = nickname.trim();
    if (!nick || nick.length < 2) return;
    onCreateRoom(nick, category);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const nick = nickname.trim();
    const code = roomCode.trim().toUpperCase();
    if (!nick || nick.length < 2 || code.length !== 6) return;
    onJoinRoom(code, nick);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 p-4">
      {/* Header */}
      <div className="border-brutal-thick bg-[#C87AFF] shadow-brutal p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Users className="w-6 h-6 stroke-[2.5]" />
          <h2 className="text-2xl font-black uppercase tracking-tight">Multiplayer</h2>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest">No signup needed — just a room code!</p>
      </div>

      {/* Tab switcher */}
      <div className="flex border-[3px] border-black overflow-hidden shadow-brutal-sm">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 font-black text-sm uppercase tracking-wider transition-colors cursor-pointer
              ${tab === t ? "bg-black text-white" : "bg-white text-black hover:bg-slate-100"}`}
          >
            {t === "create" ? "Create Room" : "Join Room"}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="border-[3px] border-black bg-[#FF6B6B] p-3 flex items-center gap-2 shadow-brutal-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0 stroke-[2.5]" />
          <span className="text-xs font-bold uppercase">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={tab === "create" ? handleCreate : handleJoin} className="flex flex-col gap-4">
        {/* Nickname */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Your Nickname</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 16))}
            placeholder="e.g. WikiMaster"
            maxLength={16}
            className="w-full border-[3px] border-black px-4 py-3 font-bold text-base bg-white focus:outline-none focus:bg-[#FFF97A] shadow-brutal-sm placeholder:text-black/30"
            required
          />
        </div>

        {/* Room code (join only) */}
        {tab === "join" && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="e.g. ABC123"
              maxLength={6}
              className="w-full border-[3px] border-black px-4 py-3 font-black text-2xl tracking-[0.3em] text-center bg-white focus:outline-none focus:bg-[#FFF97A] shadow-brutal-sm placeholder:text-black/30"
              required
            />
            <p className="text-[9px] font-bold mt-1 text-black/50 uppercase">6-character alphanumeric code from your friend</p>
          </div>
        )}

        {/* Category picker (create only) */}
        {tab === "create" && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Category</label>
            <div className="grid grid-cols-1 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`w-full py-2 px-4 border-[2px] border-black font-black text-sm uppercase text-left shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all cursor-pointer
                    ${category === cat.id
                      ? `${cat.color} border-black translate-x-[-1px] translate-y-[-1px] shadow-brutal-sm`
                      : "bg-white hover:bg-slate-50"}`}
                >
                  {cat.label}
                  {category === cat.id && <span className="float-right">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isConnecting}
          className="flex items-center justify-center gap-2 w-full py-4 border-brutal-thick bg-[#7AFF9B] hover:bg-[#A9FFB8] font-black text-lg text-black shadow-brutal transition-all cursor-pointer active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isConnecting ? (
            <>
              <Wifi className="w-5 h-5 stroke-[2.5] animate-pulse" />
              CONNECTING...
            </>
          ) : tab === "create" ? (
            <>
              <Play className="w-5 h-5 stroke-[2.5] fill-black" />
              CREATE ROOM
            </>
          ) : (
            <>
              <Users className="w-5 h-5 stroke-[2.5]" />
              JOIN ROOM
            </>
          )}
        </button>
      </form>

      <button
        onClick={onBack}
        className="w-full py-3 border-[3px] border-black bg-white hover:bg-slate-100 font-black text-sm text-black shadow-brutal-sm transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        ← BACK
      </button>
    </div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────
interface ResultsProps {
  players: MPPlayer[];
  myId: string;
  category: Category | null;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function MultiplayerResults({ players, myId, category, onPlayAgain, onHome }: ResultsProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const myResult = players.find((p) => p.id === myId);
  const winner = sorted[0];
  const iWon = winner?.id === myId;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 p-4">
      {/* Result banner */}
      <div className={`border-brutal-thick shadow-brutal p-6 text-center ${iWon ? "bg-[#7AFF9B] rotate-[-1deg]" : "bg-[#FF7A9B] rotate-[0.5deg]"}`}>
        <h2 className="text-4xl font-black uppercase">
          {iWon ? "🏆 YOU WIN!" : "😤 BETTER LUCK!"}
        </h2>
        {category && (
          <p className="text-xs font-bold uppercase tracking-widest mt-2">{CATEGORY_LABELS[category]}</p>
        )}
      </div>

      {/* Final Leaderboard */}
      <div className="border-brutal-thick bg-white shadow-brutal p-5">
        <p className="text-[10px] font-black uppercase tracking-widest mb-4">Final Standings</p>
        <div className="flex flex-col gap-3">
          {sorted.map((player, idx) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-3 border-[2px] border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]
                ${idx === 0 ? "bg-[#FFF97A]" : player.id === myId ? "bg-[#7AE4FF]" : "bg-white"}`}
            >
              <span className="text-2xl font-black w-8 text-center">
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
              </span>
              <span className="flex-1 font-black text-sm uppercase">
                {player.nickname}
                {player.id === myId && (
                  <span className="ml-2 text-[9px] font-black bg-black text-white px-1 py-0.5">YOU</span>
                )}
              </span>
              <span className="text-2xl font-black">{player.score}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onPlayAgain}
          className="flex items-center justify-center gap-2 w-full py-4 border-brutal-thick bg-[#FF931F] hover:bg-[#FFB054] font-black text-lg text-black shadow-brutal transition-all cursor-pointer active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          PLAY AGAIN (SAME ROOM)
        </button>
        <button
          onClick={onHome}
          className="flex items-center justify-center gap-2 w-full py-3 border-[3px] border-black bg-white hover:bg-slate-100 font-black text-sm text-black shadow-brutal-sm transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          HOME
        </button>
      </div>
    </div>
  );
}
