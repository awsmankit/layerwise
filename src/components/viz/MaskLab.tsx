import { useState } from 'react';
import { Root } from './shared';
import { SENTENCE, describe, visibleFrom, type Arch } from '../../lib/attention-masks';

const ARCHS: { id: Arch; label: string; model: string; blurb: string; hides: boolean }[] = [
  {
    id: 'encoder',
    label: 'Encoder-only',
    model: 'BERT',
    hides: true,
    blurb: 'Hide some words and predict them using the words on both sides. Every token may look at every other token.',
  },
  {
    id: 'decoder',
    label: 'Decoder-only',
    model: 'GPT',
    hides: false,
    blurb: 'Predict each next token from the tokens before it. A token may not look ahead, so every position gives a training signal.',
  },
  {
    id: 'encdec',
    label: 'Encoder-decoder',
    model: 'T5',
    hides: true,
    blurb: 'Replace each hidden span with a marker, read the damaged text with full attention, then write the missing spans one token at a time.',
  },
  {
    id: 'prefix',
    label: 'Prefix LM',
    model: 'prefix language model',
    hides: false,
    blurb: 'One stack with a mixed mask: the first few tokens (the prefix) see each other both ways, and the rest are written left to right.',
  },
];

export default function MaskLab() {
  const [arch, setArch] = useState<Arch>('encoder');
  const [hidden, setHidden] = useState<number[]>([2, 6]);
  const [prefix, setPrefix] = useState(3);
  const [look, setLook] = useState(3);

  const meta = ARCHS.find((a) => a.id === arch)!;
  const d = describe(arch, SENTENCE, hidden, prefix);
  const toggle = (i: number) => setHidden((h) => (h.includes(i) ? h.filter((x) => x !== i) : [...h, i].sort((a, b) => a - b)));

  const first = d.grids[0];
  const lookAt = Math.min(look, first.rows.length - 1);
  const seen = visibleFrom(first.grid, lookAt).map((j) => first.cols[j]);

  const summary =
    `${meta.label}. Given: ${d.input.join(' ')}. Predicts: ${d.predicted.join(' ') || 'nothing yet, hide some tokens'}. ` +
    `${d.signal} of ${d.of} positions give a training signal. In the first grid, ${first.rows[lookAt]} at position ${lookAt + 1} can look at: ${seen.join(', ')}.`;

  return (
    <Root>
      <div className="viz wb wb-mask">
        <p className="viz-title">Same sentence, three ways to train on it</p>

        <div className="wb-row" role="group" aria-label="Model shape">
          {ARCHS.map((a) => (
            <button key={a.id} type="button" className="wb-chip" aria-pressed={arch === a.id} onClick={() => setArch(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
        <p className="wb-note">
          <b>{meta.model}.</b> {meta.blurb}
        </p>

        <div className="wb-block">
          <p className="wb-cap">{meta.hides ? 'Tap words to hide them' : 'The sentence'}</p>
          <div className="wb-chips" role="group" aria-label="Words in the sentence">
            {SENTENCE.map((w, i) =>
              meta.hides ? (
                <button key={i} type="button" className={`wb-word${hidden.includes(i) ? ' is-hidden' : ''}`} aria-pressed={hidden.includes(i)} onClick={() => toggle(i)}>
                  {w}
                </button>
              ) : (
                <span key={i} className={`wb-word wb-word-static${arch === 'prefix' && i < Math.max(1, Math.min(prefix, SENTENCE.length - 1)) ? ' is-prefix' : ''}`}>
                  {w}
                </span>
              ),
            )}
          </div>
          {arch === 'prefix' && (
            <label className="field wb-slide">
              <span>
                Prefix length <b>{Math.max(1, Math.min(prefix, SENTENCE.length - 1))}</b>
              </span>
              <input type="range" min={1} max={SENTENCE.length - 1} step={1} value={prefix} aria-label="Prefix length" onChange={(e) => setPrefix(+e.target.value)} />
            </label>
          )}
        </div>

        <div className="wb-block">
          <p className="wb-cap">The model is given</p>
          <p className="wb-seq">
            {d.input.map((t, i) => (
              <span key={i} className={`wb-tok${t === '[MASK]' || /^<[A-Z]>$/.test(t) ? ' wb-tok-mark' : ''}`}>
                {t}
              </span>
            ))}
          </p>
          <p className="wb-cap">It must predict</p>
          <p className="wb-seq">
            {d.predicted.length ? (
              d.predicted.map((t, i) => (
                <span key={i} className="wb-tok wb-tok-goal">
                  {t}
                </span>
              ))
            ) : (
              <span className="wb-empty">Nothing yet. Hide at least one word.</span>
            )}
          </p>
          <p className="wb-signal">
            Training signal at <b>{d.signal}</b> of <b>{d.of}</b> positions
            {d.of > 0 ? ` (${Math.round((d.signal / d.of) * 100)}%)` : ''}.
          </p>
        </div>

        {d.grids.map((g, gi) => (
          <div key={`${arch}-${gi}`} className="wb-block">
            <p className="wb-cap">{g.label}. Rows look at columns. Tap a row name to follow one token.</p>
            <div className="wb-grid-wrap">
              <div className="wb-grid" style={{ gridTemplateColumns: `3.9rem repeat(${g.cols.length}, var(--wb-cell))` }} role="group" aria-label={g.label}>
                <span />
                {g.cols.map((_, j) => (
                  <span key={j} className="wb-colhead" aria-hidden="true">
                    {j + 1}
                  </span>
                ))}
                {g.rows.map((r, i) => (
                  <GridRow key={i} i={i} label={r} row={g.grid[i]} on={gi === 0 && i === lookAt} onPick={() => setLook(i)} follow={gi === 0} />
                ))}
              </div>
            </div>
          </div>
        ))}
        {arch === 'encdec' && <p className="wb-note">The decoder also looks at every position of the encoder's output (cross-attention), so a third grid would be all open.</p>}

        <p className="wb-read" aria-live="polite">
          <span className="sr-only">{summary}</span>
          <span aria-hidden="true">
            <b>{first.rows[lookAt]}</b> (position {lookAt + 1}) can look at: {seen.join(', ')}.
          </span>
        </p>

        <p className="viz-cap">
          Filled square: the row's token may use the column's token. Empty: it may not. Real systems hide about 15% of tokens (BERT and T5 both use 15%, BERT in single tokens and T5 in spans); this sentence is short, so one or two hidden words is realistic.
        </p>
      </div>
    </Root>
  );
}

function GridRow({ i, label, row, on, onPick, follow }: { i: number; label: string; row: boolean[]; on: boolean; onPick: () => void; follow: boolean }) {
  return (
    <>
      {follow ? (
        <button type="button" className={`wb-rowhead${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onPick}>
          <span className="wb-rn">{i + 1}</span> {label}
        </button>
      ) : (
        <span className="wb-rowhead wb-rowhead-static">
          <span className="wb-rn">{i + 1}</span> {label}
        </span>
      )}
      {row.map((ok, j) => (
        <span key={j} className={`wb-cell${ok ? ' is-open' : ''}${on ? ' is-row' : ''}`} aria-hidden="true" />
      ))}
    </>
  );
}
