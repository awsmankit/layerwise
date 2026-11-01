/*
 * Tabular Q-learning on small grid worlds, for the lesson "Reinforcement learning from
 * scratch". Everything is deterministic given a seed, so the same clicks give the same
 * result. The cliff world is a smaller copy of Example 6.6 in Sutton and Barto (2018);
 * the coin room is an invented example of a reward loophole.
 */

export type Kind = 'floor' | 'wall' | 'cliff' | 'start' | 'goal' | 'coin';

export type World = {
  id: string;
  name: string;
  blurb: string;
  rows: string[]; // '.' floor, '#' wall, 'C' cliff, 'S' start, 'G' goal, 'K' coin
  step: number; // reward for an ordinary move
  goal: number; // reward for the move into the goal (the episode ends)
  cliff: number; // reward for stepping on the cliff (the agent is sent back to the start)
  coin: number; // reward for stepping onto a coin cell; the coin comes back every time
  maxSteps: number; // an episode is cut off after this many moves
};

export const WORLDS: World[] = [
  {
    id: 'cliff',
    name: 'Cliff walk',
    blurb: 'Every move costs 1. The grey cells are a cliff: stepping on one costs 100 and sends the agent back to the start. The shortest route runs along the cliff edge.',
    rows: ['........', '........', '........', 'SCCCCCCG'],
    step: -1,
    goal: -1,
    cliff: -100,
    coin: 0,
    maxSteps: 100,
  },
  {
    id: 'coin',
    name: 'Coin room: coin pays 3',
    blurb: 'Every move costs 1, the goal pays 10, and a coin on the way pays 3 every time the agent steps on it. The coin never runs out.',
    rows: ['S.....', '.#K#..', '.....G'],
    step: -1,
    goal: 10,
    cliff: 0,
    coin: 3,
    maxSteps: 50,
  },
  {
    id: 'coin-fixed',
    name: 'Coin room: coin pays 0.4',
    blurb: 'The same room with a smaller coin. Stepping on it still beats an ordinary move, but not enough to be worth stepping off and on again.',
    rows: ['S.....', '.#K#..', '.....G'],
    step: -1,
    goal: 10,
    cliff: 0,
    coin: 0.4,
    maxSteps: 50,
  },
];

/** Moves: 0 up, 1 right, 2 down, 3 left. */
export const MOVES: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export const MOVE_NAMES = ['up', 'right', 'down', 'left'];
export const ARROWS = ['↑', '→', '↓', '←'];

export type Params = { alpha: number; gamma: number; epsilon: number };
export const DEFAULTS: Params = { alpha: 0.5, gamma: 0.9, epsilon: 0.1 };

export const cols = (w: World) => w.rows[0].length;
export const rowsOf = (w: World) => w.rows.length;
export const cellId = (w: World, x: number, y: number) => y * cols(w) + x;
export const nStates = (w: World) => cols(w) * rowsOf(w);

export function kindAt(w: World, x: number, y: number): Kind {
  const c = w.rows[y]?.[x];
  if (c === '#') return 'wall';
  if (c === 'C') return 'cliff';
  if (c === 'S') return 'start';
  if (c === 'G') return 'goal';
  if (c === 'K') return 'coin';
  return 'floor';
}

export function startOf(w: World): [number, number] {
  for (let y = 0; y < rowsOf(w); y++) for (let x = 0; x < cols(w); x++) if (kindAt(w, x, y) === 'start') return [x, y];
  throw new Error('world has no start');
}

export type StepResult = { x: number; y: number; reward: number; done: boolean; fell: boolean; coin: boolean };

/** One move. Walls and edges leave the agent where it is. The goal ends the episode; the cliff sends the agent back to the start. */
export function step(w: World, x: number, y: number, a: number): StepResult {
  const nx = x + MOVES[a][0];
  const ny = y + MOVES[a][1];
  const out = nx < 0 || ny < 0 || nx >= cols(w) || ny >= rowsOf(w);
  const blocked = out || kindAt(w, nx, ny) === 'wall';
  if (blocked) return { x, y, reward: w.step, done: false, fell: false, coin: false };
  const k = kindAt(w, nx, ny);
  if (k === 'goal') return { x: nx, y: ny, reward: w.goal, done: true, fell: false, coin: false };
  if (k === 'cliff') {
    const [sx, sy] = startOf(w);
    return { x: sx, y: sy, reward: w.cliff, done: false, fell: true, coin: false };
  }
  if (k === 'coin') return { x: nx, y: ny, reward: w.coin, done: false, fell: false, coin: true };
  return { x: nx, y: ny, reward: w.step, done: false, fell: false, coin: false };
}

/** A small seeded random number generator (mulberry32). Returns the number and the next seed. */
export function rand(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

export type Episode = { ret: number; steps: number; reached: boolean; falls: number; coins: number };
export type Learner = { q: number[]; seed: number; episodes: number; log: Episode[] };

export const newLearner = (w: World, seed = 7): Learner => ({ q: new Array(nStates(w) * 4).fill(0), seed, episodes: 0, log: [] });

/** The best action in a cell by the current table, or null if no action there has been tried yet (all four values are still zero). */
export function bestAction(q: number[], base: number): number | null {
  const row = q.slice(base, base + 4);
  if (row.every((v) => v === 0)) return null;
  let best = 0;
  for (let a = 1; a < 4; a++) if (row[a] > row[best]) best = a;
  return best;
}

export const valueOf = (q: number[], base: number) => Math.max(q[base], q[base + 1], q[base + 2], q[base + 3]);

/** The Q-learning update (Sutton and Barto, equation 6.8): move the old value a fraction alpha of the way towards reward + gamma x best next value. */
export const qUpdate = (old: number, reward: number, future: number, alpha: number, gamma: number) => old + alpha * (reward + gamma * future - old);

/** Let the agent play `n` more episodes with epsilon-greedy choices, applying the Q-learning update after every move. */
export function train(w: World, l: Learner, p: Params, n: number): Learner {
  const q = l.q.slice();
  let seed = l.seed;
  const log = l.log.slice();
  const [sx, sy] = startOf(w);
  for (let e = 0; e < n; e++) {
    let x = sx;
    let y = sy;
    let ret = 0;
    let steps = 0;
    let falls = 0;
    let coins = 0;
    let reached = false;
    while (steps < w.maxSteps) {
      let r: number;
      [r, seed] = rand(seed);
      const base = cellId(w, x, y) * 4;
      let a: number;
      if (r < p.epsilon) {
        [r, seed] = rand(seed);
        a = Math.floor(r * 4);
      } else {
        const top = valueOf(q, base);
        const ties = [0, 1, 2, 3].filter((i) => q[base + i] === top);
        [r, seed] = rand(seed);
        a = ties[Math.floor(r * ties.length)];
      }
      const m = step(w, x, y, a);
      const next = cellId(w, m.x, m.y) * 4;
      const future = m.done ? 0 : valueOf(q, next);
      q[base + a] = qUpdate(q[base + a], m.reward, future, p.alpha, p.gamma);
      ret += m.reward;
      steps += 1;
      if (m.fell) falls += 1;
      if (m.coin) coins += 1;
      x = m.x;
      y = m.y;
      if (m.done) {
        reached = true;
        break;
      }
    }
    log.push({ ret, steps, reached, falls, coins });
  }
  return { q, seed, episodes: l.episodes + n, log };
}

/** Follow the table greedily from the start. `reached` is false if the path loops, has no opinion yet, or runs out of moves. */
export function greedyPath(w: World, q: number[]): { cells: [number, number][]; reached: boolean; looped: boolean; ret: number } {
  let [x, y] = startOf(w);
  const cells: [number, number][] = [[x, y]];
  const seen = new Set<number>([cellId(w, x, y)]);
  let ret = 0;
  for (let i = 0; i < w.maxSteps; i++) {
    const a = bestAction(q, cellId(w, x, y) * 4);
    if (a === null) return { cells, reached: false, looped: false, ret };
    const m = step(w, x, y, a);
    ret += m.reward;
    x = m.x;
    y = m.y;
    cells.push([x, y]);
    if (m.done) return { cells, reached: true, looped: false, ret };
    if (seen.has(cellId(w, x, y))) return { cells, reached: false, looped: true, ret };
    seen.add(cellId(w, x, y));
  }
  return { cells, reached: false, looped: false, ret };
}

/** Exact optimal action values by repeating the Bellman optimality update until nothing changes. Used as a reference and in tests. */
export function optimalQ(w: World, gamma: number): number[] {
  const q = new Array(nStates(w) * 4).fill(0);
  for (let sweep = 0; sweep < 5000; sweep++) {
    let delta = 0;
    for (let y = 0; y < rowsOf(w); y++)
      for (let x = 0; x < cols(w); x++) {
        const k = kindAt(w, x, y);
        if (k === 'wall' || k === 'goal') continue;
        const base = cellId(w, x, y) * 4;
        for (let a = 0; a < 4; a++) {
          const m = step(w, x, y, a);
          const future = m.done ? 0 : valueOf(q, cellId(w, m.x, m.y) * 4);
          const v = m.reward + gamma * future;
          delta = Math.max(delta, Math.abs(v - q[base + a]));
          q[base + a] = v;
        }
      }
    if (delta < 1e-10) break;
  }
  return q;
}

/** Summary of the last `window` episodes. */
export function recent(l: Learner, window = 50) {
  const last = l.log.slice(-window);
  const n = last.length;
  if (!n) return { n: 0, meanReturn: 0, reached: 0, falls: 0, coins: 0 };
  return {
    n,
    meanReturn: last.reduce((s, e) => s + e.ret, 0) / n,
    reached: last.filter((e) => e.reached).length,
    falls: last.reduce((s, e) => s + e.falls, 0),
    coins: last.reduce((s, e) => s + e.coins, 0),
  };
}

/** Moving average of the episode returns, for the small chart. */
export function smooth(values: number[], window = 20): number[] {
  return values.map((_, i) => {
    const from = Math.max(0, i - window + 1);
    const s = values.slice(from, i + 1);
    return s.reduce((a, b) => a + b, 0) / s.length;
  });
}
