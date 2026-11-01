import { useRef, useState } from 'react';
import { Root } from './shared';
import { FAILURES, FIXES, SHOP_CARD, TRANSCRIPTS, compareToReference, countTags, failuresCounted, rankFixes, type FailureId, type Tags } from '../../lib/error-analysis';
import { readKappa } from '../../lib/kappa';

/*
 * Error-analysis board: twenty invented chatbot transcripts. The learner tags each one with the
 * first failure they see, and the board builds the count chart (a Pareto-style bar list) and ranks
 * candidate fixes by how many of the tagged failures each would remove. Nothing is stored or sent.
 */

const label = (id: FailureId) => FAILURES.find((f) => f.id === id)!.label;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function ErrorAnalysisBoard() {
  const [tags, setTags] = useState<Tags>({});
  const [index, setIndex] = useState(0);
  const headRef = useRef<HTMLHeadingElement>(null);

  const t = TRANSCRIPTS[index];
  const mine = tags[t.id];
  const counts = countTags(tags);
  const taggedCount = TRANSCRIPTS.filter((x) => tags[x.id]).length;
  const failures = failuresCounted(counts);
  const ranked = rankFixes(counts);
  const best = ranked[0];
  const tied = ranked.filter((r) => r.removed === best.removed && r.removed > 0);
  const agree = compareToReference(tags);
  const bars = FAILURES.filter((f) => f.id !== 'fine')
    .map((f) => ({ f, n: counts[f.id] }))
    .sort((a, b) => b.n - a.n);
  const maxBar = Math.max(1, ...bars.map((b) => b.n));

  const tag = (id: FailureId) => {
    setTags((cur) => ({ ...cur, [t.id]: cur[t.id] === id ? undefined : id }));
  };
  const go = (i: number) => {
    setIndex(Math.min(TRANSCRIPTS.length - 1, Math.max(0, i)));
    headRef.current?.focus();
  };

  return (
    <Root>
      <div className="viz ev-board">
        <p className="viz-title">Error-analysis board: tag twenty transcripts, then count</p>
        <p className="ev-note">
          Spoke &amp; Co is an invented bike shop. Its support chatbot has these rules (the shop card). For each transcript, tag the <b>first</b> failure you see, or
          &ldquo;No failure&rdquo;. All twenty transcripts are made up for this lesson.
        </p>
        <ul className="ev-card" aria-label="The shop card">
          {SHOP_CARD.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>

        <div className="ev-strip" role="group" aria-label="Jump to a transcript">
          {TRANSCRIPTS.map((x, i) => (
            <button
              key={x.id}
              type="button"
              className={`ev-dot${i === index ? ' is-here' : ''}${tags[x.id] ? ' is-done' : ''}`}
              aria-label={`Transcript ${x.id}${tags[x.id] ? ', tagged' : ', not tagged'}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => go(i)}
            >
              {x.id}
            </button>
          ))}
        </div>

        <h4 className="ev-h" ref={headRef} tabIndex={-1}>
          Transcript {t.id} of {TRANSCRIPTS.length}
        </h4>
        <div className="ev-chat">
          {t.lines.map((l, i) => (
            <p key={i} className={`ev-line ev-${l.who}`}>
              <span className="ev-who">{l.who === 'customer' ? 'Customer' : 'Bot'}</span>
              {l.text}
            </p>
          ))}
        </div>

        <div className="ev-tags" role="group" aria-label={`Tag for transcript ${t.id}`}>
          {FAILURES.map((f) => (
            <button key={f.id} type="button" className={`ev-tag${mine === f.id ? ' is-on' : ''}`} aria-pressed={mine === f.id} onClick={() => tag(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <p className="ev-feedback" aria-live="polite">
          {mine
            ? mine === t.reference
              ? `Same as the reference tag (${label(t.reference)}). ${t.why}`
              : `The reference tag is "${label(t.reference)}". ${t.why}`
            : 'Choose a tag. The tag buttons are toggles: tap again to clear.'}
        </p>

        <div className="ev-nav">
          <button type="button" className="btn quiet" onClick={() => go(index - 1)} disabled={index === 0}>
            Previous
          </button>
          <button type="button" className="btn" onClick={() => go(index + 1)} disabled={index === TRANSCRIPTS.length - 1}>
            Next
          </button>
          <button type="button" className="btn quiet" onClick={() => { setTags({}); setIndex(0); }} disabled={taggedCount === 0}>
            Clear all tags
          </button>
        </div>

        <h4 className="ev-h">Your counts ({taggedCount} of {TRANSCRIPTS.length} tagged)</h4>
        <ul className="ev-bars" aria-label="Failure counts, largest first">
          {bars.map(({ f, n }) => (
            <li key={f.id}>
              <span className="ev-bar-label">{f.label}</span>
              <span className="ev-bar-track" aria-hidden="true">
                <span className="ev-bar-fill" style={{ width: `${(n / maxBar) * 100}%` }} />
              </span>
              <b className="num ev-bar-n">{n}</b>
            </li>
          ))}
        </ul>

        <h4 className="ev-h">Which fix removes the most?</h4>
        <p className="ev-say" aria-live="polite">
          {failures === 0
            ? 'Tag some transcripts with a failure and the fixes will be ranked here.'
            : tied.length > 1
              ? `${tied.length} fixes tie at ${best.removed} of ${failures} failures. Choose the cheaper one, or the one that matters more to customers.`
              : `Biggest bucket first: "${best.fix.label}" would remove ${best.removed} of ${failures} failures (${pct(best.share)}).`}
        </p>
        <ol className="ev-fixes">
          {ranked.map((r, i) => (
            <li key={r.fix.id} className={failures > 0 && i === 0 ? 'is-best' : ''}>
              <span>{r.fix.label}</span>
              <span className="ev-fix-meta">
                removes <b className="num">{r.removed}</b> of {failures} · {r.fix.effort} effort
              </span>
            </li>
          ))}
        </ol>
        <p className="viz-cap">
          The ranking counts failures only. In practice you also weigh effort, risk and how bad each failure is: one transcript about an injury can matter more than five about tone. {FIXES.length} fixes are listed; each removes one kind of failure.
        </p>

        {agree.tagged >= 5 && (
          <p className="ev-agree" aria-live="polite">
            Against the reference tags you agree on <b className="num">{agree.agree}</b> of <b className="num">{agree.tagged}</b>. Cohen&rsquo;s kappa across the six tags is{' '}
            <b className="num">{Number.isFinite(agree.kappa.kappa) ? agree.kappa.kappa.toFixed(2) : 'not defined'}</b> ({readKappa(agree.kappa.kappa).replace(/\.$/, '').toLowerCase()}). Disagreements are normal: that is why teams write the rules down and compare labels.
          </p>
        )}
      </div>
    </Root>
  );
}
