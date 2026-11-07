/**
 * What if the model must fit on one GPU?
 *
 * Formulas only, no benchmark. Memory a model needs while serving = weights + KV cache. Splitting every layer across N GPUs
 * (tensor parallelism) shares both across the GPUs, so each holds about 1/N of them, but the GPUs must then add up their
 * partial results twice per layer on every step (two all-reduces), which costs link time. Every size, memory, bandwidth
 * and latency below is an EXAMPLE chosen to show the shape. The layer counts and widths are example shapes, not a named model.
 */

export type ModelShape = {
  id: string;
  label: string;
  /** Number of weights. */
  params: number;
  layers: number;
  /** Key/value heads (grouped-query attention). */
  kvHeads: number;
  headDim: number;
  /** Width of the hidden vector that is passed between the pieces of a layer. */
  hidden: number;
};

export const models: ModelShape[] = [
  { id: '8b', label: '8B model', params: 8e9, layers: 32, kvHeads: 8, headDim: 128, hidden: 4096 },
  { id: '32b', label: '32B model', params: 32e9, layers: 64, kvHeads: 8, headDim: 128, hidden: 5120 },
  { id: '70b', label: '70B model', params: 70e9, layers: 80, kvHeads: 8, headDim: 128, hidden: 8192 },
  { id: '405b', label: '405B model', params: 405e9, layers: 126, kvHeads: 8, headDim: 128, hidden: 16384 },
];

/** Example GPU memory sizes in GB (decimal). */
export const gpuMemories = [24, 48, 80, 141];

/** Bytes per weight: 16-bit or 8-bit storage. The KV cache is kept in 16-bit either way. */
export const precisions = [
  { id: 'b16', label: '16-bit weights', bytes: 2 },
  { id: 'b8', label: '8-bit weights', bytes: 1 },
];

export const links = [
  { id: 'fast', label: 'Fast, 450 GB/s', gbPerS: 450 },
  { id: 'slow', label: 'Slow, 32 GB/s', gbPerS: 32 },
];

export const example = {
  /** Share of GPU memory a server may fill; the rest is headroom for activations, buffers and the runtime. */
  usableShare: 0.9,
  /** Example memory bandwidth of one GPU in GB per second: how fast it can read its share of the weights. */
  memGBps: 3000,
  /** Example fixed delay of one all-reduce in microseconds. */
  allReduceMicros: 10,
  kvBytes: 2,
};

export const splits = [1, 2, 4, 8];

export type Setup = { model: ModelShape; gpuGB: number; weightBytes: number; batch: number; context: number };

export const GB = 1e9;

export const weightsGB = (s: Setup) => (s.model.params * s.weightBytes) / GB;

/** KV cache bytes for one token: keys and values (2) x layers x kv heads x head width x bytes. */
export const kvBytesPerToken = (m: ModelShape, bytes = example.kvBytes) => 2 * m.layers * m.kvHeads * m.headDim * bytes;

/** KV cache for the whole batch at the given context length. */
export const kvGB = (s: Setup) => (s.batch * s.context * kvBytesPerToken(s.model)) / GB;

export const totalGB = (s: Setup) => weightsGB(s) + kvGB(s);

export const usableGB = (s: Setup) => s.gpuGB * example.usableShare;

export type SplitResult = {
  n: number;
  weightsPerGpu: number;
  kvPerGpu: number;
  perGpu: number;
  fits: boolean;
  /** Per-GPU memory minus what is usable; positive means over by that much. */
  overBy: number;
  /** All-reduces in one step. */
  allReduces: number;
  /** Bytes each GPU sends and receives in one step (ring all-reduce). */
  commBytes: number;
  /** Milliseconds per step. null when the model does not fit. */
  readMs: number | null;
  commMs: number | null;
  stepMs: number | null;
  commShare: number | null;
};

/** What happens to one decode step when the layers are split across n GPUs. */
export function split(s: Setup, n: number, linkGBps: number): SplitResult {
  const weightsPerGpu = weightsGB(s) / n;
  const kvPerGpu = kvGB(s) / n;
  const perGpu = weightsPerGpu + kvPerGpu;
  const fits = perGpu <= usableGB(s);
  const allReduces = n === 1 ? 0 : 2 * s.model.layers;
  const commBytes = n === 1 ? 0 : allReduces * ((2 * (n - 1)) / n) * s.batch * s.model.hidden * 2;
  if (!fits) return { n, weightsPerGpu, kvPerGpu, perGpu, fits, overBy: perGpu - usableGB(s), allReduces, commBytes, readMs: null, commMs: null, stepMs: null, commShare: null };
  const readMs = (perGpu / example.memGBps) * 1000;
  const commMs = n === 1 ? 0 : allReduces * (example.allReduceMicros / 1000) + (commBytes / (linkGBps * GB)) * 1000;
  const stepMs = readMs + commMs;
  return { n, weightsPerGpu, kvPerGpu, perGpu, fits, overBy: perGpu - usableGB(s), allReduces, commBytes, readMs, commMs, stepMs, commShare: commMs / stepMs };
}

/** Fewest GPUs (from 1, 2, 4, 8) on which the model fits, or null if even 8 are not enough. */
export function fewestGpus(s: Setup): number | null {
  for (const n of splits) if (split(s, n, links[0].gbPerS).fits) return n;
  return null;
}

/** Longest context (in tokens) that fits on n GPUs at this batch size, or 0 when even an empty cache does not fit. */
export function maxContext(s: Setup, n: number): number {
  const room = usableGB(s) * n - weightsGB(s);
  if (room <= 0) return 0;
  return Math.floor((room * GB) / (s.batch * kvBytesPerToken(s.model)));
}

