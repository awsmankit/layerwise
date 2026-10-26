import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE, fmt } from './shared';
import { apiMonthly, breakEvenTokens, nodeCapacity, nodeMonthly, nodesNeeded, selfMonthly, selfPerMillion, type BreakEvenInput } from '../../lib/breakeven';

const tokens = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(0)}M` : fmt.int(n));
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

const W = 640;
const H = 290;
const PAD = { l: 64, r: 16, t: 16, b: 40 };

export default function BreakEven() {
  const [i, setI] = useState<BreakEvenInput>({ gpuHourly: 4, gpus: 1, throughput: 2500, util: 0.4, apiPrice: 4, overhead: 3000 });
  const [volFrac, setVolFrac] = useState(0.5);
  const set = <K extends keyof BreakEvenInput>(k: K, v: number) => setI((s) => ({ ...s, [k]: v }));

  const be = breakEvenTokens(i);
  const cap = nodeCapacity(i);
  const xMax = Math.max(be ? be * 2.2 : cap * 3, cap * 1.5, 1e8);
  const volume = xMax * volFrac;

  const api = apiMonthly(i, volume);
  const self = selfMonthly(i, volume);
  const nodes = nodesNeeded(i, volume);
  const perM = selfPerMillion(i);

  const chart = useMemo(() => {
    const yMax = Math.max(apiMonthly(i, xMax), selfMonthly(i, xMax), 1) * 1.08;
    const x = (t: number) => PAD.l + (t / xMax) * (W - PAD.l - PAD.r);
    const y = (c: number) => H - PAD.b - (c / yMax) * (H - PAD.t - PAD.b);
    const nTotal = nodesNeeded(i, xMax);
    let d = `M ${x(0)} ${y(0)}`;
    if (nTotal > 0 && nTotal <= 80 && cap > 0) {
      for (let n = 1; n <= nTotal; n++) {
        const cost = n * nodeMonthly(i) + i.overhead;
        d += ` L ${x((n - 1) * cap)} ${y(cost)} L ${x(Math.min(n * cap, xMax))} ${y(cost)}`;
      }
    } else {
      d += ` L ${x(xMax)} ${y(selfMonthly(i, xMax))}`;
    }
    const line = `M ${x(0)} ${y(0)} L ${x(xMax)} ${y(apiMonthly(i, xMax))}`;
    return { d, line, x, y, yMax };
  }, [i, xMax, cap]);

  const num = (k: keyof BreakEvenInput, label: string, step: number, min = 0) => (
    <label className="field">
      <span>{label}</span>
      <input type="number" min={min} step={step} value={i[k]} onChange={(e) => set(k, Math.max(min, +e.target.value || 0))} />
    </label>
  );

  return (
    <Root>
      <div className="viz be">
        <div className="viz-controls">
          {num('gpuHourly', 'Cost per GPU per hour ($, example)', 0.25)}
          {num('gpus', 'GPUs per serving node', 1, 1)}
          {num('throughput', 'Tokens per second per node when busy', 100, 1)}
          <label className="field">
            <span>
              Average utilisation <b>{Math.round(i.util * 100)}%</b>
            </span>
            <input type="range" min={0.05} max={0.95} step={0.05} value={i.util} onChange={(e) => set('util', +e.target.value)} />
          </label>
          {num('apiPrice', 'API price per million tokens ($, blended example)', 0.25)}
          {num('overhead', 'Monthly people and tooling cost ($, example)', 500)}
        </div>

        <dl className="rl-readout be-readout">
          <div>
            <dt>Self-hosted GPU cost per million tokens</dt>
            <dd className="num">{isFinite(perM) ? `$${perM.toFixed(2)}` : '-'}</dd>
          </div>
          <div>
            <dt>API price per million tokens</dt>
            <dd className="num">${i.apiPrice.toFixed(2)}</dd>
          </div>
          <div className="cc-big">
            <dt>Break-even volume per month</dt>
            <dd className="num">{be ? tokens(be) + ' tokens' : 'never at these numbers'}</dd>
          </div>
          <div>
            <dt>One node serves, per month</dt>
            <dd className="num">{tokens(cap)} tokens</dd>
          </div>
        </dl>

        <svg viewBox={`0 0 ${W} ${H}`} className="be-chart" role="img" aria-label="Monthly cost of the API and of self-hosting as monthly token volume grows">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={chart.y(chart.yMax * t)} y2={chart.y(chart.yMax * t)} stroke="var(--line-soft)" />
              <text x={PAD.l - 8} y={chart.y(chart.yMax * t) + 4} textAnchor="end" className="be-ax">
                {usd(chart.yMax * t)}
              </text>
              <text x={chart.x(xMax * t)} y={H - PAD.b + 18} textAnchor="middle" className="be-ax">
                {tokens(xMax * t)}
              </text>
            </g>
          ))}
          <motion.path d={chart.line} fill="none" stroke="var(--signal)" strokeWidth={2.4} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: EASE }} />
          <path d={chart.d} fill="none" stroke="var(--warn)" strokeWidth={2.4} strokeLinejoin="round" />
          {be && be < xMax && (
            <g>
              <line x1={chart.x(be)} x2={chart.x(be)} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink)" strokeDasharray="4 4" />
              <circle cx={chart.x(be)} cy={chart.y(apiMonthly(i, be))} r={5} fill="var(--cost)" stroke="var(--ink)" strokeWidth={1.5} />
            </g>
          )}
          <line x1={chart.x(volume)} x2={chart.x(volume)} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink-3)" />
          <text x={W - PAD.r} y={PAD.t + 10} textAnchor="end" className="be-key api">
            API
          </text>
          <text x={W - PAD.r} y={PAD.t + 26} textAnchor="end" className="be-key self">
            Self-hosted (whole servers)
          </text>
        </svg>

        <label className="field be-slider">
          <span>
            Monthly volume <b>{tokens(volume)} tokens</b>
          </span>
          <input type="range" min={0.01} max={1} step={0.01} value={volFrac} onChange={(e) => setVolFrac(+e.target.value)} />
        </label>

        <dl className="rl-readout">
          <div>
            <dt>API at this volume</dt>
            <dd className="num">{usd(api)}</dd>
          </div>
          <div>
            <dt>
              Self-hosted: {nodes} node{nodes === 1 ? '' : 's'} plus overhead
            </dt>
            <dd className="num">{usd(self)}</dd>
          </div>
          <div className="cc-big">
            <dt>Cheaper at this volume</dt>
            <dd className="num">{api === self ? 'Tie' : api < self ? `API by ${usd(self - api)}` : `Self-hosting by ${usd(api - self)}`}</dd>
          </div>
        </dl>

        <p className="viz-cap">
          Every number is a placeholder example: replace them with your own quotes and measurements. Self-hosting is billed in whole servers whether busy or idle, which makes the red line a staircase. Utilisation is the share of time a server is doing useful work on average. If it is low enough that your GPUs cost more per token than the API, self-hosting never breaks even.
        </p>
      </div>
    </Root>
  );
}
