import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { batchSizes, costPerMTok, example, kvPerUserGB, lastReplySeconds, modeCost, modeTokS, perUserTokS, stepSeconds, totalTokS, weightsGB } from '../../lib/whatif/no-batching';

const COLS = 16;
const CELL = 20;
const GAP = 3;
const BAR_X = 6;
const BAR_W = 368;

const seconds = (s: number) => (s >= 100 ? `${Math.round(s)} s` : s >= 10 ? `${s.toFixed(0)} s` : `${s.toFixed(1)} s`);

/**
 * A lane of squares, one per waiting user. Lit squares are served in the current GPU step.
 * Batched: all of them. One at a time: only the first, and the rest wait. Bars below show
 * total throughput, cost per million tokens and how long the last person waits.
 */
export default function NoBatchingWhatIf() {
  const [batched, setBatched] = useState(true);
  const [idx, setIdx] = useState(4);
  const [playing, setPlaying] = useState(false);
  const waiting = batchSizes[idx];

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= batchSizes.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 800);
    return () => clearInterval(t);
  }, [playing]);

  const maxTok = totalTokS(batchSizes[batchSizes.length - 1]);
  const maxCost = costPerMTok(1);
  const maxWait = lastReplySeconds(batchSizes[batchSizes.length - 1], false);

  const rows = [
    { label: 'Tokens per second, everyone together', value: modeTokS(waiting, batched), other: modeTokS(waiting, !batched), max: maxTok, text: fmt.int(modeTokS(waiting, batched)), good: batched },
    { label: 'Cost per million tokens (example)', value: modeCost(waiting, batched), other: modeCost(waiting, !batched), max: maxCost, text: fmt.usd(modeCost(waiting, batched)), good: batched },
    { label: 'Last person has the whole reply after', value: lastReplySeconds(waiting, batched), other: lastReplySeconds(waiting, !batched), max: maxWait, text: seconds(lastReplySeconds(waiting, batched)), good: batched },
  ];
  const laneH = 4 * (CELL - 4 + GAP) + 6;
  const top = 26;
  const rowTop = top + laneH + 18;
  const H = rowTop + rows.length * 46 + 6;

  return (
    <WhatIfFrame
      title="One GPU, a crowd of waiting users"
      withLabel="With batching"
      withoutLabel="One at a time"
      on={batched}
      onChange={setBatched}
      verdict={
        batched ? (
          <>
            {waiting} {waiting === 1 ? 'person is' : 'people are'} served together: {fmt.int(totalTokS(waiting))} tokens per second in total, about {fmt.usd(costPerMTok(waiting))} per million tokens, and everyone has a full reply after {seconds(lastReplySeconds(waiting, true))} (example GPU).
          </>
        ) : (
          <>
            One at a time, {waiting} waiting {waiting === 1 ? 'person gets' : 'people share'} {fmt.int(totalTokS(1))} tokens per second in total: {fmt.usd(costPerMTok(1))} per million tokens, and the last person waits {seconds(lastReplySeconds(waiting, false))} (example GPU).
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              People waiting <b>{waiting}</b>
            </span>
            <input
              type="range"
              min={0}
              max={batchSizes.length - 1}
              value={idx}
              onChange={(e) => {
                setPlaying(false);
                setIdx(+e.target.value);
              }}
              aria-label="Number of people waiting for a reply"
              aria-valuetext={`${waiting} people`}
            />
          </label>
          <div className="ws-btnrow">
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                setIdx(0);
                setPlaying(true);
              }}
            >
              {playing ? 'Playing…' : 'Play it'}
            </button>
          </div>
        </>
      }
    >
      <p className="ws-idea">
        To write each word, the GPU has to read the whole model from memory. Reading it once for many people costs almost the same as reading it for one.
      </p>
      <svg
        viewBox={`0 0 380 ${H}`}
        className="dx-svg wi-svg ws-svg"
        role="img"
        aria-label={`A GPU lane with ${waiting} waiting users. ${batched ? 'All of them are served in the same step.' : 'Only the first is served; the rest wait in a queue.'}`}
      >
        <text x={BAR_X} y={16} className="ws-svg-h">
          GPU lane: one square per waiting person
        </text>
        {Array.from({ length: batchSizes[batchSizes.length - 1] }, (_, i) => {
          const present = i < waiting;
          const lit = present && (batched || i === 0);
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          return (
            <motion.rect
              key={i}
              x={BAR_X + col * (CELL + GAP)}
              y={top + row * (CELL - 4 + GAP)}
              width={CELL}
              height={CELL - 4}
              rx={4}
              className={batched ? 'ws-good' : 'ws-bad'}
              initial={false}
              animate={{ fillOpacity: lit ? 0.92 : 0, opacity: present ? 1 : 0.18 }}
              transition={{ duration: 0.4, ease: EASE, delay: batched ? Math.min(i * 0.012, 0.5) : 0 }}
              stroke="currentColor"
              strokeWidth={1.2}
              strokeDasharray={present && !lit ? '3 2' : undefined}
              style={{ color: 'var(--ink)' }}
            />
          );
        })}
        {rows.map((r, k) => {
          const y = rowTop + k * 46;
          const w = Math.max(3 / BAR_W, Math.min(1, r.value / r.max));
          const ox = BAR_X + Math.min(1, r.other / r.max) * BAR_W;
          return (
            <g key={r.label}>
              <text x={BAR_X} y={y} className="ws-svg-t">
                {r.label}
              </text>
              <rect x={BAR_X} y={y + 7} width={BAR_W} height={16} rx={5} className="ws-track" />
              <motion.rect x={BAR_X} y={y + 7} width={BAR_W} height={16} rx={3} className={r.good ? 'ws-good' : 'ws-bad'} initial={false} animate={{ scaleX: w }} style={{ originX: 0, transformBox: 'fill-box' }} transition={{ duration: 0.5, ease: EASE }} />
              <line x1={ox} x2={ox} y1={y + 3} y2={y + 27} stroke="var(--ink)" strokeWidth={2} strokeDasharray="2 2" />
              <text x={BAR_X + BAR_W} y={y} textAnchor="end" className="ws-svg-b">
                {r.text}
              </text>
            </g>
          );
        })}
        <text x={BAR_X} y={H - 2} className="ws-svg-t">
          dashed tick = the same number the other way
        </text>
      </svg>
      <p className="ws-note">
        Example setup, not a benchmark: 8-billion-parameter model in 16-bit numbers ({weightsGB()} GB), a GPU reading {example.bandwidthGBs.toLocaleString('en-US')} GB per second at {Math.round(example.efficiency * 100)}% efficiency, rented at ${example.pricePerHour.toFixed(2)} per hour, {example.contextTokens.toLocaleString('en-US')} tokens of context per person, {example.replyTokens}-token replies.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <p className="ws-note" style={{ marginTop: 0 }}>
          Step time = (weights + people x cache of {kvPerUserGB().toFixed(3)} GB) divided by usable bandwidth, or the arithmetic time if that is larger. Tokens per second = people / step time. Cost = price per second / tokens per second.
        </p>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>People</th>
                <th>Step</th>
                <th>Total tok/s</th>
                <th>Each</th>
                <th>$ per M</th>
              </tr>
            </thead>
            <tbody>
              {batchSizes.map((b) => (
                <tr key={b} className={b === waiting ? 'is-now' : ''}>
                  <td>{b}</td>
                  <td>{(stepSeconds(b) * 1000).toFixed(1)} ms</td>
                  <td>{fmt.int(totalTokS(b))}</td>
                  <td>{perUserTokS(b).toFixed(1)}</td>
                  <td>{fmt.usd(costPerMTok(b))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </WhatIfFrame>
  );
}
