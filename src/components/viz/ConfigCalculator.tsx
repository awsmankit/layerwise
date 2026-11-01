import { useId, useMemo, useState } from 'react';
import { Root } from './shared';
import { PRESETS, divisors, kvBytesPerToken, kvCacheBytes, mhaEquivalentKvPerToken, paramBreakdown, presetById, weightBytes, withKvHeads, type LlmConfig } from '../../lib/llm-config';

const CONTEXTS = [2048, 8192, 32768, 131072];
const EXPERT_COUNTS = [4, 8, 16, 32, 64, 128, 256, 512];
const TOPKS = [1, 2, 4, 8, 16];

const nf = new Intl.NumberFormat('en-US');
const params = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(2) + ' B' : (n / 1e6).toFixed(0) + ' M');
const gb = (n: number) => (n >= 1e11 ? Math.round(n / 1e9) : n >= 1e10 ? (n / 1e9).toFixed(1) : (n / 1e9).toFixed(2)) + ' GB';
const kib = (b: number) => (b / 1024 >= 100 ? Math.round(b / 1024) : (b / 1024).toFixed(1)) + ' KiB';

type Overrides = { kvHeads?: number; vocab?: number; tied?: boolean; experts?: number; topK?: number };

/**
 * Pick a published configuration, change what you like, and see where the parameters are and how big
 * the KV cache is. All arithmetic is in src/lib/llm-config.ts, which is unit-tested against an
 * independent Python calculation and against the totals the model authors publish.
 */
export default function ConfigCalculator() {
  const uid = useId();
  const [presetId, setPresetId] = useState('llama3-8b');
  const [over, setOver] = useState<Overrides>({});
  const [ctx, setCtx] = useState(8192);
  const [bits, setBits] = useState<16 | 8>(16);

  const preset = presetById(presetId) ?? PRESETS[0];
  const cfg: LlmConfig = useMemo(() => {
    let c: LlmConfig = { ...preset };
    if (over.kvHeads !== undefined) c = withKvHeads(c, over.kvHeads);
    if (over.vocab !== undefined) c = { ...c, vocab: over.vocab };
    if (over.tied !== undefined) c = { ...c, tiedEmbeddings: over.tied };
    if (c.moe && (over.experts !== undefined || over.topK !== undefined)) {
      const experts = over.experts ?? c.moe.experts;
      c = { ...c, moe: { ...c.moe, experts, topK: Math.min(over.topK ?? c.moe.topK, experts) } };
    }
    return c;
  }, [preset, over]);
  const changed = Object.keys(over).length > 0;

  const b = paramBreakdown(cfg);
  const bytes = bits / 8;
  const perToken = kvBytesPerToken(cfg, bytes);
  const atCtx = kvCacheBytes(cfg, ctx, bytes);
  const mha = mhaEquivalentKvPerToken(cfg, bytes);
  const gqaCfg = cfg.attn.kind === 'gqa' ? cfg.attn : null;
  const activeShare = b.active / b.total;

  const segs = [
    { key: 'embedding', label: 'Embeddings (input and output)', value: b.embedding },
    { key: 'attention', label: 'Attention', value: b.attention },
    { key: 'ffn', label: cfg.moe ? 'Feed-forward and experts' : 'Feed-forward (MLP)', value: b.ffn },
    { key: 'other', label: 'Norms and routers', value: b.other },
  ];

  const set = (patch: Overrides) => setOver((o) => ({ ...o, ...patch }));
  const choose = (id: string) => {
    setPresetId(id);
    setOver({});
  };
  const kvHeadsNow = gqaCfg ? gqaCfg.kvHeads : 0;
  const kvKind = !gqaCfg ? 'MLA (compressed latent)' : kvHeadsNow === gqaCfg.heads ? 'multi-head (MHA)' : kvHeadsNow === 1 ? 'multi-query (MQA)' : 'grouped-query (GQA)';
  const heads = cfg.attn.heads;
  const kvOptions = gqaCfg ? divisors(gqaCfg.heads) : [];
  const expertOptions = cfg.moe ? [...new Set([...EXPERT_COUNTS, cfg.moe.experts])].sort((a, c) => a - c) : [];
  const topOptions = cfg.moe ? [...new Set([...TOPKS, cfg.moe.topK])].filter((t) => t <= cfg.moe!.experts).sort((a, c) => a - c) : [];

  return (
    <Root>
      <div className="viz dla-cfg">
        <p className="viz-title">Config calculator: from a published configuration to parameters and KV cache</p>

        <div className="viz-controls">
          <label className="field" htmlFor={`${uid}-preset`}>
            <span>Model configuration</span>
            <select id={`${uid}-preset`} value={presetId} onChange={(e) => choose(e.target.value)}>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor={`${uid}-ctx`}>
            <span>Context length</span>
            <select id={`${uid}-ctx`} value={ctx} onChange={(e) => setCtx(Number(e.target.value))}>
              {CONTEXTS.map((c) => (
                <option key={c} value={c}>
                  {nf.format(c)} tokens
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="dla-shape">
          <b>{cfg.layers}</b> layers, width <b>{nf.format(cfg.hidden)}</b>, <b>{heads}</b> query heads
          {gqaCfg ? (
            <>
              , <b>{gqaCfg.kvHeads}</b> KV heads of size {gqaCfg.headDim}
            </>
          ) : (
            <>
              , latent {cfg.attn.kind === 'mla' ? cfg.attn.kvLoraRank : 0} + RoPE {cfg.attn.kind === 'mla' ? cfg.attn.qkRopeDim : 0}
            </>
          )}
          , vocabulary <b>{nf.format(cfg.vocab)}</b>
          {cfg.moe ? (
            <>
              , <b>{cfg.moe.experts}</b> experts per layer, <b>{cfg.moe.topK}</b> used{cfg.moe.shared ? ` plus ${cfg.moe.shared} shared` : ''}
              {cfg.moe.denseLayers ? `, first ${cfg.moe.denseLayers} layers dense` : ''}
            </>
          ) : null}
          {cfg.localLayers ? (
            <>
              , {cfg.localLayers} layers with a {nf.format(cfg.window ?? 0)}-token window
            </>
          ) : null}
          .
        </p>

        <fieldset className="dla-what">
          <legend>What if you change it</legend>
          <div className="viz-controls">
            {gqaCfg ? (
              <label className="field" htmlFor={`${uid}-kv`}>
                <span>
                  KV heads <b className="num">{kvKind}</b>
                </span>
                <select id={`${uid}-kv`} value={gqaCfg.kvHeads} onChange={(e) => set({ kvHeads: Number(e.target.value) })}>
                  {kvOptions.map((n) => (
                    <option key={n} value={n}>
                      {n} {n === gqaCfg.heads ? '(one per query head)' : n === 1 ? '(shared by all)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="dla-dim dla-small">This model caches a compressed latent per token instead of per-head keys and values, so there is no KV head count to change.</p>
            )}
            <label className="field">
              <span>
                Vocabulary size <b className="num">{nf.format(cfg.vocab)}</b>
              </span>
              <input
                type="range"
                min={8192}
                max={300032}
                step={128}
                value={cfg.vocab}
                onChange={(e) => set({ vocab: Number(e.target.value) })}
                aria-label="Vocabulary size"
                aria-valuetext={`${nf.format(cfg.vocab)} tokens`}
              />
            </label>
            {cfg.moe ? (
              <>
                <label className="field" htmlFor={`${uid}-ex`}>
                  <span>Experts per layer</span>
                  <select id={`${uid}-ex`} value={cfg.moe.experts} onChange={(e) => set({ experts: Number(e.target.value) })}>
                    {expertOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field" htmlFor={`${uid}-tk`}>
                  <span>Experts used per token</span>
                  <select id={`${uid}-tk`} value={cfg.moe.topK} onChange={(e) => set({ topK: Number(e.target.value) })}>
                    {topOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </div>
          <div className="dla-row">
            <label className="dla-check">
              <input type="checkbox" checked={cfg.tiedEmbeddings} onChange={(e) => set({ tied: e.target.checked })} />
              <span>Tie input and output embeddings</span>
            </label>
            <span className="dla-lab">KV cache stored in</span>
            {([16, 8] as const).map((n) => (
              <button key={n} type="button" className="dla-chip" aria-pressed={bits === n} onClick={() => setBits(n)}>
                {n}-bit
              </button>
            ))}
            <button type="button" className="btn quiet dla-btn" onClick={() => setOver({})} disabled={!changed}>
              Reset to published
            </button>
          </div>
        </fieldset>

        <div role="status" aria-live="polite" className="dla-results">
          <div className="dla-cards">
            <div className="dla-card">
              <span className="dla-k">Total parameters</span>
              <span className="dla-v num">{params(b.total)}</span>
              <span className="dla-s">{gb(weightBytes(cfg, 16))} of weights at 16-bit</span>
            </div>
            <div className="dla-card">
              <span className="dla-k">Active per token</span>
              <span className="dla-v num">{params(b.active)}</span>
              <span className="dla-s">{cfg.moe ? `${(activeShare * 100).toFixed(0)}% of the total does the work` : 'dense: every parameter is used'}</span>
            </div>
            <div className="dla-card">
              <span className="dla-k">KV cache per token</span>
              <span className="dla-v num">{kib(perToken)}</span>
              <span className="dla-s num">{nf.format(perToken)} bytes at {bits}-bit</span>
            </div>
            <div className="dla-card">
              <span className="dla-k">KV cache at {nf.format(ctx)} tokens</span>
              <span className="dla-v num">{gb(atCtx)}</span>
              <span className="dla-s">
                {cfg.localLayers ? `windowed layers stop growing at ${nf.format(cfg.window ?? 0)}; ` : ''}one sequence
              </span>
            </div>
          </div>

          <h4 className="dla-h">Where the parameters are</h4>
          <div className="dla-bar" role="img" aria-label={segs.map((s) => `${s.label} ${((s.value / b.total) * 100).toFixed(1)} percent`).join(', ')}>
            {segs.map((s) => (
              <span key={s.key} className={`dla-seg dla-seg-${s.key}`} style={{ width: `${(s.value / b.total) * 100}%` }} />
            ))}
          </div>
          <ul className="dla-legend">
            {segs.map((s) => (
              <li key={s.key}>
                <i className={`dla-sw dla-seg-${s.key}`} aria-hidden="true" />
                <span>{s.label}</span>
                <span className="num">
                  {params(s.value)} <span className="dla-dim">({((s.value / b.total) * 100).toFixed(1)}%)</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="dla-note">
            {gqaCfg && gqaCfg.kvHeads < gqaCfg.heads ? (
              <>
                Sharing keys and values across query heads makes the cache <b>{(mha / perToken).toFixed(0)}x</b> smaller than plain multi-head attention with the same heads ({kib(mha)} per token).{' '}
              </>
            ) : null}
            {cfg.attn.kind === 'mla' ? (
              <>
                Caching a latent of {cfg.attn.kvLoraRank} + {cfg.attn.qkRopeDim} values per layer is <b>{(mha / perToken).toFixed(0)}x</b> smaller than storing every head’s full keys and values ({kib(mha)} per token).{' '}
              </>
            ) : null}
            {gqaCfg && gqaCfg.kvHeads === gqaCfg.heads ? 'This is plain multi-head attention: every query head has its own keys and values. Try fewer KV heads. ' : ''}
            {cfg.moe ? (
              <>
                Weights for all {cfg.moe.experts} experts must sit in memory ({gb(weightBytes(cfg, 16))} at 16-bit), but each token only runs {cfg.moe.topK}
                {cfg.moe.shared ? ` plus ${cfg.moe.shared} shared` : ''}, so compute follows the {params(b.active)} active parameters.{' '}
              </>
            ) : null}
            Embeddings are {((b.embedding / b.total) * 100).toFixed(1)}% of this model.
          </p>
        </div>

        <p className="viz-cap">
          {changed ? 'You changed this configuration, so these numbers are what-if values, not a published model. ' : `${preset.published} `}
          Counted: embeddings, attention, feed-forward and expert matrices, routers and norm gains; biases and QK-norm gains are left out. Configuration source: {preset.source}. Read 1 November 2026. The calculator reports its own count, which matches the published totals to within about 1 percent. Active parameters here include both embedding matrices; vendors differ on whether they count the input table.
        </p>
      </div>
    </Root>
  );
}
