/**
 * Simple keyword extraction utility.
 * Uses a lightweight tokenization + stopword filtering + frequency count
 * to produce an ordered list of top keywords for a given text.
 */
// no external deps required here; keep implementation lightweight

const DEFAULT_STOPWORDS = new Set([
  'the','and','for','with','that','this','from','have','has','are','was','were','but','not','you','your','our','we','a','an','of','in','on','to','is','it','as','be','by','or','at','I','me','my',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function extractKeywords(input: string, topN = 15): string[] {
  if (!input) return [];
  const tokens = tokenize(input);
  const freq: Record<string, number> = {};
  for (const t of tokens) {
    if (t.length < 3) continue; // skip short tokens
    if (DEFAULT_STOPWORDS.has(t)) continue;
    freq[t] = (freq[t] || 0) + 1;
  }

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  // Return top N unique keywords (sorted by frequency)
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const k of sorted) {
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(k);
    }
    if (unique.length >= topN) break;
  }
  return unique;
}

export function combineTexts(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
