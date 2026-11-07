import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { BIN_LO, BINS, N_TEST, accuracy, atThreshold, ece, fittedT, meanConfidence, reliability, test } from '../../lib/whatif/no-calibration';

const W = 340;
const L = 40;
const R = W - 6;
const T0 = 48; // top of the plot (100%)
const B0 = 232; // bottom of the plot (50%)
const BW = (R - L) / BINS;
const GREEN = '#1f9d6b';
const RED = '#d6453d';
const AMBER = '#e0a21e';

const q = (v: number) => Math.round(v * 10) / 10;
const yOf = (p: number) => q(B0 - ((Math.min(1, Math.max(BIN_LO, p)) - BIN_LO) / (1 - BIN_LO)) * (B0 - T0));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const pct1 = (v: number) => `${(Math.round(v * 1000) / 10).toFixed(1)}%`;

/**
 * Reliability diagram for a TOY two-class model on made-up data. For each confidence range: the bar is how often the model was
 * right, the line is what it said. A calibrated model has the line on top of the bar. Temperature scaling divides the scores by T.
 */
export default function NoCalibrationWhatIf() {
  const fitted = useMemo(() => fittedT(), []);
  const [T, setT] = useState(() => fittedT());
  const [thr, setThr] = useState(90);
  const [playing, setPlaying] = useState(false);

  const data = test();
  const bins = useMemo(() => reliability(data, T), [data, T]);
  const rawEce = useMemo(() => ece(data, 1), [data]);
  const curEce = useMemo(() => ece(data, T), [data, T]);
  const acc = accuracy(data);
  const says = meanConfidence(data, T);
  const rule = useMemo(() => atThreshold(data, T, thr / 100), [data, T, thr]);
  const on = T >= (1 + fitted) / 2;
  const wrong = rule.accepted ? 1 - rule.accuracy : 0;
  const promisedWrong = 1 - thr / 100;
  const kept = wrong <= promisedWrong + 0.01;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((t) => {
        const next = Math.round((t + 0.1) * 10) / 10;
        if (next >= fitted) {
          setPlaying(false);
          return fitted;
        }
        return next;
      });
    }, 80);
    return () => clearInterval(id);
  }, [playing, fitted]);

  const play = () => {
    setT(1);
    setPlaying(true);
  };

  const verdict = (
    <>
      {on ? <>With temperature scaling (T = {T.toFixed(1)}) the model</> : <>Raw, the model</>} says {pct(says)} on average and is right {pct(acc)} of the time: calibration error {pct1(curEce)}
      {on ? <> (raw: {pct1(rawEce)}).</> : <>.</>} The rule "act when it says {thr}% or more" acts on {pct(rule.share)} of cases and is wrong on {pct(wrong)} of them, {kept ? 'within' : 'more than'} the {pct(promisedWrong)} you expected.
    </>
  );

  return (
    <WhatIfFrame
      title="Does 90% sure mean right 9 times in 10? (toy model, made-up data)"
      withLabel="Calibrated (temperature scaling)"
      withoutLabel="Raw confidence"
      on={on}
      onChange={(v) => {
        setPlaying(false);
        setT(v ? fitted : 1);
      }}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Temperature T <b>{T.toFixed(1)}</b> (1.0 = raw, fitted {fitted.toFixed(1)})
            </span>
            <input type="range" min={1} max={4} step={0.1} value={T} onChange={(e) => { setPlaying(false); setT(Math.round(+e.target.value * 10) / 10); }} aria-label="Temperature that divides the model's scores. 1 is the raw model." />
          </label>
          <label className="field">
            <span>
              Act automatically when it says at least <b>{thr}%</b>
            </span>
            <input type="range" min={60} max={95} step={5} value={thr} onChange={(e) => setThr(+e.target.value)} aria-label="The confidence at which the device acts without asking, in percent" />
          </label>
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Cool the scores down'}
          </button>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} 296`}
        className="dx-svg wi-svg we-svg"
        role="img"
        aria-label={`Reliability diagram for ${fmt.int(N_TEST)} test examples at temperature ${T.toFixed(1)}. The model says ${pct(says)} on average and is right ${pct(acc)}. Calibration error is ${pct1(curEce)}.`}
      >
        <text x={0} y={14} className="we-t-b">When it says X, how often is it right?</text>
        <text x={0} y={30} className="we-t">{on ? 'temperature scaled' : 'raw'}, calibration error</text>
        <text x={W} y={30} textAnchor="end" className={curEce > 0.05 ? 'we-t-bad' : 'we-t-good'}>{pct1(curEce)}</text>
        {[0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <line x1={L} x2={R} y1={yOf(p)} y2={yOf(p)} className="we-grid" />
            <text x={L - 4} y={yOf(p) + 4} textAnchor="end" className="we-t">{Math.round(p * 100)}%</text>
          </g>
        ))}
        <line x1={L} x2={R} y1={B0} y2={T0} stroke="var(--ink-2)" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.7} />
        {bins.map((b, i) => {
          if (b.n === 0) return null;
          const x = q(L + i * BW + 4);
          const w = q(BW - 8);
          const yAcc = yOf(b.acc);
          const yConf = yOf(b.conf);
          const over = b.conf > b.acc;
          const gapTop = Math.min(yAcc, yConf);
          return (
            <g key={i}>
              <motion.rect x={x} width={w} initial={false} animate={{ y: yAcc, height: q(B0 - yAcc) }} transition={{ duration: 0.45, ease: EASE }} fill="var(--ink)" opacity={0.2} stroke="var(--ink)" strokeWidth={1.2} />
              <motion.rect
                x={x}
                width={w}
                initial={false}
                animate={{ y: gapTop, height: q(Math.abs(yAcc - yConf)) }}
                transition={{ duration: 0.45, ease: EASE }}
                fill={over ? RED : AMBER}
                opacity={0.4}
              />
              <motion.line x1={x - 2} x2={x + w + 2} initial={false} animate={{ y1: yConf, y2: yConf }} transition={{ duration: 0.45, ease: EASE }} stroke={Math.abs(b.conf - b.acc) < 0.04 ? GREEN : over ? RED : AMBER} strokeWidth={3.2} strokeLinecap="round" />
              <text x={x + w / 2} y={B0 - 6} textAnchor="middle" className="we-t-b">{pct(b.acc)}</text>
            </g>
          );
        })}
        {bins.map((b, i) => (
          <g key={i}>
            <text x={q(L + i * BW + BW / 2)} y={B0 + 17} textAnchor="middle" className="we-t">{Math.round(b.lo * 100)}-{Math.round(b.hi * 100)}</text>
            <text x={q(L + i * BW + BW / 2)} y={B0 + 33} textAnchor="middle" className="we-t">n {b.n}</text>
          </g>
        ))}
        <text x={W} y={B0 + 52} textAnchor="end" className="we-t">what the model says (confidence range, %)</text>
        <text x={W} y={B0 + 66} textAnchor="end" className="we-t">n = number of cases in the range</text>
      </svg>
      <ul className="we-legend">
        <li><span className="we-sw" style={{ background: 'var(--ink)', opacity: 0.25, border: '1.5px solid var(--ink)' }} /> bar: how often it was right</li>
        <li><span className="we-sw" style={{ background: RED }} /> line: what it said (red = too sure)</li>
        <li>dashed: perfect calibration</li>
      </ul>
      <ul className="we-stats">
        <li className={curEce > 0.05 ? 'is-bad' : 'is-good'}>
          <b>{pct1(curEce)}</b>calibration error (raw {pct1(rawEce)})
        </li>
        <li className={kept ? 'is-good' : 'is-bad'}>
          <b>{pct(wrong)} wrong</b>among the {fmt.int(rule.accepted)} cases it acts on at {thr}% (you expected {pct(promisedWrong)} or less)
        </li>
        <li>
          <b>{pct(acc)}</b>right overall: temperature scaling never changes this
        </li>
      </ul>
      <p className="we-note">
        Toy model on made-up data: {fmt.int(N_TEST)} test cases, with T fitted on a separate set of {fmt.int(N_TEST)} validation cases. Confidence is the number the model attaches to its answer. Calibrated means that among everything it calls 80% sure, about 80% are right. Expected calibration error (ECE) averages the gap between the bar and the line over the five ranges, weighted by how many cases fall in each. Temperature scaling divides every score by one number T before the sigmoid, so it never changes which answer wins, only how sure it sounds.
      </p>
    </WhatIfFrame>
  );
}
