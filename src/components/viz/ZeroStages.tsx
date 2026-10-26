import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/** GPUs the state is split across in the worked example. */
const N = 64;
/** Billions of parameters in the worked example. */
const B = 70;

/*
 * Bytes per parameter held on each GPU, from the 16-byte budget: 2 for
 * 16-bit weights, 2 for gradients, 12 for the optimizer (32-bit master
 * weights, momentum and variance). A sharded item is divided by N.
 */
const ROWS = [
  { name: 'Plain data parallel', note: 'everything copied to every GPU', w: 2, g: 2, o: 12 },
  { name: 'Stage 1', note: 'shards the optimizer state', w: 2, g: 2, o: 12 / N },
  { name: 'Stage 2', note: 'also shards the gradients', w: 2, g: 2 / N, o: 12 / N },
  { name: 'Stage 3 / FSDP', note: 'also shards the weights', w: 2 / N, g: 2 / N, o: 12 / N },
];

const X = 230;
const SCALE = 24; // px per byte per parameter
const fmt = (gb: number) => (gb >= 100 ? `${Math.round(gb).toLocaleString('en-US')} GB` : `${gb.toFixed(1)} GB`);

/**
 * What each ZeRO stage removes from every GPU. Each bar is the training state
 * one GPU holds per parameter; dashed outlines show what sharding took away.
 */
export default function ZeroStages() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">What each ZeRO stage shards</p>
        <svg viewBox="0 0 740 280" className="dx-svg" role="img" aria-label={`Per-GPU training state for a ${B}B model on ${N} GPUs: plain data parallel, then stages 1, 2 and 3`}>
          <text x={X} y="20" className="dx-small">bytes per parameter on each GPU</text>
          <text x="726" y="20" textAnchor="end" className="dx-small">{B}B model, {N} GPUs</text>

          {ROWS.map((r, i) => {
            const y = 36 + i * 56;
            const total = r.w + r.g + r.o;
            const segs = [
              { v: r.w, full: 2, cls: 'kv-a' },
              { v: r.g, full: 2, cls: 'kv-b' },
              { v: r.o, full: 12, cls: 'kv-c' },
            ];
            let cursor = X;
            return (
              <g key={r.name}>
                <text x="20" y={y + 15} className="dx-name">{r.name}</text>
                <text x="20" y={y + 32} className="dx-small">{r.note}</text>
                <rect x={X} y={y} width={16 * SCALE} height="30" rx="4" className="kv-free" />
                {segs.map((s, k) => {
                  const x = cursor;
                  cursor += s.v * SCALE;
                  return (
                    <motion.rect
                      key={k}
                      x={x}
                      y={y}
                      height="30"
                      className={s.cls}
                      initial={{ width: 0 }}
                      whileInView={{ width: Math.max(s.v * SCALE, 1.5) }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.12, ease: EASE }}
                    />
                  );
                })}
                <text x={X + 16 * SCALE + 12} y={y + 15} className="dx-name">{total < 1 ? total.toFixed(2) : total.toFixed(1)} bytes</text>
                <text x={X + 16 * SCALE + 12} y={y + 30} className="dx-small">{fmt(total * B)} per GPU</text>
              </g>
            );
          })}

          <g transform="translate(230 262)">
            <rect width="14" height="10" rx="2" className="kv-a" />
            <text x="20" y="9" className="dx-small">weights 2</text>
            <rect x="100" width="14" height="10" rx="2" className="kv-b" />
            <text x="120" y="9" className="dx-small">gradients 2</text>
            <rect x="214" width="14" height="10" rx="2" className="kv-c" />
            <text x="234" y="9" className="dx-small">optimizer 12</text>
            <rect x="334" width="14" height="10" rx="2" className="kv-free" />
            <text x="354" y="9" className="dx-small">sharded away</text>
          </g>
        </svg>
        <p className="viz-cap">
          Totals come from the 16-byte budget above, before activations. Full sharding leaves 16 ÷ {N} = 0.25 bytes per parameter, so the {B}B model needs about 17.5 GB of state per GPU.
        </p>
      </div>
    </Root>
  );
}
