/**
 * What if an agent never manages its context? A 30-step agent run. At every step the agent writes a short
 * message and a tool returns a result, and both are appended to the context window. Without management
 * nothing is ever removed. With management, old tool results are cleared once the window is mostly full,
 * a short summary is kept, and the instructions stay pinned. All sizes are example figures, in tokens.
 */

export const STEPS = 30;
/** Example context window. Real windows differ by model. */
export const WINDOW = 32_000;
/** Example size of the system prompt and task, which hold the rules the agent must keep following. */
export const INSTRUCTIONS = 1_200;
/** Example size of the agent's own message at each step. */
export const MODEL_TOKENS = 150;
/** Example tool result sizes, repeating in this order (a search, a file, a short answer, a log, a page). */
export const RESULT_CYCLE = [1_200, 3_000, 800, 2_200, 1_600] as const;

/** Clear old results once the window is this full. */
export const TRIGGER = 0.75;
/** Keep this many of the newest results in full. */
export const KEEP_RESULTS = 3;
/** What a cleared result leaves behind: a short stub such as "(result cleared)". */
export const STUB = 25;
/** A running summary of what has been learned so far, kept once clearing starts. */
export const SUMMARY = 500;

export function resultSize(step: number): number {
  return RESULT_CYCLE[(step - 1) % RESULT_CYCLE.length];
}

export type Snapshot = {
  step: number;
  /** Tokens the run would hold if nothing were ever removed. */
  demanded: number;
  /** Tokens actually in the window after this step. */
  used: number;
  /** Tokens of the original instructions still in the window. */
  instructions: number;
  summary: number;
  /** Tool results in full, and the stubs left by cleared ones. */
  results: number;
  stubs: number;
  model: number;
  /** Oldest text that fell off the front of the window, in tokens. */
  cut: number;
  full: boolean;
  cleared: boolean;
};

/** Plays the run and records the window after every step. */
export function simulate(managed: boolean): Snapshot[] {
  const out: Snapshot[] = [];
  let demanded = INSTRUCTIONS;
  const results: number[] = []; // full size of each result, newest last
  let clearedCount = 0; // how many of the oldest results are stubs
  let summary = 0;

  for (let step = 1; step <= STEPS; step++) {
    const size = resultSize(step);
    demanded += MODEL_TOKENS + size;
    results.push(size);

    if (managed) {
      const nowUsed = () =>
        INSTRUCTIONS + summary + MODEL_TOKENS * step + clearedCount * STUB + results.slice(clearedCount).reduce((a, b) => a + b, 0);
      if (nowUsed() > TRIGGER * WINDOW) {
        clearedCount = Math.max(clearedCount, results.length - KEEP_RESULTS);
        summary = SUMMARY;
      }
      const stubs = clearedCount * STUB;
      const full = results.slice(clearedCount).reduce((a, b) => a + b, 0);
      const used = INSTRUCTIONS + summary + MODEL_TOKENS * step + stubs + full;
      out.push({ step, demanded, used, instructions: INSTRUCTIONS, summary, results: full, stubs, model: MODEL_TOKENS * step, cut: 0, full: used >= WINDOW, cleared: clearedCount > 0 });
    } else {
      // nothing removed: when the window is full the oldest text, which is the instructions, is cut off first
      const cut = Math.max(0, demanded - WINDOW);
      const instr = Math.max(0, INSTRUCTIONS - cut);
      const remaining = Math.min(demanded, WINDOW);
      const model = MODEL_TOKENS * step;
      const resTotal = demanded - INSTRUCTIONS - model;
      const cutAfterInstr = Math.max(0, cut - INSTRUCTIONS);
      out.push({
        step,
        demanded,
        used: remaining,
        instructions: instr,
        summary: 0,
        results: Math.max(0, resTotal - cutAfterInstr),
        stubs: 0,
        model,
        cut,
        full: demanded >= WINDOW,
        cleared: false,
      });
    }
  }
  return out;
}

/** First step at which the unmanaged run has more text than the window can hold, or null. */
export function firstFullStep(): number | null {
  const s = simulate(false).find((x) => x.demanded > WINDOW);
  return s ? s.step : null;
}

/** First step at which some of the instructions have been cut off, or null. */
export function firstInstructionLoss(managed = false): number | null {
  const s = simulate(managed).find((x) => x.instructions < INSTRUCTIONS);
  return s ? s.step : null;
}

/** First step at which the instructions are gone completely, or null. */
export function instructionsGoneAt(): number | null {
  const s = simulate(false).find((x) => x.instructions === 0);
  return s ? s.step : null;
}

/** The step at which the managed run first clears old results, or null. */
export function firstClearStep(): number | null {
  const s = simulate(true).find((x) => x.cleared);
  return s ? s.step : null;
}

export function peakUsed(managed: boolean): number {
  return Math.max(...simulate(managed).map((s) => s.used));
}

export function fmtTokens(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
