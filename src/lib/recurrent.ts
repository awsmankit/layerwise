/**
 * A one-number RNN and a one-cell LSTM, run on a scripted sentence, for the lesson "RNNs and LSTMs".
 * Every weight is set by hand so each number can be checked with a calculator: nothing here is trained.
 * The task is to remember one fact (a subject that is plural or singular) across a gap of other words
 * until the verb arrives. Everything is deterministic.
 */

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** The RNN reads the word's value with this fixed weight. */
export const RNN_INPUT_WEIGHT = 1.5;
/** The LSTM's output gate is fixed at sigmoid(4), about 0.98: it lets nearly everything through. */
export const OUTPUT_BIAS = 4;
/** Longest gap offered, and the length of the gradient strip. */
export const MAX_GAP = 48;
export const STRIP_LEN = 50;

export type Kind = 'plural' | 'singular';

/** `value` is the fact the word carries (+1 plural, -1 singular, 0 nothing); `write` is 1 on the one word worth storing. */
export type Word = { text: string; value: number; write: number };

const FILLER = ['to', 'the', 'old', 'cabinet', 'in', 'the', 'hall', 'by', 'the', 'front', 'door', 'of', 'our', 'house'];

/**
 * "The keys <gap words> are" or "The key <gap words> is". With `distractor` on, the gap word "cabinet" (or
 * "cabinets" after "key") is a noun of the opposite number: it carries a fact that must NOT be stored.
 */
export function makeSentence(kind: Kind, gap: number, distractor = false): Word[] {
  const plural = kind === 'plural';
  const n = Math.max(0, Math.min(MAX_GAP, Math.round(gap)));
  const words: Word[] = [
    { text: 'The', value: 0, write: 0 },
    { text: plural ? 'keys' : 'key', value: plural ? 1 : -1, write: 1 },
  ];
  for (let i = 0; i < n; i++) {
    const text = FILLER[i % FILLER.length];
    const odd = distractor && text === 'cabinet';
    words.push({ text: odd && !plural ? 'cabinets' : text, value: odd ? (plural ? -1 : 1) : 0, write: 0 });
  }
  words.push({ text: plural ? 'are' : 'is', value: 0, write: 0 });
  return words;
}

/** Plain RNN: h = tanh(w * h_previous + 1.5 * value). Returns the state after every word. */
export function runRnn(words: Word[], w: number): number[] {
  const out: number[] = [];
  let h = 0;
  for (const word of words) {
    h = Math.tanh(w * h + RNN_INPUT_WEIGHT * word.value);
    out.push(h);
  }
  return out;
}

export type LstmStep = {
  /** forget gate: how much of the old cell to keep */
  f: number;
  /** input gate: how much of the new candidate to write */
  i: number;
  /** candidate: what could be written */
  g: number;
  /** output gate: how much of the cell to show */
  o: number;
  /** cell state after this word */
  c: number;
  /** hidden state (the output) after this word */
  h: number;
};

/**
 * One LSTM cell. To keep every number checkable the gates read only the current word (real LSTMs also read
 * the previous hidden state). The forget gate sits at sigmoid(forgetBias) and drops towards zero on the
 * write word; the input gate opens only on the write word.
 */
export function runLstm(words: Word[], forgetBias: number): LstmStep[] {
  const out: LstmStep[] = [];
  let c = 0;
  for (const word of words) {
    const f = sigmoid(forgetBias - 8 * word.write);
    const i = sigmoid(10 * word.write - 5);
    const g = Math.tanh(3 * word.value);
    const o = sigmoid(OUTPUT_BIAS);
    c = f * c + i * g;
    out.push({ f, i, g, o, c, h: o * Math.tanh(c) });
  }
  return out;
}

/**
 * How much a change in the state after word t reaches the state after the last word, for the RNN:
 * the product of w * (1 - h^2) over every later step. Entry t is d h_last / d h_t, and the last entry is 1.
 */
export function rnnGradient(words: Word[], w: number): number[] {
  const h = runRnn(words, w);
  const g = new Array<number>(words.length).fill(1);
  for (let t = words.length - 2; t >= 0; t--) g[t] = g[t + 1] * w * (1 - h[t + 1] * h[t + 1]);
  return g;
}

/** The same for the LSTM's cell state along its direct path: the product of the forget gates. */
export function lstmGradient(steps: LstmStep[]): number[] {
  const g = new Array<number>(steps.length).fill(1);
  for (let t = steps.length - 2; t >= 0; t--) g[t] = g[t + 1] * steps[t + 1].f;
  return g;
}

export type Verdict = 'right' | 'wrong' | 'unsure';
/** A state counts as an answer only when it is at least this far from zero (a threshold chosen for the demo). */
export const SURE = 0.1;

export type Summary = {
  words: Word[];
  rnn: number[];
  lstm: LstmStep[];
  /** +1 for a plural subject, -1 for a singular one */
  sign: number;
  /** each model's state at the verb, multiplied by `sign` so that positive means it leans the right way */
  rnnSignal: number;
  lstmSignal: number;
  rnnVerdict: Verdict;
  lstmVerdict: Verdict;
};

export const verdictOf = (signal: number): Verdict => (signal > SURE ? 'right' : signal < -SURE ? 'wrong' : 'unsure');

export function summarise(kind: Kind, gap: number, rnnW: number, forgetBias: number, distractor = false): Summary {
  const words = makeSentence(kind, gap, distractor);
  const rnn = runRnn(words, rnnW);
  const lstm = runLstm(words, forgetBias);
  const last = words.length - 1;
  const sign = kind === 'plural' ? 1 : -1;
  const rnnSignal = rnn[last] * sign;
  const lstmSignal = lstm[last].h * sign;
  return { words, rnn, lstm, sign, rnnSignal, lstmSignal, rnnVerdict: verdictOf(rnnSignal), lstmVerdict: verdictOf(lstmSignal) };
}

export type Strip = { rnn: number[]; lstm: number[]; rnnFirst: number; lstmFirst: number };

/** The 50-step gradient strip: the subject is word 2 of 50 and the verb is word 50. */
export function gradientStrip(rnnW: number, forgetBias: number): Strip {
  const words = makeSentence('plural', STRIP_LEN - 3);
  const rnn = rnnGradient(words, rnnW);
  const lstm = lstmGradient(runLstm(words, forgetBias));
  return { rnn, lstm, rnnFirst: rnn[1], lstmFirst: lstm[1] };
}
