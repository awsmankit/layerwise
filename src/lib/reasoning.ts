/*
 * Logic for "Computers that decide and plan": a rule-based helper, a hand-built
 * decision tree for guessing animals, and a look-ahead tree for a tiny take-away
 * game. All of it is deterministic. Animal answers are simplified on purpose.
 */

/* ---------- rules ---------- */

export type Weather = 'sunny' | 'rainy' | 'snowy' | 'windy';
export type Temp = 'warm' | 'cold';
export const WEATHERS: Weather[] = ['sunny', 'rainy', 'snowy', 'windy'];
export const TEMPS: Temp[] = ['warm', 'cold'];

export type Rule = { id: string; text: string; then: string; test: (w: Weather, t: Temp) => boolean };
export const RULES: Rule[] = [
  { id: 'r1', text: 'If it is rainy', then: 'take an umbrella', test: (w) => w === 'rainy' },
  { id: 'r2', text: 'If it is cold', then: 'wear a coat', test: (_w, t) => t === 'cold' },
  { id: 'r3', text: 'If it is sunny and warm', then: 'wear a hat', test: (w, t) => w === 'sunny' && t === 'warm' },
];

/** Every rule whose "if" part is true right now. An empty list means nobody thought of this case. */
export function firedRules(w: Weather, t: Temp): Rule[] {
  return RULES.filter((r) => r.test(w, t));
}

/* ---------- a decision tree for guessing animals ---------- */

export type QKey = 'water' | 'fur' | 'fly' | 'big' | 'bark';
export const QUESTIONS: { key: QKey; text: string }[] = [
  { key: 'water', text: 'Does it live in water?' },
  { key: 'fur', text: 'Does it have fur?' },
  { key: 'fly', text: 'Can it fly?' },
  { key: 'big', text: 'Is it bigger than a grown-up?' },
  { key: 'bark', text: 'Does it bark?' },
];
export const questionText = (q: QKey) => QUESTIONS.find((x) => x.key === q)?.text ?? q;

export type Animal = { name: string; a: Record<QKey, boolean> };
export const ANIMALS: Animal[] = [
  { name: 'dog', a: { water: false, fur: true, fly: false, big: false, bark: true } },
  { name: 'cat', a: { water: false, fur: true, fly: false, big: false, bark: false } },
  { name: 'horse', a: { water: false, fur: true, fly: false, big: true, bark: false } },
  { name: 'bat', a: { water: false, fur: true, fly: true, big: false, bark: false } },
  { name: 'parrot', a: { water: false, fur: false, fly: true, big: false, bark: false } },
  { name: 'goldfish', a: { water: true, fur: false, fly: false, big: false, bark: false } },
  { name: 'whale', a: { water: true, fur: false, fly: false, big: true, bark: false } },
];
const byName = (n: string) => ANIMALS.find((x) => x.name === n) as Animal;

export type Tree = { animals: string[]; q?: QKey; yes?: Tree; no?: Tree };
export type Path = ('y' | 'n')[];

export const newTree = (): Tree => ({ animals: ANIMALS.map((x) => x.name) });

export function splitGroup(animals: string[], q: QKey): { yes: string[]; no: string[] } {
  return { yes: animals.filter((n) => byName(n).a[q]), no: animals.filter((n) => !byName(n).a[q]) };
}
/** True if the question gives different answers inside this group, so it is worth asking. */
export function splits(animals: string[], q: QKey): boolean {
  const s = splitGroup(animals, q);
  return s.yes.length > 0 && s.no.length > 0;
}

export function nodeAt(tree: Tree, path: Path): Tree | undefined {
  let cur: Tree | undefined = tree;
  for (const step of path) cur = cur ? (step === 'y' ? cur.yes : cur.no) : undefined;
  return cur;
}

/** Questions already asked on the way down to a node. Asking one again would tell us nothing. */
export function askedAbove(tree: Tree, path: Path): QKey[] {
  const out: QKey[] = [];
  let cur: Tree | undefined = tree;
  for (const step of path) {
    if (!cur || !cur.q) break;
    out.push(cur.q);
    cur = step === 'y' ? cur.yes : cur.no;
  }
  return out;
}

/** A new tree with the question asked at one node. Its two branches start unsplit. */
export function setQuestion(tree: Tree, path: Path, q: QKey): Tree {
  if (path.length === 0) {
    if (!splits(tree.animals, q)) return tree;
    const s = splitGroup(tree.animals, q);
    return { animals: tree.animals, q, yes: { animals: s.yes }, no: { animals: s.no } };
  }
  const [head, ...rest] = path;
  const child = head === 'y' ? tree.yes : tree.no;
  if (!child) return tree;
  const next = setQuestion(child, rest, q);
  return head === 'y' ? { ...tree, yes: next } : { ...tree, no: next };
}

/** The question that splits a group most evenly: the one whose bigger half is smallest. Ties go to the first in the list. */
export function bestQuestion(animals: string[], used: QKey[]): QKey | null {
  let best: QKey | null = null;
  let bestScore = Infinity;
  for (const { key } of QUESTIONS) {
    if (used.includes(key) || !splits(animals, key)) continue;
    const s = splitGroup(animals, key);
    const score = Math.max(s.yes.length, s.no.length);
    if (score < bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

/** Fill in every unfinished node using the "most even split" rule. */
export function autoFill(tree: Tree, used: QKey[] = []): Tree {
  if (tree.animals.length <= 1) return tree;
  const q = tree.q ?? bestQuestion(tree.animals, used);
  if (!q) return tree;
  const base = tree.q ? tree : setQuestion(tree, [], q);
  return { ...base, yes: autoFill(base.yes as Tree, [...used, q]), no: autoFill(base.no as Tree, [...used, q]) };
}

/** Questions needed to reach each animal, for animals the tree has already pinned down. */
export function depths(tree: Tree, depth = 0, out: Record<string, number> = {}): Record<string, number> {
  if (tree.animals.length === 1) out[tree.animals[0]] = depth;
  else if (tree.q && tree.yes && tree.no) {
    depths(tree.yes, depth + 1, out);
    depths(tree.no, depth + 1, out);
  }
  return out;
}

export function treeStats(tree: Tree) {
  const d = depths(tree);
  const vals = Object.values(d);
  const total = ANIMALS.length;
  return {
    found: vals.length,
    total,
    complete: vals.length === total,
    longest: vals.length ? Math.max(...vals) : 0,
    average: vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : 0,
  };
}

/** The best any tree can do with these animals and questions, found by trying every tree. */
export function bestPossible(): { longest: number; average: number } {
  const memoMax = new Map<string, number>();
  const memoSum = new Map<string, number>();
  const key = (g: string[], used: QKey[]) => g.join(',') + '|' + [...used].sort().join(',');
  const worst = (g: string[], used: QKey[]): number => {
    if (g.length <= 1) return 0;
    const k = key(g, used);
    const hit = memoMax.get(k);
    if (hit !== undefined) return hit;
    let best = Infinity;
    for (const { key: q } of QUESTIONS) {
      if (used.includes(q) || !splits(g, q)) continue;
      const s = splitGroup(g, q);
      best = Math.min(best, 1 + Math.max(worst(s.yes, [...used, q]), worst(s.no, [...used, q])));
    }
    memoMax.set(k, best);
    return best;
  };
  const sum = (g: string[], used: QKey[]): number => {
    if (g.length <= 1) return 0;
    const k = key(g, used);
    const hit = memoSum.get(k);
    if (hit !== undefined) return hit;
    let best = Infinity;
    for (const { key: q } of QUESTIONS) {
      if (used.includes(q) || !splits(g, q)) continue;
      const s = splitGroup(g, q);
      best = Math.min(best, g.length + sum(s.yes, [...used, q]) + sum(s.no, [...used, q]));
    }
    memoSum.set(k, best);
    return best;
  };
  const all = ANIMALS.map((x) => x.name);
  return { longest: worst(all, []), average: sum(all, []) / all.length };
}

/* ---------- a look-ahead tree for a take-away game ---------- */

export type Who = 'you' | 'computer';
export const other = (w: Who): Who => (w === 'you' ? 'computer' : 'you');
export const START_STICKS = 5;

export type NimNode = {
  id: string;
  sticks: number;
  /** Whose turn it is at this point. */
  mover: Who;
  /** How many sticks the move that led here took. */
  took?: 1 | 2;
  children: NimNode[];
  /** Who wins from here if both sides play their best. */
  winner: Who;
  x: number;
  y: number;
};

/** Build the whole tree of what could happen from here. Whoever takes the last stick wins. */
export function buildTree(sticks: number, mover: Who, took?: 1 | 2, id = 'r'): NimNode {
  if (sticks === 0) {
    // the player who moved last took the final stick and won
    return { id, sticks, mover, took, children: [], winner: other(mover), x: 0, y: 0 };
  }
  const children = ([1, 2] as const).filter((t) => t <= sticks).map((t) => buildTree(sticks - t, other(mover), t, id + t));
  const winner = children.some((c) => c.winner === mover) ? mover : other(mover);
  return { id, sticks, mover, took, children, winner, x: 0, y: 0 };
}

export const countLeaves = (n: NimNode): number => (n.children.length ? n.children.reduce((s, c) => s + countLeaves(c), 0) : 1);
export const countNodes = (n: NimNode): number => 1 + n.children.reduce((s, c) => s + countNodes(c), 0);
export const treeDepth = (n: NimNode): number => (n.children.length ? 1 + Math.max(...n.children.map(treeDepth)) : 0);

/** Give every node a position: leaves evenly spaced along x, parents centred over their children. */
export function layout(root: NimNode, slotX: number, slotY: number, padX: number, padY: number): NimNode {
  let leaf = 0;
  const place = (n: NimNode, depth: number): number => {
    n.y = padY + depth * slotY;
    if (!n.children.length) {
      n.x = padX + leaf * slotX;
      leaf += 1;
      return n.x;
    }
    const xs = n.children.map((c) => place(c, depth + 1));
    n.x = (xs[0] + xs[xs.length - 1]) / 2;
    return n.x;
  };
  place(root, 0);
  return root;
}

/** The computer's choice: the first move that wins for it. If none does, it takes 1 and hopes you slip. */
export function computerMove(sticks: number): { take: 1 | 2; winning: boolean } {
  const root = buildTree(sticks, 'computer');
  const win = root.children.find((c) => c.winner === 'computer');
  if (win) return { take: win.took as 1 | 2, winning: true };
  return { take: root.children[0].took as 1 | 2, winning: false };
}
