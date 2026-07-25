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
