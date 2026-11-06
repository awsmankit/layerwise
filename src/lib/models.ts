/**
 * Pure functions behind the model radar page (src/pages/models/index.astro).
 * Every number the page shows (prices, costs, ages, positions, axis labels) is made here, so it can be tested.
 * Nothing in this file reads the clock: the page passes "today" in as an ISO date at build time.
 */
import type { Model, Modality, ModelStatus, Vendor } from '../data/models';

/* ---------- dates ---------- */

const DAY = 864e5;

function utc(iso: string): number {
  return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / DAY);
}

export type Freshness = 'fresh' | 'ageing' | 'stale';

/** How old a check is: fresh up to 30 days, ageing up to 90 days, stale after that. */
export function staleness(checkedOn: string, today: string): Freshness {
  const age = daysBetween(checkedOn, today);
  if (age <= 30) return 'fresh';
  if (age <= 90) return 'ageing';
  return 'stale';
}

export function freshnessLabel(f: Freshness): string {
  return f === 'fresh' ? 'Checked recently' : f === 'ageing' ? 'Check is ageing' : 'Check is stale';
}

/** "checked today", "checked 12 days ago" */
export function ageLabel(checkedOn: string, today: string): string {
  const d = Math.max(0, daysBetween(checkedOn, today));
  if (d === 0) return 'checked today';
  if (d === 1) return 'checked 1 day ago';
  return `checked ${d} days ago`;
}

/* ---------- prices ---------- */

export interface Rates {
  input: number;
  output: number;
  /** price of input served from the vendor's cache, when the vendor states one */
  cached?: number;
  /** a higher long-prompt price is in force */
  longContext: boolean;
  /** a price change announced for a later date is already in force */
  changed: boolean;
}

/** The list price in force on `today` for a prompt of `inTokens` tokens. Null when the vendor states no price. */
export function ratesFor(model: Model, inTokens = 0, today?: string): Rates | null {
  if (model.inputPerMTok == null || model.outputPerMTok == null) return null;
  let input = model.inputPerMTok;
  let output = model.outputPerMTok;
  let cached = model.cachedInputPerMTok;
  let changed = false;
  const pc = model.priceChange;
  if (pc && today && utc(today) >= utc(pc.from)) {
    input = pc.inputPerMTok;
    output = pc.outputPerMTok;
    cached = pc.cachedInputPerMTok ?? cached;
    changed = true;
  }
  let longContext = false;
  const lc = model.longContext;
  if (lc && inTokens > lc.aboveTokens && !changed) {
    input = lc.inputPerMTok;
    output = lc.outputPerMTok;
    cached = lc.cachedInputPerMTok ?? cached;
    longContext = true;
  }
  return { input, output, cached, longContext, changed };
}

export interface TaskCost {
  total: number;
  input: number;
  output: number;
  /** the cached share could be priced (the vendor states a cache price) */
  cachedApplied: boolean;
  longContext: boolean;
}

/** Layout numbers are rounded to two decimals: the server and the browser disagree in the last digits of a logarithm, which would break hydration. */
const r2 = (n: number) => Math.round(n * 100) / 100;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

/**
 * USD for one task: `inTokens` of prompt (a `cachedShare` fraction of it read from the cache) and `outTokens` of reply.
 * Null when the vendor states no price. If the vendor states no cache price, cached tokens are billed as ordinary input.
 */
export function taskCost(model: Model, inTokens: number, outTokens: number, cachedShare = 0, today?: string): TaskCost | null {
  const tin = Math.max(0, Number.isFinite(inTokens) ? inTokens : 0);
  const tout = Math.max(0, Number.isFinite(outTokens) ? outTokens : 0);
  const r = ratesFor(model, tin, today);
  if (!r) return null;
  const share = clamp(cachedShare, 0, 1);
  const cachedApplied = r.cached != null && share > 0;
  const cachedRate = r.cached ?? r.input;
  const input = ((tin * (1 - share)) / 1e6) * r.input + ((tin * share) / 1e6) * cachedRate;
  const output = (tout / 1e6) * r.output;
  return { total: input + output, input, output, cachedApplied, longContext: r.longContext };
}

/** Cost in USD of one task, or null when no price is stated. */
export function costPerTask(model: Model, inTokens: number, outTokens: number, cachedShare = 0, today?: string): number | null {
  return taskCost(model, inTokens, outTokens, cachedShare, today)?.total ?? null;
}

/** Does the prompt and the reply fit in the context window? Null when the window is not stated. */
export function fitsContext(model: Model, inTokens: number, outTokens: number): boolean | null {
  if (model.contextTokens == null) return null;
  return inTokens + outTokens <= model.contextTokens;
}

export interface TaskPreset {
  id: string;
  label: string;
  inTokens: number;
  outTokens: number;
  hint: string;
}

export const taskPresets: TaskPreset[] = [
  { id: 'chat', label: 'Chat answer', inTokens: 500, outTokens: 300, hint: 'A short question and a paragraph or two back.' },
  { id: 'rag', label: 'RAG answer', inTokens: 6000, outTokens: 500, hint: 'A question plus a handful of retrieved passages.' },
  { id: 'agent', label: 'Agent run', inTokens: 60000, outTokens: 8000, hint: 'Many tool calls in a loop: all the prompts and replies added up.' },
  { id: 'doc', label: 'Long document', inTokens: 180000, outTokens: 2000, hint: 'A long report or a code base read in one go, with a short summary back.' },
];

export type BarScale = 'linear' | 'log';

/** Bar length from 0 to 1. Log scale starts the bar at one hundredth of the largest cost. */
export function barFraction(cost: number, max: number, scale: BarScale): number {
  if (!(cost > 0) || !(max > 0)) return 0;
  if (scale === 'linear') return clamp(cost / max, 0, 1);
  const floor = max / 100;
  if (cost <= floor) return 0.02;
  return clamp(0.02 + (0.98 * Math.log10(cost / floor)) / Math.log10(max / floor), 0, 1);
}

/* ---------- sorting and filtering ---------- */

export type SortKey = 'newest' | 'name' | 'input' | 'output' | 'context';

export const sortLabels: Record<SortKey, string> = {
  newest: 'Newest release',
  name: 'Name',
  input: 'Lowest input price',
  output: 'Lowest output price',
  context: 'Longest context window',
};

/** A sorted copy. A model without the value being sorted on always goes last, and ties break on id so the order is stable. */
export function sortModels(list: readonly Model[], key: SortKey): Model[] {
  const num = (m: Model): number | undefined => (key === 'input' ? m.inputPerMTok : key === 'output' ? m.outputPerMTok : key === 'context' ? m.contextTokens : undefined);
  return [...list].sort((a, b) => {
    let c = 0;
    if (key === 'newest') c = b.releasedOn.localeCompare(a.releasedOn);
    else if (key === 'name') c = a.name.localeCompare(b.name);
    else {
      const x = num(a);
      const y = num(b);
      if (x == null && y == null) c = 0;
      else if (x == null) return 1;
      else if (y == null) return -1;
      else c = key === 'context' ? y - x : x - y;
    }
    return c || a.id.localeCompare(b.id);
  });
}

export interface ModelFilter {
  vendors?: readonly Vendor[];
  statuses?: readonly ModelStatus[];
  openWeights?: boolean;
  modality?: Modality;
  text?: string;
}

export function filterModels(list: readonly Model[], f: ModelFilter): Model[] {
  const q = f.text?.trim().toLowerCase();
  return list.filter((m) => {
    if (f.vendors?.length && !f.vendors.includes(m.vendor)) return false;
    if (f.statuses?.length && !f.statuses.includes(m.status)) return false;
    if (f.openWeights && !m.openWeights) return false;
    if (f.modality && !m.modalities.includes(f.modality)) return false;
    if (q && !`${m.name} ${m.vendor} ${m.family} ${m.apiId ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

/* ---------- formatting ---------- */

/** 1000000 -> "1M", 1048576 -> "1.05M", 256000 -> "256K", 65536 -> "65.5K" */
export function formatTokens(n: number): string {
  if (n >= 1e6) {
    const v = n / 1e6;
    return `${Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, '')}M`;
  }
  if (n >= 1e3) {
    const v = n / 1e3;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}K`;
  }
  return String(Math.round(n));
}

/** A list price per million tokens: "$10", "$0.50", "$0.075", "$0.003". */
export function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return '-';
  if (Number.isInteger(n)) return `$${n}`;
  let s = n.toFixed(3);
  if (s.endsWith('0')) s = s.slice(0, -1);
  return `$${s}`;
}

/** The cost of one task. More digits for small amounts so a cheap model does not read as free. */
export function formatCost(n: number): string {
  if (!Number.isFinite(n)) return '-';
  if (n === 0) return '$0';
  if (n >= 100) return `$${Math.round(n).toLocaleString('en-US')}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  if (n >= 0.0001) return `$${n.toFixed(4)}`;
  return '<$0.0001';
}

/** "Fable 5.1" from "Claude Fable 5.1": the vendor is already on the row. */
export function shortName(model: Model): string {
  return model.name.replace(/^Claude /, '').replace(/ \(preview\)$/, '');
}

export const statusLabels: Record<ModelStatus, string> = {
  available: 'Available',
  preview: 'Preview',
  deprecated: 'Deprecated',
  announced: 'Announced',
};

/* ---------- timeline layout ---------- */

export interface TimelineOptions {
  width: number;
  /** ISO date; the axis ends a few days after it */
  today: string;
  /** space left of the first date and right of the last, in px */
  padX?: number;
  /** space right of the last month, for the label of the newest marker */
  padRight?: number;
  /** pixels the dot of one model needs, plus its label when `labels` is set */
  dotGap?: number;
  labels?: boolean;
  /** approximate width of one label character, in px */
  charWidth?: number;
  laneHeight?: number;
  /** height of the vendor's title line above its lanes */
  titleHeight?: number;
  rowGap?: number;
  axisHeight?: number;
}

export interface TimelineDot {
  id: string;
  x: number;
  y: number;
  lane: number;
}
export interface TimelineRow {
  vendor: Vendor;
  /** top of the row, including its title line */
  y: number;
  height: number;
  dots: TimelineDot[];
}
export interface TimelineTick {
  x: number;
  label: string;
}
export interface Timeline {
  width: number;
  height: number;
  axisY: number;
  /** x of the day the page was built, a thin marker line on the chart */
  todayX: number;
  start: string;
  end: string;
  rows: TimelineRow[];
  ticks: TimelineTick[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}
function addMonths(iso: string, n: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, '0')}-01`;
}

/**
 * Where each model's dot goes on a release timeline: one row per vendor (in `vendorOrder`), time running left to right,
 * dots that would collide pushed to another lane inside the row. Month ticks are thinned so labels never touch.
 */
export function timelineLayout(list: readonly Model[], vendorOrder: readonly Vendor[], o: TimelineOptions): Timeline {
  const padX = o.padX ?? 14;
  const padRight = o.padRight ?? padX;
  const dotGap = o.dotGap ?? 22;
  const charWidth = o.charWidth ?? 6.4;
  const laneH = o.laneHeight ?? 26;
  const titleH = o.titleHeight ?? 22;
  const rowGap = o.rowGap ?? 10;
  const axisH = o.axisHeight ?? 30;

  const dates = list.map((m) => m.releasedOn);
  const earliest = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : o.today;
  const start = monthStart(earliest);
  const last = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : o.today;
  const endBasis = last > o.today ? last : o.today;
  const end = addMonths(monthStart(endBasis), 1);
  const span = Math.max(1, daysBetween(start, end));
  const plotW = Math.max(1, o.width - padX - padRight);
  const xOf = (iso: string) => r2(padX + (daysBetween(start, iso) / span) * plotW);

  const rows: TimelineRow[] = [];
  let y = 0;
  for (const vendor of vendorOrder) {
    const mine = list.filter((m) => m.vendor === vendor).sort((a, b) => a.releasedOn.localeCompare(b.releasedOn) || a.id.localeCompare(b.id));
    if (!mine.length) continue;
    const laneEnds: number[] = [];
    const dots: TimelineDot[] = mine.map((m) => {
      const x = xOf(m.releasedOn);
      const need = dotGap + (o.labels ? (m.name.replace(/^Claude /, '').length + 1) * charWidth : 0);
      let lane = laneEnds.findIndex((end) => x >= end);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = x + need;
      return { id: m.id, x, y: 0, lane };
    });
    const lanes = Math.max(1, laneEnds.length);
    const height = titleH + lanes * laneH;
    for (const d of dots) d.y = r2(y + titleH + d.lane * laneH + laneH / 2);
    rows.push({ vendor, y, height, dots });
    y += height + rowGap;
  }
  const axisY = y;

  // month ticks, thinned to a whole number of months so the labels are at least ~54px apart
  const months = Math.max(1, Math.round(span / 30.4));
  const monthPx = plotW / months;
  const step = Math.max(1, Math.ceil(54 / monthPx));
  const ticks: TimelineTick[] = [];
  for (let i = 0, d = start; daysBetween(d, end) >= 0; i++, d = addMonths(start, i)) {
    if (i % step) continue;
    const mo = Number(d.slice(5, 7)) - 1;
    ticks.push({ x: xOf(d), label: mo === 0 || i === 0 ? `${MONTHS[mo]} ${d.slice(0, 4)}` : MONTHS[mo] });
  }
  return { width: o.width, height: axisY + axisH, axisY, todayX: xOf(o.today), start, end, rows, ticks };
}

/* ---------- scatter: price against context window, both on log axes ---------- */

export type PriceKind = 'input' | 'output';

export interface LogAxis {
  min: number;
  max: number;
  ticks: number[];
}

/** A log axis that holds every value, with 1-2-5 ticks. */
export function logAxis(values: readonly number[]): LogAxis {
  const v = values.filter((x) => x > 0);
  if (!v.length) return { min: 1, max: 10, ticks: [1, 10] };
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const base = (x: number, up: boolean) => {
    const e = Math.floor(Math.log10(x));
    const f = x / 10 ** e;
    const steps = [1, 2, 5, 10];
    const pick = up ? steps.find((s) => s >= f - 1e-9) ?? 10 : [...steps].reverse().find((s) => s <= f + 1e-9) ?? 1;
    return pick * 10 ** e;
  };
  let min = base(lo, false);
  let max = base(hi, true);
  if (max <= min) max = min * 10;
  const ticks: number[] = [];
  for (let e = Math.floor(Math.log10(min)); 10 ** e <= max * 1.0001; e++) {
    for (const s of [1, 2, 5]) {
      const t = s * 10 ** e;
      if (t >= min * 0.9999 && t <= max * 1.0001) ticks.push(Number(t.toPrecision(3)));
    }
  }
  min = Number(min.toPrecision(3));
  max = Number(max.toPrecision(3));
  return { min, max, ticks };
}

export interface ScatterPoint {
  id: string;
  /** true position */
  x: number;
  y: number;
  /** drawn position after nudging overlapping dots apart */
  dx: number;
  dy: number;
  context: number;
  price: number;
}
export interface Scatter {
  points: ScatterPoint[];
  xAxis: LogAxis;
  yAxis: LogAxis;
  /** models with no stated context window or price, which cannot be placed */
  left: string[];
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
}

export interface ScatterOptions {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  kind: PriceKind;
  today: string;
  minDistance?: number;
}

/**
 * Places each model with a stated context window and price on log axes (context across, price up).
 * Dots that land closer than `minDistance` px are pushed apart in a fixed order, so the picture is the same on every render.
 */
export function scatterLayout(list: readonly Model[], o: ScatterOptions): Scatter {
  const placed: { m: Model; context: number; price: number }[] = [];
  const left: string[] = [];
  for (const m of list) {
    const r = ratesFor(m, 0, o.today);
    const price = r ? (o.kind === 'input' ? r.input : r.output) : undefined;
    if (m.contextTokens && price && price > 0) placed.push({ m, context: m.contextTokens, price });
    else left.push(m.id);
  }
  const xAxis = logAxis(placed.map((p) => p.context));
  const yAxis = logAxis(placed.map((p) => p.price));
  const w = o.width - o.padLeft - o.padRight;
  const h = o.height - o.padTop - o.padBottom;
  const fx = (v: number) => r2(o.padLeft + (Math.log10(v / xAxis.min) / Math.log10(xAxis.max / xAxis.min)) * w);
  const fy = (v: number) => r2(o.padTop + h - (Math.log10(v / yAxis.min) / Math.log10(yAxis.max / yAxis.min)) * h);

  const points: ScatterPoint[] = placed
    .map((p) => ({ id: p.m.id, x: fx(p.context), y: fy(p.price), dx: fx(p.context), dy: fy(p.price), context: p.context, price: p.price }))
    .sort((a, b) => a.price - b.price || a.context - b.context || a.id.localeCompare(b.id));

  const minD = o.minDistance ?? 16;
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        let vx = b.dx - a.dx;
        let vy = b.dy - a.dy;
        let d = Math.hypot(vx, vy);
        if (d >= minD) continue;
        if (d < 0.01) {
          // exactly on top of each other: split sideways by a fixed rule
          vx = 1;
          vy = 0;
          d = 1;
        }
        const push = (minD - d) / 2 + 0.01;
        a.dx -= (vx / d) * push;
        a.dy -= (vy / d) * push;
        b.dx += (vx / d) * push;
        b.dy += (vy / d) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  for (const p of points) {
    p.dx = r2(Math.min(o.width - o.padRight, Math.max(o.padLeft, p.dx)));
    p.dy = r2(Math.min(o.padTop + h, Math.max(o.padTop, p.dy)));
  }
  return {
    points,
    xAxis,
    yAxis,
    left,
    xTicks: xAxis.ticks.map((t) => ({ x: fx(t), label: formatTokens(t) })),
    yTicks: yAxis.ticks.map((t) => ({ y: fy(t), label: formatPrice(t) })),
  };
}
