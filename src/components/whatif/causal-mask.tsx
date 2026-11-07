import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { attentionWeights, canSee, correctCount, percent, results, sentence, type Mode } from '../../lib/whatif/causal-mask';

const LABEL_W = 52;
const CELL = 44;
const TOP = 40;
const N = sentence.length;
const GRID_W = N * CELL;
const BARS_Y = TOP + N * CELL + 58;
const GOOD = '#1f9d6b';
const BAD = '#d6453d';

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * A grid of which word looks at which. Each row is a word that is asked "what comes next?"; the red outline
 * marks the cell that holds the answer. Without the triangular mask the answer is inside the model's view.
 */
export default function CausalMaskWhatIf() {
  const [masked, setMasked] = useState(true);
  const [mode, setMode] = useState<Mode>('practice');

  const weights = useMemo(() => attentionWeights(N, masked), [masked]);
  const rows = useMemo(() => results(masked, mode), [masked, mode]);
  const practice = useMemo(() => results(masked, 'practice'), [masked]);
  const live = useMemo(() => results(masked, 'live'), [masked]);
  const total = rows.length;

  const verdict = masked ? (
    <>
      With the mask each word can only read itself and the words before it, so practice and live writing look the same to the model: {correctCount(practice)} of {total} right ({percent(practice)}%) in both. That is a weak toy model, but an honest one.
    </>
  ) : (
    <>
      Without the mask the model finds the answer sitting in the next column and copies it: {correctCount(practice)} of {total} ({percent(practice)}%) on the practice test. When the words after it are not written yet, as in real writing, it scores {correctCount(live)} of {total} ({percent(live)}%).
    </>
  );

  const barRows = [
    { label: 'Practice test', r: practice, active: mode === 'practice' },
    { label: 'Live writing', r: live, active: mode === 'live' },
  ];

  return (
    <WhatIfFrame
      title="Guessing the next word"
      withLabel="With the mask"
      withoutLabel="Without it"
      on={masked}
      onChange={setMasked}
      verdict={verdict}
      controls={
        <div className="wl-pickrow" role="group" aria-label="Which test to run">
          <button type="button" className={`wl-pick${mode === 'practice' ? ' is-on' : ''}`} aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>
            Practice test
            <small>the whole sentence is on the page</small>
          </button>
          <button type="button" className={`wl-pick${mode === 'live' ? ' is-on' : ''}`} aria-pressed={mode === 'live'} onClick={() => setMode('live')}>
            Live writing
            <small>only the words so far exist</small>
          </button>
        </div>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: a model that writes text must guess each next word from the words before it. If, while it learns, it is allowed to peek at the next word, guessing is trivial: it just copies. The mask is a rule that blocks the peeking. Row = the word that is asked, column = a word it may read. Toy example, not a trained network.
      </p>
      <svg viewBox={`0 0 380 ${BARS_Y + 76}`} className="dx-svg wi-svg wl-cap" role="img" aria-label={`A grid of which word may read which word in the sentence ${sentence.join(' ')}. ${masked ? 'The cells above the diagonal are blocked by the mask.' : 'Every cell is open, including the next word that holds the answer.'} Score in the ${mode === 'practice' ? 'practice test' : 'live writing'}: ${correctCount(rows)} of ${total}.`}>
        <text x={0} y={13} className="dx-small" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          row = word asked, column = word it may read
        </text>
        {sentence.map((w, j) => (
          <text key={`h${j}`} x={LABEL_W + j * CELL + CELL / 2} y={TOP - 7} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
            {w}
          </text>
        ))}
        <text x={LABEL_W + GRID_W + 8} y={TOP - 7} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          guess
        </text>
        {sentence.map((w, i) => {
          const y = TOP + i * CELL;
          const r = i < total ? rows[i] : null;
          return (
            <g key={`r${i}`}>
              <text x={0} y={y + CELL / 2 + 4.5} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
                {w}
              </text>
              {sentence.map((_, j) => {
                const x = LABEL_W + j * CELL;
                const open = canSee(i, j, masked);
                const blank = open && mode === 'live' && j > i; // open but nothing is written there yet
                const isAnswer = j === i + 1 && i < total;
                const weight = weights[i][j];
                const fill = open ? (isAnswer && !blank ? BAD : '#2b7fd6') : 'currentColor';
                return (
                  <g key={j}>
                    <motion.rect
                      x={x + 1.5}
                      y={y + 1.5}
                      width={CELL - 3}
                      height={CELL - 3}
                      rx={6}
                      fill={fill}
                      initial={false}
                      animate={{ fillOpacity: open && !blank ? r4(0.18 + 0.62 * weight) : open ? 0.05 : 0.08 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      stroke={isAnswer ? BAD : 'currentColor'}
                      strokeOpacity={isAnswer ? 1 : open ? 0.35 : 0.3}
                      strokeWidth={isAnswer ? 2.4 : 1}
                      strokeDasharray={!open || blank ? '4 3' : undefined}
                    />
                    <text x={x + CELL / 2} y={y + CELL / 2 + 4.5} textAnchor="middle" style={{ fill: open ? 'var(--ink)' : 'var(--ink-2)', fontSize: 13, fontWeight: open && !blank ? 600 : 400 }}>
                      {!open ? '✕' : blank ? '?' : pct(weight)}
                    </text>
                  </g>
                );
              })}
              {r && (
                <text x={LABEL_W + GRID_W + 8} y={y + CELL / 2 + 4.5} style={{ fill: r.ok ? GOOD : BAD, fontSize: 13, fontWeight: 700 }}>
                  {r.pred ?? '?'} {r.ok ? '✓' : '✗'}
                </text>
              )}
              {!r && (
                <text x={LABEL_W + GRID_W + 8} y={y + CELL / 2 + 4.5} style={{ fill: 'var(--ink-2)', fontSize: 12.5 }}>
                  end
                </text>
              )}
            </g>
          );
        })}
        <text x={0} y={TOP + N * CELL + 18} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          ✕ blocked by the mask   ? not written yet
        </text>
        <text x={0} y={TOP + N * CELL + 36} style={{ fill: BAD, fontSize: 13, fontWeight: 700 }}>
          red outline = the answer the model must guess
        </text>
        {barRows.map((b, k) => {
          const y = BARS_Y + k * 34;
          const p = percent(b.r);
          const good = p >= 50;
          return (
            <g key={b.label}>
              <text x={0} y={y + 14} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: b.active ? 700 : 400 }}>
                {b.label}
              </text>
              <rect x={96} y={y + 2} width={170} height={16} rx={5} fill="currentColor" opacity={0.08} />
              <motion.rect x={96} y={y + 2} height={16} rx={5} fill={good ? GOOD : BAD} initial={false} animate={{ width: r4(Math.max((170 * p) / 100, p > 0 ? 3 : 0)) }} transition={{ duration: 0.5, ease: EASE }} />
              <text x={274} y={y + 14} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
                {correctCount(b.r)} of {b.r.length} · {p}%
              </text>
              {b.active && <rect x={-3} y={y - 2} width={376} height={24} rx={8} fill="none" stroke="currentColor" strokeOpacity={0.4} strokeDasharray="3 3" />}
            </g>
          );
        })}
      </svg>
      <details className="wl-note">
        <summary>The numbers behind the grid (toy model)</summary>
        <p>
          Every cell starts with the same score, so the only thing that changes the weights is the mask: a blocked cell is set to minus infinity before the softmax (the step that turns scores into shares that add up to 100%), which makes its share exactly 0. Row 4, for example, may read 4 words, so each gets 25%. Real models learn their scores; this page keeps them equal to isolate the mask.
        </p>
        <p>
          The masked model is a table of word pairs built from four tiny sentences: for each word it stores the word that most often follows it (ties go to the first in alphabetical order). It gets {correctCount(results(true, 'practice'))} of {total} on the page sentence. The unmasked model has learned the easiest rule available when the next word is visible: copy it. That rule is right every time on the practice text, and has nothing to copy when the next word does not exist yet.
        </p>
      </details>
    </WhatIfFrame>
  );
}
