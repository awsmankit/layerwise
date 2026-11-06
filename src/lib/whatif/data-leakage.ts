/**
 * What if test data leaks into training? A small, deterministic example.
 * Speakers each record several clips. Clips from one speaker sit close together and share a label
 * (the speaker's label is partly predictable from where the speaker sits, partly luck).
 * A 1-nearest-neighbour model is scored two ways: split by row (siblings of a test clip are in training)
 * and split by speaker (whole speakers are held out). Every number is computed here.
 */

export const SPEAKERS = 40;
export const MAX_CLIPS = 12;
export const TEST_SPEAKERS = 12;
/** Chance a speaker's label disagrees with the simple rule "label = (x > 0)". It caps honest accuracy near 75%. */
export const LABEL_NOISE = 0.25;
export const CLIP_SPREAD = 0.03;

export type Clip = { id: number; speaker: number; x: number; y: number; label: 0 | 1 };

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
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** Build the clips. Taking the first k of each speaker's clips gives the data for "k clips per speaker". */
export function makeClips(clipsPerSpeaker: number, seed = 13): Clip[] {
  const r = rng(seed);
  const people = Array.from({ length: SPEAKERS }, () => {
    const cx = r() * 1.8 - 0.9;
    const cy = r() * 1.8 - 0.9;
    const flip = r() < LABEL_NOISE;
    const label = ((cx > 0) !== flip ? 1 : 0) as 0 | 1;
    const noise = Array.from({ length: MAX_CLIPS }, () => [gauss(r) * CLIP_SPREAD, gauss(r) * CLIP_SPREAD]);
    return { cx, cy, label, noise };
  });
  const clips: Clip[] = [];
  people.forEach((p, s) => {
    for (let k = 0; k < clipsPerSpeaker; k++) {
      clips.push({ id: clips.length, speaker: s, x: p.cx + p.noise[k][0], y: p.cy + p.noise[k][1], label: p.label });
    }
  });
  return clips;
}

function shuffle<T>(a: T[], r: () => number): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export type Split = { test: Set<number> };

/** Random rows go to the test set. Siblings from the same speaker usually end up on both sides. */
export function splitByRow(clips: Clip[], seed: number): Split {
  const r = rng(seed);
  const n = Math.round(clips.length * (TEST_SPEAKERS / SPEAKERS));
  return { test: new Set(shuffle(clips.map((c) => c.id), r).slice(0, n)) };
}

/** Whole speakers go to the test set. No speaker is on both sides. */
export function splitBySpeaker(clips: Clip[], seed: number): Split {
  const r = rng(seed);
  const held = new Set(shuffle(Array.from({ length: SPEAKERS }, (_, i) => i), r).slice(0, TEST_SPEAKERS));
  return { test: new Set(clips.filter((c) => held.has(c.speaker)).map((c) => c.id)) };
}

/** The closest training clip to this one (what a memoriser copies). */
export function neighbour(clips: Clip[], split: Split, c: Clip): Clip {
  let best = Infinity;
  let found = clips[0];
  for (const t of clips) {
    if (split.test.has(t.id)) continue;
    const d = (t.x - c.x) ** 2 + (t.y - c.y) ** 2;
    if (d < best) {
      best = d;
      found = t;
    }
  }
  return found;
}

/** 1-nearest-neighbour: copy the label of the closest training clip. A pure memoriser. */
export function predict(clips: Clip[], split: Split, c: Clip): 0 | 1 {
  return neighbour(clips, split, c).label;
}

export type Scored = { correct: Map<number, boolean>; accuracy: number; testCount: number; withSibling: number };

export function score(clips: Clip[], split: Split): Scored {
  const trainSpeakers = new Set(clips.filter((c) => !split.test.has(c.id)).map((c) => c.speaker));
  const correct = new Map<number, boolean>();
  let right = 0;
  let withSibling = 0;
  const test = clips.filter((c) => split.test.has(c.id));
  for (const c of test) {
    const ok = predict(clips, split, c) === c.label;
    correct.set(c.id, ok);
    if (ok) right++;
    if (trainSpeakers.has(c.speaker)) withSibling++;
  }
  return { correct, accuracy: test.length ? right / test.length : 0, testCount: test.length, withSibling };
}

/** Average of both scoring methods over many seeded shuffles, to show the gap is not luck. */
export function averageScores(clipsPerSpeaker: number, repeats = 100, dataSeed = 13): { row: number; speaker: number } {
  const clips = makeClips(clipsPerSpeaker, dataSeed);
  let row = 0;
  let speaker = 0;
  for (let i = 0; i < repeats; i++) {
    row += score(clips, splitByRow(clips, 500 + i)).accuracy;
    speaker += score(clips, splitBySpeaker(clips, 500 + i)).accuracy;
  }
  return { row: row / repeats, speaker: speaker / repeats };
}

/** Seed for the one split that the figure draws. */
export const SHOWN_SEED = 4;
