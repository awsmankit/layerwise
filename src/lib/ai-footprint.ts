/*
 * Arithmetic for the footprint calculator in responsible/energy-and-water-of-ai.
 *
 * Nothing here is a measurement. Every input is a range taken from a published source (named in
 * the PRESETS and in the lesson), and every output is a range: the low end combines the low
 * inputs, the high end combines the high inputs, and the "middle" is the geometric midpoint of
 * the two ends (a reference point inside the range, not a best estimate).
 */

export type Range = { low: number; mid: number; high: number };

/** The geometric midpoint of two positive numbers: the centre of the range on a log scale. */
export const geoMid = (low: number, high: number) => Math.sqrt(low * high);

export const range = (low: number, high: number): Range => ({ low, mid: geoMid(low, high), high });

export type RequestKind = {
  id: string;
  label: string;
  /** Watt-hours per request: low and high ends of what the sources report. */
  wh: [number, number];
  /** What the numbers count, in one sentence. */
  boundary: string;
  /** Where the ends come from. */
  source: string;
};

/** Published per-request energy ranges. Dates are when the source was published. */
export const KINDS: RequestKind[] = [
  {
    id: 'text',
    label: 'A short text reply',
    wh: [0.05, 1],
    boundary: 'Low end: GPU energy only, a medium open model on a benchmark. High end: a deliberately generous blend that allows for heavier requests.',
    source: 'IEA, Key Questions on Energy and AI (April 2026), Figure 2.1 and Box 2.1. Company figures for 2025 (0.24 Wh and 0.34 Wh) sit inside this range.',
  },
  {
    id: 'reasoning',
    label: 'A reply with reasoning switched on',
    wh: [7.63, 12.79],
    boundary: 'GPU energy only, three open models on the same benchmark prompts. Whole-system energy would be higher.',
    source: 'AI Energy Score v2 (Hugging Face, 4 December 2025): DeepSeek-R1-Distill-Llama-70B, Phi-4-reasoning-plus and SmolLM3-3B with reasoning on.',
  },
  {
    id: 'image',
    label: 'One generated image',
    wh: [1.35, 11.49],
    boundary: 'Median and highest of the image models tested, on 2023 research hardware (A100 GPUs).',
    source: 'Luccioni, Jernite and Strubell, Power Hungry Processing (FAccT 2024).',
  },
  {
    id: 'classifier',
    label: 'A small task-specific classifier',
    wh: [0.0023, 0.0068],
    boundary: 'Median for text classification and for image classification, on 2023 research hardware.',
    source: 'Luccioni, Jernite and Strubell, Power Hungry Processing (FAccT 2024).',
  },
];

/** Grid carbon intensity in grams of CO2-equivalent per kilowatt-hour: low, middle, high. */
export const GRID: { low: number; mid: number; high: number; sources: string } = {
  low: 12,
  mid: 458,
  high: 820,
  sources:
    'Low: median lifecycle emissions of nuclear (12) and onshore wind (11), IPCC AR5 (2014). Middle: world average electricity in 2025, Ember (2026). High: median lifecycle emissions of coal power (820), IPCC AR5; a grid that is all coal is the ceiling, and few places reach it.',
};

/** On-site cooling water, millilitres per watt-hour, from two 2025 company disclosures (see the lesson). */
export const WATER_ML_PER_WH: [number, number] = [0.9, 1.1];

/** The ratio behind that range: millilitres of water per watt-hour in a disclosure. */
export const mlPerWh = (ml: number, wh: number) => ml / wh;

/** US gallons to millilitres. */
export const GALLON_ML = 3785.41;

export type FootprintInput = {
  requestsPerDay: number;
  wh: [number, number];
  /** Days of use per year. */
  days?: number;
};

export type Footprint = {
  whPerDay: Range;
  kwhPerYear: Range;
  kgCo2PerYear: Range;
  litresWaterPerYear: Range;
};

export function footprint({ requestsPerDay, wh, days = 365 }: FootprintInput): Footprint {
  const dayLow = requestsPerDay * wh[0];
  const dayHigh = requestsPerDay * wh[1];
  const whPerDay = range(dayLow, dayHigh);
  const toKwhYear = (whDay: number) => (whDay * days) / 1000;
  const kwhPerYear = range(toKwhYear(dayLow), toKwhYear(dayHigh));
  // low x low and high x high: the widest honest range, and the middle uses the middle grid value
  const kgCo2PerYear: Range = {
    low: (kwhPerYear.low * GRID.low) / 1000,
    mid: (kwhPerYear.mid * GRID.mid) / 1000,
    high: (kwhPerYear.high * GRID.high) / 1000,
  };
  const litres = (kwh: number, mlPerWhValue: number) => (kwh * 1000 * mlPerWhValue) / 1000;
  const litresWaterPerYear: Range = {
    low: litres(kwhPerYear.low, WATER_ML_PER_WH[0]),
    mid: litres(kwhPerYear.mid, (WATER_ML_PER_WH[0] + WATER_ML_PER_WH[1]) / 2),
    high: litres(kwhPerYear.high, WATER_ML_PER_WH[1]),
  };
  return { whPerDay, kwhPerYear, kgCo2PerYear, litresWaterPerYear };
}

/* ---------- everyday comparisons ---------- */

/** Energy to heat one litre of water from 20 C to 100 C, in watt-hours: 4.186 J per gram per degree. */
export const KETTLE_WH = (4.186 * 1000 * 80) / 3600;
/** A 10 W LED bulb, as in the lesson. */
export const LED_WATTS = 10;
/** One smartphone charge, as used by Luccioni and colleagues in 2024 (an earlier EPA figure was 12 Wh). */
export const PHONE_CHARGE_WH = 22;
/** A typical US household's electricity use per year, in kWh, as quoted by Epoch AI (February 2025). */
export const US_HOME_KWH_YEAR = 10500;

export const ledHours = (wh: number) => wh / LED_WATTS;
export const kettleBoils = (wh: number) => wh / KETTLE_WH;
export const phoneCharges = (wh: number) => wh / PHONE_CHARGE_WH;
export const shareOfUsHome = (kwhPerYear: number) => kwhPerYear / US_HOME_KWH_YEAR;

/* ---------- a training run: power x time ---------- */

export type TrainingInput = { gpuHours: number; wattsPerGpu: number; overhead: number; gridGPerKwh: number };

export function training({ gpuHours, wattsPerGpu, overhead, gridGPerKwh }: TrainingInput) {
  const itMwh = (gpuHours * wattsPerGpu) / 1e6;
  const mwh = itMwh * overhead;
  const tonnes = (mwh * 1000 * gridGPerKwh) / 1e6;
  return { itMwh, mwh, tonnes };
}

/** The grid intensity (g per kWh) implied by an emissions figure and an energy figure. */
export const impliedGramsPerKwh = (tonnes: number, mwh: number) => (tonnes * 1e6) / (mwh * 1000);

/** How many requests at a given energy per request add up to a training run. */
export const requestsToMatch = (trainingMwh: number, whPerRequest: number) => (trainingMwh * 1e6) / whPerRequest;

/** Formats a number with sensible precision for small and large values. */
export function fmtNum(x: number): string {
  if (!isFinite(x)) return '-';
  if (x === 0) return '0';
  const a = Math.abs(x);
  const scaled = (v: number) => (Math.abs(v) >= 100 ? String(Math.round(v)) : v.toPrecision(2));
  if (a >= 1e9) return `${scaled(x / 1e9)} billion`;
  if (a >= 1e6) return `${scaled(x / 1e6)} million`;
  if (a >= 1000) return Math.round(x).toLocaleString('en-GB');
  if (a >= 100) return String(Math.round(x));
  if (a >= 10) return x.toFixed(1).replace(/\.0$/, '');
  if (a >= 1) return x.toFixed(2).replace(/0$/, '').replace(/\.$/, '');
  if (a >= 0.01) return x.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  return x.toPrecision(2);
}
