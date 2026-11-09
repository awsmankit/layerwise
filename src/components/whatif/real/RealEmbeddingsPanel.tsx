import { useEffect, useMemo, useRef, useState } from 'react';
import { DOCS, QUERIES, cosine, embed } from '../../../lib/whatif/no-embeddings';
import {
  REAL_DOWNLOAD_BYTES,
  REAL_MODEL,
  compare,
  explainError,
  formatMB,
  progressText,
  realVerdict,
  shortTitle,
  splitVectors,
  supportsRealModel,
  textsToEmbed,
  type Comparison,
} from '../../../lib/whatif/no-embeddings-real';

type State =
  | { s: 'idle' }
  | { s: 'running'; phase: 'download' | 'start' | 'embed'; loaded: number; total: number }
  | { s: 'done'; cmp: Comparison; ms: number }
  | { s: 'error'; text: string };

/** Where Transformers.js keeps the model file after the first download (the browser Cache API). */
const CACHE_NAME = 'transformers-cache';
const MODEL_URL = `https://${REAL_MODEL.host}/${REAL_MODEL.id}/resolve/main/${REAL_MODEL.weightsFile}`;

const title = shortTitle;

/**
 * Opt-in "real model" panel. Nothing here contacts anyone until the button is pressed: the worker (and the
 * Transformers.js code inside it) is created only on that click. `qi` is the question picked in the figure above.
 */
export default function RealEmbeddingsPanel({ qi }: { qi: number }) {
  const [state, setState] = useState<State>({ s: 'idle' });
  const [supported, setSupported] = useState(true);
  const [cached, setCached] = useState(false);
  // the page is server-rendered first; the button stays disabled until this island is live, so an early press is never lost
  const [ready, setReady] = useState(false);
  const worker = useRef<Worker | null>(null);
  const cachedRef = useRef(false);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setReady(true);
    setSupported(supportsRealModel({ Worker: typeof Worker === 'undefined' ? undefined : Worker, WebAssembly: typeof WebAssembly === 'undefined' ? undefined : WebAssembly }));
    // a local look at this browser's own storage; it makes no network request
    if (typeof caches !== 'undefined') {
      caches
        .has(CACHE_NAME)
        .then((has) => (has ? caches.open(CACHE_NAME).then((c) => c.match(MODEL_URL)) : undefined))
        .then((hit) => {
          cachedRef.current = !!hit;
          setCached(!!hit);
        })
        .catch(() => {});
    }
    return () => worker.current?.terminate();
  }, []);

  const stop = () => {
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = null;
    worker.current?.terminate();
    worker.current = null;
  };

  const start = () => {
    stop();
    setState({ s: 'running', phase: 'download', loaded: 0, total: 0 });
    let w: Worker;
    try {
      w = new Worker(new URL('../../../lib/whatif/no-embeddings.worker.ts', import.meta.url), { type: 'module' });
    } catch (e) {
      setState({ s: 'error', text: explainError(`worker ${String(e)}`, navigator.onLine, cachedRef.current).text });
      return;
    }
    worker.current = w;
    w.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'ready') {
        if (watchdog.current) clearTimeout(watchdog.current);
        watchdog.current = null;
      } else if (m.type === 'status') setState((p) => (p.s === 'running' ? { ...p, phase: m.phase } : p));
      else if (m.type === 'progress') setState((p) => (p.s === 'running' ? { ...p, loaded: m.loaded, total: m.total } : p));
      else if (m.type === 'result') {
        try {
          const cmp = compare(splitVectors(m.vectors));
          setState({ s: 'done', cmp, ms: m.ms });
          cachedRef.current = true;
          setCached(true);
        } catch (err) {
          setState({ s: 'error', text: explainError(String(err), navigator.onLine, cachedRef.current).text });
        }
        stop();
      } else if (m.type === 'error') {
        setState({ s: 'error', text: explainError(m.message, navigator.onLine, cachedRef.current).text });
        stop();
      }
    };
    w.onerror = (e) => {
      setState({ s: 'error', text: explainError(`worker ${e.message ?? ''}`, navigator.onLine, cachedRef.current).text });
      stop();
    };
    // the worker says "ready" as soon as its code has loaded; if it never does, say so instead of waiting forever
    watchdog.current = setTimeout(() => {
      setState({ s: 'error', text: explainError('worker module could not start', navigator.onLine, cachedRef.current).text });
      stop();
    }, 20000);
    w.postMessage({ type: 'run', texts: textsToEmbed() });
  };

  const cancel = () => {
    stop();
    setState({ s: 'idle' });
  };

  const sizeText = formatMB(REAL_DOWNLOAD_BYTES, 0);
  const running = state.s === 'running';

  let status = '';
  if (state.s === 'running') {
    status =
      state.phase === 'embed'
        ? 'Running the model on the ten sentences'
        : state.total > 0
          ? progressText(state.loaded, state.total)
          : cached
            ? 'Loading the model from this browser\'s storage'
            : 'Starting the download';
  } else if (state.s === 'done') status = `Done. The model ran on this device in ${state.ms} ms. Nothing you see here was sent anywhere.`;

  return (
    <section className="wr-real" aria-labelledby="wr-real-h">
      <h3 id="wr-real-h" className="wr-real-h">Run it with a real model</h3>
      <p className="wr-real-p">
        This downloads a small real embedding model ({REAL_MODEL.id}, about {sizeText}) from Hugging Face (huggingface.co and its download servers) once, only when you press the button. The model runs on your device, so nothing you type is sent anywhere, and it is stored in this browser so it works offline afterwards. Until you press it, nothing is requested from anyone but this site.
      </p>

      {!supported && <p className="wr-real-msg is-bad" role="alert">This browser cannot run the model (it needs WebAssembly and web workers). The figure above works without it.</p>}

      {supported && state.s !== 'done' && (
        <div className="wr-real-row">
          {!running && (
            <button type="button" className="btn" onClick={start} disabled={!ready}>
              {cached ? 'Run it with a real model (already downloaded)' : `Run it with a real model (downloads about ${sizeText} once)`}
            </button>
          )}
          {running && (
            <button type="button" className="btn quiet" onClick={cancel}>
              Cancel
            </button>
          )}
        </div>
      )}

      {running && (
        <div className="wr-real-prog">
          {state.total > 0 ? (
            <progress className="wr-prog" max={state.total} value={state.loaded} aria-label="Model download progress" />
          ) : (
            <progress className="wr-prog" aria-label="Model download progress" />
          )}
        </div>
      )}

      <p className="wr-real-status" role="status" aria-live="polite">{status}</p>
      {state.s === 'error' && <p className="wr-real-msg is-bad" role="alert">{state.text}</p>}

      {state.s === 'done' && <RealResults cmp={state.cmp} qi={qi} onClose={() => setState({ s: 'idle' })} />}
    </section>
  );
}

function RealResults({ cmp, qi, onClose }: { cmp: Comparison; qi: number; onClose: () => void }) {
  const r = cmp.results[qi];
  const q = QUERIES[qi];
  const toyVec = useMemo(() => embed(q.text), [q.text]);
  const toyScore = (id: string) => cosine(toyVec, embed(DOCS.find((d) => d.id === id)!.text));
  return (
    <div className="wr-real-out">
      <p className="wr-real-verdict">{realVerdict(cmp)}</p>

      <div className="wr-scroll">
        <table className="wr-table wr-real-table">
          <caption>Question: "{q.text}". Pages in the real model's order. Cosine: 1 is the same meaning, 0 unrelated.</caption>
          <thead>
            <tr>
              <th scope="col">page</th>
              <th scope="col">real cosine</th>
              <th scope="col">toy cosine</th>
            </tr>
          </thead>
          <tbody>
            {r.rows.map((row, i) => (
              <tr key={row.id}>
                <th scope="row">
                  {i + 1}. {title(row.id)}
                  {row.id === q.answer ? ' (the right page)' : ''}
                </th>
                <td>{row.score.toFixed(2)}</td>
                <td>{toyScore(row.id).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="wr-note">
        For this question the real model {r.realOk ? 'puts the right page first' : `puts "${title(r.realTop)}" first, not the right page`}; the gap between the right page and the best wrong page is {r.margin.toFixed(2)} in cosine. Real scores have no 0.5 cut-off here: the best page is always shown first.
      </p>

      <div className="wr-scroll">
        <table className="wr-table wr-real-table">
          <caption>All five questions: the page each method put first.</caption>
          <thead>
            <tr>
              <th scope="col">question</th>
              <th scope="col">keyword</th>
              <th scope="col">toy</th>
              <th scope="col">real model</th>
            </tr>
          </thead>
          <tbody>
            {cmp.results.map((x) => (
              <tr key={x.query.id} className={x.query.id === q.id ? 'is-now' : ''}>
                <th scope="row">"{x.query.text}"</th>
                <td>{x.keywordTop ? `${x.keywordOk ? 'right' : 'wrong'}: ${title(x.keywordTop)}` : 'none found'}</td>
                <td>{x.toyOk ? 'right' : `wrong: ${title(x.toyTop)}`}</td>
                <td>{x.realOk ? 'right' : `wrong: ${title(x.realTop)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="wr-note">
        Real results depend on the model and on the wording, and can also miss. Nothing here was tuned to look good: these are the numbers the model gave. Five questions is far too few to say how good any model is. This model is {REAL_MODEL.dims}-dimensional (each text becomes {REAL_MODEL.dims} numbers); the toy uses five.
      </p>
      <div className="wr-real-row">
        <button type="button" className="btn quiet" onClick={onClose}>Close the real-model results</button>
      </div>
    </div>
  );
}
