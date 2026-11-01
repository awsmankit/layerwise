import { useState } from 'react';
import { Root } from './shared';
import { CASES, gradeReview, issueLines, score, type DiffCase, type Graded } from '../../lib/diff-review';

const HEAD: Record<Graded['outcome'], string> = {
  'approved-good': 'Right: nothing to fix.',
  'false-alarm': 'This change is fine, so the flags were false alarms.',
  'found-all': 'You found the problem.',
  'found-some': 'You found part of it.',
  missed: 'You flagged lines, but not the problem.',
  'approved-bad': 'You approved a change that is broken.',
};

const KIND_LABEL: Record<string, string> = {
  logic: 'Plausible logic with a subtle bug',
  'hallucinated-api': 'A function that does not exist',
  'removed-check': 'A check that was removed',
  secret: 'A hard-coded secret',
  'weak-test': 'A test that cannot fail',
  'error-handling': 'An ignored error',
};

/** Five invented AI-written diffs: tap the lines you would flag, submit the review, and read what a careful reviewer would say. */
export default function ReviewDiff() {
  const [idx, setIdx] = useState(0);
  const [flags, setFlags] = useState<Record<string, number[]>>({});
  const [results, setResults] = useState<Record<string, Graded>>({});

  const c = CASES[idx];
  const flagged = flags[c.id] ?? [];
  const result = results[c.id];
  const total = score(CASES.map((x) => results[x.id]));
  const allDone = total.reviewed === CASES.length;

  const toggle = (n: number) => {
    if (result) return;
    setFlags((f) => {
      const cur = f[c.id] ?? [];
      return { ...f, [c.id]: cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n] };
    });
  };
  const submit = () => setResults((r) => ({ ...r, [c.id]: gradeReview(c, flagged) }));
  const again = () => setResults((r) => {
    const { [c.id]: _gone, ...rest } = r;
    return rest;
  });
  const restart = () => {
    setFlags({});
    setResults({});
    setIdx(0);
  };

  const requiredSet = new Set(c.issues.filter((i) => !i.minor).flatMap((i) => issueLines(c, i)));
  const minorSet = new Set(c.issues.filter((i) => i.minor).flatMap((i) => issueLines(c, i)));
  const issueLineSet = new Set([...requiredSet, ...minorSet]);

  return (
    <Root>
      <div className="viz ab-rv">
        <p className="viz-title">Review the diff</p>
        <p className="ab-flagline">Five invented changes, written the way an AI coding agent might write them. Tap the lines you would flag. If the change is fine, flag nothing.</p>

        <ol className="ab-tabs" aria-label="Diffs">
          {CASES.map((x, i) => {
            const r = results[x.id];
            return (
              <li key={x.id}>
                <button type="button" className={'ab-tab' + (i === idx ? ' is-on' : '') + (r ? (r.full ? ' is-full' : ' is-part') : '')} aria-current={i === idx ? 'step' : undefined} onClick={() => setIdx(i)}>
                  <span className="ab-tabn">{i + 1}</span>
                  <span className="ab-sr">Diff {i + 1}: {x.title}{r ? (r.full ? ', reviewed correctly' : ', reviewed with mistakes') : ', not reviewed yet'}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <p className="ab-ask"><b>Asked of the AI:</b> {c.ask}</p>
        <p className="ab-file">{c.title}</p>

        <div className="ab-diff" role="group" aria-label="Diff. Each line is a button: press it to flag or unflag it as a problem.">
          {c.lines.map((l, n) => {
            if (l.kind === 'file') {
              return <p key={n} className="ab-fileline">{l.text}</p>;
            }
            const on = flagged.includes(n);
            const mark = result ? (requiredSet.has(n) ? (on ? 'found' : 'missed') : minorSet.has(n) ? (on ? 'noted' : '') : on ? 'not a problem' : '') : '';
            const sign = l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ' ';
            return (
              <button
                key={n}
                type="button"
                className={`ab-line is-${l.kind}` + (on ? ' is-flag' : '') + (result && issueLineSet.has(n) ? (on ? ' is-hit' : requiredSet.has(n) ? ' is-miss' : '') : '') + (result && on && !issueLineSet.has(n) ? ' is-false' : '')}
                aria-pressed={on}
                aria-label={`${l.kind === 'add' ? 'Added' : l.kind === 'del' ? 'Removed' : 'Unchanged'} line: ${l.text || 'blank'}`}
                onClick={() => toggle(n)}
                disabled={!!result}
              >
                <span className="ab-sign" aria-hidden="true">{sign}</span>
                <code className="ab-code">{l.text || ' '}</code>
                {mark && <span className="ab-mark">{mark}</span>}
              </button>
            );
          })}
        </div>

        {!result ? (
          <div className="ab-actions">
            <button type="button" className="btn" onClick={submit}>
              {flagged.length ? `Request changes (${flagged.length} flagged)` : 'Approve: no problems'}
            </button>
            {flagged.length > 0 && (
              <button type="button" className="btn quiet" onClick={() => setFlags((f) => ({ ...f, [c.id]: [] }))}>
                Clear flags
              </button>
            )}
          </div>
        ) : null}

        <div className="ab-feedback" role="status" aria-live="polite">
          {result && <Feedback c={c} r={result} />}
        </div>

        {result && (
          <div className="ab-actions">
            {idx < CASES.length - 1 && (
              <button type="button" className="btn" onClick={() => setIdx(idx + 1)}>
                Next diff
              </button>
            )}
            <button type="button" className="btn quiet" onClick={again}>
              Review this one again
            </button>
          </div>
        )}

        {allDone && (
          <p className="ab-total">
            All five reviewed. Full marks on <b>{total.full}</b> of {CASES.length}. In real work nothing tells you in advance which diff is the bad one, so the habit that matters is the same each time: read every line, check that every name is real, look at what was removed, and ask what test would fail if the change were wrong.{' '}
            <button type="button" className="btn quiet" onClick={restart}>Start over</button>
          </p>
        )}

        <details className="ab-details">
          <summary>A short checklist for reviewing AI-written code</summary>
          <ul className="ab-assume">
            <li>Does the change do what was asked, and only that? Look for edits to files you did not expect.</li>
            <li>Is every function, method, flag and package real, and the one you meant? Run it or type-check it.</li>
            <li>Read the deleted lines as carefully as the added ones. Checks and validations are easy to remove to make an error go away.</li>
            <li>Any credentials, tokens, internal URLs or personal data in the code or the tests?</li>
            <li>Would the tests fail if the code were wrong? A test that cannot fail is not evidence.</li>
            <li>Is the change small enough to understand in one sitting? If not, ask for smaller steps.</li>
          </ul>
        </details>
      </div>
    </Root>
  );
}

function Feedback({ c, r }: { c: DiffCase; r: Graded }) {
  return (
    <div className="ab-fb">
      <p className={'ab-fbhead ' + (r.full ? 'is-ok' : 'is-bad')}>{HEAD[r.outcome]}</p>
      {c.issues.length === 0 && c.verdict && <p>{c.verdict}</p>}
      {r.falseFlags.length > 0 && c.issues.length > 0 && (
        <p>You also flagged {r.falseFlags.length} {r.falseFlags.length === 1 ? 'line' : 'lines'} that {r.falseFlags.length === 1 ? 'is' : 'are'} fine. Each false alarm costs the author time, and too many train people to ignore review comments.</p>
      )}
      {c.issues.map((i) => {
        const got = r.found.includes(i.id) || r.minorFound.includes(i.id);
        return (
          <div key={i.id} className={'ab-issue ' + (got ? 'is-got' : i.minor ? 'is-note' : 'is-lost')}>
            <p className="ab-issuehead">
              <b>{got ? 'Found' : i.minor ? 'Also worth noting' : 'Missed'}:</b> {i.title} <span className="ab-kind">{KIND_LABEL[i.kind]}</span>
            </p>
            <p>{i.why}</p>
            <p><b>What would catch it without a person:</b> {i.catchWith}</p>
          </div>
        );
      })}
    </div>
  );
}
