import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  DAYS,
  DOCS,
  DOC_COUNT,
  INTERVALS,
  dailyShares,
  exampleOutdated,
  expectedShare,
  indexAge,
  indexedOn,
  isOutdated,
  outdatedCount,
  overallShare,
  rebuilds,
  staleShare,
  truthOn,
} from '../../lib/whatif/stale-index';

const W = 340;
const H = 226;
const X0 = 40;
const X1 = 330;
const Y0 = 178; // y of 0 %
const Y1 = 18; // y of the top of the chart
const YMAX = 0.6;
const r1 = (n: number) => Math.round(n * 10) / 10;
const px = (d: number) => r1(X0 + (d / (DAYS - 1)) * (X1 - X0));
const py = (s: number) => r1(Y0 - (Math.min(s, YMAX) / YMAX) * (Y0 - Y1));
const line = (shares: number[]) => shares.map((s, d) => `${d === 0 ? 'M' : 'L'}${px(d)} ${py(s)}`).join(' ');
const pc = (x: number) => `${Math.round(x * 100)}%`;
const pc1 = (x: number) => `${(Math.round(x * 1000) / 10).toFixed(1)}%`;

/**
 * 120 toy documents, a 60-day clock, and an index that copies them. Pick how often the index is rebuilt (or never),
 * then move the day: cells turn red when a document has changed since the index last copied it.
 */
export default function StaleIndexWhatIf() {
  const [refresh, setRefresh] = useState(true);
  const [ii, setIi] = useState(4); // 7 days
  const [day, setDay] = useState(45);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const every = refresh ? INTERVALS[ii] : Infinity;
  const shares = dailyShares(every);
  const never = dailyShares(Infinity);
  const overall = overallShare(every);
  const overallNever = overallShare(Infinity);
  const today = staleShare(day, every);
  const nOut = outdatedCount(day, every);
  const age = indexAge(day, every);
  const truth = truthOn(day);
  const copy = indexedOn(day, every);
  const old = exampleOutdated(day, every);

  const play = () => {
    stop();
    setDay(0);
    let d = 0;
    timer.current = setInterval(() => {
      d += 1;
      setDay(d);
      if (d >= DAYS - 1) stop();
    }, 110);
  };

  const verdict = refresh ? (
    <>
      Rebuilt every {INTERVALS[ii]} {INTERVALS[ii] === 1 ? 'day' : 'days'} ({rebuilds(every)} rebuilds in {DAYS} days), {pc1(overall)} of questions were answered from an outdated page. Never rebuilding would have meant {pc1(overallNever)}. On day {day}, {nOut} of {DOC_COUNT} pages are outdated, which covers {pc(today)} of questions.
    </>
  ) : (
    <>
      Built once on day 0 and never rebuilt, {pc1(overallNever)} of all questions over {DAYS} days were answered from an outdated page, and by day {DAYS - 1} it is {pc(never[DAYS - 1])}. On day {day}, {nOut} of {DOC_COUNT} pages are outdated, covering {pc(today)} of questions.
    </>
  );

  return (
    <WhatIfFrame
      title="A search index over 120 pages that keep changing (simulated)"
      withLabel="Rebuilt on a schedule"
      withoutLabel="Never rebuilt"
      on={refresh}
      onChange={setRefresh}
      verdict={verdict}
      controls={
        <>
          {refresh && (
            <label className="field">
              <span>
                Rebuild the index every <b>{INTERVALS[ii]}</b> {INTERVALS[ii] === 1 ? 'day' : 'days'}
              </span>
              <input type="range" min={0} max={INTERVALS.length - 1} step={1} value={ii} onChange={(e) => setIi(+e.target.value)} aria-label="Days between index rebuilds" />
            </label>
          )}
          <label className="field">
            <span>
              Today is day <b>{day}</b> of {DAYS - 1}
            </span>
            <input
              type="range"
              min={0}
              max={DAYS - 1}
              step={1}
              value={day}
              onChange={(e) => {
                stop();
                setDay(+e.target.value);
              }}
              aria-label="Day of the simulation"
            />
          </label>
          <button type="button" className="btn quiet" onClick={play}>
            Play it
          </button>
        </>
      }
    >
      <p className="wr-lead">
        A search index is a copy of your pages, made at one moment. If the real pages change afterwards, search keeps answering from the copy until the index is rebuilt.
      </p>

      <div className={'wr-card ' + (old ? 'is-bad' : 'is-good')}>
        <p className="wr-card-h">
          Example page: returns policy <span className="wr-badge">example</span>
        </p>
        <p className="wr-card-t">
          <b>True on day {day}:</b> {truth.text}
        </p>
        <p className="wr-card-t">
          <b>The index says:</b> {copy.text}
        </p>
        <p className="wr-card-s">
          {old ? '✗ Outdated: a customer is given the old rule. ' : '✓ Up to date. '}
          The copy was made {age === 0 ? 'today' : `${age} ${age === 1 ? 'day' : 'days'} ago`}.
        </p>
      </div>

      <p className="wr-card-h" style={{ margin: '0.9rem 0 0.3rem' }}>
        All {DOC_COUNT} pages on day {day} (most asked-about first)
      </p>
      <div className="wr-docs" role="img" aria-label={`${nOut} of ${DOC_COUNT} pages are outdated on day ${day}`}>
        {DOCS.map((d) => (
          <span key={d.id} className={'wr-cell ' + (isOutdated(d, day, every) ? 'is-stale' : 'is-fresh')} />
        ))}
      </div>
      <ul className="wr-legend">
        <li><span className="wr-cell is-fresh wr-sw2" /> up to date</li>
        <li><span className="wr-cell is-stale wr-sw2" /> outdated: changed since the last rebuild</li>
      </ul>

      <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg wi-svg wr-chart" role="img" aria-label={`Share of questions answered from an outdated page over ${DAYS} days. ${refresh ? `Rebuilt every ${INTERVALS[ii]} days: ${pc1(overall)} on average.` : `Never rebuilt: ${pc1(overallNever)} on average.`}`}>
        {[0, 0.2, 0.4, 0.6].map((v) => (
          <g key={v}>
            <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke="currentColor" strokeOpacity={0.15} />
            <text x={X0 - 6} y={py(v) + 4} fontSize={12} textAnchor="end" fill="currentColor">{Math.round(v * 100)}%</text>
          </g>
        ))}
        {[0, 15, 30, 45, 59].map((d) => (
          <text key={d} x={px(d)} y={Y0 + 18} fontSize={12} textAnchor="middle" fill="currentColor">{d}</text>
        ))}
        <text x={(X0 + X1) / 2} y={H - 6} fontSize={12} textAnchor="middle" fill="currentColor">day</text>
        {refresh && <path d={line(never)} fill="none" stroke="#d6453d" strokeWidth={2} strokeDasharray="5 4" strokeOpacity={0.7} />}
        <motion.path d={line(shares)} fill="none" stroke={refresh ? '#1f9d6b' : '#d6453d'} strokeWidth={3} strokeLinejoin="round" initial={false} animate={{ d: line(shares) }} transition={{ duration: 0.6, ease: EASE }} />
        <motion.line y1={Y1} y2={Y0} stroke="currentColor" strokeWidth={1.5} initial={false} animate={{ x1: px(day), x2: px(day) }} transition={{ duration: 0.2, ease: EASE }} />
        <circle cx={px(day)} cy={py(today)} r={5} fill={today > 0.15 ? '#d6453d' : '#1f9d6b'} stroke="currentColor" strokeWidth={1.5} />
      </svg>
      <p className="wr-meta" style={{ textAlign: 'center', margin: '0.2rem 0 0' }}>Share of questions answered from an outdated page, per day</p>
      <ul className="wr-legend">
        <li><span className="wr-line" style={{ background: refresh ? '#1f9d6b' : '#d6453d' }} /> {refresh ? `rebuilt every ${INTERVALS[ii]} ${INTERVALS[ii] === 1 ? 'day' : 'days'}` : 'never rebuilt'}</li>
        {refresh && <li><span className="wr-line wr-dash" /> never rebuilt, for comparison</li>}
        <li><b>●</b> the day chosen above</li>
      </ul>

      <p className="wr-note">
        Simulation with made-up numbers: 120 pages, 18 that change about every 6 days, 42 about every 30 days and 60 almost never; questions are weighted toward the first pages (popularity 1 / rank). The index is rebuilt at midnight and pages change during the day, so a change is missed until the next rebuild after it. A real system also pays to rebuild: more frequent means more work.
      </p>
      <details className="wr-details">
        <summary>Open the numbers</summary>
        <div className="wr-scroll">
          <table className="wr-table">
            <caption>Share of questions answered from an outdated page, averaged over {DAYS} days. The formula column is the expected value (chance 1 - (1 - p)^(age + 1) per page).</caption>
            <thead>
              <tr>
                <th scope="col">rebuild every</th>
                <th scope="col">rebuilds</th>
                <th scope="col">simulated</th>
                <th scope="col">formula</th>
              </tr>
            </thead>
            <tbody>
              {[...INTERVALS, Infinity].map((r) => (
                <tr key={r}>
                  <th scope="row">{isFinite(r) ? `${r} d` : 'never'}</th>
                  <td>{rebuilds(r)}</td>
                  <td>{pc1(overallShare(r))}</td>
                  <td>{pc1(expectedShare(r))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </WhatIfFrame>
  );
}
