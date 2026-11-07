/**
 * What if we never check the answer against the sources? Three retrieved sentences, a drafted answer, and a TOY
 * support checker: for each answer sentence it finds the best-matching source sentence and asks (1) what share of the
 * sentence's content words appear there, and (2) do its numbers match. A real checker is a model (an entailment model
 * or a language model used as a judge) that understands paraphrase and negation; this toy does neither, and the page
 * says so. Every figure on the page comes from these functions.
 */

export const SOURCES: string[] = [
  'Employees get 25 days of paid holiday per year.',
  'Unused days can be carried over until 31 March.',
  'Holiday requests must be sent to your manager at least two weeks ahead.',
];

export const QUESTION = 'How does holiday work here?';

export type Draft = { id: string; label: string; note: string; text: string };

export const DRAFTS: Draft[] = [
  {
    id: 'invented',
    label: 'One invented claim',
    note: 'The third sentence is not in the sources.',
    text: 'You get 25 days of paid holiday a year. Unused days carry over until 31 March. You also get a bonus day on your birthday. Requests go to your manager, two weeks ahead.',
  },
  {
    id: 'number',
    label: 'A wrong number',
    note: 'Almost every word matches, but the number is not 25.',
    text: 'You get 30 days of paid holiday a year. Unused days can be carried over until 31 March.',
  },
  {
    id: 'clean',
    label: 'All backed up',
    note: 'Every sentence follows the sources.',
    text: 'You get 25 days of paid holiday a year. Unused days carry over until 31 March. Requests go to your manager, two weeks ahead.',
  },
  {
    id: 'paraphrase',
    label: 'Toy false alarm',
    note: 'True, but reworded, so the word-counting toy cannot see it.',
    text: 'Days you do not use can roll over until the end of March.',
  },
  {
    id: 'unpaid',
    label: 'Toy blind spot',
    note: 'One word flips the meaning, but the toy only counts shared words.',
    text: 'Employees get 25 days of unpaid holiday per year.',
  },
];

const STOP = new Set(
  'a an the is are was were of to in on at by or and you your we our it its for with as be this that there per can must will not do does did also over until'.split(' '),
);
const NUMBER_WORDS = new Set('one two three four five six seven eight nine ten'.split(' '));

export function stem(w: string): string {
  if (w.endsWith('ied')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/** Content words of a sentence: lower-case, no filler words, crude stemming. */
export function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => !STOP.has(w)).map(stem);
}

export const isNumber = (w: string) => /\d/.test(w) || NUMBER_WORDS.has(w);

/** Split a draft into sentences. */
export function sentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+/g) ?? [text]).map((s) => s.trim());
}

/** Share of the claim's content words that the source sentence also has (0 to 1). */
export function overlap(claim: string, source: string): number {
  const c = words(claim);
  if (c.length === 0) return 0;
  const s = new Set(words(source));
  return c.filter((w) => s.has(w)).length / c.length;
}

export type Check = {
  sentence: string;
  /** Index of the best-matching source sentence. */
  source: number;
  overlap: number;
  /** Numbers in the sentence that the best source does not contain. */
  badNumbers: string[];
  supported: boolean;
  reason: string;
};

/** Check one answer sentence. It is supported when enough of its words are in the best source and its numbers match. */
export function checkSentence(sentence: string, threshold: number): Check {
  let best = 0;
  let bestOverlap = -1;
  SOURCES.forEach((src, i) => {
    const o = overlap(sentence, src);
    if (o > bestOverlap) {
      bestOverlap = o;
      best = i;
    }
  });
  const srcWords = new Set(words(SOURCES[best]));
  const badNumbers = words(sentence).filter((w) => isNumber(w) && !srcWords.has(w));
  const enough = bestOverlap >= threshold;
  const supported = enough && badNumbers.length === 0;
  const reason = badNumbers.length
    ? `the number ${badNumbers.join(', ')} is not in the source`
    : enough
      ? `${pct(bestOverlap)} of its words appear in source ${best + 1}`
      : `only ${pct(bestOverlap)} of its words appear in any source`;
  return { sentence, source: best, overlap: bestOverlap, badNumbers, supported, reason };
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function checkDraft(draft: Draft, threshold: number): Check[] {
  return sentences(draft.text).map((s) => checkSentence(s, threshold));
}

export const DEFAULT_THRESHOLD = 0.6;

export function supportedCount(checks: Check[]): number {
  return checks.filter((c) => c.supported).length;
}

/** Sentences the checker flags as not backed by the sources. */
export function flaggedCount(checks: Check[]): number {
  return checks.length - supportedCount(checks);
}

/** Ground truth for the toy drafts, written by hand: which sentences really follow from the sources. */
export const TRUTH: Record<string, boolean[]> = {
  invented: [true, true, false, true],
  number: [false, true],
  clean: [true, true, true],
  paraphrase: [true],
  unpaid: [false],
};

/** How many sentences the checker got right at this threshold (flagged the false ones, passed the true ones). */
export function checkerCorrect(draft: Draft, threshold: number): number {
  const checks = checkDraft(draft, threshold);
  return checks.filter((c, i) => c.supported === TRUTH[draft.id][i]).length;
}
