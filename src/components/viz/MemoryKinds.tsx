import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/**
 * Two kinds of machine side by side. Toggle "Model too big" to see where the
 * part that does not fit ends up on each.
 */
export default function MemoryKinds() {
  const [big, setBig] = useState(false);
  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Two kinds of machine</p>
          <button type="button" className="btn quiet" aria-pressed={big} onClick={() => setBig((b) => !b)}>
            {big ? 'Model fits' : 'Model too big'}
          </button>
        </div>
        <svg viewBox="0 0 740 260" className="dx-svg" role="img" aria-label="Left: a Mac where CPU and GPU share one unified memory pool. Right: a PC where the GPU has its own VRAM, joined to the CPU and system RAM over PCIe.">
          {/* Apple silicon */}
          <text x="20" y="22" className="dx-name">Apple silicon Mac</text>
          <rect x="20" y="34" width="330" height="190" rx="12" className="dx-frame" />
          <rect x="40" y="50" width="120" height="44" rx="6" className="dx-core" />
          <text x="100" y="77" textAnchor="middle" className="dx-name">CPU</text>
          <rect x="210" y="50" width="120" height="44" rx="6" className="dx-core" />
          <text x="270" y="77" textAnchor="middle" className="dx-name">GPU</text>
          <path d="M 100 94 V 116 M 270 94 V 116" className="dx-link" />
          <rect x="40" y="116" width="290" height="88" rx="8" className="dx-core dx-hot" />
          <text x="54" y="136" className="dx-small">unified memory: one shared pool</text>
          <motion.rect x="54" y="148" height="40" rx="5" className="kv-a" initial={false} animate={{ width: big ? 262 : 170 }} transition={{ duration: 0.5, ease: EASE }} />
          <text x="64" y="173" className="dx-name">model</text>
          <text x="20" y="246" className="dx-small">More memory means bigger models. Leave room for apps.</text>

          {/* PC with a discrete GPU */}
          <text x="390" y="22" className="dx-name">PC with a discrete GPU</text>
          <rect x="390" y="34" width="330" height="190" rx="12" className="dx-frame" />
          <rect x="410" y="50" width="130" height="154" rx="8" className="dx-core" />
          <text x="424" y="72" className="dx-name">CPU</text>
          <rect x="424" y="84" width="102" height="104" rx="5" className="kv-free" />
          <text x="432" y="102" className="dx-small">system RAM</text>
          <rect x="580" y="50" width="124" height="154" rx="8" className="dx-core dx-hot" />
          <text x="594" y="72" className="dx-name">GPU</text>
          <rect x="594" y="84" width="96" height="104" rx="5" className="kv-free" />
          <text x="600" y="102" className="dx-small">VRAM</text>
          <motion.rect x="600" y="112" width="84" rx="4" className="kv-a" initial={false} animate={{ height: big ? 70 : 54 }} transition={{ duration: 0.5, ease: EASE }} />
          <text x="610" y="136" className="dx-name">model</text>
          <motion.rect x="430" y="112" width="90" height="40" rx="4" className="kv-b" initial={false} animate={{ opacity: big ? 1 : 0 }} transition={{ duration: 0.4 }} />
          <motion.text x="436" y="136" className="dx-small" initial={false} animate={{ opacity: big ? 1 : 0 }} style={{ fill: 'var(--ink)' }}>
            spill, slower
          </motion.text>
          <path d="M 540 126 H 580" className="dx-residual" />
          <text x="545" y="118" className="dx-small">PCIe</text>
          <text x="390" y="246" className="dx-small">Fastest when the whole model fits in VRAM.</text>
        </svg>
        <p className="viz-cap">
          {big
            ? 'On the Mac the model simply takes more of the shared pool. On the PC, the layers that do not fit in VRAM run from system RAM over PCIe, which is much slower.'
            : 'Memory comes first: the whole model has to fit. Bandwidth comes second: each token means reading the model from memory.'}
        </p>
      </div>
    </Root>
  );
}
