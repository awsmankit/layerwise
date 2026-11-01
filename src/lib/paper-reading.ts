/*
 * Data and logic for the two exercises in skills/reading-an-ai-paper.
 *
 * 1. Annotate the abstract: short fragments quoted from the abstract of Vaswani et al. (2017), "Attention Is All
 *    You Need" (arXiv:1706.03762v7), tagged by the learner as claim, method, data, result or caveat.
 * 2. A results-table drill on a MADE-UP table. The numbers are invented for teaching.
 */

export type Tag = 'claim' | 'method' | 'data' | 'result' | 'caveat';
export const TAGS: Tag[] = ['claim', 'method', 'data', 'result', 'caveat'];
export const TAG_HELP: Record<Tag, string> = {
  claim: 'What the authors say is true or better',
  method: 'What they built or did',
  data: 'What they tested it on',
  result: 'A number they measured',
  caveat: 'A limit, a doubt, or where it fails',
};

export interface Fragment {
  id: string;
  /** Quoted verbatim from the abstract (PDF version, v7). */
  text: string;
  /** The tags we accept. The first is the main one. */
  accept: Tag[];
  /** Shown after the learner answers. */
  feedback: string;
}

export const FRAGMENTS: Fragment[] = [
  {
    id: 'propose',
    text: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms',
    accept: ['method'],
    feedback: 'This is what they built: the Transformer. "We propose" is the usual signal for a method.',
  },
  {
    id: 'tasks',
    text: 'Experiments on two machine translation tasks',
    accept: ['data'],
    feedback: 'This says what they tested on: two translation tasks. Always ask whether that is enough to support the claim.',
  },
  {
    id: 'superior',
    text: 'show these models to be superior in quality while being more parallelizable and requiring significantly less time to train',
    accept: ['claim'],
    feedback: 'A claim: "superior", "more parallelizable", "less time". Each needs evidence further down. Look for it in the tables.',
  },
  {
    id: 'bleu',
    text: 'Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task',
    accept: ['result', 'data'],
    feedback: 'A result (28.4 BLEU, a translation-quality score), and it also names the test: WMT 2014 English-to-German. Real sentences often do two jobs.',
  },
  {
    id: 'ensembles',
    text: 'improving over the existing best results, including ensembles, by over 2 BLEU',
    accept: ['result'],
    feedback: 'A result stated as a comparison with earlier work. Check the table to see which earlier models were compared and how fairly.',
  },
  {
    id: 'cost',
    text: 'a small fraction of the training costs of the best models from the literature',
    accept: ['claim', 'result'],
    feedback: 'A claim about cost. No number is given here, so look for the real figures in the results table, and for how they were estimated.',
  },
  {
    id: 'generalizes',
    text: 'We show that the Transformer generalizes well to other tasks',
    accept: ['claim'],
    feedback: 'A claim, and a wide one: "generalizes well to other tasks". The evidence is one extra task, English constituency parsing. Is that enough?',
  },
];

export type Answers = Record<string, Tag | undefined>;

export function isAccepted(f: Fragment, tag: Tag): boolean {
  return f.accept.includes(tag);
}

export function scoreAnswers(answers: Answers): { answered: number; correct: number; total: number } {
  let answered = 0;
  let correct = 0;
  for (const f of FRAGMENTS) {
    const t = answers[f.id];
    if (!t) continue;
    answered += 1;
    if (isAccepted(f, t)) correct += 1;
  }
  return { answered, correct, total: FRAGMENTS.length };
}

/** Reply when the learner picks "caveat": no fragment in this abstract is one. */
export const CAVEAT_REPLY =
  'Good instinct to look for limits, but this fragment is not one. In fact none of the fragments is a caveat. Abstracts rarely state limits, so you have to hunt for them in the results, the ablations and the conclusion.';

/** What the abstract leaves out, found by reading the whole paper (v7). Each line was checked against the paper's text. */
export const MISSING_FROM_ABSTRACT: string[] = [
  'The abstract says 41.8 BLEU on English-to-French. Section 6.1 of the same paper says 41.0, and Table 2 says 41.8. When numbers disagree, trust the table and note the mismatch.',
  'Table 2 gives one score per model. It shows no error bars and no repeat runs, so you cannot tell how much of a 0.4 BLEU gap is luck.',
  'The training costs in Table 2 are estimates: the authors multiplied training time, number of GPUs and an assumed speed per GPU (their footnote 5).',
  'Table 3 (the ablations) shows what hurts: single-head attention scored 24.9 BLEU against 25.8 for the base model on the development set.',
  'There is no limitations section. The conclusion lists plans for future work instead.',
];

/* ---------- results-table drill (made-up numbers) ---------- */

export interface Row {
  id: string;
  name: string;
  /** Accuracy in percent, mean over runs. */
  mean: number;
  /** Standard deviation over runs, or undefined when only one run was reported. */
  std?: number;
  runs: number;
  paramsM: number;
  tuned: boolean;
}

export const TABLE_CAPTION = 'Spam filter accuracy on "Toy-Mail" (a made-up data set). Mean ± standard deviation over 5 runs unless stated.';
export const TABLE_FOOTNOTE = 'Settings for the NewNet models were chosen by accuracy on the test set.';

export const TABLE: Row[] = [
  { id: 'base', name: 'Linear baseline (default settings)', mean: 91.2, std: 0.3, runs: 5, paramsM: 0.1, tuned: false },
  { id: 's', name: 'NewNet-S', mean: 92.0, std: 0.9, runs: 5, paramsM: 12, tuned: true },
  { id: 'l', name: 'NewNet-L', mean: 93.4, std: 0.2, runs: 5, paramsM: 110, tuned: true },
  { id: 'lt', name: 'NewNet-L + trick', mean: 93.8, runs: 1, paramsM: 110, tuned: true },
];

export const rowById = (id: string): Row => TABLE.find((r) => r.id === id) ?? TABLE[0];

/**
 * A rough rule of thumb, NOT a significance test: is the gap between two means bigger than the two standard
 * deviations added together? Returns false when either row has no standard deviation.
 */
export function clearlyAhead(a: Row, b: Row): boolean {
  if (a.std === undefined || b.std === undefined) return false;
  return a.mean - b.mean > a.std + b.std;
}

export const gap = (a: Row, b: Row): number => Math.round((a.mean - b.mean) * 100) / 100;

export interface Question {
  id: string;
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export const QUESTIONS: Question[] = [
  {
    id: 'clear',
    q: 'Look at the ± numbers. Which NewNet model clearly beats the linear baseline?',
    options: ['NewNet-S only', 'NewNet-L only', 'Both of them', 'Neither of them'],
    answer: 1,
    why: 'NewNet-L is 2.2 points ahead and the two spreads add up to only 0.5, so the gap is much bigger than the wobble. NewNet-S is 0.8 points ahead, but its spread (0.9) plus the baseline\'s (0.3) is 1.2, so a gap of 0.8 could easily be luck.',
  },
  {
    id: 'single',
    q: 'The last row, NewNet-L + trick, scores 93.8 against 93.4 for NewNet-L. Is the trick proven to help?',
    options: ['Yes, 93.8 is higher than 93.4', 'Yes, because it has more parameters', 'Not yet: it is a single run with no ± to compare', 'No, because 93.8 is too high to be true'],
    answer: 2,
    why: 'One run shows no spread. NewNet-L alone moves by about 0.2 between runs, so a 0.4 gap from a single run is suggestive but not settled. Ask for several runs.',
  },
  {
    id: 'baseline',
    q: 'The baseline used default settings, and the NewNet models were tuned. What is the sensible question to ask?',
    options: ['Nothing, the table is fair', 'Why is the baseline so small?', 'Which model was trained last?', 'Would the baseline close the gap if it were tuned as hard?'],
    answer: 3,
    why: 'Part of the gain may come from the tuning effort, not from the new idea. A fair comparison gives the baseline the same tuning budget. Researchers who re-ran published recommender-system methods found that many were beaten by simple, well-chosen baselines (Dacrema and others, 2019), so this is worth asking every time.',
  },
  {
    id: 'footnote',
    q: 'The footnote says the NewNet settings were chosen by accuracy on the test set. Why does that matter?',
    options: [
      'The test set was used to pick the winner, so the scores are probably a little too good for new data',
      'It does not matter, because test sets are always reliable',
      'It means the models were trained on less data',
      'It only matters for small models',
    ],
    answer: 0,
    why: 'A test set is meant to be touched once, at the end. If you tune on it, you partly fit it, and the reported accuracy overstates what you will see on genuinely new data. The settings should have been chosen on a separate validation set.',
  },
];
