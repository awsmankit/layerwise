import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  HANG_SECONDS,
  KIND_LABEL,
  LOOP_CALLS,
  OUTCOME_LABEL,
  RATES,
  SECONDS,
  SYMBOL,
  TASKS,
  WAITS,
  runAll,
  type Outcome,
  type TaskRun,
} from '../../lib/whatif/no-tool-error-handling';

const GREEN = '#1f9d6b';
const RED = '#d6453d';
const AMBER = '#c77d0a';

const TONE: Record<Outcome, 'good' | 'hold' | 'bad'> = { ok: 'good', retried: 'good', backup: 'hold', asked: 'hold', crashed: 'bad', invented: 'bad', looped: 'bad' };
const SHORT: Record<Outcome, string> = { ok: 'ok', retried: 'retry', backup: 'backup', asked: 'asked', crashed: 'crash', invented: 'made up', looped: 'loop' };
const COLOR = { good: GREEN, hold: AMBER, bad: RED };

const LEGEND: Record<Outcome, string> = { ok: 'first try', retried: 'after retry', backup: 'backup used', asked: 'asked you', crashed: 'crashed', invented: 'made up', looped: 'looped' };

const END_NOTE: Record<Outcome, string> = {
  ok: 'The tool answered, so the agent used the answer.',
  retried: 'The failure cleared, so the agent got the real answer and carried on.',
  backup: 'The agent used a cached copy and said it was a backup, not a fresh result.',
  asked: 'The agent said the lookup failed and asked the person what to do. No guess.',
  crashed: `Nothing handled the timeout, so the agent hung until the run was killed after ${HANG_SECONDS} s.`,
  invented: 'Nothing checked the error, so the agent treated it as an answer and made one up. It looks like a real result.',
  looped: `The agent asked again at once, ${LOOP_CALLS} times, hammering a tool that was already saying "too many requests". Then it ran out of steps.`,
};

/** One block per attempt on a row, with the wait before each retry drawn as a gap. Not to scale in seconds. */
function Timeline({ run }: { run: TaskRun }) {
  const n = run.attempts.length;
  const gap = 14;
  const w = Math.min(60, (330 - gap * (n - 1)) / n);
  const total = n * w + (n - 1) * gap;
  const x0 = (340 - total) / 2;
  return (
    <svg
      viewBox="0 0 340 74"
      className="dx-svg wi-svg wa-svg"
      role="img"
      aria-label={`Task ${run.task + 1}: ${run.attempts.length} step${n === 1 ? '' : 's'}, ending with: ${OUTCOME_LABEL[run.outcome]}.`}
    >
      <line x1={x0} x2={x0 + total} y1={38} y2={38} stroke="currentColor" strokeWidth={1} opacity={0.3} />
      {run.attempts.map((a, i) => {
        const x = x0 + i * (w + gap);
        const good = a.kind === 'ok';
        const backup = a.kind === 'backup';
        const c = good ? GREEN : backup ? AMBER : RED;
        return (
          <g key={i}>
            {a.waitBefore > 0 && (
              <text x={x - gap / 2} y={16} textAnchor="middle" className="wa-t2" style={{ fontSize: 12 }}>
                {a.waitBefore} s
              </text>
            )}
            <motion.rect
              x={x} y={22} width={w} height={32} rx={8} strokeWidth={2}
              initial={false}
              animate={{ stroke: c, fill: c + '2e' }}
              transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
            />
            <text x={x + w / 2} y={44} textAnchor="middle" className="wa-tb" style={{ fill: c }}>
              {backup ? '◔' : good ? '✓' : '✗'}
            </text>
            <text x={x + w / 2} y={70} textAnchor="middle" className="wa-t2" style={{ fontSize: 12 }}>
              {backup ? 'backup' : i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Twenty tasks, each needing one call to a flaky tool. The grid shows how each task ended. Pick one to see its
 * attempts. All the numbers come from a seeded random table, so the same failure rate always gives the same run.
 */
export default function NoToolErrorHandlingWhatIf() {
  const [handled, setHandled] = useState(true);
  const [ri, setRi] = useState(3);
  const [sel, setSel] = useState<number>(() => {
    const first = runAll(RATES[3] / 100, true).runs.findIndex((r) => r.outcome !== 'ok');
    return first < 0 ? 0 : first;
  });
  const [shown, setShown] = useState(TASKS);
  const [playing, setPlaying] = useState(false);

  const pct = RATES[ri];
  const s = useMemo(() => runAll(pct / 100, handled), [pct, handled]);
  const run = s.runs[sel];

  useEffect(() => {
    if (!playing) return;
    if (shown >= TASKS) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setShown((x) => x + 1), 110);
    return () => clearTimeout(t);
  }, [playing, shown]);

  const replay = () => {
    setShown(0);
    setPlaying(true);
  };
  const flip = (v: boolean) => {
    setHandled(v);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPlaying(false);
      setShown(TASKS);
    } else replay();
  };

  const c = s.counts;
  const verdict = handled ? (
    <>
      At a {pct}% failure rate, with retries, backoff and a fallback, {s.correct} of {TASKS} tasks finish with a fresh, correct result.{' '}
      {c.backup + c.asked > 0 ? `${c.backup} use a labelled backup and ${c.asked} stop and ask you. ` : ''}None crash, loop or invent an answer. It costs {s.calls} tool calls (toy run, example timings).
    </>
  ) : (
    <>
      At a {pct}% failure rate with nothing handled, only {s.correct} of {TASKS} tasks finish correctly. {c.crashed} crash, {c.looped} loop and {c.invented} hand back an answer that was made up, which looks just like a real one (toy run, example timings).
    </>
  );

  const lines: string[] = [];
  run.attempts.forEach((a, i) => {
    if (a.waitBefore > 0) lines.push(`Waited ${a.waitBefore} s before trying again.`);
    if (a.kind === 'ok') lines.push(`Try ${i + 1}: the tool answered.`);
    else if (a.kind === 'backup') lines.push('Used the cached backup copy (labelled as a backup).');
    else if (!handled && run.outcome === 'looped' && i > 0) lines.push(`Try ${i + 1}: said too many requests again.`);
    else lines.push(`Try ${i + 1}: the tool ${KIND_LABEL[a.kind]}.`);
  });

  return (
    <WhatIfFrame
      title="Twenty tasks, one flaky tool"
      withLabel="Errors handled"
      withoutLabel="Errors ignored"
      on={handled}
      onChange={flip}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Chance each tool call fails <b>{pct}%</b>
            </span>
            <input type="range" min={0} max={RATES.length - 1} value={ri} onChange={(e) => setRi(+e.target.value)} aria-label="Chance that each tool call fails, in percent" />
          </label>
          <div className="wa-btns" style={{ marginTop: 0 }}>
            <button type="button" className="btn quiet" onClick={replay}>
              {playing ? 'Playing…' : 'Play it'}
            </button>
            <span className="wa-count" aria-live="polite">
              Task {Math.min(shown, TASKS)} of {TASKS}
            </span>
          </div>
        </>
      }
    >
      <p className="wa-tag">Scripted illustration: made-up tasks, a made-up tool and a fixed random table. Not a measurement of any real tool.</p>
      <div className="wa-cells" role="group" aria-label="How each of the 20 tasks ended. Select one to see its attempts.">
        {s.runs.map((r, i) => {
          const tone = TONE[r.outcome];
          return (
            <motion.button
              key={i}
              type="button"
              className={`wa-cell is-${tone}${i === sel ? ' is-sel' : ''}`}
              aria-pressed={i === sel}
              aria-label={`Task ${i + 1}: ${OUTCOME_LABEL[r.outcome]}`}
              onClick={() => setSel(i)}
              initial={false}
              animate={{ opacity: i < shown ? 1 : 0.25 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <small>{i + 1}</small>
              <b aria-hidden="true">{SYMBOL[r.outcome]}</b>
              <span>{SHORT[r.outcome]}</span>
            </motion.button>
          );
        })}
      </div>
      <ul className="wa-legend wa-legend-grid" aria-label="What the symbols mean">
        {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
          <li key={o}>
            <span className="wa-chip" style={{ borderColor: COLOR[TONE[o]] }}>{SYMBOL[o]}</span> {LEGEND[o]}: <b>{c[o]}</b>
          </li>
        ))}
      </ul>
      <div className="wa-turn" aria-live="polite">
        <p className="wa-turn-h">
          Task {sel + 1}: {OUTCOME_LABEL[run.outcome]}
        </p>
        <Timeline run={run} />
        <ol className="wa-steps">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
        <p className="wa-check is-note">{END_NOTE[run.outcome]}</p>
      </div>
      <ul className="wa-score" aria-label="Totals for this run">
        <li className={s.correct >= TASKS - 1 ? 'is-good' : 'is-bad'}>
          Done correctly: {s.correct} of {TASKS}
        </li>
        <li className={s.broken === 0 ? 'is-good' : 'is-bad'}>Crashed, looped or made up: {s.broken}</li>
        <li>Tool calls: {s.calls}</li>
        <li>Time (example): {s.seconds} s</li>
      </ul>
      <details className="wa-numbers">
        <summary>Open the numbers</summary>
        <p className="wa-note" style={{ marginTop: 0 }}>
          Every task makes up to four attempts. Each attempt fails if its number in a fixed random table is below {pct}%, so raising the rate can only turn successes into failures. A task's failures all have one kind (timeout, error reply or "too many requests"), also fixed in the table. Ignored: a timeout hangs the run ({HANG_SECONDS} s here), an error reply is used as if it were an answer, and "too many requests" is retried at once until the step limit of {LOOP_CALLS} calls. Handled: up to three retries after waits of {WAITS.join(', ')} s (doubling), then a cached backup if the task has one (about 60% do in this example), otherwise the agent says so and asks. Example timings: a timeout costs {SECONDS.timeout} s, an error reply {SECONDS.error} s, a throttled call {SECONDS.throttle} s, a good call {SECONDS.ok} s. Retries also load the tool: more calls, and in real systems a retry on something that changes the world (a payment, an email) must be safe to repeat, because a timeout does not prove the first call failed.
        </p>
      </details>
    </WhatIfFrame>
  );
}
