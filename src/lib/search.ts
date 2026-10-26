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

const KIND_BOOST: Record<string, number> = { Lesson: 0.6, Game: 0.5, Tool: 0.4, Term: 0.3, Page: 0.2, Pulse: 0.1 };

/**
 * Tiny, dependency-free ranking: every word in the query must appear
 * somewhere in the title or description. Title starts and whole-word title
 * matches count most.
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
    let ok = true;
    for (const w of words) {
      let s = 0;
      if (title === w) s += 10;
      else if (title.startsWith(w)) s += 6;
      else if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(title)) s += 4;
      else if (title.includes(w)) s += 2.5;
      if (desc.includes(w)) s += 1.2;
      if (s === 0) {
        ok = false;
        break;
      }
      score += s;
    }
    if (!ok) continue;
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
