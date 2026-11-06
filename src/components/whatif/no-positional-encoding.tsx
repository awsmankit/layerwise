import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { bag, byWord, outputShift, pairs, sameBag, tableGap } from '../../lib/whatif/no-positional-encoding';

const r4 = (x: number) => Math.round(x * 10000) / 10000; // exp, sin and pow differ in the last digits between server and browser
const CELL_W = 43;
const CELL_H = 32;
const LABEL_W = 44;
const PANEL_W = LABEL_W + CELL_W * 3;
const GAP_X = 380 - PANEL_W * 2;
const ROWS_Y = 62;

/**
 * Two sentences with the same words in a different order go through one tiny attention layer.
 * Each grid says how much the word on the left looks at the word on top. Cells outlined in red are the ones
 * that differ between the two sentences. Without position the grids are identical, cell for cell.
 */
export default function NoPositionalEncodingWhatIf() {
  const [pe, setPe] = useState(true);
  const [pairId, setPairId] = useState(pairs[0].id);
  const pair = pairs.find((p) => p.id === pairId) ?? pairs[0];

  const order = pair.a;
  const ta = useMemo(() => byWord(pair.a, pe, order), [pair, pe, order]);
  const tb = useMemo(() => byWord(pair.b, pe, order), [pair, pe, order]);
  const shift = useMemo(() => outputShift(pair.a, pair.b, pe), [pair, pe]);
  const gap = useMemo(() => tableGap(pair.a, pair.b, pe), [pair, pe]);
  const same = sameBag(pair.a, pair.b);
  const maxShift = Math.max(...shift);

  const sentenceA = pair.a.join(' ');
  const sentenceB = pair.b.join(' ');

  const panel = (x0: number, table: number[][], title: string, sentence: string, other: number[][] | null) => (
    <g>
      <text x={x0} y={14} style={{ fill: 'var(--ink-2)', fontSize: 12.5 }}>
        {title}
      </text>
      <text x={x0} y={32} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
        {sentence}
      </text>
      {order.map((w, j) => (
        <text key={'c' + j} x={x0 + LABEL_W + j * CELL_W + CELL_W / 2} y={ROWS_Y - 6} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
          {w}
        </text>
      ))}
      {order.map((w, i) => (
        <g key={'r' + i}>
          <text x={x0} y={ROWS_Y + i * CELL_H + 20} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            {w}
          </text>
          {order.map((_, j) => {
            const v = table[i][j];
            const differs = other !== null && Math.abs(v - other[i][j]) > 0.02;
            return (
              <g key={j}>
                <motion.rect
                  x={x0 + LABEL_W + j * CELL_W + 1}
                  y={ROWS_Y + i * CELL_H + 1}
                  width={CELL_W - 2}
                  height={CELL_H - 2}
                  rx={5}
                  fill="#2b7fd6"
                  initial={false}
                  animate={{ fillOpacity: r4(0.1 + 0.55 * v) }}
                  transition={{ duration: 0.5, ease: EASE }}
                  stroke={differs ? '#d6453d' : 'currentColor'}
                  strokeOpacity={differs ? 1 : 0.18}
                  strokeWidth={differs ? 2.5 : 1}
                />
                <text x={x0 + LABEL_W + j * CELL_W + CELL_W / 2} y={ROWS_Y + i * CELL_H + 20} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12.5, fontWeight: differs ? 700 : 400 }}>
                  {Math.round(v * 100)}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );

  const bagY = ROWS_Y + 3 * CELL_H + 30;
  const shiftY = bagY + 80;

  return (
    <WhatIfFrame
      title="Same words, different order"
      withLabel="With positions"
      withoutLabel="Without them"
      on={pe}
      onChange={setPe}
      verdict={
        pe ? (
          <>
            With position added, the two attention grids differ (largest gap {Math.round(gap * 100)} points, red cells) and every word’s output moves by {Math.min(...shift).toFixed(2)} to {maxShift.toFixed(2)}. The model can tell “{sentenceA}” from “{sentenceB}”.
          </>
        ) : (
          <>
            Without position the two grids are identical (largest gap {Math.round(gap * 100)} points) and every word’s output moves by {maxShift.toFixed(2)}. To the model, “{sentenceA}” and “{sentenceB}” are the same thing: {pair.note.toLowerCase().replace('?', '')} is lost.
          </>
        )
      }
      controls={
        <label className="field wl-field">
          <span>Pair of sentences</span>
          <select className="wl-select" value={pairId} onChange={(e) => setPairId(e.target.value)} aria-label="Pair of sentences to compare">
            {pairs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.a.join(' ')} / {p.b.join(' ')}
              </option>
            ))}
          </select>
        </label>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: attention looks at which words are present, not where they stand. Unless something tells it the order, a sentence is just a bag of words. Each grid shows, in percent, how much the word on the left looks at the word on top. Both grids list the words in the same order, so you can compare cell by cell.
      </p>
      <svg viewBox={`0 0 380 ${shiftY + 100}`} className="dx-svg wi-svg wl-cap" role="img" aria-label={`Attention grids for ${sentenceA} and ${sentenceB}. ${pe ? 'With positions the grids differ.' : 'Without positions the grids are identical.'}`}>
        {panel(0, ta, 'Sentence 1', sentenceA, null)}
        {panel(PANEL_W + GAP_X, tb, 'Sentence 2', sentenceB, ta)}
        <text x={0} y={bagY} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          Bag of words (order thrown away)
        </text>
        {[pair.a, pair.b].map((s, k) => (
          <g key={k}>
            <text x={0} y={bagY + 24 + k * 22} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
              {k + 1}
            </text>
            {bag(s).map((w, i) => (
              <g key={w}>
                <rect x={16 + i * 78} y={bagY + 10 + k * 22} width={72} height={19} rx={9} fill="currentColor" opacity={0.09} />
                <text x={16 + i * 78 + 36} y={bagY + 24 + k * 22} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12.5 }}>
                  {w}
                </text>
              </g>
            ))}
          </g>
        ))}
        <text x={262} y={bagY + 30} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
          {same ? '= same bag' : 'different bags'}
        </text>
        <text x={0} y={shiftY} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          How far each word’s output moves when the order flips
        </text>
        {order.map((w, i) => {
          const y = shiftY + 10 + i * 24;
          const len = r4(Math.max(shift[i] / 1.6, 0) * 220);
          return (
            <g key={w}>
              <text x={0} y={y + 14} style={{ fill: 'var(--ink)', fontSize: 12.5 }}>
                {w}
              </text>
              <rect x={60} y={y + 3} width={220} height={14} rx={4} fill="currentColor" opacity={0.07} />
              <motion.rect x={60} y={y + 3} height={14} rx={4} fill={pe ? '#1f9d6b' : '#d6453d'} initial={false} animate={{ width: Math.max(len, shift[i] > 1e-9 ? 2 : 0) }} transition={{ duration: 0.5, ease: EASE }} />
              <text x={60 + Math.min(len, 220) + 6} y={y + 14} style={{ fill: 'var(--ink)', fontSize: 12.5, fontWeight: 700 }}>
                {pe ? shift[i].toFixed(2) : '0.00 (no change)'}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="wl-note">
        <summary>The numbers behind the grids (toy model)</summary>
        <p>
          Each word gets 8 numbers from a hash of its spelling, so they are the same on every run. Attention scores are the dot product of those vectors divided by the square root of 8, then a softmax. With positions switched on, a sine and cosine pattern for the word’s place (0, 1, 2) is added first, as in the original transformer. There are no trained weights. Without that addition the layer treats the words as a set: shuffle them and each word gets the same output as before, which is why the bars are zero.
        </p>
      </details>
    </WhatIfFrame>
  );
}
