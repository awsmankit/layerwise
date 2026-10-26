import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

type Mode = 'stable' | 'stamp';

const PARTS = [
  { label: 'system and rules', w: 170 },
  { label: 'examples, documents', w: 150 },
  { label: 'history', w: 110 },
  { label: 'new message', w: 92 },
];
const STAMPS = ['09:41', '09:42', '09:43'];
const X0 = 110;
const STAMP_W = 56;
const PREFIX = PARTS[0].w + PARTS[1].w;

/**
 * Prompt caching matches from the start of the prompt. With the stable parts
 * first, every request after the first reuses them. Put a timestamp at the top
 * and every prompt starts differently, so nothing is reused.
 */
export default function PromptCache() {
  const [mode, setMode] = useState<Mode>('stable');
  const stamp = mode === 'stamp';

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Three requests, one cache</p>
          <div className="dx-steps" role="group" aria-label="Prompt order">
            <button type="button" className="btn quiet" aria-pressed={!stamp} onClick={() => setMode('stable')}>
              Stable parts first
            </button>
            <button type="button" className="btn quiet" aria-pressed={stamp} onClick={() => setMode('stamp')}>
              Timestamp at the top
            </button>
          </div>
        </div>

        <svg viewBox="0 0 740 232" className="dx-svg" role="img" aria-label={stamp ? 'Each request starts with a different timestamp, so no request reuses the cache.' : 'The first request writes the shared prefix to the cache; the next two read it.'}>
          {!stamp && (
            <g>
              <line x1={X0 + PREFIX} y1="22" x2={X0 + PREFIX} y2="196" className="dx-residual" />
              <text x={X0 + PREFIX} y="16" textAnchor="middle" className="dx-small">cache breakpoint</text>
            </g>
          )}

          {[0, 1, 2].map((r) => {
            const y = 34 + r * 56;
            const shift = stamp ? STAMP_W + 4 : 0;
            let x = X0 + shift;
            const status = stamp ? 'miss: processed again' : r === 0 ? 'written to the cache' : 'read from the cache';
            const prefixCls = stamp ? 'dx-core' : r === 0 ? 'kv-a' : 'kv-cached';
            return (
              <g key={r}>
                <text x="20" y={y + 23} className="dx-small">{`Request ${r + 1}`}</text>
                {stamp && (
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <rect x={X0} y={y} width={STAMP_W} height="36" rx="5" className="dx-core dx-hot" />
                    <text x={X0 + STAMP_W / 2} y={y + 23} textAnchor="middle" className="dx-small" style={{ fill: 'var(--ink)' }}>{STAMPS[r]}</text>
                  </motion.g>
                )}
                {PARTS.map((p, k) => {
                  const px = x;
                  x += p.w + 2;
                  return (
                    <g key={p.label}>
                      <motion.rect y={y} height="36" rx="5" className={k < 2 ? prefixCls : 'dx-core'} initial={false} animate={{ x: px, width: p.w }} transition={{ duration: 0.45, ease: EASE }} />
                      <motion.text y={y + 23} className="dx-small" style={{ fill: 'var(--ink)' }} initial={false} animate={{ x: px + 10 }} transition={{ duration: 0.45, ease: EASE }}>
                        {p.label}
                      </motion.text>
                    </g>
                  );
                })}
                <text x={X0 + shift + PREFIX + PARTS[2].w + PARTS[3].w + 14} y={y + 23} className="dx-small" style={{ fill: stamp ? 'var(--warn)' : 'var(--ink-3)' }}>
                  {r === 0 || stamp ? (stamp ? 'miss' : 'write') : 'hit'}
                </text>
                <title>{status}</title>
              </g>
            );
          })}

          <text x={X0} y="220" className="dx-small">
            {stamp ? 'Every prompt starts differently, so the cache never matches.' : 'Requests 2 and 3 skip reprocessing the shared start: cheaper input, faster first token.'}
          </text>
        </svg>
        <p className="viz-cap">
          The cache matches from the very start of the prompt, so order decides what can be reused. Any per-request value near the top, such as a timestamp or a user name, makes every prefix different.
        </p>
      </div>
    </Root>
  );
}
