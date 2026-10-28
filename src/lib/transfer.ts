/**
 * Moving progress between browsers without a server. A snapshot of what this browser
 * stores is packed into a link's fragment (the part after #, which a browser never
 * sends to a server), and opening that link elsewhere offers to merge it in.
 */

export type Snapshot = Record<string, unknown>;

type QuizBest = Record<string, { score: number; total: number }>;
type GameRecord = { best?: number; plays?: number; stars?: number };

const toB64 = (bytes: Uint8Array) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** A compact code for a snapshot: gzip where the browser can, plain otherwise. */
export async function encodeSnapshot(data: Snapshot): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  if (typeof CompressionStream !== 'undefined') return 'g.' + toB64(await pipe(bytes, new CompressionStream('gzip')));
  return 'p.' + toB64(bytes);
}

/** Reads a code back. Throws if it is not one of ours. */
export async function decodeSnapshot(code: string): Promise<Snapshot> {
  const [kind, body] = [code.slice(0, 2), code.slice(2)];
  if (kind !== 'g.' && kind !== 'p.') throw new Error('unknown code');
  let bytes: Uint8Array = fromB64(body);
  if (kind === 'g.') bytes = await pipe(bytes, new DecompressionStream('gzip'));
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data !== 'object' || data.site !== 'Layerwise') throw new Error('not a Layerwise snapshot');
  return data as Snapshot;
}

const ratio = (q?: { score: number; total: number }) => (q && q.total ? q.score / q.total : -1);

/**
 * Combine what another browser knows with what this one knows, never losing either:
 * lessons done and labs done are joined, the better quiz score and the higher game score win, and
 * a single setting (path, last lesson, theme) is taken from here unless it is unset.
 */
export function mergeSnapshots(local: Snapshot, incoming: Snapshot): Snapshot {
  const out: Snapshot = {};
  const keys = new Set([...Object.keys(local), ...Object.keys(incoming)].filter((k) => k.startsWith('layerwise:')));
  for (const k of keys) {
    const a = local[k] ?? null;
    const b = incoming[k] ?? null;
    if (a === null) out[k] = b;
    else if (b === null) out[k] = a;
    else if ((k === 'layerwise:done' || k === 'layerwise:labs') && Array.isArray(a) && Array.isArray(b)) out[k] = [...new Set([...a, ...b])];
    else if (k === 'layerwise:quiz') {
      const merged: QuizBest = { ...(a as QuizBest) };
      for (const [id, q] of Object.entries(b as QuizBest)) if (ratio(q) > ratio(merged[id])) merged[id] = q;
      out[k] = merged;
    } else if (k === 'layerwise:games') {
      const merged: Record<string, GameRecord> = { ...(a as Record<string, GameRecord>) };
      for (const [id, g] of Object.entries(b as Record<string, GameRecord>)) {
        const m = merged[id] ?? {};
        merged[id] = { ...m, best: Math.max(m.best ?? 0, g.best ?? 0), plays: Math.max(m.plays ?? 0, g.plays ?? 0), ...(m.stars || g.stars ? { stars: Math.max(m.stars ?? 0, g.stars ?? 0) } : {}) };
      }
      out[k] = merged;
    } else out[k] = a;
  }
  return out;
}
