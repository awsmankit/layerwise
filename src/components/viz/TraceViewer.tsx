import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  EXAMPLE_PRICE_PER_MILLION,
  QUESTIONS,
  RUN_COUNT,
  SLOW_MS,
  SPANS,
  answerFor,
  makeRuns,
  sampleRuns,
  selfTime,
  spanCost,
  totalCost,
  type Question,
  type SampleMode,
} from '../../lib/trace-viewer';

/*
 * A trace viewer for one invented agent run, with four questions to answer by reading it, a switch for what content
 * is recorded, and a sampling panel over 1,000 invented runs. Every duration, token count and price is an example.
 */

type Capture = 'off' | 'spans' | 'external';
const CAPTURE: { id: Capture; label: string }[] = [
  { id: 'off', label: 'Do not record content' },
  { id: 'spans', label: 'Record on the span' },
  { id: 'external', label: 'Store outside, keep a reference' },
];
const RATES = [1, 0.1, 0.01] as const;

const total = SPANS[0].durMs;
const sec = (ms: number) => `${(ms / 1000).toFixed(ms >= 1000 ? 2 : 3)} s`;
const usd = (x: number) => `$${x.toFixed(4)}`;
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;

export default function TraceViewer() {
  const [selected, setSelected] = useState(1);
  const [q, setQ] = useState<Question>('slow');
  const [tries, setTries] = useState<Record<string, 'right' | 'wrong'>>({});
  const [capture, setCapture] = useState<Capture>('off');
  const [mode, setMode] = useState<SampleMode>('head');
  const [rate, setRate] = useState<number>(0.1);
  const [feedback, setFeedback] = useState('Pick a question, then click the span you think answers it.');

  const runs = useMemo(() => makeRuns(), []);
  const sample = useMemo(() => sampleRuns(runs, mode, rate), [runs, mode, rate]);
  const span = SPANS.find((s) => s.id === selected)!;
  const cost = totalCost();
  const question = QUESTIONS.find((x) => x.id === q)!;

  const pick = (id: number) => {
    setSelected(id);
    const s = SPANS.find((x) => x.id === id)!;
    const right = answerFor(q) === id;
    setTries((t) => ({ ...t, [q]: right ? 'right' : 'wrong' }));
    setFeedback(
      right
        ? `Yes, "${s.name}" (span ${id}). ${s.note}`
        : `Not quite: "${s.name}" is not the answer to "${question.ask}" Look at the detail panel for span ${id}, then try another.`,
    );
  };

  return (
    <Root>
      <div className="viz wle-trace">
        <p className="viz-title">Read one agent run</p>
        <p className="wle-note">
          An invented run of a support agent. Durations, token counts and the prices ({`$${EXAMPLE_PRICE_PER_MILLION.input} and $${EXAMPLE_PRICE_PER_MILLION.output}`} per million input and output tokens) are examples. Total: {sec(total)}, about {usd(cost)}.
        </p>

        <div className="wle-group" role="group" aria-label="Question to answer">
          <span className="wle-label">Question</span>
          <div className="wle-row">
            {QUESTIONS.map((x) => (
              <button
                key={x.id}
                type="button"
                className={`btn quiet ${tries[x.id] === 'right' ? 'wle-done' : ''}`}
                aria-pressed={q === x.id}
                onClick={() => {
                  setQ(x.id);
                  setFeedback(x.ask);
                }}
              >
                {x.id === 'slow' ? 'Slowest' : x.id === 'costly' ? 'Costliest' : x.id === 'failed' ? 'Failed' : 'Looks fine, is not'}
                {tries[x.id] === 'right' ? ' (found)' : ''}
              </button>
            ))}
          </div>
          <p className="wle-ask">{question.ask}</p>
        </div>

        <ol className="wle-spans" aria-label="Spans in start order. Choose one to answer the question.">
          {SPANS.map((s) => {
            const left = (s.startMs / total) * 100;
            const width = Math.max(1.5, (s.durMs / total) * 100);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`wle-span ${selected === s.id ? 'is-sel' : ''} ${s.status === 'error' ? 'is-err' : ''} ${s.parent ? 'is-child' : ''}`}
                  aria-pressed={selected === s.id}
                  onClick={() => pick(s.id)}
                >
                  <span className="wle-span-name">
                    <b>{s.id}</b> {s.name}
                    <span className="wle-span-dur">
                      {' '}
                      {sec(s.durMs)}
                      {s.status === 'error' ? ' - error' : ''}
                    </span>
                  </span>
                  <span className="wle-lane" aria-hidden="true">
                    <span className={`wle-bar wle-op-${s.op}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="wle-feedback" role="status" aria-live="polite">
          {feedback}
        </p>

        <div className="wle-detail">
          <h4 className="wle-h">Span {span.id}: {span.name}</h4>
          <p className="wle-small">
            Starts at {sec(span.startMs)}, lasts {sec(span.durMs)} ({sec(selfTime(span))} of its own time), status {span.status}
            {span.inTokens !== undefined ? `, ${span.inTokens.toLocaleString('en-GB')} tokens in, ${span.outTokens?.toLocaleString('en-GB')} out, ${usd(spanCost(span))}` : ''}.
          </p>
          <dl className="wle-attrs">
            {Object.entries(span.attrs).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="wle-group" role="group" aria-label="Content capture">
            <span className="wle-label">Prompts and results</span>
            <div className="wle-row">
              {CAPTURE.map((c) => (
                <button key={c.id} type="button" className="btn quiet" aria-pressed={capture === c.id} onClick={() => setCapture(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <p className="wle-content" role="status" aria-live="polite">
            {span.content === undefined
              ? 'This span carries no prompt or result text.'
              : capture === 'off'
                ? 'Not recorded. You can see sizes, timings and errors, but not what was said.'
                : capture === 'spans'
                  ? `Recorded on the span: ${span.content}. This can hold personal data, so the trace store now needs the same retention and access rules as a database of conversations.`
                  : `Stored outside the trace backend, with only a reference on the span: s3://example-bucket/traces/example-trace-id/span-${span.id}.json. Access to the content can be controlled separately from access to the timings.`}
          </p>
        </div>

        <h4 className="wle-h">What survives sampling?</h4>
        <p className="wle-small">
          {RUN_COUNT.toLocaleString('en-GB')} invented runs: {sample.errors} fail, {sample.slow} take {SLOW_MS / 1000} s or more. Choose how traces are kept.
        </p>
        <div className="wle-controls">
          <div className="wle-group" role="group" aria-label="Sampling method">
            <span className="wle-label">Method</span>
            <div className="wle-row">
              <button type="button" className="btn quiet" aria-pressed={mode === 'head'} onClick={() => setMode('head')}>
                Head: decide at the start
              </button>
              <button type="button" className="btn quiet" aria-pressed={mode === 'tail'} onClick={() => setMode('tail')}>
                Tail: keep errors and slow runs
              </button>
            </div>
          </div>
          <div className="wle-group" role="group" aria-label="Base sampling rate">
            <span className="wle-label">Keep this share of ordinary runs</span>
            <div className="wle-row">
              {RATES.map((r) => (
                <button key={r} type="button" className="btn quiet" aria-pressed={rate === r} onClick={() => setRate(r)}>
                  {pct(r)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="wle-result" role="status" aria-live="polite">
          <p>
            Stored: <b>{sample.kept}</b> of {RUN_COUNT.toLocaleString('en-GB')} runs ({pct(sample.keptShare, 1)} of the storage). Failed runs you can still open: <b>{sample.errorsKept} of {sample.errors}</b>. Slow runs: <b>{sample.slowKept} of {sample.slow}</b>.
          </p>
        </div>
        <p className="viz-cap">
          Head sampling is simple and cheap but cannot know a run will fail. Tail sampling decides after the run ends, so it needs a component that holds whole traces in memory until then.
        </p>
      </div>
    </Root>
  );
}
