import { useEffect, useMemo, useRef, useState } from 'react';
import { Root } from '../viz/shared';
import Confetti from './Confetti';
import { KEYS, useStore } from '../../lib/store';
import { withBase } from '../../lib/url';
import { program, type CheckResult } from '../../data/labs/types';
import { clipOutput, labCodeKey, summarise, tracebackTail, withLabDone } from '../../lib/lab-progress';

export type RunnerLab = { id: string; title: string; starter: string; solution: string; tests: string; hints: string[] };
type Next = { id: string; title: string } | null;

const LIMIT_MS = 8000;
const box: React.CSSProperties = { border: '1.5px solid color-mix(in srgb, var(--ink) 40%, transparent)', borderRadius: 14, background: 'var(--surface)' };

type Phase = 'idle' | 'loading' | 'running';

/**
 * The editor, the Run checks button and the results for one lab. Python runs in a
 * worker that is stopped after 8 seconds, so a loop that never ends cannot freeze the page.
 */
export default function LabRunner({ lab, next }: { lab: RunnerLab; next: Next }) {
  const [code, setCode] = useState(lab.starter);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [stdout, setStdout] = useState('');
  const [problem, setProblem] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [runs, setRuns] = useState(0);
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useStore<string[]>(KEYS.labs, []);
  const [trapTab, setTrapTab] = useState(true);

  const worker = useRef<Worker | null>(null);
  const seq = useRef(0);
  const timer = useRef<number | null>(null);
  const gutter = useRef<HTMLPreElement>(null);

  // restore this learner's code from last time
  useEffect(() => {
    try {
      const saved = localStorage.getItem(labCodeKey(lab.id));
      if (saved !== null) setCode(saved);
    } catch {
      /* storage blocked: start from the starter */
    }
    return () => {
      worker.current?.terminate();
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [lab.id]);

  const edit = (value: string) => {
    setCode(value);
    try {
      localStorage.setItem(labCodeKey(lab.id), value);
    } catch {
      /* ignore */
    }
  };

  const clearTimer = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const stop = (message?: string) => {
    clearTimer();
    worker.current?.terminate();
    worker.current = null;
    seq.current += 1; // ignore anything the old worker still sends
    setPhase('idle');
    if (message) setProblem(message);
  };

  const ensureWorker = () => {
    if (worker.current) return worker.current;
    const w = new Worker(new URL('./lab.worker.ts', import.meta.url), { type: 'module' });
    w.onerror = () => stop('Python could not load. Check your connection and try again.');
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; id?: number; json?: string; stdout?: string; error?: string };
      if (m.type === 'loading') return setPhase('loading');
      if (m.id !== seq.current) return;
      if (m.type === 'running') {
        setPhase('running');
        clearTimer();
        timer.current = window.setTimeout(() => stop('Your code ran for more than 8 seconds; check for a loop that never ends.'), LIMIT_MS);
      } else if (m.type === 'result') {
        clearTimer();
        setPhase('idle');
        const r = JSON.parse(m.json ?? '[]') as CheckResult[];
        setResults(r);
        setStdout(m.stdout ?? '');
        setRuns((n) => n + 1);
        if (r.length > 0 && r.every((c) => c.ok)) {
          setBurst((b) => b + 1);
          setDone((prev) => withLabDone(prev, lab.id));
        }
      } else if (m.type === 'error') {
        clearTimer();
        setPhase('idle');
        setStdout(m.stdout ?? '');
        setProblem('Your code stopped with an error before the checks could run:\n' + tracebackTail(m.error ?? ''));
        setRuns((n) => n + 1);
      }
    };
    worker.current = w;
    return w;
  };

  const run = () => {
    if (phase !== 'idle') return;
    setProblem('');
    setResults(null);
    setStdout('');
    seq.current += 1;
    setPhase('loading');
    ensureWorker().postMessage({ type: 'run', id: seq.current, source: program(code, lab.tests) + '\n_report()' });
  };

  const reset = () => {
    if (code !== lab.starter && !window.confirm('Put the starting code back? Your changes will be lost.')) return;
    edit(lab.starter);
    setResults(null);
    setProblem('');
  };

  const solution = () => {
    if (runs === 0 || showSolution) return;
    if (window.confirm('Show the solution? Try the hints first: you learn more from getting there yourself.')) setShowSolution(true);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    } else if (e.key === 'Escape') {
      setTrapTab(false); // the next Tab moves on to the next control
    } else if (e.key === 'Tab' && !e.shiftKey && trapTab) {
      e.preventDefault();
      const t = e.currentTarget;
      const { selectionStart: a, selectionEnd: b } = t;
      edit(code.slice(0, a) + '    ' + code.slice(b));
      requestAnimationFrame(() => t.setSelectionRange(a + 4, a + 4));
    }
  };

  const lines = useMemo(() => Array.from({ length: code.split('\n').length }, (_, i) => i + 1).join('\n'), [code]);
  const passed = results !== null && results.length > 0 && results.every((r) => r.ok);
  const wasDone = done.includes(lab.id);
  const busy = phase !== 'idle';

  return (
    <Root>
      <div className="viz" style={{ display: 'grid', gap: '0.9rem' }}>
        <Confetti burst={burst} />

        <div style={{ ...box, display: 'grid', gridTemplateColumns: 'auto 1fr', overflow: 'hidden', background: 'var(--surface)' }}>
          <pre
            ref={gutter}
            aria-hidden="true"
            style={{ margin: 0, padding: '0.8rem 0.6rem', textAlign: 'right', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.55, overflow: 'hidden', borderRight: '1px solid var(--line-soft)', userSelect: 'none' }}
          >
            {lines}
          </pre>
          <label>
            <span className="sr-only">Python code for {lab.title}</span>
            <textarea
              value={code}
              onChange={(e) => edit(e.target.value)}
              onKeyDown={onKey}
              onFocus={() => setTrapTab(true)}
              onScroll={(e) => {
                if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
              }}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              rows={Math.min(24, Math.max(10, code.split('\n').length + 1))}
              style={{ width: '100%', border: 0, outline: 'none', resize: 'vertical', padding: '0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.55, background: 'transparent', color: 'var(--ink)', whiteSpace: 'pre', overflowX: 'auto', tabSize: 4 }}
            />
          </label>
        </div>
        <p className="gm-note" style={{ margin: 0 }}>
          Tab inserts four spaces. To move on to the next control, press Escape, then Tab. Ctrl or Cmd + Enter runs the checks. Your code is saved in this browser.
        </p>

        <div className="gm-result-actions">
          <button type="button" className="btn" onClick={run} disabled={busy}>
            {phase === 'loading' ? 'Loading Python…' : phase === 'running' ? 'Running…' : 'Run checks'}
          </button>
          {busy && (
            <button type="button" className="btn quiet" onClick={() => stop()}>
              Stop
            </button>
          )}
          <button type="button" className="btn quiet" onClick={() => setHints((h) => Math.min(h + 1, lab.hints.length))} disabled={hints >= lab.hints.length}>
            {hints >= lab.hints.length ? 'No more hints' : `Hint (${lab.hints.length - hints} left)`}
          </button>
          <button type="button" className="btn quiet" onClick={solution} disabled={runs === 0 || showSolution} title={runs === 0 ? 'Run your code once first' : undefined}>
            Show solution
          </button>
          <button type="button" className="btn quiet" onClick={reset} disabled={busy}>
            Reset code
          </button>
        </div>
        {phase === 'loading' && <p className="gm-note" style={{ margin: 0 }}>Python loads the first time only: a one-off download of about 10 MB, then it is kept by your browser.</p>}

        {hints > 0 && (
          <ol style={{ ...box, margin: 0, padding: '0.8rem 1rem 0.8rem 2.2rem' }} aria-label="Hints">
            {lab.hints.slice(0, hints).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
        )}

        <div aria-live="polite" role="status">
          {problem && (
            <pre style={{ ...box, margin: 0, padding: '0.8rem 1rem', whiteSpace: 'pre-wrap', borderColor: 'var(--warn)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              <b>Problem. </b>
              {problem}
            </pre>
          )}
          {results && (
            <section style={{ ...box, padding: '0.9rem 1.1rem' }} aria-label="Check results">
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>
                {passed ? '✓ ' : ''}
                {summarise(results)}
              </h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.4rem' }}>
                {results.map((r, i) => (
                  <li key={i} style={{ display: 'grid', gridTemplateColumns: '5.2rem 1fr', gap: '0.6rem', alignItems: 'baseline' }}>
                    <b style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: r.ok ? 'var(--ok)' : 'var(--warn)' }}>{r.ok ? '✓ Pass' : '✕ Fail'}</b>
                    <span>
                      {r.name}
                      {!r.ok && r.why && <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ink-3)' }}>{r.why}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {passed && (
            <p className="gm-note" style={{ margin: '0.6rem 0 0' }}>
              <b>Lab done.</b> It now counts on <a href={withBase('/progress/')}>your progress</a>.{' '}
              {next ? <a href={withBase(`/practice/${next.id}/`)}>Next lab: {next.title}</a> : <a href={withBase('/practice/')}>Back to all labs</a>}
            </p>
          )}
          {!passed && wasDone && results === null && !problem && <p className="gm-note">You finished this lab before. You can run it again any time.</p>}
        </div>

        {stdout && (
          <section aria-label="Printed output">
            <h3 style={{ margin: '0 0 0.3rem', fontSize: '0.95rem' }}>What your code printed</h3>
            <pre style={{ ...box, margin: 0, padding: '0.8rem 1rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{clipOutput(stdout)}</pre>
          </section>
        )}

        {showSolution && (
          <section aria-label="Solution">
            <h3 style={{ margin: '0 0 0.3rem', fontSize: '0.95rem' }}>One solution</h3>
            <pre style={{ ...box, margin: 0, padding: '0.8rem 1rem', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{lab.solution}</pre>
            <p style={{ margin: '0.5rem 0 0' }}>
              <button type="button" className="btn quiet" onClick={() => edit(lab.solution)}>
                Put it in the editor
              </button>
            </p>
          </section>
        )}
      </div>
    </Root>
  );
}
