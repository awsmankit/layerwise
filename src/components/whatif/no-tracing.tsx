import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  BAD_STEP,
  COMPLAINT,
  FINAL_ANSWER,
  MINUTES_PER_REPLAY,
  SECONDS_PER_SPAN,
  STEPS,
  STEP_COUNT,
  inspectWithTrace,
  inspectWithoutTrace,
  maxMs,
  trail,
} from '../../lib/whatif/no-tracing';

const TRAIL = trail();
const MAXMS = maxMs();

/**
 * A scripted 12-step agent run that goes wrong at step 7. With a trace every step is recorded and you follow the wrong
 * number back from the answer. Without one the steps are hidden and you re-run and check them one by one from the start.
 */
export default function NoTracingWhatIf() {
  const [traced, setTraced] = useState(false);
  const [sel, setSel] = useState<number>(BAD_STEP);
  // how many steps have been looked at: end state by default, "Play it" replays from zero
  const [shown, setShown] = useState(inspectWithoutTrace());
  const [playing, setPlaying] = useState(false);
  const limit = traced ? inspectWithTrace() : inspectWithoutTrace();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setShown((s) => {
        if (s >= limit) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 600);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, limit]);

  const choose = (v: boolean) => {
    setPlaying(false);
    setTraced(v);
    setShown(v ? inspectWithTrace() : inspectWithoutTrace());
    setSel(BAD_STEP);
  };
  const play = () => {
    setShown(0);
    setPlaying(true);
  };
  const next = () => {
    setPlaying(false);
    setShown((s) => Math.min(limit, s + 1));
  };

  const current = traced ? sel : Math.max(1, Math.min(shown, STEP_COUNT));
  const detail = STEPS[(traced ? sel : current) - 1];
  const found = shown >= limit;

  const verdict = traced ? (
    <>
      With the trace you start at the wrong number in the answer and follow it back: {inspectWithTrace()} steps to inspect ({TRAIL.join(', ')}), about {Math.round((inspectWithTrace() * SECONDS_PER_SPAN) / 60)} minute (example). Step {BAD_STEP} is the culprit: a price cached 3 days ago.
    </>
  ) : (
    <>
      Without a trace you have only the final answer. You re-run the agent and check each step from the start until you meet the bad one: {inspectWithoutTrace()} steps to inspect, about {inspectWithoutTrace() * MINUTES_PER_REPLAY} minutes (example), and only if the run repeats.
    </>
  );

  return (
    <WhatIfFrame
      title="An agent run of 12 steps that goes wrong"
      withLabel="With a trace"
      withoutLabel="Without one"
      on={traced}
      onChange={choose}
      verdict={verdict}
      controls={
        <div className="wa-btns">
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Play it'}
          </button>
          {!traced && (
            <button type="button" className="btn quiet" onClick={next} disabled={found}>
              Check the next step
            </button>
          )}
          <span className="wa-count" aria-live="polite">
            Steps inspected: <b>{shown}</b> of {limit}
          </span>
        </div>
      }
    >
      <p className="wa-lead">
        A toy travel agent was asked to book the cheapest flight under 300 euros. It said it booked one for 189. The customer was charged 389. Something went wrong inside, and you have to find it.
      </p>
      <div className="wa-final">
        <p className="wa-who">The customer says</p>
        <p>{COMPLAINT}</p>
        <p className="wa-who">The agent's final answer</p>
        <p>{FINAL_ANSWER}</p>
      </div>

      <ol className="wa-tr" aria-label={traced ? 'Trace of the 12 steps. Pick a step to read it.' : 'The 12 steps, hidden because nothing was recorded'}>
        {STEPS.map((s) => {
          const idx = TRAIL.indexOf(s.n);
          const onTrail = traced && idx >= 0 && idx < shown;
          const root = onTrail && s.n === BAD_STEP;
          const seen = !traced && s.n <= shown;
          const bad = !traced && seen && s.n === BAD_STEP;
          const cls = 'wa-tr-row' + (onTrail ? ' is-trail' : '') + (root || bad ? ' is-root' : '') + (traced && sel === s.n ? ' is-sel' : '') + (!traced && !seen ? ' is-hidden' : '');
          const inner = (
            <>
              <span className="wa-tr-n" aria-hidden="true">{s.n}</span>
              <span className={'wa-tr-kind ' + s.kind}>{s.kind === 'tool' ? 'TOOL' : 'MODEL'}</span>
              <span className="wa-tr-name">{traced || seen ? s.name : 'hidden'}</span>
              {traced ? (
                <span className="wa-tr-bar" aria-hidden="true">
                  <motion.i initial={false} animate={{ width: `${Math.max(6, Math.round((s.ms / MAXMS) * 100))}%` }} transition={{ duration: 0.5, ease: EASE }} />
                </span>
              ) : (
                <span className="wa-tr-q" aria-hidden="true">{seen ? (s.n === BAD_STEP ? '✗' : '✓') : '?'}</span>
              )}
              {traced && <span className="wa-tr-ms">{s.ms} ms</span>}
              {(root || bad) && <span className="wa-tr-flag">✗ stale price</span>}
            </>
          );
          return traced ? (
            <li key={s.n}>
              <button type="button" className={cls} aria-pressed={sel === s.n} onClick={() => { setPlaying(false); setSel(s.n); }}>
                {inner}
              </button>
            </li>
          ) : (
            <li key={s.n} className={cls}>{inner}</li>
          );
        })}
      </ol>

      {(traced || shown > 0) && (
        <div className={'wa-tr-detail' + (detail.n === BAD_STEP ? ' is-bad' : '')} aria-live="polite">
          <p className="wa-who">
            Step {detail.n} · {detail.kind === 'tool' ? 'tool call' : 'model call'} · {detail.name}
          </p>
          <p><b>In:</b> <span className="wa-mono">{detail.input}</span></p>
          <p><b>Out:</b> <span className="wa-mono">{detail.output}</span></p>
          {detail.n === BAD_STEP && <p className="wa-bad"><b>✗ This is the cause.</b> The tool said OK, but the price is 3 days old. The real fare was 389.</p>}
        </div>
      )}

      <ul className="wa-score">
        <li className={traced ? 'is-good' : 'is-bad'}>{inspectWithTrace()} steps with a trace</li>
        <li className={traced ? '' : 'is-bad'}>{inspectWithoutTrace()} steps without</li>
        <li>example: {SECONDS_PER_SPAN} s to read a recorded step, {MINUTES_PER_REPLAY} min to re-run and check one</li>
      </ul>
      <p className="wa-note">
        Scripted toy run: every step, time and price is invented. With a trace, each step is recorded with its input, output and time, and you follow the wrong number back through the steps that used it ({TRAIL.join(' → ')}). Without one you rebuild the run from the start and stop at the first bad result.
      </p>
    </WhatIfFrame>
  );
}
