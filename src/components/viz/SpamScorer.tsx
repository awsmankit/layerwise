import { useMemo, useState } from 'react';
import { Root } from './shared';
import { EXTRA, TEST, TRAIN } from '../../lib/spam-data';
import { logScore, startingLean, train, votes } from '../../lib/spam-nb';

const CAP = 3; // votes beyond this length fill the bar
const fmt = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1);

/** Pick a message and watch each word vote spam or not spam, using counts from the lesson's training messages. */
export default function SpamScorer() {
  const [more, setMore] = useState(false);
  const [text, setText] = useState(TEST[6][0]);
  const model = useMemo(() => train(more ? [...TRAIN, ...EXTRA] : TRAIN), [more]);
  const rows = votes(model, text);
  const start = startingLean(model);
  const total = start + rows.reduce((a, v) => a + v.lean, 0);
  const verdict = logScore(model, text, 'spam') > logScore(model, text, 'ham') ? 'spam' : 'not spam';
  const real = TEST.find(([t]) => t === text)?.[1];

  return (
    <Root>
      <div className="viz sk-score">
        <p className="viz-title">Watch the words vote</p>

        <div className="sk-pick" role="group" aria-label="Choose one of the 12 test messages">
          <span className="sk-pick-label">Test messages</span>
          {TEST.map(([t], n) => (
            <button key={t} type="button" className="sk-chip sk-num-chip" aria-pressed={t === text} aria-label={`Test message ${n + 1}: ${t}`} onClick={() => setText(t)}>
              {n + 1}
            </button>
          ))}
        </div>

        <label className="sk-type">
          <span>The message (pick a number above, or type your own)</span>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} autoComplete="off" spellCheck={false} />
        </label>

        <div className="sk-chips" role="group" aria-label="Which examples the model learned from">
          <button type="button" className="sk-chip" aria-pressed={!more} onClick={() => setMore(false)}>
            Learned from the 30 messages
          </button>
          <button type="button" className="sk-chip" aria-pressed={more} onClick={() => setMore(true)}>
            Plus the 4 extra
          </button>
        </div>

        <ul className="sk-votes" aria-label="Each word's vote">
          <li className="sk-vote sk-start">
            <span className="sk-w">before any word</span>
            <span className="sk-c">{model.messages.spam} spam, {model.messages.ham} not spam</span>
            <Bar lean={start} />
          </li>
          {rows.map((v, n) => (
            <li key={`${text}-${n}`} className={'sk-vote' + (v.known ? '' : ' is-unseen')}>
              <span className="sk-w">{v.word}</span>
              <span className="sk-c">{v.known ? `in ${v.spamCount} spam, ${v.hamCount} not spam` : 'never seen, ignored'}</span>
              <Bar lean={v.lean} />
            </li>
          ))}
        </ul>

        <p className="sk-total" aria-live="polite">
          Total {fmt(total)}: the model says <b>{verdict}</b>.
          {real && (
            <>
              {' '}The real label is <b>{real === 'spam' ? 'spam' : 'not spam'}</b>, so it is{' '}
              <b className={(real === 'spam') === (verdict === 'spam') ? 'sk-yes' : 'sk-no'}>{(real === 'spam') === (verdict === 'spam') ? 'right' : 'wrong'}</b>.
            </>
          )}
        </p>
        <p className="viz-cap">
          Above 0 leans spam, below 0 leans not spam. Words in the training messages vote by how much more often they appeared on one side; a word never seen in training does not vote. Choose message 7 or 4 with only the 30 messages, then add the 4 extra.
        </p>
      </div>
    </Root>
  );
}

function Bar({ lean }: { lean: number }) {
  const w = Math.min(1, Math.abs(lean) / CAP) * 50;
  return (
    <span className="sk-bar" role="img" aria-label={lean === 0 ? 'no vote' : `${fmt(lean)}, leans ${lean > 0 ? 'spam' : 'not spam'}`}>
      <span className="sk-fill" style={{ width: `${w}%`, [lean > 0 ? 'left' : 'right']: '50%', background: lean > 0 ? 'var(--warn)' : 'var(--ok)' }} />
      <span className="sk-num">{lean === 0 ? '0' : fmt(lean)}</span>
    </span>
  );
}
