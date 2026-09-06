import React, { useState } from "react";
import { TriviaCard } from "../data/trivia";
import {
  ArrowLeft,
  Play,
  Search,
  Pencil,
  ExternalLink,
  Code,
  ChevronDown,
  AlertTriangle,
  ImageOff,
} from "lucide-react";

// ─── Example queries for discovery ────────────────────────────────────────────

const EXAMPLE_QUERIES = [
  {
    label: "🎬 Bollywood Films (Hindi Cinema)",
    query: `SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
  ?item wdt:P31 wd:Q11424 ;
        wdt:P495 wd:Q668 ;
        wdt:P364 wd:Q1568 ;
        wdt:P18 ?image ;
        wdt:P577 ?date .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 200`,
  },
  {
    label: "🚀 ISRO Satellites & Space Missions",
    query: `SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
  ?item wdt:P31/wdt:P279* wd:Q26540 ;
        wdt:P17 wd:Q668 ;
        wdt:P18 ?image ;
        wdt:P619 ?date .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 200`,
  },
  {
    label: "🛕 Indian Temples",
    query: `SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
  ?item wdt:P31 wd:Q44539 ;
        wdt:P17 wd:Q668 ;
        wdt:P18 ?image ;
        wdt:P571 ?date .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 200`,
  },
  {
    label: "🌿 Indian National Parks",
    query: `SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
  ?item wdt:P31 wd:Q46169 ;
        wdt:P17 wd:Q668 ;
        wdt:P18 ?image ;
        wdt:P571 ?date .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 200`,
  },
  {
    label: "🏛️ Indian Heritage Sites (UNESCO)",
    query: `SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
  ?item wdt:P1435 wd:Q9259 ;
        wdt:P17 wd:Q668 ;
        wdt:P18 ?image ;
        wdt:P571 ?date .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 200`,
  },
  {
    label: "🎥 Tamil Cinema (Kollywood)",
    query: `SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
  ?item wdt:P31 wd:Q11424 ;
        wdt:P495 wd:Q668 ;
        wdt:P364 wd:Q5885 ;
        wdt:P18 ?image ;
        wdt:P577 ?date .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 200`,
  },
];

const TIMER_OPTIONS = [
  { value: 0, label: "No Timer" },
  { value: 60, label: "1 Min" },
  { value: 120, label: "2 Min" },
  { value: 180, label: "3 Min" },
  { value: 300, label: "5 Min" },
] as const;

// ─── Helper: format year for preview ──────────────────────────────────────────

function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CustomSparqlScreenProps {
  onBack: () => void;
  onPlay: (cards: TriviaCard[], timer: number) => void;
}

export function CustomSparqlScreen({ onBack, onPlay }: CustomSparqlScreenProps) {
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0].query);
  const [previewCards, setPreviewCards] = useState<TriviaCard[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawCount, setRawCount] = useState(0);
  const [selectedTimer, setSelectedTimer] = useState(0);
  const [showExamples, setShowExamples] = useState(false);

  const handlePreview = async () => {
    setIsLoading(true);
    setError(null);
    setPreviewCards(null);

    try {
      const res = await fetch("/api/custom-sparql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Server error (${res.status})`);
        return;
      }

      setPreviewCards(data.cards || []);
      setRawCount(data.totalRaw || 0);
    } catch (err: any) {
      setError(err?.message || "Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = () => {
    if (previewCards && previewCards.length >= 2) {
      onPlay(previewCards, selectedTimer);
    }
  };

  const handleExampleSelect = (exampleQuery: string) => {
    setQuery(exampleQuery);
    setShowExamples(false);
    setPreviewCards(null);
    setError(null);
  };

  const wikidataQueryUrl = `https://query.wikidata.org/#${encodeURIComponent(query)}`;

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 py-8 flex flex-col items-center select-none">
      {/* Header */}
      <div className="w-full flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-xs uppercase btn-brutal-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          Back
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight border-b-4 border-black pb-1 inline-block">
            <Code className="w-6 h-6 inline-block mr-2 mb-1" />
            Custom SPARQL Category
          </h1>
        </div>
        <div className="w-20" /> {/* Spacer for centering */}
      </div>

      {/* Query Editor Section */}
      <div className="w-full border-brutal-thick bg-white shadow-brutal p-6 mb-6">
        {/* Editor Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-black">
            SPARQL Query
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Example Queries Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-[#FFF97A] hover:bg-[#FFFBA9] text-black font-black text-xs uppercase btn-brutal-sm cursor-pointer"
              >
                Examples
                <ChevronDown className={`w-3.5 h-3.5 stroke-[2.5] transition-transform ${showExamples ? "rotate-180" : ""}`} />
              </button>
              {showExamples && (
                <div className="absolute top-full left-0 mt-1 w-72 border-2 border-black bg-white shadow-brutal z-20">
                  {EXAMPLE_QUERIES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleSelect(ex.query)}
                      className="w-full text-left px-3 py-2.5 text-xs font-bold hover:bg-[#E6F0FF] border-b border-black/10 last:border-b-0 cursor-pointer transition-colors"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Test on Wikidata */}
            <a
              href={wikidataQueryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-[#7AE4FF] hover:bg-[#A9EFFF] text-black font-black text-xs uppercase btn-brutal-sm cursor-pointer"
            >
              Test on Wikidata
              <ExternalLink className="w-3 h-3 stroke-[2.5]" />
            </a>
          </div>
        </div>

        {/* Textarea Editor */}
        <textarea
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPreviewCards(null);
            setError(null);
          }}
          spellCheck={false}
          className="w-full h-52 p-4 border-2 border-black bg-[#FCF9F2] font-mono text-xs leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[#7AB8FF] focus:ring-offset-1"
          placeholder={`Paste your Wikidata SPARQL query here...\n\nRequired variables:\n  ?item, ?itemLabel, ?date (or ?inception, ?startDate, etc.)\n\nRecommended:\n  ?itemDescription, ?image`}
        />

        {/* Query requirements hint */}
        <div className="mt-3 px-3 py-2 bg-[#FFEBD6] border border-black/20 text-[10px] font-bold text-black/70 uppercase tracking-wide">
          Required: <span className="text-black font-black">?item</span>,{" "}
          <span className="text-black font-black">?itemLabel</span>,{" "}
          <span className="text-black font-black">?date</span> (or ?inception, ?startDate, ?foundingDate, ?dateOfBirth, ?pointInTime, ?time)
          &nbsp;·&nbsp; Recommended: <span className="text-black font-black">?itemDescription</span>,{" "}
          <span className="text-black font-black">?image</span>
        </div>

        {/* Timer + Preview Button Row */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Timer selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase text-black/60">Timer:</span>
            <div className="flex items-center gap-1 p-0.5 bg-white border-2 border-black">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedTimer(opt.value)}
                  className={`px-2.5 py-1 font-black text-[10px] uppercase border border-black cursor-pointer transition-all
                    ${selectedTimer === opt.value
                      ? "bg-[#7AE4FF] shadow-[1px_1px_0px_#000]"
                      : "bg-white hover:bg-slate-100 text-black/60"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Button */}
          <button
            onClick={handlePreview}
            disabled={isLoading || !query.trim()}
            className={`flex items-center gap-2 px-8 py-3 border-brutal-thick font-black text-sm uppercase btn-brutal cursor-pointer transition-all
              ${isLoading
                ? "bg-slate-300 text-black/50 cursor-wait"
                : "bg-[#7AFF9B] hover:bg-[#A0FFB8] text-black"
              }`}
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            {isLoading ? "Querying Wikidata..." : "Preview Cards"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="w-full mb-6 p-4 border-brutal-thick bg-[#FF7A9B] shadow-brutal">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 stroke-[2.5] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-sm uppercase mb-1">Query Error</h3>
              <p className="text-xs font-bold leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Results */}
      {previewCards !== null && !error && (
        <div className="w-full">
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 border-2 border-black bg-[#E6F0FF] font-black text-sm uppercase shadow-brutal-sm">
                {previewCards.length} playable cards
              </div>
              <span className="text-xs font-bold text-black/50 uppercase">
                from {rawCount} raw results
              </span>
              {previewCards.filter(c => !c.image).length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-[#FFF97A] border border-black text-[10px] font-black uppercase">
                  <ImageOff className="w-3 h-3" />
                  {previewCards.filter(c => !c.image).length} without images
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPreviewCards(null);
                  setError(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-xs uppercase btn-brutal-sm cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
                Edit Query
              </button>
              <button
                onClick={handlePlay}
                disabled={previewCards.length < 2}
                className={`flex items-center gap-2 px-8 py-2.5 border-brutal-thick font-black text-sm uppercase btn-brutal cursor-pointer
                  ${previewCards.length < 2
                    ? "bg-slate-300 text-black/50 cursor-not-allowed"
                    : "bg-[#7AFF9B] hover:bg-[#A0FFB8] text-black"
                  }`}
              >
                <Play className="w-4 h-4 stroke-[2.5]" />
                Play!
              </button>
            </div>
          </div>

          {/* Warning for low card count */}
          {previewCards.length >= 2 && previewCards.length < 10 && (
            <div className="mb-4 px-4 py-2 border-2 border-black bg-[#FFF97A] text-xs font-bold uppercase">
              ⚠️ Only {previewCards.length} cards found. The game works best with 10+ cards for a good experience.
            </div>
          )}

          {previewCards.length < 2 && (
            <div className="mb-4 px-4 py-3 border-brutal-thick bg-[#FF7A9B] shadow-brutal text-xs font-black uppercase">
              ❌ Need at least 2 playable cards to start a game. Try adjusting your query to return more items with dates.
            </div>
          )}

          {/* Card Preview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto p-1">
            {previewCards.map((card, i) => (
              <PreviewCard key={card.id || i} card={card} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Preview Card Component ───────────────────────────────────────────────────

function PreviewCard({ card, index }: { card: TriviaCard; index: number }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = card.image && !imgError;

  return (
    <div
      className={`border-2 border-black bg-white shadow-[2px_2px_0px_#000] flex flex-col overflow-hidden
        ${!card.image ? "border-dashed" : ""}`}
    >
      {/* Image or Fallback */}
      <div className="w-full h-20 bg-[#E6F0FF] border-b border-black overflow-hidden flex items-center justify-center">
        {hasImage ? (
          <img
            src={card.image}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-black/30">
            <ImageOff className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase">No Image</span>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-2 flex-1 flex flex-col">
        <p className="text-[9px] font-black uppercase text-black leading-tight line-clamp-2 mb-1">
          {card.title}
        </p>
        {card.description && card.description !== card.title && (
          <p className="text-[7px] font-medium text-black/60 leading-tight line-clamp-2 mb-auto">
            {card.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="bg-[#FFF97A] border border-black text-[8px] font-black text-black px-1.5 py-0.5">
            {formatYear(card.year)}
          </span>
          <span className="text-[7px] font-bold text-black/30">#{index + 1}</span>
        </div>
      </div>
    </div>
  );
}
