import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  DRAWS,
  IDEAL,
  LIM,
  SIZES,
  bestAccuracy,
  run,
  segment,
  testDots,
} from '../../lib/whatif/tiny-data';

const r1 = (v: number) => Math.round(v * 10) / 10;
const pc = (v: number) => `${Math.round(v * 100)}%`;
const deg = (v: number) => `${Math.round(v)}°`;
const C0 = '#3b6fd8';
const C1 = '#e08a1e';
const LINE = '#8a5cd6';

const S = 340;
const px = (v: number) => r1(((v + LIM) / (2 * LIM)) * S);
const py = (v: number) => r1(S - ((v + LIM) / (2 * LIM)) * S);

const FEW = SIZES[0];
const MAX_TILT = 45;

/**
 * Twenty helpers each learn a dividing line from a different random set of training dots. The line sits halfway between the
 * average blue dot and the average orange dot. We draw all twenty lines on top of the same cloud of test dots.
 */
export default function TinyData() {
  const [n, setN] = useState<number>(300);
  const [lastMany, setLastMany] = useState<number>(300);
  const [batch, setBatch] = useState(0);

  const cloud = useMemo(() => testDots().filter((_, i) => i % 5 < 2), []);
  const best = useMemo(() => bestAccuracy(), []);
  const res = useMemo(() => run(n, batch), [n, batch]);
  const all = useMemo(() => SIZES.map((s) => run(s, batch)), [batch]);
  const ideal = useMemo(() => segment(IDEAL)!, []);

  const pick = (s: number) => {
    setN(s);
    if (s !== FEW) setLastMany(s);
  };
  const few = n === FEW;
  const dotR = n <= 10 ? 6.5 : n <= 30 ? 4.2 : n <= 100 ? 2.6 : 1.8;
  const showBold = n <= 30;

  return (
    <WhatIfFrame
      title="Twenty tries, twenty lines"
      withLabel="Plenty of examples"
      withoutLabel="Only 3 examples"
      on={!few}
      onChange={(on) => setN(on ? lastMany : FEW)}
      verdict={
        <>
          With {n} training dots each time, the 20 lines tilt about {deg(res.rms)} away from the best line on average. Rules from the 20 tries scored between {pc(res.accMin)} and {pc(res.accMax)} on fresh dots (best
          possible: {pc(best)}).
        </>
      }
      controls={
        <div className="wb-controls">
          <div className="wb-picks" role="group" aria-label="How many training dots each helper gets">
            <span className="wb-picks-label">
              Training dots for each try: <b>{n}</b>
            </span>
            {SIZES.map((s) => (
              <button key={s} type="button" className={`wb-pick${n === s ? ' is-on' : ''}`} aria-pressed={n === s} onClick={() => pick(s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="wb-btnrow">
            <button type="button" className="btn" onClick={() => setBatch((b) => b + 1)}>
              Try 20 new sets of dots
            </button>
            <span className="wb-rowlabel" style={{ margin: 0 }}>
              Round {batch + 1}
            </span>
          </div>
        </div>
      }
    >
      <div className="wb-fig">
        <svg
          viewBox={`0 0 ${S} ${S}`}
          className="dx-svg wi-svg wb-svg"
          role="img"
          aria-label={`A scatter of blue and orange dots with ${DRAWS} purple lines, one for each helper that learned from ${n} training dots. ${
            few ? 'The lines point in many different directions.' : n >= 100 ? 'The lines nearly sit on top of each other.' : 'The lines cluster loosely around the dashed best line.'
          } Typical tilt away from the best line is ${deg(res.rms)}.`}
        >
          <rect x="0" y="0" width={S} height={S} className="wb-frame" />
          {cloud.map((p, i) =>
            p.label === 1 ? (
              <rect key={i} x={r1(px(p.x) - 2.6)} y={r1(py(p.y) - 2.6)} width="5.2" height="5.2" fill={C1} opacity="0.4" />
            ) : (
              <circle key={i} cx={px(p.x)} cy={py(p.y)} r="2.8" fill={C0} opacity="0.4" />
            ),
          )}
          <line x1={px(ideal.x1)} y1={py(ideal.y1)} x2={px(ideal.x2)} y2={py(ideal.y2)} stroke="var(--ink)" strokeWidth="2" strokeDasharray="7 5" opacity="0.85" />
          {res.rules.map((rule, k) => {
            const sg = segment(rule);
            if (!sg) return null;
            const first = k === 0;
            return (
              <motion.line
                key={k}
                stroke={first ? 'var(--ink)' : LINE}
                strokeWidth={first ? 3.4 : 1.8}
                strokeLinecap="round"
                opacity={first ? 0.95 : 0.5}
                initial={false}
                animate={{ x1: px(sg.x1), y1: py(sg.y1), x2: px(sg.x2), y2: py(sg.y2) }}
                transition={{ duration: 0.6, ease: EASE }}
              />
            );
          })}
          {res.firstDots.map((p, i) =>
            p.label === 1 ? (
              <rect
                key={i}
                x={r1(px(p.x) - dotR)}
                y={r1(py(p.y) - dotR)}
                width={r1(2 * dotR)}
                height={r1(2 * dotR)}
                fill={C1}
                stroke="var(--ink)"
                strokeWidth={showBold ? 2 : 0.6}
              />
            ) : (
              <circle key={i} cx={px(p.x)} cy={py(p.y)} r={dotR} fill={C0} stroke="var(--ink)" strokeWidth={showBold ? 2 : 0.6} />
            ),
          )}
          <text x="8" y={S - 10} className="wb-tb" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>
            blue group
          </text>
          <text x={S - 8} y="20" textAnchor="end" className="wb-tb" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>
            orange group
          </text>
        </svg>
      </div>
      <ul className="wb-legend" aria-label="Key">
        <li>
          <span className="wb-sw is-round" style={{ background: C0 }} /> blue dot
        </li>
        <li>
          <span className="wb-sw" style={{ background: C1 }} /> orange dot
        </li>
        <li>
          <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true">
            <line x1="0" x2="26" y1="5" y2="5" stroke={LINE} strokeWidth="3" />
          </svg>
          one learned line
        </li>
        <li>
          <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true">
            <line x1="0" x2="26" y1="5" y2="5" stroke="var(--ink)" strokeWidth="3.4" />
          </svg>
          line from the outlined dots
        </li>
        <li>
          <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true">
            <line x1="0" x2="26" y1="5" y2="5" stroke="var(--ink)" strokeWidth="2" strokeDasharray="6 4" />
          </svg>
          best possible line
        </li>
      </ul>

      <div className="wb-meters" aria-label="How much the twenty lines disagree">
        <div className="wb-meter is-top">
          <span>Typical tilt</span>
          <div className="wb-track">
            <motion.div
              className={`wb-fill ${res.rms > 15 ? 'is-bad' : res.rms > 6 ? 'is-mid' : ''}`}
              initial={false}
              animate={{ width: `${Math.max(2, (Math.min(res.rms, MAX_TILT) / MAX_TILT) * 100)}%` }}
              transition={{ duration: 0.5, ease: EASE }}
            />
          </div>
          <b>{deg(res.rms)}</b>
        </div>
        <div className="wb-meter">
          <span>Worst of the 20 rules</span>
          <div className="wb-track" role="img" aria-label={`The twenty rules scored from ${pc(res.accMin)} to ${pc(res.accMax)}, on average ${pc(res.accMean)}. The best possible line scores ${pc(best)}.`}>
            <motion.div
              style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 11, background: res.accMin < 0.85 ? '#d6453d' : '#1f9d6b' }}
              initial={false}
              animate={{ left: `${((res.accMin - 0.5) / 0.5) * 100}%`, width: `${Math.max(1.5, ((res.accMax - res.accMin) / 0.5) * 100)}%` }}
              transition={{ duration: 0.5, ease: EASE }}
            />
            <span style={{ position: 'absolute', top: 0, bottom: 0, width: 3, left: `${((best - 0.5) / 0.5) * 100}%`, background: 'var(--ink)' }} />
          </div>
          <b>{pc(res.accMin)}</b>
        </div>
      </div>
      <p className="wb-foot">
        The first bar is how far the lines tip away from the best line, out of 45°. The scale for the second bar runs from 50% (a coin flip) on the left to 100% on the right. The coloured band stretches from the worst of the 20 rules to the best, and the thin dark mark is the best possible line (
        {pc(best)}). A wide band means the answer depends on luck.
      </p>

      <div className="wb-fig">
        <p className="wb-h">
          Typical tilt for each amount of data
          <small>Same round, all six sizes. The outlined bar is the one you are looking at.</small>
        </p>
        <div className="wb-meters">
          {all.map((a) => (
            <div key={a.n} className={`wb-meter${a.n === n ? ' is-top' : ''}`}>
              <span>
                {a.n} dots {a.n === n ? '(now)' : ''}
              </span>
              <div className="wb-track" style={a.n === n ? { outline: '2.5px solid var(--ink)', outlineOffset: 1 } : undefined}>
                <motion.div className={`wb-fill ${a.rms > 15 ? 'is-bad' : a.rms > 6 ? 'is-mid' : ''}`} initial={false} animate={{ width: `${Math.max(2, (Math.min(a.rms, MAX_TILT) / MAX_TILT) * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} />
              </div>
              <b>{deg(a.rms)}</b>
            </div>
          ))}
        </div>
      </div>

      <details className="wb-more">
        <summary>Numbers, for older readers</summary>
        <p>
          <b>How the helper works.</b> It averages the blue training dots to get one middle point, does the same for the orange dots, and draws the line that sits halfway between the two middles, at right angles to the line that
          joins them. Dots on the orange side are called orange. The "tilt" of a rule is the angle between its line and the best possible line (which runs from bottom right to top left through the middle). The typical tilt is
          the square root of the average of the 20 squared tilts. Scores come from 600 fresh test dots that were never used for training.
        </p>
        <div className="wb-table-wrap">
          <table className="wb-table">
            <caption className="wb-rowlabel">Round {batch + 1}: the 20 rules for each amount of data</caption>
            <thead>
              <tr>
                <th scope="col">Dots</th>
                <th scope="col">Typical tilt</th>
                <th scope="col">Worst score</th>
                <th scope="col">Average</th>
                <th scope="col">Best score</th>
              </tr>
            </thead>
            <tbody>
              {all.map((a) => (
                <tr key={a.n}>
                  <th scope="row">{a.n}</th>
                  <td className={a.n === n ? 'is-diag' : undefined}>{deg(a.rms)}</td>
                  <td>{pc(a.accMin)}</td>
                  <td>{pc(a.accMean)}</td>
                  <td>{pc(a.accMax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Toy data, made up for this demo: two groups of dots centred at (-1, -1) and (1, 1), each spread about one unit, overlapping a little, so even the best straight line only reaches {pc(best)}. Each training set has the two
          groups in nearly equal numbers. Press the button for a new round of 20 draws: the exact lines change, but the pattern (wild with 3, calm with 300) stays.
        </p>
      </details>
    </WhatIfFrame>
  );
}

