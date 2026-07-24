import { serve } from "bun";
import index from "./index.html";
import { TRIVIA_DATA, TriviaCard } from "./data/trivia";
import { maskSpoilers } from "./lib/utils";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseWikidataYear(dateStr: string): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^([+-]?\d+)/);
  if (match) {
    const year = parseInt(match[1], 10);
    if (isNaN(year) || year < -3000 || year > 2026) return null;
    return year;
  }
  return null;
}

function getWikimediaImageUrl(imagePropValue?: string): string | null {
  if (!imagePropValue) return null;
  let filename = imagePropValue;
  if (filename.includes("Special:FilePath/")) {
    filename = filename.split("Special:FilePath/").pop() || filename;
  } else if (filename.includes("http")) {
    filename = decodeURIComponent(filename.split("/").pop() || filename);
  }
  filename = decodeURIComponent(filename).replace(/ /g, "_");
  if (!filename) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=400`;
}

const CATEGORY_SPARQL: Record<string, string> = {
  history: `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
      ?item wdt:P17 wd:Q668 ;
            wdt:P18 ?image .
      { ?item wdt:P31 wd:Q178561 ; wdt:P585 ?date . }
      UNION
      { ?item wdt:P31 wd:Q1190554 ; wdt:P585 ?date . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 30
  `,
  cinema: `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
      ?item wdt:P31 wd:Q11424 ;
            wdt:P495 wd:Q668 ;
            wdt:P18 ?image ;
            wdt:P577 ?date .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 30
  `,
  science: `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
      ?item wdt:P17 wd:Q668 ;
            wdt:P18 ?image .
      { ?item wdt:P31 wd:Q26540 ; wdt:P619 ?date . }
      UNION
      { ?item wdt:P31 wd:Q223799 ; wdt:P619 ?date . }
      UNION
      { ?item wdt:P31 wd:Q3918 ; wdt:P571 ?date . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 30
  `,
  culture: `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?date ?image ?sitelinks WHERE {
      ?item wdt:P17 wd:Q668 ;
            wdt:P18 ?image ;
            wikibase:sitelinks ?sitelinks .
      { ?item wdt:P31 wd:Q23413 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q16560 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q839954 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q180968 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q193290 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q44539 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q32815 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P31 wd:Q44613 ; wdt:P571 ?date . }
      UNION
      { ?item wdt:P1435 wd:Q9259 ; wdt:P571 ?date . }
      FILTER(?sitelinks > 15)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?sitelinks)
    LIMIT 40
  `
};


function filterHighQualityWikidataCards(bindings: any[], category: string): TriviaCard[] {
  const cards: TriviaCard[] = [];
  const EXCLUDE_PATTERNS = [
    /wikimedia/i, /wikipedia/i, /subdivision/i, /administrative unit/i,
    /item/i, /category/i, /disambiguation/i, /human settlement in India/i,
    /inscription/i, /hero stone/i, /hospital/i, /school/i, /demolished/i,
    /zamindar/i, /residence/i, /undefined/i, /building in/i, /office/i, /bank/i,
    /village/i, /district/i, /constituency/i, /railway station/i, /bus station/i
  ];

  for (const b of bindings) {
    const qid = (b.item?.value || "").split("/").pop() || "";
    const title = (b.itemLabel?.value || "").trim();
    const description = (b.itemDescription?.value || "").trim();
    const year = parseWikidataYear(b.date?.value || "");
    const image = getWikimediaImageUrl(b.image?.value);


    if (!title || title.length < 3 || /^Q\d+$/i.test(title)) continue;


    if (!image) continue;


    if (year === null) continue;


    if (!description || description.length < 10) continue;
    if (EXCLUDE_PATTERNS.some(p => p.test(title) || p.test(description))) continue;

    cards.push({
      id: `wikidata_${category}_${qid}`,
      title: maskSpoilers(title),
      description: maskSpoilers(description),
      year,
      category: category as any,
      image
    });
  }

  return cards;
}

async function fetchDynamicWikidataCards(category: string): Promise<TriviaCard[]> {
  const sparqlQuery = CATEGORY_SPARQL[category] || CATEGORY_SPARQL["history"];
  if (!sparqlQuery) return [];

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "IndianTriviaGame/2.0 (contact@indiantrivia.app)",
        "Accept": "application/sparql-results+json"
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data = await res.json();
    const bindings = data.results?.bindings || [];
    return filterHighQualityWikidataCards(bindings, category);
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[Wikidata SPARQL Fetch Fallback] Category ${category}:`, (err as any).message);
    return [];
  }
}

const server = serve({
  routes: {
    "/*": index,

    "/api/wikidata": async req => {
      const url = new URL(req.url);
      const category = url.searchParams.get("category") || "general";

      try {
        let curatedCards = TRIVIA_DATA.filter(card => card.category === category);
        
        if (category === "general" || curatedCards.length < 2) {
          curatedCards = [...TRIVIA_DATA];
        }

        const sanitizedCurated = curatedCards.map(card => ({
          ...card,
          title: maskSpoilers(card.title || ""),
          description: maskSpoilers(card.description || "")
        }));

        const shuffledCurated = shuffle(sanitizedCurated);
        const seenTitles = new Set(shuffledCurated.map(c => c.title.toLowerCase()));


        const dynamicCards = await fetchDynamicWikidataCards(category);
        const filteredDynamic: TriviaCard[] = [];

        for (const card of dynamicCards) {
          const normTitle = card.title.toLowerCase();
          if (!seenTitles.has(normTitle)) {
            seenTitles.add(normTitle);
            filteredDynamic.push(card);
          }
        }

        const shuffledDynamic = shuffle(filteredDynamic);
        const finalDeck = [...shuffledCurated, ...shuffledDynamic];

        return new Response(JSON.stringify(finalDeck), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
          }
        });
      } catch (err: any) {
        console.error(`[API Error]`, err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
