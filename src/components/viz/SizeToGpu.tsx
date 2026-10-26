import { motion } from 'motion/react';
import { Root, EASE } from './shared';

type Chip = { label: string; w?: number; maybe?: boolean };
type Option = { chips: Chip[]; or?: number; lines: string[] };

/* Starting points from the lesson's guide, as of October 2026. */
const ROWS: { size: string; sub: string; options: Option[]; h: number; stack?: boolean }[] = [
  { size: 'Up to ~8B', sub: 'parameters', h: 62, options: [{ chips: [{ label: '24 GB' }], lines: ['one L4 or A10G class GPU,', 'especially if quantized;', 'an L40S for headroom'] }] },
  {
    size: '~13B to 34B',
    sub: 'parameters',
    h: 62,
    options: [
      { chips: [{ label: '48 GB' }], lines: ['8 or 4 bits:', 'one L40S'] },
      { chips: [{ label: '80 GB' }], lines: ['FP16: a 34B model needs', 'about 68 GB for weights'] },
    ],
  },
  {
    size: '~70B',
    sub: 'parameters',
    h: 104,
    stack: true,
    options: [
      { chips: [{ label: 'H200', w: 54 }, { label: '80 GB' }, { label: '80 GB' }], or: 1, lines: ['FP8 or INT4: one H200', 'class, or two 80 GB'] },
      { chips: [{ label: '80' , w: 34 }, { label: '80', w: 34 }, { label: '80', w: 34, maybe: true }, { label: '80', w: 34, maybe: true }], lines: ['FP16: 140 GB weights,', 'two to four GPUs'] },
    ],
  },
  { size: 'Very large', sub: 'dense or MoE', h: 62, options: [{ chips: Array.from({ length: 8 }, () => ({ label: '', w: 16 })), lines: ['a full 8-GPU H100, H200 or', 'B200 node, maybe several'] }] },
];

const COL = [170, 460];

/**
 * From model size to the GPUs to start with. Solid outlines are the minimum;
 * dashed ones are where the range can grow.
 */
export default function SizeToGpu() {
  let y = 14;
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Which GPUs a model size needs</p>
        <svg viewBox="0 0 740 374" className="dx-svg" role="img" aria-label="Up to 8B: one 24 GB GPU. 13B to 34B: one 48 GB L40S quantized, or one 80 GB GPU at FP16. 70B: one H200-class or two 80 GB GPUs at FP8 or INT4, two to four at FP16. Very large models: a full 8-GPU node or more.">
          {ROWS.map((r, ri) => {
            const top = y;
            y += r.h + 16;
            return (
              <motion.g key={r.size} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: ri * 0.12, ease: EASE }}>
                <rect x="14" y={top} width="712" height={r.h} rx="10" className="dx-frame" />
                <text x="28" y={top + 28} className="dx-name">{r.size}</text>
                <text x="28" y={top + 45} className="dx-small">{r.sub}</text>
                {r.options.map((o, oi) => {
                  let cx = r.stack ? COL[0] : COL[oi];
                  const oy = r.stack ? oi * 46 - 4 : 0;
                  return (
                    <g key={oi}>
                      {o.chips.map((c, ci) => {
                        const w = c.w ?? 46;
                        const x = cx;
                        cx += w + 4 + (o.or === ci + 1 ? 22 : 0);
                        return (
                          <g key={ci}>
                            <rect x={x} y={top + 14 + oy} width={w} height="34" rx="5" className={c.maybe ? 'kv-free' : 'kv-cached'} />
                            {c.label && (
                              <text x={x + w / 2} y={top + 35 + oy} textAnchor="middle" className="dx-small" style={{ fill: 'var(--ink)' }}>{c.label}</text>
                            )}
                            {o.or === ci + 1 && (
                              <text x={x + w + 7} y={top + 35 + oy} className="dx-small">or</text>
                            )}
                          </g>
                        );
                      })}
                      {o.lines.map((l, k) => (
                        <text key={l} x={cx + 6} y={top + 26 + oy + k * 15} className="dx-small" style={{ fill: k === 0 ? 'var(--ink)' : undefined }}>{l}</text>
                      ))}
                    </g>
                  );
                })}
              </motion.g>
            );
          })}
        </svg>
        <p className="viz-cap">Solid outlines are the minimum; dashed ones show how far the range can grow. Weights are only part of it: add the KV cache for your context length and concurrency.</p>
      </div>
    </Root>
  );
}
