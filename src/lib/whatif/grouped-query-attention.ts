/**
 * What if every attention head keeps its own keys and values?
 * Memory for the KV cache as the number of key-value heads changes. Pure arithmetic from an example model shape.
 */

/** Example shape (an 8 billion parameter class model, 16-bit numbers). Not a specific product. */
export const exampleShape = { layers: 32, queryHeads: 32, headDim: 128, bytes: 2 } as const;
export type Shape = { layers: number; queryHeads: number; headDim: number; bytes: number };

/** Numbers of key-value heads that divide the 32 query heads evenly. */
export const kvHeadChoices = [1, 2, 4, 8, 16, 32] as const;
/** Choices offered when heads share keys and values (32 means no sharing). */
export const sharedChoices = [1, 2, 4, 8, 16] as const;

/** Example memory left over for caches after the weights, in GiB. */
export const FREE_GIB = 48;
export const contextChoices = [4096, 8192, 32768] as const;

const KIB = 1024;
const GIB = 1024 ** 3;

/** Bytes of cache for ONE token: keys and values (2), for every layer and every KV head. */
export function kvBytesPerToken(kvHeads: number, s: Shape = exampleShape): number {
  return 2 * s.layers * kvHeads * s.headDim * s.bytes;
}
export const kibPerToken = (kvHeads: number, s: Shape = exampleShape) => kvBytesPerToken(kvHeads, s) / KIB;

/** Bytes of cache for one conversation of this many tokens. */
export const bytesPerUser = (kvHeads: number, contextTokens: number, s: Shape = exampleShape) => kvBytesPerToken(kvHeads, s) * contextTokens;

/** How many full conversations fit in the free memory. */
export function usersThatFit(kvHeads: number, contextTokens: number, freeGiB = FREE_GIB, s: Shape = exampleShape): number {
  return Math.floor((freeGiB * GIB) / bytesPerUser(kvHeads, contextTokens, s));
}

export type Kind = 'multi-head' | 'grouped-query' | 'multi-query';
export function kind(kvHeads: number, queryHeads = exampleShape.queryHeads): Kind {
  if (kvHeads === queryHeads) return 'multi-head';
  if (kvHeads === 1) return 'multi-query';
  return 'grouped-query';
}

/** Which KV head a query head reads: neighbours share, in equal groups. */
export function groupOf(queryHead: number, kvHeads: number, queryHeads = exampleShape.queryHeads): number {
  return Math.floor(queryHead / (queryHeads / kvHeads));
}

/** Query heads per shared KV head. */
export const groupSize = (kvHeads: number, queryHeads = exampleShape.queryHeads) => queryHeads / kvHeads;
