/*
 * Logic for the "Three ways a machine can learn" playground. Everything here is
 * deterministic: the same clicks always give the same result, so the lesson text
 * can describe what the learner will see. The numbers are made-up examples.
 */

/* ---------- the pile of fruit (used by the labels and no-labels tabs) ---------- */

export type Kind = 'cherry' | 'apple' | 'banana';
export type Item = { id: string; kind: Kind; len: number; red: number };
export type Point = [number, number];

/** Length in cm and "how red" from 0 (not at all) to 10 (very red). Rough example values. */
export const PILE: Item[] = [
  { id: 'c1', kind: 'cherry', len: 2, red: 9 },
  { id: 'a1', kind: 'apple', len: 7, red: 6 },
  { id: 'b1', kind: 'banana', len: 16, red: 1 },
  { id: 'c2', kind: 'cherry', len: 2.5, red: 8 },
  { id: 'a2', kind: 'apple', len: 8, red: 7 },
  { id: 'b2', kind: 'banana', len: 18, red: 2 },
  { id: 'c3', kind: 'cherry', len: 3, red: 9.5 },
  { id: 'a3', kind: 'apple', len: 6.5, red: 4.5 },
  { id: 'b3', kind: 'banana', len: 20, red: 1.5 },
  { id: 'c4', kind: 'cherry', len: 3.5, red: 7.5 },
  { id: 'a4', kind: 'apple', len: 8.5, red: 5.5 },
  { id: 'b4', kind: 'banana', len: 15, red: 2.5 },
];

export const LEN_MAX = 24;
export const RED_MAX = 10;

/** Put both measurements on the same 0 to 1 scale, so a centimetre does not outweigh a point of redness. */
export function scale(len: number, red: number): Point {
  return [len / LEN_MAX, red / RED_MAX];
}
const pointOf = (i: Item): Point => scale(i.len, i.red);
const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** The labelled items closest to a mystery item, nearest first (ties keep the pile's order). */
export function nearest(pile: Item[], len: number, red: number, k = 3): Item[] {
  const p = scale(len, red);
  return pile
    .map((item, i) => ({ item, i, d: dist(pointOf(item), p) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, k)
    .map((x) => x.item);
}

/** The kind most of the neighbours have. A tie goes to the nearest neighbour's kind. */
export function vote(neighbours: Item[]): { kind: Kind; counts: Record<Kind, number>; unanimous: boolean } {
  const counts: Record<Kind, number> = { cherry: 0, apple: 0, banana: 0 };
  neighbours.forEach((n) => (counts[n.kind] += 1));
  let kind = neighbours[0].kind;
  (Object.keys(counts) as Kind[]).forEach((k) => {
    if (counts[k] > counts[kind]) kind = k;
  });
  return { kind, counts, unanimous: counts[kind] === neighbours.length };
}

/* ---------- finding groups without labels (k-means) ---------- */

export type Groups = { k: number; centres: Point[]; assign: number[] | null; round: number; done: boolean };

/** Start with k centres: the first item in the pile, then each time the item farthest from all centres so far. */
export function startGroups(pile: Item[], k: number): Groups {
  const pts = pile.map(pointOf);
  const centres: Point[] = [pts[0]];
  while (centres.length < k) {
    let best = 0;
    let bestD = -1;
    pts.forEach((p, i) => {
      const d = Math.min(...centres.map((c) => dist(p, c)));
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    });
    centres.push(pts[best]);
  }
  return { k, centres, assign: null, round: 0, done: false };
}

/** One round: every item joins its nearest centre, then every centre moves to the middle of its group. */
export function stepGroups(pile: Item[], g: Groups): Groups {
  if (g.done) return g;
  const pts = pile.map(pointOf);
  const assign = pts.map((p) => {
    let best = 0;
    g.centres.forEach((c, j) => {
      if (dist(p, c) < dist(p, g.centres[best])) best = j;
    });
    return best;
  });
  const unchanged = g.assign !== null && g.assign.every((a, i) => a === assign[i]);
  const centres = g.centres.map((c, j): Point => {
    const members = pts.filter((_, i) => assign[i] === j);
    if (!members.length) return c;
    return [members.reduce((s, p) => s + p[0], 0) / members.length, members.reduce((s, p) => s + p[1], 0) / members.length];
  });
  return { k: g.k, centres, assign, round: g.round + 1, done: unchanged };
}

export function runGroups(pile: Item[], g: Groups, max = 20): Groups {
  let cur = g;
  for (let i = 0; i < max && !cur.done; i++) cur = stepGroups(pile, cur);
  return cur;
}

/** How many items of each kind landed in each group, to show what the groups mean (the computer never sees this). */
export function groupMakeup(pile: Item[], assign: number[], k: number): Record<Kind, number>[] {
  const out = Array.from({ length: k }, () => ({ cherry: 0, apple: 0, banana: 0 }) as Record<Kind, number>);
  pile.forEach((it, i) => (out[assign[i]][it.kind] += 1));
  return out;
}

/* ---------- learning from rewards (tabular Q-learning on a tiny grid) ---------- */

export const GRID = {
  cols: 5,
  rows: 4,
  start: [0, 0] as Point,
  goal: [4, 3] as Point,
  pits: [
    [3, 1],
    [0, 3],
  ] as Point[],
  walls: [
    [1, 1],
    [2, 3],
  ] as Point[],
};

export const REWARD = { goal: 10, pit: -10, step: -1 };
export const ALPHA = 0.5; // how far one experience moves what the agent believes
export const GAMMA = 0.9; // how much it cares about rewards further ahead
export const EPSILON = 0.2; // how often it tries a random move instead of its best guess
export const MAX_STEPS = 40; // a try ends after this many moves

/** Moves: 0 up, 1 right, 2 down, 3 left. */
export const MOVES: Point[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export const MOVE_NAMES = ['up', 'right', 'down', 'left'];

export const cellId = (x: number, y: number) => y * GRID.cols + x;
const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];
export const isWall = (x: number, y: number) => GRID.walls.some((w) => w[0] === x && w[1] === y);
export const isPit = (x: number, y: number) => GRID.pits.some((w) => w[0] === x && w[1] === y);
export const isGoal = (x: number, y: number) => same(GRID.goal, [x, y]);

export type Outcome = 'goal' | 'pit' | 'timeout';
export type Learner = { q: number[]; seed: number; tries: number; history: { steps: number; outcome: Outcome }[] };

export function newLearner(seed = 2024): Learner {
  return { q: new Array(GRID.cols * GRID.rows * 4).fill(0), seed, tries: 0, history: [] };
}

/** A small seeded random number generator (mulberry32). Returns the number and the next seed. */
function rand(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** What happens when the agent moves from (x, y): where it ends up and the reward it gets. Walls and edges block it. */
export function move(x: number, y: number, a: number): { x: number; y: number; reward: number; end: Outcome | null } {
  const nx = x + MOVES[a][0];
  const ny = y + MOVES[a][1];
  const blocked = nx < 0 || ny < 0 || nx >= GRID.cols || ny >= GRID.rows || isWall(nx, ny);
  const [px, py] = blocked ? [x, y] : [nx, ny];
  if (isGoal(px, py)) return { x: px, y: py, reward: REWARD.goal, end: 'goal' };
  if (isPit(px, py)) return { x: px, y: py, reward: REWARD.pit, end: 'pit' };
  return { x: px, y: py, reward: REWARD.step, end: null };
}

/** The agent's best-looking move from a cell, or null if it has no opinion yet (all values still zero). */
export function bestMove(q: number[], x: number, y: number): number | null {
  const base = cellId(x, y) * 4;
  let best = 0;
  for (let a = 1; a < 4; a++) if (q[base + a] > q[base + best]) best = a;
  return q[base + best] === 0 && q.slice(base, base + 4).every((v) => v === 0) ? null : best;
}

/** Let the agent try the grid `n` more times, learning after every move. */
export function train(l: Learner, n: number): Learner {
  const q = l.q.slice();
  let seed = l.seed;
  const history = l.history.slice();
  for (let t = 0; t < n; t++) {
    let x = GRID.start[0];
    let y = GRID.start[1];
    let steps = 0;
    let outcome: Outcome = 'timeout';
    while (steps < MAX_STEPS) {
      let r: number;
      [r, seed] = rand(seed);
      let a: number;
      const base = cellId(x, y) * 4;
      if (r < EPSILON) {
        [r, seed] = rand(seed);
        a = Math.floor(r * 4);
      } else {
        const top = Math.max(q[base], q[base + 1], q[base + 2], q[base + 3]);
        const ties = [0, 1, 2, 3].filter((i) => q[base + i] === top);
        [r, seed] = rand(seed);
        a = ties[Math.floor(r * ties.length)];
      }
      const m = move(x, y, a);
      const nb = cellId(m.x, m.y) * 4;
      const future = m.end ? 0 : Math.max(q[nb], q[nb + 1], q[nb + 2], q[nb + 3]);
      q[base + a] += ALPHA * (m.reward + GAMMA * future - q[base + a]);
      x = m.x;
      y = m.y;
      steps += 1;
      if (m.end) {
        outcome = m.end;
        break;
      }
    }
    history.push({ steps, outcome });
  }
  return { q, seed, tries: l.tries + n, history };
}

/** Follow the agent's best-looking move from the start. `reached` is false if it loops or has no opinion. */
export function greedyPath(q: number[]): { cells: Point[]; reached: boolean } {
  let [x, y] = GRID.start;
  const cells: Point[] = [[x, y]];
  const seen = new Set<number>([cellId(x, y)]);
  for (let i = 0; i < 30; i++) {
    const a = bestMove(q, x, y);
    if (a === null) return { cells, reached: false };
    const m = move(x, y, a);
    x = m.x;
    y = m.y;
    cells.push([x, y]);
    if (m.end === 'goal') return { cells, reached: true };
    if (m.end === 'pit') return { cells, reached: false };
    if (seen.has(cellId(x, y))) return { cells, reached: false };
    seen.add(cellId(x, y));
  }
  return { cells, reached: false };
}

/** Moves on the shortest route from start to goal that avoids walls, by counting (breadth first). */
export function shortestRoute(): number {
  const dists = new Map<number, number>([[cellId(GRID.start[0], GRID.start[1]), 0]]);
  const queue: Point[] = [GRID.start];
  while (queue.length) {
    const [x, y] = queue.shift() as Point;
    const d = dists.get(cellId(x, y)) as number;
    if (isGoal(x, y)) return d;
    for (let a = 0; a < 4; a++) {
      const m = move(x, y, a);
      if (m.end === 'pit' || dists.has(cellId(m.x, m.y))) continue;
      dists.set(cellId(m.x, m.y), d + 1);
      queue.push([m.x, m.y]);
    }
  }
  return -1;
}
