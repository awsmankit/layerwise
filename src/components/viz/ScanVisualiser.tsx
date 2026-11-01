import { useState } from 'react';
import { Root } from './shared';
import {
  GIB,
  JAMBA_SHAPE as S,
  LAYOUTS,
  MIB,
  attentionPairs,
  cacheBytes,
  decodeMacs,
  kvBytes,
  memoryCrossover,
  prefillPairs,
  scanDepth,
  ssmStateBytes,
} from '../../lib/ssm';

const bytesLabel = (b: number) => (b >= GIB ? `${(b / GIB).toFixed(b / GIB >= 10 ? 1 : 2)} GiB` : `${(b / MIB).toFixed(b / MIB >= 10 ? 1 : 2)} MiB`);
const sci = (v: number) => {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(v));
  const m = v / 10 ** e;
  return e < 4 ? Math.round(v).toLocaleString('en-GB') : `${m.toFixed(1)} × 10^${e}`;
};
const lenLabel = (n: number) => (n >= 1024 * 1024 ? `${n / 1024 / 1024}M` : `${n / 1024}K`);

const KS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; // n = 2^k tokens
const LINE_CLASS = { attention: 'wc-l-attn', hybrid: 'wc-l-hyb', ssm: 'wc-l-ssm' } as const;

/* ---- the small picture: all pairs against a chain of state updates ---- */

function Pairs({ n }: { n: number }) {
  const size = 300;
  const c = size / n;
  const cells = [];
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) cells.push([i, j]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="wc-svg" role="img" aria-label={`Attention: a triangle of ${attentionPairs(n)} token pairs for ${n} tokens.`}>
      <rect x={0} y={0} width={size} height={size} className="wc-frame" />
      {cells.map(([i, j]) => (
        <rect key={`${i}-${j}`} x={j * c + 0.5} y={i * c + 0.5} width={c - 1} height={c - 1} className={i === j ? 'wc-cell-d' : 'wc-cell-p'} />
      ))}
    </svg>
  );
}

function Chain({ n }: { n: number }) {
  const w = 300;
  const step = w / n;
  const box = Math.min(18, step * 0.62);
  return (
    <svg viewBox={`0 0 ${w} 64`} className="wc-svg wc-chain" role="img" aria-label={`State-space layer: a chain of ${n} state updates, each passing a state of the same size to the next.`}>
      <line x1={0} x2={w} y1={32} y2={32} className="wc-link" />
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={i * step + (step - box) / 2} y={32 - box / 2} width={box} height={box} rx={2} className="wc-node" />
      ))}
    </svg>
  );
}

/* ---- the chart: memory per sequence against length ---- */

function MemoryChart({ k, layoutId }: { k: number; layoutId: string }) {
  const W = 340;
  const H = 230;
  const pad = { l: 56, r: 10, t: 10, b: 40 };
  const yLo = 22; // log2 bytes: 4 MiB
  const yHi = 38; // 256 GiB
  const sx = (kk: number) => pad.l + ((kk - 10) / 10) * (W - pad.l - pad.r);
  const sy = (b: number) => H - pad.b - ((Math.log2(b) - yLo) / (yHi - yLo)) * (H - pad.t - pad.b);
  const yTicks: [number, string][] = [
    [25, '32 MiB'],
    [30, '1 GiB'],
    [35, '32 GiB'],
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="wc-chart" role="img" aria-label="Memory per sequence against context length, on logarithmic axes, for three layouts. The all-attention line rises steadily, the hybrid rises about eight times more slowly, and the all-state-space line is flat.">
      {yTicks.map(([v, label]) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(2 ** v)} y2={sy(2 ** v)} className="wc-grid" />
          <text x={pad.l - 6} y={sy(2 ** v) + 4} textAnchor="end" className="wc-ax">
            {label}
          </text>
        </g>
      ))}
      {[10, 12, 14, 16, 18, 20].map((kk) => (
        <text key={kk} x={sx(kk)} y={H - pad.b + 17} textAnchor="middle" className="wc-ax">
          {lenLabel(2 ** kk)}
        </text>
      ))}
      <text x={(pad.l + W - pad.r) / 2} y={H - 5} textAnchor="middle" className="wc-ax">
        context length in tokens
      </text>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="wc-axis" />
      {LAYOUTS.map((l) => {
        const d = KS.map((kk, i) => `${i ? 'L' : 'M'}${sx(kk).toFixed(1)} ${sy(cacheBytes(2 ** kk, S, l.attnLayers)).toFixed(1)}`).join(' ');
        return <path key={l.id} d={d} fill="none" className={`wc-line ${LINE_CLASS[l.id]}${l.id === layoutId ? ' wc-on' : ''}`} />;
      })}
      <line x1={sx(k)} x2={sx(k)} y1={pad.t} y2={H - pad.b} className="wc-now" />
      {LAYOUTS.map((l) => (
        <circle key={l.id} cx={sx(k)} cy={sy(cacheBytes(2 ** k, S, l.attnLayers))} r={l.id === layoutId ? 5 : 3.5} className={`wc-dot ${LINE_CLASS[l.id]}`} />
      ))}
    </svg>
  );
}

export default function ScanVisualiser() {
  const [small, setSmall] = useState(8);
  const [k, setK] = useState(17);
  const [layoutId, setLayoutId] = useState<'attention' | 'hybrid' | 'ssm'>('hybrid');

  const n = 2 ** k;
  const layout = LAYOUTS.find((l) => l.id === layoutId)!;
  const a = layout.attnLayers;
  const kv = kvBytes(n, S, a);
  const st = ssmStateBytes(S, a);
  const total = kv + st;
  const full = kvBytes(n, S, S.layers);
  const cross = memoryCrossover(S, a);

  const live = `At ${n.toLocaleString('en-GB')} tokens, ${layout.label.toLowerCase()} needs ${bytesLabel(total)} of cache and state per sequence, against ${bytesLabel(full)} for all attention.`;

  return (
    <Root>
      <div className="viz wc wc-scan">
        <p className="viz-title">All pairs against a running state</p>

        <h4 className="wc-h">1. The pictures: what is computed</h4>
        <label className="field">
          <span>
            Tokens in the sequence <b>{small}</b>
          </span>
          <input type="range" min={3} max={16} step={1} value={small} aria-label="Number of tokens in the small picture" onChange={(e) => setSmall(+e.target.value)} />
        </label>
        <div className="wc-pics">
          <figure className="wc-fig">
            <figcaption className="wc-figcap">Attention: every token scored against every earlier token</figcaption>
            <Pairs n={small} />
            <p className="wc-count" aria-live="polite">
              <b className="num">{attentionPairs(small)}</b> pairs, <span className="num">n(n+1)/2</span>
            </p>
          </figure>
          <figure className="wc-fig">
            <figcaption className="wc-figcap">State-space layer: one state, rewritten once per token</figcaption>
            <Chain n={small} />
            <p className="wc-count" aria-live="polite">
              <b className="num">{small}</b> updates of a state of fixed size. In training, a parallel scan does them in <b className="num">{scanDepth(small)}</b> rounds.
            </p>
          </figure>
        </div>

        <h4 className="wc-h">2. The numbers: one 32-layer model at real lengths</h4>
        <div className="wc-chips" role="group" aria-label="Layout of the 32 layers">
          {LAYOUTS.map((l) => (
            <button key={l.id} type="button" className={`wc-chip ${LINE_CLASS[l.id]}`} aria-pressed={layoutId === l.id} onClick={() => setLayoutId(l.id)}>
              <span className="wc-sw" aria-hidden="true" />
              {l.label} ({l.attnLayers} attention)
            </button>
          ))}
        </div>
        <label className="field">
          <span>
            Context length <b>{n.toLocaleString('en-GB')} tokens</b>
          </span>
          <input type="range" min={10} max={20} step={1} value={k} aria-label="Context length as a power of two, from 1,024 to about one million tokens" onChange={(e) => setK(+e.target.value)} />
        </label>

        <MemoryChart k={k} layoutId={layoutId} />

        <table className="wc-table">
          <caption className="wc-cap">Per sequence, for the layout selected (example shape: 32 layers, 8 KV heads, state size 16)</caption>
          <tbody>
            <tr>
              <th scope="row">Keys and values cached (grows with length)</th>
              <td className="num">{bytesLabel(kv)}</td>
            </tr>
            <tr>
              <th scope="row">Recurrent state (same at any length)</th>
              <td className="num">{bytesLabel(st)}</td>
            </tr>
            <tr>
              <th scope="row">Total</th>
              <td className="num">
                <b>{bytesLabel(total)}</b>
              </td>
            </tr>
            <tr>
              <th scope="row">Token pairs scored to read the prompt</th>
              <td className="num">{sci(prefillPairs(n, S, a))}</td>
            </tr>
            <tr>
              <th scope="row">Length-dependent multiply-adds per new token</th>
              <td className="num">{sci(decodeMacs(n, S, a))}</td>
            </tr>
          </tbody>
        </table>
        <p className="wc-status" aria-live="polite">
          {live}
          {Number.isFinite(cross) && a < S.layers ? ` Below about ${Math.round(cross)} tokens the fixed state is larger than the cache it replaces.` : ''}
        </p>
        <p className="viz-cap">
          Counts, not benchmarks. Shape taken from the Jamba v0.1 configuration (width 4096, 32 query heads, 8 key-value heads of size 128, state size 16, expansion 2), with 2 bytes per number; GiB means 2^30 bytes. Weights, activations, projections and the small convolution buffers are not counted, and real implementations may keep the state in higher precision. Pair scores are summed over heads and attention layers. Multiply-adds count only the work that depends on context length (attention) or the state update (about 3 per state entry), not the dense layers that every model needs. Speed in practice also depends on kernels and memory bandwidth, which these counts do not capture.
        </p>
      </div>
    </Root>
  );
}
