/**
 * "Run it with a real model" for the no-embeddings experiment. The pure part: given the vectors a real
 * sentence-embedding model produced for the same five help pages and five questions as the toy, score
 * and rank them, and compare with keyword search and the toy. Nothing here downloads or runs a model
 * (the worker does that), so every function can be tested with fixed example vectors.
 */
import { DOCS, QUERIES, rank, success, type Query } from './no-embeddings';

/** The model the opt-in panel downloads. Sizes are the real file sizes on the Hugging Face Hub. */
export const REAL_MODEL = {
  id: 'Xenova/all-MiniLM-L6-v2',
  /** The 8-bit quantised weights file that Transformers.js picks for dtype "q8". */
  weightsFile: 'onnx/model_quantized.onnx',
  weightsBytes: 22_972_370,
  /** tokenizer.json 711,661 + config.json 650 + tokenizer_config.json 366 + special_tokens_map.json 125 */
  otherBytes: 712_802,
  dims: 384,
  host: 'huggingface.co',
} as const;

/** Total download from Hugging Face, in bytes (weights plus tokenizer and settings files). */
export const REAL_DOWNLOAD_BYTES = REAL_MODEL.weightsBytes + REAL_MODEL.otherBytes;

/** "23.7 MB" style size (decimal megabytes, the way download sizes are usually quoted). */
export function formatMB(bytes: number, digits = 1): string {
  return `${(bytes / 1_000_000).toFixed(digits)} MB`;
}

/** The texts sent to the model, in a fixed order: the five pages, then the five questions. */
export function textsToEmbed(): string[] {
  return [...DOCS.map((d) => d.text), ...QUERIES.map((q) => q.text)];
}

export type RealVectors = { docs: number[][]; queries: number[][] };

/** Split the model's output (one vector per text, in `textsToEmbed` order) back into pages and questions. */
export function splitVectors(all: number[][]): RealVectors {
  if (all.length !== DOCS.length + QUERIES.length) throw new Error(`Expected ${DOCS.length + QUERIES.length} vectors, got ${all.length}`);
  const dims = all[0]?.length ?? 0;
  if (dims === 0 || all.some((v) => v.length !== dims || v.some((x) => !Number.isFinite(x)))) throw new Error('The model returned vectors of different sizes or with invalid numbers');
  return { docs: all.slice(0, DOCS.length), queries: all.slice(DOCS.length) };
}

/** Length of a vector. */
export function norm(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

/** Scale a vector to length 1. A vector of zeros stays zeros (it has no direction). */
export function normalise(v: number[]): number[] {
  const n = norm(v);
  return n === 0 ? v.map(() => 0) : v.map((x) => x / n);
}

/** Cosine similarity of two vectors of any length: normalise both, then take the dot product. Between -1 and 1. */
export function cosineReal(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors must have the same length');
  const na = normalise(a);
  const nb = normalise(b);
  return na.reduce((s, x, i) => s + x * nb[i], 0);
}

/** Short names for the five pages, for tables and sentences. */
export const SHORT_TITLE: Record<string, string> = {
  refunds: 'Refund policy',
  delivery: 'Delivery times',
  password: 'Reset password',
  repairs: 'Repair service',
  hours: 'Opening hours',
};
export const shortTitle = (id: string): string => SHORT_TITLE[id] ?? id;

export type RealRow = { id: string; score: number };

/** Every page ranked by cosine with the question, best first. Ties keep the order of the pages. There is no cut-off: the best page is always first. */
export function realRank(query: number[], docs: number[][]): RealRow[] {
  return DOCS.map((d, i) => ({ id: d.id, score: cosineReal(query, docs[i]), i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ id, score }) => ({ id, score }));
}

export type QueryResult = {
  query: Query;
  /** real model, best first */
  rows: RealRow[];
  realTop: string;
  realOk: boolean;
  /** how far the right page's score is above (or below, if negative) the best wrong page's score */
  margin: number;
  /** toy vectors and keyword search, the way the figure above shows them */
  toyTop: string;
  toyOk: boolean;
  keywordTop: string | null;
  keywordOk: boolean;
};

export type Comparison = { results: QueryResult[]; realCount: number; toyCount: number; keywordCount: number };

/** Run every example question through the real vectors, the toy vectors and keyword search. */
export function compare(v: RealVectors): Comparison {
  const results = QUERIES.map((query, qi) => {
    const rows = realRank(v.queries[qi], v.docs);
    const right = rows.find((r) => r.id === query.answer)!.score;
    const bestWrong = Math.max(...rows.filter((r) => r.id !== query.answer).map((r) => r.score));
    const toy = rank(query.text, 'meaning');
    const kw = rank(query.text, 'keyword');
    return {
      query,
      rows,
      realTop: rows[0].id,
      realOk: rows[0].id === query.answer,
      margin: right - bestWrong,
      toyTop: toy[0].id,
      toyOk: success(query, 'meaning'),
      keywordTop: kw[0].hit ? kw[0].id : null,
      keywordOk: success(query, 'keyword'),
    };
  });
  return {
    results,
    realCount: results.filter((r) => r.realOk).length,
    toyCount: results.filter((r) => r.toyOk).length,
    keywordCount: results.filter((r) => r.keywordOk).length,
  };
}

/** One honest sentence, computed from the numbers. It names the misses and the cases where real and toy disagree. */
export function realVerdict(c: Comparison): string {
  const n = c.results.length;
  const title = shortTitle;
  let s = `The real model put the right page first for ${c.realCount} of ${n} questions. Keyword search got ${c.keywordCount} of ${n} and the toy vectors got ${c.toyCount} of ${n}.`;
  const missed = c.results.filter((r) => !r.realOk);
  if (missed.length > 0) {
    s += ` Real-model misses: ${missed.map((r) => `"${r.query.text}" (put "${title(r.realTop)}" first)`).join('; ')}.`;
  }
  const differ = c.results.filter((r) => r.realOk !== r.toyOk);
  if (differ.length > 0) {
    s += ` Real and toy disagree on: ${differ.map((r) => `"${r.query.text}" (${r.realOk ? 'real right, toy wrong' : 'toy right, real wrong'})`).join('; ')}.`;
  }
  return s;
}

export type ErrorKind = 'unsupported' | 'network' | 'memory' | 'other';

/** Turn a technical failure into a plain sentence for the reader. */
export function explainError(message: string, online: boolean, modelStored = false): { kind: ErrorKind; text: string } {
  const m = message.toLowerCase();
  if (/out of memory|allocation failed|array buffer allocation|invalid array length|memory access|oom|rangeerror|cannot allocate|webassembly\.memory/.test(m)) {
    return { kind: 'memory', text: 'This device ran out of memory while loading the model. Phones with little free memory often cannot run it. Closing other tabs and apps and trying again may help. The figure above works without it.' };
  }
  if (!online && modelStored) {
    return { kind: 'network', text: 'You look to be offline. The model is stored on this device, but the code that runs it could not be loaded. Open this page once while online and press the button; after that it works offline.' };
  }
  if (!online || /failed to fetch|networkerror|network error|load failed|could not locate|unable to load|not found|404|offline|err_internet|timed out|timeout/.test(m)) {
    return { kind: 'network', text: online ? 'The model files could not be downloaded. Check your connection, then press the button again. Files already downloaded are kept, so it will pick up from where it can.' : 'You look to be offline, and the model has not been downloaded on this device yet. Connect once, press the button, and after that it works offline.' };
  }
  if (/webassembly|wasm|worker|module|not supported|unsupported|cache storage|security/.test(m)) {
    return { kind: 'unsupported', text: 'This browser cannot run the model here (it needs WebAssembly and web workers). The figure above works without it.' };
  }
  return { kind: 'other', text: 'Something went wrong while running the model. The figure above still works. Try again, or reload the page.' };
}

/** Can this browser run the panel at all? Checked before the button is offered. */
export function supportsRealModel(env: { Worker?: unknown; WebAssembly?: unknown }): boolean {
  return typeof env.Worker === 'function' && typeof env.WebAssembly === 'object';
}

/** A readable progress line from the loaded and total bytes. */
export function progressText(loaded: number, total: number): string {
  if (total <= 0) return 'Starting the download';
  return `Downloaded ${formatMB(loaded)} of ${formatMB(total)} (${Math.min(100, Math.floor((loaded / total) * 100))}%)`;
}
