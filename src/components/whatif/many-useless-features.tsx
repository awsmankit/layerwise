import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { MAX_NOISE, N_TRAIN, REAL, REPEATS, STEPS, curve } from '../../lib/whatif/many-useless-features';

const W = 340;
const L = 40;
const R = W - 12;
const T = 14;
const B = 150;
const CELL = 8.5;
const PER_ROW = 40;
const GREEN = '#1f9d6b';
const RED = '#d6453d';
const FLEX = '#d6453d';
const SIMPLE = '#1f9d6b';

const q = (v: number) => Math.round(v * 10) / 10;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const xOf = (n: number) => q(L + (n / MAX_NOISE) * (R - L));
const yOf = (acc: number) => q(B - ((Math.max(0.5, acc) - 0.5) / 0.5) * (B - T));

/**
 * A toy table of 30 rows where 2 columns carry the signal. Add random columns and score two models on fresh rows.
 * The top figure is every column the models see (green = real, grey = useless); the chart is the score against the number added.
 */
export default function ManyUselessFeaturesWhatIf() {
  const [on, setOn] = useState(true);
  const [idx, setIdx] = useState(8);
  const pts = useMemo(() => curve(STEPS, REPEATS), []);

  const shownIdx = on ? 0 : idx;
  const p = pts[shownIdx];
  const noise = p.noise;
  const total = REAL + noise;
  const nnPath = pts.slice(0, shownIdx + 1).map((c, i) => `${i === 0 ? 'M' : 'L'}${xOf(c.noise)} ${yOf(c.nn)}`).join(' ');
  const lassoPath = pts.slice(0, shownIdx + 1).map((c, i) => `${i === 0 ? 'M' : 'L'}${xOf(c.noise)} ${yOf(c.lasso)}`).join(' ');
  const rows = Math.ceil((REAL + MAX_NOISE) / PER_ROW);
  const gridH = rows * CELL;
  const H = 24 + gridH + 28 + 20 + B + 40;

  return (
    <WhatIfFrame
      title="30 examples, 2 columns that matter, and a pile of random ones"
      withLabel="Only the 2 real columns"
      withoutLabel="Add useless columns"
      on={on}
      onChange={setOn}
      verdict={
        noise === 0 ? (
          <>
            With just the 2 real columns, copying the closest example scores <b>{pct(p.nn)}</b> on new rows and the regularised linear model {pct(p.lasso)}. Slide to add random columns.
          </>
        ) : (
          <>
            With {noise} useless columns added, copying the closest example falls to <b>{pct(p.nn)}</b> (a coin flip is 50%). The regularised model still gets <b>{pct(p.lasso)}</b>.
          </>
        )
      }
      controls={
        <label className="field">
          <span>
            Useless columns added <b>{noise}</b>
          </span>
          <input
            type="range"
            min={0}
            max={STEPS.length - 1}
            step={1}
            value={shownIdx}
            onChange={(e) => {
              setIdx(+e.target.value);
              setOn(false);
            }}
            aria-label="How many columns of random numbers to add, from 0 to 500"
            aria-valuetext={`${noise} useless columns`}
          />
        </label>
      }
    >
      <div className="wm-fig">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="dx-svg wi-svg wm-svg wm-svg-lg"
          role="img"
          aria-label={`The model sees ${total} columns: 2 real and ${noise} useless. Scores on new rows: copying the closest example ${pct(p.nn)}, regularised linear model ${pct(p.lasso)}.`}
        >
          <text x={0} y={14} className="wm-tb">Columns the model sees: {total}</text>
          {Array.from({ length: REAL + MAX_NOISE }, (_, i) => {
            const real = i < REAL;
            const visible = real || i - REAL < noise;
            return (
              <rect
                key={i}
                x={q((i % PER_ROW) * CELL + 1)}
                y={q(24 + Math.floor(i / PER_ROW) * CELL)}
                width={7}
                height={7}
                rx={1.5}
                className="wm-cell"
                fill={real ? GREEN : 'var(--ink)'}
                opacity={real ? 1 : visible ? 0.3 : 0.06}
              />
            );
          })}
          <text x={0} y={q(24 + gridH + 14)} className="wm-t-good">green = the 2 real columns</text>
          <text x={W} y={q(24 + gridH + 14)} textAnchor="end" className="wm-t">grey = random numbers</text>
          <g transform={`translate(0 ${q(24 + gridH + 28)})`}>
            <text x={0} y={12} className="wm-tb">Score on 250 new rows</text>
            <g transform="translate(0 20)">
              {[0.5, 0.75, 1].map((v) => (
                <g key={v}>
                  <line x1={L} x2={R} y1={yOf(v)} y2={yOf(v)} className="wm-grid" />
                  <text x={L - 5} y={yOf(v) + 4} textAnchor="end" className="wm-t">{Math.round(v * 100)}%</text>
                </g>
              ))}
              <line x1={L} x2={R} y1={B} y2={B} className="wm-axl" />
              {[0, 100, 200, 300, 400, 500].map((n) => (
                <text key={n} x={xOf(n)} y={B + 16} textAnchor="middle" className="wm-t">{n}</text>
              ))}
              <text x={q((L + R) / 2)} y={B + 33} textAnchor="middle" className="wm-t">useless columns added</text>
              <path d={nnPath} fill="none" stroke={FLEX} strokeWidth={2.4} strokeLinejoin="round" />
              <path d={lassoPath} fill="none" stroke={SIMPLE} strokeWidth={2.4} strokeLinejoin="round" strokeDasharray="6 3" />
              <motion.circle r={5} fill={FLEX} initial={false} animate={{ cx: xOf(noise), cy: yOf(p.nn) }} transition={{ duration: 0.6, ease: EASE }} />
              <motion.rect width={9} height={9} x={-4.5} y={-4.5} fill={SIMPLE} initial={false} animate={{ x: xOf(noise) - 4.5, y: yOf(p.lasso) - 4.5 }} transition={{ duration: 0.6, ease: EASE }} />
            </g>
          </g>
        </svg>
      </div>
      <ul className="wm-legend" aria-label="Key">
        <li><span className="wm-sw is-round" style={{ background: FLEX }} /> flexible: copy the closest example</li>
        <li><span className="wm-sw" style={{ background: SIMPLE }} /> simple and regularised (L1 linear)</li>
      </ul>
      <div className="wm-meters">
        <div className="wm-meter">
          <span>Copy the closest</span>
          <div className="wm-track"><motion.div className={`wm-fill${p.nn < 0.8 ? ' is-bad' : ''}`} initial={false} animate={{ width: `${p.nn * 100}%` }} transition={{ duration: 0.5, ease: EASE }} /></div>
          <b>{pct(p.nn)}</b>
        </div>
        <div className="wm-meter">
          <span>Regularised linear</span>
          <div className="wm-track"><motion.div className="wm-fill" initial={false} animate={{ width: `${p.lasso * 100}%` }} transition={{ duration: 0.5, ease: EASE }} /></div>
          <b>{pct(p.lasso)}</b>
        </div>
      </div>
      <ul className="wm-nums">
        <li>
          <b>{noise === 0 ? '0' : (Math.round(p.keptNoise * 10) / 10).toFixed(1)}</b>
          useless columns the regularised model kept (average)
        </li>
        <li>
          <b>{N_TRAIN} rows, {total} columns</b>
          training table
        </li>
      </ul>
      <p className="wm-foot">
        Toy data, made up for this demo: {N_TRAIN} training rows in two balanced classes; the 2 real columns sit 3 units apart between classes with spread 1; the other columns are random numbers with no link to the class. Scores are averages over {REPEATS} seeded repeats on 250 fresh rows each. The regularised model is a linear model with an L1 (lasso) penalty set by a standard rule of thumb, not tuned on the test rows. The signal here is strong; a weaker one would need more training rows before any method could find it.
      </p>
    </WhatIfFrame>
  );
}
