/**
 * What if the computer finds a shortcut instead of the real clue? A small, deterministic toy.
 * Photos of two animals, wolves and huskies, each with two clues:
 *   look        how wolf-like the animal itself looks (0 to 1, a real but fuzzy clue; the two kinds overlap), and
 *   background  snow or grass.
 * In the "lab" photos, wolves were mostly photographed in snow and huskies mostly on grass; the strength of that
 * link is a number you can set (50 percent means no link). The helper looks for the ONE clue that gets the most
 * training photos right, and uses only that. Then we test on photos with the same backgrounds as in the lab,
 * and on photos where every background has been swapped. Every number on screen comes from here.
 * (A toy built for teaching. It is not a model of any real system.)
 */

export type Animal = 'wolf' | 'husky';
export type Bg = 'snow' | 'grass';
export type Photo = { id: number; animal: Animal; look: number; u: number };
export type Clue = 'background' | 'look';

export const STRENGTHS = [50, 60, 70, 80, 90, 100] as const;
export const TRAIN_N = 40;
export const SHOWN_N = 12;
export const BIG_N = 400;

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
const clip = (v: number) => Math.round(Math.max(0.03, Math.min(0.97, v)) * 1000) / 1000;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** n photos, half wolves and half huskies. `u` is a fixed number per photo, spread evenly (and shuffled) within each kind, so that
 *  at a link strength of s percent exactly s percent of each kind's photos have the matching background, and the set of matching
 *  photos only grows as the link gets stronger. */
export function makePhotos(n: number, seed: number, idStart = 0): Photo[] {
  const r = rng(seed);
  const half = n / 2;
  const slots = [0, 1].map(() => {
    const a = Array.from({ length: half }, (_, i) => i);
    for (let i = half - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  });
  const out: Photo[] = [];
  for (let i = 0; i < n; i++) {
    const animal: Animal = i % 2 === 0 ? 'wolf' : 'husky';
    const look = clip((animal === 'wolf' ? 0.63 : 0.37) + 0.17 * gauss(r));
    out.push({ id: idStart + i, animal, look, u: r3((slots[i % 2][Math.floor(i / 2)] + 0.5) / half) });
  }
  return out;
}

export const trainPhotos = (): Photo[] => makePhotos(TRAIN_N, 7, 0);
/** The twelve test photos shown on screen: six of each kind, mixed order. */
export function shownPhotos(): Photo[] {
  const p = makePhotos(SHOWN_N, 8, 500);
  const order = [0, 3, 1, 2, 4, 7, 5, 6, 8, 11, 9, 10]; // mixes the two kinds
  return order.map((i) => p[i]);
}
export const bigPhotos = (): Photo[] => makePhotos(BIG_N, 9, 1000);

const matching = (a: Animal): Bg => (a === 'wolf' ? 'snow' : 'grass');
const other = (b: Bg): Bg => (b === 'snow' ? 'grass' : 'snow');

/** The background in a lab photo: the matching one for a fraction `strength/100` of the photos, the other one otherwise. */
export function labBg(p: Photo, strength: number): Bg {
  return p.u < strength / 100 ? matching(p.animal) : other(matching(p.animal));
}
/** Same photo with its background swapped. */
export const swappedBg = (p: Photo, strength: number): Bg => other(labBg(p, strength));

export type Rule = { clue: Clue; /** wolf when (value above threshold) equals `wolfIfAbove` */ threshold: number; wolfIfAbove: boolean };

const value = (clue: Clue, p: Photo, bg: Bg): number => (clue === 'background' ? (bg === 'snow' ? 1 : 0) : p.look);

/** Best single-clue rule for one clue on the training photos. */
function bestRule(clue: Clue, train: { p: Photo; bg: Bg }[]): { rule: Rule; right: number } {
  const vals = [...new Set(train.map((t) => value(clue, t.p, t.bg)))].sort((a, b) => a - b);
  const cuts = vals.length === 1 ? [vals[0] - 0.5] : vals.slice(0, -1).map((v, i) => (v + vals[i + 1]) / 2);
  let best: { rule: Rule; right: number } = { rule: { clue, threshold: cuts[0], wolfIfAbove: true }, right: -1 };
  for (const t of cuts)
    for (const above of [true, false]) {
      const right = train.filter((x) => (value(clue, x.p, x.bg) > t) === above === (x.p.animal === 'wolf')).length;
      if (right > best.right) best = { rule: { clue, threshold: Math.round(t * 10000) / 10000, wolfIfAbove: above }, right };
    }
  return best;
}

export type Learned = { picked: Clue; rule: Rule; trainRight: Record<Clue, number>; trainN: number };

/** The helper trains on the lab photos and keeps the single clue with most right answers (a tie goes to the animal's look). */
export function learn(strength: number): Learned {
  const train = trainPhotos().map((p) => ({ p, bg: labBg(p, strength) }));
  const bg = bestRule('background', train);
  const lk = bestRule('look', train);
  const picked: Clue = bg.right > lk.right ? 'background' : 'look';
  return { picked, rule: picked === 'background' ? bg.rule : lk.rule, trainRight: { background: bg.right, look: lk.right }, trainN: train.length };
}

export const says = (rule: Rule, p: Photo, bg: Bg): Animal =>
  (value(rule.clue, p, bg) > rule.threshold) === rule.wolfIfAbove ? 'wolf' : 'husky';

export type Scored = { photo: Photo; bg: Bg; said: Animal; right: boolean };

export function scoreTests(strength: number, swapped: boolean, tests: Photo[]): Scored[] {
  const { rule } = learn(strength);
  return tests.map((photo) => {
    const bg = swapped ? swappedBg(photo, strength) : labBg(photo, strength);
    const said = says(rule, photo, bg);
    return { photo, bg, said, right: said === photo.animal };
  });
}

export const accuracy = (strength: number, swapped: boolean, tests: Photo[]): number => {
  const s = scoreTests(strength, swapped, tests);
  return s.filter((x) => x.right).length / s.length;
};

/** Accuracy for each strength step, lab and swapped, on a test set. */
export const curve = (tests: Photo[]) =>
  STRENGTHS.map((s) => ({ strength: s, lab: accuracy(s, false, tests), swapped: accuracy(s, true, tests), picked: learn(s).picked }));
