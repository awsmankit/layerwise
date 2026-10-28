/// <reference lib="webworker" />
/**
 * Runs a lab's Python off the page's main thread, so a loop that never ends can be
 * stopped by terminating this worker. Pyodide is fetched only on the first run.
 * Messages in:  { type: 'run', id, source }
 * Messages out: { type: 'loading' } | { type: 'running', id } | { type: 'result', id, json, stdout } | { type: 'error', id, error, stdout }
 */

const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';

type Py = {
  globals: { get: (name: string) => () => unknown };
  runPythonAsync: (code: string, options?: { globals?: unknown }) => Promise<unknown>;
  setStdout: (o: { batched: (s: string) => void }) => void;
  setStderr: (o: { batched: (s: string) => void }) => void;
};

let pyodide: Py | null = null;
const ctx = self as unknown as DedicatedWorkerGlobalScope;

async function load(): Promise<Py> {
  if (pyodide) return pyodide;
  ctx.postMessage({ type: 'loading' });
  const mod = (await import(/* @vite-ignore */ `${PYODIDE}pyodide.mjs`)) as { loadPyodide: (o: { indexURL: string }) => Promise<Py> };
  pyodide = await mod.loadPyodide({ indexURL: PYODIDE });
  return pyodide;
}

ctx.onmessage = async (e: MessageEvent<{ type: 'run'; id: number; source: string }>) => {
  if (e.data.type !== 'run') return;
  const { id, source } = e.data;
  const lines: string[] = [];
  try {
    const py = await load();
    py.setStdout({ batched: (s) => lines.push(s) });
    py.setStderr({ batched: (s) => lines.push(s) });
    // a fresh namespace for every run, so nothing carries over from the last one
    const globals = py.globals.get('dict')();
    ctx.postMessage({ type: 'running', id });
    const json = await py.runPythonAsync(source, { globals });
    ctx.postMessage({ type: 'result', id, json: String(json), stdout: lines.join('\n') });
  } catch (err) {
    ctx.postMessage({ type: 'error', id, error: String((err as Error)?.message ?? err), stdout: lines.join('\n') });
  }
};
