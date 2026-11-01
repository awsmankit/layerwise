/**
 * Logic for the "before and after" explorer in systems/ux-for-ai-features.
 *
 * One scripted feature (summarise a support ticket) and one scripted user. Every
 * number below is an EXAMPLE chosen for the lesson, not a measurement: the model
 * speed, the reading speed, the cost of checking a claim. The point is the
 * arithmetic of the trade-offs, which holds whatever your real numbers are.
 */

export type Cue = 'none' | 'footer' | 'flags' | 'flags-off';

export type UxConfig = {
  streaming: boolean;
  citations: boolean;
  cue: Cue;
  /** The summary can be edited in place, with undo. */
  editable: boolean;
};

export type Claim = { id: number; text: string; wrong: boolean; source: string };

/** The six claims in the scripted summary. Claim 5 is wrong: the ticket says the customer is on the Standard plan. */
export const CLAIMS: Claim[] = [
  { id: 1, text: 'Ordered a ceramic lamp (order 48213).', wrong: false, source: 'Ticket line 1: "my lamp, order 48213"' },
  { id: 2, text: 'It arrived on 12 March with a cracked base.', wrong: false, source: 'Ticket line 2: "arrived on the 12th, base cracked"' },
  { id: 3, text: 'Has written to support twice already.', wrong: false, source: 'Ticket line 4: "as I said in my last two emails"' },
  { id: 4, text: 'Wants a replacement, not a refund.', wrong: false, source: 'Ticket line 6: "please send another, I do not want my money back"' },
  { id: 5, text: 'On the Premium plan, so shipping is free.', wrong: true, source: 'Ticket signature: "Standard plan customer", so the claim has no support' },
  { id: 6, text: 'Replacement should ship by Friday.', wrong: false, source: 'Ticket line 7: "I need it by the weekend"' },
];

export const WRONG_ID = 5;

/** Claims the scripted user checks, by cue. With no useful cue the user spot-checks the first claim. */
export const FLAGGED: Record<Cue, number[]> = {
  none: [],
  footer: [],
  flags: [3, 5],
  'flags-off': [2, 3],
};

/** Example constants, all in seconds unless stated. */
export const EX = {
  /** Time to first token, as if the model were busy. */
  ttft: 1.8,
  /** Output tokens in the summary. */
  tokens: 160,
  /** Generation speed, tokens per second. */
  tps: 40,
  /** Words in the summary. */
  words: 120,
  /** Reading speed, words per second (240 words a minute). */
  wps: 4,
  /** Checking one claim against the ticket when the claim carries a citation. */
  checkWithCitation: 8,
  /** Checking one claim by searching the 400-word ticket by eye. */
  checkWithout: 30,
  /** Fixing a caught error by editing the sentence in place. */
  editFix: 10,
  /** Extra work if a wrong claim reaches the customer and is found later (a follow-up message and an apology). */
  lateExtra: 90,
};

export const DEFAULT_CONFIG: UxConfig = { streaming: false, citations: false, cue: 'none', editable: false };

export type UxResult = {
  /** Seconds until the whole summary exists. */
  generated: number;
  /** Seconds until the user has something to read. This is the perceived wait. */
  firstText: number;
  /** Seconds until the user has finished reading. */
  readDone: number;
  /** Claim ids the scripted user checks. */
  checked: number[];
  checkTime: number;
  caught: boolean;
  fixTime: number;
  /** Time at the desk until the summary is ready to use. */
  atDesk: number;
  shipped: boolean;
  /** Extra time if the shipped error is found later. */
  lateCost: number;
  /** Time at the desk plus rework if the error is found later. */
  total: number;
  trust: TrustKind;
};

export type TrustKind = 'caught' | 'blind' | 'false-reassurance';

export const TRUST_TEXT: Record<TrustKind, string> = {
  caught: 'Calibrated. The user checked the shaky claim and fixed it.',
  blind: 'Blind. Nothing told the user where to look, so a wrong claim went through.',
  'false-reassurance': 'Misplaced. The user checked what the flags pointed at, felt safe, and the wrong claim went through.',
};

/** Seconds from the click until the summary has fully streamed (or, without streaming, appeared). */
export function generationTime(): number {
  return EX.ttft + EX.tokens / EX.tps;
}

export function readTime(): number {
  return EX.words / EX.wps;
}

/** Claims the user can see `t` seconds after clicking. Streaming reveals them as tokens arrive. */
export function visibleClaims(streaming: boolean, t: number): number {
  const gen = generationTime();
  if (!streaming) return t >= gen ? CLAIMS.length : 0;
  const perClaim = EX.tokens / CLAIMS.length / EX.tps;
  const done = Math.floor((t - EX.ttft) / perClaim + 1e-9);
  return Math.max(0, Math.min(CLAIMS.length, done));
}

export function simulate(c: UxConfig): UxResult {
  const gen = generationTime();
  const read = readTime();
  const firstText = c.streaming ? EX.ttft : gen;
  const readDone = Math.max(gen, firstText + read);
  const checked = c.cue === 'flags' || c.cue === 'flags-off' ? FLAGGED[c.cue] : [1];
  const checkTime = checked.length * (c.citations ? EX.checkWithCitation : EX.checkWithout);
  const caught = checked.includes(WRONG_ID);
  const regenerate = firstText + read;
  const fixTime = caught ? (c.editable ? EX.editFix : regenerate) : 0;
  const atDesk = readDone + checkTime + fixTime;
  const shipped = !caught;
  const lateCost = shipped ? (c.editable ? EX.editFix : regenerate) + EX.lateExtra : 0;
  const trust: TrustKind = caught ? 'caught' : c.cue === 'flags-off' ? 'false-reassurance' : 'blind';
  return { generated: gen, firstText, readDone, checked, checkTime, caught, fixTime, atDesk, shipped, lateCost, total: atDesk + lateCost, trust };
}

/** Round to one decimal place for display. */
export function secs(n: number): string {
  return `${(Math.round(n * 10) / 10).toFixed(1)} s`;
}
