import { normaliseWords, scoreTokens, type NormOptions, type Score } from './wer';

/*
 * Data and scoring for the captions lab in "AI for accessibility". Everything here is invented for
 * teaching: one spoken sentence, five made-up caption outputs, and a short list of facts a listener
 * needs from the sentence. Word error rate comes from wer.ts. "Facts kept" is a deliberately simple
 * stand-in for "could a reader still act on this caption": a fact survives when the words that carry
 * it are still present. It is not a validated usability measure (see Kafle and Huenerfauth, 2017, for
 * one that was tested with deaf and hard-of-hearing readers).
 */

export const CLIP_REFERENCE = 'Please bring your coats. The trip is not cancelled if it rains, and the bus leaves at half past nine from gate four.';

/** Case and punctuation are ignored when scoring, as most caption evaluations do. */
export const CAPTION_NORM: NormOptions = { lowercase: true, punctuation: true, numerals: false, contractions: false, fillers: false };

export type Fact = {
  id: string;
  /** What the listener needs to know. */
  question: string;
  /** What the sentence says. */
  answer: string;
  /** Every inner list must contribute at least one word that appears in the caption. */
  needs: string[][];
};

export const FACTS: Fact[] = [
  { id: 'bring', question: 'What to bring', answer: 'coats', needs: [['coat', 'coats']] },
  { id: 'rain', question: 'Rain rule', answer: 'the trip is not cancelled', needs: [['not'], ['cancel', 'cancelled']] },
  { id: 'time', question: 'Bus time', answer: 'half past nine', needs: [['half'], ['past', 'pass'], ['nine']] },
  { id: 'gate', question: 'Gate', answer: 'gate four', needs: [['gate'], ['four']] },
];

export type CaptionSystem = { id: string; name: string; blurb: string; text: string };

export const SYSTEMS: CaptionSystem[] = [
  {
    id: 'a',
    name: 'Caption A',
    blurb: 'Two small slips that do not change the message.',
    text: 'Please bring your coat. The trip is not cancelled if it rains, and a bus leaves at half past nine from gate four.',
  },
  {
    id: 'b',
    name: 'Caption B',
    blurb: 'The same number of slips, but they land on the words that matter.',
    text: 'Please bring your coats. The trip is cancelled if it rains, and the bus leaves at half past five from gate four.',
  },
  {
    id: 'c',
    name: 'Caption C',
    blurb: 'Drops little words, like a note-taker would. Reads like telegraph style.',
    text: 'Please bring coats. The trip is not cancelled if it rains, bus leaves half past nine gate four.',
  },
  {
    id: 'd',
    name: 'Caption D',
    blurb: 'Mishears several sounds, as can happen with an accent the system rarely saw.',
    text: 'Please ring your goats. The trip is not cancel if it rains, and the bus leaves at half pass nine from great four.',
  },
  {
    id: 'e',
    name: 'Caption E',
    blurb: 'Nearly perfect, but the live caption cuts off at the end.',
    text: 'Please bring your coats. The trip is not cancelled if it rains, and the bus leaves at half past nine from gate',
  },
];

export type FactResult = { fact: Fact; kept: boolean };

export type CaptionAnalysis = {
  score: Score;
  facts: FactResult[];
  keptCount: number;
};

/** Which facts can still be read from a caption: every group of needed words must have a match. */
export function factsKept(caption: string): FactResult[] {
  const have = new Set(normaliseWords(caption, CAPTION_NORM));
  return FACTS.map((fact) => ({ fact, kept: fact.needs.every((group) => group.some((w) => have.has(w))) }));
}

export function analyse(caption: string, reference: string = CLIP_REFERENCE): CaptionAnalysis {
  const score = scoreTokens(normaliseWords(reference, CAPTION_NORM), normaliseWords(caption, CAPTION_NORM));
  const facts = factsKept(caption);
  return { score, facts, keptCount: facts.filter((f) => f.kept).length };
}

export type SystemRow = { system: CaptionSystem; wer: number; keptCount: number; errors: number };

/** One row per invented system, for the comparison table. */
export function systemRows(): SystemRow[] {
  return SYSTEMS.map((system) => {
    const a = analyse(system.text);
    return { system, wer: a.score.wer, keptCount: a.keptCount, errors: a.score.edits };
  });
}

/** Zero errors out of N words is fine; a ratio like 0.087 reads better as 8.7%. */
export const pct = (x: number): string => (Number.isFinite(x) ? `${(Math.round(x * 1000) / 10).toFixed(1)}%` : 'undefined');
