import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { gradientLabel, gradientSizes, MAX_DEPTH, WIDTH } from '../../lib/whatif/no-residual-connections';

const X0 = 82;
const X1 = 334;
const TOP = 0.7; // log10 at the top of the plot
const FLOOR = -15;
const Y0 = 22;
const PER = 12; // pixels per factor of ten
const BASE = Y0 + (TOP - FLOOR) * PER;

const r1 = (n: number) => Math.round(n * 10) / 10; // rounded so the server and the browser print the same text
const yOf = (ratio: number) => r1(Y0 + (TOP - Math.max(FLOOR, Math.min(TOP, Math.log10(Math.max(ratio, 1e-30))))) * PER);

/**
 * One bar per layer shows how much learning signal (gradient) arrives there when the error is sent
 * backward from the output. Without skip connections it fades layer by layer; with them it does not.
 */
export default function NoResidualConnections() {
  const [skip, setSkip] = useState(false);
  const [depth, setDepth] = useState(20);
  const [reach, setReach] = useState(MAX_DEPTH + 1); // how many layers back from the output the signal has travelled
  const [playing, setPlaying] = useState(false);

  const plain = useMemo(() => gradientSizes(depth, false), [depth]);
  const skips = useMemo(() => gradientSizes(depth, true), [depth]);
  const sizes = skip ? skips : plain;
  const other = skip ? plain : skips;
  const barW = (X1 - X0) / (depth + 1);
  const first = sizes[0];

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setReach((r) => {
        if (r >= depth + 1) {
          setPlaying(false);
          return r;
        }
        return r + 1;
      });
    }, 70);
    return () => clearInterval(id);
  }, [playing, depth]);

  const play = () => {
    setReach(0);
    setPlaying(true);
  };

  const ticks = [
    { v: 0, label: 'same' },
    { v: -5, label: '1/100,000' },
    { v: -10, label: '1/10 billion' },
    { v: -15, label: '1/quadrillion' },
  ];
  const lit = (l: number) => depth - l < reach; // layer l has been reached by the backward pass

  return (
    <WhatIfFrame
      title="How much learning signal reaches each layer?"
      withLabel="With skip connections"
      withoutLabel="Without them"
      on={skip}
      onChange={(v) => {
        setPlaying(false);
        setReach(MAX_DEPTH + 1);
        setSkip(v);
      }}
      verdict={
        skip ? (
          <>
            With a skip around every layer, the first of {depth} layers still receives a signal {gradientLabel(first)} size. Every layer can learn.
          </>
        ) : (
          <>
            Without skips, the first of {depth} layers receives a signal that is {gradientLabel(first)} size. It is too small to learn from, so the early layers barely change.
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Layers in the stack <b>{depth}</b>
            </span>
            <input type="range" min={2} max={MAX_DEPTH} value={depth} onChange={(e) => { setPlaying(false); setReach(MAX_DEPTH + 1); setDepth(+e.target.value); }} aria-label="Number of layers in the stack" />
          </label>
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Sending…' : 'Send the error backward'}
          </button>
        </>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox="0 0 340 276" className="dx-svg wi-svg" role="img" aria-label={`Bars on a ten-fold scale showing the learning signal at each of ${depth} layers. ${skip ? 'With skip connections it stays about the size of the output signal.' : `Without skip connections it falls to ${gradientLabel(first)} size at the first layer.`}`}>
          {ticks.map((t) => (
            <g key={t.v}>
              <line x1={X0} x2={X1} y1={yOf(10 ** t.v)} y2={yOf(10 ** t.v)} stroke="currentColor" strokeOpacity={t.v === 0 ? 0.7 : 0.18} strokeDasharray={t.v === 0 ? undefined : '3 4'} strokeWidth={t.v === 0 ? 1.4 : 1} />
              <text x={X0 - 5} y={yOf(10 ** t.v) + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                {t.label}
              </text>
            </g>
          ))}
          {Array.from({ length: MAX_DEPTH + 1 }, (_, l) => {
            const present = l <= depth && lit(l);
            const v = l <= depth ? sizes[l] : 1;
            const top = yOf(v);
            const weak = v < 0.01;
            return (
              <g key={l}>
                <motion.rect
                  x={X0 + l * barW + 1}
                  width={barW - 2}
                  rx={1.5}
                  initial={false}
                  animate={{ y: r1(Math.min(top, BASE - 2)), height: present ? r1(Math.max(2, BASE - top)) : 0, opacity: present ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  fill={weak ? '#d6453d' : '#1f9d6b'}
                />
                {present && l <= depth && (
                  <line x1={X0 + l * barW + 0.5} x2={X0 + (l + 1) * barW - 0.5} y1={yOf(other[l])} y2={yOf(other[l])} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.6} strokeDasharray="2 1.5" />
                )}
              </g>
            );
          })}
          <text x={X0} y={BASE + 18} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            first layer
          </text>
          <text x={X0 + (depth + 1) * barW} y={BASE + 18} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            output
          </text>
          <text x={4} y={BASE + 38} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            bars = {skip ? 'with' : 'without'} skips; dashes = {skip ? 'without' : 'with'} skips
          </text>
          <text x={4} y={BASE + 54} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            height = size of the signal there, compared with the output
          </text>
          <text x={4} y={13} style={{ fill: skip ? '#1f9d6b' : '#d6453d', fontSize: 13, fontWeight: 700 }}>
            {skip ? 'signal reaches every layer' : first < 0.01 ? 'signal fades away (red bars)' : 'signal still strong at this depth'}
          </text>
        </svg>
      </div>
      <p className="wt-note">
        Numbers: a real random stack, {WIDTH} units wide per layer, sigmoid units (their slope is at most 0.25). The error is pushed back one layer at a time by the chain rule and each bar is the size of the gradient there divided by its size at the output, averaged over 8 random stacks. A skip layer computes h + 0.3 x (change), so the gradient always has a direct path of size 1.
      </p>
    </WhatIfFrame>
  );
}
