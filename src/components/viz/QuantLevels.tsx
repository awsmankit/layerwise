import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/** Eight example weights: seven small ones and one large outlier, as real layers often have. */
const W = [-0.12, -0.09, -0.05, 0.02, 0.04, 0.08, 0.11, 0.93];
const OUTLIER = 7;

const X0 = 40;
const X1 = 700;
const LO = -0.2;
const HI = 1;
const x = (v: number) => X0 + ((v - LO) / (HI - LO)) * (X1 - X0);

/** Symmetric round-to-nearest with one scale: the largest magnitude maps to the top level. */
function quantize(values: number[], bits: number) {
  const top = 2 ** (bits - 1) - 1;
  const scale = Math.max(...values.map(Math.abs)) / top;
  return { scale, q: values.map((v) => Math.round(v / scale) * scale) };
}

/**
 * Quantization drawn on a number line. Each weight snaps to the nearest level
 * the bit width allows. With one scale for all eight, the outlier stretches
 * the levels so far apart that the small weights collapse to zero; a scale per
 * group keeps them apart. Errors are computed, not typed in.
 */
export default function QuantLevels() {
  const [bits, setBits] = useState(4);
  const [grouped, setGrouped] = useState(false);

  const small = W.filter((_, i) => i !== OUTLIER);
  const one = quantize(W, bits);
  const groupSmall = quantize(small, bits);
  const q = grouped ? W.map((v, i) => (i === OUTLIER ? v : groupSmall.q[small.indexOf(v)])) : one.q;
  const err = W.reduce((n, v, i) => n + Math.abs(v - q[i]), 0) / W.length;
  const zeroed = W.filter((v, i) => i !== OUTLIER && q[i] === 0).length;

  const scale = grouped ? groupSmall.scale : one.scale;
  const top = 2 ** (bits - 1) - 1;
  const ticks = Array.from({ length: 2 * top + 1 }, (_, k) => (k - top) * scale).filter((v) => v >= LO - 1e-9 && v <= HI + 1e-9);

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Snapping weights to fewer levels</p>
          <div className="dx-steps">
            {[8, 4, 3].map((b) => (
              <button key={b} type="button" className="btn quiet" aria-pressed={bits === b} onClick={() => setBits(b)}>
                {b}-bit
              </button>
            ))}
            <button type="button" className="btn quiet" aria-pressed={grouped} onClick={() => setGrouped((g) => !g)}>
              {grouped ? 'Scale per group' : 'One scale for all'}
            </button>
          </div>
        </div>

        <svg viewBox="0 0 740 220" className="dx-svg" role="img" aria-label={`${bits}-bit, ${grouped ? 'a scale per group' : 'one scale for all'}: ${zeroed} of 7 small weights become zero, average error ${err.toFixed(3)}`}>
          <text x={X0} y="26" className="dx-small">original weights</text>
          <text x={X0} y="206" className="dx-small">{`stored with ${bits} bits`}</text>

          {/* the allowed levels */}
          {ticks.map((v, k) => (
            <line key={`${bits}-${grouped}-${k}`} x1={x(v)} x2={x(v)} y1="104" y2="126" className="dx-link" style={{ strokeOpacity: ticks.length > 40 ? 0.25 : 0.6 }} />
          ))}
          <path d={`M ${X0} 115 H ${X1}`} className="dx-link" />
          <text x={X0} y="146" className="dx-small">-0.2</text>
          <text x={x(0)} y="146" textAnchor="middle" className="dx-small" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>0</text>
          <text x={X1} y="146" textAnchor="end" className="dx-small">1</text>
          {grouped && <text x={x(0.93)} y="96" textAnchor="middle" className="dx-small">own scale</text>}

          {W.map((v, i) => (
            <g key={i}>
              <circle cx={x(v)} cy={i % 2 ? 58 : 44} r="5" className="dx-core" style={{ stroke: i === OUTLIER ? 'var(--cost)' : undefined, strokeWidth: 1.5 }} />
              <motion.path
                initial={false}
                animate={{ d: `M ${x(v)} ${i % 2 ? 63 : 49} L ${x(q[i])} 176` }}
                transition={{ duration: 0.5, ease: EASE }}
                className="dx-link"
                style={{ strokeDasharray: '2 3' }}
              />
              <motion.circle initial={false} animate={{ cx: x(q[i]) }} transition={{ duration: 0.5, ease: EASE }} cy="181" r="5" className={i === OUTLIER ? 'kv-b' : 'kv-a'} />
            </g>
          ))}
        </svg>

        <p className="viz-cap">
          {`${2 * top + 1} levels. ${zeroed} of the 7 small weights became zero; average error ${err.toFixed(3)}. `}
          {grouped
            ? 'With its own scale, the small group keeps fine levels near zero. Storing one extra scale per group, commonly every 32 to 128 weights, is a small price.'
            : 'The outlier sets the scale, so the levels near zero are far apart and small weights lose their differences. Try a scale per group.'}
        </p>
      </div>
    </Root>
  );
}
