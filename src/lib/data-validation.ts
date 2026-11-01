/**
 * A tiny invented stream of daily order batches with six planted faults, and six simple validation rules.
 * Everything here is made up for the lesson "Data pipelines and data quality": the shop, the numbers and
 * the faults are examples, chosen so that each rule type catches something and misses something.
 *
 * The table has four columns: amount (GBP), items (a whole number from 1 up), country (a short code) and
 * delivery_days (blank when the delivery date was not recorded). A "reference" taken from older, healthy
 * data says what a normal day looks like: about 120 rows, a mean amount near 42 and a spread of about 12.
 */

export const DAYS = 30;
export const REF = { rows: 120, amountMean: 42, amountSd: 12 };
export const COUNTRIES = ['UK', 'DE', 'FR', 'NL'] as const;

export interface Row {
  amount: number;
  items: number;
  country: string;
  deliveryDays: number | null;
}
export interface Batch {
  day: number;
  rows: Row[];
}

export type RuleId = 'range-amount' | 'range-items' | 'nulls' | 'categories' | 'rows' | 'mean-amount';

export interface Fault {
  id: string;
  label: string;
  /** First and last day (1-based, inclusive) on which the fault is present. */
  start: number;
  end: number;
  story: string;
  /** The rule types that are designed to notice this fault. */
  catchableBy: RuleId[];
}

export const FAULTS: Fault[] = [
  { id: 'outage', label: 'Feed outage', start: 4, end: 4, story: 'Only a handful of rows arrive on day 4 because an upstream export timed out.', catchableBy: ['rows'] },
  { id: 'sentinel', label: 'Error value in a column', start: 8, end: 9, story: 'A failed lookup writes -1 into items for about 15% of rows. -1 is a valid whole number, so a type check passes.', catchableBy: ['range-items'] },
  { id: 'units', label: 'Pounds became pence', start: 12, end: 13, story: 'A supplier starts sending amount in pence. Same column, same type, 100 times larger.', catchableBy: ['range-amount', 'mean-amount'] },
  { id: 'nulls', label: 'Failed join', start: 16, end: 17, story: 'A join to the delivery table fails, so about 35% of delivery_days values are blank instead of the usual 3%.', catchableBy: ['nulls'] },
  { id: 'category', label: 'New spelling', start: 20, end: 21, story: 'A new checkout sends "GB" for about 12% of rows, where every earlier row says "UK".', catchableBy: ['categories'] },
  { id: 'drift', label: 'Slow drift', start: 24, end: 30, story: 'Amounts creep up from day 24, reaching 18% above normal on day 30. Every single value looks plausible.', catchableBy: ['mean-amount'] },
];

export interface RuleConfig {
  enabled: boolean;
  /** Meaning depends on the rule; see RULES. */
  threshold: number;
}
export type Config = Record<RuleId, RuleConfig>;

export interface RuleInfo {
  id: RuleId;
  name: string;
  /** How the threshold is described. Empty when the rule has a fixed setting. */
  thresholdLabel: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  describe: (threshold: number) => string;
}

export const RULES: RuleInfo[] = [
  { id: 'rows', name: 'Row count', thresholdLabel: 'Fail below', unit: '% of the usual rows', min: 10, max: 100, step: 5, describe: (t) => `Fail if a day has fewer than ${t}% of the usual ${REF.rows} rows (${Math.ceil((t / 100) * REF.rows)}).` },
  { id: 'range-items', name: 'Range: items', thresholdLabel: '', unit: '', min: 0, max: 0, step: 1, describe: () => 'Fail if more than 1% of rows have items outside 1 to 10.' },
  { id: 'range-amount', name: 'Range: amount', thresholdLabel: 'Largest allowed', unit: 'GBP', min: 60, max: 600, step: 10, describe: (t) => `Fail if more than 1% of rows have amount below 0 or above ${t}.` },
  { id: 'nulls', name: 'Blank rate: delivery_days', thresholdLabel: 'Fail above', unit: '% blank', min: 1, max: 50, step: 1, describe: (t) => `Fail if more than ${t}% of delivery_days are blank.` },
  { id: 'categories', name: 'Allowed values: country', thresholdLabel: 'Fail above', unit: '% unseen', min: 0, max: 10, step: 0.5, describe: (t) => `Fail if more than ${t}% of rows have a country other than UK, DE, FR or NL.` },
  { id: 'mean-amount', name: 'Drift of the mean: amount', thresholdLabel: 'Fail beyond', unit: 'standard errors', min: 1, max: 10, step: 0.5, describe: (t) => `Fail if the day's mean amount is more than ${t} standard errors from ${REF.amountMean} (one standard error is ${REF.amountSd} divided by the square root of the row count).` },
];

export const DEFAULT_CONFIG: Config = {
  rows: { enabled: true, threshold: 50 },
  'range-items': { enabled: true, threshold: 0 },
  'range-amount': { enabled: true, threshold: 200 },
  nulls: { enabled: true, threshold: 10 },
  categories: { enabled: true, threshold: 1 },
  'mean-amount': { enabled: true, threshold: 4 },
};

export interface Preset {
  id: string;
  name: string;
  note: string;
  config: Config;
}

function withConfig(over: Partial<Record<RuleId, Partial<RuleConfig>>>): Config {
  const out = {} as Config;
  for (const r of RULES) out[r.id] = { ...DEFAULT_CONFIG[r.id], ...(over[r.id] ?? {}) };
  return out;
}

export const PRESETS: Preset[] = [
  { id: 'sensible', name: 'Sensible', note: 'Every rule on, with thresholds that leave room for normal wobble.', config: withConfig({}) },
  { id: 'loose', name: 'Too loose', note: 'Thresholds so wide that real faults pass: quiet, and not much use.', config: withConfig({ rows: { threshold: 10 }, 'range-amount': { threshold: 600 }, nulls: { threshold: 50 }, categories: { threshold: 10 }, 'mean-amount': { threshold: 10 } }) },
  { id: 'tight', name: 'Too tight', note: 'Thresholds so narrow that ordinary days raise alerts. This is how people learn to ignore them.', config: withConfig({ rows: { threshold: 95 }, 'range-amount': { threshold: 70 }, nulls: { threshold: 4 }, categories: { threshold: 0 }, 'mean-amount': { threshold: 1.5 } }) },
  { id: 'schema', name: 'Schema-style only', note: 'Range, blank and allowed-value checks, but nothing that looks at the distribution.', config: withConfig({ rows: { enabled: false }, 'mean-amount': { enabled: false } }) },
  { id: 'none', name: 'No rules', note: 'Nothing is checked. Every fault flows straight into training.', config: withConfig({ rows: { enabled: false }, 'range-items': { enabled: false }, 'range-amount': { enabled: false }, nulls: { enabled: false }, categories: { enabled: false }, 'mean-amount': { enabled: false } }) },
];

/* ---------- seeded randomness ---------- */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pick<T>(rand: () => number, values: readonly T[], weights: readonly number[]): T {
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < values.length; i++) {
    r -= weights[i];
    if (r < 0) return values[i];
  }
  return values[values.length - 1];
}

export function faultOn(day: number): Fault | undefined {
  return FAULTS.find((f) => day >= f.start && day <= f.end);
}

const ITEM_VALUES = [1, 2, 3, 4, 5, 6] as const;
const ITEM_WEIGHTS = [0.3, 0.3, 0.18, 0.1, 0.07, 0.05];
const COUNTRY_WEIGHTS = [0.6, 0.15, 0.15, 0.1];
const DELIVERY_VALUES = [1, 2, 3, 4, 5] as const;
const DELIVERY_WEIGHTS = [0.2, 0.35, 0.25, 0.12, 0.08];

/** Build the 30 days of batches for one seed. The same seed always gives the same stream. */
export function generateStream(seed: number): Batch[] {
  const rand = mulberry32(seed);
  const batches: Batch[] = [];
  for (let day = 1; day <= DAYS; day++) {
    const f = faultOn(day)?.id;
    const n = f === 'outage' ? 14 : Math.max(20, Math.round(REF.rows + 10 * normal(rand)));
    const rows: Row[] = [];
    for (let i = 0; i < n; i++) {
      let amount = Math.max(5, REF.amountMean + REF.amountSd * normal(rand));
      if (rand() < 0.015) amount *= 2.5; // an occasional big basket: real, rare and not a fault
      let items: number = pick(rand, ITEM_VALUES, ITEM_WEIGHTS);
      let country: string = pick(rand, COUNTRIES, COUNTRY_WEIGHTS);
      const nullP = f === 'nulls' ? 0.35 : 0.03;
      const deliveryDays: number | null = rand() < nullP ? null : pick(rand, DELIVERY_VALUES, DELIVERY_WEIGHTS);
      if (f === 'sentinel' && rand() < 0.15) items = -1;
      if (f === 'units') amount *= 100;
      if (f === 'category' && rand() < 0.12) country = 'GB';
      if (f === 'drift') amount *= 1 + (0.18 * (day - 23)) / 7;
      rows.push({ amount: Math.round(amount * 100) / 100, items, country, deliveryDays });
    }
    batches.push({ day, rows });
  }
  return batches;
}

/* ---------- statistics and rules ---------- */

export interface DayStats {
  rows: number;
  meanAmount: number;
  maxAmount: number;
  /** Share of rows with amount below 0 or above the configured limit; depends on the config. */
  amountOutShare: number;
  itemsOutShare: number;
  nullRate: number;
  unseenShare: number;
  /** Distance of the day's mean amount from the reference, in standard errors. */
  meanZ: number;
}

export function dayStats(b: Batch, amountLimit: number): DayStats {
  const n = b.rows.length;
  const share = (pred: (r: Row) => boolean) => (n === 0 ? 0 : b.rows.filter(pred).length / n);
  const mean = n === 0 ? 0 : b.rows.reduce((a, r) => a + r.amount, 0) / n;
  const se = REF.amountSd / Math.sqrt(Math.max(n, 1));
  return {
    rows: n,
    meanAmount: mean,
    maxAmount: b.rows.reduce((a, r) => Math.max(a, r.amount), 0),
    amountOutShare: share((r) => r.amount < 0 || r.amount > amountLimit),
    itemsOutShare: share((r) => r.items < 1 || r.items > 10),
    nullRate: share((r) => r.deliveryDays === null),
    unseenShare: share((r) => !(COUNTRIES as readonly string[]).includes(r.country)),
    meanZ: Math.abs(mean - REF.amountMean) / se,
  };
}

/** Which enabled rules fail on a day's batch. */
export function failedRules(b: Batch, cfg: Config): RuleId[] {
  const s = dayStats(b, cfg['range-amount'].threshold);
  const out: RuleId[] = [];
  if (cfg.rows.enabled && s.rows < (cfg.rows.threshold / 100) * REF.rows) out.push('rows');
  if (cfg['range-items'].enabled && s.itemsOutShare > 0.01) out.push('range-items');
  if (cfg['range-amount'].enabled && s.amountOutShare > 0.01) out.push('range-amount');
  if (cfg.nulls.enabled && s.nullRate > cfg.nulls.threshold / 100) out.push('nulls');
  if (cfg.categories.enabled && s.unseenShare > cfg.categories.threshold / 100) out.push('categories');
  if (cfg['mean-amount'].enabled && s.meanZ > cfg['mean-amount'].threshold) out.push('mean-amount');
  return out;
}

export interface FaultResult {
  fault: Fault;
  caught: boolean;
  /** First alert day inside the fault window, or null. */
  firstDay: number | null;
  /** Days from the start of the fault to the first alert; 0 means caught on the first day. */
  delay: number | null;
  /** Rules that failed on any day in the window. */
  by: RuleId[];
}

export interface Evaluation {
  perDay: { day: number; failed: RuleId[]; fault: string | null }[];
  perFault: FaultResult[];
  caught: number;
  /** Alert days on which no fault was present. */
  falseAlarmDays: number;
  cleanDays: number;
}

export function evaluate(batches: Batch[], cfg: Config): Evaluation {
  const perDay = batches.map((b) => ({ day: b.day, failed: failedRules(b, cfg), fault: faultOn(b.day)?.id ?? null }));
  const perFault: FaultResult[] = FAULTS.map((fault) => {
    const window = perDay.filter((d) => d.day >= fault.start && d.day <= fault.end);
    const alert = window.find((d) => d.failed.length > 0);
    const by = [...new Set(window.flatMap((d) => d.failed))];
    return { fault, caught: !!alert, firstDay: alert ? alert.day : null, delay: alert ? alert.day - fault.start : null, by };
  });
  const clean = perDay.filter((d) => d.fault === null);
  return {
    perDay,
    perFault,
    caught: perFault.filter((f) => f.caught).length,
    falseAlarmDays: clean.filter((d) => d.failed.length > 0).length,
    cleanDays: clean.length,
  };
}
