import { useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import {
  FITS,
  breakEvenServedTokens,
  fixedSize,
  flopsFromGpuDays,
  frontierLoss,
  gpuPlan,
  human,
  lifetimeFlops,
  matchedAlternative,
  optimalAllocation,
  sci,
  inferFlops,
  type FitId,
} from '../../lib/scaling-laws';

/* Peak dense BF16 figures from NVIDIA's own product pages (the headline numbers on those pages assume sparsity and are twice as large). */
const GPUS = [
  { id: 'h100', label: 'H100 SXM', peak: 989e12 },
  { id: 'a100', label: 'A100 80 GB', peak: 312e12 },
] as const;

const PRESETS = [
  { label: '1B model, 20B tokens', c: 1.2e20 },
  { label: 'Chinchilla scale', c: 5.76e23 },
  { label: 'Llama 3 405B scale', c: 3.8e25 },
];

const FRACTIONS = [
  { f: 0.5, label: 'half the size' },
  { f: 0.35, label: 'about a third' },
  { f: 0.25, label: 'a quarter' },
];

type Mode = 'flops' | 'gpudays';

const log10 = Math.log10;

function parseNumber(s: string): number | null {
  const v = Number(s.trim().replace(/,/g, ''));
  return Number.isFinite(v) && v > 0 ? v : null;
}

type Pt = [number, number];
type Series = { id: string; cls: string; pts: Pt[] };
type Tick = { v: number; label: string };

/** A small log-x line chart drawn at its real pixel width, so its labels stay readable on a phone. */
function Chart(props: {
  label: string;
  xTicks: Tick[];
  yTicks: Tick[];
  xDomain: [number, number];
  yDomain: [number, number];
  series: Series[];
  marks: { id: string; cls: string; at: Pt }[];
  xTitle: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(520);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = w < 420 ? 220 : 250;
  const pad = { l: 44, r: 12, t: 10, b: 44 };
  const [x0, x1] = props.xDomain;
  const [y0, y1] = props.yDomain;
  const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * (w - pad.l - pad.r);
  const sy = (y: number) => h - pad.b - ((y - y0) / (y1 - y0)) * (h - pad.t - pad.b);
  const path = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join(' ');
  const xTicks = w < 420 ? props.xTicks.filter((_, i) => i % 2 === 0) : props.xTicks;
  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${h}`} className="dlb-chart" role="img" aria-label={props.label}>
      {props.yTicks.map((t) => (
        <g key={t.label}>
          <line x1={pad.l} x2={w - pad.r} y1={sy(t.v)} y2={sy(t.v)} className="dlb-grid" />
          <text x={pad.l - 6} y={sy(t.v) + 4} textAnchor="end" className="dlb-ax">
            {t.label}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={t.label}>
          <line x1={sx(t.v)} x2={sx(t.v)} y1={h - pad.b} y2={h - pad.b + 4} className="dlb-tick" />
          <text x={sx(t.v)} y={h - pad.b + 18} textAnchor="middle" className="dlb-ax">
            {t.label}
          </text>
        </g>
      ))}
      <text x={(pad.l + w - pad.r) / 2} y={h - 6} textAnchor="middle" className="dlb-ax">
        {props.xTitle}
      </text>
      <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="dlb-axis" />
      {props.series.map((s) => (
        <path key={s.id} d={path(s.pts)} className={`dlb-line ${s.cls}`} fill="none" />
      ))}
      {props.marks.map((m) => (
        <circle key={m.id} cx={sx(m.at[0])} cy={sy(m.at[1])} r={6} className={`dlb-mark ${m.cls}`} />
      ))}
    </svg>
  );
}

const range = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

export default function ScalingPlanner() {
  const [fitId, setFitId] = useState<FitId>('epoch');
  const [mode, setMode] = useState<Mode>('flops');
  const [value, setValue] = useState(5.76e23); // FLOPs, or GPU-days when mode is gpudays
  const [text, setText] = useState('5.76e+23');
  const [gpuId, setGpuId] = useState<(typeof GPUS)[number]['id']>('h100');
  const [mfu, setMfu] = useState(0.4);
  const [gpus, setGpus] = useState(2048);
  const [price, setPrice] = useState(2);
  const [fi, setFi] = useState(0);
  const [served, setServed] = useState(12); // log10 of lifetime tokens served

  const fit = FITS[fitId];
  const peak = GPUS.find((g) => g.id === gpuId)!.peak;
  const c = mode === 'flops' ? value : flopsFromGpuDays(value, peak, mfu);
  const fraction = FRACTIONS[fi].f;

  const setBudget = (v: number) => {
    setValue(v);
    setText(sci(v));
  };
  const changeMode = (m: Mode) => {
    if (m === mode) return;
    if (m === 'gpudays') {
      const days = gpuPlan(c, peak, mfu, 1, 1).gpuDays;
      setMode(m);
      setBudget(Number(days.toPrecision(3)));
    } else {
      setMode(m);
      setBudget(Number(c.toPrecision(3)));
    }
  };

  const r = useMemo(() => {
    const opt = optimalAllocation(fit, c);
    const alt = matchedAlternative(fit, c, fraction);
    const same = fixedSize(fit, opt.n * fraction, c);
    const planOpt = gpuPlan(c, peak, mfu, gpus, price);
    const planAlt = alt ? gpuPlan(alt.train, peak, mfu, gpus, price) : null;
    const tokens = Math.pow(10, served);
    const breakEven = alt ? breakEvenServedTokens(opt, alt) : Infinity;
    return { opt, alt, same, planOpt, planAlt, tokens, breakEven };
  }, [fit, c, fraction, peak, mfu, gpus, price, served]);

  // charts
  const lc = log10(c);
  const frontier = useMemo(() => {
    const xs = range(lc - 3, lc + 3, 60);
    return xs.map((x): Pt => [x, frontierLoss(fit, Math.pow(10, x))]);
  }, [fit, lc]);
  const yTop = frontier[0][1] + 0.05;
  const yBottom = frontier[frontier.length - 1][1] - 0.03;
  const small = useMemo(() => {
    const n = r.opt.n * fraction;
    return range(lc - 3, lc + 3, 90)
      .map((x): Pt => [x, fixedSize(fit, n, Math.pow(10, x)).loss])
      .filter(([, y]) => y <= yTop);
  }, [fit, r.opt.n, fraction, lc, yTop]);
  const bowl = useMemo(() => {
    const ln = log10(r.opt.n);
    return range(ln - 1.5, ln + 1.5, 60).map((x): Pt => [x, fixedSize(fit, Math.pow(10, x), c).loss]);
  }, [fit, r.opt.n, c]);
  const bowlTop = Math.max(...bowl.map((p) => p[1]));
  const bowlBottom = r.opt.loss - 0.02;

  const tickSet = (a: number, b: number) => {
    const out: Tick[] = [];
    for (let e = Math.ceil(a); e <= Math.floor(b); e++) out.push({ v: e, label: `1e${e}` });
    return out;
  };
  const yTicks = (a: number, b: number): Tick[] => {
    const step = b - a > 1.2 ? 0.5 : b - a > 0.5 ? 0.2 : 0.1;
    const out: Tick[] = [];
    for (let v = Math.ceil(a / step) * step; v <= b; v += step) out.push({ v, label: v.toFixed(1) });
    return out;
  };

  const lifeOpt = lifetimeFlops(r.opt.n, r.opt.d, r.tokens);
  const lifeAlt = r.alt ? lifetimeFlops(r.alt.n, r.alt.d, r.tokens) : NaN;
  const altWins = r.alt ? lifeAlt < lifeOpt : false;

  const warns: string[] = [];
  if (c > 5e22) warns.push('Beyond the training runs the fit was made from (models up to about 16B parameters and 500B tokens, so below roughly 5e22 FLOPs). Everything here is extrapolation.');
  if (Math.max(r.opt.d, r.alt?.d ?? 0) > 15e12) warns.push('At least one of these needs more than 15 trillion training tokens, the largest corpus reported in the Llama 3 paper. The fit assumes every token is new; repeating data changes the picture.');
  if (!r.alt) warns.push('A model that small cannot reach the compute-optimal loss at any amount of data under this fit. Choose a larger fraction.');

  const summary = `Compute budget ${sci(c)} FLOPs. Compute-optimal under the ${fit.label} fit: ${human(r.opt.n)} parameters on ${human(r.opt.d)} tokens, ${r.opt.ratio.toFixed(0)} tokens per parameter, predicted loss ${r.opt.loss.toFixed(3)}. Training it takes ${human(r.planOpt.gpuHours)} GPU-hours, ${r.planOpt.wallDays.toFixed(1)} days on ${gpus} GPUs.`;

  const usd = (x: number) => (x >= 1e9 ? `$${(x / 1e9).toFixed(2)}B` : x >= 1e6 ? `$${(x / 1e6).toFixed(2)}M` : x >= 1e3 ? `$${(x / 1e3).toFixed(1)}K` : `$${x.toFixed(0)}`);
  const days = (d: number) => (d >= 100 ? Math.round(d).toLocaleString('en-US') : d.toFixed(1));

  return (
    <Root>
      <div className="viz dlb dlb-plan">
        <p className="viz-title">Scaling planner</p>

        <div className="dlb-row" role="group" aria-label="Which fit to use">
          <span className="dlb-label">Loss fit</span>
          {(Object.keys(FITS) as FitId[]).map((id) => (
            <button key={id} type="button" className="dlb-chip" aria-pressed={fitId === id} onClick={() => setFitId(id)}>
              {FITS[id].label}
            </button>
          ))}
        </div>
        <p className="dlb-note">
          <b>L(N, D) = {fit.E} + {fit.A} / N<sup>{fit.alpha}</sup> + {fit.B} / D<sup>{fit.beta}</sup></b>. Source: {fit.source}. Loss values belong to that paper’s data and tokenizer, so read the shapes, not the absolute numbers.
        </p>

        <div className="dlb-row" role="group" aria-label="How to state the budget">
          <span className="dlb-label">Budget in</span>
          <button type="button" className="dlb-chip" aria-pressed={mode === 'flops'} onClick={() => changeMode('flops')}>
            FLOPs
          </button>
          <button type="button" className="dlb-chip" aria-pressed={mode === 'gpudays'} onClick={() => changeMode('gpudays')}>
            GPU-days
          </button>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="dlb-chip dlb-preset"
              onClick={() => {
                setMode('flops');
                setBudget(p.c);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="viz-controls dlb-controls">
          <label className="field">
            <span>
              {mode === 'flops' ? 'Compute budget (FLOPs)' : 'Compute budget (GPU-days)'} <b>{sci(value)}</b>
            </span>
            <input
              className="dlb-in"
              inputMode="decimal"
              value={text}
              aria-label={mode === 'flops' ? 'Compute budget in FLOPs, for example 5.76e23' : 'Compute budget in GPU-days, for example 1e6'}
              onChange={(e) => {
                setText(e.target.value);
                const v = parseNumber(e.target.value);
                if (v) setValue(v);
              }}
            />
            <input
              type="range"
              min={mode === 'flops' ? 18 : 0}
              max={mode === 'flops' ? 27 : 8}
              step={0.05}
              value={Math.min(Math.max(log10(value), mode === 'flops' ? 18 : 0), mode === 'flops' ? 27 : 8)}
              aria-label="Compute budget on a log scale"
              onChange={(e) => setBudget(Number(Math.pow(10, +e.target.value).toPrecision(3)))}
            />
          </label>
          <label className="field">
            <span>GPU (peak BF16, dense)</span>
            <select className="dlb-in" value={gpuId} onChange={(e) => setGpuId(e.target.value as typeof gpuId)}>
              {GPUS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label} ({(g.peak / 1e12).toFixed(0)} TFLOPS)
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Utilisation (MFU) <b>{Math.round(mfu * 100)}%</b>
            </span>
            <input type="range" min={0.1} max={0.6} step={0.01} value={mfu} aria-label="Model FLOPs utilisation" onChange={(e) => setMfu(+e.target.value)} />
          </label>
          <label className="field">
            <span>GPUs in the cluster</span>
            <input className="dlb-in" type="number" min={1} step={64} inputMode="numeric" value={gpus} onChange={(e) => setGpus(Math.max(1, Math.round(+e.target.value || 1)))} />
          </label>
          <label className="field">
            <span>Example price per GPU-hour ($)</span>
            <input className="dlb-in" type="number" min={0} step={0.25} inputMode="decimal" value={price} onChange={(e) => setPrice(Math.max(0, +e.target.value || 0))} />
          </label>
        </div>
        {mode === 'gpudays' && (
          <p className="dlb-note">
            {sci(value)} GPU-days at {Math.round(mfu * 100)}% of {(peak / 1e12).toFixed(0)} TFLOPS is {sci(c)} FLOPs.
          </p>
        )}

        <div className="dlb-live" aria-live="polite">
          <p className="sr-only">{summary}</p>
        </div>

        <div className="dlb-answer">
          <div className="dlb-card dlb-opt">
            <p className="dlb-cardtitle">Compute-optimal</p>
            <dl className="dlb-dl">
              <div>
                <dt>Parameters N</dt>
                <dd className="num">{human(r.opt.n)}</dd>
              </div>
              <div>
                <dt>Tokens D</dt>
                <dd className="num">{human(r.opt.d)}</dd>
              </div>
              <div>
                <dt>Tokens per parameter</dt>
                <dd className="num">{r.opt.ratio.toFixed(0)}</dd>
              </div>
              <div>
                <dt>Predicted loss</dt>
                <dd className="num">{r.opt.loss.toFixed(3)}</dd>
              </div>
              <div>
                <dt>GPU-hours</dt>
                <dd className="num">{human(r.planOpt.gpuHours)}</dd>
              </div>
              <div>
                <dt>Days on {gpus.toLocaleString('en-US')} GPUs</dt>
                <dd className="num">{days(r.planOpt.wallDays)}</dd>
              </div>
              <div>
                <dt>Example cost</dt>
                <dd className="num">{usd(r.planOpt.cost)}</dd>
              </div>
              <div>
                <dt>Serving per token</dt>
                <dd className="num">2N = {sci(inferFlops(r.opt.n, 1))} FLOPs</dd>
              </div>
            </dl>
          </div>

          <div className="dlb-card dlb-alt">
            <p className="dlb-cardtitle">Over-trained alternative, same loss</p>
            <div className="dlb-row dlb-tight" role="group" aria-label="Size of the smaller model">
              {FRACTIONS.map((x, i) => (
                <button key={x.f} type="button" className="dlb-chip" aria-pressed={fi === i} onClick={() => setFi(i)}>
                  {x.label}
                </button>
              ))}
            </div>
            {r.alt ? (
              <dl className="dlb-dl">
                <div>
                  <dt>Parameters N</dt>
                  <dd className="num">{human(r.alt.n)}</dd>
                </div>
                <div>
                  <dt>Tokens D</dt>
                  <dd className="num">{human(r.alt.d)}</dd>
                </div>
                <div>
                  <dt>Tokens per parameter</dt>
                  <dd className="num">{r.alt.ratio.toFixed(0)}</dd>
                </div>
                <div>
                  <dt>Training FLOPs vs optimal</dt>
                  <dd className="num">{r.alt.trainMultiple.toFixed(2)}x</dd>
                </div>
                <div>
                  <dt>GPU-hours</dt>
                  <dd className="num">{human(r.planAlt!.gpuHours)}</dd>
                </div>
                <div>
                  <dt>Days on {gpus.toLocaleString('en-US')} GPUs</dt>
                  <dd className="num">{days(r.planAlt!.wallDays)}</dd>
                </div>
                <div>
                  <dt>Example cost</dt>
                  <dd className="num">{usd(r.planAlt!.cost)}</dd>
                </div>
                <div>
                  <dt>Serving per token</dt>
                  <dd className="num">{Math.round(fraction * 100)}% of optimal</dd>
                </div>
              </dl>
            ) : (
              <p className="dlb-note">Not reachable at this size.</p>
            )}
            <p className="dlb-note">
              Trained on the same budget instead, this smaller model would reach loss {r.same.loss.toFixed(3)}, against {r.opt.loss.toFixed(3)} for the optimal one.
            </p>
          </div>
        </div>

        {r.alt && (
          <div className="dlb-serve">
            <label className="field">
              <span>
                Tokens the model will serve in its lifetime <b>{sci(r.tokens)}</b>
              </span>
              <input type="range" min={9} max={15} step={0.1} value={served} aria-label="Lifetime served tokens on a log scale" onChange={(e) => setServed(+e.target.value)} />
            </label>
            <p className="dlb-verdict" aria-live="polite">
              Training plus serving, in FLOPs: optimal {sci(lifeOpt)}, over-trained {sci(lifeAlt)}.{' '}
              <b>{altWins ? 'The smaller model is cheaper overall.' : 'The compute-optimal model is cheaper overall.'}</b> The break-even is about {sci(r.breakEven)} served tokens.
            </p>
          </div>
        )}

        {warns.length > 0 && (
          <ul className="dlb-warns">
            {warns.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        <div className="dlb-charts">
          <figure className="dlb-fig">
            <figcaption className="dlb-figcap">Loss against compute</figcaption>
            <Chart
              label={`Predicted loss against training compute from ${sci(Math.pow(10, lc - 3))} to ${sci(Math.pow(10, lc + 3))} FLOPs. The compute-optimal curve falls steadily. A model a fraction of the optimal size flattens out above it.`}
              xTitle="training FLOPs"
              xDomain={[lc - 3, lc + 3]}
              yDomain={[yBottom, yTop]}
              xTicks={tickSet(lc - 3, lc + 3)}
              yTicks={yTicks(yBottom, yTop)}
              series={[
                { id: 'frontier', cls: 'dlb-l-opt', pts: frontier },
                { id: 'small', cls: 'dlb-l-alt', pts: small },
              ]}
              marks={[
                { id: 'a', cls: 'dlb-m-opt', at: [lc, r.opt.loss] },
                { id: 'b', cls: 'dlb-m-alt', at: [lc, r.same.loss] },
              ]}
            />
            <p className="dlb-legend">
              <span className="dlb-key dlb-k-opt" /> best N and D at each budget <span className="dlb-key dlb-k-alt" /> a fixed {human(r.opt.n * fraction)}-parameter model trained longer
            </p>
          </figure>
          <figure className="dlb-fig">
            <figcaption className="dlb-figcap">Loss against model size at this budget</figcaption>
            <Chart
              label={`Predicted loss against model size at a fixed budget of ${sci(c)} FLOPs, from ${human(r.opt.n / 31)} to ${human(r.opt.n * 31)} parameters. A shallow bowl with its minimum at ${human(r.opt.n)}.`}
              xTitle="parameters N, tokens D = C / 6N"
              xDomain={[log10(r.opt.n) - 1.5, log10(r.opt.n) + 1.5]}
              yDomain={[bowlBottom, bowlTop + 0.01]}
              xTicks={range(log10(r.opt.n) - 1.5, log10(r.opt.n) + 1.5, 7).map((v) => ({ v, label: human(Math.pow(10, v)) }))}
              yTicks={yTicks(bowlBottom, bowlTop)}
              series={[{ id: 'bowl', cls: 'dlb-l-opt', pts: bowl }]}
              marks={[
                { id: 'a', cls: 'dlb-m-opt', at: [log10(r.opt.n), r.opt.loss] },
                { id: 'b', cls: 'dlb-m-alt', at: [log10(r.opt.n * fraction), r.same.loss] },
              ]}
            />
            <p className="dlb-legend">
              <span className="dlb-key dlb-k-opt" /> compute-optimal size <span className="dlb-key dlb-k-alt" /> the smaller model at the same budget
            </p>
          </figure>
        </div>

        <p className="viz-cap">
          Example only. The prices, utilisation and GPU counts are placeholders to replace with your own. Training FLOPs use C = 6ND; serving uses 2N per token. The fits describe dense transformers trained once over new text: they say nothing about repeated data, mixture-of-experts models, data quality or benchmark scores, and the two fits disagree with each other, which is the point of showing both. Peak speeds are NVIDIA's dense BF16 figures (the larger headline numbers on its pages assume sparsity).
        </p>
      </div>
    </Root>
  );
}
