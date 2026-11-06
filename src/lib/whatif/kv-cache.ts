/**
 * What if there is no KV cache? Counts the work done to write a reply one token at a time.
 * Every figure comes from these functions, so the page and the tests agree.
 */

/** Token positions whose keys and values are computed at each step while the reply grows. */
export function positionsComputed(promptTokens: number, replyTokens: number, cache: boolean): number[] {
  const steps: number[] = [];
  for (let i = 0; i < replyTokens; i++) {
    const seen = promptTokens + i; // tokens already in the context before this step
    if (i === 0) steps.push(promptTokens); // the first step reads the whole prompt either way
    else steps.push(cache ? 1 : seen);
  }
  return steps;
}

/** Total key/value computations across the whole reply. */
export function totalComputed(promptTokens: number, replyTokens: number, cache: boolean): number {
  return positionsComputed(promptTokens, replyTokens, cache).reduce((a, b) => a + b, 0);
}

/** How many times more work the no-cache run does. */
export function slowdown(promptTokens: number, replyTokens: number): number {
  return totalComputed(promptTokens, replyTokens, false) / totalComputed(promptTokens, replyTokens, true);
}

/** An example model shape (layers, KV heads, head size, bytes per number). 8 billion parameter class, 16-bit numbers. */
export const exampleModel = { layers: 32, kvHeads: 8, headDim: 128, bytes: 2 } as const;

/** Bytes the cache holds for one token: keys and values (2), for every layer and KV head. */
export function cacheBytesPerToken(m: { layers: number; kvHeads: number; headDim: number; bytes: number } = exampleModel): number {
  return 2 * m.layers * m.kvHeads * m.headDim * m.bytes;
}

/** Cache size in MiB for a context of this many tokens. */
export function cacheMiB(contextTokens: number, m = exampleModel): number {
  return (contextTokens * cacheBytesPerToken(m)) / (1024 * 1024);
}
