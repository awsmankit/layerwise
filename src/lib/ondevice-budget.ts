/*
 * Logic for the on-device budget calculator in edge/small-language-models-on-device.
 *
 * Two questions: does the model fit in the memory the app can really use, and what is the ceiling on
 * decode speed? Decoding reads every weight, plus the whole KV cache, once per generated token, so
 * the ceiling is memory bandwidth divided by bytes read per token (a roofline-style bound, not a
 * prediction). Model shapes come from the public config files and model cards (see the lesson sources).
 * Device figures come from vendor pages read on 1 November 2026, except the phone preset, which is an
 * invented example and says so. Overhead and bandwidth efficiency are stated assumptions.
 */

export type ModelShape = {
  id: string;
  label: string;
  /** Parameters in billions, as stated on the model card or paper. */
  paramsB: number;
  layers: number;
  /** Key and value heads (equal to the attention heads when the model has no grouped-query attention). */
  kvHeads: number;
  headDim: number;
  /** Context length the model card or config states. */
  maxContext: number;
  source: string;
};

export const MODELS: ModelShape[] = [
  { id: 'smollm2-360m', label: 'SmolLM2 360M', paramsB: 0.36, layers: 32, kvHeads: 5, headDim: 64, maxContext: 8192, source: 'HuggingFaceTB/SmolLM2-360M-Instruct config.json and model card' },
  { id: 'qwen25-1.5b', label: 'Qwen2.5 1.5B', paramsB: 1.54, layers: 28, kvHeads: 2, headDim: 128, maxContext: 32768, source: 'Qwen/Qwen2.5-1.5B-Instruct config.json and model card' },
  { id: 'qwen25-3b', label: 'Qwen2.5 3B', paramsB: 3.09, layers: 36, kvHeads: 2, headDim: 128, maxContext: 32768, source: 'Qwen/Qwen2.5-3B-Instruct config.json and model card' },
  { id: 'phi3-mini', label: 'Phi-3-mini 3.8B', paramsB: 3.8, layers: 32, kvHeads: 32, headDim: 96, maxContext: 4096, source: 'microsoft/Phi-3-mini-4k-instruct config.json and model card' },
];

export type Device = {
  id: string;
  label: string;
  ramGB: number;
  /** Memory bandwidth in GB/s. */
  bandwidthGBs: number;
  /** Share of RAM the operating system and other apps keep, as a starting assumption. */
  reservedShare: number;
  /** 'datasheet' when a vendor page states the numbers; 'assumption' when they are invented for the example. */
  basis: 'datasheet' | 'assumption';
  source: string;
};

export const DEVICES: Device[] = [
  { id: 'phone', label: 'Phone (invented example)', ramGB: 12, bandwidthGBs: 50, reservedShare: 0.5, basis: 'assumption', source: 'Invented example, not from a vendor page. Measure your own device.' },
  { id: 'ipad', label: 'Apple iPad Pro, M5, 12 GB', ramGB: 12, bandwidthGBs: 153, reservedShare: 0.4, basis: 'datasheet', source: 'Apple iPad Pro tech specs (apple.com/ipad-pro/specs), read 1 November 2026' },
  { id: 'jetson', label: 'NVIDIA Jetson Orin Nano 8 GB', ramGB: 8, bandwidthGBs: 102, reservedShare: 0.25, basis: 'datasheet', source: 'NVIDIA Jetson Orin specifications page, read 1 November 2026' },
  { id: 'macbook', label: 'MacBook Pro 14-inch, M4, 16 GB', ramGB: 16, bandwidthGBs: 120, reservedShare: 0.4, basis: 'datasheet', source: 'Apple Support tech specs for MacBook Pro (14-inch, M4, 2024), read 1 November 2026' },
  { id: 'snapdragon', label: 'Snapdragon X Elite laptop, 16 GB', ramGB: 16, bandwidthGBs: 135, reservedShare: 0.4, basis: 'datasheet', source: 'Qualcomm Snapdragon X Elite product brief states 135 GB/s and up to 64 GB; 16 GB is an example configuration' },
];

export type Bits = { id: string; label: string; bits: number; note: string };

/** Effective bits per weight. 4.5 is a typical GGUF 4-bit type once scales are counted. */
export const BITS: Bits[] = [
  { id: 'fp16', label: '16-bit', bits: 16, note: 'Original precision' },
  { id: 'int8', label: '8-bit', bits: 8, note: 'Near-lossless in most cases' },
  { id: 'q4k', label: '4.5-bit (typical GGUF 4-bit)', bits: 4.5, note: 'Common default on laptops' },
  { id: 'int4', label: '4-bit (idealised)', bits: 4, note: 'Scales stored separately add a little' },
  { id: 'int2', label: '2-bit', bits: 2, note: 'Needs quantisation-aware training' },
];

export const KV_BYTES = [
  { id: 'kv16', label: '16-bit KV cache', bytes: 2 },
  { id: 'kv8', label: '8-bit KV cache', bytes: 1 },
];

/** Assumption: runtime, tokenizer, activation buffers. Real figures vary by runtime. */
export const RUNTIME_OVERHEAD_GB = 0.3;

const GB = 1e9;

/** Weight memory in GB: parameters (billions) times bits per weight, divided by 8. */
export function weightsGB(paramsB: number, bitsPerWeight: number): number {
  return (paramsB * bitsPerWeight) / 8;
}

/** KV cache bytes per token: 2 (keys and values) x layers x KV heads x head dimension x bytes per value. */
export function kvBytesPerToken(layers: number, kvHeads: number, headDim: number, bytesPerValue: number): number {
  return 2 * layers * kvHeads * headDim * bytesPerValue;
}

export function kvGB(perTokenBytes: number, contextTokens: number): number {
  return (perTokenBytes * contextTokens) / GB;
}

/** Bandwidth from the memory's transfer rate and bus width: MT/s x (bits / 8) bytes, in GB/s. */
export function bandwidthFromRate(megaTransfersPerSecond: number, busBits: number): number {
  return (megaTransfersPerSecond * (busBits / 8)) / 1000;
}

export type BudgetInput = {
  model: ModelShape;
  device: { ramGB: number; bandwidthGBs: number };
  /** Share of RAM kept by the OS and other apps, 0 to 0.9. */
  reservedShare: number;
  bitsPerWeight: number;
  kvBytes: number;
  contextTokens: number;
  /** Share of peak bandwidth the runtime actually achieves, 0.1 to 1. */
  efficiency: number;
};

export type Verdict = 'fits' | 'tight' | 'no';

export type BudgetResult = {
  weights: number;
  kv: number;
  overhead: number;
  total: number;
  usable: number;
  headroom: number;
  verdict: Verdict;
  kvPerToken: number;
  /** Largest context (tokens) that still fits in the usable memory, floored at 0. */
  maxContextThatFits: number;
  /** Bytes read per generated token at the chosen context, in GB. */
  readPerTokenGB: number;
  ceilingTps: number;
  estimateTps: number;
};

export function budget(i: BudgetInput): BudgetResult {
  const weights = weightsGB(i.model.paramsB, i.bitsPerWeight);
  const kvPerToken = kvBytesPerToken(i.model.layers, i.model.kvHeads, i.model.headDim, i.kvBytes);
  const kv = kvGB(kvPerToken, i.contextTokens);
  const overhead = RUNTIME_OVERHEAD_GB;
  const total = weights + kv + overhead;
  const usable = i.device.ramGB * (1 - i.reservedShare);
  const headroom = usable - total;
  const verdict: Verdict = total > usable ? 'no' : total > usable * 0.85 ? 'tight' : 'fits';
  const spare = usable - weights - overhead;
  const maxContextThatFits = spare <= 0 ? 0 : Math.floor((spare * GB) / kvPerToken);
  const readPerTokenGB = weights + kv;
  const ceilingTps = i.device.bandwidthGBs / readPerTokenGB;
  return {
    weights,
    kv,
    overhead,
    total,
    usable,
    headroom,
    verdict,
    kvPerToken,
    maxContextThatFits,
    readPerTokenGB,
    ceilingTps,
    estimateTps: ceilingTps * i.efficiency,
  };
}
