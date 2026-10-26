import { motion } from 'motion/react';
import { Root, EASE } from './shared';

type Option = {
  name: string;
  sub: string;
  /** Capacity over time, as points from 0 (none) to 1 (full), left to right. */
  capacity: number[];
  shape: string[];
  use: string[];
  warn?: string;
};

/* The four SageMaker AI inference options from the lesson, as of October 2026. */
const OPTIONS: Option[] = [
  { name: 'Real-time', sub: 'endpoint', capacity: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8], shape: ['always-on instances', 'behind HTTPS'], use: ['interactive traffic,', 'steady latency'], warn: 'bills while it exists' },
  { name: 'Asynchronous', sub: 'endpoint', capacity: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], shape: ['requests queue,', 'results go to storage'], use: ['large payloads,', 'long-running requests'] },
  { name: 'Serverless', sub: 'endpoint', capacity: [0, 0.2, 0.7, 0.1, 0, 0, 0.5, 0], shape: ['scales with traffic,', 'down to idle'], use: ['spiky, low volume'], warn: 'not for big GPU models' },
  { name: 'Batch transform', sub: 'job', capacity: [0, 0.9, 0.9, 0.9, 0, 0, 0, 0], shape: ['processes a dataset,', 'then stops'], use: ['scoring many records', 'offline'] },
];

const CW = 170;
const GAP = 10;
const X = (i: number) => 15 + i * (CW + GAP);

/**
 * The four ways to host a model on SageMaker AI, each with a sketch of the
 * capacity it holds over a day. The shape of your traffic picks the option.
 */
export default function EndpointShapes() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Four ways to host a model, by traffic shape</p>
        <svg viewBox="0 0 740 300" className="dx-svg" role="img" aria-label="Real-time endpoints hold capacity all day; asynchronous endpoints queue requests; serverless endpoints scale with traffic down to idle; batch transform runs a job and stops.">
          {OPTIONS.map((o, i) => {
            const x = X(i);
            const gx = (k: number) => x + 14 + (k / (o.capacity.length - 1)) * (CW - 28);
            const gy = (v: number) => 128 - v * 50;
            const d = o.capacity.map((v, k) => `${k ? 'L' : 'M'} ${gx(k).toFixed(1)} ${gy(v).toFixed(1)}`).join(' ');
            return (
              <g key={o.name}>
                <rect x={x} y="12" width={CW} height="276" rx="10" className="dx-core" />
                <text x={x + 14} y="36" className="dx-name">{o.name}</text>
                <text x={x + 14} y="52" className="dx-small">{o.sub}</text>

                {/* capacity sketch */}
                <path d={`M ${x + 14} 70 V 130 H ${x + CW - 14}`} className="dx-link" style={{ strokeOpacity: 0.35 }} />
                {i === 1 ? (
                  <g>
                    {[0, 1, 2].map((q) => (
                      <rect key={q} x={x + 22 + q * 22} y="94" width="18" height="18" rx="3" className="kv-cached" />
                    ))}
                    <path d={`M ${x + 90} 103 H ${x + 112}`} className="dx-link" />
                    <path d={`M ${x + 107} 98 L ${x + 112} 103 L ${x + 107} 108`} className="dx-link" />
                    <rect x={x + 116} y="86" width="36" height="34" rx="5" className="dx-core" />
                    <text x={x + 134} y="107" textAnchor="middle" className="dx-small">store</text>
                  </g>
                ) : (
                  <motion.path d={d} className="dx-curve" style={{ stroke: 'var(--signal)' }} initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }} />
                )}
                <text x={x + 14} y="146" className="dx-small" style={{ opacity: 0.8 }}>{i === 1 ? 'queue, then storage' : 'capacity over a day'}</text>

                {o.shape.map((l, k) => (
                  <text key={l} x={x + 14} y={174 + k * 15} className="dx-small" style={{ fill: 'var(--ink)' }}>{l}</text>
                ))}
                <text x={x + 14} y="216" className="dx-small" style={{ fontWeight: 600 }}>use for</text>
                {o.use.map((l, k) => (
                  <text key={l} x={x + 14} y={232 + k * 15} className="dx-small">{l}</text>
                ))}
                {o.warn && (
                  <text x={x + 14} y="278" className="dx-small" style={{ fill: 'var(--cost)' }}>{o.warn}</text>
                )}
              </g>
            );
          })}
        </svg>
        <p className="viz-cap">The stable core as of October 2026; AWS adds features often, so check current limits, especially for serverless.</p>
      </div>
    </Root>
  );
}
