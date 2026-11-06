/**
 * What if the model has no retrieval at all? A TOY illustration, not a claim about any real model.
 * The toy "model" only knows a short list of facts frozen at a training cutoff. When it has no fact for a question it
 * guesses the most common answer it saw for similar questions. With retrieval it first searches a small private store
 * by word overlap and answers from the best passage if the match is good enough. All names, numbers and dates are made up.
 */

/** The toy model's training stops at the end of this month (1 = January). Example. */
export const CUTOFF_MONTH = 3;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** What the toy model learned, with the month each fact was published. Only facts up to the cutoff are in it. */
export const TRAINING_FACTS: { key: string; value: string; month: number }[] = [
  { key: 'acme-version', value: 'version 3.8', month: 1 },
  { key: 'acme-version', value: 'version 3.9', month: 3 },
  { key: 'acme-version', value: 'version 4.0', month: 6 }, // after the cutoff: never learned
  { key: 'france-capital', value: 'Paris', month: 1 },
];

/** Answers the toy model saw for similar questions about other companies and orders. It guesses the most common one. */
export const SIMILAR_ANSWERS: Record<string, string[]> = {
  'leave-days': ['20 days', '25 days', '25 days', '28 days', '30 days', '25 days', '22 days'],
  'order-status': ['Delivered', 'Delivered', 'Shipped', 'Processing', 'Delivered'],
};

export type Passage = { id: string; text: string; value: string };

/** The private or recent documents retrieval can search. Made up. */
export const STORE: Passage[] = [
  { id: 'leave', text: 'Northwind staff get 27 days of paid leave each year.', value: '27 days' },
  { id: 'acme', text: 'Acme app release notes: the latest version is 4.2, released in October.', value: 'version 4.2' },
  { id: 'order', text: 'Order 88213 is out for delivery and arrives tomorrow.', value: 'Out for delivery' },
  { id: 'cafe', text: 'The staff cafe is open from 8 to 3 on weekdays.', value: '8 to 3' },
];

export type Question = {
  id: string;
  text: string;
  /** Plain label for why this question is hard without retrieval. */
  kind: 'private' | 'recent' | 'stable';
  /** Where the toy model looks in its memory (a key into TRAINING_FACTS), if it could know. */
  memoryKey?: string;
  /** Which pool of similar answers it guesses from when memory has nothing. */
  guessPool?: string;
  /** The true answer. */
  truth: string;
};

export const QUESTIONS: Question[] = [
  { id: 'leave', text: 'How many days of paid leave does Northwind give its staff?', kind: 'private', guessPool: 'leave-days', truth: '27 days' },
  { id: 'acme', text: 'What is the latest version of the Acme app?', kind: 'recent', memoryKey: 'acme-version', truth: 'version 4.2' },
  { id: 'order', text: 'Where is order 88213?', kind: 'private', guessPool: 'order-status', truth: 'Out for delivery' },
  { id: 'capital', text: 'What is the capital of France?', kind: 'stable', memoryKey: 'france-capital', truth: 'Paris' },
];

/** A passage is only used if it matches at least this share of the question's words. Example setting. */
export const MATCH_CUTOFF = 0.5;

const STOP = new Set('a an the is are of in to and what how does do where give gets get its it'.split(' '));
function words(t: string): string[] {
  return [...new Set(t.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)))];
}

/** Share of the question's words that appear in the passage (staff and staff, days and days, ...). */
export function matchScore(question: string, passage: string): number {
  const q = words(question);
  const p = new Set(words(passage));
  return q.length ? q.filter((w) => p.has(w)).length / q.length : 0;
}

/** Best passage and its score, or null when nothing in the store matches well enough. */
export function search(question: string): { passage: Passage; score: number } | null {
  const best = STORE.map((p, i) => ({ passage: p, score: matchScore(question, p.text), i })).sort((a, b) => b.score - a.score || a.i - b.i)[0];
  return best && best.score >= MATCH_CUTOFF ? { passage: best.passage, score: best.score } : null;
}

export function mostCommon(values: string[]): string {
  const n: Record<string, number> = {};
  for (const v of values) n[v] = (n[v] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0];
}

export type Answer = {
  text: string;
  source: 'memory' | 'guess' | 'passage';
  correct: boolean;
  passage: Passage | null;
  score: number;
};

/** The toy model on its own: the newest fact it learned before the cutoff, otherwise a guess. */
export function fromMemory(q: Question): { text: string; source: 'memory' | 'guess' } {
  const known = TRAINING_FACTS.filter((f) => f.key === q.memoryKey && f.month <= CUTOFF_MONTH).sort((a, b) => b.month - a.month)[0];
  if (known) return { text: known.value, source: 'memory' };
  return { text: mostCommon(SIMILAR_ANSWERS[q.guessPool ?? ''] ?? ['unknown']), source: 'guess' };
}

/** Answer one question with or without retrieval. */
export function answer(q: Question, retrieval: boolean): Answer {
  if (retrieval) {
    const hit = search(q.text);
    if (hit) return { text: hit.passage.value, source: 'passage', correct: hit.passage.value === q.truth, passage: hit.passage, score: hit.score };
  }
  const m = fromMemory(q);
  return { text: m.text, source: m.source, correct: m.text === q.truth, passage: null, score: 0 };
}

/** How many of the questions are answered correctly. */
export function tally(retrieval: boolean): number {
  return QUESTIONS.filter((q) => answer(q, retrieval).correct).length;
}
