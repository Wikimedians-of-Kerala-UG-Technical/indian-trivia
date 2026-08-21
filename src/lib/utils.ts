/** Fisher–Yates shuffle; returns a new array, input untouched. */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/** Blank out years/centuries in card text so the player can't cheat by reading
 *  the clue face ("First train in India, 1853" gives the answer away). */
export function maskSpoilers(text: string): string {
  if (!text) return text;
  
  const suffixPattern = /\b\d{1,4}\s*(?:BCE|CE|BC|AD|B\.C\.|A\.D\.)\b/gi;
  const decadePattern = /\b\d{4}s\b/g;
  const yearPattern = /\b\d{4}\b/g;
  const centuryPattern = /\b\d{1,2}(?:st|nd|rd|th)?[- ]century\b/gi;

  return text
    .replace(suffixPattern, "____")
    .replace(decadePattern, "____")
    .replace(yearPattern, "____")
    .replace(centuryPattern, "____");
}
