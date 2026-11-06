import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { activationSizes, describeDrift, MAX_DEPTH, ratioLabel, WIDTH } from '../../lib/whatif/no-normalisation';

const X0 = 52;
const X1 = 336;
const MID = 118; // y of the "same size as the input" line
const PER_DECADE = 23; // pixels per factor of ten
const DECADES = 4;

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Bars show how big the numbers inside a random network are at each layer, compared with the input.
 * Above the middle line they have grown, below it they have shrunk. Layer norm pins them to the line.
 */
export default function NoNormalisation() {
  const [norm, setNorm] = useState(false);
  const [depth, setDepth] = useState(16);
  const [scale, setScale] = useState(1.2);

  const sizes = useMemo(() => activationSizes(MAX_DEPTH, scale, norm), [scale, norm]);
  const shown = sizes.slice(1, depth + 1);
  const ratio = shown[shown.length - 1] / sizes[0];
  const barW = (X1 - X0) / MAX_DEPTH;
  const state = describeDrift(ratio);

  const ticks = [
    { d: 4, label: '10,000x' },
    { d: 2, label: '100x' },
    { d: 0, label: 'input' },
    { d: -2, label: '1/100' },
    { d: -4, label: '1/10,000' },
  ];

  return (
    <WhatIfFrame
      title="How big are the numbers inside a deep network?"
      withLabel="With normalisation"
      withoutLabel="Without it"
      on={norm}
      onChange={setNorm}
      verdict={
        norm ? (
          <>
            With a normalising step after every layer, the numbers at layer {depth} are {ratioLabel(ratio)}, and they stay near there at every depth, even though the starting weights are off by {Math.round(Math.abs(scale - 1) * 100)}%.
          </>
        ) : (
          <>
            Without it, by layer {depth} the numbers are {ratioLabel(ratio)} ({state}). The weights were only {scale === 1 ? 'exactly right' : `${Math.round(Math.abs(scale - 1) * 100)}% ${scale > 1 ? 'too big' : 'too small'}`}.
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Layers <b>{depth}</b>
            </span>
            <input type="range" min={1} max={MAX_DEPTH} value={depth} onChange={(e) => setDepth(+e.target.value)} aria-label="Number of layers" />
          </label>
          <label className="field">
            <span>
              Starting weight size <b>{scale.toFixed(2)}</b> (1.00 is carefully tuned)
            </span>
            <input type="range" min={0.6} max={1.4} step={0.05} value={scale} onChange={(e) => setScale(+e.target.value)} aria-label="Size of the random starting weights, where 1 is carefully tuned" />
          </label>
        </>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox="0 0 340 262" className="dx-svg wi-svg" role="img" aria-label={`Bars showing the typical size of the numbers at each of ${depth} layers, compared with the input. ${norm ? 'With normalisation they stay level.' : `Without it they are ${ratioLabel(ratio)} at the last layer.`}`}>
          {ticks.map((t) => (
            <g key={t.d}>
              <line x1={X0} x2={X1} y1={MID - t.d * PER_DECADE} y2={MID - t.d * PER_DECADE} stroke="currentColor" strokeOpacity={t.d === 0 ? 0.8 : 0.18} strokeWidth={t.d === 0 ? 1.5 : 1} strokeDasharray={t.d === 0 ? undefined : '3 4'} />
              <text x={X0 - 5} y={MID - t.d * PER_DECADE + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                {t.label}
              </text>
            </g>
          ))}
          {Array.from({ length: MAX_DEPTH }, (_, i) => {
            const present = i < depth;
            const v = present ? shown[i] : 1;
            const dec = Math.max(-DECADES, Math.min(DECADES, Math.log10(Math.max(v, 1e-12) / sizes[0])));
            const h = Math.max(1.5, Math.abs(dec) * PER_DECADE);
            const up = dec >= 0;
            const bad = present && (v / sizes[0] > 3 || v / sizes[0] < 1 / 3);
            return (
              <motion.rect
                key={i}
                x={X0 + i * barW + 1.5}
                width={barW - 3}
                rx={2}
                initial={false}
                animate={{ y: up ? r1(MID - h) : MID, height: present ? r1(h) : 0, opacity: present ? 1 : 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                fill={bad ? '#d6453d' : '#1f9d6b'}
              />
            );
          })}
          <text x={X0} y={MID + DECADES * PER_DECADE + 24} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            layer 1
          </text>
          <text x={4} y={MID + DECADES * PER_DECADE + 42} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            above the line = bigger than the input
          </text>
          <text x={X0 + (depth - 0.5) * barW} y={MID + DECADES * PER_DECADE + 24} textAnchor={depth > 8 ? 'end' : 'start'} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            layer {depth}
          </text>
          <text x={4} y={14} style={{ fill: bad(state) ? '#d6453d' : '#1f9d6b', fontSize: 13, fontWeight: 700 }}>
            {state === 'steady' ? 'steady' : state === 'blowing up' ? 'blowing up (red = 3x or more off)' : 'fading away (red = 3x or more off)'}
          </text>
        </svg>
      </div>
      <p className="wt-note">
        Numbers: a real random network, {WIDTH} units wide, ReLU activations, 16 random inputs. Each bar is the typical (root-mean-square) size after that layer, on a ten-fold scale. Weights are random with spread {scale.toFixed(2)} x sqrt(2 / {WIDTH}).{' '}
        {norm
          ? 'Layer norm rescales each layer\'s numbers to mean 0 and spread 1 before the ReLU, so the weight size no longer matters (about 0.7 is what a ReLU leaves of that).'
          : `Each layer multiplies the size by about the weight scale, so ${scale.toFixed(2)} over ${depth} layers is about ${Math.pow(scale, depth) >= 10 ? Math.round(Math.pow(scale, depth)).toLocaleString('en-US') : Math.pow(scale, depth).toPrecision(2)} times.`}
      </p>
    </WhatIfFrame>
  );
}

function bad(state: string) {
  return state !== 'steady';
}
