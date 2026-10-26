import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE, fmt } from './shared';

// Example price points per million tokens, for illustration only.
const presets = {
  small: { label: 'Small model (example)', input: 0.25, output: 1.25 },
  mid: { label: 'Mid-tier model (example)', input: 3, output: 15 },
  large: { label: 'Large model (example)', input: 15, output: 75 },
} as const;

type P = {
  reqPerDay: number;
  inTok: number;
  outTok: number;
  pIn: number;
  pOut: number;
  cacheShare: number; // fraction of input tokens served from cache
  cacheDisc: number; // discount on cached input tokens
  batchShare: number; // fraction of traffic that can run as batch
  batchDisc: number;
};

function perRequest(p: P) {
  const input = (p.inTok / 1e6) * p.pIn * (1 - p.cacheShare * p.cacheDisc);
  const output = (p.outTok / 1e6) * p.pOut;
  const f = 1 - p.batchShare * p.batchDisc;
  return { input: input * f, output: output * f, total: (input + output) * f };
}

export default function CostCalculator() {
  const [p, setP] = useState<P>({
    reqPerDay: 20000,
    inTok: 3000,
    outTok: 400,
    pIn: presets.mid.input,
    pOut: presets.mid.output,
    cacheShare: 0,
    cacheDisc: 0.9,
    batchShare: 0,
    batchDisc: 0.5,
  });
  const set = <K extends keyof P>(k: K, v: P[K]) => setP((s) => ({ ...s, [k]: v }));

  const base = perRequest(p);
  const monthly = base.total * p.reqPerDay * 30;
  const daily = base.total * p.reqPerDay;
  const outShare = base.total > 0 ? base.output / base.total : 0;

  const scenarios = [
    { name: 'As configured', cost: base.total },
    { name: 'Trim output by 30%', cost: perRequest({ ...p, outTok: p.outTok * 0.7 }).total },
    { name: 'Cache 80% of input', cost: perRequest({ ...p, cacheShare: 0.8 }).total },
    { name: 'Move half to batch', cost: perRequest({ ...p, batchShare: 0.5 }).total },
    {
      name: 'Route 70% to small model',
      cost: 0.3 * base.total + 0.7 * perRequest({ ...p, pIn: presets.small.input, pOut: presets.small.output }).total,
    },
  ];
  const max = Math.max(...scenarios.map((s) => s.cost), 1e-9);

  const num = (k: keyof P, label: string, step = 1, min = 0) => (
    <label className="field">
      <span>{label}</span>
      <input type="number" min={min} step={step} value={p[k]} onChange={(e) => set(k, Math.max(min, +e.target.value || 0) as P[typeof k])} />
    </label>
  );

  return (
    <Root>
      <div className="viz cc">
        <div className="cc-presets" role="group" aria-label="Price presets">
          {Object.entries(presets).map(([k, v]) => (
            <button
              key={k}
              type="button"
              className={`tc-tab${p.pIn === v.input && p.pOut === v.output ? ' is-active' : ''}`}
              onClick={() => setP((s) => ({ ...s, pIn: v.input, pOut: v.output }))}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="viz-controls">
          {num('reqPerDay', 'Requests per day', 1000)}
          {num('inTok', 'Input tokens per request', 100)}
          {num('outTok', 'Output tokens per request', 50)}
          {num('pIn', 'Input price per 1M tokens ($)', 0.05)}
          {num('pOut', 'Output price per 1M tokens ($)', 0.05)}
          <label className="field">
            <span>
              Input served from cache <b>{Math.round(p.cacheShare * 100)}%</b>
            </span>
            <input type="range" min={0} max={1} step={0.05} value={p.cacheShare} onChange={(e) => set('cacheShare', +e.target.value)} />
          </label>
          <label className="field">
            <span>
              Cached input discount <b>{Math.round(p.cacheDisc * 100)}%</b>
            </span>
            <input type="range" min={0} max={0.95} step={0.05} value={p.cacheDisc} onChange={(e) => set('cacheDisc', +e.target.value)} />
          </label>
          <label className="field">
            <span>
              Traffic that can run as batch <b>{Math.round(p.batchShare * 100)}%</b>
            </span>
            <input type="range" min={0} max={1} step={0.05} value={p.batchShare} onChange={(e) => set('batchShare', +e.target.value)} />
          </label>
          <label className="field">
            <span>
              Batch discount <b>{Math.round(p.batchDisc * 100)}%</b>
            </span>
            <input type="range" min={0} max={0.9} step={0.05} value={p.batchDisc} onChange={(e) => set('batchDisc', +e.target.value)} />
          </label>
        </div>

        <dl className="rl-readout cc-readout">
          <div>
            <dt>Per request</dt>
            <dd className="num">{fmt.usd(base.total)}</dd>
          </div>
          <div>
            <dt>Per day</dt>
            <dd className="num">{fmt.usd(daily)}</dd>
          </div>
          <div className="cc-big">
            <dt>Per month (30 days)</dt>
            <dd className="num">{fmt.usd(monthly)}</dd>
          </div>
          <div>
            <dt>Output share of cost</dt>
            <dd className="num">{Math.round(outShare * 100)}%</dd>
          </div>
        </dl>

        <div className="cc-split" role="img" aria-label={`Input ${fmt.usd(base.input)}, output ${fmt.usd(base.output)} per request`}>
          <motion.span className="cc-in" initial={false} animate={{ flexGrow: (1 - outShare) * 100 }} transition={{ duration: 0.4, ease: EASE }}>
            input
          </motion.span>
          <motion.span className="cc-out" initial={false} animate={{ flexGrow: outShare * 100 }} transition={{ duration: 0.4, ease: EASE }}>
            output
          </motion.span>
        </div>

        <p className="viz-title cc-what">What if you changed one thing</p>
        <ul className="cc-bars">
          {scenarios.map((s, i) => {
            const saving = base.total > 0 ? 1 - s.cost / base.total : 0;
            return (
              <li key={s.name}>
                <span className="cc-bar-name">{s.name}</span>
                <span className="cc-bar-track">
                  <motion.span className={i === 0 ? 'base' : ''} initial={false} animate={{ scaleX: s.cost / max }} transition={{ duration: 0.45, ease: EASE }} />
                </span>
                <span className="cc-bar-val num">
                  {fmt.usd(s.cost * p.reqPerDay * 30)}
                  {i > 0 && saving > 0.0005 && <em>-{Math.round(saving * 100)}%</em>}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="viz-cap">
          Prices are example price points, not current list prices: check your provider’s pricing page before relying on any number. Cache writes can carry a premium on some platforms and cached reads expire, so treat the cache slider as a best case.
        </p>
      </div>
    </Root>
  );
}
