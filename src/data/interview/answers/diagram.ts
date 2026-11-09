import type { DiagramSpec } from './types';

/** Plain-text description of a diagram, for screen readers and for anyone who cannot see the picture. */
export function diagramAlt(d: DiagramSpec): string {
  switch (d.kind) {
    case 'flow': {
      const steps = d.nodes.map((n, i) => `${i + 1}. ${n.label}${n.sub ? `: ${n.sub}` : ''}`).join(' ');
      const hot = d.highlight?.length ? ` Highlighted: ${d.highlight.map((id) => d.nodes.find((n) => n.id === id)?.label ?? id).join(', ')}.` : '';
      const extra = d.edges && !isChain(d) ? ` Links: ${d.edges.map(([a, b]) => `${labelOf(d, a)} to ${labelOf(d, b)}`).join('; ')}.` : '';
      return `Flow diagram. ${d.caption} Steps in order: ${steps}${hot}${extra}`;
    }
    case 'compare': {
      const rows = d.rows.map((r) => `${r.label}: ${r.cells.map((c, i) => `${d.columns[i]} ${c}`).join('; ')}`).join('. ');
      return `Comparison table. ${d.caption} Columns: ${d.columns.join(', ')}. ${rows}.`;
    }
    case 'bars': {
      const items = d.items.map((i) => `${i.label} ${fmt(i.value)} ${d.unit}${i.note ? ` (${i.note})` : ''}`).join('; ');
      return `Bar chart in ${d.unit}. ${d.caption} ${items}.`;
    }
    case 'layers':
      return `Stack of layers, top to bottom. ${d.caption} ${d.layers.map((l, i) => `${i + 1}. ${l.label}${l.sub ? `: ${l.sub}` : ''}`).join(' ')}`;
    case 'timeline':
      return `Timeline. ${d.caption} ${d.steps.map((s, i) => `${i + 1}. ${s.label}: ${s.detail}`).join(' ')}`;
    case 'curve': {
      const first = d.points[0];
      const last = d.points[d.points.length - 1];
      const marks = d.marks?.length ? ` Marked: ${d.marks.map((m) => `${m.label} at ${d.xLabel} ${fmt(m.x)}`).join('; ')}.` : '';
      const pts = d.points.map(([x, y]) => `${fmt(x)} gives ${fmt(y)}`).join('; ');
      return `Line chart of ${d.yLabel} against ${d.xLabel}. ${d.caption} It starts at ${fmt(first[1])} and ends at ${fmt(last[1])}. Points: ${pts}.${marks}`;
    }
    case 'experiment':
      return `Interactive experiment: ${d.slug.replace(/-/g, ' ')}.${d.caption ? ` ${d.caption}` : ''}`;
  }
}

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-US') : String(Math.round(n * 1000) / 1000));
const labelOf = (d: Extract<DiagramSpec, { kind: 'flow' }>, id: string) => d.nodes.find((n) => n.id === id)?.label ?? id;

/** True when the edges are exactly "each node feeds the next". */
export function isChain(d: Extract<DiagramSpec, { kind: 'flow' }>): boolean {
  if (!d.edges) return true;
  if (d.edges.length !== d.nodes.length - 1) return false;
  return d.edges.every(([a, b], i) => a === d.nodes[i].id && b === d.nodes[i + 1].id);
}

/** Everything wrong with a diagram spec, as sentences. Empty when it is fine. `slugs` is the set of experiments that exist. */
export function diagramProblems(d: DiagramSpec, slugs: Set<string>): string[] {
  const out: string[] = [];
  const text = (s: string, what: string) => {
    if (!s || !s.trim()) out.push(`${what} is empty`);
  };
  if (d.kind !== 'experiment') text(d.caption, 'caption');
  switch (d.kind) {
    case 'flow': {
      if (d.nodes.length < 2 || d.nodes.length > 8) out.push('a flow needs 2 to 8 nodes');
      const ids = d.nodes.map((n) => n.id);
      if (new Set(ids).size !== ids.length) out.push('flow node ids are not unique');
      if (new Set(d.nodes.map((n) => n.label)).size !== ids.length) out.push('flow node labels are not unique');
      for (const n of d.nodes) {
        text(n.id, 'node id');
        text(n.label, 'node label');
      }
      for (const [a, b] of d.edges ?? []) if (!ids.includes(a) || !ids.includes(b)) out.push(`edge ${a} -> ${b} refers to a node that does not exist`);
      for (const h of d.highlight ?? []) if (!ids.includes(h)) out.push(`highlight ${h} is not a node`);
      break;
    }
    case 'compare': {
      if (d.columns.length < 2 || d.columns.length > 4) out.push('a comparison needs 2 to 4 columns');
      if (d.rows.length < 2 || d.rows.length > 7) out.push('a comparison needs 2 to 7 rows');
      for (const r of d.rows) {
        text(r.label, 'row label');
        if (r.cells.length !== d.columns.length) out.push(`row "${r.label}" has ${r.cells.length} cells for ${d.columns.length} columns`);
        for (const c of r.cells) text(c, `a cell in "${r.label}"`);
      }
      break;
    }
    case 'bars': {
      text(d.unit, 'unit');
      if (d.items.length < 2 || d.items.length > 8) out.push('bars need 2 to 8 items');
      if (new Set(d.items.map((i) => i.label)).size !== d.items.length) out.push('bar labels are not unique');
      for (const i of d.items) {
        text(i.label, 'bar label');
        if (!Number.isFinite(i.value) || i.value < 0) out.push(`bar "${i.label}" needs a value of zero or more`);
      }
      if (d.items.every((i) => i.value === 0)) out.push('every bar is zero');
      break;
    }
    case 'layers': {
      if (d.layers.length < 2 || d.layers.length > 8) out.push('a stack needs 2 to 8 layers');
      for (const l of d.layers) text(l.label, 'layer label');
      break;
    }
    case 'timeline': {
      if (d.steps.length < 2 || d.steps.length > 8) out.push('a timeline needs 2 to 8 steps');
      for (const s of d.steps) {
        text(s.label, 'step label');
        text(s.detail, `detail of "${s.label}"`);
      }
      break;
    }
    case 'curve': {
      text(d.xLabel, 'x label');
      text(d.yLabel, 'y label');
      if (d.points.length < 3) out.push('a curve needs at least 3 points');
      for (let i = 0; i < d.points.length; i++) {
        const [x, y] = d.points[i];
        if (!Number.isFinite(x) || !Number.isFinite(y)) out.push(`point ${i} is not a number`);
        if (i > 0 && x <= d.points[i - 1][0]) out.push('curve points must go left to right (x increasing)');
      }
      const xs = d.points.map((p) => p[0]);
      for (const m of d.marks ?? []) {
        text(m.label, 'mark label');
        if (m.x < Math.min(...xs) || m.x > Math.max(...xs)) out.push(`mark "${m.label}" is outside the x range`);
      }
      break;
    }
    case 'experiment':
      if (!slugs.has(d.slug)) out.push(`experiment "${d.slug}" does not exist`);
      break;
  }
  return out;
}
