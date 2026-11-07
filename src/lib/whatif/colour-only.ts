/**
 * What if the computer only looks at colour? A small, deterministic toy.
 * Four made-up fruit kinds, each described by three clues, all on a 0 to 1 scale:
 *   colour  (0 red to 1 yellow), shape (0 round to 1 long), size (0 small to 1 big).
 * Apples and tomatoes are both red; bananas and lemons are both yellow. The helper looks at the clues you
 * pick, finds the 5 most similar training fruits and goes with the most common kind among them.
 * Every number on screen comes from here.
 */

export type Fruit = 'apple' | 'tomato' | 'banana' | 'lemon';
export type Clue = 'colour' | 'shape' | 'size';
export type Item = { id: number; fruit: Fruit; colour: number; shape: number; size: number };

export const FRUITS: Fruit[] = ['apple', 'tomato', 'banana', 'lemon'];
export const CLUES: Clue[] = ['colour', 'shape', 'size'];
export const K = 5;
export const PER_KIND_TRAIN = 25;

/** Average value of each clue for each fruit (made up for this toy). */
export const MEANS: Record<Fruit, Record<Clue, number>> = {
  apple: { colour: 0.1, shape: 0.15, size: 0.72 },
  tomato: { colour: 0.12, shape: 0.2, size: 0.35 },
  banana: { colour: 0.88, shape: 0.9, size: 0.65 },
  lemon: { colour: 0.9, shape: 0.35, size: 0.42 },
};
const SPREAD: Record<Clue, number> = { colour: 0.05, shape: 0.07, size: 0.09 };

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number): number {
  const u = Math.max(r(), 1e-12);
  return Math.round(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()) * 1e6) / 1e6;
}
const clip = (v: number) => Math.round(Math.max(0.02, Math.min(0.98, v)) * 1000) / 1000;

export function makeFruit(fruit: Fruit, n: number, seed: number, idStart: number): Item[] {
  const r = rng(seed);
  const out: Item[] = [];
  for (let i = 0; i < n; i++) {
    const m = MEANS[fruit];
    out.push({
      id: idStart + i,
      fruit,
      colour: clip(m.colour + SPREAD.colour * gauss(r)),
      shape: clip(m.shape + SPREAD.shape * gauss(r)),
      size: clip(m.size + SPREAD.size * gauss(r)),
    });
  }
  return out;
}

export function trainSet(): Item[] {
  return FRUITS.flatMap((f, i) => makeFruit(f, PER_KIND_TRAIN, 100 + i, i * 1000));
}

/** Six of each kind, in a fixed mixed order: the fruits shown on screen. */
export function shownSet(): Item[] {
  const per = FRUITS.map((f, i) => makeFruit(f, 6, 200 + i, 5000 + i * 100));
  const out: Item[] = [];
  for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) out.push(per[(i + j) % 4][j]);
  return out;
}

/** 100 of each kind, for steadier numbers. */
export function bigSet(): Item[] {
  return FRUITS.flatMap((f, i) => makeFruit(f, 100, 300 + i, 20000 + i * 1000));
}

function dist(clues: Clue[], a: Item, b: Item): number {
  let d = 0;
  for (const c of clues) d += (a[c] - b[c]) ** 2;
  return d;
}

/** The helper's answer for one fruit using only the chosen clues (ties go to the earlier training fruit, then the earlier kind). */
export function classify(clues: Clue[], train: Item[], p: Item): Fruit {
  const order = train.map((t, i) => ({ t, i, d: dist(clues, t, p) })).sort((a, b) => a.d - b.d || a.i - b.i);
  const votes: Record<Fruit, number> = { apple: 0, tomato: 0, banana: 0, lemon: 0 };
  for (const o of order.slice(0, K)) votes[o.t.fruit]++;
  let best: Fruit = 'apple';
  for (const f of FRUITS) if (votes[f] > votes[best]) best = f;
  return best;
}

export type Scored = { item: Item; said: Fruit; right: boolean };

export function scoreAll(clues: Clue[], tests: Item[]): Scored[] {
  const train = trainSet();
  return tests.map((item) => {
    const said = classify(clues, train, item);
    return { item, said, right: said === item.fruit };
  });
}

export const accuracy = (clues: Clue[], tests: Item[]): number => {
  const s = scoreAll(clues, tests);
  return s.filter((x) => x.right).length / s.length;
};

/** Rows are the true fruit, columns what the helper said, in FRUITS order. */
export function confusion(clues: Clue[], tests: Item[]): number[][] {
  const m = FRUITS.map(() => FRUITS.map(() => 0));
  for (const s of scoreAll(clues, tests)) m[FRUITS.indexOf(s.item.fruit)][FRUITS.indexOf(s.said)]++;
  return m;
}

/** Share of the fruits in a pair that got mixed up with their partner (apple and tomato, or banana and lemon). */
export function pairMix(clues: Clue[], tests: Item[], pair: 'red' | 'yellow'): number {
  const [a, b] = pair === 'red' ? ['apple', 'tomato'] : ['banana', 'lemon'];
  const s = scoreAll(clues, tests).filter((x) => x.item.fruit === a || x.item.fruit === b);
  return s.filter((x) => x.said !== x.item.fruit && (x.said === a || x.said === b)).length / s.length;
}

/** Every non-empty combination of clues, with its accuracy, best first. */
export function allCombos(tests: Item[]): { clues: Clue[]; accuracy: number }[] {
  const out: { clues: Clue[]; accuracy: number }[] = [];
  for (let mask = 1; mask < 8; mask++) {
    const clues = CLUES.filter((_, i) => mask & (1 << i));
    out.push({ clues, accuracy: accuracy(clues, tests) });
  }
  return out.sort((a, b) => b.accuracy - a.accuracy);
}

/** Put the clues in a fixed order, so that two ways of choosing the same set give the same list. */
export const orderClues = (c: Clue[]): Clue[] => CLUES.filter((x) => c.includes(x));
