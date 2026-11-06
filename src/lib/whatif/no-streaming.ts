/**
 * What if the answer is not streamed?
 *
 * A reply takes the same total time either way. Streaming sends tokens as they are made, so the screen
 * fills from the first token on. Without it the screen is blank until the last token is done.
 * Speeds and sizes are EXAMPLES, not measurements.
 */

export const example = {
  /** Tokens in the prompt the model must read before it can answer (the question plus instructions and context). */
  promptTokens: 3000,
  /** Example prefill speed in tokens per second. */
  prefillTokS: 6000,
  /** Example fixed delay for the network and the queue, in seconds. */
  overheadS: 0.2,
  /** A common rule of thumb: about three quarters of a word per token in English. */
  wordsPerToken: 0.75,
} as const;

/** Seconds from pressing send to the first token: overhead plus reading the prompt (prefill). */
export const timeToFirstToken = (promptTokens: number = example.promptTokens) => example.overheadS + promptTokens / example.prefillTokS;

/** Seconds from pressing send to the last token. */
export const totalSeconds = (replyTokens: number, tokS: number, promptTokens: number = example.promptTokens) =>
  timeToFirstToken(promptTokens) + replyTokens / tokS;

/** Seconds the screen stays blank: the first token's time when streamed, the whole time when not. */
export const blankSeconds = (streamed: boolean, replyTokens: number, tokS: number, promptTokens: number = example.promptTokens) =>
  streamed ? timeToFirstToken(promptTokens) : totalSeconds(replyTokens, tokS, promptTokens);

/** How many times longer the blank wait is without streaming. */
export const blankRatio = (replyTokens: number, tokS: number) => totalSeconds(replyTokens, tokS) / timeToFirstToken();

/** Tokens the user can see t seconds after pressing send. */
export function tokensVisible(t: number, streamed: boolean, replyTokens: number, tokS: number): number {
  const first = timeToFirstToken();
  const total = totalSeconds(replyTokens, tokS);
  if (t >= total - 1e-9) return replyTokens;
  if (!streamed || t < first) return 0;
  return Math.min(replyTokens, Math.floor((t - first) * tokS + 1e-9));
}

export const wordsOf = (tokens: number) => Math.round(tokens * example.wordsPerToken);

/** Share of the reply on screen, 0 to 1. */
export const fractionVisible = (t: number, streamed: boolean, replyTokens: number, tokS: number) =>
  tokensVisible(t, streamed, replyTokens, tokS) / replyTokens;
