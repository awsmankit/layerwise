import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/** Starting points from the lesson, for a typical 4-bit model and a modest conversation. */
const ROWS = [
  { mem: '8 GB', gb: 8, fit: 'about 1 to 4B parameters', note: 'basic tasks only' },
  { mem: '16 GB', gb: 16, fit: 'about 7 to 14B', note: 'a good place to learn' },
  { mem: '24 GB', gb: 24, fit: 'roughly 20 to 30B', note: 'depends on context length' },
  { mem: '64 GB+', gb: 64, fit: '70B class', note: 'possible, with tight limits' },
];

const X = 110;
const SCALE = 5.4; // px per GB

/**
 * Which model size suits which memory, as bars to the same scale. Rough
 * starting points, not limits: context length and the rest of the system
 * change the answer.
 */
export default function SizeFit() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Which size suits which memory</p>
        <svg viewBox="0 0 740 220" className="dx-svg" role="img" aria-label="Memory sizes of 8, 16, 24 and 64 gigabytes, each with the model size that is a sensible first choice">
          {ROWS.map((r, i) => {
            const y = 14 + i * 50;
            const w = r.gb * SCALE;
            return (
              <g key={r.mem}>
                <text x="20" y={y + 22} className="dx-name">{r.mem}</text>
                <motion.rect
                  x={X}
                  y={y}
                  height="32"
                  rx="5"
                  className={i === 1 ? 'kv-cached' : 'dx-core'}
                  initial={{ width: 0 }}
                  whileInView={{ width: w }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                />
                <text x={X + Math.max(w, 60) + 12} y={y + 15} className="dx-name">{r.fit}</text>
                <text x={X + Math.max(w, 60) + 12} y={y + 30} className="dx-small">{r.note}</text>
              </g>
            );
          })}
          <text x={X} y="212" className="dx-small">bar length = memory, to scale. Assumes a 4-bit quantized model.</text>
        </svg>
        <p className="viz-cap">On a shared-memory laptop, your operating system and apps also need memory, so leave headroom.</p>
      </div>
    </Root>
  );
}
