import { Category } from "../hooks/useGameState";
import { Trophy, RotateCcw, Home, Star } from "lucide-react";

interface GameOverProps {
  score: number;
  highScore: number;
  category: Category;
  onRestart: () => void;
  onHome: () => void;
}

const CATEGORY_NAMES: Record<Category, string> = {
  history: "History",
  cinema: "Cinema & Arts",
  science: "Science & Technology",
  general: "General Trivia",
  culture: "Culture & Heritage"
};

export function GameOver({ score, highScore, category, onRestart, onHome }: GameOverProps) {
  const getAwardTitle = (s: number) => {
    if (s <= 2) {
      return { 
        title: "Anonymous IP Editor", 
        desc: "A humble start. Take a walk through history, verify some references, and try again!" 
      };
    }
    if (s <= 5) {
      return { 
        title: "Stub Creator", 
        desc: "Good start! You've successfully added stub entries to the timeline. Keep editing!" 
      };
    }
    if (s <= 10) {
      return { 
        title: "Wiki Citation Editor", 
        desc: "Excellent precision! You check the facts and add high-quality citations to history." 
      };
    }
    if (s <= 18) {
      return { 
        title: "Wiki Wiki Master", 
        desc: "Fast, accurate, and prolific editor! You shape the timeline entries with absolute confidence." 
      };
    }
    if (s <= 29) {
      return { 
        title: "Administrator (Sysop)", 
        desc: "Outstanding intellect! You safeguard the timeline from historical vandalism. Chanakya level knowledge!" 
      };
    }
    return { 
      title: "Jimmy Wales Envoy", 
      desc: "Founder-level encyclopedic wisdom! You practically wrote the history pages yourself!" 
    };
  };

  const getHeaderText = (s: number) => {
    if (s <= 5) return { text: "Game Over", bg: "bg-[#FF6B6B]" };
    if (s <= 15) return { text: "Good Effort!", bg: "bg-[#FFF97A]" };
    if (s <= 29) return { text: "Impressive!", bg: "bg-[#E5C2FF]" };
    return { text: "Wiki Legend!", bg: "bg-[#7AFF9B]" };
  };

  const award = getAwardTitle(score);
  const header = getHeaderText(score);
  const isNewHighScore = score > 0 && score >= highScore;

  return (
    <div className="w-full max-w-md mx-auto p-8 border-brutal-thick bg-white text-black shadow-brutal-xl relative rotate-[0.5deg]">
      {/* Decorative Stamp badge */}
      {isNewHighScore && (
        <div className="absolute -top-6 -right-4 bg-[#FF7A9B] border-brutal px-3 py-1 font-black text-xs uppercase shadow-brutal-sm rotate-[12deg] flex items-center gap-1 z-10 animate-bounce">
          <Star className="w-4 h-4 fill-black text-black" />
          <span>New Best!</span>
        </div>
      )}

      {/* Main Title Badge */}
      <div className="text-center mb-6">
        <h2 className={`text-4xl font-black uppercase border-brutal ${header.bg} text-black px-6 py-2 shadow-brutal inline-block rotate-[-2deg]`}>
          {header.text}
        </h2>
        <p className="text-black text-xs font-bold uppercase tracking-widest mt-4">
          Category: {CATEGORY_NAMES[category]}
        </p>
      </div>

      {/* Neubrutalist Block Score Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 border-brutal bg-[#FFF97A] shadow-brutal">
          <span className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">Your Score</span>
          <span className="text-5xl font-black text-black">{score}</span>
        </div>
        <div className="p-4 border-brutal bg-[#7AFF9B] shadow-brutal">
          <span className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">High Score</span>
          <span className="text-5xl font-black text-black flex items-center justify-center gap-1">
            <Trophy className="w-8 h-8 text-black stroke-[2.5]" />
            {isNewHighScore ? score : highScore}
          </span>
        </div>
      </div>

      {/* Award Title Box */}
      <div className="p-5 border-brutal bg-[#E5C2FF] shadow-brutal text-center mb-8 rotate-[-1deg]">
        <span className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">
          Honorable Title Achieved
        </span>
        <h3 className="text-2xl font-black text-black uppercase tracking-tight mb-2 border-b-2 border-black pb-1 inline-block">
          {award.title}
        </h3>
        <p className="text-xs font-bold text-black leading-relaxed mt-2">
          {award.desc}
        </p>
      </div>

      {/* Bold Brutalist Buttons */}
      <div className="flex flex-col gap-4">
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 w-full py-4 border-brutal bg-[#FF931F] hover:bg-[#FFB054] font-black text-lg text-black shadow-brutal transition-all cursor-pointer active:translate-x-[3px] active:translate-y-[3px] active:shadow-brutal-sm"
        >
          <RotateCcw className="w-5 h-5 stroke-[2.5]" />
          PLAY AGAIN
        </button>
        <button
          onClick={onHome}
          className="flex items-center justify-center gap-2 w-full py-4 border-brutal bg-[#7AE4FF] hover:bg-[#A9EFFF] font-black text-md text-black shadow-brutal transition-all cursor-pointer active:translate-x-[3px] active:translate-y-[3px] active:shadow-brutal-sm"
        >
          <Home className="w-5 h-5 stroke-[2.5]" />
          DASHBOARD HOME
        </button>
      </div>
    </div>
  );
}
