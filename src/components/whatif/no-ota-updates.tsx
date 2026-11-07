import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import {
  DETECT_DAY,
  DOT_STEP,
  FIRST_STAGES,
  FIX_READY,
  FLEET,
  HORIZON,
  RECALL_RATE,
  RECALL_START,
  daysToShare,
  deviceState,
  recallCurve,
  rollout,
} from '../../lib/whatif/no-ota-updates';

const W = 340;
const COLS = 25;
const ROWS = FLEET / DOT_STEP / COLS; // 8
const GX = 9;
const GSTEP = (W - 2 * GX) / (COLS - 1);
const GY = 34;
const GROW = 14;
const CL = 36; // chart left
const CR = W - 8;
const CT = 214;
const CB = 322;
const GREEN = '#1f9d6b';
const RED = '#d6453d';
const AMBER = '#e0a21e';

const q = (v: number) => Math.round(v * 10) / 10;
const xDay = (d: number) => q(CL + (d / HORIZON) * (CR - CL));
const yShare = (s: number) => q(CB - s * (CB - CT));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const pct1 = (v: number) => `${(Math.round(v * 1000) / 10).toFixed(1)}%`;

const line = (curve: number[], upTo: number) =>
  curve
    .slice(0, upTo + 1)
    .map((s, d) => `${d ? 'L' : 'M'}${xDay(d)} ${yShare(s)}`)
    .join('');

/**
 * A SIMULATION of a fleet of 2,000 example devices with a bug found on day 0. Top: 200 of them as dots on the chosen day.
 * Bottom: the share fixed over time, by updates (with a staged rollout and a rollback) or by a recall.
 * Every number is example data from a seeded simulation, not from any product.
 */
export default function NoOtaUpdatesWhatIf() {
  const [ota, setOta] = useState(true);
  const [stageIdx, setStageIdx] = useState(2);
  const [badFix, setBadFix] = useState(false);
  const [day, setDay] = useState(30);
  const [playing, setPlaying] = useState(false);

  const first = FIRST_STAGES[stageIdx];
  const good = useMemo(() => rollout(first, false), [first]);
  const bad = useMemo(() => rollout(first, true), [first]);
  const recall = useMemo(() => recallCurve(), []);
  const r = ota && badFix ? bad : good;
  const showBad = ota && badFix;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setDay((d) => {
        if (d >= HORIZON) {
          setPlaying(false);
          return HORIZON;
        }
        return d + 1;
      });
    }, 45);
    return () => clearInterval(id);
  }, [playing]);

  const play = () => {
    setDay(0);
    setPlaying(true);
  };

  const dots = useMemo(() => {
    const n = FLEET / DOT_STEP;
    return Array.from({ length: n }, (_, j) => deviceState(j * DOT_STEP, day, ota ? r : null));
  }, [day, ota, r]);

  const gotBad = showBad ? Math.max(...bad.onBad) : 0;
  const mainCurve = !ota ? recall : showBad ? bad.onBad : good.fixed;
  const mainColor = !ota ? RED : showBad ? AMBER : GREEN;
  const ghostCurve = !ota ? good.fixed : showBad ? null : recall;
  const ghostColor = !ota ? GREEN : RED;
  const day90 = daysToShare(good.fixed, 0.9);

  const staged = first < 100 ? `a staged rollout starting at ${first}% of devices` : 'a rollout to everyone at once';

  const verdict = !ota ? (
    <>
      With no updates, the only fix is a recall. {day} days after the bug is found, {pct1(recall[day])} of devices are fixed; after {HORIZON} days, still only {pct(recall[HORIZON])}. The rest keep the bug (example: owners send a device back with a {(RECALL_RATE * 100).toFixed(1)}% chance a day).
    </>
  ) : showBad ? (
    <>
      The fix has its own bug, caught on day {DETECT_DAY}. With {staged}, {pct1(gotBad)} of devices ({fmt.int(gotBad * FLEET)} of {fmt.int(FLEET)}) ever got it; on day {day}, {pct1(bad.onBad[day])} still run it. The rest were rolled back the next time they connected.
    </>
  ) : (
    <>
      With updates ({staged}), {day} days after the bug is found {pct1(good.fixed[day])} of devices have the fix. A recall would have reached {pct1(recall[day])}.
      {day90 !== null && <> 90% are fixed by day {day90}.</>}
    </>
  );

  return (
    <WhatIfFrame
      title="A fleet with a bug, and how fast it gets fixed (simulation)"
      withLabel="With updates over the air"
      withoutLabel="No updates: recall only"
      on={ota}
      onChange={setOta}
      verdict={verdict}
      controls={
        <>
          {ota && (
            <label className="field">
              <span>
                First stage <b>{first >= 100 ? 'everyone at once' : `${first}% of devices`}</b>
              </span>
              <input type="range" min={0} max={FIRST_STAGES.length - 1} step={1} value={stageIdx} onChange={(e) => setStageIdx(+e.target.value)} aria-label="How many devices get the fix first. The last position sends it to everyone at once." />
            </label>
          )}
          {ota && (
            <button type="button" className="btn quiet" aria-pressed={badFix} onClick={() => {
                setPlaying(false);
                if (!badFix) setDay(DETECT_DAY);
                setBadFix((v) => !v);
              }}>
              {badFix ? 'Back to a good fix' : 'What if the fix has its own bug?'}
            </button>
          )}
          <label className="field">
            <span>
              Days since the bug was found <b>{day}</b>
            </span>
            <input type="range" min={0} max={HORIZON} value={day} onChange={(e) => { setPlaying(false); setDay(+e.target.value); }} aria-label="Which day to look at, counted from the day the bug was found" />
          </label>
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Play it'}
          </button>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} 344`}
        className="dx-svg wi-svg we-svg"
        role="img"
        aria-label={
          !ota
            ? `No updates. ${pct1(recall[day])} of devices are fixed by recall ${day} days after the bug was found.`
            : showBad
              ? `A bad fix, with ${staged}. ${pct1(bad.onBad[day])} of devices run the bad update on day ${day}.`
              : `Updates over the air, with ${staged}. ${pct1(good.fixed[day])} of devices have the fix on day ${day}.`
        }
      >
        <text x={0} y={14} className="we-t-b">200 of {fmt.int(FLEET)} devices, day {day}</text>
        <text x={W} y={14} textAnchor="end" className="we-t">{ota ? `fix ready day ${FIX_READY}` : `recall opens day ${RECALL_START}`}</text>
        {dots.map((s, j) => {
          const cx = q(GX + (j % COLS) * GSTEP);
          const cy = q(GY + Math.floor(j / COLS) * GROW);
          return s === 'bad' ? (
            <rect key={j} className="we-dot" x={q(cx - 4.2)} y={q(cy - 4.2)} width={8.4} height={8.4} fill={AMBER} stroke={AMBER} strokeWidth={1} />
          ) : (
            <circle key={j} className="we-dot" cx={cx} cy={cy} r={s === 'fixed' ? 4.6 : 4} fill={s === 'fixed' ? GREEN : 'none'} stroke={s === 'fixed' ? GREEN : RED} strokeWidth={1.8} />
          );
        })}
        <text x={0} y={GY + ROWS * GROW + 6} className="we-t">
          {ota ? (showBad ? 'ring: has the original bug. square: running the bad update' : 'ring: still has the bug. dot: fixed') : 'ring: still has the bug. dot: fixed by recall'}
        </text>

        <text x={0} y={CT - 18} className="we-t-b">{showBad ? 'Share running the bad update' : 'Share of devices fixed'}</text>
        <text x={W} y={CT - 18} textAnchor="end" className="we-t-b">{pct1(mainCurve[day])}</text>
        {[0, 0.5, 1].map((s) => (
          <g key={s}>
            <line x1={CL} x2={CR} y1={yShare(s)} y2={yShare(s)} className="we-grid" />
            <text x={CL - 4} y={yShare(s) + 4} textAnchor="end" className="we-t">{Math.round(s * 100)}%</text>
          </g>
        ))}
        {[0, 30, 60, 90].map((d) => (
          <text key={d} x={xDay(d)} y={CB + 16} textAnchor={d === 0 ? 'start' : d === HORIZON ? 'end' : 'middle'} className="we-t">{d}</text>
        ))}
        <text x={W} y={CB + 16 + 0} textAnchor="end" className="we-t" opacity={0}>.</text>
        {ghostCurve && <path d={line(ghostCurve, HORIZON)} fill="none" stroke={ghostColor} strokeWidth={1.6} strokeDasharray="5 4" opacity={0.7} />}
        <path d={line(mainCurve, HORIZON)} fill="none" stroke={mainColor} strokeWidth={1.4} opacity={0.3} />
        <path d={line(mainCurve, day)} fill="none" stroke={mainColor} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
        <motion.line initial={false} animate={{ x1: xDay(day), x2: xDay(day) }} transition={{ duration: 0.2, ease: EASE }} y1={CT - 4} y2={CB} stroke="var(--ink)" strokeWidth={1.2} strokeDasharray="3 3" />
        <circle cx={xDay(day)} cy={yShare(mainCurve[day])} r={4.5} fill={mainColor} stroke="var(--surface)" strokeWidth={1.5} />
        <text x={CL} y={CB + 32} className="we-t">days since the bug was found</text>
      </svg>
      <ul className="we-legend">
        {!ota ? (
          <>
            <li style={{ color: RED }}><span className="we-sw" style={{ background: RED }} /> <span style={{ color: 'var(--ink-2)' }}>fixed by recall</span></li>
            <li style={{ color: GREEN }}><span className="we-sw" style={{ background: GREEN, opacity: 0.6 }} /> <span style={{ color: 'var(--ink-2)' }}>dashed: what updates would have done (staged, {first >= 100 ? 'all at once' : `${first}% first`})</span></li>
          </>
        ) : showBad ? (
          <li><span className="we-sw" style={{ background: AMBER }} /> <span>running the bad update. It falls when devices connect and take the rollback.</span></li>
        ) : (
          <>
            <li><span className="we-sw is-round" style={{ background: GREEN }} /> fixed by update</li>
            <li><span className="we-sw" style={{ background: RED, opacity: 0.7 }} /> dashed: a recall</li>
          </>
        )}
      </ul>
      <ul className="we-stats">
        {!ota ? (
          <>
            <li className="is-bad">
              <b>{pct1(1 - recall[day])}</b>still have the bug on day {day}
            </li>
            <li className="is-bad">
              <b>{pct(1 - recall[HORIZON])}</b>still have it after {HORIZON} days
            </li>
          </>
        ) : showBad ? (
          <>
            <li className={gotBad > 0.1 ? 'is-bad' : 'is-good'}>
              <b>{pct1(gotBad)}</b>of devices ever got the bad update
            </li>
            <li className={bad.onBad[HORIZON] > 0 ? 'is-bad' : 'is-good'}>
              <b>{pct1(bad.onBad[HORIZON])}</b>still run it on day {HORIZON} (never reconnected)
            </li>
          </>
        ) : (
          <>
            <li className="is-good">
              <b>{pct1(good.fixed[day])}</b>fixed on day {day}
            </li>
            <li className={good.fixed[HORIZON] < 0.97 ? 'is-bad' : 'is-good'}>
              <b>{pct1(1 - good.fixed[HORIZON])}</b>still unfixed on day {HORIZON}: devices that stay offline
            </li>
          </>
        )}
      </ul>
      <p className="we-note">
        Example fleet of {fmt.int(FLEET)} devices; one day it connects with chance 50%, 10% or 2% depending on the device. A staged rollout gives the fix to a small share, watches it for 3 days, then widens. It costs a few days, and it is what limits the damage when the fix is the bad one. Even with updates, devices that stay offline are not reached.
      </p>
    </WhatIfFrame>
  );
}
// 
