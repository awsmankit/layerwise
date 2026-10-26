/**
 * Fit the Model: choose a model size, weight precision and KV-cache precision
 * so that serving fits in memory and still meets a quality bar.
 *
 * The memory arithmetic is the real one (parameters x bytes, and
 * 2 x layers x KV heads x head dimension x bytes per token). Model shapes are
 * approximate Llama-style examples, and the quality scores are illustrative.
 */

export const models = {
  '1B': { label: '1B class', paramsB: 1.2, layers: 16, kvHeads: 8, headDim: 64, quality: 55 },
  '8B': { label: '8B class', paramsB: 8, layers: 32, kvHeads: 8, headDim: 128, quality: 72 },
  '70B': { label: '70B class', paramsB: 70, layers: 80, kvHeads: 8, headDim: 128, quality: 86 },
  '400B': { label: '400B class', paramsB: 405, layers: 126, kvHeads: 8, headDim: 128, quality: 93 },
} as const;
export type ModelId = keyof typeof models;
export const modelIds = Object.keys(models) as ModelId[];

export const weightPrecisions = {
  fp16: { label: 'FP16 / BF16', bytes: 2, penalty: 0 },
  int8: { label: 'INT8', bytes: 1, penalty: 0.5 },
  int4: { label: 'INT4', bytes: 0.5, penalty: 3 },
} as const;
export type WeightPrecision = keyof typeof weightPrecisions;

export const kvPrecisions = {
  fp16: { label: 'FP16', bytes: 2, penalty: 0 },
  fp8: { label: 'FP8 / INT8', bytes: 1, penalty: 0.5 },
} as const;
export type KvPrecision = keyof typeof kvPrecisions;

/** Share of each device's memory kept for activations, runtime and fragmentation. */
export const RESERVE_FRACTION = 0.1;
/** Fixed runtime footprint per device, in GB. */
export const RUNTIME_GB = 1.5;

export type FitScenario = {
  id: string;
  level: 1 | 2 | 3 | 4;
  title: string;
  brief: string;
  deviceName: string;
  deviceGB: number;
  devices: number;
  users: number;
  ctx: number;
  minQuality: number;
};

export const fitScenarios: FitScenario[] = [
  {
    id: 'phone',
    level: 1,
    title: 'An assistant on a phone',
    brief: 'An offline writing assistant for one person on a phone that can spare 6 GB. A short context is fine. It only needs to be decent, not brilliant.',
    deviceName: 'phone memory budget',
    deviceGB: 6,
    devices: 1,
    users: 1,
    ctx: 4096,
    minQuality: 50,
  },
  {
    id: 'team',
    level: 2,
    title: 'Team chat on one 24 GB GPU',
    brief: 'Sixteen people chat with an assistant at once, each with up to 8,000 tokens of history. One 24 GB GPU is all the budget allows. It has to answer well enough for work.',
    deviceName: '24 GB GPU',
    deviceGB: 24,
    devices: 1,
    users: 16,
    ctx: 8192,
    minQuality: 70,
  },
  {
    id: 'analyst',
    level: 3,
    title: 'Long documents on two 80 GB GPUs',
    brief: 'Eight analysts each work with up to 16,000 tokens of documents at a time. You have two 80 GB GPUs and the answers must be strong.',
    deviceName: '80 GB GPU',
    deviceGB: 80,
    devices: 2,
    users: 8,
    ctx: 16384,
    minQuality: 85,
  },
  {
    id: 'frontier',
    level: 4,
    title: 'A frontier model on a full node',
    brief: 'Sixteen concurrent users with 32,000 tokens of context each, on a node of eight 80 GB GPUs. The quality bar is the highest there is.',
    deviceName: '80 GB GPU',
    deviceGB: 80,
    devices: 8,
    users: 16,
    ctx: 32768,
    minQuality: 92,
  },
];

export type Config = { model: ModelId; weights: WeightPrecision; kv: KvPrecision };

export type Fit = {
  weightsGB: number;
  kvGB: number;
  reserveGB: number;
  capacityGB: number;
  usedGB: number;
  fits: boolean;
  quality: number;
  meetsQuality: boolean;
  ok: boolean;
  kvBytesPerToken: number;
};

export function fit(s: FitScenario, c: Config): Fit {
  const m = models[c.model];
  const weightsGB = m.paramsB * weightPrecisions[c.weights].bytes;
  const kvBytesPerToken = 2 * m.layers * m.kvHeads * m.headDim * kvPrecisions[c.kv].bytes;
  const kvGB = (kvBytesPerToken * s.ctx * s.users) / 1e9;
  const totalGB = s.deviceGB * s.devices;
  const reserveGB = totalGB * RESERVE_FRACTION + RUNTIME_GB * s.devices;
  const capacityGB = totalGB - reserveGB;
  const usedGB = weightsGB + kvGB;
  const quality = m.quality - weightPrecisions[c.weights].penalty - kvPrecisions[c.kv].penalty;
  const fits = usedGB <= capacityGB;
  const meetsQuality = quality >= s.minQuality;
  return { weightsGB, kvGB, reserveGB, capacityGB, usedGB, fits, quality, meetsQuality, ok: fits && meetsQuality, kvBytesPerToken };
}

export function allConfigs(): Config[] {
  const out: Config[] = [];
  for (const model of modelIds)
    for (const weights of Object.keys(weightPrecisions) as WeightPrecision[])
      for (const kv of Object.keys(kvPrecisions) as KvPrecision[]) out.push({ model, weights, kv });
  return out;
}

export function solutions(s: FitScenario) {
  return allConfigs()
    .map((config) => ({ config, result: fit(s, config) }))
    .filter((x) => x.result.ok)
    .sort((a, b) => b.result.quality - a.result.quality);
}

/** 0 if it does not work; 70 for any working answer; up to 100 for the best quality achievable. */
export function score(s: FitScenario, c: Config): number {
  const r = fit(s, c);
  if (!r.ok) return 0;
  const sols = solutions(s);
  const best = sols[0].result.quality;
  if (best <= s.minQuality) return 100;
  return Math.round(70 + (30 * (r.quality - s.minQuality)) / (best - s.minQuality));
}
