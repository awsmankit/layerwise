/**
 * What if the context window is too small? A short conversation arrives message by message. The window keeps the newest
 * messages that fit and drops the oldest. A question can be answered only if every message holding its answer is still inside.
 * Tokens are counted as words and punctuation marks, a simplification (real tokenizers differ). The conversation is invented.
 */

export type Message = { role: 'You' | 'Assistant'; text: string };

export const conversation: Message[] = [
  { role: 'You', text: 'Hi, my name is Priya and I am allergic to peanuts.' },
  { role: 'Assistant', text: 'Nice to meet you, Priya. I will keep the peanut allergy in mind.' },
  { role: 'You', text: 'I am planning a three day trip to Lisbon in May.' },
  { role: 'Assistant', text: 'Lisbon in May is warm. Do you want food, museums or beaches first?' },
  { role: 'You', text: 'Food first. My budget is 150 euros per day.' },
  { role: 'Assistant', text: 'Then start with a market lunch and small family restaurants.' },
  { role: 'You', text: 'Can you suggest a dinner place for day one?' },
  { role: 'Assistant', text: 'Try a small tavern in Alfama with grilled fish and vegetables.' },
];

/** Questions, and the (0-based) messages that hold the facts needed to answer them. */
export const questions: { q: string; needs: number[] }[] = [
  { q: 'What is the user’s name?', needs: [0] },
  { q: 'What are they allergic to?', needs: [0] },
  { q: 'Which city is the trip to?', needs: [2] },
  { q: 'What is the daily budget?', needs: [4] },
  { q: 'Is the dinner idea safe for them?', needs: [0, 7] },
];

/** Tokens in a text: each word and each punctuation mark counts as one. */
export function countTokens(text: string): number {
  return (text.match(/[A-Za-z0-9’']+|[^\sA-Za-z0-9’']/g) ?? []).length;
}

export const sizes: number[] = conversation.map((m) => countTokens(m.text));

export function totalTokens(upTo: number = conversation.length): number {
  return sizes.slice(0, upTo).reduce((a, b) => a + b, 0);
}

/**
 * Which of the first `arrived` messages are still inside a window of `window` tokens.
 * The window keeps the newest messages, going backwards until one does not fit. Everything older is dropped,
 * so the kept messages are always one unbroken run ending at the newest message.
 */
export function kept(arrived: number, window: number): boolean[] {
  const flags = Array.from({ length: conversation.length }, () => false);
  let used = 0;
  for (let i = arrived - 1; i >= 0; i--) {
    if (used + sizes[i] > window) break;
    used += sizes[i];
    flags[i] = true;
  }
  return flags;
}

export type Status = 'later' | 'ok' | 'lost';

/** Whether a question can be answered now: not yet told, still answerable, or its answer fell out of the window. */
export function status(needs: number[], arrived: number, window: number): Status {
  if (needs.some((n) => n >= arrived)) return 'later';
  const k = kept(arrived, window);
  return needs.every((n) => k[n]) ? 'ok' : 'lost';
}

export function tokensInWindow(arrived: number, window: number): number {
  const k = kept(arrived, window);
  return sizes.reduce((s, x, i) => s + (k[i] ? x : 0), 0);
}

/** The smallest window that keeps every message of the first `arrived`. */
export function windowToKeepAll(arrived: number): number {
  return totalTokens(arrived);
}
