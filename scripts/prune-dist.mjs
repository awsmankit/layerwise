#!/usr/bin/env node
/**
 * Runs after `astro build`. The ONNX Runtime bundle that Transformers.js pulls in emits a 27 MB "asyncify" WebAssembly
 * file that nothing on this site fetches: the real-model demo (src/lib/whatif/no-embeddings.worker.ts) points the
 * runtime at the plain WASM build and never uses WebGPU. Shipping it only makes the Pages upload slower, so it is removed.
 * If WebGPU support is ever added to that worker, delete this script's rule for it.
 */
import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

const dir = new URL('../dist/_astro/', import.meta.url).pathname;
let freed = 0;
for (const f of await readdir(dir).catch(() => [])) {
  if (/^ort-wasm-simd-threaded\.asyncify-.*\.wasm$/.test(f)) {
    freed += (await stat(join(dir, f))).size;
    await rm(join(dir, f));
    console.log(`pruned dist/_astro/${f}`);
  }
}
console.log(`prune-dist: freed ${(freed / 1048576).toFixed(1)} MB`);
