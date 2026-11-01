/*
 * Logic for the reward-hacking toy world in responsible/teaching-a-model-to-behave.
 *
 * A small robot in a small room is meant to clean up two bits of dirt by putting them in the bin.
 * A camera watches the floor. The learner chooses which reward terms are switched on. The robot is
 * not a learning model: it is an exact planner. For the chosen reward it works out, by dynamic
 * programming over every state the room can be in, the plan that collects the most reward in a fixed
 * number of steps. So whatever it does is what the reward really asks for, loopholes included.
 * Nothing here is random, and nothing comes from a real robot or a real model.
 */

export const COLS = 6;
export const ROWS = 4;
export const HORIZON = 22;

export interface Cell {
  x: number;
  y: number;
}

/** The camera stand (the robot can cover the lens from here), the rug, the bin and the robot's start. */
export const CAMERA: Cell = { x: 0, y: 0 };
export const RUG: Cell = { x: 2, y: 1 };
export const BIN: Cell = { x: 5, y: 0 };
export const START_ROBOT: Cell = { x: 2, y: 3 };
/** Where the two bits of dirt start. */
export const START_DIRT: Cell[] = [
  { x: 1, y: 1 },
  { x: 4, y: 2 },
];

/** A small cost for every move, so the planner takes the shortest way instead of wandering. */
export const MOVE_COST = 0.01;

export type TermId = 'sees' | 'pickup' | 'coverPen' | 'hidePen' | 'binEnd';

export interface TermInfo {
  id: TermId;
  label: string;
  /** Plain description of the rule */
  rule: string;
  /** What the term pays (positive) or charges (negative) */
  weight: number;
}

export const TERMS: TermInfo[] = [
  { id: 'sees', label: 'The camera sees no mess', rule: '+1 for every step in which the camera sees no mess', weight: 1 },
  { id: 'pickup', label: 'Pick up dirt', rule: '+3 every time the robot picks up a bit of dirt', weight: 3 },
  { id: 'coverPen', label: 'Do not cover the camera', rule: '-2 for every step the camera is covered', weight: -2 },
  { id: 'hidePen', label: 'Do not hide dirt under the rug', rule: '-25 for each bit of dirt pushed under the rug', weight: -25 },
  { id: 'binEnd', label: 'Dirt in the bin at the end', rule: '+10 for each bit of dirt in the bin when the time is up', weight: 10 },
];

export type TermSet = Record<TermId, boolean>;

export const NO_TERMS: TermSet = { sees: false, pickup: false, coverPen: false, hidePen: false, binEnd: false };

/* ---------- the room ---------- */

export type Action = 'up' | 'down' | 'left' | 'right' | 'pick' | 'drop' | 'cover' | 'wait';

/** Actions in a fixed order; ties between equally good plans go to the earliest. 'wait' is last. */
export const ACTIONS: Action[] = ['up', 'down', 'left', 'right', 'pick', 'drop', 'cover', 'wait'];

const NCELL = COLS * ROWS;
const CARRIED = NCELL; // a dirt status: held by the robot
const IN_BIN = NCELL + 1;
const UNDER_RUG = NCELL + 2;
const NDIRT = NCELL + 3;

const cellIndex = (c: Cell) => c.y * COLS + c.x;
const BIN_I = cellIndex(BIN);
const RUG_I = cellIndex(RUG);
const CAM_I = cellIndex(CAMERA);

interface Room {
  robot: number;
  d0: number;
  d1: number;
  covered: 0 | 1;
}

const NSTATE = NCELL * NDIRT * NDIRT * 2;
const encode = (r: Room) => ((r.robot * NDIRT + r.d0) * NDIRT + r.d1) * 2 + r.covered;
const decode = (s: number): Room => {
  const covered = (s % 2) as 0 | 1;
  let q = (s - covered) / 2;
  const d1 = q % NDIRT;
  q = (q - d1) / NDIRT;
  const d0 = q % NDIRT;
  const robot = (q - d0) / NDIRT;
  return { robot, d0, d1, covered };
};

export function startRoom(): Room {
  return { robot: cellIndex(START_ROBOT), d0: cellIndex(START_DIRT[0]), d1: cellIndex(START_DIRT[1]), covered: 0 };
}

interface StepResult {
  room: Room;
  moved: boolean;
  picked: boolean;
  hid: boolean;
  binned: boolean;
}

const isCarried = (r: Room) => r.d0 === CARRIED || r.d1 === CARRIED;
const floorDirtAt = (r: Room, cell: number) => (r.d0 === cell ? 0 : r.d1 === cell ? 1 : -1);

/** Apply one action. Actions that cannot happen change nothing, like waiting. */
export function stepRoom(r: Room, a: Action): StepResult {
  const none: StepResult = { room: r, moved: false, picked: false, hid: false, binned: false };
  const x = r.robot % COLS;
  const y = Math.floor(r.robot / COLS);
  if (a === 'up' || a === 'down' || a === 'left' || a === 'right') {
    const nx = x + (a === 'left' ? -1 : a === 'right' ? 1 : 0);
    const ny = y + (a === 'up' ? -1 : a === 'down' ? 1 : 0);
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return none;
    return { ...none, room: { ...r, robot: ny * COLS + nx }, moved: true };
  }
  if (a === 'pick') {
    if (isCarried(r)) return none;
    const which = floorDirtAt(r, r.robot);
    if (which < 0) return none;
    return { ...none, room: which === 0 ? { ...r, d0: CARRIED } : { ...r, d1: CARRIED }, picked: true };
  }
  if (a === 'drop') {
    const which = r.d0 === CARRIED ? 0 : r.d1 === CARRIED ? 1 : -1;
    if (which < 0) return none;
    if (r.robot === BIN_I) return { ...none, room: which === 0 ? { ...r, d0: IN_BIN } : { ...r, d1: IN_BIN }, binned: true };
    if (r.robot === RUG_I) return { ...none, room: which === 0 ? { ...r, d0: UNDER_RUG } : { ...r, d1: UNDER_RUG }, hid: true };
    if (floorDirtAt(r, r.robot) >= 0) return none; // one bit of dirt per floor cell
    return { ...none, room: which === 0 ? { ...r, d0: r.robot } : { ...r, d1: r.robot } };
  }
  if (a === 'cover') {
    if (r.robot !== CAM_I || r.covered) return none;
    return { ...none, room: { ...r, covered: 1 } };
  }
  return none;
}

/** True when the camera would report "no mess": the lens is covered, or no dirt is on the floor or in the robot's hands. */
export function cameraSeesNoMess(r: Room): boolean {
  if (r.covered) return true;
  const onFloor = (d: number) => d < NCELL || d === CARRIED;
  return !onFloor(r.d0) && !onFloor(r.d1);
}

const dirtInBin = (r: Room) => (r.d0 === IN_BIN ? 1 : 0) + (r.d1 === IN_BIN ? 1 : 0);

function stepReward(terms: TermSet, res: StepResult): number {
  let v = res.moved ? -MOVE_COST : 0;
  if (terms.sees && cameraSeesNoMess(res.room)) v += 1;
  if (terms.pickup && res.picked) v += 3;
  if (terms.coverPen && res.room.covered) v -= 2;
  if (terms.hidePen && res.hid) v -= 25;
  return v;
}

const terminalReward = (terms: TermSet, r: Room) => (terms.binEnd ? 10 * dirtInBin(r) : 0);

/* ---------- planning ---------- */

export interface Frame {
  /** 0 is the start; frame t is the room after t actions */
  t: number;
  action: Action | null;
  robot: Cell;
  /** Each dirt: a floor cell, or where it is otherwise */
  dirt: { where: 'floor' | 'carried' | 'bin' | 'rug'; cell: Cell | null }[];
  covered: boolean;
  /** Reward paid for the action that led to this frame (not counting the final bonus) */
  reward: number;
  sawNoMess: boolean;
}

export interface Plan {
  frames: Frame[];
  /** Total reward the planner collects, including the end-of-time bonus */
  total: number;
  /** The end-of-time bonus part of the total */
  endBonus: number;
  outcome: Outcome;
  pickups: number;
  /** Steps in which the camera saw no mess */
  quietSteps: number;
}

export type Behaviour = 'idle' | 'covers' | 'hides' | 'farms' | 'cleans' | 'other';

export interface Outcome {
  inBin: number;
  underRug: number;
  onFloor: number;
  carried: number;
  coverCovered: boolean;
  behaviour: Behaviour;
}

const cellOf = (i: number): Cell => ({ x: i % COLS, y: Math.floor(i / COLS) });

function frameOf(t: number, r: Room, action: Action | null, reward: number): Frame {
  const dirt = [r.d0, r.d1].map((d) => {
    if (d === CARRIED) return { where: 'carried' as const, cell: null };
    if (d === IN_BIN) return { where: 'bin' as const, cell: null };
    if (d === UNDER_RUG) return { where: 'rug' as const, cell: null };
    return { where: 'floor' as const, cell: cellOf(d) };
  });
  return { t, action, robot: cellOf(r.robot), dirt, covered: r.covered === 1, reward, sawNoMess: cameraSeesNoMess(r) };
}

function classify(final: Room, pickups: number, anyMove: boolean): Outcome {
  const where = [final.d0, final.d1];
  const inBin = where.filter((d) => d === IN_BIN).length;
  const underRug = where.filter((d) => d === UNDER_RUG).length;
  const carried = where.filter((d) => d === CARRIED).length;
  const onFloor = where.filter((d) => d < NCELL).length;
  const covered = final.covered === 1;
  let behaviour: Behaviour;
  if (!anyMove) behaviour = 'idle';
  else if (covered) behaviour = 'covers';
  else if (underRug > 0) behaviour = 'hides';
  else if (pickups > 2) behaviour = 'farms';
  else if (inBin === 2) behaviour = 'cleans';
  else behaviour = 'other';
  return { inBin, underRug, onFloor, carried, coverCovered: covered, behaviour };
}

const cache = new Map<string, Plan>();
const termKey = (t: TermSet) => (Object.keys(NO_TERMS) as TermId[]).map((k) => (t[k] ? '1' : '0')).join('');

/**
 * The best plan for the chosen reward, found by working backwards from the last step.
 * value[t][s] is the most reward the robot can still collect from state s with HORIZON - t steps left.
 */
export function plan(terms: TermSet): Plan {
  const key = termKey(terms);
  const hit = cache.get(key);
  if (hit) return hit;

  const value: Float64Array[] = [];
  for (let t = 0; t <= HORIZON; t++) value.push(new Float64Array(NSTATE));
  for (let s = 0; s < NSTATE; s++) value[HORIZON][s] = terminalReward(terms, decode(s));
  for (let t = HORIZON - 1; t >= 0; t--) {
    const next = value[t + 1];
    const here = value[t];
    for (let s = 0; s < NSTATE; s++) {
      const room = decode(s);
      let best = -Infinity;
      for (const a of ACTIONS) {
        const res = stepRoom(room, a);
        if (a !== 'wait' && res.room === room) continue; // an action that does nothing is just waiting
        const v = stepReward(terms, res) + next[res.room === room ? s : encode(res.room)];
        if (v > best) best = v;
      }
      here[s] = best;
    }
  }

  // follow the best action from the start; the first of the best actions wins a tie
  let room = startRoom();
  const frames: Frame[] = [frameOf(0, room, null, 0)];
  let collected = 0;
  let pickups = 0;
  let anyMove = false;
  let quiet = 0;
  for (let t = 0; t < HORIZON; t++) {
    let bestA: Action = 'wait';
    let bestV = -Infinity;
    let bestRes: StepResult | null = null;
    for (const a of ACTIONS) {
      const res = stepRoom(room, a);
      if (a !== 'wait' && res.room === room) continue;
      const v = stepReward(terms, res) + value[t + 1][encode(res.room)];
      if (v > bestV + 1e-9) {
        bestV = v;
        bestA = a;
        bestRes = res;
      }
    }
    const res = bestRes as StepResult;
    const r = stepReward(terms, res);
    collected += r;
    if (res.picked) pickups++;
    if (bestA !== 'wait') anyMove = true;
    room = res.room;
    if (cameraSeesNoMess(room)) quiet++;
    frames.push(frameOf(t + 1, room, bestA, r));
  }
  const endBonus = terminalReward(terms, room);
  const result: Plan = {
    frames,
    total: collected + endBonus,
    endBonus,
    outcome: classify(room, pickups, anyMove),
    pickups,
    quietSteps: quiet,
  };
  cache.set(key, result);
  return result;
}

/** What each behaviour is called in the lesson. */
export const BEHAVIOUR_TEXT: Record<Behaviour, string> = {
  idle: 'Does nothing. There is no reward to chase.',
  covers: 'Covers the camera. The camera sees no mess, so the reward arrives, and the dirt stays where it is.',
  hides: 'Pushes the dirt under the rug. The camera sees no mess, and the dirt is still in the room.',
  farms: 'Picks up dirt, drops it, and picks it up again, collecting the pick-up reward over and over.',
  cleans: 'Puts all the dirt in the bin. This is what we meant.',
  other: 'Does something in between. Read the steps.',
};

export const ACTION_TEXT: Record<Action, string> = {
  up: 'moves up',
  down: 'moves down',
  left: 'moves left',
  right: 'moves right',
  pick: 'picks up dirt',
  drop: 'drops what it is holding',
  cover: 'covers the camera lens',
  wait: 'waits',
};

/** The five-step story the lesson walks through: each step adds a term to the last. */
export const STORY: { label: string; terms: TermSet }[] = [
  { label: 'Start: reward "the camera sees no mess"', terms: { ...NO_TERMS, sees: true } },
  { label: 'Fix: charge for covering the camera', terms: { ...NO_TERMS, sees: true, coverPen: true } },
  { label: 'Fix: charge for hiding dirt under the rug', terms: { ...NO_TERMS, sees: true, coverPen: true, hidePen: true } },
  { label: 'Add: pay for picking up dirt', terms: { ...NO_TERMS, sees: true, coverPen: true, hidePen: true, pickup: true } },
  { label: 'Replace with: dirt in the bin at the end', terms: { ...NO_TERMS, binEnd: true } },
];

export const cellsEqual = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

/** The plan as a short run-length summary, for example "up x3, left x2, cover, wait x16". */
export function summarisePlan(p: Plan): string {
  const parts: string[] = [];
  let last: Action | null = null;
  let n = 0;
  const flush = () => {
    if (last) parts.push(n > 1 ? `${last} x${n}` : last);
  };
  for (const f of p.frames.slice(1)) {
    if (f.action === last) n++;
    else {
      flush();
      last = f.action;
      n = 1;
    }
  }
  flush();
  return parts.join(', ');
}
