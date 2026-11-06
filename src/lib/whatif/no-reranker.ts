/**
 * What if there is no reranker? Ten passages come back from a fast first search; the model only gets the top few.
 * The first pass here is a plain word-overlap score (cosine on word counts). The "reranker" is a TOY rule that reads
 * the question and each passage together: a real one is a neural network (a cross-encoder) that does this much better.
 * Every figure on the page comes from these functions.
 */

export const QUESTION = 'How long do I have to return an item I bought online?';

export type Passage = { id: string; title: string; text: string };

export const PASSAGES: Passage[] = [
  { id: 'label', title: 'Return label steps', text: 'Return an item: print a return label and drop the parcel at any post office.' },
  { id: 'late', title: 'Late returns and costs', text: 'Items returned late may not be refunded, and return costs are paid by the buyer, not by us or the courier.' },
  { id: 'pack', title: 'How to pack a return', text: 'How to return an item bought online: pack the item in its original box.' },
  { id: 'track', title: 'Tracking an online order', text: 'Online orders: track an item from the moment it is bought until delivery.' },
  { id: 'desk', title: 'The returns desk', text: 'Our returns desk is open every day and every item is logged when it arrives.' },
  { id: 'swap', title: 'Swapping for a size', text: 'Exchanges: swap an item bought online for another size at no extra cost.' },
  { id: 'window', title: 'The 30-day window', text: 'Items bought online can go back within 30 days of delivery for a full refund.' },
  { id: 'delivery', title: 'Delivery times', text: 'Delivery of an item bought online usually takes 3 to 5 days.' },
  { id: 'gift', title: 'Gift returns', text: 'Gift items bought online can be returned for store credit.' },
  { id: 'queue', title: 'Queues at the desk', text: 'Long queues at the returns desk are common on Mondays, so return online instead.' },
];

const STOP = new Set(
  'a an the is are my your you we of in to if and can i me for with our it how do does what when on at by or that this be has have so from until its as not may no'.split(' '),
);

/** Crude stemming so "returned" and "returns" both count as "return". */
export function stem(w: string): string {
  w = w.replace(/ed$/, '');
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

function counts(text: string): Record<string, number> {
  const m: Record<string, number> = {};
  for (const w of tokens(text)) m[w] = (m[w] || 0) + 1;
  return m;
}

/** First pass: cosine similarity between the word counts of the question and the passage. */
export function firstPassScore(query: string, passage: string): number {
  const a = counts(query);
  const b = counts(passage);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k in a) {
    na += a[k] ** 2;
    if (b[k]) dot += a[k] * b[k];
  }
  for (const k in b) nb += b[k] ** 2;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** The toy reranker reads for the topic of the question: does the passage talk about returning something? */
export function onTopic(passage: string): boolean {
  return tokens(passage).some((w) => ['return', 'back', 'refund'].includes(w));
}

/** ... and for the shape of the answer: the question asks "how long", so a number of days or weeks is needed. */
export function hasDuration(passage: string): boolean {
  return /\d+\s*(day|days|week|weeks)\b/i.test(passage);
}

/** True when the passage is about returns AND gives a length of time: it can answer the question. */
export function answersQuestion(passage: string): boolean {
  return onTopic(passage) && hasDuration(passage);
}

/** Second pass (toy): 40% of the first-pass score, 0.2 for being on topic, 0.4 more for also giving the time. */
export function rerankScore(query: string, passage: string): number {
  return 0.4 * firstPassScore(query, passage) + (onTopic(passage) ? 0.2 : 0) + (answersQuestion(passage) ? 0.4 : 0);
}

export type Row = { id: string; title: string; text: string; score: number; rank: number; answers: boolean };

/** All ten passages, best first (ties keep the original order), by the first pass or by the reranker. */
export function ranked(reranked: boolean, query = QUESTION): Row[] {
  return PASSAGES.map((p, i) => ({ p, i, score: reranked ? rerankScore(query, p.text) : firstPassScore(query, p.text) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ p, score }, r) => ({ id: p.id, title: p.title, text: p.text, score, rank: r + 1, answers: answersQuestion(p.text) }));
}

/** Rank (1 is best) of the passage that really answers the question. */
export function answerRank(reranked: boolean): number {
  return ranked(reranked).find((r) => r.answers)!.rank;
}

/** The passages the model gets to read: the top k. */
export function visible(reranked: boolean, k: number): Row[] {
  return ranked(reranked).slice(0, k);
}

/** What a toy model can say from the passages it was given. */
export function toyReply(rows: Row[]): { answered: boolean; text: string } {
  const hit = rows.find((r) => r.answers);
  if (!hit) return { answered: false, text: 'The passages do not say how long you have, so I cannot tell you.' };
  const days = /(\d+)\s*days/i.exec(hit.text)![1];
  return { answered: true, text: `You have ${days} days from delivery.` };
}
