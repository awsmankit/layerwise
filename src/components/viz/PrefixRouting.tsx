import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

const REQS = [
  { label: 'Request A', sub: 'shared prompt prefix', warm: true, y: 52 },
  { label: 'Request B', sub: 'shared prompt prefix', warm: true, y: 108 },
  { label: 'Request C', sub: 'different prompt', warm: false, y: 164 },
];
const NODE_Y = [20, 100, 180];
const NX = 380;
const NW = 230;
const NH = 66;

/**
 * HyperPod Inference: a router that knows where each prompt prefix is
 * already cached sends matching requests to the warm node. Each node keeps a
 * first-level KV cache in CPU memory; a shared Redis is the second level.
 */
export default function PrefixRouting() {
  const into = (node: number) => NODE_Y[node] + NH / 2;
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Routing to where the cache is warm</p>
        <svg viewBox="0 0 740 280" className="dx-svg" role="img" aria-label="Requests A and B share a prompt prefix and are routed to node 2, where that prefix is cached; request C goes to node 3. Each node has an L1 cache in CPU memory; a shared Redis is L2.">
          {REQS.map((r) => (
            <g key={r.label}>
              <rect x="16" y={r.y} width="150" height="44" rx="8" className={r.warm ? 'dx-core dx-hot' : 'dx-core'} />
              <text x="28" y={r.y + 19} className="dx-name" style={{ fontSize: 12.5 }}>{r.label}</text>
              <text x="28" y={r.y + 35} className="dx-small">{r.sub}</text>
              <path d={`M 166 ${r.y + 22} H 200`} className="dx-link" />
            </g>
          ))}

          <rect x="200" y="56" width="120" height="164" rx="10" className="dx-core dx-hot" />
          <g style={{ color: 'var(--signal)' }}>
            <Glyph name="route" size={22} x={212} y={96} />
          </g>
          <text x="212" y="140" className="dx-name">Router</text>
          <text x="212" y="158" className="dx-small">prefix-aware,</text>
          <text x="212" y="172" className="dx-small">KV-aware</text>

          {/* routes: A and B to the warm node 2, C to node 3 */}
          <path d={`M 320 112 C 350 112, 350 ${into(1)}, ${NX - 2} ${into(1)}`} className="dx-residual" />
          <path d={`M 320 150 C 350 150, 350 ${into(2)}, ${NX - 2} ${into(2)}`} className="dx-link" />
          {[0, 0.35].map((delay) => (
            <motion.circle
              key={delay}
              r="4"
              className="dx-packet"
              initial={{ cx: 320, cy: 112, opacity: 0 }}
              whileInView={{ cx: [320, 350, NX - 4], cy: [112, (112 + into(1)) / 2, into(1)], opacity: [0, 1, 1] }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.4 + delay, ease: EASE }}
            />
          ))}

          {NODE_Y.map((y, n) => {
            const warm = n === 1;
            return (
              <g key={n}>
                <rect x={NX} y={y} width={NW} height={NH} rx="10" className={warm ? 'dx-core dx-hot' : 'dx-core'} />
                <g style={{ color: warm ? 'var(--signal)' : 'var(--ink-3)' }}>
                  <Glyph name="chip" size={22} x={NX + 12} y={y + 10} />
                </g>
                <text x={NX + 42} y={y + 26} className="dx-name" style={{ fontSize: 12.5 }}>{`Node ${n + 1}`}</text>
                <rect x={NX + 12} y={y + 38} width={NW - 24} height="20" rx="4" className={warm ? 'kv-cached' : 'kv-free'} />
                <text x={NX + 20} y={y + 52} className="dx-small" style={{ fill: 'var(--ink)' }}>{warm ? 'L1 in CPU memory: prefix cached' : 'L1 in CPU memory'}</text>
                <path d={`M ${NX + NW} ${y + NH / 2} H 640`} className="dx-link" style={{ strokeDasharray: '3 4' }} />
              </g>
            );
          })}

          <rect x="640" y="20" width="86" height="226" rx="10" className="dx-core" />
          <g style={{ color: 'var(--ink-3)' }}>
            <Glyph name="database" size={24} x={671} y={104} />
          </g>
          <text x="683" y="150" textAnchor="middle" className="dx-name" style={{ fontSize: 12.5 }}>L2</text>
          <text x="683" y="168" textAnchor="middle" className="dx-small">shared</text>
          <text x="683" y="182" textAnchor="middle" className="dx-small">Redis</text>
          <text x="380" y="268" className="dx-small">Kubernetes-native serving on dedicated GPU clusters</text>
        </svg>
        <p className="viz-cap">
          Requests that share a prompt prefix go where that prefix is already cached, so the work is not repeated. Managed endpoints hide all of this; HyperPod Inference gives you the Kubernetes layer to decide it yourself.
        </p>
      </div>
    </Root>
  );
}
