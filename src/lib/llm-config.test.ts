import { describe, expect, it } from 'vitest';
import { PRESETS, divisors, globalLayers, kvBytesPerToken, kvCacheBytes, mhaEquivalentKvPerToken, paramBreakdown, presetById, weightBytes, withKvHeads, type LlmConfig } from './llm-config';

/*
 * REF holds the expected numbers from an independent Python implementation of the same
 * arithmetic, run on 1 November 2026 on the configurations in PRESETS. The tests below it
 * compare the totals with the figures the model authors publish.
 */
const REF: Record<string, Record<string, number>> = {"llama3-8b": {"embedding": 1050673152, "attention": 1342177280, "ffn": 5637144576, "other": 266240, "total": 8030261248, "active": 8030261248, "kv_per_token_16": 131072, "kv_8k_16": 1073741824, "kv_8k_8": 536870912, "kv_128k_16": 17179869184, "kv_2k_16": 268435456}, "llama3-70b": {"embedding": 2101346304, "attention": 12079595520, "ffn": 56371445760, "other": 1318912, "total": 70553706496, "active": 70553706496, "kv_per_token_16": 327680, "kv_8k_16": 2684354560, "kv_8k_8": 1342177280, "kv_128k_16": 42949672960, "kv_2k_16": 671088640}, "llama3-405b": {"embedding": 4202692608, "attention": 71873593344, "ffn": 329772957696, "other": 4145152, "total": 405853388800, "active": 405853388800, "kv_per_token_16": 516096, "kv_8k_16": 4227858432, "kv_8k_8": 2113929216, "kv_128k_16": 67645734912, "kv_2k_16": 1056964608}, "olmo2-7b": {"embedding": 822083584, "attention": 2147483648, "ffn": 4328521728, "other": 266240, "total": 7298355200, "active": 7298355200, "kv_per_token_16": 524288, "kv_8k_16": 4294967296, "kv_8k_8": 2147483648, "kv_128k_16": 68719476736, "kv_2k_16": 1073741824}, "mistral-7b": {"embedding": 262144000, "attention": 1342177280, "ffn": 5637144576, "other": 266240, "total": 7241732096, "active": 7241732096, "kv_per_token_16": 131072, "kv_8k_16": 536870912, "kv_8k_8": 268435456, "kv_128k_16": 536870912, "kv_2k_16": 268435456}, "mixtral-8x7b": {"embedding": 262144000, "attention": 1342177280, "ffn": 45097156608, "other": 1314816, "total": 46702792704, "active": 12879925248, "kv_per_token_16": 131072, "kv_8k_16": 1073741824, "kv_8k_8": 536870912, "kv_128k_16": 17179869184, "kv_2k_16": 268435456}, "qwen3-4b": {"embedding": 388956160, "attention": 943718400, "ffn": 2689597440, "other": 186880, "total": 4022458880, "active": 4022458880, "kv_per_token_16": 147456, "kv_8k_16": 1207959552, "kv_8k_8": 603979776, "kv_128k_16": 19327352832, "kv_2k_16": 301989888}, "qwen3-8b": {"embedding": 1244659712, "attention": 1509949440, "ffn": 5435817984, "other": 299008, "total": 8190726144, "active": 8190726144, "kv_per_token_16": 147456, "kv_8k_16": 1207959552, "kv_8k_8": 603979776, "kv_128k_16": 19327352832, "kv_2k_16": 301989888}, "qwen3-30b-a3b": {"embedding": 622329856, "attention": 905969664, "ffn": 28991029248, "other": 12781568, "total": 30532110336, "active": 3353020416, "kv_per_token_16": 98304, "kv_8k_16": 805306368, "kv_8k_8": 402653184, "kv_128k_16": 12884901888, "kv_2k_16": 201326592}, "gpt-oss-20b": {"embedding": 1158266880, "attention": 637009920, "ffn": 19110297600, "other": 2352960, "total": 20907927360, "active": 4186416960, "kv_per_token_16": 49152, "kv_8k_16": 204472320, "kv_8k_8": 102236160, "kv_128k_16": 3224371200, "kv_2k_16": 53477376}, "deepseek-v3": {"embedding": 1853358080, "attention": 11413547008, "ffn": 657652187136, "other": 107312128, "total": 671026404352, "active": 37552282624, "kv_per_token_16": 70272, "kv_8k_16": 575668224, "kv_8k_8": 287834112, "kv_128k_16": 9210691584, "kv_2k_16": 143917056}};

describe('presets match the Python reference exactly', () => {
  for (const p of PRESETS) {
    it(p.id, () => {
      const r = REF[p.id];
      const b = paramBreakdown(p);
      expect(b.embedding).toBe(r.embedding);
      expect(b.attention).toBe(r.attention);
      expect(b.ffn).toBe(r.ffn);
      expect(b.other).toBe(r.other);
      expect(b.total).toBe(r.total);
      expect(b.active).toBe(r.active);
      expect(kvBytesPerToken(p, 2)).toBe(r.kv_per_token_16);
      expect(kvCacheBytes(p, 8192, 2)).toBe(r.kv_8k_16);
      expect(kvCacheBytes(p, 8192, 1)).toBe(r.kv_8k_8);
      expect(kvCacheBytes(p, 131072, 2)).toBe(r.kv_128k_16);
      expect(kvCacheBytes(p, 2048, 2)).toBe(r.kv_2k_16);
    });
  }
  it('has a preset for every reference entry', () => {
    expect(PRESETS.map((p) => p.id).sort()).toEqual(Object.keys(REF).sort());
  });
});

const B = (id: string) => paramBreakdown(presetById(id)!);
const bn = (n: number) => n / 1e9;

describe('totals agree with what the model authors publish', () => {
  it('Llama 3: 8B, 70B and 405B', () => {
    expect(bn(B('llama3-8b').total)).toBeCloseTo(8.03, 2);
    expect(bn(B('llama3-70b').total)).toBeCloseTo(70.55, 1);
    expect(bn(B('llama3-405b').total)).toBeCloseTo(405.85, 1);
  });
  it('Mistral 7B is 7.2B (Jamba paper, Table 1)', () => {
    expect(bn(B('mistral-7b').total)).toBeCloseTo(7.24, 2);
  });
  it('Mixtral: 47B total, 13B active (paper)', () => {
    expect(Math.round(bn(B('mixtral-8x7b').total))).toBe(47);
    expect(Math.round(bn(B('mixtral-8x7b').active))).toBe(13);
  });
  it('Qwen3: 4.0B, 8.2B, and 30.5B total with 3.3B active (model cards)', () => {
    expect(bn(B('qwen3-4b').total)).toBeCloseTo(4.0, 1);
    expect(bn(B('qwen3-8b').total)).toBeCloseTo(8.2, 1);
    expect(bn(B('qwen3-30b-a3b').total)).toBeCloseTo(30.5, 1);
    expect(bn(B('qwen3-30b-a3b').active)).toBeGreaterThan(3.3); // 3.35B here; the card gives 3.3B
    expect(bn(B('qwen3-30b-a3b').active)).toBeLessThan(3.4);
  });
  it('DeepSeek-V3: 671B total, 37B active (technical report)', () => {
    expect(Math.round(bn(B('deepseek-v3').total))).toBe(671);
    expect(Math.round(bn(B('deepseek-v3').active))).toBe(38);
    // the report says 37B; the count here includes both embedding matrices (1.85B), the report's 37B is a rounded figure
    expect(bn(B('deepseek-v3').active) - bn(B('deepseek-v3').embedding / 2)).toBeLessThan(37);
  });
  it('gpt-oss-20b matches the model card table: MLP 19.12B, attention 0.64B, embed + unembed 1.16B, total 20.91B', () => {
    const b = B('gpt-oss-20b');
    expect(bn(b.ffn)).toBeCloseTo(19.12, 1);
    expect(bn(b.attention)).toBeCloseTo(0.64, 2);
    expect(bn(b.embedding)).toBeCloseTo(1.16, 2);
    expect(bn(b.total)).toBeCloseTo(20.91, 2);
    // the card counts the output matrix as active but not the input embedding: 3.61B
    expect(bn(b.active - b.embedding / 2)).toBeCloseTo(3.61, 2);
  });
});

describe('KV cache', () => {
  it('Llama 3 8B needs 131,072 bytes (128 KiB) per token at 16 bits', () => {
    expect(kvBytesPerToken(presetById('llama3-8b')!, 2)).toBe(131072);
  });
  it('DeepSeek-V3 caches only (512 + 64) values per layer: 70,272 bytes per token', () => {
    expect(kvBytesPerToken(presetById('deepseek-v3')!, 2)).toBe(61 * 576 * 2);
  });
  it('sharing keys and values divides the cache by heads / kvHeads', () => {
    const l = presetById('llama3-8b')!;
    expect(mhaEquivalentKvPerToken(l, 2) / kvBytesPerToken(l, 2)).toBe(4);
    const q = presetById('qwen3-30b-a3b')!;
    expect(mhaEquivalentKvPerToken(q, 2) / kvBytesPerToken(q, 2)).toBe(8);
    expect(kvBytesPerToken(withKvHeads(l, 32), 2)).toBe(524288);
    expect(kvBytesPerToken(withKvHeads(l, 1), 2)).toBe(16384);
  });
  it('a sliding window caps the cache: Mistral 7B at 128k holds no more than at 4k', () => {
    const m = presetById('mistral-7b')!;
    expect(kvCacheBytes(m, 131072, 2)).toBe(kvCacheBytes(m, 4096, 2));
    expect(kvCacheBytes(m, 2048, 2)).toBeLessThan(kvCacheBytes(m, 4096, 2));
  });
  it('gpt-oss-20b: half the layers are global, so the cache grows at half the full rate', () => {
    const g = presetById('gpt-oss-20b')!;
    expect(globalLayers(g)).toBe(12);
    const longer = kvCacheBytes(g, 131072, 2) - kvCacheBytes(g, 65536, 2);
    expect(longer).toBe(12 * 2 * 8 * 64 * 2 * 65536);
  });
  it('8-bit storage halves the cache', () => {
    const l = presetById('llama3-70b')!;
    expect(kvCacheBytes(l, 8192, 1) * 2).toBe(kvCacheBytes(l, 8192, 2));
  });
  it('checks the Jamba paper table at 256K tokens: Llama-2 7B 128 GiB, Mistral 7B 32 GiB, Mixtral 32 GiB', () => {
    const GiB = 1024 ** 3;
    const llama2: LlmConfig = { id: 'l2', name: 'Llama 2 7B', layers: 32, hidden: 4096, ffn: 11008, vocab: 32000, tiedEmbeddings: false, attn: { kind: 'gqa', heads: 32, kvHeads: 32, headDim: 128 } };
    expect(kvCacheBytes(llama2, 262144, 2) / GiB).toBe(128);
    expect(kvCacheBytes(presetById('mixtral-8x7b')!, 262144, 2) / GiB).toBe(32);
    // Mistral 7B uses a window, so its cache is far smaller than the table's 32 GiB figure, which assumes full attention
    expect(kvCacheBytes({ ...presetById('mistral-7b')!, localLayers: 0 }, 262144, 2) / GiB).toBe(32);
  });
  it('a hybrid keeps a cache only in its full-attention layers (Qwen3-Next config: 48 layers, every 4th full, 2 KV heads of 256)', () => {
    const hybrid: LlmConfig = { id: 'h', name: 'hybrid', layers: 48, hidden: 2048, ffn: 5120, vocab: 151936, tiedEmbeddings: false, attn: { kind: 'gqa', heads: 16, kvHeads: 2, headDim: 256 }, linearLayers: 36 };
    expect(kvBytesPerToken(hybrid, 2)).toBe(2 * 2 * 256 * 2 * 12);
    expect(kvBytesPerToken({ ...hybrid, linearLayers: 0 }, 2)).toBe(4 * kvBytesPerToken(hybrid, 2));
  });
});

describe('what the knobs do', () => {
  it('tying embeddings removes one vocab x width matrix', () => {
    const q = presetById('qwen3-8b')!;
    const untied = paramBreakdown(q).total;
    const tied = paramBreakdown({ ...q, tiedEmbeddings: true }).total;
    expect(untied - tied).toBe(q.vocab * q.hidden);
  });
  it('a bigger vocabulary adds vocab x width per matrix and nothing else', () => {
    const l = presetById('llama3-8b')!;
    const a = paramBreakdown(l);
    const b = paramBreakdown({ ...l, vocab: l.vocab + 1000 });
    expect(b.total - a.total).toBe(2 * 1000 * l.hidden);
    expect(b.attention).toBe(a.attention);
  });
  it('more KV heads only grow attention parameters and the cache', () => {
    const l = presetById('llama3-8b')!;
    const a = paramBreakdown(l);
    const b = paramBreakdown(withKvHeads(l, 32));
    expect(b.ffn).toBe(a.ffn);
    expect(b.attention).toBeGreaterThan(a.attention);
  });
  it('MoE: total grows with the number of experts, active parameters with the number used', () => {
    const m = presetById('mixtral-8x7b')!;
    const base = paramBreakdown(m);
    const more = paramBreakdown({ ...m, moe: { ...m.moe!, experts: 16 } });
    expect(more.total).toBeGreaterThan(base.total);
    expect(Math.round(more.active / 1e6)).toBeLessThan(Math.round(base.total / 1e6));
    const top1 = paramBreakdown({ ...m, moe: { ...m.moe!, topK: 1 } });
    expect(top1.total).toBeLessThan(base.total + 1);
    expect(top1.active).toBeLessThan(base.active);
    // the router adds a little to the 16-expert total but active compute only rises by the router
    expect(more.active - base.active).toBe(32 * 2880 * 0 + 32 * 4096 * 8);
  });
  it('a dense model has active = total, and a MoE model does not', () => {
    expect(B('llama3-8b').active).toBe(B('llama3-8b').total);
    expect(B('mixtral-8x7b').active).toBeLessThan(B('mixtral-8x7b').total / 3);
  });
  it('weights take bits / 8 bytes per parameter', () => {
    const l = presetById('llama3-8b')!;
    expect(weightBytes(l, 16)).toBe(paramBreakdown(l).total * 2);
    expect(weightBytes(l, 4)).toBe(paramBreakdown(l).total / 2);
  });
  it('lists the legal KV head counts', () => {
    expect(divisors(32)).toEqual([1, 2, 4, 8, 16, 32]);
    expect(divisors(40)).toEqual([1, 2, 4, 5, 8, 10, 20, 40]);
  });
});
