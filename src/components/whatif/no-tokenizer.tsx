import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { WINDOW, causalPairs, compare, examples, schemes, tokenize, type Scheme } from '../../lib/whatif/no-tokenizer';

const GRID = 190;

/**
 * The same sentence cut into characters or into toy subword pieces. The staircase is the attention table:
 * every token looks back at every earlier token. Both staircases are drawn with the same cell size, so the
 * character version is visibly the larger one.
 */
export default function NoTokenizerWhatIf() {
  const [tok, setTok] = useState(true);
  const [exId, setExId] = useState(examples[2].id);
  const ex = examples.find((e) => e.id === exId) ?? examples[2];
  const scheme: Scheme = tok ? 'subwords' : 'chars';

  const rows = useMemo(() => compare(ex.text), [ex]);
  const row = rows.find((r) => r.scheme === scheme)!;
  const chars = rows[0];
  const pieces = useMemo(() => tokenize(ex.text, scheme), [ex, scheme]);

  const cell = GRID / chars.tokens;
  const n = row.tokens;
  const side = n * cell;
  const maxPairs = chars.pairs;
  const maxFit = Math.max(...rows.map((r) => r.chars));

  const gridTop = 26;
  const tableY = gridTop + GRID + 34;
  const fitY = tableY + 26 + rows.length * 26 + 14;
  const H = fitY + 26 + rows.length * 26 + 6;

  // staircase: row i has i + 1 cells
  const stairs = Array.from({ length: n }, (_, i) => `M0 ${i * cell}h${(i + 1) * cell}v${cell}h${-(i + 1) * cell}z`).join('');

  const ratio = chars.pairs / rows[1].pairs;
  const verdict = tok ? (
    <>
      Cut into {n} pieces, the text has {fmt.int(row.pairs)} token pairs to score. A window of {fmt.int(WINDOW)} tokens (example) holds about {fmt.int(row.chars)} characters of text like this.
    </>
  ) : (
    <>
      Read one character at a time, the same text is {n} tokens long and has {fmt.int(row.pairs)} token pairs to score, {ratio.toFixed(1)} times more than with {rows[1].tokens} toy subword pieces. A window of {fmt.int(WINDOW)} tokens now holds only {fmt.int(row.chars)} characters.
    </>
  );

  return (
    <WhatIfFrame
      title="One sentence, cut two ways"
      withLabel="With a tokenizer"
      withoutLabel="Characters only"
      on={tok}
      onChange={setTok}
      verdict={verdict}
      controls={
        <label className="field wl-field">
          <span>Text to read</span>
          <select className="wl-select" value={exId} onChange={(e) => setExId(e.target.value)} aria-label="Text to read">
            {examples.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: a tokenizer chops text into pieces before the model sees it. Take it away and the model must read letter by letter, so the same sentence becomes a much longer list, and every piece has to look at every earlier piece.
      </p>
      <p className="wl-count">
        <b>{n}</b> {scheme === 'chars' ? 'characters (a space counts too)' : 'pieces (toy subword split)'}
      </p>
      <ul className="wl-chips" aria-label={`The text cut into ${n} pieces`}>
        {pieces.map((p, i) => (
          <li key={i} className={`wl-chip wl-chip-${i % 3}${scheme === 'chars' ? ' wl-chip-small' : ''}`}>
            {p === ' ' ? '␣' : p}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 380 ${H}`} className="dx-svg wi-svg wl-cap" role="img" aria-label={`Attention table for ${n} tokens: ${fmt.int(row.pairs)} token pairs. With characters it would be ${fmt.int(chars.pairs)} pairs.`}>
        <text x={0} y={16} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          Attention table: who looks at whom
        </text>
        <rect x={0} y={gridTop} width={GRID} height={GRID} rx={2} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 4" />
        <motion.g key={scheme + exId} transform={`translate(0 ${gridTop})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: EASE }}>
          <path d={stairs} fill={tok ? '#1f9d6b' : '#d6453d'} fillOpacity={0.8} stroke="var(--surface)" strokeWidth={cell > 5 ? 0.8 : 0} />
        </motion.g>
        <text x={GRID + 14} y={gridTop + 18} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          tokens
        </text>
        <text x={GRID + 14} y={gridTop + 44} style={{ fill: 'var(--ink)', fontSize: 24, fontWeight: 700 }}>
          {fmt.int(n)}
        </text>
        <text x={GRID + 14} y={gridTop + 72} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          pairs to score
        </text>
        <text x={GRID + 14} y={gridTop + 98} style={{ fill: 'var(--ink)', fontSize: 24, fontWeight: 700 }}>
          {fmt.int(row.pairs)}
        </text>
        <text x={GRID + 14} y={gridTop + 122} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
          every token looks
        </text>
        <text x={GRID + 14} y={gridTop + 138} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
          at all earlier ones
        </text>
        {!tok ? null : (
          <text x={GRID + 14} y={gridTop + 170} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            dashed box = size with
          </text>
        )}
        {!tok ? null : (
          <text x={GRID + 14} y={gridTop + 186} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            characters
          </text>
        )}

        <text x={0} y={tableY} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          Token pairs for this text
        </text>
        {rows.map((r, i) => {
          const y = tableY + 8 + i * 26;
          const here = r.scheme === scheme;
          const w = (r.pairs / maxPairs) * 150;
          return (
            <g key={r.scheme}>
              <text x={0} y={y + 14} style={{ fill: 'var(--ink)', fontSize: 12.5, fontWeight: here ? 700 : 400 }}>
                {schemes[i].label}
              </text>
              <rect x={92} y={y + 2} width={150} height={16} rx={4} fill="currentColor" opacity={0.07} />
              <motion.rect x={92} y={y + 2} height={16} rx={4} fill={r.scheme === 'chars' ? '#d6453d' : '#1f9d6b'} fillOpacity={here ? 1 : 0.45} initial={false} animate={{ width: Math.max(w, 2) }} transition={{ duration: 0.5, ease: EASE }} />
              <text x={92 + w + 6} y={y + 14} style={{ fill: 'var(--ink)', fontSize: 12.5 }}>
                {fmt.int(r.pairs)} ({r.tokens} tokens)
              </text>
            </g>
          );
        })}

        <text x={0} y={fitY} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          Characters that fit in {fmt.int(WINDOW)} tokens (example)
        </text>
        {rows.map((r, i) => {
          const y = fitY + 8 + i * 26;
          const here = r.scheme === scheme;
          const w = (r.chars / maxFit) * 150;
          return (
            <g key={r.scheme}>
              <text x={0} y={y + 14} style={{ fill: 'var(--ink)', fontSize: 12.5, fontWeight: here ? 700 : 400 }}>
                {schemes[i].label}
              </text>
              <rect x={92} y={y + 2} width={150} height={16} rx={4} fill="currentColor" opacity={0.07} />
              <motion.rect x={92} y={y + 2} height={16} rx={4} fill={r.scheme === 'chars' ? '#d6453d' : '#1f9d6b'} fillOpacity={here ? 1 : 0.45} initial={false} animate={{ width: Math.max(w, 2) }} transition={{ duration: 0.5, ease: EASE }} />
              <text x={92 + w + 6} y={y + 14} style={{ fill: 'var(--ink)', fontSize: 12.5 }}>
                {fmt.int(r.chars)}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="wl-note">
        <summary>The numbers behind the figure (toy split)</summary>
        <p>
          The toy split has 27 hand-made pieces and always takes the longest match, falling back to single letters. Real tokenizers (byte-pair encoding and similar) learn tens of thousands of pieces from data, so real counts differ. Pairs are n × (n + 1) / 2, because a language model lets each token look at itself and the tokens before it. Doubling the length roughly quadruples the pairs. The window of {fmt.int(WINDOW)} tokens is an example size. Characters that fit = window × (characters ÷ tokens) for this text. Words are shown for comparison: a word-level model cannot read a word it has no entry for, which subwords solve by falling back to smaller pieces.
        </p>
      </details>
    </WhatIfFrame>
  );
}
