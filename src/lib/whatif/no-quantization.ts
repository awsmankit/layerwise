/**
 * What if the model is not quantised?
 *
 * Weights memory is parameters x bits / 8. Whatever is left in the device after the weights and a small
 * reserve holds the KV caches of the people being served. Speed is memory-bound: one decode step reads
 * every weight and the cache once. Models and devices are EXAMPLES, not specific products.
 */

export type Model = { id: string; label: string; paramsB: number; layers: number; kvHeads: number; headDim: number };
export type Device = { id: string; label: string; short: string; memGB: number; bandwidthGBs: number };

/** Example model sizes with Llama-style shapes (layers, KV heads, head width). */
export const models: Model[] = [
  { id: '8b', label: '8B model', paramsB: 8, layers: 32, kvHeads: 8, headDim: 128 },
  { id: '32b', label: '32B model', paramsB: 32, layers: 64, kvHeads: 8, headDim: 128 },
  { id: '70b', label: '70B model', paramsB: 70, layers: 80, kvHeads: 8, headDim: 128 },
];

/** Example devices: memory in GB and memory bandwidth in GB/s. */
export const devices: Device[] = [
  { id: 'phone', label: 'Phone, 8 GB memory', short: 'phone', memGB: 8, bandwidthGBs: 60 },
  { id: 'laptop', label: 'Laptop GPU, 16 GB', short: 'laptop GPU', memGB: 16, bandwidthGBs: 300 },
  { id: 'work', label: 'Workstation GPU, 48 GB', short: 'workstation GPU', memGB: 48, bandwidthGBs: 700 },
  { id: 'server', label: 'Server GPU, 80 GB', short: 'server GPU', memGB: 80, bandwidthGBs: 2000 },
];

export const bitOptions = [16, 8, 4] as const;
export type Bits = (typeof bitOptions)[number];

/** Share of memory kept for the runtime and slack, plus a fixed runtime footprint in GB. */
export const RESERVE_FRACTION = 0.1;
export const RUNTIME_GB = 0.5;
/** Usable share of the memory bandwidth. */
export const EFFICIENCY = 0.65;
/** Example conversation length per person, with the cache kept in 16-bit numbers. */
export const CONTEXT_TOKENS = 4000;

export const weightsGB = (paramsB: number, bits: number) => (paramsB * bits) / 8;
export const kvPerUserGB = (m: Model, ctx = CONTEXT_TOKENS) => (2 * m.layers * m.kvHeads * m.headDim * 2 * ctx) / 1e9;
export const usableGB = (d: Device) => d.memGB * (1 - RESERVE_FRACTION) - RUNTIME_GB;

export type Result = {
  bits: Bits;
  weightsGB: number;
  usableGB: number;
  kvPerUserGB: number;
  /** True when the weights and at least one person's cache fit. */
  fits: boolean;
  /** People who can be served at once (0 if it does not fit). */
  users: number;
  /** Tokens per second for one person (0 if it does not fit). */
  tokS: number;
  /** How many GB short the model is when it does not fit. */
  shortByGB: number;
};

export function analyse(m: Model, d: Device, bits: Bits): Result {
  const w = weightsGB(m.paramsB, bits);
  const usable = usableGB(d);
  const kv = kvPerUserGB(m);
  const users = usable > w ? Math.floor((usable - w) / kv) : 0;
  const fits = users >= 1;
  return {
    bits,
    weightsGB: w,
    usableGB: usable,
    kvPerUserGB: kv,
    fits,
    users,
    tokS: fits ? (d.bandwidthGBs * EFFICIENCY) / (w + kv) : 0,
    shortByGB: fits ? 0 : Math.max(0, w + kv - usable),
  };
}

/** The widest number format that still fits, or null if none does. */
export function widestThatFits(m: Model, d: Device): Bits | null {
  for (const b of bitOptions) if (analyse(m, d, b).fits) return b;
  return null;
}
