import { useMemo, useState } from 'react';
import { Root } from './shared';
import { analyse, repeatTests, simulateTest } from '../../lib/mos';

/*
 * A simulated listening test. Each simulated listener rates one clip from system A and one from system B
 * on a 1 to 5 scale. The learner sets how good each system really is, how many people listen and how much
 * people differ, then sees the mean opinion score with its 95% interval, and how often a repeat of the test
 * would reliably find B better. Everything is invented: no real listener data. The maths is in src/lib/mos.ts.
 */

const COUNTS = [3, 5, 8, 10, 15, 20, 30, 40, 60, 80, 120, 160];
const REPEATS = 200;
const DEFAULTS = { trueA: 3.4, trueB: 3.8, idx: 3, biasSd: 0.6, noiseSd: 0.8 };

const minus = (s: string) => s.replace('-', '−');
const f2 = (x: number) => minus(x.toFixed(2));
const sgn = (x: number) => (x > 0 ? '+' : '') + f2(x);

/* chart geometry (viewBox units; text is kept at 12 or 13 so it stays readable when the figure shrinks to a phone) */
const W = 340;
const X0 = 72;
const X1 = 322;
const xs = (v: number) => X0 + ((v - 1) / 4) * (X1 - X0);
const xd = (v: number) => X0 + ((Math.max(-1.5, Math.min(1.5, v)) + 1.5) / 3) * (X1 - X0);

export default function MosSimulator() {
  const [trueA, setTrueA] = useState(DEFAULTS.trueA);
  const [trueB, setTrueB] = useState(DEFAULTS.trueB);
  const [idx, setIdx] = useState(DEFAULTS.idx);
  const [biasSd, setBiasSd] = useState(DEFAULTS.biasSd);
  const [noiseSd, setNoiseSd] = useState(DEFAULTS.noiseSd);
  const [seed, setSeed] = useState(1);

  const listeners = COUNTS[idx];
  const test = useMemo(() => analyse(simulateTest({ trueA, trueB, listeners, biasSd, noiseSd }, seed)), [trueA, trueB, listeners, biasSd, noiseSd, seed]);
  const rates = useMemo(
    () => COUNTS.map((n) => repeatTests({ trueA, trueB, listeners: n, biasSd, noiseSd }, REPEATS).B),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trueA, trueB, biasSd, noiseSd],
  );

  const gap = trueB - trueA;
  const verdictText =
    test.verdict === 'none'
      ? 'The interval for the difference includes zero, so this test cannot tell the two systems apart.'
      : test.verdict === 'B'
        ? 'The interval for the difference is above zero: this test favours B.'
        : 'The interval for the difference is below zero: this test favours A.';
  const say = `Test number ${seed} with ${listeners} listeners. A scored ${f2(test.a.mean)}, 95% interval ${f2(test.a.lo)} to ${f2(test.a.hi)}. B scored ${f2(test.b.mean)}, interval ${f2(test.b.lo)} to ${f2(test.b.hi)}. B minus A, comparing each listener with themselves, is ${sgn(test.paired.mean)}, interval ${f2(test.paired.lo)} to ${f2(test.paired.hi)}. ${verdictText}`;
  const reset = () => {
    setTrueA(DEFAULTS.trueA);
    setTrueB(DEFAULTS.trueB);
    setIdx(DEFAULTS.idx);
    setBiasSd(DEFAULTS.biasSd);
    setNoiseSd(DEFAULTS.noiseSd);
    setSeed(1);
  };

  const rows: { y: number; label: string; v: { mean: number; lo: number; hi: number }; truth: number }[] = [
    { y: 36, label: 'A', v: test.a, truth: trueA },
    { y: 72, label: 'B', v: test.b, truth: trueB },
  ];
  const dm = test.paired.mean;
  const dFavours = test.verdict !== 'none';

  return (
    <Root>
      <div className="viz aub aub-mos">
        <p className="viz-title">How many listeners does a listening test need?</p>
        <div className="aub-sliders">
          <label className="field">
            <span>
              True quality of A <b>{trueA.toFixed(1)}</b>
            </span>
            <input type="range" min={1} max={5} step={0.1} value={trueA} onChange={(e) => setTrueA(+e.target.value)} aria-label="True quality of system A, from 1 to 5" />
          </label>
          <label className="field">
            <span>
              True quality of B <b>{trueB.toFixed(1)}</b>
            </span>
            <input type="range" min={1} max={5} step={0.1} value={trueB} onChange={(e) => setTrueB(+e.target.value)} aria-label="True quality of system B, from 1 to 5" />
          </label>
          <label className="field">
            <span>
              Listeners <b>{listeners}</b>
            </span>
            <input
              type="range"
              min={0}
              max={COUNTS.length - 1}
              step={1}
              value={idx}
              onChange={(e) => setIdx(+e.target.value)}
              aria-label="Number of listeners"
              aria-valuetext={`${listeners} listeners`}
            />
          </label>
          <label className="field">
            <span>
              Listeners differ in harshness <b>{biasSd.toFixed(1)}</b>
            </span>
            <input type="range" min={0} max={1.2} step={0.1} value={biasSd} onChange={(e) => setBiasSd(+e.target.value)} aria-label="How much listeners differ in harshness, in stars" />
          </label>
          <label className="field">
            <span>
              Rating wobble <b>{noiseSd.toFixed(1)}</b>
            </span>
            <input type="range" min={0.2} max={1.5} step={0.1} value={noiseSd} onChange={(e) => setNoiseSd(+e.target.value)} aria-label="Random wobble in a single rating, in stars" />
          </label>
        </div>
        <div className="aub-buttons">
          <button type="button" className="btn" onClick={() => setSeed(seed + 1)}>
            Run another test
          </button>
          <button type="button" className="btn quiet" onClick={reset}>
            Reset
          </button>
          <span className="aub-status">Test {seed}</span>
        </div>

        <svg viewBox={`0 0 ${W} 196`} className="aub-svg" role="img" aria-label={say}>
          <text x={4} y={14} className="aub-svg-h">
            Mean opinion score, 95% interval
          </text>
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line x1={xs(v)} x2={xs(v)} y1={22} y2={86} className="aub-grid" />
              <text x={xs(v)} y={100} textAnchor="middle" className="aub-tick">
                {v}
              </text>
            </g>
          ))}
          {rows.map((r) => (
            <g key={r.label}>
              <text x={8} y={r.y + 4} className="aub-row">
                {r.label}
              </text>
              <line x1={xs(Math.max(1, r.v.lo))} x2={xs(Math.min(5, r.v.hi))} y1={r.y} y2={r.y} className={`aub-bar aub-bar-${r.label}`} />
              <line x1={xs(Math.max(1, r.v.lo))} x2={xs(Math.max(1, r.v.lo))} y1={r.y - 6} y2={r.y + 6} className={`aub-bar aub-bar-${r.label}`} />
              <line x1={xs(Math.min(5, r.v.hi))} x2={xs(Math.min(5, r.v.hi))} y1={r.y - 6} y2={r.y + 6} className={`aub-bar aub-bar-${r.label}`} />
              <circle cx={xs(r.v.mean)} cy={r.y} r={5} className={`aub-dot aub-dot-${r.label}`} />
              <path d={`M ${xs(r.truth)} ${r.y + 11} l -4 6 h 8 z`} className="aub-true" />
            </g>
          ))}
          <text x={4} y={124} className="aub-svg-h">
            B minus A, in stars
          </text>
          {[-1.5, -1, -0.5, 0, 0.5, 1, 1.5].map((v) => (
            <g key={v}>
              <line x1={xd(v)} x2={xd(v)} y1={132} y2={176} className={v === 0 ? 'aub-zero' : 'aub-grid'} />
              <text x={xd(v)} y={192} textAnchor="middle" className="aub-tick">
                {v === 0 ? '0' : minus(String(v))}
              </text>
            </g>
          ))}
          <text x={8} y={149} className="aub-row aub-row-s">
            Paired
          </text>
          <line x1={xd(test.paired.lo)} x2={xd(test.paired.hi)} y1={146} y2={146} className={`aub-bar ${dFavours ? 'aub-bar-ok' : 'aub-bar-none'}`} />
          <circle cx={xd(dm)} cy={146} r={5} className={`aub-dot ${dFavours ? 'aub-dot-ok' : 'aub-dot-none'}`} />
          <text x={8} y={171} className="aub-row aub-row-s">
            Unpaired
          </text>
          <line x1={xd(dm - test.unpairedHalf)} x2={xd(dm + test.unpairedHalf)} y1={168} y2={168} className="aub-bar aub-bar-dash" />
          <circle cx={xd(dm)} cy={168} r={3.5} className="aub-dot aub-dot-none" />
        </svg>
        <p className="aub-key">
          Filled dot: this test's mean. Bar: 95% interval. Small triangle: the true quality you set (before ratings are rounded to whole stars). Paired uses each
          listener's two ratings together; unpaired is what you would get if different people had rated each system.
        </p>

        <p className="aub-say" role="status" aria-live="polite">
          {say}
        </p>

        <p className="aub-label">
          Repeat the whole test {REPEATS} times at each size: how often does it reliably find B better? (True gap: {sgn(gap)} stars)
        </p>
        <ul className="aub-rates" aria-label={`Out of ${REPEATS} repeated tests, how many reliably favoured B, by number of listeners`}>
          {COUNTS.map((n, i) => (
            <li key={n} className={n === listeners ? 'aub-now' : ''}>
              <span className="aub-rn">{n} listeners</span>
              <span className="aub-track" aria-hidden="true">
                <span className="aub-fill" style={{ width: `${(rates[i] / REPEATS) * 100}%` }} />
              </span>
              <span className="aub-rv">{Math.round((rates[i] / REPEATS) * 100)}%</span>
            </li>
          ))}
        </ul>
        <p className="aub-hint">
          A simulation with invented numbers, not data from any real test. Each listener has their own harshness, so comparing both systems within one listener cancels
          most of it. Try setting both systems to the same quality: the test should rarely find a difference, and when it does that is a false alarm.
        </p>
      </div>
    </Root>
  );
}
