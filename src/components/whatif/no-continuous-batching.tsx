import { useEffect, useMemo, useState } from 'react';
import WhatIfFrame from './WhatIfFrame';
import { fmt } from '../viz/shared';
import { busySlots, config, longestChoices, replyLengths, schedule, summarise } from '../../lib/whatif/no-continuous-batching';

const X0 = 24;
const PW = 350;
const TOP = 26;
const LANE = 16;
const GAP = 5;
const lanesH = config.slots * (LANE + GAP) - GAP;
const BASE = TOP + lanesH;
const H = BASE + 92;

const secs = (s: number) => (s >= 100 ? `${Math.round(s)} s` : `${s.toFixed(1)} s`);
const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Eight slot lanes, time running left to right. A green block is a reply being written. A red hatched block is a reply that
 * is already finished but held back because the group is not done. Gaps are slots with nothing to do.
 */
export default function NoContinuousBatchingWhatIf() {
  const [continuous, setContinuous] = useState(true);
  const [longIdx, setLongIdx] = useState(3);
  const longest = longestChoices[longIdx];
  const [pos, setPos] = useState(100);
  const [playing, setPlaying] = useState(false);

  const lengths = useMemo(() => replyLengths(longest), [longest]);
  const runs = useMemo(() => {
    const st = schedule('static', lengths);
    const co = schedule('continuous', lengths);
    return { static: { blocks: st, sum: summarise(st) }, continuous: { blocks: co, sum: summarise(co) } };
  }, [lengths]);
  const mine = continuous ? runs.continuous : runs.static;
  const theirs = continuous ? runs.static : runs.continuous;
  const maxSteps = Math.max(runs.static.sum.steps, runs.continuous.sum.steps);
  const shown = Math.round((pos / 100) * maxSteps);
  const x = (step: number) => X0 + (step / maxSteps) * PW;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setPos((p) => {
        if (p >= 100) {
          setPlaying(false);
          return 100;
        }
        return Math.min(100, p + 2);
      });
    }, 40);
    return () => clearInterval(id);
  }, [playing]);

  const replay = () => {
    setPos(0);
    setPlaying(true);
  };
  const flip = (v: boolean) => {
    setContinuous(v);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPlaying(false);
      setPos(100);
    } else replay();
  };

  const batchEnds = continuous ? [] : [...new Set(mine.blocks.map((b) => b.released))];
  const now = busySlots(mine.blocks, Math.min(shown, maxSteps - 1));
  const s = mine.sum;
  const o = theirs.sum;

  return (
    <WhatIfFrame
      title="Eight slots, forty replies waiting"
      withLabel="Continuous batching"
      withoutLabel="Wait for the whole batch"
      on={continuous}
      onChange={flip}
      verdict={
        continuous ? (
          <>
            Each slot is refilled as soon as its reply ends: {pct(s.utilisation)} of slot time does useful work, all {config.requests} replies are done in {fmt.int(s.steps)} steps, and the average person waits {secs(s.meanReplySeconds)} (example timing).
          </>
        ) : (
          <>
            Each group waits for its longest reply: only {pct(s.utilisation)} of slot time does useful work, the same {config.requests} replies take {fmt.int(s.steps)} steps, and the average person waits {secs(s.meanReplySeconds)}, because finished replies are held back (example timing).
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Longest reply in the mix <b>{longest} tokens</b>
            </span>
            <input type="range" min={0} max={longestChoices.length - 1} value={longIdx} onChange={(e) => setLongIdx(+e.target.value)} aria-label="Longest possible reply in tokens" aria-valuetext={`${longest} tokens`} />
          </label>
          <label className="field">
            <span>
              Time <b>step {Math.min(shown, maxSteps)}</b>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => {
                setPlaying(false);
                setPos(+e.target.value);
              }}
              aria-label="How far through the run to show"
              aria-valuetext={`step ${shown} of ${maxSteps}`}
            />
          </label>
          <div className="ws-btnrow">
            <button type="button" className="btn quiet" onClick={replay}>
              {playing ? 'Playing…' : 'Play it'}
            </button>
          </div>
        </>
      }
    >
      <p className="ws-idea">
        Some replies are short and some are long. If the server only starts new work when the whole group is done, the short ones finish, then their slots sit empty.
      </p>
      <svg
        viewBox={`0 0 380 ${H}`}
        className="dx-svg wi-svg ws-svg"
        role="img"
        aria-label={`Eight slot lanes over time. ${continuous ? 'Each slot starts its next reply as soon as the last one ends.' : 'Finished replies are held, shown hatched, until the longest reply in the group ends.'} ${pct(s.utilisation)} of slot time is useful. All replies are done after ${s.steps} steps.`}
      >
        <defs>
          <pattern id="ws-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="#d6453d" strokeWidth="2" />
          </pattern>
        </defs>
        <text x={6} y={16} className="ws-svg-h">
          One lane per slot, time runs to the right
        </text>
        {Array.from({ length: config.slots }, (_, k) => (
          <g key={k}>
            <rect x={X0} y={TOP + k * (LANE + GAP)} width={PW} height={LANE} rx={3} className="ws-lane-bg" />
            <text x={X0 - 5} y={TOP + k * (LANE + GAP) + 12.5} textAnchor="end" className="ws-svg-t">
              {k + 1}
            </text>
          </g>
        ))}
        {mine.blocks.map((b) => {
          const y = TOP + b.slot * (LANE + GAP);
          const workEnd = Math.min(b.end, shown);
          const heldEnd = Math.min(b.released, shown);
          return (
            <g key={b.request}>
              {shown > b.start && <rect x={x(b.start)} y={y} width={Math.max(0.5, x(workEnd) - x(b.start))} height={LANE} rx={2} className={b.request % 2 ? 'ws-work-b' : 'ws-work-a'} stroke="var(--surface)" strokeWidth={0.8} />}
              {b.released > b.end && shown > b.end && <rect x={x(b.end)} y={y} width={Math.max(0.5, x(heldEnd) - x(b.end))} height={LANE} fill="url(#ws-hatch)" stroke="#d6453d" strokeWidth={0.8} />}
            </g>
          );
        })}
        {batchEnds.map((e) => (
          <line key={e} x1={x(e)} x2={x(e)} y1={TOP - 4} y2={BASE + 4} className="ws-batch-line" />
        ))}
        <line x1={x(o.steps)} x2={x(o.steps)} y1={TOP - 4} y2={BASE + 6} stroke="var(--ink)" strokeWidth={2} strokeDasharray="2 2" />
        <line x1={x(shown)} x2={x(shown)} y1={TOP - 4} y2={BASE + 4} className="ws-now" />
        <text x={X0} y={BASE + 16} className="ws-svg-t">
          0
        </text>
        <text x={X0 + PW} y={BASE + 16} textAnchor="end" className="ws-svg-t">
          {maxSteps} steps
        </text>
        <rect x={6} y={BASE + 28} width={14} height={12} className="ws-work-a" />
        <text x={25} y={BASE + 38} className="ws-legend-t">
          writing a reply
        </text>
        <rect x={160} y={BASE + 28} width={14} height={12} fill="url(#ws-hatch)" stroke="#d6453d" strokeWidth={1} />
        <text x={179} y={BASE + 38} className="ws-legend-t">
          finished, held back
        </text>
        <rect x={6} y={BASE + 48} width={14} height={12} rx={2} className="ws-lane-bg" stroke="var(--line)" />
        <text x={25} y={BASE + 58} className="ws-legend-t">
          empty slot
        </text>
        <line x1={160} x2={174} y1={BASE + 54} y2={BASE + 54} stroke="var(--ink)" strokeWidth={2} strokeDasharray="2 2" />
        <text x={179} y={BASE + 58} className="ws-legend-t">
          other way ends: {o.steps}
        </text>
        <text x={6} y={BASE + 82} className="ws-svg-t">
          At step {Math.min(shown, maxSteps)}: {now} of {config.slots} slots are writing.
        </text>
      </svg>
      <div className="ws-stats is-tight" aria-live="off">
        <div>
          <b>{pct(s.utilisation)}</b>
          <span>of slot time useful (other way {pct(o.utilisation)})</span>
        </div>
        <div>
          <b>{fmt.int(s.tokensPerSecond)}</b>
          <span>tokens per second (other way {fmt.int(o.tokensPerSecond)})</span>
        </div>
        <div>
          <b>{secs(s.meanReplySeconds)}</b>
          <span>average wait for a reply (other way {secs(o.meanReplySeconds)})</span>
        </div>
      </div>
      <p className="ws-note">
        Example, not a benchmark: {config.slots} slots, {config.requests} requests already waiting, reply lengths from {config.shortest} to {longest} tokens (many short, a few long, fixed seed), {config.stepSeconds * 1000} ms per step. Prompt reading and memory limits are left out to keep the picture simple.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <p className="ws-note" style={{ marginTop: 0 }}>
          Static: a group of {config.slots} ends after its longest reply, so the run takes the sum of the group maxima. Continuous: each next reply starts on the slot that frees first. Useful share = tokens written / (slots x steps). Tokens per second = tokens / (steps x {config.stepSeconds} s). Both write the same {fmt.int(s.tokens)} tokens.
        </p>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Mode</th>
                <th>Steps</th>
                <th>Useful</th>
                <th>Idle slot-steps</th>
                <th>Held (avg)</th>
              </tr>
            </thead>
            <tbody>
              {(['static', 'continuous'] as const).map((k) => (
                <tr key={k} className={(k === 'continuous') === continuous ? 'is-now' : ''}>
                  <td>{k === 'static' ? 'Whole batch' : 'Continuous'}</td>
                  <td>{fmt.int(runs[k].sum.steps)}</td>
                  <td>{pct(runs[k].sum.utilisation)}</td>
                  <td>{fmt.int(runs[k].sum.idleSlotSteps)}</td>
                  <td>{runs[k].sum.meanHeldSteps.toFixed(0)} steps</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </WhatIfFrame>
  );
}
