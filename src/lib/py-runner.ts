/**
 * One shared Python worker for every "Run it" pad on a page. It is the same worker file the
 * practice labs use (components/ui/lab.worker.ts), started the first time any pad runs, so
 * the 10 MB Python runtime is downloaded and started once, not once per pad.
 * Runs go one at a time. A run that lasts longer than LIMIT_MS is stopped by ending the
 * worker, so a loop that never finishes cannot freeze the page.
 */
export type PyResult = { ok: true; stdout: string } | { ok: false; error: string; stdout: string; stopped?: 'timeout' | 'user' | 'load' };

export const LIMIT_MS = 8000;

let worker: Worker | null = null;
let seq = 0;
let queue: Promise<unknown> = Promise.resolve();
let abort: ((r: PyResult) => void) | null = null;

function end() {
  worker?.terminate();
  worker = null;
}

function once(source: string, onPhase?: (p: 'loading' | 'running') => void): Promise<PyResult> {
  return new Promise<PyResult>((resolve) => {
    const id = ++seq;
    let timer: number | undefined;
    const finish = (r: PyResult) => {
      window.clearTimeout(timer);
      abort = null;
      resolve(r);
    };
    abort = (r) => {
      end();
      finish(r);
    };
    if (!worker) {
      worker = new Worker(new URL('../components/ui/lab.worker.ts', import.meta.url), { type: 'module' });
      worker.onerror = () => {
        end();
        finish({ ok: false, error: 'Python could not load. Check your connection and try again.', stdout: '', stopped: 'load' });
      };
    }
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; id?: number; stdout?: string; error?: string };
      if (m.type === 'loading') return onPhase?.('loading');
      if (m.id !== id) return;
      if (m.type === 'running') {
        onPhase?.('running');
        timer = window.setTimeout(() => {
          end();
          finish({ ok: false, error: 'Your code ran for more than 8 seconds. Check for a loop that never ends.', stdout: '', stopped: 'timeout' });
        }, LIMIT_MS);
      } else if (m.type === 'result') finish({ ok: true, stdout: m.stdout ?? '' });
      else if (m.type === 'error') finish({ ok: false, error: m.error ?? 'Unknown error', stdout: m.stdout ?? '' });
    };
    worker.postMessage({ type: 'run', id, source });
  });
}

/** Run Python source in a fresh namespace. Never rejects: failures come back as `ok: false`. */
export function runPython(source: string, onPhase?: (p: 'loading' | 'running') => void): Promise<PyResult> {
  const next = queue.then(() => once(source, onPhase));
  queue = next.catch(() => undefined);
  return next;
}

/** Stop whatever is running. The next run starts a fresh worker. */
export function stopPython() {
  abort?.({ ok: false, error: 'Stopped.', stdout: '', stopped: 'user' });
}
