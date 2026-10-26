import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

type Mode = 'reserved' | 'paged' | 'shared';

const REQS = [
  { name: 'Request A', used: 0.42, cls: 'kv-a' },
  { name: 'Request B', used: 0.16, cls: 'kv-b' },
  { name: 'Request C', used: 0.7, cls: 'kv-c' },
];

const COLS = 16;
const ROWS = 4;
const CELL = 34;
/** Block owners in allocation order, interleaved as requests grow. Counts match the reserved view. */
const OWNERS = ['kv-a', 'kv-b', 'kv-c', 'kv-a', 'kv-c', 'kv-a', 'kv-c', 'kv-b', 'kv-a', 'kv-c', 'kv-c', 'kv-a', 'kv-c', 'kv-a', 'kv-c', 'kv-c', 'kv-a', 'kv-c', 'kv-c', 'kv-b', 'kv-c', 'kv-c'];
const SHARED = 5;

const NOTES: Record<Mode, string> = {
  reserved: 'Each request reserves room for its longest possible reply up front. Most of that room sits empty, and no other request can use it.',
  paged: 'The cache is cut into small fixed-size blocks, handed out as each request grows. Free blocks go to new requests, so more of them fit on one GPU.',
  shared: 'Requests that start with the same prompt point at the same blocks for that prefix, so the shared part is stored once. This is how prompt caching saves memory.',
};

/**
 * Three ways to lay out the KV cache in GPU memory, side by side in one frame.
 * The numbers of filled cells are illustrative.
 */
export default function KvPaging() {
  const [mode, setMode] = useState<Mode>('reserved');

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Where the cache goes in memory</p>
          <div className="dx-steps" role="group" aria-label="Layout">
            {(['reserved', 'paged', 'shared'] as Mode[]).map((m) => (
              <button key={m} type="button" className="btn quiet" aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === 'reserved' ? 'Reserved per request' : m === 'paged' ? 'Paged blocks' : 'Shared prefix'}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 740 200" className="dx-svg" role="img" aria-label={NOTES[mode]}>
          <defs>
            <pattern id="kv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" className="kv-hatch-line" />
            </pattern>
          </defs>

          {mode === 'reserved' &&
            REQS.map((r, i) => (
              <motion.g key={r.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}>
                <text x="20" y={44 + i * 52} className="dx-small">{r.name}</text>
                <rect x="110" y={26 + i * 52} width="560" height="28" rx="6" fill="url(#kv-hatch)" className="kv-reserved" />
                <motion.rect x="110" y={26 + i * 52} height="28" rx="6" className={r.cls} initial={{ width: 0 }} animate={{ width: 560 * r.used }} transition={{ duration: 0.6, delay: 0.2 + i * 0.08, ease: EASE }} />
                <text x="680" y={44 + i * 52} className="dx-small">{Math.round((1 - r.used) * 100)}% idle</text>
              </motion.g>
            ))}

          {mode !== 'reserved' &&
            Array.from({ length: COLS * ROWS }, (_, k) => {
              const col = k % COLS;
              const row = Math.floor(k / COLS);
              const sharedCell = mode === 'shared' && k < SHARED;
              const owners = mode === 'shared' ? OWNERS.slice(SHARED) : OWNERS;
              const idx = mode === 'shared' ? k - SHARED : k;
              const owner = sharedCell ? 'kv-shared' : idx >= 0 && idx < owners.length ? owners[idx] : null;
              return (
                <motion.rect
                  key={`${mode}-${k}`}
                  x={110 + col * CELL}
                  y={14 + row * CELL}
                  width={CELL - 6}
                  height={CELL - 6}
                  rx="4"
                  className={owner ?? 'kv-free'}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ transformOrigin: `${110 + col * CELL + 14}px ${14 + row * CELL + 14}px` }}
                  transition={{ duration: 0.3, delay: Math.min(k, 30) * 0.015, ease: EASE }}
                />
              );
            })}
          {mode !== 'reserved' && (
            <g>
              <text x="20" y="34" className="dx-small">GPU memory,</text>
              <text x="20" y="48" className="dx-small">in blocks</text>
              {mode === 'shared' && (
                <>
                  <path d={`M 110 160 V 168 H ${110 + SHARED * CELL - 6} V 160`} className="dx-link" />
                  <text x="110" y="184" className="dx-small">one copy of the shared prompt, used by A and B</text>
                </>
              )}
              {mode === 'paged' && <text x="110" y="184" className="dx-small">empty blocks are free for new requests</text>}
            </g>
          )}
        </svg>

        <div className="kv-legend">
          <span><i className="kv-a" />A</span>
          <span><i className="kv-b" />B</span>
          <span><i className="kv-c" />C</span>
          {mode === 'shared' && <span><i className="kv-shared" />shared prefix</span>}
          <span><i className={mode === 'reserved' ? 'kv-reserved-swatch' : 'kv-free'} />{mode === 'reserved' ? 'reserved, unused' : 'free'}</span>
        </div>
        <p className="viz-cap">{NOTES[mode]}</p>
      </div>
    </Root>
  );
}
