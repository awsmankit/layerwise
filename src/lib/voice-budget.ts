/*
 * Arithmetic for the "Voice agents" lesson: a latency waterfall for one agent reply, and an endpointing
 * toy that shows what a silence threshold does to scripted utterances. Pure functions, no DOM.
 *
 * Every stage time and every utterance below is an invented example for teaching. None of them is a
 * measurement of any product. The only numbers that come from outside are the human turn-gap figures
 * (Stivers et al., 2009: mean gap 208 ms across ten languages, slowest language mean 469 ms).
 */

/** Human reference points from Stivers et al. (2009, PNAS), in milliseconds. */
export const HUMAN_GAP = { mean: 208, slowestLanguageMean: 469 } as const;

export type Mode = 'cascade' | 'speech-to-speech';

export type BudgetConfig = {
  mode: Mode;
  /** Silence the system waits before it decides the user has finished (the endpointing wait). */
  endpointMs: number;
  /** Time to turn the final audio into a final transcript, after the last word (cascade only). */
  asrMs: number;
  /** Time from sending the prompt to the first token coming back (cascade only). */
  llmTtftMs: number;
  /** Tokens the language model must write before the first speakable chunk (cascade only). */
  clauseTokens: number;
  /** Tokens per second while the language model writes (cascade only). */
  tokensPerSecond: number;
  /** Time from receiving the first text chunk to the first audio sample (cascade only). */
  ttsMs: number;
  /** Time for a speech-to-speech model to produce its first audio once it has decided to answer. */
  modelFirstAudioMs: number;
  /** Network travel and the player's buffer, summed (both directions as they affect the reply). */
  networkMs: number;
  /** Extra delay from a phone line: carrier, transcoding, gateway. 0 for a browser or app. */
  phoneMs: number;
  /** Start the language model before the turn is confirmed (speculative / preemptive generation). */
  speculative: boolean;
  /** How much silence has to pass before the speculative run starts. */
  speculativeAfterMs: number;
};

export type Row = {
  id: string;
  label: string;
  /** Start in milliseconds after the user stopped speaking. */
  start: number;
  dur: number;
  kind: 'work' | 'wait' | 'net';
};

export type Timeline = {
  rows: Row[];
  /** When the user hears the first sound, in ms after they stopped speaking. */
  heardAt: number;
  /** Work done before the turn was confirmed that is thrown away if the user carries on speaking. */
  speculativeLeadMs: number;
};

/** Milliseconds to write the first speakable chunk. */
export const clauseMs = (tokens: number, tokensPerSecond: number): number => (tokensPerSecond > 0 ? (tokens / tokensPerSecond) * 1000 : 0);

export function timeline(c: BudgetConfig): Timeline {
  const rows: Row[] = [];
  const net = c.networkMs + c.phoneMs;
  const E = Math.max(0, c.endpointMs);

  if (c.mode === 'speech-to-speech') {
    const S = c.speculative ? Math.min(c.speculativeAfterMs, E) : E;
    rows.push({ id: 'endpoint', label: 'Wait to confirm the turn', start: 0, dur: E, kind: 'wait' });
    // The model may begin on the audio so far (as it streams), but it cannot speak before the turn is confirmed.
    const ready = S + c.modelFirstAudioMs;
    rows.push({ id: 'model', label: 'Speech model: first audio', start: S, dur: c.modelFirstAudioMs, kind: 'work' });
    const sendAt = Math.max(E, ready);
    if (sendAt > ready) rows.push({ id: 'hold', label: 'Held until the turn is confirmed', start: ready, dur: sendAt - ready, kind: 'wait' });
    rows.push({ id: 'net', label: net > 0 && c.phoneMs > 0 ? 'Network and phone line' : 'Network and playback buffer', start: sendAt, dur: net, kind: 'net' });
    return { rows, heardAt: sendAt + net, speculativeLeadMs: c.speculative ? Math.max(0, E - S) : 0 };
  }

  const S = c.speculative ? Math.min(c.speculativeAfterMs, E) : E;
  const clause = clauseMs(c.clauseTokens, c.tokensPerSecond);
  rows.push({ id: 'endpoint', label: 'Wait to confirm the turn', start: 0, dur: E, kind: 'wait' });
  let t = S;
  rows.push({ id: 'asr', label: 'Final transcript', start: t, dur: c.asrMs, kind: 'work' });
  t += c.asrMs;
  rows.push({ id: 'llm', label: 'Language model: first token', start: t, dur: c.llmTtftMs, kind: 'work' });
  t += c.llmTtftMs;
  rows.push({ id: 'clause', label: 'First clause written', start: t, dur: clause, kind: 'work' });
  t += clause;
  rows.push({ id: 'tts', label: 'Speech synthesis: first audio', start: t, dur: c.ttsMs, kind: 'work' });
  t += c.ttsMs;
  const sendAt = Math.max(E, t);
  if (sendAt > t) rows.push({ id: 'hold', label: 'Held until the turn is confirmed', start: t, dur: sendAt - t, kind: 'wait' });
  rows.push({ id: 'net', label: c.phoneMs > 0 ? 'Network and phone line' : 'Network and playback buffer', start: sendAt, dur: net, kind: 'net' });
  return { rows, heardAt: sendAt + net, speculativeLeadMs: c.speculative ? Math.max(0, E - S) : 0 };
}

/** The longest single stage (by duration) that is work or network, ignoring waiting. */
export function biggestStage(rows: Row[]): Row | null {
  const real = rows.filter((r) => r.kind !== 'wait' || r.id === 'endpoint');
  return real.reduce<Row | null>((best, r) => (best === null || r.dur > best.dur ? r : best), null);
}

export type Verdict = 'inside-range' | 'slower-than-all-means' | 'far-slower';

/**
 * Compare a response time with the human figures. "inside-range" means at or under the slowest
 * language mean in Stivers et al. (469 ms). "far-slower" means more than twice that figure.
 */
export function verdict(ms: number): Verdict {
  if (ms <= HUMAN_GAP.slowestLanguageMean) return 'inside-range';
  if (ms <= 2 * HUMAN_GAP.slowestLanguageMean) return 'slower-than-all-means';
  return 'far-slower';
}

/** How many times the mean human gap (208 ms) the response is, to one decimal place. */
export const timesHumanMean = (ms: number): number => Math.round((ms / HUMAN_GAP.mean) * 10) / 10;

/* ---------- presets (all example numbers) ---------- */

export const PRESETS: { id: string; label: string; note: string; cfg: BudgetConfig }[] = [
  {
    id: 'naive',
    label: 'Naive cascade',
    note: 'Wait for the whole transcript, then the whole reply, then speak.',
    cfg: { mode: 'cascade', endpointMs: 800, asrMs: 300, llmTtftMs: 900, clauseTokens: 20, tokensPerSecond: 60, ttsMs: 400, modelFirstAudioMs: 400, networkMs: 150, phoneMs: 0, speculative: false, speculativeAfterMs: 150 },
  },
  {
    id: 'tuned',
    label: 'Tuned cascade',
    note: 'Streaming at every stage, a small fast model, speak the first clause.',
    cfg: { mode: 'cascade', endpointMs: 400, asrMs: 100, llmTtftMs: 350, clauseTokens: 8, tokensPerSecond: 80, ttsMs: 150, modelFirstAudioMs: 400, networkMs: 100, phoneMs: 0, speculative: false, speculativeAfterMs: 150 },
  },
  {
    id: 'tuned-spec',
    label: 'Tuned, speculative',
    note: 'The same stages, but the language model starts before the turn is confirmed.',
    cfg: { mode: 'cascade', endpointMs: 400, asrMs: 100, llmTtftMs: 350, clauseTokens: 8, tokensPerSecond: 80, ttsMs: 150, modelFirstAudioMs: 400, networkMs: 100, phoneMs: 0, speculative: true, speculativeAfterMs: 150 },
  },
  {
    id: 's2s',
    label: 'Speech-to-speech',
    note: 'One model hears and speaks; no transcript in the middle.',
    cfg: { mode: 'speech-to-speech', endpointMs: 300, asrMs: 0, llmTtftMs: 0, clauseTokens: 0, tokensPerSecond: 60, ttsMs: 0, modelFirstAudioMs: 300, networkMs: 100, phoneMs: 0, speculative: false, speculativeAfterMs: 150 },
  },
  {
    id: 'phone',
    label: 'Tuned cascade on a phone call',
    note: 'The tuned cascade again, with a phone line in the path.',
    cfg: { mode: 'cascade', endpointMs: 400, asrMs: 100, llmTtftMs: 350, clauseTokens: 8, tokensPerSecond: 80, ttsMs: 150, modelFirstAudioMs: 400, networkMs: 100, phoneMs: 120, speculative: false, speculativeAfterMs: 150 },
  },
];

/* ---------- endpointing toy ---------- */

export type Segment = {
  /** What was said in this stretch of speech. */
  text: string;
  /** Speech duration, ms. */
  speechMs: number;
  /** Silence that follows this segment, ms. For the last segment, the silence until the user stops caring. */
  silenceMs: number;
  /** True if the words so far form a finished thought. Used only by the toy "semantic" mode. */
  finished: boolean;
};

export type Utterance = { id: string; label: string; segments: Segment[] };

/** Invented utterances with pauses of the kinds people really make. The timings are made up. */
export const UTTERANCES: Utterance[] = [
  { id: 'weather', label: 'Short question', segments: [{ text: 'What is the weather today?', speechMs: 1500, silenceMs: 3000, finished: true }] },
  {
    id: 'phone',
    label: 'Reading a phone number',
    segments: [
      { text: 'My number is oh seven seven', speechMs: 1600, silenceMs: 600, finished: false },
      { text: 'one two three', speechMs: 900, silenceMs: 700, finished: false },
      { text: 'four five six', speechMs: 900, silenceMs: 3000, finished: true },
    ],
  },
  {
    id: 'hesitate',
    label: 'Hesitating first',
    segments: [
      { text: 'Um', speechMs: 300, silenceMs: 900, finished: false },
      { text: 'I want to change my booking', speechMs: 1700, silenceMs: 3000, finished: true },
    ],
  },
  {
    id: 'table',
    label: 'A small pause mid-sentence',
    segments: [
      { text: 'Book a table for four', speechMs: 1400, silenceMs: 450, finished: false },
      { text: 'at eight o clock', speechMs: 1000, silenceMs: 3000, finished: true },
    ],
  },
  { id: 'yes', label: 'One word', segments: [{ text: 'Yes', speechMs: 350, silenceMs: 3000, finished: true }] },
  {
    id: 'order',
    label: 'Thinking aloud',
    segments: [
      { text: 'Can you check', speechMs: 800, silenceMs: 1100, finished: false },
      { text: 'the status of order four one seven two', speechMs: 2200, silenceMs: 3000, finished: true },
    ],
  },
];

/** Toy rule for the "meaning-aware" detector: an unfinished thought gets this long; a finished one answers quickly. */
export const SEMANTIC = { unfinishedWaitMs: 1500, finishedWaitMs: 200 } as const;

export type EndpointOutcome = {
  id: string;
  label: string;
  /** The agent started talking before the user had finished their thought. */
  cutOff: boolean;
  /** Index of the segment after which the agent decided the turn was over. */
  decidedAfter: number;
  /** Silence the agent waited at that point, ms. */
  waitedMs: number;
  /** For a correct decision, the delay the user feels from the endpointing wait alone. */
  addedDelayMs: number;
};

/**
 * Decide, for one utterance, where the agent thinks the turn ends. A silence-only detector answers at the
 * first silence at least `thresholdMs` long. The toy meaning-aware detector waits `unfinishedWaitMs` when
 * the words so far are unfinished and `finishedWaitMs` when they are finished, ignoring the threshold.
 */
export function endpoint(u: Utterance, thresholdMs: number, semantic: boolean): EndpointOutcome {
  for (let i = 0; i < u.segments.length; i++) {
    const s = u.segments[i];
    const need = semantic ? (s.finished ? SEMANTIC.finishedWaitMs : SEMANTIC.unfinishedWaitMs) : thresholdMs;
    if (s.silenceMs >= need) {
      const cutOff = !s.finished;
      return { id: u.id, label: u.label, cutOff, decidedAfter: i, waitedMs: need, addedDelayMs: cutOff ? 0 : need };
    }
  }
  // Never reached: the silence at the end is long enough in every scripted utterance, but stay total.
  const last = u.segments.length - 1;
  return { id: u.id, label: u.label, cutOff: false, decidedAfter: last, waitedMs: u.segments[last].silenceMs, addedDelayMs: u.segments[last].silenceMs };
}

export type EndpointSummary = { outcomes: EndpointOutcome[]; cutOffs: number; meanDelayMs: number };

/** Run all utterances. The mean delay is over the turns that were not cut off. */
export function endpointAll(thresholdMs: number, semantic: boolean): EndpointSummary {
  const outcomes = UTTERANCES.map((u) => endpoint(u, thresholdMs, semantic));
  const ok = outcomes.filter((o) => !o.cutOff);
  const meanDelayMs = ok.length ? Math.round(ok.reduce((a, o) => a + o.addedDelayMs, 0) / ok.length) : 0;
  return { outcomes, cutOffs: outcomes.length - ok.length, meanDelayMs };
}
