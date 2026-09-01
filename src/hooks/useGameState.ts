import { useState, useEffect, useCallback } from "react";
import { TRIVIA_DATA, TriviaCard } from "../data/trivia";
import { maskSpoilers } from "../lib/utils";

export type GameStatus = "landing" | "playing" | "gameover";
export type Category = "history" | "cinema" | "science" | "general" | "culture";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useGameState() {
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
    const remainingDeck = shuffled.slice(1);
    const firstPlayable = remainingDeck[0] || null;
    const activeDeck = remainingDeck.slice(1);

    setCategory(selectedCat);
    setDeck(activeDeck);
    setTimeline([initialCard]);
    setCurrentCard(firstPlayable);
    setScore(0);
    setLives(3);
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

// Initialize game for a category
const startGame = useCallback(async (selectedCat: Category, timer?: number) => {
  setIsLoading(true);
  setCategory(selectedCat);

  // Set timer if provided
  const timerSecs = timer ?? 0;
  setTimerDuration(timerSecs);
  setTimeRemaining(timerSecs);

  try {
    const res = await fetch(`/api/wikidata?category=${selectedCat}`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch from API: ${res.statusText}`);
    }

    const fetchedCards: TriviaCard[] = await res.json();

    if (!fetchedCards || fetchedCards.length < 2) {
      throw new Error("API returned insufficient cards");
    }

    prefetchCardImages(fetchedCards);

    const initialCard = fetchedCards[0];
    const remainingDeck = fetchedCards.slice(1);
    const firstPlayable = remainingDeck[0] || null;
    const activeDeck = remainingDeck.slice(1);

    setTimeline([initialCard]);
    setDeck(activeDeck);
    setCurrentCard(firstPlayable);
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

  // Top up deck when running low on cards
  useEffect(() => {
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
  }, [deck.length, status, category, isLoading, timeline, currentCard]);



  const checkPlacement = useCallback((card: TriviaCard, index: number, currentTimeline: TriviaCard[]): boolean => {
    if (index === 0) {
      return card.year <= currentTimeline[0].year;
    }
    if (index === currentTimeline.length) {
      return card.year >= currentTimeline[currentTimeline.length - 1].year;
    }
    return (
      currentTimeline[index - 1].year <= card.year &&
      card.year <= currentTimeline[index].year
    );
  }, []);


  const findCorrectIndex = useCallback((card: TriviaCard, currentTimeline: TriviaCard[]): number => {
    for (let i = 0; i < currentTimeline.length; i++) {
      if (card.year < currentTimeline[i].year) {
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

    if (isCorrect) {
      const newTimeline = [...timeline];
      newTimeline.splice(droppedIndex, 0, currentCard);
      setTimeline(newTimeline);

      const newScore = score + 1;
      setScore(newScore);
      if (category) {
        updateHighScore(category, newScore);
      }

      if (deck.length > 0) {
        setCurrentCard(deck[0]);
        setDeck(deck.slice(1));
      } else {
        setCurrentCard(null);
      }

      return { 
        success: true, 
        correctIndex: droppedIndex, 
        remainingLives: lives,
        noMoreCards: deck.length === 0
      };
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setIncorrectCardIds(prev => [...prev, currentCard.id]);

      // Place it at the wrong (dropped) index first in timeline state
      const newTimeline = [...timeline];
      newTimeline.splice(droppedIndex, 0, currentCard);
      setTimeline(newTimeline);

      if (newLives <= 0) {
        setCurrentCard(null);
      } else {
        if (deck.length > 0) {
          setCurrentCard(deck[0]);
          setDeck(deck.slice(1));
        } else {
          setCurrentCard(null);
        }
      }

      return { 
        success: false, 
        correctIndex, 
        remainingLives: newLives,
        noMoreCards: deck.length === 0 && newLives > 0
      };
    }
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
      startGame(category);
    }
  }, [category, startGame]);

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
    resetGame,
    restartGame,
    endGame,
    moveTimelineCard
  };
}
