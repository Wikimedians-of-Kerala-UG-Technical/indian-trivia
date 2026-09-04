import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useGameState, type Category } from "../hooks/useGameState";
import { TriviaCard } from "./TriviaCard";
import type { TriviaCard as TriviaCardData } from "../data/trivia";
import { Heart, ArrowLeft, Plus, ChevronRight, ChevronLeft, Users, Timer } from "lucide-react";
import gsap from "gsap";
import type { MPPlayer } from "../hooks/useMultiplayer";
import { MultiplayerScoreboard } from "./MultiplayerUI";

interface GameBoardProps {
  category: Category;
  gameState: ReturnType<typeof useGameState>;
  multiplayerState?: { players: MPPlayer[]; myId: string };
}

const CATEGORY_NAMES: Record<Category, string> = {
  history: "History",
  cinema: "Cinema & Arts",
  science: "Science & Technology",
  general: "General",
  culture: "Culture & Heritage"
};

const CATEGORY_HEADER_BG: Record<Category, string> = {
  history: "bg-[#FFBE7A]",
  cinema: "bg-[#C87AFF]",
  science: "bg-[#7AFF9B]",
  general: "bg-[#FF7A9B]",
  culture: "bg-[#FFE885]"
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GameBoard({ category, gameState, multiplayerState }: GameBoardProps) {
  const {
    timeline,
    deck,
    currentCard,
    score,
    lives,
    highScores,
    placeCard,
    resetGame,
    timerDuration,
    timeRemaining,
  } = gameState;

  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredDropzone, setHoveredDropzone] = useState<number | null>(null);

  // Click-to-place (touch/mobile accessibility) state
  const [isCardSelected, setIsCardSelected] = useState(false);

  // Validation feedback state
  const [feedbackCardId, setFeedbackCardId] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"correct" | "incorrect" | null>(null);
  const [shakeHearts, setShakeHearts] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Neubrutalist Staggered Deal Animation states
  const [showDeck, setShowDeck] = useState(false);
  const [showBaseCard, setShowBaseCard] = useState(false);
  const [showActiveCard, setShowActiveCard] = useState(false);

  // Global deal animation layer state
  interface DealAnimation {
    card: TriviaCardData;
    from: { x: number; y: number };
    to: { x: number; y: number };
    type: "timeline" | "active";
  }
  const [dealAnimation, setDealAnimation] = useState<DealAnimation | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const isFirstCardRef = useRef(true);
  const prevPositionsRef = useRef<Record<string, { left: number; top: number }>>({});

  useLayoutEffect(() => {
    // 1. Measure new positions using offsetParent coordinates (scroll-independent)
    const newPositions: Record<string, { left: number; top: number }> = {};
    timeline.forEach(card => {
      const el = document.getElementById(`timeline-item-${card.id}`);
      if (el) {
        newPositions[card.id] = {
          left: el.offsetLeft,
          top: el.offsetTop
        };
      }
    });

    // 2. Perform FLIP animation for shifted elements
    timeline.forEach(card => {
      const el = document.getElementById(`timeline-item-${card.id}`);
      if (!el) return;

      const prevPos = prevPositionsRef.current[card.id];
      const newPos = newPositions[card.id];

      if (prevPos && newPos) {
        const dx = prevPos.left - newPos.left;
        const dy = prevPos.top - newPos.top;

        if (dx !== 0 || dy !== 0) {
          gsap.killTweensOf(el);
          gsap.fromTo(el,
            { x: dx, y: dy },
            {
              x: 0,
              y: 0,
              duration: 0.45,
              ease: "power3.out",
              clearProps: "transform"
            }
          );
        }
      }
    });

    // 3. Keep records of the current positions for the next render pass
    prevPositionsRef.current = newPositions;
  }, [timeline]);

  // Background image prefetch hook to prevent skeleton load flicker
  useEffect(() => {
    const urls: string[] = [];
    if (currentCard?.image) {
      urls.push(currentCard.image);
    }
    timeline.forEach(card => {
      if (card.image) urls.push(card.image);
    });
    if (deck) {
      deck.forEach(card => {
        if (card.image) urls.push(card.image);
      });
    }

    const uniqueUrls = Array.from(new Set(urls));
    uniqueUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, [timeline, deck, currentCard?.id]);

  // 1. Initial mount dealing sequence using global DealAnimationLayer
  useEffect(() => {
    // A. Slide up the draw pile deck
    const deckTimer = setTimeout(() => {
      setShowDeck(true);
    }, 100);

    // B. Deal the first baseline card from the deck to the timeline
    const baseTimer = setTimeout(() => {
      const baseCard = timeline[0];
      if (!baseCard) {
        setShowBaseCard(true);
        return;
      }

      const boardEl = boardRef.current;
      const deckEl = document.getElementById("draw-pile-deck");
      const targetEl = document.getElementById("timeline-base-placeholder");

      if (boardEl && deckEl && targetEl) {
        const boardRect = boardEl.getBoundingClientRect();
        const deckRect = deckEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        setDealAnimation({
          card: baseCard,
          from: {
            x: deckRect.left - boardRect.left,
            y: deckRect.top - boardRect.top
          },
          to: {
            x: targetRect.left - boardRect.left,
            y: targetRect.top - boardRect.top
          },
          type: "timeline"
        });

        // End of base deal flight
        const baseFinishTimer = setTimeout(() => {
          setShowBaseCard(true);
          setDealAnimation(null);
        }, 750);

        return () => clearTimeout(baseFinishTimer);
      } else {
        // Fallback
        setShowBaseCard(true);
      }
    }, 800);

    // C. Deal the first sorting card
    const activeTimer = setTimeout(() => {
      if (!currentCard) return;
      const boardEl = boardRef.current;
      const deckEl = document.getElementById("draw-pile-deck");
      const targetEl = document.getElementById("active-card-placeholder");

      if (boardEl && deckEl && targetEl) {
        const boardRect = boardEl.getBoundingClientRect();
        const deckRect = deckEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        setDealAnimation({
          card: currentCard,
          from: {
            x: deckRect.left - boardRect.left,
            y: deckRect.top - boardRect.top
          },
          to: {
            x: targetRect.left - boardRect.left,
            y: targetRect.top - boardRect.top
          },
          type: "active"
        });

        // End of active deal flight
        const activeFinishTimer = setTimeout(() => {
          setShowActiveCard(true);
          setDealAnimation(null);
        }, 750);

        return () => clearTimeout(activeFinishTimer);
      } else {
        // Fallback
        setShowActiveCard(true);
      }
    }, 1700);

    return () => {
      clearTimeout(deckTimer);
      clearTimeout(baseTimer);
      clearTimeout(activeTimer);
    };
  }, []);

  // 2. Subsequent draw sequences (flip face-up on the deck)
  useEffect(() => {
    if (!currentCard) return;

    if (isFirstCardRef.current) {
      isFirstCardRef.current = false;
      return;
    }

    // Reset active card to face-down top card of the deck
    setShowActiveCard(false);

    // Trigger flip face-up to show the new clue after placement settles
    const timer = setTimeout(() => {
      setShowActiveCard(true);
    }, 450);

    return () => clearTimeout(timer);
  }, [currentCard?.id]);

  // 3. GSAP deal animation execution
  useEffect(() => {
    if (!dealAnimation) return;

    const animEl = document.getElementById("deal-animation-card");
    if (!animEl) return;

    gsap.killTweensOf(animEl);
    gsap.fromTo(animEl,
      {
        x: 0,
        y: 0,
        scale: 0.25,
        rotation: dealAnimation.type === "timeline" ? 12 : -12,
        opacity: 0
      },
      {
        x: dealAnimation.to.x - dealAnimation.from.x,
        y: dealAnimation.to.y - dealAnimation.from.y,
        scale: 1,
        rotation: 0,
        opacity: 1,
        duration: 0.75,
        ease: "power2.out"
      }
    );
  }, [dealAnimation]);


  // Scroll timeline left/right
  const scrollTimeline = (direction: "left" | "right") => {
    if (timelineContainerRef.current) {
      const scrollAmount = 300;
      timelineContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // Center the timeline on updates
  useEffect(() => {
    if (timelineContainerRef.current) {
      setTimeout(() => {
        if (timelineContainerRef.current) {
          timelineContainerRef.current.scrollTo({
            left: timelineContainerRef.current.scrollWidth,
            behavior: "smooth"
          });
        }
      }, 300);
    }
  }, [timeline.length]);

  // Animates card shifting from wrong dropped index to correct timeline index (FLIP animation)
  const animateCardGlide = (cardId: string, toIndex: number) => {
    gameState.moveTimelineCard(cardId, toIndex);
  };

  // Triggered when a placement action is executed (via drop or click)
  const executePlacement = (index: number) => {
    if (isAnimating || !currentCard) return;

    setIsAnimating(true);
    setIsCardSelected(false);

    const activeCard = currentCard;
    const { success, correctIndex, remainingLives, noMoreCards } = placeCard(index);

    if (success) {
      setFeedbackCardId(activeCard.id);
      setFeedbackType("correct");
      
      setTimeout(() => {
        setFeedbackCardId(null);
        setFeedbackType(null);
        setIsAnimating(false);

        // Check if victory has occurred (no cards remaining in deck) (Task 7)
        if (noMoreCards) {
          gameState.endGame();
        }
      }, 1000);
    } else {
      setFeedbackCardId(activeCard.id);
      setFeedbackType("incorrect");
      setShakeHearts(true);

      setTimeout(() => {
        setShakeHearts(false);
      }, 600);

      // Stage 2: shake finishes after 1.6s, then we glide to the correctIndex (Stage 3)
      setTimeout(() => {
        setFeedbackCardId(null);
        setFeedbackType(null);

        // Trigger the visual glide to the correct position
        animateCardGlide(activeCard.id, correctIndex);

        // Wait for the glide to finish (450ms) before ending the turn or checking game over
        setTimeout(() => {
          setIsAnimating(false);

          // Check if lives has expired
          if (remainingLives <= 0 || noMoreCards) {
            gameState.endGame();
          }
        }, 450);
      }, 1600);
    }
  };

  // ─── Unified Edge-Scrolling & Dropzone Hit-Testing Engine ─────────────────
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoveredDropzoneRef = useRef<number | null>(null);
  useEffect(() => {
    hoveredDropzoneRef.current = hoveredDropzone;
  }, [hoveredDropzone]);

  const currentCardRef = useRef<TriviaCardData | null>(null);
  useEffect(() => {
    currentCardRef.current = currentCard;
  }, [currentCard]);

  const executePlacementRef = useRef(executePlacement);
  useEffect(() => {
    executePlacementRef.current = executePlacement;
  });

  // Hit-test helper: locates dropzone under (clientX, clientY) with boundary tolerance
  const checkDropzoneAtPoint = useCallback((clientX: number, clientY: number): number | null => {
    if (clientX < 0 || clientX > window.innerWidth || clientY < 0 || clientY > window.innerHeight) {
      return null;
    }

    // 1. Direct point sampling:
    // a) Floating card center (~65px above touch point)
    // b) Direct touch/cursor position
    // c) Timeline container vertical center line
    const testPoints: { x: number; y: number }[] = [
      { x: clientX, y: clientY - 65 },
      { x: clientX, y: clientY },
    ];

    const containerEl = timelineContainerRef.current;
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      if (clientY >= rect.top - 60 && clientY <= rect.bottom + 80) {
        testPoints.push({ x: clientX, y: rect.top + rect.height / 2 });
      }
    }

    for (const pt of testPoints) {
      if (pt.y < 0 || pt.y > window.innerHeight) continue;
      const elements = document.elementsFromPoint(pt.x, pt.y);
      for (const el of elements) {
        const dz = el.closest("[data-dropzone-index]");
        if (dz) {
          const attr = dz.getAttribute("data-dropzone-index");
          if (attr !== null) {
            return parseInt(attr, 10);
          }
        }
      }
    }

    // 2. Boundary detection for leftmost (index 0) and rightmost (index timeline.length) slots:
    // If the user drags past the first card to the left or past the last card to the right
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      if (clientY >= rect.top - 60 && clientY <= rect.bottom + 80) {
        // Dropzone 0 (leftmost slot)
        const firstDz = document.querySelector('[data-dropzone-index="0"]');
        if (firstDz) {
          const dzRect = firstDz.getBoundingClientRect();
          if (dzRect.right > 0 && clientX <= dzRect.right + 25) {
            return 0;
          }
        }

        // Dropzone N (rightmost slot)
        const lastDzIndex = timeline.length;
        const lastDz = document.querySelector(`[data-dropzone-index="${lastDzIndex}"]`);
        if (lastDz) {
          const dzRect = lastDz.getBoundingClientRect();
          if (dzRect.left < window.innerWidth && clientX >= dzRect.left - 25) {
            return lastDzIndex;
          }
        }
      }
    }

    return null;
  }, [timeline.length]);

  // Continuous edge scrolling
  const edgeScrollSpeedRef = useRef<number>(0);
  const edgeScrollTimerRef = useRef<number | null>(null);

  const stopEdgeScroll = useCallback(() => {
    edgeScrollSpeedRef.current = 0;
    if (edgeScrollTimerRef.current !== null) {
      clearInterval(edgeScrollTimerRef.current);
      edgeScrollTimerRef.current = null;
    }
  }, []);

  const startEdgeScroll = useCallback((speed: number) => {
    edgeScrollSpeedRef.current = speed;
    if (edgeScrollTimerRef.current !== null) return;

    edgeScrollTimerRef.current = window.setInterval(() => {
      if (timelineContainerRef.current && edgeScrollSpeedRef.current !== 0) {
        timelineContainerRef.current.scrollBy({
          left: edgeScrollSpeedRef.current,
          behavior: "auto",
        });

        // Continuous hit-testing while scrolling under stationary finger/cursor!
        const { x, y } = lastPointerPosRef.current;
        if (x !== 0 || y !== 0) {
          const foundIndex = checkDropzoneAtPoint(x, y);
          setHoveredDropzone(foundIndex);
        }
      }
    }, 16);
  }, [checkDropzoneAtPoint]);

  const updateDragEdgeScroll = useCallback((clientX: number) => {
    const winWidth = window.innerWidth;
    const EDGE_MARGIN = Math.min(180, Math.max(90, Math.round(winWidth * 0.22)));

    if (clientX < EDGE_MARGIN) {
      const ratio = Math.min(1, Math.max(0, (EDGE_MARGIN - clientX) / EDGE_MARGIN));
      const speed = -Math.round(10 + ratio * 22);
      startEdgeScroll(speed);
    } else if (clientX > winWidth - EDGE_MARGIN) {
      const ratio = Math.min(1, Math.max(0, (clientX - (winWidth - EDGE_MARGIN)) / EDGE_MARGIN));
      const speed = Math.round(10 + ratio * 22);
      startEdgeScroll(speed);
    } else {
      stopEdgeScroll();
    }
  }, [startEdgeScroll, stopEdgeScroll]);

  // Handle Drag Start (Desktop HTML5 Drag)
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    setIsCardSelected(false);
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    e.dataTransfer.setData("text/plain", currentCard?.id || "");
    e.dataTransfer.effectAllowed = "move";

    if (e.dataTransfer.setDragImage && e.currentTarget) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      e.dataTransfer.setDragImage(e.currentTarget, rect.width / 2, rect.height / 2);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setHoveredDropzone(null);
    stopEdgeScroll();
  };

  // Drag over dropzones (Desktop)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAnimating) return;
    e.dataTransfer.dropEffect = "move";
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    updateDragEdgeScroll(e.clientX);
    if (hoveredDropzone !== index) {
      setHoveredDropzone(index);
    }
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAnimating) return;
    setHoveredDropzone(index);
  };

  const handleDragLeave = (index: number) => {
    if (hoveredDropzone === index) {
      setHoveredDropzone(null);
    }
  };

  // Handle Drop Action (Desktop)
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    stopEdgeScroll();
    if (isAnimating || !currentCard) return;

    setIsDragging(false);
    setHoveredDropzone(null);

    executePlacementRef.current(index);
  };

  // Desktop HTML5 drag global listener for edge scrolling
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowDragOver = (e: DragEvent) => {
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      updateDragEdgeScroll(e.clientX);
      const targetIdx = checkDropzoneAtPoint(e.clientX, e.clientY);
      if (targetIdx !== null) {
        setHoveredDropzone(targetIdx);
      }
    };

    const handleWindowDragEnd = () => {
      stopEdgeScroll();
      setIsDragging(false);
      setHoveredDropzone(null);
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragend", handleWindowDragEnd);
    window.addEventListener("drop", handleWindowDragEnd);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragend", handleWindowDragEnd);
      window.removeEventListener("drop", handleWindowDragEnd);
      stopEdgeScroll();
    };
  }, [isDragging, updateDragEdgeScroll, stopEdgeScroll, checkDropzoneAtPoint]);

  const handleCardClick = () => {
    if (isAnimating) return;
    setIsCardSelected(prev => !prev);
  };

  const handleDropzoneClick = (index: number) => {
    if (!isCardSelected || isAnimating) return;
    executePlacement(index);
  };

  // Heart rendering helper (Neubrutal black borders)
  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < 3; i++) {
      if (i < lives) {
        hearts.push(
          <div key={i} className="p-1 border border-black bg-white rounded-none shadow-[1px_1px_0px_rgba(0,0,0,1)]">
            <Heart className="w-5 h-5 text-red-500 fill-red-500 stroke-[2.5]" />
          </div>
        );
      } else {
        hearts.push(
          <div key={i} className="p-1 border border-black bg-slate-200 rounded-none shadow-none opacity-45">
            <Heart className="w-5 h-5 text-slate-500 stroke-[2.5]" />
          </div>
        );
      }
    }
    return hearts;
  };

  // ─── Touch / Pointer Drag Engine for Mobile ──────────────────────────────
  const [touchDrag, setTouchDrag] = useState<{
    isDragging: boolean;
    x: number;
    y: number;
  } | null>(null);

  const touchTrackingRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);

  const handleCardPointerDown = (e: React.PointerEvent) => {
    if (isAnimating || !currentCard) return;
    if (e.button !== 0) return;

    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    touchTrackingRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      isDragging: false,
    };
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const tracking = touchTrackingRef.current;
      if (!tracking || tracking.pointerId !== e.pointerId) return;

      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      const dx = e.clientX - tracking.startX;
      const dy = e.clientY - tracking.startY;

      if (!tracking.isDragging) {
        if (Math.hypot(dx, dy) > 8) {
          tracking.isDragging = true;
          setIsCardSelected(false);
          document.body.style.overflow = "hidden"; // Scroll lock during drag
          setTouchDrag({
            isDragging: true,
            x: e.clientX,
            y: e.clientY,
          });
        }
      } else {
        e.preventDefault();
        setTouchDrag({
          isDragging: true,
          x: e.clientX,
          y: e.clientY,
        });

        // Hit testing for timeline dropzones
        const targetIdx = checkDropzoneAtPoint(e.clientX, e.clientY);
        setHoveredDropzone(targetIdx);

        // Edge auto-scrolling
        updateDragEdgeScroll(e.clientX);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const tracking = touchTrackingRef.current;
      if (!tracking || tracking.pointerId !== e.pointerId) return;

      stopEdgeScroll();
      document.body.style.overflow = "";

      if (tracking.isDragging) {
        const finalHovered = checkDropzoneAtPoint(e.clientX, e.clientY) ?? hoveredDropzoneRef.current;
        if (finalHovered !== null && currentCardRef.current) {
          executePlacementRef.current(finalHovered);
        }
        setHoveredDropzone(null);
        setTouchDrag(null);
      }

      touchTrackingRef.current = null;
    };

    const onPointerCancel = (e: PointerEvent) => {
      const tracking = touchTrackingRef.current;
      if (!tracking || tracking.pointerId !== e.pointerId) return;

      stopEdgeScroll();
      document.body.style.overflow = "";
      setHoveredDropzone(null);
      setTouchDrag(null);
      touchTrackingRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      stopEdgeScroll();
      document.body.style.overflow = "";
    };
  }, [checkDropzoneAtPoint, updateDragEdgeScroll, stopEdgeScroll]);

  const isAnyDragging = isDragging || (touchDrag?.isDragging ?? false);

  return (
    <div ref={boardRef} className="relative w-full flex flex-col items-center justify-between min-h-[90vh] py-1.5 sm:py-4 px-2 sm:px-4 select-none">
      {/* Top Header Panel */}
      <header className="w-full max-w-5xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-4 p-1.5 sm:px-6 sm:py-3 border-brutal-thick bg-white text-black shadow-brutal mb-2 sm:mb-6 rotate-[-0.5deg]">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={resetGame}
            className="p-1.5 sm:p-2 border-2 border-black bg-[#FF7A9B] hover:bg-[#FF9CB5] btn-brutal-sm cursor-pointer"
            title="Go to Home"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.5]" />
          </button>
          <div>
            <h2 className={`text-xs sm:text-base font-black uppercase border-2 border-black px-2 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] ${CATEGORY_HEADER_BG[category]}`}>
              {CATEGORY_NAMES[category]}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
          {/* Multiplayer Scoreboard (only in MP mode) */}
          {multiplayerState && multiplayerState.players.length > 1 && (
            <MultiplayerScoreboard
              players={multiplayerState.players}
              myId={multiplayerState.myId}
            />
          )}

          {/* Lives Box */}
          <div 
            className={`flex items-center gap-1 sm:gap-2 border-2 border-black bg-white px-2 sm:px-3 py-1 sm:py-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
              shakeHearts ? "animate-shake-brutal bg-[#FF6B6B]" : ""
            }`}
          >
            <span className="text-xs sm:text-xs font-black uppercase mr-0.5 sm:mr-1">Lives:</span>
            {renderHearts()}
          </div>

          {/* Timer Display */}
          {timerDuration > 0 && (
            <div className={`flex items-center gap-1.5 border-2 border-black px-2 sm:px-3 py-0.5 sm:py-1 shadow-brutal-sm ${
              timeRemaining <= 30
                ? "bg-[#FF6B6B] animate-pulse"
                : timeRemaining <= 60
                  ? "bg-[#FFF97A]"
                  : "bg-[#7AE4FF]"
            }`}>
              <Timer className="w-4 h-4 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span className="text-sm sm:text-lg font-black text-black tabular-nums">{formatTime(timeRemaining)}</span>
            </div>
          )}

          {/* Scores */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right border-2 border-black bg-[#7AFF9B] px-2 sm:px-3 py-0.5 sm:py-1 shadow-brutal-sm">
              <span className="block text-[8px] sm:text-[9px] font-black uppercase text-black tracking-wide">Score</span>
              <span className="text-sm sm:text-lg font-black text-black leading-tight">{score}</span>
            </div>
            <div className="text-right border-2 border-black bg-[#FFF97A] px-2 sm:px-3 py-0.5 sm:py-1 shadow-brutal-sm">
              <span className="block text-[8px] sm:text-[9px] font-black uppercase text-black tracking-wide">Best</span>
              <span className="text-sm sm:text-lg font-black text-black leading-tight">{highScores}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Timeline Section */}
      <main className="w-full flex flex-col items-center justify-center flex-1 my-1 sm:my-3">
        <div className="relative w-full flex items-center justify-center mb-2 sm:mb-6">
          {/* Timeline Scroll Buttons */}
          <button
            onClick={() => scrollTimeline("left")}
            aria-label="Scroll timeline left"
            className={`absolute left-1 sm:left-4 z-20 p-2 sm:p-3 border-2 border-black bg-[#FFF97A] hover:bg-[#FFFBA9] text-black btn-brutal cursor-pointer flex transition-opacity ${
              isAnyDragging ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </button>

          <div
            ref={timelineContainerRef}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
              updateDragEdgeScroll(e.clientX);
              const targetIdx = checkDropzoneAtPoint(e.clientX, e.clientY);
              if (targetIdx !== null && targetIdx !== hoveredDropzone) {
                setHoveredDropzone(targetIdx);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              stopEdgeScroll();
              if (isAnimating || !currentCard) return;
              const targetIdx = checkDropzoneAtPoint(e.clientX, e.clientY) ?? hoveredDropzoneRef.current;
              if (targetIdx !== null) {
                setIsDragging(false);
                setHoveredDropzone(null);
                executePlacementRef.current(targetIdx);
              }
            }}
            className={`w-full overflow-x-auto no-scrollbar py-2 sm:py-4 flex items-center px-6 sm:px-14 ${
              isAnyDragging ? "snap-none" : "snap-x"
            } ${isAnimating ? "pointer-events-none" : ""}`}
          >
            <div className="flex items-center justify-center mx-auto min-w-max px-4 sm:px-8">
            {/* Timeline Base Placeholder (for GSAP deal flight targeting) */}
            {!showBaseCard && (
              <div 
                id="timeline-base-placeholder" 
                className="w-48 h-[260px] sm:w-52 sm:h-[280px] border-[3px] border-dashed border-black/20 mx-1.5 sm:mx-2.5 opacity-0 flex-shrink-0"
              />
            )}
            
            {showBaseCard && (
              <>
                {timeline.map((card, idx) => {
                  const isCorrectFeedback = feedbackCardId === card.id && feedbackType === "correct";
                  const isIncorrectFeedback = feedbackCardId === card.id && feedbackType === "incorrect";

                  return (
                    <div id={`timeline-item-${card.id}`} key={`timeline-item-${card.id}`} className="flex items-center flex-shrink-0 snap-center">
                      
                      {/* Dropzone */}
                      <div
                        data-dropzone-index={idx}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnter={(e) => handleDragEnter(e, idx)}
                        onDragLeave={() => handleDragLeave(idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onClick={() => handleDropzoneClick(idx)}
                        className={`
                          dropzone-active h-[260px] sm:h-[280px] flex flex-col items-center justify-center rounded-none border-[3px] border-dashed border-black
                          ${hoveredDropzone === idx
                            ? "w-40 sm:w-48 bg-[#7AFF9B] border-solid shadow-brutal translate-x-[-3px] translate-y-[-3px] mx-1 sm:mx-2"
                            : isCardSelected
                            ? "w-40 sm:w-48 bg-[#FFF97A] border-solid shadow-brutal cursor-pointer mx-1 sm:mx-2 animate-pulse"
                            : isAnyDragging
                            ? "w-10 sm:w-14 bg-slate-100 border-black/40 mx-0.5 sm:mx-1"
                            : "w-3 sm:w-4 border-transparent mx-0.5"
                          }
                        `}
                      >
                        {(hoveredDropzone === idx || isCardSelected) && (
                          <div className="flex flex-col items-center gap-1.5 text-black p-2 text-center pointer-events-none">
                            <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" />
                            <span className="text-[10px] sm:text-xs font-black tracking-tighter uppercase">PLACE CARD</span>
                          </div>
                        )}
                      </div>

                      {/* Card wrapper */}
                      <div className="relative flex-shrink-0">
                        <TriviaCard 
                          card={card} 
                          revealed={true} 
                          skipInitialFlip={true} 
                          isIncorrect={gameState.incorrectCardIds.includes(card.id)}
                          isHoverDisabled={isAnimating}
                          feedbackState={isCorrectFeedback ? "correct" : isIncorrectFeedback ? "incorrect" : null}
                          className="mx-1.5 sm:mx-2.5"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* End Dropzone */}
                <div className="flex items-center flex-shrink-0 snap-center">
                  <div
                    data-dropzone-index={timeline.length}
                    onDragOver={(e) => handleDragOver(e, timeline.length)}
                    onDragEnter={(e) => handleDragEnter(e, timeline.length)}
                    onDragLeave={() => handleDragLeave(timeline.length)}
                    onDrop={(e) => handleDrop(e, timeline.length)}
                    onClick={() => handleDropzoneClick(timeline.length)}
                    className={`
                      dropzone-active h-[260px] sm:h-[280px] flex flex-col items-center justify-center rounded-none border-[3px] border-dashed border-black
                      ${hoveredDropzone === timeline.length
                        ? "w-40 sm:w-48 bg-[#7AFF9B] border-solid shadow-brutal translate-x-[-3px] translate-y-[-3px] mx-1 sm:mx-2"
                        : isCardSelected
                        ? "w-40 sm:w-48 bg-[#FFF97A] border-solid shadow-brutal cursor-pointer mx-1 sm:mx-2 snap-center animate-pulse"
                        : isAnyDragging
                        ? "w-10 sm:w-14 bg-slate-100 border-black/40 mx-0.5 sm:mx-1"
                        : "w-3 sm:w-4 border-transparent mx-0.5"
                      }
                    `}
                  >
                    {(hoveredDropzone === timeline.length || isCardSelected) && (
                      <div className="flex flex-col items-center gap-1.5 text-black p-2 text-center pointer-events-none">
                        <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" />
                        <span className="text-[10px] sm:text-xs font-black tracking-tighter uppercase">PLACE CARD</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            </div>
          </div>

          <button
            onClick={() => scrollTimeline("right")}
            aria-label="Scroll timeline right"
            className={`absolute right-1 sm:right-4 z-20 p-2 sm:p-3 border-2 border-black bg-[#FFF97A] hover:bg-[#FFFBA9] text-black btn-brutal cursor-pointer flex transition-opacity ${
              isAnyDragging ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Next Card To Sort / Draw Deck Area */}
        {currentCard && (
          <div className="flex flex-col items-center gap-1.5 sm:gap-3 mt-1.5 sm:mt-4">
            <span className="text-[10px] sm:text-xs font-black bg-white border-2 border-black text-black px-2.5 py-0.5 sm:px-3 sm:py-1 uppercase shadow-brutal-sm rotate-[-1deg]">
              Draw Deck Pile
            </span>

            {/* Unified Physical Deck Wrapper */}
            <div 
              className={`relative w-48 h-[260px] sm:w-52 sm:h-[280px] select-none transition-[transform,opacity] duration-250 ${
                showDeck ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
              }`}
            >
              {/* Layered stack of face-down card backs underneath */}
              <div className="absolute inset-0 translate-y-2 translate-x-1.5 rotate-[3deg] bg-card-back border-[3px] border-black shadow-brutal-sm opacity-60"></div>
              <div className="absolute inset-0 translate-y-1 translate-x-[-1px] rotate-[-1.5deg] bg-card-back border-[3px] border-black shadow-brutal-sm opacity-80"></div>
              
              {/* Top card of the deck (ID: draw-pile-deck for GSAP tracking) */}
              <div
                id="draw-pile-deck"
                className={`absolute inset-0 translate-y-0 translate-x-0 rotate-0 touch-none ${
                  touchDrag?.isDragging ? "opacity-20 scale-95" : ""
                }`}
                onPointerDown={handleCardPointerDown}
              >
                {showActiveCard ? (
                  <div key={`deal-${currentCard.id}`} className="relative w-full h-full">
                    {isCardSelected && (
                      <div className="absolute inset-0 border-brutal-thick bg-amber-400/20 shadow-brutal scale-105" />
                    )}
                    <TriviaCard
                      card={currentCard}
                      revealed={false}
                      isCurrent={!isAnimating}
                      isDragging={isDragging}
                      isSelected={isCardSelected}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={handleCardClick}
                      className="mx-0"
                    />
                  </div>
                ) : (
                  /* Face-down card back representation during baseline deals or draws */
                  <div className="w-full h-full border-[3px] border-black bg-card-back shadow-brutal flex flex-col justify-center items-center p-3 sm:p-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] border-black bg-[#FFF97A] flex items-center justify-center shadow-brutal-sm rotate-[-6deg] animate-pulse">
                      <span className="text-3xl sm:text-4xl font-black text-black">?</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Guide Bubble */}
            <div className="border-2 border-black bg-white text-black py-1 px-2.5 sm:py-1.5 sm:px-3 shadow-brutal-sm text-center max-w-sm rotate-[1deg] mt-1 sm:mt-2">
              <p className="text-[10px] sm:text-xs font-bold uppercase">
                {isCardSelected 
                  ? "👉 Click any highlighted slot on the timeline to place card!"
                  : "💡 Drag this card directly into timeline slots (or tap to select)!"
                }
              </p>
            </div>
          </div>
        )}
      </main>
      {dealAnimation && (
        <div
          id="deal-animation-card"
          className="absolute z-50 pointer-events-none w-48 h-[260px] sm:w-52 sm:h-[280px]"
          style={{
            left: dealAnimation.from.x,
            top: dealAnimation.from.y,
          }}
        >
          <TriviaCard card={dealAnimation.card} revealed={dealAnimation.type === "timeline"} className="mx-0" />
        </div>
      )}

      {/* Floating Card Drag Avatar for Touch Pointer Drag */}
      {touchDrag?.isDragging && currentCard && (
        <div
          className="fixed z-50 pointer-events-none transition-transform duration-75"
          style={{
            left: touchDrag.x,
            top: touchDrag.y - 65,
            transform: "translate(-50%, -50%) scale(1.05)",
            touchAction: "none",
          }}
        >
          <div className="shadow-brutal-xl">
            <TriviaCard
              card={currentCard}
              revealed={false}
              className="mx-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
