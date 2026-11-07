/**
 * What if the computer only ever sees one kind of example? A small, deterministic toy.
 * A picture-sorting helper looks at two clues for each picture: how pointy the ears are (0 floppy to 1 pointy)
 * and how long the snout is (0 short to 1 long). To sort a new picture it finds the single most similar training
 * picture and copies its label (one nearest neighbour). If every training picture is a cat, every answer is "cat".
 * Every number on screen comes from here.
 */

export type Kind = 'cat' | 'dog';
export type Pic = { id: number; kind: Kind; ears: number; snout: number };

export const CATS = 10;
export const MAX_DOGS = 10;
export const DOG_STEPS = Array.from({ length: MAX_DOGS + 1 }, (_, i) => i);

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

const clip = (v: number) => Math.round(Math.max(0.04, Math.min(0.96, v)) * 1000) / 1000;

/** n pictures of one kind. Cats: pointy ears, shorter snout. Dogs: floppier ears, longer snout. The groups overlap a little. */
export function makePics(kind: Kind, n: number, seed: number, idStart = 0): Pic[] {
  const r = rng(seed);
  const out: Pic[] = [];
  for (let i = 0; i < n; i++) {
    const e = kind === 'cat' ? 0.76 + 0.14 * gauss(r) : 0.38 + 0.17 * gauss(r);
    const s = kind === 'cat' ? 0.3 + 0.14 * gauss(r) : 0.68 + 0.14 * gauss(r);
    out.push({ id: idStart + i, kind, ears: clip(e), snout: clip(s) });
  }
  return out;
}

export const trainCats = (): Pic[] => makePics('cat', CATS, 11, 0);
export const trainDogs = (): Pic[] => makePics('dog', MAX_DOGS, 12, 100);

/** The training strip: the 10 cats, then the first `dogs` dogs. */
export function trainingSet(dogs: number): Pic[] {
  const d = Math.max(0, Math.min(MAX_DOGS, Math.round(dogs)));
  return [...trainCats(), ...trainDogs().slice(0, d)];
}

/** The twelve test pictures shown on screen: six cats and six dogs, in a fixed mixed-up order. */
export function testPics(): Pic[] {
  const cats = makePics('cat', 6, 21, 200);
  const dogs = makePics('dog', 6, 22, 300);
  const out: Pic[] = [];
  for (let i = 0; i < 6; i++) out.push(i % 2 === 0 ? cats[i] : dogs[i], i % 2 === 0 ? dogs[i] : cats[i]);
  return out;
}

/** A bigger fresh test set (100 cats, 100 dogs), used for steadier numbers. */
export function bigTest(): Pic[] {
  return [...makePics('cat', 100, 31, 1000), ...makePics('dog', 100, 32, 2000)];
}

const dist = (a: Pic, b: Pic) => (a.ears - b.ears) ** 2 + (a.snout - b.snout) ** 2;

/** What the helper says: the label of the most similar training picture (ties go to the earlier one). */
export function says(train: Pic[], p: Pic): Kind {
  let best = train[0];
  let bd = Infinity;
  for (const t of train) {
    const d = dist(t, p);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best.kind;
}

export type Scored = { pic: Pic; said: Kind; right: boolean };

export function score(dogs: number, tests: Pic[]): Scored[] {
  const train = trainingSet(dogs);
  return tests.map((pic) => {
    const said = says(train, pic);
    return { pic, said, right: said === pic.kind };
  });
}

export function accuracy(dogs: number, tests: Pic[]): number {
  const s = score(dogs, tests);
  return s.filter((x) => x.right).length / s.length;
}

/** How many dogs of the test set were called dogs, and how many cats were called cats. */
export function perKind(dogs: number, tests: Pic[]): { dogsRight: number; dogsTotal: number; catsRight: number; catsTotal: number } {
  const s = score(dogs, tests);
  const d = s.filter((x) => x.pic.kind === 'dog');
  const c = s.filter((x) => x.pic.kind === 'cat');
  return {
    dogsRight: d.filter((x) => x.right).length,
    dogsTotal: d.length,
    catsRight: c.filter((x) => x.right).length,
    catsTotal: c.length,
  };
}

/** Accuracy for 0 to 10 dogs in the training set. */
export const curve = (tests: Pic[]): number[] => DOG_STEPS.map((d) => accuracy(d, tests));
