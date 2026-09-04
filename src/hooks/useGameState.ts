/**
 * Solo game engine: deck loading (API or server-dealt), timeline placement
 * rules, scoring, lives, and high-score persistence. Also drives the board in
 * multiplayer mode — App feeds it the shared deck and mirrors score/lives to
 * the multiplayer server.
 */
import { useState, useEffect, useCallback } from "react";
import { TRIVIA_DATA, type TriviaCard } from "../data/trivia";
import { maskSpoilers, shuffle } from "../lib/utils";

export type GameStatus = "landing" | "playing" | "gameover";
export type Category = "history" | "cinema" | "science" | "general" | "culture";

export function useGameState(deckMode: "api" | "server" = "api") {
  const [status, setStatus] = useState<GameStatus>("landing");
  const [category, setCategory] = useState<Category | null>(null);
  const [deck, setDeck] = useState<TriviaCard[]>([]);
  const [timeline, setTimeline] = useState<TriviaCard[]>([]);
  const [currentCard, setCurrentCard] = useState<TriviaCard | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [incorrectCardIds, setIncorrectCardIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Timer state: 0 = no timer, positive number = total seconds
  const [timerDuration, setTimerDuration] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Load high scores from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("indian_trivia_highscores");
      if (stored) {
        setHighScores(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load high scores", e);
    }
  }, []);


  const updateHighScore = useCallback((cat: Category, newScore: number) => {
    setHighScores(prev => {
      const currentHigh = prev[cat] || 0;
      if (newScore > currentHigh) {
        const updated = { ...prev, [cat]: newScore };
        try {
          localStorage.setItem("indian_trivia_highscores", JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save high score", e);
        }
        return updated;
      }
      return prev;
    });
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (status !== "playing" || timerDuration === 0 || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Timer expired — end the game
          setStatus("gameover");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, timerDuration, timeRemaining > 0]); // only re-run when status changes or timer starts/stops


  const loadLocalFallback = useCallback((selectedCat: Category) => {
    console.warn(`[Fallback] Loading local curated trivia for category: ${selectedCat}`);
    const filtered = TRIVIA_DATA.filter(item => item.category === selectedCat);
    if (filtered.length < 2) return;

    const sanitized = filtered.map(card => ({
      ...card,
      title: maskSpoilers(card.title),
      description: maskSpoilers(card.description)
    }));

    const shuffled = shuffle(sanitized);
    const initialCard = shuffled[0];
    if (!initialCard) return;
    const firstPlayable = shuffled[1] ?? null;
    const activeDeck = shuffled.slice(2);

    setCategory(selectedCat);
    setDeck(activeDeck);
    setTimeline([initialCard]);
    setCurrentCard(firstPlayable);
    setScore(0);
    setLives(3);
    setIncorrectCardIds([]);
    setStatus("playing");
  }, []);

  function prefetchCardImages(cards: TriviaCard[]) {
    cards.slice(0, 5).forEach(card => {
      if (card.image) {
        const img = new Image();
        img.src = card.image;
      }
    });
  }

  // Initialize game for a category. In multiplayer, the server deals a shared
  // deck which is passed in as `presetDeck` so everyone plays the same cards.
  const startGame = useCallback(
    async (
      selectedCat: Category,
      deckOrTimer?: TriviaCard[] | number,
      maybeTimer?: number
    ) => {
      let presetDeck: TriviaCard[] | undefined;
      let timer: number | undefined;

      if (Array.isArray(deckOrTimer)) {
        presetDeck = deckOrTimer;
        timer = maybeTimer;
      } else if (typeof deckOrTimer === "number") {
        timer = deckOrTimer;
      }

      setIsLoading(true);
      setCategory(selectedCat);

      // Set timer if provided
      const timerSecs = timer ?? 0;
      setTimerDuration(timerSecs);
      setTimeRemaining(timerSecs);

  try {
    let fetchedCards: TriviaCard[];

    if (presetDeck && presetDeck.length >= 2) {
      fetchedCards = presetDeck;
    } else {
      const res = await fetch(`/api/wikidata?category=${selectedCat}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch from API: ${res.statusText}`);
      }

      fetchedCards = await res.json();
    }

    if (!fetchedCards || fetchedCards.length < 2) {
      throw new Error("Insufficient cards");
    }

    prefetchCardImages(fetchedCards);

    const initialCard = fetchedCards[0];
    const secondCard = fetchedCards[1];
    if (!initialCard || !secondCard) {
      throw new Error("Insufficient cards");
    }

    setTimeline([initialCard]);
    setDeck(fetchedCards.slice(2));
    setCurrentCard(secondCard);
    setScore(0);
    setLives(3);
    setIncorrectCardIds([]);
    setStatus("playing");
  } catch (err) {
    console.error("[Wikidata Fetch Error] Falling back to local dataset", err);
    loadLocalFallback(selectedCat);
  } finally {
    setIsLoading(false);
  }
}, [loadLocalFallback]);

  // Top up deck when running low. In multiplayer ("server" mode) the server
  // deals shared top-ups instead, so decks stay identical between players.
  useEffect(() => {
    if (deckMode !== "api") return;
    if (status !== "playing" || !category || deck.length > 4 || isLoading) return;

    fetch(`/api/wikidata?category=${category}`)
      .then(res => (res.ok ? res.json() : null))
      .then((freshCards: TriviaCard[]) => {
        if (!freshCards || freshCards.length === 0) return;

        setDeck(prevDeck => {
          const existingIds = new Set([
            ...timeline.map(c => c.id),
            ...prevDeck.map(c => c.id),
            ...(currentCard ? [currentCard.id] : [])
          ]);

          const newItems = freshCards.filter(c => !existingIds.has(c.id));
          if (newItems.length === 0) return prevDeck;

          return [...prevDeck, ...newItems];
        });
      })
      .catch(() => {});
  }, [deckMode, deck.length, status, category, isLoading, timeline, currentCard]);

  /** Append server-dealt cards, skipping anything already in play */
  const appendDeck = useCallback((cards: TriviaCard[]) => {
    setDeck(prevDeck => {
      const existingIds = new Set([
        ...timeline.map(c => c.id),
        ...prevDeck.map(c => c.id),
        ...(currentCard ? [currentCard.id] : [])
      ]);
      const fresh = cards.filter(c => !existingIds.has(c.id));
      return fresh.length > 0 ? [...prevDeck, ...fresh] : prevDeck;
    });
  }, [timeline, currentCard]);



  const checkPlacement = useCallback((card: TriviaCard, index: number, currentTimeline: TriviaCard[]): boolean => {
    if (index === 0) {
      const first = currentTimeline[0];
      return first != null && card.year <= first.year;
    }
    if (index === currentTimeline.length) {
      const last = currentTimeline[currentTimeline.length - 1];
      return last != null && card.year >= last.year;
    }
    const prev = currentTimeline[index - 1];
    const next = currentTimeline[index];
    return prev != null && next != null && prev.year <= card.year && card.year <= next.year;
  }, []);


  const findCorrectIndex = useCallback((card: TriviaCard, currentTimeline: TriviaCard[]): number => {
    for (let i = 0; i < currentTimeline.length; i++) {
      const entry = currentTimeline[i];
      if (entry && card.year < entry.year) {
        return i;
      }
    }
    return currentTimeline.length;
  }, []);


  const placeCard = useCallback((droppedIndex: number): { 
    success: boolean; 
    correctIndex: number; 
    remainingLives: number; 
    noMoreCards: boolean;
  } => {
    if (!currentCard || status !== "playing") {
      return { success: false, correctIndex: -1, remainingLives: lives, noMoreCards: false };
    }

    const isCorrect = checkPlacement(currentCard, droppedIndex, timeline);
    const correctIndex = findCorrectIndex(currentCard, timeline);

    // The card joins the timeline either way; on a miss it glides to its true spot
    const newTimeline = [...timeline];
    newTimeline.splice(droppedIndex, 0, currentCard);
    setTimeline(newTimeline);

    const drawNext = () => {
      const [next, ...rest] = deck;
      setCurrentCard(next ?? null);
      setDeck(rest);
    };

    if (isCorrect) {
      const newScore = score + 1;
      setScore(newScore);
      if (category) {
        updateHighScore(category, newScore);
      }

      drawNext();

      return {
        success: true,
        correctIndex: droppedIndex,
        remainingLives: lives,
        noMoreCards: deck.length === 0
      };
    }

    const newLives = lives - 1;
    setLives(newLives);
    setIncorrectCardIds(prev => [...prev, currentCard.id]);

    if (newLives > 0) {
      drawNext();
    } else {
      setCurrentCard(null);
    }

    return {
      success: false,
      correctIndex,
      remainingLives: newLives,
      noMoreCards: deck.length === 0 && newLives > 0
    };
  }, [currentCard, timeline, score, lives, deck, category, status, checkPlacement, findCorrectIndex, updateHighScore]);

  const resetGame = useCallback(() => {
    setStatus("landing");
    setCategory(null);
    setTimeline([]);
    setCurrentCard(null);
    setScore(0);
    setLives(3);
    setIncorrectCardIds([]);
    setTimerDuration(0);
    setTimeRemaining(0);
  }, []);

  const restartGame = useCallback(() => {
    if (category) {
      startGame(category, timerDuration);
    }
  }, [category, startGame, timerDuration]);

  const endGame = useCallback(() => {
    setStatus("gameover");
  }, []);

  const moveTimelineCard = useCallback((cardId: string, toIndex: number) => {
    setTimeline(prev => {
      const card = prev.find(c => c.id === cardId);
      if (!card) return prev;
      const filtered = prev.filter(c => c.id !== cardId);
      const newTimeline = [...filtered];
      newTimeline.splice(toIndex, 0, card);
      return newTimeline;
    });
  }, []);

  return {
    status,
    category,
    timeline,
    deck,
    currentCard,
    score,
    lives,
    isLoading,
    highScores: highScores[category || ""] || 0,
    allHighScores: highScores,
    incorrectCardIds,
    timerDuration,
    timeRemaining,
    startGame,
    placeCard,
    appendDeck,
    resetGame,
    restartGame,
    endGame,
    moveTimelineCard
  };
}
