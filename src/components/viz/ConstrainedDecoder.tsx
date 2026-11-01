import { useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { END, MODES, SCHEMA_TEXT, isSchemaComplete, isSchemaPrefix, judge, nextStep, rng, sample, showToken, tally, type Mode } from '../../lib/constrained-decoding';

const MODE_LABEL: Record<Mode, string> = { none: 'No constraint', json: 'JSON mode', schema: 'Schema mask' };
const MODE_NOTE: Record<Mode, string> = {
  none: 'The model may write anything. Nothing is blocked, so you can pick any token, including ones that break the format.',
  json: 'JSON mode: the mask removes tokens that would make the text invalid JSON. Any keys and any values are still allowed.',
  schema: 'Schema mask: the mask removes every token that can no longer lead to an output the schema accepts.',
};
const LIMITS = [6, 12, 20];
const RUNS = 2000;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const pct1 = (x: number) => `${(x * 100).toFixed(1).replace(/\.0$/, '')}%`;

/**
 * Step through decoding one token at a time with a scripted next-token table, with no mask, a JSON-syntax
 * mask, or a schema mask. Everything is a toy: the probabilities are invented and the vocabulary is tiny.
 */
export default function ConstrainedDecoder() {
  const [mode, setMode] = useState<Mode>('schema');
  const [limit, setLimit] = useState(12);
  const [tokens, setTokens] = useState<string[]>([]);
  const runCount = useRef(1);
  const random = useRef(rng(7919));

  const reset = () => {
    setTokens([]);
    runCount.current += 1;
    random.current = rng(runCount.current * 7919);
  };
  const changeMode = (m: Mode) => {
    setMode(m);
    reset();
  };
  const changeLimit = (n: number) => {
    setLimit(n);
    reset();
  };

  const ended = tokens.includes(END);
  const text = tokens.filter((t) => t !== END).join('');
  const written = tokens.filter((t) => t !== END).length;
  const outOfBudget = !ended && written >= limit;
  const finished = ended || outOfBudget;
  const step = useMemo(() => (finished ? null : nextStep(text, mode)), [text, mode, finished]);

  const complete = mode === 'schema' ? isSchemaComplete(text) : judge(text).parses;
  const cutOff = outOfBudget && !complete;
  const verdict = judge(text);
  const onTrack = isSchemaPrefix(text);

  const take = (t: string) => setTokens((prev) => [...prev, t]);
  const mostLikely = () => {
    if (!step) return;
    const best = step.candidates.filter((c) => c.allowed).sort((a, b) => b.after - a.after)[0];
    if (best) take(best.token);
  };
  const roll = () => {
    if (!step) return;
    const t = sample(step, random.current());
    if (t) take(t);
  };

  const tallies = useMemo(() => MODES.map((m) => ({ mode: m, t: tally(m, limit, RUNS, 2024) })), [limit]);

  let status: string;
  if (!finished) {
    status = mode === 'none' || mode === 'json' ? (onTrack ? 'So far this is still on a path the schema accepts.' : 'This text can no longer match the schema, whatever comes next.') : 'Every step so far is on a path the schema accepts.';
  } else if (cutOff) {
    status = `Stopped at the token limit (stop_reason: max_tokens) with the text cut off. ${verdict.reason}`;
  } else {
    status = verdict.reason;
  }
  const good = finished && !cutOff && verdict.schemaOk;

  return (
    <Root>
      <div className="viz wla wla-cd">
        <p className="viz-title">Decode one token at a time</p>

        <div className="wla-row" role="group" aria-label="Constraint">
          <span className="wla-label">Constraint</span>
          {MODES.map((m) => (
            <button key={m} type="button" className="wla-chip" aria-pressed={mode === m} onClick={() => changeMode(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="wla-row" role="group" aria-label="Token limit">
          <span className="wla-label">max_tokens</span>
          {LIMITS.map((n) => (
            <button key={n} type="button" className="wla-chip" aria-pressed={limit === n} onClick={() => changeLimit(n)}>
              {n}
            </button>
          ))}
        </div>
        <p className="wla-note">{MODE_NOTE[mode]}</p>

        <details className="wla-schema">
          <summary>The schema this toy grammar stands for</summary>
          <pre>
            <code>{SCHEMA_TEXT}</code>
          </pre>
        </details>

        <div className="wla-out">
          <p className="wla-cap">Output so far ({written} of {limit} tokens)</p>
          <div className="wla-chips" aria-hidden="true">
            {tokens.length === 0 && <span className="wla-empty">nothing yet</span>}
            {tokens.map((t, i) => (
              <span key={i} className={`wla-tokchip${t === END ? ' is-end' : ''}`}>
                {showToken(t)}
              </span>
            ))}
          </div>
          <div aria-live="polite" className={`wla-status${finished ? (good ? ' is-good' : ' is-bad') : ''}`}>
            <span className="sr-only">{tokens.length === 0 ? 'Nothing written yet. ' : `Text so far: ${text}. `}</span>
            {status}
          </div>
        </div>

        {step ? (
          <div className="wla-step">
            <p className="wla-cap">
              Next token: the model's top candidates{mode !== 'none' && <> ({pct(step.blocked)} of its probability is on tokens the mask removes)</>}
            </p>
            <ul className="wla-cands">
              {step.candidates.map((c) => (
                <li key={c.token}>
                  <button
                    type="button"
                    className={`wla-cand${c.allowed ? '' : ' is-blocked'}`}
                    aria-disabled={!c.allowed}
                    onClick={() => c.allowed && take(c.token)}
                  >
                    <code className="wla-tok">{showToken(c.token)}</code>
                    <span className="wla-bars" aria-hidden="true">
                      <span className="wla-bar wla-bar-raw" style={{ width: `${Math.max(c.raw * 100, 1)}%` }} />
                      {mode !== 'none' && c.after > 0 && <span className="wla-bar wla-bar-after" style={{ width: `${c.after * 100}%` }} />}
                    </span>
                    <span className="wla-nums">
                      model {pct(c.raw)}
                      {mode !== 'none' && (c.allowed ? <> &rarr; after mask <b>{pct1(c.after)}</b></> : <> &rarr; <b>blocked</b></>)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="wla-actions">
              <button type="button" className="btn" onClick={mostLikely}>
                Pick the most likely
              </button>
              <button type="button" className="btn quiet" onClick={roll}>
                Sample one
              </button>
              <button type="button" className="btn quiet" onClick={reset}>
                Start again
              </button>
            </div>
            <p className="wla-hint">
              Tap any token to choose it yourself. In the two masked modes you cannot pick a blocked token. A dot (&middot;) stands for a space. Only a few of the model's candidates are shown; a real vocabulary has around 100,000 tokens, and the mask covers all of them.
            </p>
          </div>
        ) : (
          <div className="wla-actions">
            <button type="button" className="btn" onClick={reset}>
              Start again
            </button>
          </div>
        )}

        <div className="wla-sum">
          <p className="wla-cap">{RUNS.toLocaleString('en-US')} sampled runs of this toy model at max_tokens = {limit}</p>
          <table className="wla-table">
            <thead>
              <tr>
                <th scope="col">Constraint</th>
                <th scope="col">Parses</th>
                <th scope="col">Fits schema</th>
                <th scope="col">Cut off</th>
              </tr>
            </thead>
            <tbody>
              {tallies.map(({ mode: m, t }) => (
                <tr key={m}>
                  <th scope="row">{MODE_LABEL[m]}</th>
                  <td>{pct(t.parses / t.runs)}</td>
                  <td>{pct(t.schemaOk / t.runs)}</td>
                  <td>{pct(t.truncated / t.runs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="viz-cap">
            Example numbers from invented probabilities, deliberately much sloppier than a real model so that every block fires within a few steps. They show what the mask guarantees, not how often real models slip. A token limit that is too small defeats the mask: the output is cut off before it is complete.
          </p>
        </div>
      </div>
    </Root>
  );
}
