import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Category, useGameState } from "../hooks/useGameState";
import { TriviaCard } from "./TriviaCard";
import { Heart, ArrowLeft, Plus, ChevronRight, ChevronLeft, Users } from "lucide-react";
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

export function GameBoard({ category, gameState, multiplayerState }: GameBoardProps) {
  const {
    timeline,
    deck,
    currentCard,
    score,
    lives,
    highScores,
    placeCard,
    resetGame
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
    card: typeof timeline[0];
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
      const boardEl = boardRef.current;
      const deckEl = document.getElementById("draw-pile-deck");
      const targetEl = document.getElementById("timeline-base-placeholder");

      if (boardEl && deckEl && targetEl) {
        const boardRect = boardEl.getBoundingClientRect();
        const deckRect = deckEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        setDealAnimation({
          card: timeline[0],
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

  // Continuous scroll boundary triggers (Task 1)
  const scrollIntervalRef = useRef<number | null>(null);

  const startScrolling = (direction: "left" | "right") => {
    if (scrollIntervalRef.current) return;
    scrollIntervalRef.current = window.setInterval(() => {
      if (timelineContainerRef.current) {
        timelineContainerRef.current.scrollBy({
          left: direction === "left" ? -22 : 22,
          behavior: "auto"
        });
      }
    }, 20);
  };

  const stopScrolling = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  // Handle Drag Start (Task 5)
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    setIsCardSelected(false);
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
  };

  // Drag over dropzones (Task 6)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (isAnimating) return;
    e.dataTransfer.dropEffect = "move";
    if (hoveredDropzone !== index) {
      setHoveredDropzone(index);
    }
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (isAnimating) return;
    setHoveredDropzone(index);
  };

  const handleDragLeave = (index: number) => {
    if (hoveredDropzone === index) {
      setHoveredDropzone(null);
    }
  };

  // Handle Drop Action
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (isAnimating || !currentCard) return;

    setIsDragging(false);
    setHoveredDropzone(null);

    executePlacement(index);
  };

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

  return (
    <div ref={boardRef} className="relative w-full flex flex-col items-center justify-between min-h-[90vh] py-2 sm:py-4 px-2 sm:px-4 select-none">
      {/* Top Header Panel */}
      <header className="w-full max-w-5xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 p-2 sm:px-6 sm:py-4 border-brutal-thick bg-white text-black shadow-brutal mb-4 sm:mb-10 rotate-[-0.5deg]">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={resetGame}
            className="p-1.5 sm:p-2 border-2 border-black bg-[#FF7A9B] hover:bg-[#FF9CB5] shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
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
            <span className="text-[9px] sm:text-[10px] font-black uppercase mr-0.5 sm:mr-1">Lives:</span>
            {renderHearts()}
          </div>

          {/* Scores */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right border-2 border-black bg-[#7AFF9B] px-2 sm:px-3 py-0.5 sm:py-1 shadow-brutal-sm">
              <span className="block text-[7px] sm:text-[8px] font-black uppercase text-black tracking-wide">Score</span>
              <span className="text-sm sm:text-lg font-black text-black">{score}</span>
            </div>
            <div className="text-right border-2 border-black bg-[#FFF97A] px-2 sm:px-3 py-0.5 sm:py-1 shadow-brutal-sm">
              <span className="block text-[7px] sm:text-[8px] font-black uppercase text-black tracking-wide">Best</span>
              <span className="text-sm sm:text-lg font-black text-black">{highScores}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Timeline Section */}
      <main className="w-full flex flex-col items-center justify-center flex-1 my-2 sm:my-4">
        <div className="relative w-full flex items-center justify-center mb-8 sm:mb-16">
          {/* Timeline Scroll Buttons */}
          <button
            onClick={() => scrollTimeline("left")}
            className="absolute left-4 z-20 p-3 border-2 border-black bg-[#FFF97A] hover:bg-[#FFFBA9] text-black shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-[transform,box-shadow,background-color] duration-150 cursor-pointer hidden md:flex"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          <div
            ref={timelineContainerRef}
            className={`w-full overflow-x-auto no-scrollbar py-8 flex items-center px-16 snap-x ${
              isAnimating ? "pointer-events-none" : ""
            }`}
          >
            <div className="flex items-center justify-center mx-auto min-w-max">
            {/* Timeline Base Placeholder (for GSAP deal flight targeting) */}
            {!showBaseCard && (
              <div 
                id="timeline-base-placeholder" 
                className="w-44 h-60 border-[3px] border-dashed border-black/20 mx-4 opacity-0 flex-shrink-0"
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
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnter={(e) => handleDragEnter(e, idx)}
                        onDragLeave={() => handleDragLeave(idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onClick={() => handleDropzoneClick(idx)}
                        className={`
                          dropzone-active h-60 flex flex-col items-center justify-center rounded-none border-[3px] border-dashed border-black
                          ${hoveredDropzone === idx
                            ? "w-40 sm:w-44 bg-[#7AFF9B] border-solid shadow-brutal translate-x-[-3px] translate-y-[-3px] mx-2 sm:mx-4"
                            : isCardSelected
                            ? "w-40 sm:w-44 bg-[#FFF97A] border-solid shadow-brutal cursor-pointer mx-2 sm:mx-4 animate-pulse"
                            : isDragging
                            ? "w-16 sm:w-20 bg-slate-100 border-black/40 mx-1 sm:mx-2"
                            : "w-4 sm:w-6 border-transparent mx-0.5 sm:mx-1"
                          }
                        `}
                      >
                        {(hoveredDropzone === idx || isCardSelected) && (
                          <div className="flex flex-col items-center gap-2 text-black p-2 sm:p-4 text-center pointer-events-none">
                            <Plus className="w-6 h-6 sm:w-8 sm:h-8 stroke-[3]" />
                            <span className="text-[9px] sm:text-[10px] font-black tracking-tighter uppercase">PLACE CARD</span>
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
                          className="mx-2 sm:mx-4"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* End Dropzone */}
                <div className="flex items-center flex-shrink-0 snap-center">
                  <div
                    onDragOver={(e) => handleDragOver(e, timeline.length)}
                    onDragEnter={(e) => handleDragEnter(e, timeline.length)}
                    onDragLeave={() => handleDragLeave(timeline.length)}
                    onDrop={(e) => handleDrop(e, timeline.length)}
                    onClick={() => handleDropzoneClick(timeline.length)}
                    className={`
                      dropzone-active h-60 flex flex-col items-center justify-center rounded-none border-[3px] border-dashed border-black
                      ${hoveredDropzone === timeline.length
                        ? "w-40 sm:w-44 bg-[#7AFF9B] border-solid shadow-brutal translate-x-[-3px] translate-y-[-3px] mx-2 sm:mx-4"
                        : isCardSelected
                        ? "w-40 sm:w-44 bg-[#FFF97A] border-solid shadow-brutal cursor-pointer mx-2 sm:mx-4 snap-center animate-pulse"
                        : isDragging
                        ? "w-16 sm:w-20 bg-slate-100 border-black/40 mx-1 sm:mx-2"
                        : "w-4 sm:w-6 border-transparent mx-0.5 sm:mx-1"
                      }
                    `}
                  >
                    {(hoveredDropzone === timeline.length || isCardSelected) && (
                      <div className="flex flex-col items-center gap-2 text-black p-2 sm:p-4 text-center pointer-events-none">
                        <Plus className="w-6 h-6 sm:w-8 sm:h-8 stroke-[3]" />
                        <span className="text-[9px] sm:text-[10px] font-black tracking-tighter uppercase">PLACE CARD</span>
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
            className="absolute right-4 z-20 p-3 border-2 border-black bg-[#FFF97A] hover:bg-[#FFFBA9] text-black shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-[transform,box-shadow,background-color] duration-150 cursor-pointer hidden md:flex"
          >
            <ChevronRight className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Next Card To Sort / Draw Deck Area */}
        {currentCard && (
          <div className="flex flex-col items-center gap-4 mt-16">
            <span className="text-xs font-black bg-white border-2 border-black text-black px-3 py-1 uppercase shadow-brutal-sm rotate-[-1deg]">
              Draw Deck Pile
            </span>

            {/* Unified Physical Deck Wrapper */}
            <div 
              className={`relative w-44 h-60 select-none transition-[transform,opacity] duration-250 ${
                showDeck ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
              }`}
            >
              {/* Layered stack of face-down card backs underneath */}
              <div className="absolute inset-0 translate-y-3 translate-x-2 rotate-[4deg] bg-card-back border-[3px] border-black shadow-brutal-sm opacity-60"></div>
              <div className="absolute inset-0 translate-y-1.5 translate-x-[-1px] rotate-[-2deg] bg-card-back border-[3px] border-black shadow-brutal-sm opacity-80"></div>
              
              {/* Top card of the deck (ID: draw-pile-deck for GSAP tracking) */}
              <div id="draw-pile-deck" className="absolute inset-0 translate-y-0 translate-x-0 rotate-0">
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
                  <div className="w-full h-full border-[3px] border-black bg-card-back shadow-brutal flex flex-col justify-center items-center p-4">
                    <div className="w-16 h-16 rounded-full border-[3px] border-black bg-[#FFF97A] flex items-center justify-center shadow-brutal-sm rotate-[-6deg] animate-pulse">
                      <span className="text-3xl font-black text-black">?</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Guide Bubble */}
            <div className="border-2 border-black bg-white text-black p-3 shadow-brutal-sm text-center max-w-sm rotate-[1.5deg] mt-2">
              <p className="text-[10px] font-bold uppercase">
                {isCardSelected 
                  ? "👉 Click any highlighted slot on the timeline to place card!"
                  : "💡 Drag this card directly off the deck into the timeline slots!"
                }
              </p>
            </div>
          </div>
        )}
      </main>
      {dealAnimation && (
        <div
          id="deal-animation-card"
          className="absolute z-50 pointer-events-none"
          style={{
            left: dealAnimation.from.x,
            top: dealAnimation.from.y,
            width: 176,
            height: 240,
          }}
        >
          <TriviaCard card={dealAnimation.card} revealed={dealAnimation.type === "timeline"} className="mx-0" />
        </div>
      )}

      {/* Invisible Scroll Zones for Drag Scrolling (Task 1) */}
      {isDragging && (
        <>
          <div
            className="fixed left-0 top-[150px] bottom-[150px] w-28 z-40 bg-transparent cursor-ew-resize"
            onDragOver={(e) => {
              e.preventDefault();
              startScrolling("left");
            }}
            onDragLeave={stopScrolling}
            onDrop={stopScrolling}
          />
          <div
            className="fixed right-0 top-[150px] bottom-[150px] w-28 z-40 bg-transparent cursor-ew-resize"
            onDragOver={(e) => {
              e.preventDefault();
              startScrolling("right");
            }}
            onDragLeave={stopScrolling}
            onDrop={stopScrolling}
          />
        </>
      )}
    </div>
  );
}
