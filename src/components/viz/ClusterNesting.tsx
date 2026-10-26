import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

const NODES = [0, 1, 2];
const NX = (i: number) => 36 + i * 170;
const NW = 150;

/**
 * A training cluster from the inside out: GPUs grouped in nodes, nodes joined
 * by a fabric, with shared storage and a scheduler serving all of them.
 */
export default function ClusterNesting() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">What a training cluster is</p>
        <svg viewBox="0 0 740 300" className="dx-svg" role="img" aria-label="Three nodes of eight GPUs joined internally by NVLink, connected to each other by a fabric, with shared storage and a scheduler outside">
          <rect x="20" y="16" width="520" height="268" rx="12" className="dx-frame" />
          <text x="34" y="38" className="dx-small">cluster</text>

          {NODES.map((n) => (
            <motion.g key={n} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: n * 0.12, ease: EASE }}>
              <rect x={NX(n)} y="52" width={NW} height="150" rx="10" className="dx-core" />
              <text x={NX(n) + 12} y="72" className="dx-name">Node {n + 1}</text>
              {Array.from({ length: 8 }, (_, g) => (
                <rect key={g} x={NX(n) + 14 + (g % 4) * 32} y={86 + Math.floor(g / 4) * 34} width="26" height="26" rx="4" className="kv-cached" />
              ))}
              {/* NVLink: every GPU in the node on one fast link */}
              <path d={`M ${NX(n) + 14} 158 H ${NX(n) + NW - 14}`} className="dx-residual" />
              <text x={NX(n) + 14} y="176" className="dx-small">8 GPUs on NVLink</text>
              <path d={`M ${NX(n) + NW / 2} 202 V 228`} className="dx-link" />
            </motion.g>
          ))}

          {/* fabric between nodes */}
          <rect x="36" y="228" width="490" height="34" rx="6" className="dx-core dx-hot" />
          <text x="50" y="250" className="dx-name">Fabric</text>
          <text x="112" y="249" className="dx-small">InfiniBand, or Ethernet with RDMA (e.g. AWS EFA)</text>

          {/* outside the nodes */}
          <path d="M 526 245 H 560 M 560 245 V 92 H 580 M 560 245 V 210 H 580" className="dx-link" />
          <rect x="580" y="56" width="146" height="72" rx="10" className="dx-core" />
          <g style={{ color: 'var(--ink-3)' }}>
            <Glyph name="database" size={22} x={592} y={66} />
          </g>
          <text x="620" y="82" className="dx-name">Storage</text>
          <text x="592" y="104" className="dx-small">training data</text>
          <text x="592" y="118" className="dx-small">and checkpoints</text>

          <rect x="580" y="174" width="146" height="72" rx="10" className="dx-core" />
          <g style={{ color: 'var(--ink-3)' }}>
            <Glyph name="queue" size={22} x={592} y={184} />
          </g>
          <text x="620" y="200" className="dx-name">Scheduler</text>
          <text x="592" y="222" className="dx-small">Slurm or Kubernetes</text>
          <text x="592" y="236" className="dx-small">queues and restarts</text>
        </svg>
        <p className="viz-cap">
          Rack-scale systems such as GB200 NVL72 widen the NVLink group to 72 GPUs. The fabric carries gradient and parameter traffic, so GPUs that talk a lot should sit close together on it, and storage must be fast enough to keep every GPU fed.
        </p>
      </div>
    </Root>
  );
}
