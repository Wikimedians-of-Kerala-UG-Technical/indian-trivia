import { useState, useEffect, useRef } from "react";
import { useGameState } from "./hooks/useGameState";
import { useMultiplayer } from "./hooks/useMultiplayer";
import { CategorySelect } from "./components/CategorySelect";
import { GameBoard } from "./components/GameBoard";
import { GameOver } from "./components/GameOver";
import {
  MultiplayerEntry,
  MultiplayerLobby,
  MultiplayerResults,
} from "./components/MultiplayerUI";
import "./index.css";

type AppMode = "solo" | "multiplayer";

export function App() {
  const [mode, setMode] = useState<AppMode>("solo");

  // ─── Solo state ─────────────────────────────────────────────────────────────
  // In multiplayer the server deals shared top-ups, so the hook's own
  // API-based top-up is disabled via deckMode.
  const gameState = useGameState(mode === "multiplayer" ? "server" : "api");
  const {
    status,
    category,
    score,
    highScores,
    allHighScores,
    startGame,
    resetGame,
    restartGame,
    isLoading,
  } = gameState;

  // ─── Multiplayer state ───────────────────────────────────────────────────────
  const mp = useMultiplayer();

  // When the multiplayer game starts (or the host restarts it), kick off the
  // solo game engine using the server-dealt shared deck so everyone plays
  // the exact same cards.
  useEffect(() => {
    if (mp.status === "playing" && mp.room?.category && mp.room.deck.length > 0) {
      startGame(mp.room.category, mp.room.deck, mp.room.timer);
    }
  }, [mp.status, mp.room?.category, mp.room?.deck, mp.room?.timer]);

  // Mirror solo score/lives updates to the multiplayer server
  useEffect(() => {
    if (mode !== "multiplayer" || mp.status !== "playing") return;
    mp.sendScoreUpdate(gameState.score, gameState.lives);
  }, [mode, mp.status, gameState.score, gameState.lives, mp.sendScoreUpdate]);

  // When solo game ends during multiplayer, notify server
  useEffect(() => {
    if (mode !== "multiplayer" || mp.status !== "playing") return;
    if (gameState.status === "gameover") {
      mp.sendPlayerFinished(gameState.score);
    }
  }, [mode, mp.status, gameState.status, mp.sendPlayerFinished]);

  // Feed server-dealt top-ups into the game engine as they arrive
  const prevMpDeckLenRef = useRef(0);
  useEffect(() => {
    const deck = mp.room?.deck;
    if (mp.status !== "playing" || !deck) {
      prevMpDeckLenRef.current = 0;
      return;
    }
    if (prevMpDeckLenRef.current > 0 && deck.length > prevMpDeckLenRef.current) {
      gameState.appendDeck(deck.slice(prevMpDeckLenRef.current));
    }
    prevMpDeckLenRef.current = deck.length;
  }, [mp.status, mp.room?.deck, gameState.appendDeck]);

  // Ask the server for more shared cards when the deck is running low
  useEffect(() => {
    if (mode !== "multiplayer" || mp.status !== "playing") return;
    if (gameState.deck.length <= 4) {
      mp.requestMoreCards();
    }
  }, [mode, mp.status, gameState.deck.length, mp.requestMoreCards]);

  const handleEnterMultiplayer = () => setMode("multiplayer");
  const handleBackToSolo = () => {
    mp.disconnect();
    setMode("solo");
    resetGame();
  };

  // ─── Loading overlay ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-8 border-brutal-thick bg-[#FFF97A] text-black shadow-brutal text-center rotate-[-1.5deg]">
          <div className="inline-block p-3 border-2 border-black bg-white rounded-none mb-4 rotate-[6deg] shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)]">
            <span className="text-4xl font-black">⏳</span>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2">FETCHING...</h2>
          <p className="text-xs font-bold uppercase tracking-wider text-black bg-white border-2 border-black py-1.5 px-4 inline-block shadow-brutal-sm">
            {mode === "multiplayer" ? "Loading Multiplayer Game" : "Querying Wikidata API"}
          </p>
          <div className="mt-8 flex gap-4 justify-center animate-pulse">
            <div className="w-12 h-16 border-2 border-dashed border-black bg-white/40 rotate-[5deg]" />
            <div className="w-12 h-16 border-2 border-solid border-black bg-white shadow-brutal-sm rotate-[-8deg]" />
            <div className="w-12 h-16 border-2 border-dashed border-black bg-white/40 rotate-[12deg]" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Multiplayer flow ─────────────────────────────────────────────────────────
  if (mode === "multiplayer") {
    // Entry: create or join room
    if (mp.status === "idle" || mp.status === "connecting" || mp.status === "error") {
      return (
        <div className="w-full min-h-screen flex items-center justify-center py-8">
          <MultiplayerEntry
            onCreateRoom={mp.createRoom}
            onJoinRoom={mp.joinRoom}
            onBack={handleBackToSolo}
            error={mp.error}
            status={mp.status}
          />
        </div>
      );
    }

    // Lobby: waiting for players / host to start
    if (mp.status === "lobby" && mp.room && mp.myId) {
      return (
        <div className="w-full min-h-screen flex items-center justify-center py-8">
          <MultiplayerLobby
            room={mp.room}
            myId={mp.myId}
            isHost={mp.isHost}
            onStartGame={mp.startGame}
            onChangeCategory={mp.changeCategory}
            onChangeTimer={mp.changeTimer}
            onLeave={handleBackToSolo}
          />
        </div>
      );
    }

    // Playing: run the solo GameBoard engine, show multiplayer scoreboard in header
    if (mp.status === "playing") {
      if (status === "gameover" && category) {
        // Solo game ended but MP game might still be running (other players playing)
        return (
          <div className="w-full min-h-screen flex items-center justify-center py-8">
            <div className="w-full max-w-md mx-auto flex flex-col gap-4 p-4">
              <div className="border-brutal-thick bg-[#FFF97A] shadow-brutal p-5 text-center">
                <h2 className="text-2xl font-black uppercase">You finished!</h2>
                <p className="text-xs font-bold uppercase tracking-widest mt-1">
                  Score: {score} · Waiting for other players...
                </p>
              </div>
              {mp.room && mp.myId && (
                <div className="border-[3px] border-black bg-white shadow-brutal-sm p-4">
                  <p className="text-[10px] font-black uppercase mb-3">Live Scores</p>
                  {[...mp.room.players]
                    .sort((a, b) => b.score - a.score)
                    .map((player) => (
                      <div key={player.id} className={`flex items-center justify-between py-2 border-b border-black/10 ${player.id === mp.myId ? "font-black" : "font-bold"}`}>
                        <span className="text-sm uppercase truncate">{player.nickname} {player.id === mp.myId ? "(you)" : ""}</span>
                        <span className="text-sm">{player.score} {player.status === "finished" ? "✓" : ""}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      return (
        <div className="w-full min-h-screen flex items-center justify-center py-8">
          {status === "playing" && category && (
            <GameBoard
              category={category}
              gameState={gameState}
              multiplayerState={mp.room ? {
                players: mp.room.players,
                myId: mp.myId ?? "",
              } : undefined}
            />
          )}
        </div>
      );
    }

    // Results
    if (mp.status === "results" && mp.room && mp.myId) {
      return (
        <div className="w-full min-h-screen flex items-center justify-center py-8">
          <MultiplayerResults
            players={mp.room.players}
            myId={mp.myId}
            category={mp.room.category}
            isHost={mp.isHost}
            onPlayAgain={() => {
              resetGame();
              mp.returnToLobby();
            }}
            onHome={() => {
              mp.leaveRoom();
              setMode("solo");
              resetGame();
            }}
          />
        </div>
      );
    }
  }

  // ─── Solo flow ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen flex items-center justify-center py-8">
      {status === "landing" && (
        <CategorySelect
          onSelect={startGame}
          highScores={allHighScores}
          onMultiplayer={handleEnterMultiplayer}
        />
      )}

      {status === "playing" && category && (
        <GameBoard
          category={category}
          gameState={gameState}
        />
      )}

      {status === "gameover" && category && (
        <GameOver
          score={score}
          highScore={highScores}
          category={category}
          onRestart={restartGame}
          onHome={resetGame}
        />
      )}
    </div>
  );
}

export default App;
