/// <reference lib="webworker" />
/**
 * Runs the real sentence-embedding model off the page's main thread, so the page never freezes.
 * Nothing in this file runs until the reader presses the opt-in button (the panel creates the worker then).
 *
 * Messages in:  { type: 'run', texts: string[] }
 * Messages out: { type: 'ready' } (the worker code loaded)
 *             | { type: 'status', phase: 'download' | 'start' | 'embed' }
 *             | { type: 'progress', loaded, total }
 *             | { type: 'result', vectors: number[][], ms: number, backend: 'wasm' }
 *             | { type: 'error', message }
 *
 * Privacy and offline: the ONNX Runtime files come from this site (imported with ?url, so the build copies
 * them next to the page); the only third-party request is the model download from Hugging Face. Transformers.js
 * stores those files in the browser Cache API ("transformers-cache"), which does not depend on the service worker.
 *
 * WebGPU is deliberately not used: it needs a second, 27 MB runtime build, and ten short sentences do not need it.
 */
import { env, pipeline } from '@huggingface/transformers';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import { REAL_MODEL } from './no-embeddings-real';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

// models: only from the Hub, and only the browser Cache API as storage
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.remoteHost = `https://${REAL_MODEL.host}/`;
env.useBrowserCache = true;
env.useWasmCache = true;

// runtime: same-origin files, never the default CDN. One thread, because a static host cannot send the
// headers that multi-threaded WebAssembly needs.
const abs = (u: string) => new URL(u, ctx.location.href).href;
const wasm = env.backends.onnx.wasm!;
wasm.wasmPaths = { mjs: abs(mjsUrl), wasm: abs(wasmUrl) } as unknown as string;
wasm.numThreads = 1;

ctx.postMessage({ type: 'ready' });

let extractor: Awaited<ReturnType<typeof load>> | null = null;

async function load() {
  return pipeline('feature-extraction', REAL_MODEL.id, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (e: { status: string; loaded?: number; total?: number }) => {
      if (e.status === 'progress_total') ctx.postMessage({ type: 'progress', loaded: e.loaded ?? 0, total: e.total ?? 0 });
    },
  });
}

ctx.onmessage = async (e: MessageEvent<{ type: 'run'; texts: string[] }>) => {
  if (e.data.type !== 'run') return;
  try {
    if (!extractor) {
      ctx.postMessage({ type: 'status', phase: 'download' });
      extractor = await load();
    }
    ctx.postMessage({ type: 'status', phase: 'embed' });
    const t0 = performance.now();
    const out = await extractor(e.data.texts, { pooling: 'mean', normalize: true });
    const vectors = out.tolist() as number[][];
    ctx.postMessage({ type: 'result', vectors, ms: Math.round(performance.now() - t0), backend: 'wasm' });
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? `${err.name}: ${err.message}` : String(err) });
  }
};
