/**
 * Parameter counts and KV-cache sizes for decoder-only language models, computed from a
 * configuration (layers, widths, heads, experts). The presets are published configurations;
 * each cites the document it was read from, on 1 November 2026.
 *
 * Counted: token embeddings, the output head (unless tied), attention projections, feed-forward
 * (gated, three matrices) and expert networks, router matrices, and RMSNorm gains.
 * Not counted: biases, attention-sink parameters and per-head QK-norm gains (all tiny).
 */

export type GqaAttention = { kind: 'gqa'; heads: number; kvHeads: number; headDim: number };
export type MlaAttention = {
  kind: 'mla';
  heads: number;
  qLoraRank: number;
  kvLoraRank: number;
  qkNopeDim: number;
  qkRopeDim: number;
  vDim: number;
};
export type Attention = GqaAttention | MlaAttention;

export type Moe = {
  /** Routed experts per MoE layer. */
  experts: number;
  /** Routed experts used per token. */
  topK: number;
  /** Hidden size of one expert (a gated feed-forward with three matrices). */
  expertFfn: number;
  /** Shared experts that every token uses. */
  shared: number;
  /** Leading layers that keep a plain dense feed-forward instead of experts. */
  denseLayers: number;
};

export type LlmConfig = {
  id: string;
  name: string;
  layers: number;
  hidden: number;
  /** Hidden size of the dense gated feed-forward (unused when every layer is MoE). */
  ffn: number;
  vocab: number;
  tiedEmbeddings: boolean;
  attn: Attention;
  moe?: Moe;
  /** Layers that use sliding-window attention, and the window in tokens. */
  localLayers?: number;
  window?: number;
  /** Layers with no growing KV cache (linear attention or state-space layers). */
  linearLayers?: number;
};

export type ParamBreakdown = {
  embedding: number;
  attention: number;
  ffn: number;
  other: number;
  total: number;
  /** Total minus the routed experts a token does not use. Includes both embedding matrices. */
  active: number;
};

export function attentionParamsPerLayer(hidden: number, a: Attention): number {
  if (a.kind === 'gqa') {
    const q = hidden * a.heads * a.headDim;
    const kv = 2 * hidden * a.kvHeads * a.headDim;
    const o = a.heads * a.headDim * hidden;
    return q + kv + o;
  }
  const qk = a.qkNopeDim + a.qkRopeDim;
  return (
    hidden * a.qLoraRank + // query down-projection
    a.qLoraRank * a.heads * qk + // query up-projection
    hidden * (a.kvLoraRank + a.qkRopeDim) + // joint KV down-projection plus the decoupled RoPE key
    a.kvLoraRank * a.heads * (a.qkNopeDim + a.vDim) + // key and value up-projections
    a.heads * a.vDim * hidden + // output projection
    a.qLoraRank +
    a.kvLoraRank // RMSNorm gains on the two latents
  );
}

export function paramBreakdown(c: LlmConfig): ParamBreakdown {
  const d = c.hidden;
  const embedding = c.vocab * d * (c.tiedEmbeddings ? 1 : 2);
  const attention = c.layers * attentionParamsPerLayer(d, c.attn);
  const denseLayers = c.moe ? c.moe.denseLayers : c.layers;
  const moeLayers = c.layers - denseLayers;
  const dense = denseLayers * 3 * d * c.ffn;
  let experts = 0;
  let expertsActive = 0;
  let router = 0;
  if (c.moe) {
    const one = 3 * d * c.moe.expertFfn;
    experts = moeLayers * (c.moe.experts + c.moe.shared) * one;
    expertsActive = moeLayers * (c.moe.topK + c.moe.shared) * one;
    router = moeLayers * d * c.moe.experts;
  }
  const other = c.layers * 2 * d + d + router;
  const total = embedding + attention + dense + experts + other;
  return { embedding, attention, ffn: dense + experts, other, total, active: total - (experts - expertsActive) };
}

/** KV bytes stored per token in one layer. */
export function kvBytesPerLayer(c: LlmConfig, bytesPerValue: number): number {
  if (c.attn.kind === 'mla') return (c.attn.kvLoraRank + c.attn.qkRopeDim) * bytesPerValue;
  return 2 * c.attn.kvHeads * c.attn.headDim * bytesPerValue;
}

/** Layers whose cache keeps every token (neither windowed nor linear). */
export const globalLayers = (c: LlmConfig) => c.layers - (c.localLayers ?? 0) - (c.linearLayers ?? 0);

/** KV bytes added per token when the context is longer than any window: every cached layer counts. */
export function kvBytesPerToken(c: LlmConfig, bytesPerValue: number): number {
  return kvBytesPerLayer(c, bytesPerValue) * (c.layers - (c.linearLayers ?? 0));
}

/** KV cache for one sequence of `context` tokens; windowed layers keep at most `window` tokens. */
export function kvCacheBytes(c: LlmConfig, context: number, bytesPerValue: number): number {
  const per = kvBytesPerLayer(c, bytesPerValue);
  const local = c.localLayers ?? 0;
  const kept = Math.min(context, c.window ?? context);
  return per * (globalLayers(c) * context + local * kept);
}

/** The same model with plain multi-head attention (one KV head per query head), for comparison. */
export function mhaEquivalentKvPerToken(c: LlmConfig, bytesPerValue: number): number {
  const a = c.attn;
  // with MLA the full keys are (nope + rope) wide and the values vDim wide, per head
  const perLayer = a.kind === 'gqa' ? 2 * a.heads * a.headDim * bytesPerValue : a.heads * (a.qkNopeDim + a.qkRopeDim + a.vDim) * bytesPerValue;
  return perLayer * (c.layers - (c.linearLayers ?? 0));
}

/** Weight memory in bytes at a given number of bits per parameter. */
export const weightBytes = (c: LlmConfig, bitsPerParam: number) => (paramBreakdown(c).total * bitsPerParam) / 8;

export const KV_SOURCES = 'Read from the papers and Hugging Face config.json files listed under the calculator, 1 November 2026.';

const gqa = (heads: number, kvHeads: number, headDim: number): GqaAttention => ({ kind: 'gqa', heads, kvHeads, headDim });

/** Published configurations. `source` says where each number was read. */
export type Preset = LlmConfig & { source: string; published: string };

export const PRESETS: Preset[] = [
  {
    id: 'llama3-8b',
    name: 'Llama 3 8B',
    layers: 32,
    hidden: 4096,
    ffn: 14336,
    vocab: 128256,
    tiedEmbeddings: false,
    attn: gqa(32, 8, 128),
    source: 'Llama 3 paper, Table 3 (layers, widths, heads); vocabulary 128,000 tokens plus 256 reserved special tokens from the meta-llama/llama3 tokenizer.py',
    published: 'Published: about 8B parameters.',
  },
  {
    id: 'llama3-70b',
    name: 'Llama 3 70B',
    layers: 80,
    hidden: 8192,
    ffn: 28672,
    vocab: 128256,
    tiedEmbeddings: false,
    attn: gqa(64, 8, 128),
    source: 'Llama 3 paper, Table 3; vocabulary as for the 8B model',
    published: 'Published: about 70B parameters.',
  },
  {
    id: 'llama3-405b',
    name: 'Llama 3 405B',
    layers: 126,
    hidden: 16384,
    ffn: 53248,
    vocab: 128256,
    tiedEmbeddings: false,
    attn: gqa(128, 8, 128),
    source: 'Llama 3 paper, Table 3; vocabulary as for the 8B model',
    published: 'Published: 405B parameters.',
  },
  {
    id: 'olmo2-7b',
    name: 'OLMo 2 7B',
    layers: 32,
    hidden: 4096,
    ffn: 11008,
    vocab: 100352,
    tiedEmbeddings: false,
    attn: gqa(32, 32, 128),
    source: 'OLMo 2 paper, Table 3 (32 layers, 4096 width, 32/32 heads, MHA) and SwiGLU size 11,008; vocabulary from the allenai/OLMo-2-1124-7B config.json',
    published: 'Plain multi-head attention: no sharing of keys and values.',
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B (v0.1)',
    layers: 32,
    hidden: 4096,
    ffn: 14336,
    vocab: 32000,
    tiedEmbeddings: false,
    attn: gqa(32, 8, 128),
    localLayers: 32,
    window: 4096,
    source: 'Mistral 7B paper (dim 4096, 32 layers, 8 KV heads, window 4096, vocabulary 32,000) and the mistralai/Mistral-7B-v0.1 config.json',
    published: 'Published: 7.2B parameters (Jamba paper, Table 1).',
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    layers: 32,
    hidden: 4096,
    ffn: 14336,
    vocab: 32000,
    tiedEmbeddings: false,
    attn: gqa(32, 8, 128),
    moe: { experts: 8, topK: 2, expertFfn: 14336, shared: 0, denseLayers: 0 },
    source: 'Mixtral paper, Table 1 (8 experts, top 2, hidden 14,336, 32,768 context) and the mistralai/Mixtral-8x7B-v0.1 config.json (no sliding window)',
    published: 'Published: 47B total, 13B active per token.',
  },
  {
    id: 'qwen3-4b',
    name: 'Qwen3 4B',
    layers: 36,
    hidden: 2560,
    ffn: 9728,
    vocab: 151936,
    tiedEmbeddings: true,
    attn: gqa(32, 8, 128),
    source: 'Qwen3 technical report, Table 1 (36 layers, 32/8 heads, tied embeddings) and the Qwen/Qwen3-4B config.json',
    published: 'Published: 4.0B parameters (model card). Input and output embeddings are tied.',
  },
  {
    id: 'qwen3-8b',
    name: 'Qwen3 8B',
    layers: 36,
    hidden: 4096,
    ffn: 12288,
    vocab: 151936,
    tiedEmbeddings: false,
    attn: gqa(32, 8, 128),
    source: 'Qwen3 technical report, Table 1 (36 layers, 32/8 heads, no tying) and the Qwen/Qwen3-8B config.json; the config pads the vocabulary to 151,936 (tokenizer: 151,669)',
    published: 'Published: 8.2B parameters (model card).',
  },
  {
    id: 'qwen3-30b-a3b',
    name: 'Qwen3 30B-A3B',
    layers: 48,
    hidden: 2048,
    ffn: 6144,
    vocab: 151936,
    tiedEmbeddings: false,
    attn: gqa(32, 4, 128),
    moe: { experts: 128, topK: 8, expertFfn: 768, shared: 0, denseLayers: 0 },
    source: 'Qwen3 technical report, Table 2 (48 layers, 32/4 heads, 128 experts, 8 active, no shared expert) and the Qwen/Qwen3-30B-A3B config.json (expert size 768)',
    published: 'Published: 30.5B total, 3.3B activated (model card).',
  },
  {
    id: 'gpt-oss-20b',
    name: 'gpt-oss-20b',
    layers: 24,
    hidden: 2880,
    ffn: 2880,
    vocab: 201088,
    tiedEmbeddings: false,
    attn: gqa(64, 8, 64),
    moe: { experts: 32, topK: 4, expertFfn: 2880, shared: 0, denseLayers: 0 },
    localLayers: 12,
    window: 128,
    source: 'gpt-oss model card (arXiv 2508.10925): 24 layers, width 2880, 64 query heads of 64 dimensions, 8 KV heads, 32 experts with top 4, every second layer banded with window 128, 201,088 tokens; expert size from the openai/gpt-oss-20b config.json',
    published: 'Published: 20.91B total; 3.61B active, which counts the output matrix but not the input embeddings.',
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek-V3',
    layers: 61,
    hidden: 7168,
    ffn: 18432,
    vocab: 129280,
    tiedEmbeddings: false,
    attn: { kind: 'mla', heads: 128, qLoraRank: 1536, kvLoraRank: 512, qkNopeDim: 128, qkRopeDim: 64, vDim: 128 },
    moe: { experts: 256, topK: 8, expertFfn: 2048, shared: 1, denseLayers: 3 },
    source: 'DeepSeek-V3 technical report, section 4.2 (61 layers, 7168 width, 128 heads, latent sizes 512 and 1536, RoPE dimension 64, first 3 layers dense, 1 shared and 256 routed experts of size 2048, 8 active); dense size 18,432 and vocabulary 129,280 from the deepseek-ai/DeepSeek-V3 config.json',
    published: 'Published: 671B total, 37B activated per token (main model, without the multi-token-prediction module).',
  },
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id);

/** A copy of a config with a different number of KV heads (grouped-query models only). */
export function withKvHeads(c: LlmConfig, kvHeads: number): LlmConfig {
  if (c.attn.kind !== 'gqa') return c;
  return { ...c, attn: { ...c.attn, kvHeads } };
}

/** Whole-number divisors of n in ascending order: the legal KV head counts for n query heads. */
export function divisors(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}
