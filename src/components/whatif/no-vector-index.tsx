import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  ANN_EFFORT, BUDGET_MS, DIM, EXP_MAX, EXP_MIN, EXP_STEP, LINKS, annChecks, annMs, brutePastBudget, bruteChecks, bruteMs, crossover, fmtBytes, fmtCount, fmtTime, indexBytes, litCells, multiplyAdds, sizeFromExp, speedup,
} from '../../lib/whatif/no-vector-index';

const CELLS = 200;
const COLS = 25;
// chart geometry: x is log10(size) 2..9, y is log10(ms) -2..6
const W = 380;
const H = 240;
const L = 56;
const R = 12;
const T = 14;
const B = 36;
const YMIN = -2.6;
const YMAX = 6;
const r1 = (x: number) => Math.round(x * 10) / 10;
const px = (e: number) => L + ((e - EXP_MIN) / (EXP_MAX - EXP_MIN)) * (W - L - R);
const py = (ms: number) => T + (1 - (Math.log10(Math.max(1e-2, ms)) - YMIN) / (YMAX - YMIN)) * (H - T - B);
const exps = Array.from({ length: Math.round((EXP_MAX - EXP_MIN) / 0.25) + 1 }, (_, i) => EXP_MIN + i * 0.25);
const path = (f: (n: number) => number) => exps.map((e, i) => `${i ? 'L' : 'M'}${px(e).toFixed(1)} ${py(f(sizeFromExp(e))).toFixed(1)}`).join(' ');
const YTICKS = [
  { v: 0.01, l: '10 µs' },
  { v: 1, l: '1 ms' },
  { v: 100, l: '100 ms' },
  { v: 10000, l: '10 s' },
  { v: 1000000, l: '17 min' },
];

/**
 * Two lines on a log-log chart (scan time and index time against collection size) and a grid of squares that lights
 * up the share of the collection one search touches. The slider and the Grow button move the collection size.
 */
export default function NoVectorIndexWhatIf() {
  const [indexed, setIndexed] = useState(false);
  const [exp, setExp] = useState(6);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const n = sizeFromExp(exp);
  const cur = indexed ? annMs(n) : bruteMs(n);
  const checks = indexed ? annChecks(n) : bruteChecks(n);
  const lit = litCells(n, indexed, CELLS);
  const cross = crossover();
  const over = brutePastBudget();

  const grow = () => {
    if (timer.current) clearInterval(timer.current);
    let e = EXP_MIN;
    setExp(e);
    timer.current = setInterval(() => {
      e = Math.round((e + EXP_STEP) * 100) / 100;
      setExp(Math.min(e, EXP_MAX));
      if (e >= EXP_MAX && timer.current) clearInterval(timer.current);
    }, 280);
  };

  const verdict = indexed ? (
    <>
      With an index, one search checks {fmtCount(checks)} of the {fmtCount(n)} vectors and takes about {fmtTime(cur)} (example hardware).{' '}
      {speedup(n) >= 1 ? `That is ${speedup(n) >= 10 ? Math.round(speedup(n)).toLocaleString('en-US') : speedup(n).toFixed(1)} times faster than scanning everything.` : 'At this small size scanning everything would actually be faster.'}
    </>
  ) : (
    <>
      Without an index, one search checks all {fmtCount(checks)} vectors and takes about {fmtTime(cur)} (example hardware).{' '}
      {cur > BUDGET_MS ? `That is past the ${BUDGET_MS} ms budget.` : `That is still inside the ${BUDGET_MS} ms budget, which it leaves at about ${fmtCount(over)} vectors.`}
    </>
  );

  const cx = px(exp);
  return (
    <WhatIfFrame
      title="Searching a growing collection of embeddings"
      withLabel="With an index"
      withoutLabel="Scan everything"
      on={indexed}
      onChange={setIndexed}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Vectors stored <b>{fmtCount(n)}</b>
            </span>
            <input type="range" min={EXP_MIN} max={EXP_MAX} step={EXP_STEP} value={exp} onChange={(e) => { if (timer.current) clearInterval(timer.current); setExp(+e.target.value); }} aria-label="Number of vectors stored, from 100 to 1 billion" />
          </label>
          <button type="button" className="btn quiet" onClick={grow}>
            Grow it
          </button>
        </>
      }
    >
      <p className="wr-lead">
        Vector search finds the stored vectors closest to the question. The plain way is to compare against every one. An index jumps through links between nearby vectors and checks only a small neighbourhood, but it may miss a true neighbour.
      </p>
      <div className="wr-grid wr-chart" role="img" aria-label={`Each square stands for 0.5 percent of the collection. ${lit} of ${CELLS} squares are checked by one search, ${checks} of ${n} vectors.`} style={{ ['--cols' as string]: COLS }}>
        {Array.from({ length: CELLS }, (_, i) => (
          <motion.i key={i} className="wr-dot" initial={false} animate={{ opacity: i < lit ? 1 : 0.14, backgroundColor: i < lit ? (indexed ? '#1f9d6b' : '#d6453d') : 'rgba(128,128,128,1)' }} transition={{ duration: 0.4, ease: EASE, delay: Math.min(i, 60) * 0.004 }} />
        ))}
      </div>
      <p className="wr-note">Lit squares: the share of the collection that one search has to check ({lit} of {CELLS}).</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg wi-svg wr-chart" role="img" aria-label={`Search time against collection size on log scales. Scanning grows in a straight line, the index stays nearly flat. At ${fmtCount(n)} vectors: scan ${fmtTime(bruteMs(n))}, index ${fmtTime(annMs(n))}.`}>
        {YTICKS.map((t) => (
          <g key={t.l}>
            <line x1={L} x2={W - R} y1={py(t.v)} y2={py(t.v)} stroke="currentColor" strokeOpacity={0.15} />
            <text x={L - 5} y={py(t.v) + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>{t.l}</text>
          </g>
        ))}
        {[2, 3, 4, 5, 6, 7, 8, 9].map((e) => (
          <text key={e} x={px(e)} y={H - 22} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
            {['100', '1k', '10k', '100k', '1M', '10M', '100M', '1B'][e - 2]}
          </text>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>vectors stored</text>
        <line x1={L} x2={W - R} y1={py(BUDGET_MS)} y2={py(BUDGET_MS)} stroke="currentColor" strokeDasharray="5 4" strokeOpacity={0.7} />
        <text x={W - R - 2} y={py(BUDGET_MS) - 4} textAnchor="end" style={{ fill: 'var(--ink)', fontSize: 13 }}>100 ms budget</text>
        <path d={path(bruteMs)} fill="none" stroke="#d6453d" strokeWidth={indexed ? 2 : 3.5} strokeOpacity={indexed ? 0.5 : 1} />
        <path d={path(annMs)} fill="none" stroke="#1f9d6b" strokeWidth={indexed ? 3.5 : 2} strokeOpacity={indexed ? 1 : 0.5} strokeDasharray="7 3" />
        <text x={px(8.3)} y={py(bruteMs(sizeFromExp(8.3))) + 16} style={{ fill: 'var(--ink)', fontSize: 13 }} textAnchor="middle">scan all</text>
        <text x={px(8.3)} y={py(annMs(sizeFromExp(8.3))) - 7} style={{ fill: 'var(--ink)', fontSize: 13 }} textAnchor="middle">index</text>
        <line x1={cx} x2={cx} y1={T} y2={H - B} stroke="currentColor" strokeOpacity={0.5} />
        <motion.circle initial={false} animate={{ cx: r1(cx), cy: r1(py(bruteMs(n))) }} r={5} fill="#d6453d" stroke="var(--surface)" strokeWidth={1.5} transition={{ duration: 0.3, ease: EASE }} />
        <motion.circle initial={false} animate={{ cx: r1(cx), cy: r1(py(annMs(n))) }} r={5} fill="#1f9d6b" stroke="var(--surface)" strokeWidth={1.5} transition={{ duration: 0.3, ease: EASE }} />
      </svg>
      <ul className="wr-legend" aria-label="Key">
        <li><i className="wr-sw" style={{ background: '#d6453d' }} />scan all (solid line)</li>
        <li><i className="wr-sw" style={{ background: '#1f9d6b' }} />index (dashed line)</li>
      </ul>
      <p className="wr-note">
        Crossover: with these example rates the index starts to win at about {fmtCount(cross)} vectors. Below that, scanning is as fast or faster and needs nothing extra. A plain scan passes the {BUDGET_MS} ms budget at about {fmtCount(over)} vectors.
      </p>
      <details className="wr-details">
        <summary>Open the numbers</summary>
        <div className="wr-scroll">
          <table className="wr-table">
            <caption>At {fmtCount(n)} vectors of {DIM} numbers (example rates)</caption>
            <thead>
              <tr><th scope="col"> </th><th scope="col">scan all</th><th scope="col">index</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row">distance checks</th><td>{fmtCount(bruteChecks(n))}</td><td>{fmtCount(annChecks(n))}</td></tr>
              <tr><th scope="row">multiply-adds</th><td>{fmtCount(multiplyAdds(bruteChecks(n)))}</td><td>{fmtCount(multiplyAdds(annChecks(n)))}</td></tr>
              <tr><th scope="row">time</th><td>{fmtTime(bruteMs(n))}</td><td>{fmtTime(annMs(n))}</td></tr>
              <tr><th scope="row">extra memory</th><td>none</td><td>{fmtBytes(indexBytes(n))}</td></tr>
              <tr><th scope="row">exact?</th><td>yes</td><td>approximate</td></tr>
            </tbody>
          </table>
        </div>
        <p className="wr-note">
          Example rates, not benchmarks: {DIM} numbers of 4 bytes per vector; a scan reads memory at 20 GB per second on one core, so time is bytes divided by that; the index makes about {ANN_EFFORT} x log2(N) random checks at 0.5 microseconds each; links cost {LINKS} x 4 bytes per vector. Real figures depend on hardware, settings and data.
        </p>
      </details>
    </WhatIfFrame>
  );
}
