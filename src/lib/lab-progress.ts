/** Small pure helpers for the practice labs, kept apart from the React components so they can be tested. */

export type LabCheck = { name: string; ok: boolean; why: string };

/** Where a learner's code for one lab is autosaved. */
export const labCodeKey = (id: string) => `layerwise:lab-code:${id}`;

/** The list of finished lab ids with `id` added once. Returns the same array when it is already there. */
export function withLabDone(done: string[], id: string): string[] {
  return done.includes(id) ? done : [...done, id];
}

/** The lab after `id` in a list, or null for the last one or an unknown id. */
export function nextLab<T extends { id: string }>(list: T[], id: string): T | null {
  const i = list.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < list.length ? list[i + 1] : null;
}

export function prevLab<T extends { id: string }>(list: T[], id: string): T | null {
  const i = list.findIndex((l) => l.id === id);
  return i > 0 ? list[i - 1] : null;
}

/** "3 of 6 checks pass", or "All 6 checks pass". */
export function summarise(results: LabCheck[]): string {
  const ok = results.filter((r) => r.ok).length;
  if (results.length > 0 && ok === results.length) return `All ${ok} ${ok === 1 ? 'check passes' : 'checks pass'}`;
  return `${ok} of ${results.length} ${results.length === 1 ? 'check passes' : 'checks pass'}`;
}

/** Keep printed output from filling the page: at most `lines` lines, with a note when cut. */
export function clipOutput(text: string, lines = 40): string {
  const all = text.split('\n');
  return all.length <= lines ? text : all.slice(0, lines).join('\n') + `\n… ${all.length - lines} more lines`;
}

/** The last few lines of a Python traceback, which is the part that says what went wrong. */
export function tracebackTail(error: string, lines = 6): string {
  return error.trim().split('\n').slice(-lines).join('\n');
}
