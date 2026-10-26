import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const STAGES: { name: string; glyph: GlyphName; x: number; w: number }[] = [
  { name: 'User', glyph: 'user', x: 20, w: 120 },
  { name: 'Queue', glyph: 'queue', x: 200, w: 120 },
  { name: 'Engine', glyph: 'server', x: 380, w: 160 },
  { name: 'GPU', glyph: 'chip', x: 600, w: 120 },
];

const GROUPS = [
  {
    title: 'What users feel',
    x: 20,
    w: 220,
    lines: ['TTFT, at p50 and p95 or p99', 'inter-token latency', 'end-to-end, by prompt length', 'errors and timeouts', 'rejected requests (429, 503)'],
  },
  {
    title: 'How loaded the engine is',
    x: 260,
    w: 220,
    lines: ['queue depth', 'requests running (batch size)', 'tokens in flight', 'KV cache use, preemptions', 'tokens/s per replica'],
  },
  {
    title: 'How the GPU is doing',
    x: 500,
    w: 220,
    lines: ['memory used', 'temperature and power', 'clocks, throttle reasons', 'hardware errors (XID)'],
  },
];

/**
 * The measurements that matter, pinned to where they happen on the way a
 * request travels: what the user feels, how loaded the engine is, and how
 * healthy the GPU is.
 */
export default function MetricsMap() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">What to measure, along one request</p>
        <svg viewBox="0 0 740 300" className="dx-svg" role="img" aria-label="A request goes from the user through a queue to the engine and the GPU. Users feel TTFT, inter-token latency, end-to-end latency and errors; the engine shows queue depth, running requests, KV cache use and throughput; the GPU shows memory, temperature, power, clocks and errors.">
          {STAGES.map((s, i) => (
            <g key={s.name}>
              <rect x={s.x} y="16" width={s.w} height="52" rx="10" className={i === 2 ? 'dx-core dx-hot' : 'dx-core'} />
              <g style={{ color: i === 2 ? 'var(--signal)' : 'var(--ink-3)' }}>
                <Glyph name={s.glyph} size={22} x={s.x + 12} y={31} />
              </g>
              <text x={s.x + 42} y="47" className="dx-name">{s.name}</text>
              {i < STAGES.length - 1 && (
                <>
                  <path d={`M ${s.x + s.w} 42 H ${STAGES[i + 1].x - 2}`} className="dx-link" />
                  <path d={`M ${STAGES[i + 1].x - 7} 37 L ${STAGES[i + 1].x - 2} 42 L ${STAGES[i + 1].x - 7} 47`} className="dx-link" />
                </>
              )}
            </g>
          ))}
          <motion.circle r="4.5" cy="42" className="dx-packet" initial={{ cx: 140, opacity: 0 }} whileInView={{ cx: [140, 380, 600], opacity: [0, 1, 1] }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE }} />
          <text x="400" y="62" className="dx-small">prefill, then decode</text>

          {/* leader lines from each group to the place it is measured */}
          <path d="M 80 68 V 110" className="dx-residual" />
          <path d="M 290 68 V 110" className="dx-residual" />
          <path d="M 440 68 V 110" className="dx-residual" />
          <path d="M 660 68 V 110" className="dx-residual" />

          {GROUPS.map((g, i) => (
            <motion.g key={g.title} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: 0.3 + i * 0.12, ease: EASE }}>
              <rect x={g.x} y="110" width={g.w} height="146" rx="10" className="dx-core" />
              <text x={g.x + 12} y="132" className="dx-name" style={{ fontSize: 12.5 }}>{g.title}</text>
              {g.lines.map((l, k) => (
                <text key={l} x={g.x + 12} y={154 + k * 21} className="dx-small">{l}</text>
              ))}
            </motion.g>
          ))}
          <text x="20" y="284" className="dx-small">Saturation shows on the left and in the middle first: a growing queue, a full KV cache, rising TTFT.</text>
        </svg>
        <p className="viz-cap">TTFT is mostly queueing plus prefill; inter-token latency is decode speed. Combine the engine's own metrics with GPU metrics (on NVIDIA, from DCGM). On Kubernetes, an alert that ties a GPU error to a node lets you cordon it automatically.</p>
      </div>
    </Root>
  );
}
