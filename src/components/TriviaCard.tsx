import { useState, useEffect } from "react";
import type { TriviaCard as CardType } from "../data/trivia";
import { Landmark, Sparkles, Film, Rocket, History, Calendar } from "lucide-react";

interface TriviaCardProps {
  card: CardType;
  revealed?: boolean;
  isCurrent?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onClick?: () => void;
  skipInitialFlip?: boolean;
  isIncorrect?: boolean;
  isHoverDisabled?: boolean;
  feedbackState?: "correct" | "incorrect" | null;
  className?: string;
}

const CATEGORY_THEMES = {
  history: {
    bg: "bg-[#FFEBD6]",
    iconBg: "bg-[#FFBE7A]",
    icon: <Landmark className="w-4 h-4 text-black" />
  },
  cinema: {
    bg: "bg-[#F7EFFF]",
    iconBg: "bg-[#C87AFF]",
    icon: <Film className="w-4 h-4 text-black" />
  },
  science: {
    bg: "bg-[#EDFFE6]",
    iconBg: "bg-[#7AFF9B]",
    icon: <Rocket className="w-4 h-4 text-black" />
  },
  general: {
    bg: "bg-[#FFE6EC]",
    iconBg: "bg-[#FF7A9B]",
    icon: <History className="w-4 h-4 text-black" />
  },
  culture: {
    bg: "bg-[#FFFDE6]",
    iconBg: "bg-[#FFE885]",
    icon: <Sparkles className="w-4 h-4 text-black" />
  }
};

export function TriviaCard({
  card,
  revealed = false,
  isCurrent = false,
  isDragging = false,
  isSelected = false,
  onDragStart,
  onDragEnd,
  onClick,
  skipInitialFlip = false,
  isIncorrect = false,
  isHoverDisabled = false,
  feedbackState = null,
  className
}: TriviaCardProps) {
  const theme = CATEGORY_THEMES[card.category] || CATEGORY_THEMES.general;
  
  // 3D Flip States: starts face-down, flips face-up in mid-air
  const [isFlipped, setIsFlipped] = useState(
    skipInitialFlip ? (revealed ? true : false) : (revealed ? false : true)
  );
  const [hoverFlipped, setHoverFlipped] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const canHoverFlip = revealed && !isCurrent && !isHoverDisabled;
  const isFaceAActive = (canHoverFlip && hoverFlipped) || !isFlipped;
  const isFaceBActive = !isFaceAActive;

  useEffect(() => {
    if (skipInitialFlip) {
      setIsFlipped(revealed ? true : false);
      return;
    }

    setIsFlipped(revealed ? false : true);
    const timer = setTimeout(() => {
      setIsFlipped(revealed ? true : false);
    }, 450);
    return () => clearTimeout(timer);
  }, [revealed, card.id]);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setHoverFlipped(false);
  }, [card.id]);

  const formatYear = (year: number) => {
    if (year < 0) {
      return `${Math.abs(year)} BCE`;
    }
    return `${year} CE`;
  };

  const renderCardImage = (face: "A" | "B") => {
    const heightClass = face === "A" ? "h-[185px] sm:h-[120px]" : "h-[120px] sm:h-[75px]";

    if (imageError || !card.image) {
      return (
        <div className={`relative w-full ${heightClass} border border-black ${theme.iconBg} flex-shrink-0 my-1 flex items-center justify-center select-none`}>
          <div className="p-2.5 sm:p-2 rounded-full border border-black bg-white shadow-brutal-sm">
            {theme.icon}
          </div>
        </div>
      );
    }
    return (
      <div className={`relative w-full ${heightClass} border border-black bg-[#FFEBD6] flex-shrink-0 my-1 overflow-hidden select-none`}>
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#EAD4BA] animate-pulse flex items-center justify-center">
            <span className="text-[10px] sm:text-[8px] font-black uppercase text-slate-600 tracking-wider">Loading...</span>
          </div>
        )}
        <img
          src={card.image}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          ref={(el) => {
            if (el && el.complete && !imageLoaded && !imageError) {
              setTimeout(() => setImageLoaded(true), 0);
            }
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? "opacity-100" : "opacity-0 absolute"
          }`}
        />
      </div>
    );
  };

  return (
      <div
        draggable={isCurrent}
        onDragStart={isCurrent ? onDragStart : undefined}
        onDragEnd={isCurrent ? onDragEnd : undefined}
        onClick={onClick}
        onMouseEnter={canHoverFlip ? () => setHoverFlipped(true) : undefined}
        onMouseLeave={canHoverFlip ? () => setHoverFlipped(false) : undefined}
        className={`
          relative w-64 h-[356px] sm:w-44 sm:h-60 cursor-pointer select-none perspective-1000 flex-shrink-0
          ${className !== undefined ? className : "mx-2.5 sm:mx-4"}
          ${isDragging ? "opacity-40 scale-95" : "opacity-100 scale-100"}
          ${isSelected ? "ring-4 ring-dashed ring-black ring-offset-4 animate-pulse" : ""}
          ${feedbackState === "incorrect" ? "animate-shake-brutal" : ""}
          transition-[transform,opacity] duration-200
        `}
      >
        {/* Feedback Lighting Overlay - Exact Card Dimensions */}
        {feedbackState === "correct" && (
          <div className="absolute inset-0 z-30 pointer-events-none rounded-none border-[4px] border-[#22c55e] bg-emerald-400/25 animate-flash-correct shadow-[0_0_20px_rgba(34,197,94,0.7)]" />
        )}
        {feedbackState === "incorrect" && (
          <div className="absolute inset-0 z-30 pointer-events-none rounded-none border-[4px] border-[#ef4444] bg-red-500/25 shadow-[0_0_20px_rgba(239,68,68,0.7)]" />
        )}
        <div 
          className="relative w-full h-full preserve-3d card-flip-transition"
          style={{
            transform: canHoverFlip && hoverFlipped
              ? "rotateY(0deg)"
              : (isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"),
          }}
        >
          {/* ================= FACE A: CLUE FACE (Front) ================= */}
          <div 
            className="absolute inset-0 backface-hidden rounded-none"
          >
            <div className={`w-full h-full border-[3px] border-black p-3.5 sm:p-3 flex flex-col justify-start rounded-none bg-[#FFE885] ${
              isFaceAActive && !isCurrent ? "shadow-brutal" : ""
            }`}>
              {/* Image at the top, same padding top and x axes */}
              {renderCardImage("A")}

              {/* Title */}
              <div className="flex-1 flex flex-col justify-center items-center py-2 text-center select-none overflow-hidden">
                <h4 className="text-base sm:text-xs font-black text-black uppercase leading-snug tracking-tight line-clamp-3">
                  {card.title}
                </h4>
              </div>

              {/* Footer */}
              <div className="w-full flex justify-center mt-auto border-t-[1.5px] border-black pt-2 sm:pt-1.5 flex-shrink-0">
                <span className="text-xs sm:text-[9px] font-extrabold text-black uppercase tracking-wider bg-white border border-black px-2.5 sm:px-2 py-0.5 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
                  {isCurrent ? "SORT ME!" : "BHARAT TRIVIA"}
                </span>
              </div>
            </div>
          </div>

          {/* ================= FACE B: BACK FACE (Card Back OR Year Face) ================= */}
          <div 
            className="absolute inset-0 backface-hidden rotate-y-180 rounded-none"
          >
            {revealed ? (
              /* Revealed Year Face (Image, Title, Description, Year) */
              <div className={`w-full h-full border-[3px] border-black p-3.5 sm:p-3 flex flex-col justify-start rounded-none ${theme.bg} ${
                isFaceBActive && !isCurrent ? "shadow-brutal" : ""
              }`}>
                {/* Image at the top, same padding top and x axes */}
                {renderCardImage("B")}

                {/* Title */}
                <h4 className="mt-2 text-sm sm:text-[10px] font-black text-black uppercase leading-tight line-clamp-2 text-center select-none">
                  {card.title}
                </h4>

                {/* Description */}
                <p className="mt-1.5 text-xs sm:text-[8px] font-semibold text-black/80 leading-snug line-clamp-3 text-center italic select-none">
                  {card.description}
                </p>

                {/* Year Value at the bottom */}
                <div className="mt-auto pt-2 flex justify-center select-none">
                  <div className={`border-[2px] border-black px-3 sm:px-2.5 py-1 sm:py-0.5 text-sm sm:text-[10px] font-black text-black uppercase tracking-wide flex items-center gap-1.5 sm:gap-1 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] ${
                    isIncorrect ? "bg-[#FF6B6B]" : "bg-[#FFF97A]"
                  }`}>
                    <Calendar className="w-4 h-4 sm:w-3 sm:h-3 text-black stroke-[2.5]" />
                    {formatYear(card.year)}
                  </div>
                </div>
              </div>
            ) : (
              /* Card Back Design (Draw Pile Style) */
              <div className={`w-full h-full border-[3px] border-black rounded-none bg-card-back flex flex-col justify-center items-center p-4 ${
                isFaceBActive && !isCurrent ? "shadow-brutal" : ""
              }`}>
                <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full border-[3px] border-black bg-[#FFF97A] flex items-center justify-center shadow-brutal-sm rotate-[-6deg] animate-pulse">
                  <span className="text-4xl sm:text-3xl font-black text-black">?</span>
                </div>
                <div className="mt-6 border-2 border-black bg-white px-3.5 sm:px-3 py-1 shadow-brutal-sm rotate-[3deg]">
                  <span className="text-[10px] sm:text-[9px] font-black text-black uppercase tracking-widest">BHARAT CHRONO</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
