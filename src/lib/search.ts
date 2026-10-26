export type SearchItem = {
  /** Title */
  t: string;
  /** URL, already including the site's base path */
  u: string;
  /** Kind shown as a badge: Lesson, Game, Tool, Term, Pulse, Page */
  k: string;
  /** Short description or definition */
  s: string;
};

const KIND_BOOST: Record<string, number> = { Lesson: 0.6, Game: 0.5, Tool: 0.4, Term: 0.3, Page: 0.2, Interview: 0.15, News: 0.1 };

/**
 * Tiny, dependency-free ranking. Title starts and whole-word title matches
 * count most. Results that match every word come first; with more than one
 * word, results matching at least half of them are kept further down, so one
 * unknown word does not hide everything.
 */
export function search(items: SearchItem[], query: string, limit = 8): SearchItem[] {
  const phrase = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const words = phrase.split(' ').filter(Boolean);
  if (words.length === 0) return [];

  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of items) {
    const title = item.t.toLowerCase();
    const desc = item.s.toLowerCase();
    let score = 0;
    let matched = 0;
    for (const w of words) {
      let s = 0;
      if (title === w) s += 10;
      else if (title.startsWith(w)) s += 6;
      else if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(title)) s += 4;
      else if (title.includes(w)) s += 2.5;
      if (desc.includes(w)) s += 1.2;
      if (s > 0) matched++;
      score += s;
    }
    const needed = words.length === 1 ? 1 : Math.ceil(words.length / 2);
    if (matched < needed) continue;
    if (matched === words.length) score += 100; // full matches always rank above partial ones
    // whole-phrase bonuses: an exact title should always beat a partial one
    if (words.length > 1) {
      if (title === phrase) score += 20;
      else if (title.startsWith(phrase)) score += 8;
      else if (title.includes(phrase)) score += 3;
    }
    scored.push({ item, score: score + (KIND_BOOST[item.k] ?? 0) });
  }
  return scored.sort((a, b) => b.score - a.score || a.item.t.localeCompare(b.item.t)).slice(0, limit).map((x) => x.item);
}
