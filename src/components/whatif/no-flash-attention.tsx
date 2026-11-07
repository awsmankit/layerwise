import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { fitsIn, formatBytes, gpuChoices, headChoices, maxFittingN, overshoot, sameAnswerCheck, scoreTableBytes, seqChoices, tileAt, tiledExtraBytes } from '../../lib/whatif/no-flash-attention';

const GRID = 6;
const CELL = 30;
const GX = 0;
const GY = 24;
const BAR_W = 380;
const GOOD = '#1f9d6b';
const BAD = '#d6453d';

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const n = (x: number) => x.toLocaleString('en-US');
const times = (x: number) => (x >= 10 ? Math.round(x).toString() : (Math.round(x * 10) / 10).toString());
const compact = (x: number) => (x >= 1e9 ? `${(Math.round(x / 1e7) / 100).toString()} billion` : x >= 1e6 ? `${(Math.round(x / 1e4) / 100).toString()} million` : n(x));

/**
 * An n-by-n table of attention scores, drawn as a 6-by-6 picture. Whole: every cell is held at once and its
 * memory is compared with an example GPU. Tiles: one tile at a time is held, finished tiles are folded in.
 * The tiled answer is exactly the same, and a tiny seeded check below proves it.
 */
export default function NoFlashAttentionWhatIf() {
  const [tiled, setTiled] = useState(true);
  const [seqIdx, setSeqIdx] = useState(5); // 32,768
  const [heads, setHeads] = useState<number>(32);
  const [gpu, setGpu] = useState<number>(24);
  const [tile, setTile] = useState(13);
  const [playing, setPlaying] = useState(false);

  const N = seqChoices[seqIdx];
  const whole = scoreTableBytes(N, heads);
  const extra = tiledExtraBytes(N, heads);
  const ratio = overshoot(whole, gpu);
  const fits = fitsIn(whole, gpu);
  const maxN = maxFittingN(heads, gpu);
  const same = useMemo(() => sameAnswerCheck().diff < 1e-9, []);

  useEffect(() => {
    if (!playing || !tiled) return;
    const id = setInterval(() => {
      setTile((t) => {
        if (t >= GRID * GRID - 1) {
          setPlaying(false);
          return t;
        }
        return t + 1;
      });
    }, 220);
    return () => clearInterval(id);
  }, [playing, tiled]);

  const play = () => {
    setTiled(true);
    setTile(0);
    setPlaying(true);
  };

  const verdict = tiled ? (
    <>
      In tiles the {n(N)} by {n(N)} table is never stored. Only a running maximum and sum per row stay, about {formatBytes(extra)} for {heads} heads (example), and that grows in a straight line with n. The paper reports the answer is exact and the extra memory is O(N).
    </>
  ) : fits ? (
    <>
      The whole table for n = {n(N)} and {heads} heads is {formatBytes(whole)} (example, one layer), which fits in a {gpu} GiB GPU. Double n and it needs {formatBytes(whole * 4)}: four times as much. It stops fitting beyond about {n(maxN)} tokens.
    </>
  ) : (
    <>
      The whole table for n = {n(N)} and {heads} heads is {formatBytes(whole)} (example, one layer): {times(ratio)} times the {gpu} GiB GPU. It cannot be stored. Beyond about {n(maxN)} tokens it never fits, however fast the chip is.
    </>
  );

  const cur = tileAt(tile, GRID);
  const wholeFill = Math.min(1, ratio);
  const lines = tiled
    ? ['One small tile at a time.', 'Finished tiles are', 'folded into the answer,', 'then dropped.']
    : ['All n x n scores sit in', 'memory at the same', 'time:', `${compact(N * N)} per head.`];

  return (
    <WhatIfFrame
      title="Where do the attention scores live?"
      withLabel="In tiles"
      withoutLabel="Whole table"
      on={tiled}
      onChange={(v) => {
        setPlaying(false);
        setTiled(v);
      }}
      verdict={verdict}
      controls={
        <>
          <label className="field wl-field">
            <span>
              Tokens in the prompt <b>{n(N)}</b>
            </span>
            <input type="range" min={0} max={seqChoices.length - 1} step={1} value={seqIdx} onChange={(e) => setSeqIdx(+e.target.value)} aria-label="Number of tokens" aria-valuetext={`${n(N)} tokens`} />
          </label>
          <label className="field wl-field">
            <span>Attention heads (example)</span>
            <select className="wl-select" value={heads} onChange={(e) => setHeads(+e.target.value)} aria-label="Number of attention heads">
              {headChoices.map((h) => (
                <option key={h} value={h}>
                  {h} heads
                </option>
              ))}
            </select>
          </label>
          <label className="field wl-field">
            <span>GPU memory (example)</span>
            <select className="wl-select" value={gpu} onChange={(e) => setGpu(+e.target.value)} aria-label="Example GPU memory">
              {gpuChoices.map((g) => (
                <option key={g} value={g}>
                  {g} GiB
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn quiet wl-btn" onClick={play}>
            {playing ? 'Sweeping…' : 'Play the tiles'}
          </button>
        </>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: to decide what to look at, attention gives every token a score against every other token. For n tokens that is an n by n table, so doubling the prompt makes the table four times bigger. Standard attention writes the whole table to the GPU&rsquo;s main memory. Tiling does the same maths a small piece at a time and never keeps the table. All sizes below are example arithmetic, not measurements.
      </p>
      <svg viewBox="0 0 380 340" className="dx-svg wi-svg wl-cap" role="img" aria-label={`A 6 by 6 picture of the table of attention scores. ${tiled ? `Only tile ${tile + 1} of 36 is held at a time.` : 'Every cell is held at once.'} At ${n(N)} tokens and ${heads} heads the whole table is ${formatBytes(whole)}, against ${formatBytes(extra)} of extra memory in tiles. The example GPU has ${gpu} GiB.`}>
        <text x={0} y={14} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          the n by n score table (picture, 6 by 6)
        </text>
        {Array.from({ length: GRID * GRID }, (_, i) => {
          const { row, col } = tileAt(i, GRID);
          const done = tiled && i < tile;
          const lit = tiled && i === tile;
          const fill = !tiled ? BAD : lit ? '#2b7fd6' : done ? GOOD : 'currentColor';
          const op = !tiled ? 0.55 : lit ? 0.9 : done ? 0.28 : 0.06;
          return (
            <motion.rect
              key={i}
              x={GX + col * CELL + 1.5}
              y={GY + row * CELL + 1.5}
              width={CELL - 3}
              height={CELL - 3}
              rx={5}
              fill={fill}
              initial={false}
              animate={{ fillOpacity: op }}
              transition={{ duration: 0.3, ease: EASE }}
              stroke={lit ? '#2b7fd6' : 'currentColor'}
              strokeWidth={lit ? 2.4 : 1}
              strokeOpacity={lit ? 1 : 0.3}
            />
          );
        })}
        {tiled && (
          <text x={GX + cur.col * CELL + CELL / 2} y={GY + cur.row * CELL + CELL / 2 + 4.5} textAnchor="middle" style={{ fill: '#fff', fontSize: 13, fontWeight: 700 }}>
            in
          </text>
        )}
        {lines.map((l, i) => (
          <text key={i} x={196} y={50 + i * 20} style={{ fill: i === 0 || !tiled ? (tiled ? 'var(--ink)' : BAD) : 'var(--ink)', fontSize: 13, fontWeight: i === 0 ? 700 : 400 }}>
            {l}
          </text>
        ))}
        {tiled && (
          <text x={196} y={150} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
            tile {tile + 1} of {GRID * GRID}
          </text>
        )}
        {tiled && (
          <>
            <rect x={196} y={166} width={12} height={12} rx={3} fill="#2b7fd6" />
            <text x={214} y={177} style={{ fill: 'var(--ink)', fontSize: 13 }}>
              held now
            </text>
            <rect x={196} y={186} width={12} height={12} rx={3} fill={GOOD} fillOpacity={0.4} stroke="currentColor" strokeOpacity={0.3} />
            <text x={214} y={197} style={{ fill: 'var(--ink)', fontSize: 13 }}>
              done, dropped
            </text>
          </>
        )}

        <text x={0} y={232} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          bar = the example {gpu} GiB GPU memory
        </text>
        <text x={0} y={254} style={{ fill: fits ? 'var(--ink)' : BAD, fontSize: 13, fontWeight: 700 }}>
          {fits ? '✓' : '✗'} Whole table: {formatBytes(whole)}
          {fits ? ', fits' : `, ${times(ratio)}x the memory`}
        </text>
        <rect x={0} y={260} width={BAR_W} height={16} rx={5} fill="currentColor" opacity={0.08} />
        <motion.rect x={0} y={260} height={16} rx={5} fill={fits ? GOOD : BAD} initial={false} animate={{ width: r4(Math.max(BAR_W * wholeFill, 3)), opacity: tiled ? 0.3 : 0.9 }} transition={{ duration: 0.5, ease: EASE }} />
        {!fits && <polygon points="364,258 380,268 364,278" fill={BAD} opacity={tiled ? 0.3 : 1} />}
        <text x={0} y={302} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
          ✓ In tiles: {formatBytes(extra)} extra, grows with n
        </text>
        <rect x={0} y={308} width={BAR_W} height={16} rx={5} fill="currentColor" opacity={0.08} />
        <motion.rect x={0} y={308} height={16} rx={5} fill={GOOD} initial={false} animate={{ width: r4(Math.max(BAR_W * Math.min(1, extra / (gpu * 1024 ** 3)), 3)), opacity: tiled ? 0.9 : 0.3 }} transition={{ duration: 0.5, ease: EASE }} />
      </svg>

      <table className="wl-table">
        <caption>
          Whole table by prompt length ({heads} heads, example {gpu} GiB GPU, 16-bit scores, one layer)
        </caption>
        <thead>
          <tr>
            <th scope="col">Tokens</th>
            <th scope="col">Whole table</th>
            <th scope="col">Fits?</th>
            <th scope="col">In tiles</th>
          </tr>
        </thead>
        <tbody>
          {seqChoices.map((s) => {
            const b = scoreTableBytes(s, heads);
            const ok = fitsIn(b, gpu);
            return (
              <tr key={s} className={s === N ? 'is-now' : ''}>
                <th scope="row">{n(s)}</th>
                <td>{formatBytes(b)}</td>
                <td className={ok ? 'wl-yes' : 'wl-no'}>{ok ? '✓ fits' : '✗ too big'}</td>
                <td>{formatBytes(tiledExtraBytes(s, heads))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <details className="wl-note">
        <summary>The numbers behind the bars (example, and what the paper says)</summary>
        <p>
          Whole table = n x n scores x heads x 2 bytes (16-bit scores), for one layer and one conversation. With 32 heads, n = 8,192 gives 4 GiB, n = 32,768 gives 64 GiB and n = 131,072 gives 1 TiB. The standard method in the FlashAttention paper also keeps a second n by n table of softmax results, so counting both would double these numbers. The bar compares the table with the whole GPU memory, as if nothing else used any.
        </p>
        <p>
          In tiles, the extra memory here is a running maximum and sum (8 bytes) per row per head, an assumed size. The paper&rsquo;s Theorem 1 says its algorithm needs O(N) additional memory beyond the inputs and output, and it computes exact attention, not an approximation. It does slightly more arithmetic than the standard method but fewer reads and writes of main memory, which is where the paper locates the time. This page gives no speed numbers. A tiny seeded check in this page&rsquo;s code (12 tokens, tiles of 3) gives {same ? 'the same answer as the whole table to 9 decimal places' : 'a different answer'}, while holding at most 3 scores per row instead of 12.
        </p>
      </details>
    </WhatIfFrame>
  );
}
