import { motion } from 'motion/react';
import { Root, EASE } from './shared';

const T0 = 24;
const T1 = 372;
const tx = (f: number) => T0 + f * (T1 - T0);

const LANES = [
  {
    name: 'On-demand',
    how: 'pay as you go, no commitment',
    good: 'good for: experiments, small steady loads',
    watch: 'watch: capacity may not be there when you ask',
  },
  {
    name: 'Reserved, committed or Capacity Block',
    how: 'commit to a period or a block of GPUs',
    good: 'good for: training runs, steady inference',
    watch: 'watch: you pay whether or not you use it',
  },
  {
    name: 'Spot (preemptible)',
    how: 'spare capacity at a steep discount',
    good: 'good for: checkpointed and batch jobs',
    watch: 'watch: taken back at short notice',
  },
];

const LANE_Y = (i: number) => 18 + i * 92;
const LANE_H = 76;

/**
 * Three ways to pay for the same GPU, drawn as a week of use. Filled blocks
 * are hours you pay for; the marks show what goes wrong in each model.
 */
export default function PricingModes() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Three ways to pay for a GPU, over one week</p>
        <svg viewBox="0 0 740 300" className="dx-svg" role="img" aria-label="On-demand: pay only for the blocks you run, but a request can find no capacity. Reserved: one block for the whole period, paid even when idle. Spot: cheap blocks that can be interrupted, resumed from a checkpoint.">
          {LANES.map((l, i) => {
            const y = LANE_Y(i);
            const mid = y + 44;
            return (
              <motion.g key={l.name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.15, ease: EASE }}>
                <rect x="14" y={y} width="712" height={LANE_H} rx="10" className="dx-frame" />
                <text x={T0} y={y + 20} className="dx-name" style={{ fontSize: 12.5 }}>{l.name}</text>
                <path d={`M ${T0} ${mid + 18} H ${T1}`} className="dx-link" style={{ strokeOpacity: 0.3 }} />

                {i === 0 && (
                  <g>
                    <rect x={tx(0.05)} y={mid - 8} width={tx(0.25) - tx(0.05)} height="20" rx="4" className="kv-a" />
                    <rect x={tx(0.55)} y={mid - 8} width={tx(0.7) - tx(0.55)} height="20" rx="4" className="kv-a" />
                    {/* asked for capacity, none available */}
                    <rect x={tx(0.35)} y={mid - 8} width={tx(0.48) - tx(0.35)} height="20" rx="4" className="kv-free" style={{ stroke: 'var(--warn)', strokeOpacity: 1 }} />
                    <path d={`M ${tx(0.39)} ${mid - 4} L ${tx(0.44)} ${mid + 8} M ${tx(0.44)} ${mid - 4} L ${tx(0.39)} ${mid + 8}`} style={{ stroke: 'var(--warn)', strokeWidth: 1.5 }} />
                  </g>
                )}

                {i === 1 && (
                  <g>
                    <rect x={tx(0)} y={mid - 8} width={tx(1) - tx(0)} height="20" rx="4" className="kv-a" style={{ fillOpacity: 0.25 }} />
                    <rect x={tx(0.1)} y={mid - 8} width={tx(0.55) - tx(0.1)} height="20" rx="4" className="kv-a" />
                    <rect x={tx(0.7)} y={mid - 8} width={tx(0.85) - tx(0.7)} height="20" rx="4" className="kv-a" />
                    <text x={tx(0.62)} y={mid + 5} textAnchor="middle" className="dx-small">idle</text>
                  </g>
                )}

                {i === 2 && (
                  <g>
                    <rect x={tx(0.05)} y={mid - 8} width={tx(0.3) - tx(0.05)} height="20" rx="4" className="kv-c" />
                    <path d={`M ${tx(0.31)} ${mid - 10} l -5 11 h 7 l -5 11`} style={{ stroke: 'var(--warn)', strokeWidth: 1.5, fill: 'none' }} />
                    <rect x={tx(0.42)} y={mid - 8} width={tx(0.75) - tx(0.42)} height="20" rx="4" className="kv-c" />
                    <path d={`M ${tx(0.3)} ${mid + 14} C ${tx(0.34)} ${mid + 24}, ${tx(0.38)} ${mid + 24}, ${tx(0.42)} ${mid + 14}`} className="dx-residual" />
                    <text x={tx(0.44)} y={mid - 14} className="dx-small">resume from checkpoint</text>
                  </g>
                )}

                <text x="396" y={y + 22} className="dx-small" style={{ fill: 'var(--ink)' }}>{l.how}</text>
                <text x="396" y={y + 42} className="dx-small">{l.good}</text>
                <text x="396" y={y + 60} className="dx-small" style={{ fill: 'var(--cost)' }}>{l.watch}</text>
              </motion.g>
            );
          })}
        </svg>
        <p className="viz-cap">
          The pale band is reserved time you pay for while idle; reserve when the work is steady or you need guaranteed capacity. Spot suits fault-tolerant work with checkpoints, not latency-critical serving without a fallback.
        </p>
      </div>
    </Root>
  );
}
