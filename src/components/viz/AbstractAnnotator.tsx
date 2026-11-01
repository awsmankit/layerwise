import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  CAVEAT_REPLY,
  FRAGMENTS,
  MISSING_FROM_ABSTRACT,
  TAGS,
  TAG_HELP,
  isAccepted,
  scoreAnswers,
  type Answers,
  type Tag,
} from '../../lib/paper-reading';

/*
 * "Annotate the abstract": tag short quoted fragments from the abstract of "Attention Is All You Need"
 * (Vaswani et al., 2017) as claim, method, data, result or caveat. Logic and quotes live in lib/paper-reading.ts.
 */

export default function AbstractAnnotator() {
  const [answers, setAnswers] = useState<Answers>({});
  const [showMissing, setShowMissing] = useState(false);
  const score = useMemo(() => scoreAnswers(answers), [answers]);
  const done = score.answered === score.total;

  return (
    <Root>
      <div className="viz w5b-annot">
        <p className="viz-title">Annotate the abstract</p>
        <p className="w5b-note">
          Seven short quotes from the abstract of "Attention Is All You Need" (Vaswani and others, 2017). For each one, tap the label that fits best. You can change your mind.
        </p>
        <ul className="w5b-tagkey" aria-label="What the labels mean">
          {TAGS.map((t) => (
            <li key={t}>
              <b>{t}</b>: {TAG_HELP[t]}
            </li>
          ))}
        </ul>

        <ol className="w5b-frags">
          {FRAGMENTS.map((f, i) => {
            const t = answers[f.id];
            const ok = t ? isAccepted(f, t) : false;
            return (
              <li key={f.id} className="w5b-frag">
                <fieldset className="w5b-fs">
                  <legend className="w5b-legend">
                    <span className="w5b-sr">Quote {i + 1}: </span>
                    <q className="w5b-quote">{f.text}</q>
                  </legend>
                  <div className="w5b-opts">
                    {TAGS.map((tag) => (
                      <label key={tag} className={`w5b-opt${t === tag ? ' w5b-on' : ''}`}>
                        <input type="radio" name={`frag-${f.id}`} checked={t === tag} onChange={() => setAnswers((a) => ({ ...a, [f.id]: tag as Tag }))} />
                        <span>{tag}</span>
                      </label>
                    ))}
                  </div>
                  <p className={`w5b-fb${t ? (ok ? ' w5b-fb-ok' : ' w5b-fb-no') : ''}`} aria-live="polite">
                    {t ? (
                      <>
                        <b>{ok ? 'Yes. ' : t === 'caveat' ? 'Not quite. ' : 'Not quite. '}</b>
                        {t === 'caveat' ? CAVEAT_REPLY : ok ? f.feedback : `We would call this ${f.accept.join(' or ')}. ${f.feedback}`}
                      </>
                    ) : (
                      ''
                    )}
                  </p>
                </fieldset>
              </li>
            );
          })}
        </ol>

        <div className="w5b-result" role="status" aria-live="polite">
          <p>
            <b>
              {score.answered} of {score.total} tagged, {score.correct} matching our reading.
            </b>{' '}
            {done
              ? score.correct === score.total
                ? 'All seven match. Notice that none of them is a caveat.'
                : 'Where you differed, read our note under the quote. Reasonable readers sometimes tag a sentence differently.'
              : 'Tag them all to see what is missing from this abstract.'}
          </p>
        </div>

        <div className="w5b-actions">
          <button type="button" className="btn" disabled={!done} aria-expanded={showMissing} onClick={() => setShowMissing((v) => !v)}>
            {showMissing ? 'Hide what the abstract leaves out' : 'What does the abstract leave out?'}
          </button>
          <button type="button" className="btn quiet" onClick={() => { setAnswers({}); setShowMissing(false); }}>
            Start again
          </button>
        </div>
        {showMissing && done && (
          <div className="w5b-missing">
            <p>
              We read the whole paper (arXiv version 7) and found these. Each one is something a careful reader would want to know, and none is in the abstract.
            </p>
            <ul>
              {MISSING_FROM_ABSTRACT.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="w5b-small">
              These are not faults to hold against a famous paper. They are what normal papers look like, and they show why you read past the abstract. Read the full paper on{' '}
              <a href="https://arxiv.org/abs/1706.03762" rel="noopener noreferrer">arXiv</a>.
            </p>
          </div>
        )}
      </div>
    </Root>
  );
}
