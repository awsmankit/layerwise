import { useEffect, useRef, useState } from 'react';
import { Root } from './shared';
import { runPython, stopPython } from '../../lib/py-runner';
import { parsePyError, type PyProblem } from '../../lib/py-errors';
import { PY_STEPS } from '../../lib/spam-code';

type Props = {
  /** The Python the learner sees and can change. */
  code: string;
  title?: string;
  /** Names from PY_STEPS whose code runs first. Shown, read-only, under "Code from earlier steps". */
  setup?: string[];
  /** If set, the learner is asked to type what they think the code prints before running it. */
  predict?: string;
  rows?: number;
};

const norm = (s: string) => s.trim().replace(/\s+/g, ' ');

/**
 * A small "Run it" pad: editable Python that runs in the browser through the shared worker
 * the practice labs use. Each run starts with a fresh, empty namespace.
 */
export default function RunIt({ code: start, title, setup = [], predict, rows }: Props) {
  const [code, setCode] = useState(start);
  const [out, setOut] = useState<string | null>(null);
  const [problem, setProblem] = useState<PyProblem | null>(null);
  const [notice, setNotice] = useState('');
  const [phase, setPhase] = useState<'idle' | 'loading' | 'running'>('idle');
  const [guess, setGuess] = useState('');
  const [trapTab, setTrapTab] = useState(true);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const setupCode = setup.map((k) => PY_STEPS[k] ?? '').join('\n');
  const offset = setupCode ? setupCode.split('\n').length : 0;

  const run = async () => {
    if (phase !== 'idle') return;
    setPhase('loading');
    setProblem(null);
    setNotice('');
    setOut(null);
    const r = await runPython(setupCode ? `${setupCode}\n${code}\n` : `${code}\n`, (p) => alive.current && setPhase(p));
    if (!alive.current) return;
    setPhase('idle');
    if (r.ok) setOut(r.stdout);
    else {
      setOut(r.stdout);
      if (r.stopped) setNotice(r.error);
      else setProblem(parsePyError(r.error, offset));
    }
  };

  const reset = () => {
    setCode(start);
    setOut(null);
    setProblem(null);
    setNotice('');
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void run();
    } else if (e.key === 'Escape') setTrapTab(false);
    else if (e.key === 'Tab' && !e.shiftKey && trapTab) {
      e.preventDefault();
      const t = e.currentTarget;
      const { selectionStart: a, selectionEnd: b } = t;
      setCode(code.slice(0, a) + '    ' + code.slice(b));
      requestAnimationFrame(() => t.setSelectionRange(a + 4, a + 4));
    }
  };

  const lineCount = code.split('\n').length;
  const busy = phase !== 'idle';
  const printed = out !== null && out.trim() !== '' ? out : null;
  const compared = predict && out !== null && !problem && guess.trim() !== '';

  return (
    <Root>
      <div className="viz sk-pad">
        {title && <p className="viz-title">{title}</p>}

        {setupCode && (
          <details className="sk-setup">
            <summary>Code from earlier steps (runs first)</summary>
            <pre tabIndex={0}>{setupCode}</pre>
          </details>
        )}

        {predict && (
          <label className="sk-guess">
            <span>{predict}</span>
            <input type="text" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Your guess" autoComplete="off" autoCapitalize="off" spellCheck={false} />
          </label>
        )}

        <label className="sk-code">
          <span className="sr-only">Python code{title ? `: ${title}` : ''}</span>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => setTrapTab(true)}
            rows={rows ?? Math.min(18, Math.max(3, lineCount + 1))}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </label>

        <div className="sk-actions">
          <button type="button" className="btn" onClick={run} disabled={busy}>
            {phase === 'loading' ? 'Loading Python…' : phase === 'running' ? 'Running…' : 'Run it'}
          </button>
          {busy && (
            <button type="button" className="btn quiet" onClick={() => stopPython()}>
              Stop
            </button>
          )}
          <button type="button" className="btn quiet" onClick={reset} disabled={busy || code === start}>
            Reset
          </button>
        </div>
        {phase === 'loading' && <p className="sk-note">Python loads the first time only: about 10 MB, then your browser keeps it.</p>}

        <div className="sk-result" aria-live="polite" role="status">
          {notice && <p className="sk-bad">{notice}</p>}
          {printed && <pre className="sk-out" aria-label="What your code printed">{printed}</pre>}
          {out !== null && !problem && !notice && !printed && <p className="sk-note">It ran, and printed nothing. Add a print line to see a value.</p>}
          {problem && (
            <div className="sk-err">
              <p>
                <b>Python stopped{problem.line ? ` on line ${problem.line}` : ''}.</b> It says:
              </p>
              <pre className="sk-out">{problem.kind}{problem.message ? `: ${problem.message}` : ''}</pre>
              <p>{problem.explain}</p>
            </div>
          )}
          {compared && (
            <p className="sk-compare">
              You guessed <code>{guess.trim()}</code>. Python printed <code>{norm(out ?? '')}</code>.{' '}
              <b>{norm(guess) === norm(out ?? '') ? 'Same.' : 'Different, so read the code once more to see why.'}</b>
            </p>
          )}
        </div>
        <p className="sk-note sk-hint">Tab adds four spaces; press Escape, then Tab, to move on. Ctrl or Cmd + Enter runs it. Each run starts fresh.</p>
      </div>
    </Root>
  );
}
