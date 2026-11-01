/**
 * A toy constrained-decoding engine for the "structured output in depth" lesson.
 *
 * Everything here is an illustration, not a real model:
 *  - the "model" is a table of invented next-token probabilities, one table per position in the output;
 *  - the vocabulary is a few dozen tokens (a real one has about 100,000);
 *  - the schema language is small enough to list every valid string, so a "grammar mask" can be computed
 *    by asking "is text + token still the start of some valid string?". Real engines compile the schema
 *    into an automaton instead of listing strings, but the question they answer at each step is the same.
 */

export type Mode = 'none' | 'json' | 'schema';
export const MODES: Mode[] = ['none', 'json', 'schema'];
export const END = '<end>';

export const CATEGORIES = ['billing', 'bug', 'question'] as const;
export const URGENCIES = [1, 2, 3, 4, 5] as const;

/** The schema the toy grammar stands for, as it would be sent to an API (shown to the reader). */
export const SCHEMA_TEXT = `{
  "type": "object",
  "properties": {
    "category": { "enum": ["billing", "bug", "question"] },
    "urgency":  { "enum": [1, 2, 3, 4, 5] }
  },
  "required": ["category", "urgency"],
  "additionalProperties": false
}`;

/** Every string the schema accepts, in the one spacing this toy grammar allows. */
export const VALID_STRINGS: string[] = CATEGORIES.flatMap((c) => URGENCIES.map((u) => `{"category": "${c}", "urgency": ${u}}`));

/* ---------------------------------------------------------------- the scripted "model" */

type Slot = 'START' | 'KEY1' | 'AFTER_KEY1' | 'CATVAL' | 'ING' | 'CLOSE' | 'KEY2' | 'AFTER_KEY2' | 'SPACE' | 'URG' | 'AFTER_URG' | 'END' | 'OFF';

/** Invented probabilities in per cent. Each slot sums to 100. Tokens not listed have probability 0 in this toy. */
const TABLE: Record<Slot, Record<string, number>> = {
  START: { '{"': 70, '```json': 14, Sure: 8, Here: 5, The: 3 },
  KEY1: { category: 70, type: 15, label: 10, urgency: 5 },
  AFTER_KEY1: { '": "': 92, '"}': 8 },
  CATVAL: { bill: 30, Bill: 22, bug: 20, question: 14, Bug: 8, refund: 6 },
  ING: { ing: 80, s: 12, ed: 8 },
  CLOSE: { '", "': 88, '"}': 12 },
  KEY2: { urgency: 75, priority: 20, severity: 5 },
  AFTER_KEY2: { '": ': 90, '":': 10 },
  SPACE: { ' ': 100 },
  URG: { '3': 30, '4': 22, '2': 18, '5': 10, '1': 8, high: 7, '6': 3, '10': 2 },
  AFTER_URG: { '}': 92, '.': 8 },
  END: { [END]: 85, '\n': 10, '```': 5 },
  OFF: { [END]: 60, '\n': 25, '.': 15 },
};

/** Which table applies after this exact text. */
export function slotFor(text: string): Slot {
  if (text === '') return 'START';
  if (text === '{"') return 'KEY1';
  if (/^\{"[a-z]+$/.test(text)) return 'AFTER_KEY1';
  if (/^\{"[a-z]+": "$/.test(text)) return 'CATVAL';
  if (/^\{"[a-z]+": "[A-Za-z]*(bill|Bill)$/.test(text)) return 'ING';
  if (/^\{"[a-z]+": "[A-Za-z]*$/.test(text)) return 'CLOSE';
  if (/^\{"[a-z]+": "[A-Za-z]*", "$/.test(text)) return 'KEY2';
  if (/^\{"[a-z]+": "[A-Za-z]*", "[a-z]+$/.test(text)) return 'AFTER_KEY2';
  if (/^\{"[a-z]+": "[A-Za-z]*", "[a-z]+":$/.test(text)) return 'SPACE';
  if (/^\{"[a-z]+": "[A-Za-z]*", "[a-z]+": $/.test(text)) return 'URG';
  if (/^\{"[a-z]+": "[A-Za-z]*", "[a-z]+": [0-9a-z]+$/.test(text)) return 'AFTER_URG';
  if (/^\{.*\}$/s.test(text)) return 'END';
  return 'OFF';
}

/* ---------------------------------------------------------------- the grammars */

/** Does text + the rest still lead to some string the schema accepts? */
export function isSchemaPrefix(text: string): boolean {
  return VALID_STRINGS.some((v) => v.startsWith(text));
}
export function isSchemaComplete(text: string): boolean {
  return VALID_STRINGS.includes(text);
}

/**
 * A character-level checker for "any flat JSON object": string keys, values that are strings, whole
 * numbers, true, false or null. Returns the state after reading the text, or null if it can no longer be JSON.
 */
function advance(state: string, ch: string): string | null {
  const ws = ch === ' ' || ch === '\n';
  switch (state) {
    case 'start':
      return ch === '{' ? 'open' : null;
    case 'open':
      if (ws) return 'open';
      if (ch === '"') return 'key';
      return ch === '}' ? 'done' : null;
    case 'key':
      if (ch === '"') return 'afterKey';
      if (ch === '\\') return 'keyEsc';
      return ch === '\n' ? null : 'key';
    case 'keyEsc':
      return 'key';
    case 'afterKey':
      if (ws) return 'afterKey';
      return ch === ':' ? 'colon' : null;
    case 'colon':
      if (ws) return 'colon';
      if (ch === '"') return 'str';
      if (ch === '-') return 'minus';
      if (/[0-9]/.test(ch)) return 'num';
      if (ch === 't') return 'lit:rue';
      if (ch === 'f') return 'lit:alse';
      if (ch === 'n') return 'lit:ull';
      return null;
    case 'str':
      if (ch === '"') return 'afterVal';
      if (ch === '\\') return 'strEsc';
      return ch === '\n' ? null : 'str';
    case 'strEsc':
      return 'str';
    case 'minus':
      return /[0-9]/.test(ch) ? 'num' : null;
    case 'num':
      if (/[0-9]/.test(ch)) return 'num';
      if (ws) return 'afterVal';
      if (ch === ',') return 'comma';
      return ch === '}' ? 'done' : null;
    case 'afterVal':
      if (ws) return 'afterVal';
      if (ch === ',') return 'comma';
      return ch === '}' ? 'done' : null;
    case 'comma':
      if (ws) return 'comma';
      return ch === '"' ? 'key' : null;
    case 'done':
      return null;
    default:
      if (state.startsWith('lit:')) {
        const rest = state.slice(4);
        if (rest[0] !== ch) return null;
        return rest.length === 1 ? 'afterVal' : `lit:${rest.slice(1)}`;
      }
      return null;
  }
}

function jsonState(text: string): string | null {
  let s: string | null = 'start';
  for (const ch of text) {
    s = advance(s, ch);
    if (s === null) return null;
  }
  return s;
}
export const isJsonPrefix = (text: string) => jsonState(text) !== null;
export const isJsonComplete = (text: string) => jsonState(text) === 'done';

export function isPrefixFor(mode: Mode, text: string): boolean {
  if (mode === 'none') return true;
  return mode === 'json' ? isJsonPrefix(text) : isSchemaPrefix(text);
}
export function isCompleteFor(mode: Mode, text: string): boolean {
  if (mode === 'none') return true;
  return mode === 'json' ? isJsonComplete(text) : isSchemaComplete(text);
}

/* ---------------------------------------------------------------- one decoding step */

export type Candidate = {
  token: string;
  /** The model's own probability, 0 to 1. */
  raw: number;
  /** May this token be chosen under the current mode? */
  allowed: boolean;
  /** Probability after blocked tokens are removed and the rest are rescaled to add up to 1. */
  after: number;
};

export type Step = {
  candidates: Candidate[];
  /** Probability the model put on tokens the mask removes. */
  blocked: number;
};

/** The model's candidates after `text`, with the mask for `mode` applied. */
export function nextStep(text: string, mode: Mode): Step {
  const row = TABLE[slotFor(text)];
  const entries = Object.entries(row).map(([token, pct]) => {
    const allowed = mode === 'none' || (token === END ? isCompleteFor(mode, text) : isPrefixFor(mode, text + token));
    return { token, raw: pct / 100, allowed };
  });
  const kept = entries.filter((e) => e.allowed).reduce((a, e) => a + e.raw, 0);
  const candidates = entries
    .map((e) => ({ ...e, after: e.allowed && kept > 0 ? e.raw / kept : 0 }))
    .sort((a, b) => b.raw - a.raw);
  return { candidates, blocked: mode === 'none' ? 0 : 1 - kept };
}

/* ---------------------------------------------------------------- judging a finished output */

export type Verdict = { parses: boolean; schemaOk: boolean; reason: string };

export function judge(text: string): Verdict {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { parses: false, schemaOk: false, reason: 'It does not parse as JSON.' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { parses: true, schemaOk: false, reason: 'It is JSON, but not an object.' };
  }
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o);
  const extra = keys.filter((k) => k !== 'category' && k !== 'urgency');
  if (extra.length > 0) return { parses: true, schemaOk: false, reason: `It parses, but the key "${extra[0]}" is not in the schema.` };
  if (!('category' in o) || !('urgency' in o)) {
    const missing = 'category' in o ? 'urgency' : 'category';
    return { parses: true, schemaOk: false, reason: `It parses, but the required key "${missing}" is missing.` };
  }
  if (!(CATEGORIES as readonly unknown[]).includes(o.category)) {
    return { parses: true, schemaOk: false, reason: `It parses, but ${JSON.stringify(o.category)} is not one of the allowed categories.` };
  }
  if (!(URGENCIES as readonly unknown[]).includes(o.urgency)) {
    return { parses: true, schemaOk: false, reason: `It parses, but ${JSON.stringify(o.urgency)} is not an allowed urgency (1 to 5).` };
  }
  return { parses: true, schemaOk: true, reason: 'It parses and matches the schema.' };
}

/* ---------------------------------------------------------------- whole runs (seeded, for the summary table) */

/** A small seeded random number generator (mulberry32), so the page shows the same numbers every time. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Choose one candidate at random in proportion to its probability after the mask. */
export function sample(step: Step, r: number): string {
  let acc = 0;
  let last = '';
  for (const c of step.candidates) {
    if (c.after <= 0) continue;
    acc += c.after;
    last = c.token;
    if (r < acc) return c.token;
  }
  return last;
}

export type Stop = 'end' | 'max_tokens';

export type Run = { tokens: string[]; text: string; stop: Stop };

/**
 * Decode until the model emits the end token or `maxTokens` tokens have been written.
 * If the budget runs out when the text is already complete, that counts as finished.
 */
export function run(mode: Mode, maxTokens: number, next: () => number): Run {
  const tokens: string[] = [];
  let text = '';
  while (tokens.length < maxTokens) {
    const tok = sample(nextStep(text, mode), next());
    if (tok === '') break;
    if (tok === END) return { tokens, text, stop: 'end' };
    tokens.push(tok);
    text += tok;
  }
  const finished = mode === 'schema' ? isSchemaComplete(text) : isJsonComplete(text);
  return { tokens, text, stop: finished ? 'end' : 'max_tokens' };
}

export type Tally = { runs: number; parses: number; schemaOk: number; truncated: number };

export function tally(mode: Mode, maxTokens: number, runs: number, seed: number): Tally {
  const next = rng(seed);
  const t: Tally = { runs, parses: 0, schemaOk: 0, truncated: 0 };
  for (let i = 0; i < runs; i++) {
    const r = run(mode, maxTokens, next);
    if (r.stop === 'max_tokens') t.truncated++;
    const v = judge(r.text);
    if (v.parses) t.parses++;
    if (v.schemaOk) t.schemaOk++;
  }
  return t;
}

/** Spaces are shown as a middle dot so that tokens with leading or trailing spaces can be told apart. */
export const showToken = (t: string) => (t === END ? '<end>' : t === '\n' ? '\\n' : t.replace(/ /g, '·'));
