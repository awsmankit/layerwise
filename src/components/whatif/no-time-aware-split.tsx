import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { N, SHOWN_SEED, TEST_SHARE, averageRandomMae, expandingMae, makeSeries, randomSplit, score, timeSplit } from '../../lib/whatif/no-time-aware-split';

const W = 340;
const PL = 8;
const PR = W - 8;
const PT = 12;
const PB = 168;
const STRIP_Y = 196;
const STRIP_H = 18;
const BLUE = '#3b6fd8';
const ORANGE = '#e08a1e';
const RED = '#d6453d';
const MAX_ERR = 20; // bar length scale, in value units

const q = (v: number) => Math.round(v * 10) / 10;
const f1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const xOf = (t: number) => q(PL + ((t + 0.5) / N) * (PR - PL));

/**
 * A toy monthly series (trend + yearly cycle + noise). The model copies the average of the two nearest training months.
 * Shuffled split: test months sit between training months. Time split: test months are all in the future of the training months.
 */
export default function NoTimeAwareSplitWhatIf() {
  const [byTime, setByTime] = useState(true);
  const [trendTenths, setTrendTenths] = useState(3);
  const trend = trendTenths / 10;

  const y = useMemo(() => makeSeries(trend), [trend]);
  const timeSet = useMemo(() => timeSplit(), []);
  const randSet = useMemo(() => randomSplit(SHOWN_SEED), []);
  const honest = useMemo(() => score(y, timeSet), [y, timeSet]);
  const shuffled = useMemo(() => score(y, randSet), [y, randSet]);
  const avgShuffled = useMemo(() => averageRandomMae(y, 100), [y]);
  const folds = useMemo(() => expandingMae(y, 5), [y]);

  const split = byTime ? timeSet : randSet;
  const shown = byTime ? honest : shuffled;
  const guessOf = useMemo(() => new Map(shown.tests.map((t) => [t.t, t.guess])), [shown]);

  const lo = Math.floor((Math.min(...y) - 6) / 10) * 10;
  const hi = Math.ceil((Math.max(...y) + 6) / 10) * 10;
  const yOf = (v: number) => q(PB - ((v - lo) / (hi - lo)) * (PB - PT));
  const path = y.map((v, t) => `${t === 0 ? 'M' : 'L'}${xOf(t)} ${yOf(v)}`).join(' ');
  const ratio = honest.mae / shuffled.mae;
  const trainN = N - Math.round(N * TEST_SHARE);

  return (
    <WhatIfFrame
      title="Predicting a made-up monthly number, 8 years of it"
      withLabel="Split by time"
      withoutLabel="Shuffled split"
      on={byTime}
      onChange={setByTime}
      verdict={
        byTime ? (
          <>
            Trained on the first {trainN} months, tested on the last {N - trainN}. No test month has a training month after it, so the model has to guess the future: it misses by <b>{f1(honest.mae)}</b> on average. That is the honest figure.
          </>
        ) : (
          <>
            Shuffled, {shuffled.seesFuture} of {shuffled.tests.length} test months have training months after them, so the model just fills gaps between neighbours: it misses by only <b>{f1(shuffled.mae)}</b>. For real future months the miss is {f1(honest.mae)}, {f1(ratio)} times worse.
          </>
        )
      }
      controls={
        <label className="field">
          <span>
            Trend, units per month <b>{f1(trend)}</b>
          </span>
          <input type="range" min={0} max={10} step={1} value={trendTenths} onChange={(e) => setTrendTenths(+e.target.value)} aria-label="How fast the series climbs each month" />
        </label>
      }
    >
      <div className="wm-fig">
        <svg
          viewBox={`0 0 ${W} 240`}
          className="dx-svg wi-svg wm-svg wm-svg-lg"
          role="img"
          aria-label={`A line of ${N} monthly values that climbs and cycles. ${byTime ? `The last ${N - trainN} months are held back for testing, all in the future of the training months.` : `${shown.tests.length} months scattered through the timeline are held back, so most have training months on both sides.`} The average miss on the test months is ${f1(shown.mae)}.`}
        >
          <rect x={0.5} y={0.5} width={W - 1} height={PB + 8} rx={8} className="wm-frame" />
          <path d={path} className="wm-grid" />
          {y.map((v, t) => {
            const test = split[t];
            const g = guessOf.get(t);
            const gy = g === undefined ? yOf(v) : yOf(g);
            return (
              <g key={t}>
                <motion.line x1={xOf(t)} x2={xOf(t)} y1={yOf(v)} initial={false} animate={{ y2: gy, opacity: test ? 0.85 : 0 }} transition={{ duration: 0.6, ease: EASE }} stroke={RED} strokeWidth={1.6} />
                <motion.circle cx={xOf(t)} initial={false} animate={{ cy: gy, opacity: test ? 1 : 0 }} transition={{ duration: 0.6, ease: EASE }} r={3.4} fill="none" stroke="var(--ink)" strokeWidth={1.4} />
                <circle cx={xOf(t)} cy={yOf(v)} r={test ? 3.4 : 2.3} fill={test ? ORANGE : BLUE} className="wm-cell" opacity={test ? 1 : 0.75} />
              </g>
            );
          })}
          <text x={PL + 4} y={PT + 12} className="wm-t">value</text>
          <text x={PR - 4} y={PB - 4} textAnchor="end" className="wm-t">time, oldest to newest</text>
          {split.map((test, t) => (
            <rect key={t} x={q(PL + (t / N) * (PR - PL))} y={STRIP_Y} width={q((PR - PL) / N + 0.3)} height={STRIP_H} fill={test ? ORANGE : BLUE} className="wm-cell" />
          ))}
          <text x={PL} y={STRIP_Y - 6} className="wm-tb">The split on the timeline</text>
          <text x={PL} y={STRIP_Y + STRIP_H + 16} className="wm-t">oldest</text>
          <text x={PR} y={STRIP_Y + STRIP_H + 16} textAnchor="end" className="wm-t">newest</text>
        </svg>
      </div>
      <ul className="wm-legend" aria-label="Key">
        <li><span className="wm-sw is-round" style={{ background: BLUE }} /> training month</li>
        <li><span className="wm-sw is-round" style={{ background: ORANGE }} /> test month (true value)</li>
        <li><span className="wm-sw is-round is-ring" style={{ color: 'var(--ink)' }} /> the model&rsquo;s guess</li>
        <li><span className="wm-sw" style={{ background: RED, width: '0.2rem', height: '0.9rem' }} /> the miss</li>
      </ul>
      <div className="wm-meters">
        <p className="wm-h">
          Average miss on the test months
          <small>lower is better</small>
        </p>
        <div className={`wm-meter${!byTime ? ' is-top' : ''}`}>
          <span>Shuffled split</span>
          <div className="wm-track"><motion.div className="wm-fill" initial={false} animate={{ width: `${Math.min(100, (shuffled.mae / MAX_ERR) * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} /></div>
          <b>{f1(shuffled.mae)}</b>
        </div>
        <div className={`wm-meter${byTime ? ' is-top' : ''}`}>
          <span>Split by time</span>
          <div className="wm-track"><motion.div className="wm-fill is-bad" initial={false} animate={{ width: `${Math.min(100, (honest.mae / MAX_ERR) * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} /></div>
          <b>{f1(honest.mae)}</b>
        </div>
      </div>
      <ul className="wm-nums">
        <li className={byTime ? '' : 'is-lit'}>
          <b>
            {shown.seesFuture} of {shown.tests.length}
          </b>
          test months have training months after them
        </li>
        <li>
          <b>{f1(ratio)}x</b>
          honest miss compared with the shuffled one
        </li>
      </ul>
      <p className="wm-foot">
        Toy data, made up for this demo: value = 50 + trend x month + 8 x yearly cycle + noise. The model averages the 2 nearest training months, so it can fill gaps but cannot continue a trend. Over 100 different shuffles the shuffled miss averages <b>{f1(avgShuffled)}</b>, so it is not a lucky shuffle. A time-aware 5-fold check (scikit-learn TimeSeriesSplit style, each fold trains only on earlier months) gives <b>{f1(folds)}</b>.
      </p>
    </WhatIfFrame>
  );
}
