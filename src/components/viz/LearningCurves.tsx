import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/** Turn a list of values into an SVG path, one point per index. */
function line(values: number[], x: (i: number) => number, y: (v: number) => number) {
  return values.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
}

/* Three runs of the same problem, one panel per learning rate. Each panel has its own scale so
   the shape of each run is visible. The numbers quoted in the lesson are the ones on the curves. */
const RUNS = [
  { name: '0.001', verdict: 'creeps', top: 30, values: [29, 27.1, 25.3, 23.7, 22.2, 20.8, 19.5, 18.3, 17.1, 16.1, 15.1] },
  { name: '0.01', verdict: 'works', top: 30, values: [29, 12.96, 5.82, 2.6, 1.2, 0.5, 0.2, 0.1] },
  { name: '0.1', verdict: 'explodes', top: 900, values: [29, 157, 849] },
];

/** Training and validation loss over epochs. Illustrative shape, not a real run. */
const EPOCHS = 20;
const train = Array.from({ length: EPOCHS + 1 }, (_, t) => 2.2 * Math.exp(-0.28 * t) + 0.05);
const valid = Array.from({ length: EPOCHS + 1 }, (_, t) => 2.0 * Math.exp(-0.22 * t) + 0.12 + 0.012 * Math.max(0, t - 7) ** 1.7);

/**
 * How a learning rate and overfitting show up on a loss curve. Top: the same
 * setup trained with three learning rates. Bottom: training loss keeps falling
 * while validation loss turns back up once the model starts to memorise.
 */
export default function LearningCurves({ show = 'both' }: { show?: 'rate' | 'overfit' | 'both' }) {
  const pw = 210;
  const ph = 150;
  return (
    <Root>
      <div className="viz dx">
        {show !== 'overfit' && (
        <>
        <p className="viz-title">Learning rate: three runs</p>
        <svg viewBox="0 0 760 210" className="dx-svg" role="img" aria-label="Three loss curves: 0.001 falls slowly, 0.01 falls quickly to near zero, 0.1 rises sharply">
          {RUNS.map((r, k) => {
            const ox = 20 + k * 250;
            const x = (i: number) => ox + 12 + (i / (r.values.length - 1 || 1)) * (pw - 24);
            const y = (v: number) => 30 + ph - (Math.min(v, r.top) / r.top) * ph;
            return (
              <g key={r.name}>
                <rect x={ox} y="20" width={pw} height={ph + 20} className="dx-frame" />
                <path d={`M ${ox + 12} ${30} V ${30 + ph} H ${ox + pw - 12}`} className="dx-link" />
                <motion.path
                  d={line(r.values, x, y)}
                  className="dx-curve"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, delay: k * 0.2, ease: EASE }}
                />
                {r.values.length > 0 && <circle cx={x(0)} cy={y(r.values[0])} r="2.5" className="dx-packet" />}
                <text x={ox + 12} y="16" className="dx-small">rate {r.name}, {r.verdict}</text>
              </g>
            );
          })}
        </svg>
        <p className="viz-cap">
          With 0.001 the loss only creeps down; 0.01 reaches almost zero in a few steps; 0.1 overshoots and climbs. Each panel has its own vertical scale.
        </p>
        </>
        )}

        {show !== 'rate' && (
        <>
        <p className="viz-title">Overfitting</p>
        <svg viewBox="0 0 760 220" className="dx-svg" role="img" aria-label="Training loss falls throughout; validation loss falls, then rises after about epoch 7">
          <path d="M 40 20 V 190 H 740" className="dx-link" />
          {(() => {
            const sx = (t: number) => 40 + (t / EPOCHS) * 700;
            const sy = (v: number) => 190 - (v / 2.4) * 160;
            const split = 7;
            return (
              <>
                <line x1={sx(split)} x2={sx(split)} y1="20" y2="190" className="dx-link" strokeDasharray="4 4" />
                <text x={sx(split) + 8} y="36" className="dx-small">validation turns up</text>
                <motion.path d={line(train, sx, sy)} className="dx-curve" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: EASE }} />
                <motion.path d={line(valid, sx, sy)} className="dx-residual" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.2, ease: EASE }} />
                <text x="735" y="172" textAnchor="end" className="dx-small">training</text>
                <text x="735" y="70" textAnchor="end" className="dx-small">validation</text>
                <text x="740" y="208" textAnchor="end" className="dx-small">epochs</text>
              </>
            );
          })()}
        </svg>
        </>
        )}
      </div>
    </Root>
  );
}
