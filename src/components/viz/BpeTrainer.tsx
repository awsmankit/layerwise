import { useId, useMemo, useState } from 'react';
import { Root } from './shared';
import { applyMerges, countPairs, encode, tokenLabel, totalTokens, train, utf8Bytes, vocabBytes, wordsFromText } from '../../lib/bpe';

const PRESETS = [
  { id: 'cats', label: 'Cats and mats (toy)', text: 'the cat sat on the mat. the cat ate the rat. the rat sat on the mat.' },
  {
    id: 'low',
    label: 'low, lower, newest, widest (the BPE paper’s words)',
    text: 'low low low low low lower lower newest newest newest newest newest newest widest widest widest',
  },
  { id: 'code', label: 'Indented code (toy)', text: 'for i in range(10):\n    print(i)\nfor j in range(10):\n    print(j)\n' },
] as const;

const MAX_MERGES = 120;
const MAX_CHARS = 2000;
const TINTS = ['var(--tint-lilac)', 'var(--tint-mint)', 'var(--tint-pink)', 'var(--tint-sun)', 'var(--tint-sky)'];

/**
 * A byte-pair-encoding trainer on a toy corpus. Step performs one merge: the pair counts it was chosen
 * from, the new token and the re-segmented corpus are shown. The slider sets how many merges have been
 * applied, which is the vocabulary size minus 256. The last box tokenises any text with the merges learned so far.
 */
export default function BpeTrainer() {
  const uid = useId();
  const [presetId, setPresetId] = useState<string>('cats');
  const [corpus, setCorpus] = useState<string>(PRESETS[0].text);
  const [split, setSplit] = useState(true);
  const [k, setK] = useState(0);
  const [mine, setMine] = useState('the rat sat on a mat. Café!');

  const merges = useMemo(() => train(corpus, MAX_MERGES, { split }), [corpus, split]);
  const base = useMemo(() => wordsFromText(corpus, split), [corpus, split]);
  const kk = Math.min(k, merges.length);
  const vocab = useMemo(() => vocabBytes(merges), [merges]);
  const label = (id: number) => tokenLabel(vocab.get(id) ?? [id]);

  const words = useMemo(() => applyMerges(base, merges, kk), [base, merges, kk]);
  const bytesTotal = useMemo(() => utf8Bytes(corpus).length, [corpus]);
  const tokensNow = totalTokens(words);

  // the counts the latest merge was chosen from (or, at the start, the counts step 1 will use)
  const shownFrom = kk === 0 ? 0 : kk - 1;
  const counts = useMemo(() => countPairs(applyMerges(base, merges, shownFrom)).slice(0, 6), [base, merges, shownFrom]);
  const last = kk > 0 ? merges[kk - 1] : null;
  const next = kk < merges.length ? merges[kk] : null;

  const mineIds = useMemo(() => encode(mine.slice(0, 300), merges.slice(0, kk), split), [mine, merges, kk, split]);
  const mineBytes = utf8Bytes(mine.slice(0, 300)).length;

  const pick = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setCorpus(p.text);
    setK(0);
  };

  const status = last
    ? `Merge ${kk}: ${label(last.pair[0])} + ${label(last.pair[1])} became ${label(last.id)}, seen ${last.count} times. The corpus is now ${tokensNow} tokens, down from ${bytesTotal} bytes.`
    : `No merges yet: the corpus is ${bytesTotal} single bytes. Step 1 will merge ${next ? `${label(next.pair[0])} + ${label(next.pair[1])}, seen ${next.count} times` : 'nothing, because no pair repeats'}.`;

  return (
    <Root>
      <div className="viz dla-bpe">
        <p className="viz-title">Train a tokenizer, one merge at a time</p>

        <div className="dla-row" role="group" aria-label="Choose a toy corpus">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="dla-chip" aria-pressed={presetId === p.id} onClick={() => pick(p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        <label className="dla-field" htmlFor={`${uid}-corpus`}>
          <span>Training text (a toy corpus; edit it)</span>
        </label>
        <textarea
          id={`${uid}-corpus`}
          className="dla-text"
          rows={3}
          value={corpus}
          maxLength={MAX_CHARS}
          spellCheck={false}
          onChange={(e) => {
            setCorpus(e.target.value);
            setPresetId('custom');
          }}
        />
        <label className="dla-check">
          <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} />
          <span>Split into words first (GPT-2 style), so no merge crosses a word boundary</span>
        </label>

        <div className="dla-controls">
          <button type="button" className="btn quiet dla-btn" onClick={() => setK(0)} disabled={kk === 0}>
            Reset
          </button>
          <button type="button" className="btn quiet dla-btn" onClick={() => setK(Math.max(0, kk - 1))} disabled={kk === 0}>
            Back
          </button>
          <button type="button" className="btn dla-btn" onClick={() => setK(Math.min(merges.length, kk + 1))} disabled={kk >= merges.length}>
            Step: merge the top pair
          </button>
        </div>

        <label className="dla-slide">
          <span>
            Vocabulary size <b className="num">{256 + kk}</b> <span className="dla-dim">(256 bytes + {kk} merges)</span>
          </span>
          <input
            type="range"
            min={0}
            max={merges.length}
            step={1}
            value={kk}
            disabled={merges.length === 0}
            onChange={(e) => setK(Number(e.target.value))}
            aria-label="Number of merges applied, which sets the vocabulary size"
            aria-valuetext={`${kk} merges, vocabulary size ${256 + kk}`}
          />
        </label>

        <p className="dla-status" role="status" aria-live="polite">
          {status}
          {kk >= merges.length && merges.length > 0 ? ' No pair occurs twice any more, so training stops here.' : ''}
        </p>

        <dl className="dla-stats">
          <div>
            <dt>Corpus length</dt>
            <dd className="num">
              {tokensNow} tokens <span className="dla-dim">from {bytesTotal} bytes</span>
            </dd>
          </div>
          <div>
            <dt>Bytes per token</dt>
            <dd className="num">{tokensNow ? (bytesTotal / tokensNow).toFixed(2) : '-'}</dd>
          </div>
        </dl>

        <div className="dla-panels">
          <section aria-label="Pair counts">
            <h4 className="dla-h">{kk === 0 ? 'Pair counts: step 1 will merge the top one' : `Pair counts that merge ${kk} was chosen from`}</h4>
            {counts.length === 0 ? (
              <p className="dla-dim">No neighbouring pair to count.</p>
            ) : (
              <table className="dla-table">
                <thead>
                  <tr>
                    <th scope="col">Pair</th>
                    <th scope="col">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {counts.map((c, i) => {
                    const chosen = last ? c.pair[0] === last.pair[0] && c.pair[1] === last.pair[1] : i === 0 && next !== null;
                    return (
                      <tr key={`${c.pair[0]}-${c.pair[1]}`} className={chosen ? 'dla-hot' : undefined}>
                        <td>
                          <code>{label(c.pair[0])}</code> + <code>{label(c.pair[1])}</code>
                          {chosen ? <span className="dla-tag">{last ? ' merged' : ' next'}</span> : null}
                        </td>
                        <td className="num">{c.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <p className="dla-dim dla-small">Ties go to the pair with the smaller ids. A pair seen only once is not merged.</p>
          </section>

          <section aria-label="Learned merges">
            <h4 className="dla-h">Merges so far</h4>
            {kk === 0 ? (
              <p className="dla-dim">None yet. The vocabulary is the 256 byte values.</p>
            ) : (
              <ol className="dla-merges" start={1}>
                {merges.slice(0, kk).map((m, i) => (
                  <li key={m.id} className={i === kk - 1 ? 'dla-hot' : undefined}>
                    <code>{label(m.pair[0])}</code> + <code>{label(m.pair[1])}</code> → <code>{label(m.id)}</code> <span className="dla-dim">(id {m.id}, seen {m.count})</span>
                  </li>
                ))}
              </ol>
            )}
            {next ? <p className="dla-dim dla-small">Next: {label(next.pair[0])} + {label(next.pair[1])}, seen {next.count} times.</p> : null}
          </section>
        </div>

        <h4 className="dla-h">The corpus, cut into tokens</h4>
        <ul className="dla-words" aria-label="Each distinct word with its count and its tokens">
          {words.slice(0, 40).map((w, wi) => (
            <li key={wi}>
              <span className="dla-count num">{w.count}×</span>
              <span className="dla-chips">
                {w.ids.map((id, i) => (
                  <span key={i} className={`dla-tok${id >= 256 ? ' dla-merged' : ''}${last && id === last.id ? ' dla-new' : ''}`} style={id >= 256 ? { background: TINTS[id % TINTS.length] } : undefined}>
                    {label(id)}
                  </span>
                ))}
              </span>
            </li>
          ))}
          {words.length > 40 ? <li className="dla-dim">and {words.length - 40} more distinct words</li> : null}
        </ul>
        <p className="viz-cap">A middle dot stands for a space and an arrow for a new line. Tinted tokens were made by a merge; the newest has a heavy outline. Every other token is a single byte.</p>

        <h4 className="dla-h">Tokenize my text with these merges</h4>
        <label className="dla-field" htmlFor={`${uid}-mine`}>
          <span>Any text, including words the corpus never saw</span>
        </label>
        <input id={`${uid}-mine`} type="text" className="dla-input" value={mine} onChange={(e) => setMine(e.target.value)} maxLength={300} spellCheck={false} />
        <div role="status" aria-live="polite" className="dla-out">
          <p className="dla-status">
            <b className="num">{mineIds.length}</b> tokens for <span className="num">{mineBytes}</span> bytes{' '}
            <span className="dla-dim">(vocabulary {256 + kk})</span>
          </p>
          <p className="dla-chips">
            {mineIds.map((id, i) => (
              <span key={i} className={`dla-tok${id >= 256 ? ' dla-merged' : ''}`} style={id >= 256 ? { background: TINTS[id % TINTS.length] } : undefined}>
                {label(id)}
              </span>
            ))}
          </p>
        </div>
        <p className="viz-cap">Letters the corpus never contained, such as é, are cut into raw bytes and shown as hex like 0xC3. Nothing is ever unknown.</p>
      </div>
    </Root>
  );
}
