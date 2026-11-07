import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { MISS_HEALTHY, STRATEGIES, compare, type Strategy } from '../../lib/whatif/missing-values';

const W = 340;
const X0 = 30; // pixel for x = -3.5
const X1 = 250; // pixel for x = 3.5
const COL = 296; // centre of the "missing" column
const LANE_SICK = 72;
const LANE_OK = 152;
const BLUE = '#3b6fd8';
const ORANGE = '#e08a1e';
const SHOWN = 150;

const q = (v: number) => Math.round(v * 10) / 10;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const sx = (x: number) => q(X0 + ((Math.max(-3.5, Math.min(3.5, x)) + 3.5) / 7) * (X1 - X0));
const names: Record<Strategy, string> = { drop: 'Drop the rows', mean: 'Fill with the mean', flag: 'Fill + missing flag' };

/**
 * A made-up follow-up screening example. The test result x is missing much more often for people who need follow-up,
 * so the gaps carry information. Dots are people; dots in the right column have no x. The dashed line is where the
 * model starts saying "follow-up" for people whose x we do have.
 */
export default function MissingValuesWhatIf() {
  const [strategy, setStrategy] = useState<Strategy>('flag');
  const [missPct, setMissPct] = useState(60);

  const run = useMemo(() => compare(missPct / 100), [missPct]);
  const cur = run.out[strategy];
  const r = cur.result;
  const m = cur.model;
  const rows = useMemo(() => run.trainRows.slice(0, SHOWN), [run]);
  const threshold = -m.w[0] / m.w[1];
  const missRate = missPct / 100;
  const informative = missRate - MISS_HEALTHY > 0.15;

  const dot = (row: (typeof rows)[number], i: number) => {
    const lane = row.y === 1 ? LANE_SICK : LANE_OK;
    const jy = ((i * 37) % 19) - 9;
    const cy = q(lane + jy * 3);
    if (!row.missing) return { cx: sx(row.x), cy, opacity: 0.85, ring: false };
    const colx = q(COL + (((i * 13) % 7) - 3) * 7);
    if (strategy === 'drop') return { cx: colx, cy, opacity: 0.12, ring: false };
    if (strategy === 'mean') return { cx: sx(m.fill), cy, opacity: 0.9, ring: true };
    return { cx: colx, cy, opacity: 1, ring: true };
  };

  const verdict =
    strategy === 'drop' ? (
      <>
        Dropping rows throws away {pct(m.dropped.all)} of the people, but {pct(m.dropped.sick)} of those who need follow-up against {pct(m.dropped.healthy)} of the rest. The model catches only <b>{pct(r.recall)}</b> of the people who need it and flags {Math.abs(Math.round(r.bias))} points fewer than it should. Accuracy {pct(r.accuracy)}.
      </>
    ) : strategy === 'mean' ? (
      <>
        Filling with the mean ({m.fill.toFixed(1)}) keeps every row but makes a missing result look ordinary. The model catches <b>{pct(r.recall)}</b> of the people who need follow-up and its weight on x shrinks to {m.w[1].toFixed(1)} (it was {run.referenceWeight.toFixed(1)} with nothing hidden). Accuracy {pct(r.accuracy)}.
      </>
    ) : (
      <>
        With a missing flag the model learns that a missing result usually means follow-up: it says {pct(r.pMissing)} for those people. It catches <b>{pct(r.recall)}</b> and is {pct(r.accuracy)} accurate, even higher than the {pct(run.referenceResult.accuracy)} of a model that saw every x.
      </>
    );

  return (
    <WhatIfFrame
      title="A made-up screening test with gaps"
      withLabel="Fill + missing flag"
      withoutLabel="Careless handling"
      on={strategy === 'flag'}
      onChange={(on) => setStrategy(on ? 'flag' : strategy === 'flag' ? 'drop' : strategy)}
      verdict={
        <>
          {verdict}
          {!informative && <> Here the gaps hardly depend on the outcome, so all three ways tie.</>}
        </>
      }
      controls={
        <div className="wm-controls">
          <div className="wm-picks" role="group" aria-label="How to handle a missing value">
            <span className="wm-picks-label">Handle a missing value by</span>
            {STRATEGIES.map((s) => (
              <button key={s} type="button" className={`wm-pick${strategy === s ? ' is-on' : ''}`} aria-pressed={strategy === s} onClick={() => setStrategy(s)}>
                {names[s]}
              </button>
            ))}
          </div>
          <label className="field">
            <span>
              Result missing for people who need follow-up <b>{missPct}%</b>
            </span>
            <input type="range" min={10} max={80} step={10} value={missPct} onChange={(e) => setMissPct(+e.target.value)} aria-label="How often the test result is missing for people who need follow-up. For everyone else it is missing 10 percent of the time" />
          </label>
        </div>
      }
    >
      <div className="wm-fig">
        <svg
          viewBox={`0 0 ${W} 250`}
          className="dx-svg wi-svg wm-svg wm-svg-lg"
          role="img"
          aria-label={`${SHOWN} people drawn as dots by test result. People who need follow-up are in the top row, the rest in the bottom row. A column on the right holds people whose result is missing. With the method ${names[strategy]}, accuracy is ${pct(r.accuracy)} and ${pct(r.recall)} of the people who need follow-up are caught.`}
        >
          <rect x={0.5} y={0.5} width={W - 1} height={249} rx={8} className="wm-frame" />
          <rect x={q(COL - 30)} y={8} width={60} height={196} rx={8} fill={strategy === 'flag' ? ORANGE : 'var(--ink)'} opacity={strategy === 'flag' ? 0.16 : 0.05} className="wm-cell" />
          <text x={COL} y={24} textAnchor="middle" className="wm-tb">no result</text>
          <text x={X0} y={24} className="wm-tb">Needs follow-up</text>
          <text x={X0} y={q(LANE_OK - 38)} className="wm-tb">Does not</text>
          <line x1={X0 - 6} x2={X1 + 6} y1={LANE_SICK + 38} y2={LANE_SICK + 38} className="wm-grid" />
          <motion.line y1={32} y2={206} initial={false} animate={{ x1: sx(threshold), x2: sx(threshold) }} transition={{ duration: 0.6, ease: EASE }} stroke="var(--ink)" strokeWidth={1.6} strokeDasharray="5 4" />
          <text x={X0} y={222} className="wm-t">low x</text>
          <text x={X1} y={222} textAnchor="end" className="wm-t">high x</text>
          <text x={q(W / 2)} y={242} textAnchor="middle" className="wm-t">dashed line: the model says &ldquo;follow-up&rdquo; to its right</text>
          {rows.map((row, i) => {
            const d = dot(row, i);
            const color = row.y === 1 ? ORANGE : BLUE;
            return (
              <motion.circle
                key={i}
                r={3.6}
                initial={false}
                animate={{ cx: d.cx, cy: d.cy, opacity: d.opacity }}
                transition={{ duration: 0.7, ease: EASE }}
                fill={d.ring ? 'var(--surface)' : color}
                stroke={color}
                strokeWidth={d.ring ? 2 : 0}
              />
            );
          })}
        </svg>
      </div>
      <ul className="wm-legend" aria-label="Key">
        <li><span className="wm-sw is-round" style={{ background: ORANGE }} /> needs follow-up</li>
        <li><span className="wm-sw is-round" style={{ background: BLUE }} /> does not</li>
        <li><span className="wm-sw is-round is-ring" style={{ color: 'var(--ink)' }} /> result was filled in</li>
      </ul>
      <div className="wm-meters">
        <p className="wm-h">
          Accuracy on 4,000 new people
          <small>they have gaps in the same pattern</small>
        </p>
        {STRATEGIES.map((s) => (
          <div key={s} className={`wm-meter${s === strategy ? ' is-top' : ''}`}>
            <span>{names[s]}</span>
            <div className="wm-track"><motion.div className={`wm-fill${run.out[s].result.accuracy < 0.75 ? ' is-bad' : ''}`} initial={false} animate={{ width: `${run.out[s].result.accuracy * 100}%` }} transition={{ duration: 0.5, ease: EASE }} /></div>
            <b>{pct(run.out[s].result.accuracy)}</b>
          </div>
        ))}
        <p className="wm-h">
          People who need follow-up that it catches
        </p>
        {STRATEGIES.map((s) => (
          <div key={s} className={`wm-meter${s === strategy ? ' is-top' : ''}`}>
            <span>{names[s]}</span>
            <div className="wm-track"><motion.div className={`wm-fill${run.out[s].result.recall < 0.6 ? ' is-bad' : ''}`} initial={false} animate={{ width: `${run.out[s].result.recall * 100}%` }} transition={{ duration: 0.5, ease: EASE }} /></div>
            <b>{pct(run.out[s].result.recall)}</b>
          </div>
        ))}
      </div>
      <ul className="wm-nums">
        <li className={r.bias < -8 ? 'is-lit' : ''}>
          <b>
            {r.bias > 0 ? '+' : ''}
            {Math.round(r.bias)} points
          </b>
          bias: people flagged minus people who truly need it
        </li>
        <li>
          <b>{pct(r.accuracyMissing)}</b>
          accuracy on people whose result is missing
        </li>
      </ul>
      <p className="wm-foot">
        Toy data, made up for this demo: 400 people, 40% need follow-up; their x averages +1 and everyone else&rsquo;s -1. A result is missing for {missPct}% of those who need follow-up and {Math.round(MISS_HEALTHY * 100)}% of the rest. The model is a small logistic regression. Dropping rows also means the model has no answer for a new person with a gap, so it gives the common answer it saw.
      </p>
    </WhatIfFrame>
  );
}

