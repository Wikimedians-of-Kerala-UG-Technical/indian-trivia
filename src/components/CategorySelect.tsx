import React, { useState, useEffect } from "react";
import type { Category } from "../hooks/useGameState";
import { History, Sparkles, Film, Rocket, Landmark, Trophy } from "lucide-react";
import gsap from "gsap";

interface CategorySelectProps {
  onSelect: (category: Category) => void;
  highScores: Record<string, number>;
  onMultiplayer: () => void;
}

interface CategoryOption {
  id: Category;
  title: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  iconBg: string;
}

export function CategorySelect({ onSelect, highScores, onMultiplayer }: CategorySelectProps) {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [stepCaption, setStepCaption] = useState("1. Read the card on top of the deck.");

  useEffect(() => {
    if (!showHelpModal) return;

    // Timeout to let DOM layout settle, then measure and animate
    const timer = setTimeout(() => {
      const boardEl = document.getElementById("demo-board");
      const deckEl = document.getElementById("demo-deck-card");
      const targetEl = document.getElementById("demo-timeline-placeholder");

      if (!boardEl || !deckEl || !targetEl) return;

      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ repeat: -1 });

        // Measure layout rects dynamically
        const boardRect = boardEl.getBoundingClientRect();
        const deckRect = deckEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        const dx = targetRect.left - deckRect.left;
        const dy = targetRect.top - deckRect.top;

        // Pointer positions centered on respective cards
        const pointerStartX = deckRect.left - boardRect.left + deckRect.width / 2 - 10;
        const pointerStartY = deckRect.top - boardRect.top + deckRect.height / 2 - 10;

        const pointerEndX = pointerStartX + dx;
        const pointerEndY = pointerStartY + dy;

        // Reset positions
        gsap.set("#demo-deck-card", { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 });
        gsap.set("#demo-pointer", { x: pointerStartX + 60, y: pointerStartY + 60, opacity: 0 });
        gsap.set("#demo-timeline-card", { opacity: 0, scale: 0.8 });
        gsap.set("#demo-timeline-placeholder", { opacity: 1 });
        gsap.set("#demo-timeline-card-inner", { borderColor: "black", borderWidth: "2px" });
        setStepCaption("1. Read the card on top of the deck.");

        // Step 1: Fade in pointer on the deck card
        tl.to("#demo-pointer", { x: pointerStartX, y: pointerStartY, opacity: 1, duration: 0.8, ease: "power2.out" })
          .call(() => setStepCaption("1. Read the card on top of the deck."))
          .to({}, { duration: 1.2 }) // delay
          
          // Step 2: Grab the deck card and drag it to the placeholder
          .to("#demo-deck-card", { scale: 0.95, duration: 0.2 })
          .to("#demo-pointer", { scale: 0.8, duration: 0.2 }, "-=0.2")
          .call(() => setStepCaption("2. Place it in the appropriate position."))
          .to("#demo-deck-card", {
            x: dx,
            y: dy,
            duration: 1.5,
            ease: "power2.inOut"
          })
          .to("#demo-pointer", {
            x: pointerEndX,
            y: pointerEndY,
            duration: 1.5,
            ease: "power2.inOut"
          }, "-=1.5")
          .to({}, { duration: 1.0 }) // delay
          
          // Step 3: Drop it! Card disappears from deck slot, timeline card fades in and flashes green
          .to("#demo-deck-card", { opacity: 0, scale: 0.5, duration: 0.2 })
          .to("#demo-pointer", { opacity: 0, scale: 1, duration: 0.3 })
          .to("#demo-timeline-placeholder", { opacity: 0, duration: 0.2 }, "-=0.2")
          .to("#demo-timeline-card", { opacity: 1, scale: 1, duration: 0.4, ease: "back.out" })
          .to("#demo-timeline-card-inner", { borderColor: "#7AFF9B", borderWidth: "3px", duration: 0.3 }) // Flash green!
          .call(() => setStepCaption("3. Correct! The card flips to reveal the year."))
          .to({}, { duration: 2.8 }); // Hold at the end before repeating
      }, boardEl);

      return () => ctx.revert();
    }, 500);

    return () => clearTimeout(timer);
  }, [showHelpModal]);

  const categories: CategoryOption[] = [
    {
      id: "history",
      title: "History",
      description: "From ancient civilizations and dynastic rulers to freedom struggles.",
      icon: <Landmark className="w-8 h-8 text-black" />,
      bgColor: "bg-[#FFBE7A]", /* Saffron Pastel */
      iconBg: "bg-[#FF931F]"
    },
    {
      id: "cinema",
      title: "Cinema & Arts",
      description: "Tracing Raja Harishchandra, Indian cinema blockbusters, and Oscar wins.",
      icon: <Film className="w-8 h-8 text-black" />,
      bgColor: "bg-[#C87AFF]", /* Purple Pastel */
      iconBg: "bg-[#A020F0]"
    },
    {
      id: "science",
      title: "Science & Technology",
      description: "Space missions, satellites, supercomputers, and research milestones.",
      icon: <Rocket className="w-8 h-8 text-black" />,
      bgColor: "bg-[#7AFF9B]", /* Emerald Pastel */
      iconBg: "bg-[#129E59]"
    },
    {
      id: "culture",
      title: "Culture & Heritage",
      description: "Religions, spiritual traditions, sacred architecture, and festivals.",
      icon: <Sparkles className="w-8 h-8 text-black" />,
      bgColor: "bg-[#FFE885]", /* Warm Yellow Pastel */
      iconBg: "bg-[#E2B700]"
    },
    {
      id: "general",
      title: "General Trivia",
      description: "An all-around mix spanning history, cinema, science, and culture.",
      icon: <History className="w-8 h-8 text-black" />,
      bgColor: "bg-[#FF7A9B]", 
      iconBg: "bg-[#FF4D75]"
    }
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-12 flex flex-col items-center select-none">
      {/* Help Button (Circular "?") */}
      <button
        onClick={() => setShowHelpModal(true)}
        className="absolute top-4 right-4 w-10 h-10 border-2 border-black bg-[#FFF97A] hover:bg-[#FFFBA9] text-black font-black rounded-full flex items-center justify-center text-lg shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutal-sm z-30 transition-all"
        title="How to Play"
      >
        ?
      </button>
      <div className="text-center mb-16 relative">
        <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-4 uppercase border-brutal-thick bg-[#FDE047] text-black px-8 py-4 inline-block shadow-brutal rotate-[-1deg] transform">
          Wikindian Trivia
        </h1>
        <div className="mt-6">
          <p className="text-black text-md font-bold uppercase tracking-wider max-w-xl mx-auto bg-white border-2 border-black px-4 py-2 shadow-brutal-sm rotate-[1deg] inline-block">
            Sort the cards. Fix the timeline.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full px-2">
        {categories.map(cat => {
          const score = highScores[cat.id] || 0;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`
                group relative flex flex-col items-start p-6 rounded-none border-brutal-thick ${cat.bgColor}
                transition-all duration-150 shadow-brutal hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                active:translate-x-[6px] active:translate-y-[6px] active:shadow-none text-left cursor-pointer
              `}
            >
              {/* Score Indicator */}
              <div className="flex items-center justify-between w-full mb-6">
                <div className={`p-3 rounded-none border-brutal ${cat.iconBg}`}>
                  {cat.icon}
                </div>
                {score > 0 ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-300 border-2 border-black font-extrabold text-xs uppercase shadow-brutal-sm">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Best: {score}</span>
                  </div>
                ) : (
                  <div className="px-3 py-1 bg-white border-2 border-black font-extrabold text-[10px] uppercase">
                    New Game
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="mt-auto">
                <h3 className="text-2xl font-black text-black uppercase tracking-tight mb-2 border-b-2 border-black pb-1 inline-block">
                  {cat.title}
                </h3>
                <p className="text-black text-xs font-semibold leading-relaxed">
                  {cat.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Multiplayer Button */}
      <div className="mt-10 w-full flex justify-center">
        <button
          onClick={onMultiplayer}
          className="flex items-center gap-3 px-10 py-4 border-brutal-thick bg-[#C87AFF] hover:bg-[#D9A0FF] text-black font-black text-lg uppercase shadow-brutal hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[7px_7px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-brutal-sm transition-all cursor-pointer"
        >
          <span className="text-2xl">👥</span>
          Play Multiplayer
        </button>
      </div>
      {/* How to Play Modal Overlay */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg p-6 bg-[#FFEBD6] border-brutal-thick shadow-brutal flex flex-col items-center">
            {/* Close Button */}
            <button 
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 border-2 border-black bg-[#FF7A9B] hover:bg-[#FF9CB5] text-black font-black px-2.5 py-1 shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
            >
              ✕
            </button>
            
            <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-4 border-b-4 border-black pb-1 inline-block rotate-[-1deg]">
              How to Play
            </h2>

            {/* Animation Board */}
            <div id="demo-board" className="relative w-full h-[400px] border-2 border-black bg-white shadow-brutal-sm overflow-hidden flex flex-col justify-between items-center py-6 px-6 mb-4 select-none">
              
              {/* Timeline slot (Top) */}
              <div className="flex gap-8 items-center justify-center w-full mt-2">
                {/* Slotted Card and Target Placeholder overlapping in a relative container */}
                <div className="relative w-28 h-36 flex-shrink-0">
                  {/* Slotted Card (Railway, initially hidden/placed) */}
                  <div id="demo-timeline-card" className="absolute inset-0">
                    <div id="demo-timeline-card-inner" className="w-full h-full border-2 border-black bg-[#7AE4FF] shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)] p-2 flex flex-col justify-between items-center text-center">
                      <span className="text-[7px] font-black uppercase text-slate-500 tracking-wider">RAILWAY</span>
                      <span className="text-[8px] font-extrabold text-black uppercase leading-tight line-clamp-2 px-1">First Train in India</span>
                      <span className="bg-[#FFF97A] border border-black text-[9px] font-black text-black px-1.5 py-0.5 shadow-[1px_1px_0px_rgba(0,0,0,1)] mt-1">1853 CE</span>
                    </div>
                  </div>

                  {/* Target Placeholder */}
                  <div id="demo-timeline-placeholder" className="absolute inset-0 border-2 border-dashed border-black/35 bg-slate-50 flex flex-col justify-center items-center text-center p-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">DROP PLACE</span>
                  </div>
                </div>

                {/* Base Card (Independence) */}
                <div className="w-28 h-36 border-2 border-black bg-[#FFBE7A] shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)] p-2 flex flex-col justify-between items-center text-center flex-shrink-0">
                  <span className="text-[7px] font-black uppercase text-slate-500 tracking-wider">HISTORY</span>
                  <span className="text-[8px] font-extrabold text-black uppercase leading-tight line-clamp-2 px-1">Indian Independence</span>
                  <span className="bg-[#FFF97A] border border-black text-[9px] font-black text-black px-1.5 py-0.5 shadow-[1px_1px_0px_rgba(0,0,0,1)] mt-1">1947 CE</span>
                </div>
              </div>

              {/* Draw Pile (Bottom) */}
              <div className="relative w-28 h-36 flex items-center justify-center">
                {/* Deck Card backs stacked below */}
                <div className="absolute inset-0 translate-y-1.5 translate-x-1 rotate-[3deg] bg-card-back border-2 border-black shadow-brutal-sm opacity-60 w-28 h-36"></div>
                
                {/* Active Card resting on deck */}
                <div id="demo-deck-card" className="absolute inset-0 border-2 border-black bg-white shadow-brutal w-28 h-36 p-2 flex flex-col justify-between items-center text-center z-10">
                  <span className="text-[7px] font-black uppercase text-slate-500 tracking-wider">RAILWAY</span>
                  <span className="text-[8px] font-extrabold text-black uppercase leading-tight line-clamp-3 px-1 mt-2">First Indian railway starts from Bombay to Thane</span>
                  <span className="text-[6px] font-extrabold text-black uppercase bg-white border border-black px-1.5 py-0.5 shadow-[1px_1px_0px_rgba(0,0,0,1)]">DRAG ME!</span>
                </div>
              </div>

              {/* Custom hand cursor */}
              <div id="demo-pointer" className="absolute text-3xl pointer-events-none z-30" style={{ left: 0, top: 0 }}>
                👉
              </div>
            </div>

            {/* Instruction Step Text */}
            <div className="w-full text-center border-2 border-black bg-white text-black p-3 shadow-brutal-sm">
              <p id="demo-step-text" className="text-xs font-bold uppercase tracking-wide">
                {stepCaption}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
