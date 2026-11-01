import type { PatternId, Run } from '../../lib/agent-patterns';

/** Where each lane is drawn for each pattern, in a 300-unit-wide picture. Labels are short on purpose. */
export const W = 300;
export const NODE_H = 30;

export interface NodeBox {
  x: number;
  y: number;
  w: number;
  label: string;
  /** Ordinary code, not a model: drawn dashed. */
  code?: boolean;
}

export interface Layout {
  nodes: Record<string, NodeBox>;
  /** Boxes that exist in the pattern but are not used in this run, drawn faint. */
  ghosts?: NodeBox[];
  /** Faint arrows to the ghost boxes, as [from lane, ghost index]. */
  ghostEdges?: [string, number][];
  /** A lane that loops on itself through tools. */
  selfLoop?: string;
  height: number;
}

const CHECKER: NodeBox = { x: 100, y: 0, w: 100, label: 'Checker' };

export const LAYOUTS: Record<PatternId, Layout> = {
  single: { nodes: { agent: { x: 90, y: 58, w: 120, label: 'One agent' } }, selfLoop: 'agent', height: 110 },
  pipeline: {
    nodes: {
      extract: { x: 0, y: 40, w: 64, label: 'Extract' },
      fetch: { x: 79, y: 40, w: 64, label: 'Fetch', code: true },
      draft: { x: 157, y: 40, w: 64, label: 'Draft' },
      polish: { x: 236, y: 40, w: 64, label: 'Polish' },
    },
    height: 110,
  },
  routing: {
    nodes: {
      router: { x: 0, y: 58, w: 70, label: 'Router' },
      orders: { x: 130, y: 58, w: 90, label: 'Orders' },
    },
    ghosts: [
      { x: 130, y: 8, w: 90, label: 'Billing' },
      { x: 130, y: 108, w: 90, label: 'Other' },
    ],
    ghostEdges: [['router', 0], ['router', 1]],
    height: 146,
  },
  parallel: {
    nodes: {
      b1: { x: 90, y: 4, w: 90, label: 'Branch 1' },
      b2: { x: 90, y: 54, w: 90, label: 'Branch 2' },
      b3: { x: 90, y: 104, w: 90, label: 'Branch 3' },
      writer: { x: 220, y: 54, w: 80, label: 'Writer' },
    },
    height: 142,
  },
  orchestrator: {
    nodes: {
      orch: { x: 90, y: 2, w: 120, label: 'Orchestrator' },
      w1: { x: 0, y: 78, w: 66, label: 'Worker 1' },
      w2: { x: 78, y: 78, w: 66, label: 'Worker 2' },
      w3: { x: 156, y: 78, w: 66, label: 'Worker 3' },
      wp: { x: 234, y: 78, w: 66, label: 'Policy' },
    },
    height: 116,
  },
  evaluator: {
    nodes: {
      fetch: { x: 0, y: 40, w: 70, label: 'Fetch', code: true },
      gen: { x: 115, y: 40, w: 70, label: 'Writer' },
      eval: { x: 230, y: 40, w: 70, label: 'Evaluator' },
    },
    height: 110,
  },
  handoff: {
    nodes: {
      triage: { x: 0, y: 40, w: 84, label: 'Triage' },
      orders: { x: 108, y: 40, w: 84, label: 'Orders' },
      refunds: { x: 216, y: 40, w: 84, label: 'Refunds' },
    },
    height: 110,
  },
};

/** The layout with the checker box added at the bottom when it is switched on. */
export function layoutFor(pattern: PatternId, checker: boolean): { nodes: Record<string, NodeBox>; ghosts: NodeBox[]; ghostEdges: [string, number][]; selfLoop?: string; height: number } {
  const base = LAYOUTS[pattern];
  if (!checker || pattern === 'evaluator') return { nodes: base.nodes, ghosts: base.ghosts ?? [], ghostEdges: base.ghostEdges ?? [], selfLoop: base.selfLoop, height: base.height };
  return {
    nodes: { ...base.nodes, checker: { ...CHECKER, y: base.height + 6 } },
    ghosts: base.ghosts ?? [],
    ghostEdges: base.ghostEdges ?? [],
    selfLoop: base.selfLoop,
    height: base.height + 6 + NODE_H + 4,
  };
}

/** How long, in simulated milliseconds, a message dot takes to cross an arrow. Purely visual. */
export const TRAVEL_MS = 900;

export interface Edge {
  key: string;
  from: string;
  to: string;
  /** Intervals during which a message is crossing this arrow. */
  windows: [number, number][];
}

/** The arrows of a run: one for every pair of lanes where a step waits on a step of another lane. */
export function edgesOf(run: Run, nodes: Record<string, NodeBox>): Edge[] {
  const byId = new Map(run.steps.map((s) => [s.id, s]));
  const map = new Map<string, Edge>();
  for (const s of run.steps) {
    for (const a of s.after) {
      const src = byId.get(a)!;
      if (src.actor === s.actor || !nodes[src.actor] || !nodes[s.actor]) continue;
      const key = `${src.actor}>${s.actor}`;
      const e = map.get(key) ?? { key, from: src.actor, to: s.actor, windows: [] };
      e.windows.push([src.end, src.end + TRAVEL_MS]);
      map.set(key, e);
    }
  }
  return [...map.values()];
}

export interface Geometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  head: string;
}

function clip(b: NodeBox, dx: number, dy: number): number {
  const hw = b.w / 2;
  const hh = NODE_H / 2;
  const tx = dx === 0 ? Infinity : hw / Math.abs(dx);
  const ty = dy === 0 ? Infinity : hh / Math.abs(dy);
  return Math.min(tx, ty);
}

/** A straight arrow between two boxes, trimmed to their edges. `offset` shifts it sideways so two opposite arrows do not overlap. */
export function geometry(a: NodeBox, b: NodeBox, offset = 0): Geometry {
  const ax = a.x + a.w / 2;
  const ay = a.y + NODE_H / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + NODE_H / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * offset;
  const ny = (dx / len) * offset;
  const ta = clip(a, dx, dy) + 2 / len;
  const tb = clip(b, dx, dy) + 3 / len;
  const x1 = ax + dx * ta + nx;
  const y1 = ay + dy * ta + ny;
  const x2 = bx - dx * tb + nx;
  const y2 = by - dy * tb + ny;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const p = (d: number) => `${(x2 - 6 * Math.cos(ang + d)).toFixed(1)} ${(y2 - 6 * Math.sin(ang + d)).toFixed(1)}`;
  return { x1, y1, x2, y2, head: `M ${p(0.5)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${p(-0.5)}` };
}
