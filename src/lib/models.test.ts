import { describe, expect, it } from 'vitest';
import { models, vendors, type Model } from '../data/models';
import {
  ageLabel,
  barFraction,
  costPerTask,
  daysBetween,
  filterModels,
  fitsContext,
  formatCost,
  formatPrice,
  formatTokens,
  logAxis,
  ratesFor,
  scatterLayout,
  shortName,
  sortModels,
  staleness,
  taskCost,
  taskPresets,
  timelineLayout,
} from './models';

const base: Model = {
  id: 't',
  vendor: 'Anthropic',
  name: 'Claude Test',
  family: 'Test',
  releasedOn: '2026-01-01',
  status: 'available',
  modalities: ['text'],
  openWeights: false,
  sources: [{ label: 'x', url: 'https://platform.claude.com/' }],
  checkedOn: '2026-01-01',
  inputPerMTok: 2,
  outputPerMTok: 10,
  cachedInputPerMTok: 0.2,
};
const byId = (id: string) => models.find((m) => m.id === id)!;

describe('dates and freshness', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-11-01', '2026-11-06')).toBe(5);
    expect(daysBetween('2026-11-06', '2026-11-01')).toBe(-5);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('is fresh to 30 days, ageing to 90, stale after', () => {
    expect(staleness('2026-11-06', '2026-11-06')).toBe('fresh');
    expect(staleness('2026-10-07', '2026-11-06')).toBe('fresh'); // 30 days
    expect(staleness('2026-10-06', '2026-11-06')).toBe('ageing'); // 31 days
    expect(staleness('2026-08-08', '2026-11-06')).toBe('ageing'); // 90 days
    expect(staleness('2026-08-07', '2026-11-06')).toBe('stale'); // 91 days
    expect(staleness('2027-01-01', '2026-11-06')).toBe('fresh'); // a date after today is not stale
  });

  it('words the age', () => {
    expect(ageLabel('2026-11-06', '2026-11-06')).toBe('checked today');
    expect(ageLabel('2026-11-05', '2026-11-06')).toBe('checked 1 day ago');
    expect(ageLabel('2026-10-27', '2026-11-06')).toBe('checked 10 days ago');
  });
});

describe('costPerTask', () => {
  it('prices input and output per million tokens', () => {
    // 1,000 in at $2/M plus 500 out at $10/M
    expect(costPerTask(base, 1000, 500)).toBeCloseTo(0.002 + 0.005, 10);
    expect(costPerTask(base, 0, 0)).toBe(0);
    expect(costPerTask(base, 1_000_000, 0)).toBeCloseTo(2, 10);
  });

  it('prices the cached share of the input at the cache rate', () => {
    // 10,000 in, half cached: 5,000 at $2/M + 5,000 at $0.20/M
    expect(costPerTask(base, 10_000, 0, 0.5)).toBeCloseTo(0.01 + 0.001, 10);
    const t = taskCost(base, 10_000, 0, 0.5)!;
    expect(t.cachedApplied).toBe(true);
  });

  it('bills cached tokens as ordinary input when the vendor states no cache price', () => {
    const noCache = { ...base, cachedInputPerMTok: undefined };
    expect(costPerTask(noCache, 10_000, 0, 0.9)).toBeCloseTo(0.02, 10);
    expect(taskCost(noCache, 10_000, 0, 0.9)!.cachedApplied).toBe(false);
  });

  it('keeps the cached share between 0 and 1 and ignores nonsense', () => {
    expect(costPerTask(base, 1000, 0, 5)).toBe(costPerTask(base, 1000, 0, 1));
    expect(costPerTask(base, 1000, 0, -1)).toBe(costPerTask(base, 1000, 0, 0));
    expect(costPerTask(base, -50, -50)).toBe(0);
    expect(costPerTask(base, Number.NaN, 100)).toBeCloseTo(0.001, 10);
  });

  it('returns null when the vendor states no price', () => {
    expect(costPerTask(byId('gemini-4-carbon'), 1000, 1000)).toBeNull();
    expect(costPerTask(byId('gemma-4-31b'), 1000, 1000)).toBeNull();
  });

  it('switches to the long-prompt price above the threshold, for the whole request', () => {
    const haiku = byId('claude-haiku-5-5');
    expect(ratesFor(haiku, 100_000)!.longContext).toBe(false);
    expect(ratesFor(haiku, 100_001)!.longContext).toBe(true);
    // 150,000 in at $0.50/M + 2,000 out at $2.50/M
    expect(costPerTask(haiku, 150_000, 2000)).toBeCloseTo(0.075 + 0.005, 10);
    expect(costPerTask(haiku, 90_000, 2000)).toBeCloseTo(0.009 + 0.001, 10);
  });

  it('applies a price change only from its date', () => {
    const argon = byId('gemini-4-argon');
    expect(ratesFor(argon, 0, '2026-11-30')!.input).toBe(2);
    expect(ratesFor(argon, 0, '2026-12-01')!.input).toBe(4);
    expect(ratesFor(argon, 0, '2026-12-01')!.changed).toBe(true);
    expect(costPerTask(argon, 1_000_000, 100_000, 0, '2026-11-06')).toBeCloseTo(2 + 1, 10);
    expect(costPerTask(argon, 1_000_000, 100_000, 0, '2026-12-01')).toBeCloseTo(4 + 2, 10);
    expect(ratesFor(argon)!.input).toBe(2); // no date given: the current list price
  });

  it('gives a cheaper task for a cheaper model on the same tokens, for every preset', () => {
    const luna = byId('gpt-6-luna');
    const astra = byId('gpt-6-astra');
    for (const p of taskPresets) expect(costPerTask(luna, p.inTokens, p.outTokens)!).toBeLessThan(costPerTask(astra, p.inTokens, p.outTokens)!);
  });

  it('prices every listed model that states a price, for every preset, as a positive finite number', () => {
    for (const m of models) {
      for (const p of taskPresets) {
        const c = costPerTask(m, p.inTokens, p.outTokens, 0, '2026-11-06');
        if (m.inputPerMTok == null) expect(c, m.id).toBeNull();
        else {
          expect(Number.isFinite(c!), m.id).toBe(true);
          expect(c!, m.id).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('context fit', () => {
  it('compares prompt plus reply with the window', () => {
    const m = { ...base, contextTokens: 100_000 };
    expect(fitsContext(m, 90_000, 10_000)).toBe(true);
    expect(fitsContext(m, 90_000, 10_001)).toBe(false);
    expect(fitsContext(base, 1, 1)).toBeNull();
  });
});

describe('bars', () => {
  it('scales linearly and on a log scale', () => {
    expect(barFraction(5, 10, 'linear')).toBe(0.5);
    expect(barFraction(10, 10, 'log')).toBe(1);
    expect(barFraction(0.1, 10, 'log')).toBeCloseTo(0.02, 5);
    expect(barFraction(1, 10, 'log')).toBeGreaterThan(barFraction(0.5, 10, 'log'));
    expect(barFraction(0, 10, 'linear')).toBe(0);
    expect(barFraction(5, 0, 'linear')).toBe(0);
  });
});

describe('sorting and filtering', () => {
  it('sorts newest first, breaking ties on id', () => {
    const ids = sortModels(models, 'newest').map((m) => m.releasedOn);
    expect([...ids].sort().reverse()).toEqual(ids);
    const twin = [{ ...base, id: 'b' }, { ...base, id: 'a' }];
    expect(sortModels(twin, 'newest').map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('sorts by price with unpriced models last, and does not change the input', () => {
    const copy = [...models];
    const out = sortModels(models, 'input');
    expect(models).toEqual(copy);
    const priced = out.filter((m) => m.inputPerMTok != null).map((m) => m.inputPerMTok!);
    expect([...priced].sort((a, b) => a - b)).toEqual(priced);
    const firstUnpriced = out.findIndex((m) => m.inputPerMTok == null);
    expect(out.slice(firstUnpriced).every((m) => m.inputPerMTok == null)).toBe(true);
  });

  it('sorts by longest context, unknown last', () => {
    const out = sortModels(models, 'context');
    const known = out.filter((m) => m.contextTokens != null).map((m) => m.contextTokens!);
    expect([...known].sort((a, b) => b - a)).toEqual(known);
    expect(out[out.length - 1].contextTokens).toBeUndefined();
  });

  it('filters by vendor, status, open weights, input type and text', () => {
    expect(filterModels(models, { vendors: ['Anthropic'] }).every((m) => m.vendor === 'Anthropic')).toBe(true);
    expect(filterModels(models, { vendors: ['Anthropic'] })).toHaveLength(4);
    expect(filterModels(models, { statuses: ['announced'] }).map((m) => m.id)).toEqual(['gemini-4-carbon']);
    expect(filterModels(models, { openWeights: true }).every((m) => m.openWeights)).toBe(true);
    expect(filterModels(models, { modality: 'audio' }).every((m) => m.modalities.includes('audio'))).toBe(true);
    expect(filterModels(models, { text: ' ASTRA ' }).map((m) => m.id)).toEqual(['gpt-6-astra']);
    expect(filterModels(models, {})).toHaveLength(models.length);
    expect(filterModels(models, { text: 'no such model' })).toHaveLength(0);
  });
});

describe('formatting', () => {
  it('formats token counts', () => {
    expect(formatTokens(1_000_000)).toBe('1M');
    expect(formatTokens(1_048_576)).toBe('1.05M');
    expect(formatTokens(1_050_000)).toBe('1.05M');
    expect(formatTokens(256_000)).toBe('256K');
    expect(formatTokens(65_536)).toBe('65.5K');
    expect(formatTokens(128_000)).toBe('128K');
    expect(formatTokens(500)).toBe('500');
  });

  it('formats list prices', () => {
    expect(formatPrice(10)).toBe('$10');
    expect(formatPrice(0.5)).toBe('$0.50');
    expect(formatPrice(0.1)).toBe('$0.10');
    expect(formatPrice(0.075)).toBe('$0.075');
    expect(formatPrice(0.003)).toBe('$0.003');
    expect(formatPrice(1.32)).toBe('$1.32');
    expect(formatPrice(2.5)).toBe('$2.50');
  });

  it('formats a task cost with enough digits to tell cheap from free', () => {
    expect(formatCost(0)).toBe('$0');
    expect(formatCost(12.345)).toBe('$12.35');
    expect(formatCost(0.0504)).toBe('$0.050');
    expect(formatCost(0.00036)).toBe('$0.0004');
    expect(formatCost(0.00000001)).toBe('<$0.0001');
    expect(formatCost(1234.5)).toBe('$1,235');
  });

  it('shortens a name', () => {
    expect(shortName(byId('claude-fable-5-1'))).toBe('Fable 5.1');
    expect(shortName(byId('gemini-3-1-pro-preview'))).toBe('Gemini 3.1 Pro');
    expect(shortName(byId('gpt-6-astra'))).toBe('GPT-6 Astra');
  });
});

describe('timelineLayout', () => {
  const t = timelineLayout(models, vendors, { width: 700, today: '2026-11-06' });

  it('gives each vendor with a model a row, in the given order, without overlap', () => {
    expect(t.rows.map((r) => r.vendor)).toEqual(vendors);
    for (let i = 1; i < t.rows.length; i++) expect(t.rows[i].y).toBeGreaterThanOrEqual(t.rows[i - 1].y + t.rows[i - 1].height);
    expect(t.axisY).toBeGreaterThanOrEqual(t.rows[t.rows.length - 1].y + t.rows[t.rows.length - 1].height);
    expect(t.height).toBeGreaterThan(t.axisY);
  });

  it('puts every model on the chart, inside the width, newer to the right', () => {
    const dots = t.rows.flatMap((r) => r.dots);
    expect(dots).toHaveLength(models.length);
    for (const d of dots) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(t.width);
    }
    const x = (id: string) => dots.find((d) => d.id === id)!.x;
    expect(x('gpt-6-1-terra')).toBeGreaterThan(x('gpt-6-astra'));
    expect(x('claude-haiku-5-5')).toBeGreaterThan(x('claude-fable-5-1'));
  });

  it('keeps dots in the same lane at least a dot-gap apart, and uses lanes for the crowd', () => {
    for (const r of t.rows) {
      const lanes = new Map<number, number[]>();
      for (const d of r.dots) lanes.set(d.lane, [...(lanes.get(d.lane) ?? []), d.x]);
      for (const xs of lanes.values()) {
        xs.sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(22 - 1e-9);
      }
    }
    const narrow = timelineLayout(models, vendors, { width: 320, today: '2026-11-06' });
    expect(narrow.rows.flatMap((r) => r.dots).every((d) => d.y >= 0)).toBe(true);
    expect(narrow.height).toBeGreaterThanOrEqual(t.height);
  });

  it('thins month ticks so labels are at least ~54px apart, and starts on a month', () => {
    for (const w of [320, 700, 1100]) {
      const tl = timelineLayout(models, vendors, { width: w, today: '2026-11-06' });
      expect(tl.start.endsWith('-01')).toBe(true);
      for (let i = 1; i < tl.ticks.length; i++) expect(tl.ticks[i].x - tl.ticks[i - 1].x).toBeGreaterThanOrEqual(53);
      expect(tl.ticks.length).toBeGreaterThan(1);
    }
  });

  it('is the same every time (no clock, no randomness)', () => {
    expect(timelineLayout(models, vendors, { width: 700, today: '2026-11-06' })).toEqual(t);
  });

  it('handles an empty list', () => {
    const e = timelineLayout([], vendors, { width: 300, today: '2026-11-06' });
    expect(e.rows).toEqual([]);
    expect(e.height).toBeGreaterThan(0);
  });
});

describe('logAxis and scatterLayout', () => {
  it('holds every value and ticks at 1, 2 and 5', () => {
    const a = logAxis([0.1, 50]);
    expect(a.min).toBeLessThanOrEqual(0.1);
    expect(a.max).toBeGreaterThanOrEqual(50);
    expect(a.ticks).toContain(1);
    expect(a.ticks).toContain(10);
    expect(a.ticks).toContain(0.2);
    expect(logAxis([]).ticks.length).toBeGreaterThan(0);
    const c = logAxis([256_000, 1_050_000]);
    expect(c.min).toBeLessThanOrEqual(256_000);
    expect(c.max).toBeGreaterThanOrEqual(1_050_000);
  });

  const opts = { width: 700, height: 360, padLeft: 56, padRight: 16, padTop: 14, padBottom: 40, kind: 'output' as const, today: '2026-11-06' };
  const s = scatterLayout(models, opts);

  it('places only models with both a context window and a price, and lists the rest', () => {
    expect(s.left.sort()).toEqual(['gemini-4-carbon', 'gemma-4-31b']);
    expect(s.points).toHaveLength(models.length - 2);
  });

  it('puts a dearer model higher and a longer window further right', () => {
    const p = (id: string) => s.points.find((q) => q.id === id)!;
    expect(p('claude-fable-5-1').y).toBeLessThan(p('claude-haiku-5-5').y); // smaller y is higher on screen
    expect(p('gpt-6-astra').x).toBeGreaterThan(p('mistral-small-4').x);
  });

  it('keeps drawn dots inside the plot and apart', () => {
    for (const q of s.points) {
      expect(q.dx).toBeGreaterThanOrEqual(opts.padLeft);
      expect(q.dx).toBeLessThanOrEqual(opts.width - opts.padRight);
      expect(q.dy).toBeGreaterThanOrEqual(opts.padTop);
      expect(q.dy).toBeLessThanOrEqual(opts.height - opts.padBottom);
    }
    let close = 0;
    for (let i = 0; i < s.points.length; i++) for (let j = i + 1; j < s.points.length; j++) if (Math.hypot(s.points[i].dx - s.points[j].dx, s.points[i].dy - s.points[j].dy) < 10) close++;
    expect(close).toBe(0);
  });

  it('uses the price in force on the given day', () => {
    const before = scatterLayout(models, { ...opts, today: '2026-11-06' }).points.find((q) => q.id === 'gemini-4-argon')!;
    const after = scatterLayout(models, { ...opts, today: '2026-12-02' }).points.find((q) => q.id === 'gemini-4-argon')!;
    expect(before.price).toBe(10);
    expect(after.price).toBe(20);
  });

  it('switches between input and output price', () => {
    const inp = scatterLayout(models, { ...opts, kind: 'input' }).points.find((q) => q.id === 'gpt-6-astra')!;
    expect(inp.price).toBe(10);
  });

  it('is the same every time', () => {
    expect(scatterLayout(models, opts)).toEqual(s);
  });

  it('labels ticks with the same formatting as the cards', () => {
    expect(s.xTicks.every((t) => /^\d+(\.\d+)?[KM]$/.test(t.label))).toBe(true);
    expect(s.yTicks.every((t) => t.label.startsWith('$'))).toBe(true);
  });
});
