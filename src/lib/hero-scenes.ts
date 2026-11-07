/**
 * The landing page's top figure changes every day. Each figure is a Scene: a title, one lesson to read next, a
 * caption that says what is real and what is an example, and exactly four stages drawn left to right.
 *
 * Every number a stage shows is computed in this file from a real formula (cosine similarity, gradient descent,
 * softmax, a convolution, the KV-cache counting rule, a naive-Bayes style log-odds sum) or from stated example rates,
 * so the picture and the tests cannot disagree. Anything that is only an illustration says "example" in its note or
 * its caption.
 */
import type { GlyphName } from '../components/viz/glyphs';
import { shuffled } from './daily-card';
import { PRESETS, convolve, type Grid } from './convolution';
import { cacheBytesPerToken, positionsComputed, slowdown, totalComputed } from './whatif/kv-cache';

/* ---------- the shapes of a scene ---------- */

export type Chip = { text: string; sub?: string };
export type Card = { glyph: GlyphName; title: string; sub?: string };
export type Bar = { label: string; value: number; text: string; negative?: boolean };
export type Cell = { text: string; heat?: number; hot?: boolean };
export type LoopNode = { label: string; glyph: GlyphName };

export type StageBody =
  /** A rounded box with a glyph and 1 to 3 lines. */
  | { kind: 'text'; glyph: GlyphName; lines: string[] }
  /** Token-like chips with an optional small line under each; `reveal` brings them in one by one. */
  | { kind: 'chips'; chips: Chip[]; hot?: number[]; reveal?: boolean }
  /** Layered cards: glyph, title, subtitle. */
  | { kind: 'stack'; cards: Card[]; hot?: number }
  /** 3 to 5 horizontal bars; `value` is the bar length from 0 to 1, `text` is the number printed at the end. */
  | { kind: 'bars'; bars: Bar[]; hot?: number }
  /** A small grid of values. `header` makes row 0 plain column titles; `side` is text beside the grid. */
  | { kind: 'cells'; rows: Cell[][]; header?: boolean; side?: string[]; square?: boolean }
  /** A cycle of 3 or 4 labelled nodes with a moving dot; `center` is up to 2 short lines inside the cycle. */
  | { kind: 'loop'; nodes: LoopNode[]; center?: string[] };

export type Stage = { label: string; note: string } & StageBody;

export type StageScene = {
  id: string;
  title: string;
  /** Lesson key "<track>/<slug>"; the "How it works" link goes to /learn/<track>/<slug>/. */
  lesson: string;
  /** One plain sentence under the figure: what is real and what is an example. */
  caption: string;
  stages: Stage[];
  /** Full text alternative for the whole figure. */
  alt: string;
  component?: undefined;
};

/** The chatbot figure is drawn by HeroFlow itself, so it has no stages here. */
export type ChatbotScene = {
  id: 'chatbot';
  title: string;
  lesson: string;
  caption: string;
  stages: [];
  alt: string;
  component: 'HeroFlow';
};

export type Scene = StageScene | ChatbotScene;

export const isStaged = (s: Scene): s is StageScene => s.component !== 'HeroFlow';

/* ---------- small helpers ---------- */

const MINUS = '−';

/** A number with fixed decimals and a real minus sign; never "-0.00". */
export function num(n: number, dp = 2): string {
  const s = n.toFixed(dp);
  const clean = Number(s) === 0 ? s.replace('-', '') : s;
  return clean.replace('-', MINUS);
}

export const signed = (n: number, dp = 2): string => (Number(n.toFixed(dp)) > 0 ? '+' : '') + num(n, dp);

export const pct = (p: number, dp = 1): string => `${(p * 100).toFixed(dp)}%`;

/** Milliseconds as "140 ms" or "2.50 s". */
export function ms(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${Math.round(n)} ms`;
}

/** The softmax of scores at a temperature: divide by T, subtract the largest for safety, exponentiate, normalise. */
export function softmax(scores: number[], temperature = 1): number[] {
  const z = scores.map((s) => s / temperature);
  const top = Math.max(...z);
  const e = z.map((v) => Math.exp(v - top));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

export function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return dot / (norm(a) * norm(b));
}

/** Greedy word wrap, used for the small note under each stage. */
export function wrapText(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && next.length > max) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export const NOTE_CHARS = 36;

/* ---------- geometry shared with the component (so it can be tested) ---------- */

/** Height of the drawing area of one stage, below its label. */
export const BODY_H = 124;
export const STAGE_W = 250;

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Cell size for a grid of rows by cols. With a side column the grid gets less width. */
export function cellLayout(rows: number, cols: number, hasSide: boolean, square: boolean) {
  const maxW = hasSide ? 130 : STAGE_W;
  let cw = Math.floor(maxW / cols);
  let ch = Math.min(Math.floor(BODY_H / rows), 34);
  if (square) {
    cw = ch = Math.min(cw, ch, 30);
  }
  return { cw, ch, w: cw * cols, h: ch * rows };
}

/** Centres of the 3 or 4 nodes of a loop, clockwise from the top, inside the 250 by 124 drawing area. */
export function loopCentres(n: number): { x: number; y: number }[] {
  const cx = 125;
  const cy = 14 + 62;
  const angles = n === 4 ? [-90, 0, 90, 180] : [-90, 30, 150];
  return angles.map((a) => ({ x: r1(cx + 84 * Math.cos((a * Math.PI) / 180)), y: r1(cy + 46 * Math.sin((a * Math.PI) / 180)) }));
}

/** Points along the loop's ellipse for the moving dot, clockwise from the top. */
export function loopPath(steps = 48): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (-90 + (360 * i) / steps) * (Math.PI / 180);
    pts.push({ x: r1(125 + 84 * Math.cos(t)), y: r1(76 + 46 * Math.sin(t)) });
  }
  return pts;
}

/* ---------- rag: how a chatbot answers from your own documents ---------- */

/** A toy "meaning space" of 3 numbers per text: how much it is about returns, about delivery, about the shop. */
export const RAG_AXES = ['returns', 'delivery', 'shop'] as const;
export const RAG_QUERY = [0.9, 0.3, 0.1];
export const RAG_PASSAGES = [
  { title: 'Returns policy', short: 'Returns', v: [0.9, 0.2, 0.1] },
  { title: 'Refund steps', short: 'Refunds', v: [0.7, 0.1, 0.4] },
  { title: 'Shipping times', short: 'Shipping', v: [0.1, 0.9, 0.2] },
  { title: 'Opening hours', short: 'Hours', v: [0.1, 0.1, 0.9] },
];

/** Cosine similarity of the question to every passage, best first. */
export function ragScores() {
  return RAG_PASSAGES.map((p) => ({ ...p, score: cosine(RAG_QUERY, p.v) })).sort((a, b) => b.score - a.score);
}
export const RAG_TOP_K = 2;

function ragScene(): StageScene {
  const ranked = ragScores();
  const top = ranked.slice(0, RAG_TOP_K);
  const scoreText = ranked.map((p) => `${p.title} ${p.score.toFixed(2)}`).join(', ');
  return {
    id: 'rag',
    title: 'How a chatbot answers from your own documents',
    lesson: 'rag-agents/rag-from-scratch',
    caption: 'The scores are real cosine similarities of toy 3-number vectors; the passages and the answer are made-up examples.',
    stages: [
      { label: '1  You ask', note: 'an example question', kind: 'text', glyph: 'question', lines: ['How long do I have', 'to return an item?'] },
      {
        label: '2  Find the closest passages',
        note: 'scores from toy 3-number vectors; 1 = same direction',
        kind: 'bars',
        hot: 0,
        bars: ranked.map((p) => ({ label: p.short, value: p.score, text: p.score.toFixed(2) })),
      },
      {
        label: '3  Paste the best into the prompt',
        note: `the top ${RAG_TOP_K} passages go in with the question`,
        kind: 'stack',
        cards: [
          { glyph: 'pen', title: 'Instructions', sub: 'cite [1], [2]' },
          ...top.map((p, i) => ({ glyph: 'doc' as GlyphName, title: p.title, sub: `[${i + 1}] ${p.score.toFixed(2)}` })),
          { glyph: 'question', title: 'Your question', sub: '' },
        ],
      },
      { label: '4  Answer, with its source', note: 'example answer; [1] points to its source', kind: 'text', glyph: 'pen', lines: ['Within 30 days of', 'buying it. [1]'] },
    ],
    alt: `How a chatbot answers from your own documents, in four steps. 1: you ask an example question, how long do I have to return an item. 2: the system scores each passage by how close its meaning is to the question, using toy vectors: ${scoreText}. 3: the best ${RAG_TOP_K} passages are pasted into the prompt with instructions and your question. 4: the chatbot answers from them and cites passage 1.`,
  };
}

/* ---------- agent: how an AI agent finishes a task ---------- */

export const AGENT_TRACE = [
  { tool: 'Weather', glyph: 'cloud' as GlyphName, call: 'weather("Saturday")', result: 'dry all day' },
  { tool: 'Calendar', glyph: 'clock' as GlyphName, call: 'calendar("Saturday")', result: 'free at 10:00' },
  { tool: 'Add event', glyph: 'pen' as GlyphName, call: 'add("run, 10:00")', result: 'added' },
];

function agentScene(): StageScene {
  const n = AGENT_TRACE.length;
  const first = AGENT_TRACE[0];
  return {
    id: 'agent',
    title: 'How an AI agent finishes a task',
    lesson: 'rag-agents/agents-and-tool-use',
    caption: 'An example run: the goal, tools and results are made up; the decide, act, look, repeat loop is how agents really work.',
    stages: [
      { label: '1  You give it a goal', note: 'the goal, in plain words (example)', kind: 'text', glyph: 'target', lines: ['Plan a Saturday run', 'if it stays dry'] },
      {
        label: '2  It decides on a tool',
        note: 'it can only act through tools it is given',
        kind: 'stack',
        hot: 0,
        cards: AGENT_TRACE.map((t, i) => ({ glyph: t.glyph, title: t.tool, sub: `step ${i + 1}` })),
      },
      { label: '3  It runs it, reads the result', note: 'the result goes back to the model', kind: 'text', glyph: 'wrench', lines: [first.call, `${'→'} ${first.result}`, `(step 1 of ${n})`] },
      {
        label: '4  Repeat until done',
        note: `${n} steps this time, then it stops (example)`,
        kind: 'loop',
        nodes: [
          { label: 'Decide', glyph: 'route' },
          { label: 'Run it', glyph: 'wrench' },
          { label: 'Read', glyph: 'eye' },
          { label: 'Done?', glyph: 'check' },
        ],
        center: ['not done?', 'go again'],
      },
    ],
    alt: `How an AI agent finishes a task, in four steps. 1: you give it a goal, plan a Saturday run if it stays dry. 2: it decides which tool to use: ${AGENT_TRACE.map((t, i) => `step ${i + 1} ${t.tool}`).join(', ')}. 3: it runs the first tool, ${first.call}, and reads the result, ${first.result}. 4: it repeats decide, run, read and check whether it is done; this example takes ${n} steps and then stops.`,
  };
}

/* ---------- learning: gradient descent on y = 2x with one weight ---------- */

export const LEARN = { xs: [1, 2, 3], ys: [2, 4, 6], lr: 0.1, steps: 3 };

/** Mean squared miss of the guess y = w * x over the examples. */
export function learnLoss(w: number): number {
  return LEARN.xs.reduce((s, x, i) => s + (w * x - LEARN.ys[i]) ** 2, 0) / LEARN.xs.length;
}
/** The slope of the loss with respect to w: the mean of 2 * (w x - y) * x. */
export function learnSlope(w: number): number {
  return LEARN.xs.reduce((s, x, i) => s + 2 * (w * x - LEARN.ys[i]) * x, 0) / LEARN.xs.length;
}
/** Weight and loss after each nudge, starting from w = 0. Entry k is "after k nudges". */
export function learnSteps(): { step: number; w: number; loss: number; slope: number }[] {
  const out: { step: number; w: number; loss: number; slope: number }[] = [];
  let w = 0;
  for (let k = 0; k <= LEARN.steps; k++) {
    out.push({ step: k, w, loss: learnLoss(w), slope: learnSlope(w) });
    w = w - LEARN.lr * learnSlope(w);
  }
  return out;
}
const lossText = (l: number) => (l < 0.01 ? '<0.01' : l.toFixed(2));

function learningScene(): StageScene {
  const st = learnSteps();
  const g = LEARN.xs.map((x, i) => ({ x, y: LEARN.ys[i], guess: st[0].w * x, miss: LEARN.ys[i] - st[0].w * x }));
  const maxMiss = Math.max(...g.map((r) => Math.abs(r.miss)));
  return {
    id: 'learning',
    title: 'How a model learns',
    lesson: 'foundations/how-models-learn',
    caption: 'Real gradient descent on a tiny problem: three examples of y = 2x, one weight, learning rate 0.1. Every number is computed.',
    stages: [
      { label: '1  Make a guess', note: `3 examples: x = ${LEARN.xs.join(', ')}; answers ${LEARN.ys.join(', ')}`, kind: 'text', glyph: 'question', lines: ['guess = w × x', `w starts at ${num(st[0].w)}`] },
      {
        label: '2  Compare with the answer',
        note: `loss = average of the misses squared = ${num(st[0].loss)}`,
        kind: 'cells',
        header: true,
        rows: [
          ['x', 'answer', 'guess', 'miss'].map((t) => ({ text: t })),
          ...g.map((r) => [{ text: String(r.x) }, { text: String(r.y) }, { text: num(r.guess, 0) }, { text: num(r.miss, 0), heat: Math.abs(r.miss) / maxMiss }]),
        ],
      },
      {
        label: '3  Nudge the number',
        note: `learning rate ${LEARN.lr}: step against the slope`,
        kind: 'text',
        glyph: 'bolt',
        lines: [`slope  ${num(st[0].slope)}`, `w: ${num(st[0].w)} → ${num(st[1].w)}`],
      },
      {
        label: '4  Repeat',
        note: `w settles near 2: it found y = 2x`,
        kind: 'cells',
        header: true,
        rows: [
          ['step', 'w', 'loss'].map((t) => ({ text: t })),
          ...st.map((s, i) => [{ text: String(s.step) }, { text: num(s.w), hot: i === st.length - 1 }, { text: lossText(s.loss), heat: Math.min(1, s.loss / st[0].loss) }]),
        ],
      },
    ],
    alt: `How a model learns, in four steps, with real numbers. 1: the model guesses with one number w, starting at ${num(st[0].w)}. 2: it compares its guesses with the right answers for x = 1, 2, 3 and gets a loss of ${num(st[0].loss)}. 3: it nudges w against the slope of ${num(st[0].slope)}, moving from ${num(st[0].w)} to ${num(st[1].w)} with a learning rate of ${LEARN.lr}. 4: it repeats; w goes ${st.map((s) => num(s.w)).join(', ')} and the loss falls to ${lossText(st[st.length - 1].loss)}.`,
  };
}

/* ---------- next-word: scores to percentages, and temperature ---------- */

export const NEXT = {
  sentence: ['The', 'cat', 'sat', 'on', 'the'],
  words: ['mat', 'sofa', 'floor', 'roof', 'moon'],
  scores: [4.0, 3.2, 2.9, 1.4, 0.6],
  lowT: 0.5,
};
export const nextProbs = (temperature: number): number[] => softmax(NEXT.scores, temperature);

function nextWordScene(): StageScene {
  const p1 = nextProbs(1);
  const p2 = nextProbs(NEXT.lowT);
  return {
    id: 'next-word',
    title: 'How a model picks the next word',
    lesson: 'llm/parameters-and-hyperparameters',
    caption: 'The percentages are a real softmax; the sentence and the scores are an example. A real model scores a very long list of words.',
    stages: [
      { label: '1  The sentence so far', note: 'one more word to choose', kind: 'chips', chips: NEXT.sentence.map((text) => ({ text })) },
      {
        label: '2  Scores to percentages',
        note: `example scores, softmax at T = 1: ${NEXT.words[0]} gets ${pct(p1[0])}`,
        kind: 'bars',
        hot: 0,
        bars: NEXT.words.map((w, i) => ({ label: `${w} ${NEXT.scores[i].toFixed(1)}`, value: p1[i], text: pct(p1[i]) })),
      },
      {
        label: `3  Lower temperature: T = ${NEXT.lowT}`,
        note: `scores ÷ T first, so ${NEXT.words[0]} goes from ${pct(p1[0])} to ${pct(p2[0])}`,
        kind: 'bars',
        hot: 0,
        bars: NEXT.words.map((w, i) => ({ label: `${w} ${(NEXT.scores[i] / NEXT.lowT).toFixed(1)}`, value: p2[i], text: pct(p2[i]) })),
      },
      {
        label: '4  The word is added',
        note: `example: it picks "${NEXT.words[0]}" and goes again`,
        kind: 'chips',
        hot: [NEXT.sentence.length],
        reveal: true,
        chips: [...NEXT.sentence, NEXT.words[0]].map((text) => ({ text })),
      },
    ],
    alt: `How a model picks the next word, in four steps. 1: the sentence so far is ${NEXT.sentence.join(' ')}. 2: each candidate word has an example score, ${NEXT.words.map((w, i) => `${w} ${NEXT.scores[i].toFixed(1)}`).join(', ')}, and a softmax turns them into percentages: ${NEXT.words.map((w, i) => `${w} ${pct(p1[i])}`).join(', ')}. 3: at a lower temperature of ${NEXT.lowT} the same scores give ${NEXT.words.map((w, i) => `${w} ${pct(p2[i])}`).join(', ')}, so the top word is more likely. 4: the chosen word, ${NEXT.words[0]}, is added to the sentence and the model goes again.`,
  };
}

/* ---------- kv-cache: the work a cache saves ---------- */

export const KV = { prompt: 10, reply: 8 };

function kvScene(): StageScene {
  const without = positionsComputed(KV.prompt, KV.reply, false);
  const withC = positionsComputed(KV.prompt, KV.reply, true);
  const totNo = totalComputed(KV.prompt, KV.reply, false);
  const totYes = totalComputed(KV.prompt, KV.reply, true);
  const saved = totNo - totYes;
  const times = slowdown(KV.prompt, KV.reply);
  const kib = cacheBytesPerToken() / 1024;
  const chips = (a: number[]): Chip[] => a.map((u, i) => ({ text: `step ${i + 1}`, sub: String(u) }));
  return {
    id: 'kv-cache',
    title: 'How a model avoids repeating work',
    lesson: 'serving/kv-cache-and-memory',
    caption: `Work is counted for an example ${KV.prompt}-token question and ${KV.reply}-token reply; a cache holds ${kib} KiB per token in an example 8-billion-parameter-class model.`,
    stages: [
      { label: '1  Writing a reply', note: 'example sizes; it writes one token per step', kind: 'text', glyph: 'memory', lines: [`Question: ${KV.prompt} tokens`, `Reply: ${KV.reply} tokens`] },
      { label: '2  No cache: redo it all', note: `every step reads everything again: ${totNo} units`, kind: 'chips', reveal: true, chips: chips(without) },
      { label: '3  Cache: keep, then reuse', note: `only the new token is worked on: ${totYes} units`, kind: 'chips', reveal: true, chips: chips(withC) },
      {
        label: '4  Same reply, less work',
        note: `units of work; ${times.toFixed(1)} times less with the cache (example)`,
        kind: 'bars',
        hot: 2,
        bars: [
          { label: 'No cache', value: 1, text: `${totNo}` },
          { label: 'Cache', value: totYes / totNo, text: `${totYes}` },
          { label: 'Saved', value: saved / totNo, text: `${saved}` },
        ],
      },
    ],
    alt: `How a model avoids repeating work, in four steps, counting units of work for an example ${KV.prompt}-token question and ${KV.reply}-token reply. 1: the model writes the reply one token per step. 2: without a cache every step does the whole context again, ${without.join(', ')} units per step, ${totNo} in all. 3: with a cache each step after the first only works on the new token, ${withC.join(', ')} units, ${totYes} in all. 4: the same reply needs ${totYes} units instead of ${totNo}, saving ${saved}, which is ${times.toFixed(1)} times less work.`,
  };
}

/* ---------- image: pixels to edges to a label ---------- */

/** A 6 by 6 example picture of a bright letter T on a dark background (brightness 0 to 9). */
export const T_PICTURE: Grid = [
  [8, 8, 8, 8, 8, 8],
  [1, 1, 8, 8, 1, 1],
  [1, 1, 8, 8, 1, 1],
  [1, 1, 8, 8, 1, 1],
  [1, 1, 8, 8, 1, 1],
  [1, 1, 8, 8, 1, 1],
];
export const EDGE_KERNEL = PRESETS[0].kernel; // the vertical-edge filter: -1 0 1 / -2 0 2 / -1 0 1

/** The filter's response at every position, no padding, stride 1: a 4 by 4 map. */
export function edgeMap(): Grid {
  return convolve(T_PICTURE, EDGE_KERNEL, { pad: 0, stride: 1 });
}

function imageScene(): StageScene {
  const map = edgeMap();
  const maxAbs = Math.max(...map.flat().map(Math.abs));
  const w = EDGE_KERNEL.w;
  return {
    id: 'image',
    title: 'How a computer recognises a picture',
    lesson: 'deep-learning/how-computers-see',
    caption: 'The pixels and the edge numbers are real arithmetic on a 6 × 6 example picture; the shapes step and the label are an illustration.',
    stages: [
      {
        label: '1  Pixels: a grid of numbers',
        note: 'brightness of each pixel, 0 to 9 (example)',
        kind: 'cells',
        square: true,
        side: [`${T_PICTURE.length} × ${T_PICTURE[0].length} pixels`, '0 = black', '9 = white'],
        rows: T_PICTURE.map((r) => r.map((v) => ({ text: String(v), heat: v / 9 }))),
      },
      {
        label: '2  Edges: slide a filter',
        note: `${map.length} × ${map[0].length} results: big numbers mark vertical edges`,
        kind: 'cells',
        square: true,
        side: ['filter:', ...w.map((r) => r.map((v) => num(v, 0)).join(' '))],
        rows: map.map((r) => r.map((v) => ({ text: num(v, 0), heat: Math.abs(v) / maxAbs }))),
      },
      {
        label: '3  Edges join into shapes',
        note: 'illustration: real networks learn many filters',
        kind: 'stack',
        cards: [
          { glyph: 'image', title: 'Edges', sub: 'early layers' },
          { glyph: 'layers', title: 'Parts', sub: 'middle layers' },
          { glyph: 'box', title: 'Whole shape', sub: 'later layers' },
        ],
      },
      { label: '4  A label comes out', note: 'an example label; real networks score many', kind: 'text', glyph: 'tag', lines: ['It looks like', 'the letter T'] },
    ],
    alt: `How a computer recognises a picture, in four steps. 1: the picture is a 6 by 6 grid of brightness numbers from 0 to 9; this example is a bright letter T on a dark background. 2: a vertical-edge filter, ${w.map((r) => r.join(' ')).join(' / ')}, slides over it and gives a 4 by 4 map of numbers: ${map.map((r) => r.join(' ')).join(' / ')}. Large numbers, positive or negative, mark vertical edges. 3: edges combine into parts and then whole shapes in later layers, as an illustration. 4: the label is the letter T.`,
  };
}

/* ---------- serving: the life of a request, from stated example rates ---------- */

export const SERVE = {
  networkMs: 30,
  ahead: 3,
  admitMs: 20,
  promptTokens: 200,
  prefillPerSec: 4000,
  replyTokens: 60,
  decodePerSec: 25,
};

export function serveTimes(p = SERVE) {
  const network = p.networkMs;
  const queue = p.ahead * p.admitMs;
  const prefill = (p.promptTokens / p.prefillPerSec) * 1000;
  const firstWord = network + queue + prefill;
  const streaming = (p.replyTokens - 1) * (1000 / p.decodePerSec);
  return { network, queue, prefill, firstWord, streaming, total: firstWord + streaming };
}

function servingScene(): StageScene {
  const t = serveTimes();
  const p = SERVE;
  const bars = [
    { label: 'Network', v: t.network },
    { label: 'Queue', v: t.queue },
    { label: 'Prompt', v: t.prefill },
    { label: 'Reply', v: t.streaming },
  ];
  return {
    id: 'serving',
    title: 'What happens when you press send on a chatbot',
    lesson: 'serving/life-of-a-request',
    caption: 'Every time is computed from example rates stated in the notes; real systems differ.',
    stages: [
      { label: '1  The request arrives', note: `${p.networkMs} ms on the network (example)`, kind: 'text', glyph: 'gateway', lines: ['Your message', 'reaches the server'] },
      {
        label: '2  It waits in a queue',
        note: `${p.ahead} ahead × ${p.admitMs} ms each = ${t.queue} ms wait (example)`,
        kind: 'stack',
        hot: p.ahead,
        cards: [
          ...Array.from({ length: p.ahead }, (_, i) => ({ glyph: 'queue' as GlyphName, title: `In front: ${i + 1}`, sub: `${i === 0 ? '' : '+'}${p.admitMs} ms` })),
          { glyph: 'user', title: 'You', sub: `= ${t.queue} ms` },
        ],
      },
      {
        label: '3  It joins a batch on a GPU',
        note: `reads your ${p.promptTokens} prompt tokens in ${Math.round(t.prefill)} ms at ${p.prefillPerSec.toLocaleString('en-US')} tokens/s (example)`,
        kind: 'chips',
        hot: [2],
        chips: [{ text: 'req A' }, { text: 'req B' }, { text: 'YOU' }, { text: 'req D' }],
      },
      {
        label: '4  The reply streams back',
        note: `first word at ${Math.round(t.firstWord)} ms; ${p.replyTokens} tokens done by ${ms(t.total)}`,
        kind: 'bars',
        hot: 3,
        bars: bars.map((b) => ({ label: b.label, value: b.v / t.total, text: ms(b.v) })),
      },
    ],
    alt: `What happens when you press send on a chatbot, in four steps, with example timings. 1: the request reaches the server after ${p.networkMs} ms on the network. 2: it waits in a queue behind ${p.ahead} other requests, ${p.admitMs} ms each, ${t.queue} ms in total. 3: it joins a batch on a GPU, which reads the ${p.promptTokens}-token prompt in ${Math.round(t.prefill)} ms. 4: the reply streams back: the first word arrives at ${Math.round(t.firstWord)} ms and all ${p.replyTokens} tokens are done by ${ms(t.total)}, most of that time spent writing the reply.`,
  };
}

/* ---------- hearing: slices, loudness, a decision, a cleaner signal ---------- */

/** Eight slices of four sample values: noise, noise, speech, speech, speech, noise, speech, noise (example). */
export const HEAR_SLICES: number[][] = [
  [1, -1, 0, 1],
  [0, 1, -1, 0],
  [3, -2, 3, -3],
  [2, -3, 3, -2],
  [-3, 2, -2, 3],
  [1, 0, -1, -1],
  [2, -2, 3, -1],
  [0, 1, 0, -1],
];
export const HEAR = { threshold: 2, quietGain: 0.2 };

/** Loudness of a slice: the mean of the squared samples. */
export const sliceEnergy = (s: number[]): number => s.reduce((a, v) => a + v * v, 0) / s.length;

export function hearingResult() {
  const energy = HEAR_SLICES.map(sliceEnergy);
  const speech = energy.map((e) => e > HEAR.threshold);
  const gain = speech.map((s) => (s ? 1 : HEAR.quietGain));
  const out = energy.map((e, i) => e * gain[i] * gain[i]);
  return { energy, speech, gain, out };
}

function hearingScene(): StageScene {
  const h = hearingResult();
  const maxE = Math.max(...h.energy);
  const head = HEAR_SLICES.map((_, i) => ({ text: String(i + 1) }));
  const nSpeech = h.speech.filter(Boolean).length;
  return {
    id: 'hearing',
    title: 'How a hearing device cleans up sound',
    lesson: 'audio/noise-suppression-and-hearing-devices',
    caption: 'A tiny worked example: 8 slices of 4 sample values, with loudness and gain computed; a real device uses a trained network, not one threshold.',
    stages: [
      {
        label: '1  Sound comes in',
        note: `${HEAR_SLICES.length} slices × ${HEAR_SLICES[0].length} samples = ${HEAR_SLICES.flat().length} numbers (example)`,
        kind: 'text',
        glyph: 'bell',
        lines: ['Speech mixed', 'with noise'],
      },
      {
        label: '2  Cut into short slices',
        note: 'loudness of a slice = mean of its squared samples',
        kind: 'cells',
        header: true,
        rows: [head, h.energy.map((e) => ({ text: e.toFixed(2), heat: e / maxE }))],
      },
      {
        label: '3  A small model decides',
        note: `stand-in rule: above ${num(HEAR.threshold)} = speech; real ones use a small network`,
        kind: 'cells',
        rows: [h.energy.map((e) => ({ text: e.toFixed(2), heat: e / maxE })), h.speech.map((s) => ({ text: s ? 'yes' : 'no', hot: s }))],
      },
      {
        label: '4  Cleaner sound out',
        note: `non-speech slices turned down to ${HEAR.quietGain} of their level (example)`,
        kind: 'cells',
        rows: [h.gain.map((g) => ({ text: `×${g}`, hot: g === 1 })), h.out.map((e) => ({ text: e.toFixed(2), heat: e / maxE }))],
      },
    ],
    alt: `How a hearing device cleans up sound, in four steps, with a worked example. 1: sound arrives, speech mixed with noise: ${HEAR_SLICES.flat().length} sample numbers. 2: it is cut into ${HEAR_SLICES.length} short slices and each slice's loudness is the mean of its squared samples: ${h.energy.map((e) => e.toFixed(2)).join(', ')}. 3: a stand-in rule marks a slice as speech when its loudness is above ${num(HEAR.threshold)}; ${nSpeech} of ${HEAR_SLICES.length} slices count as speech. 4: slices that are not speech are turned down to ${HEAR.quietGain} of their level, giving loudness ${h.out.map((e) => e.toFixed(2)).join(', ')}.`,
  };
}

/* ---------- spam: add up the evidence ---------- */

/** Made-up example counts: of 20 spam and 20 ordinary emails, how many contain each clue word. */
export const SPAM = {
  spamTotal: 20,
  hamTotal: 20,
  clues: [
    { word: 'free', spam: 12, ham: 1 },
    { word: 'prize', spam: 9, ham: 0 },
    { word: 'claim', spam: 6, ham: 1 },
    { word: 'meeting', spam: 0, ham: 10 },
  ],
};

/** Evidence for spam from one clue: ln of how much likelier the word is in spam than in ordinary mail (add-one smoothing). */
export const clueWeight = (c: { spam: number; ham: number }): number =>
  Math.log((c.spam + 1) / (SPAM.spamTotal + 2)) - Math.log((c.ham + 1) / (SPAM.hamTotal + 2));

export function spamVerdict() {
  const weights = SPAM.clues.map(clueWeight);
  const prior = Math.log(SPAM.spamTotal / SPAM.hamTotal);
  const total = prior + weights.reduce((a, b) => a + b, 0);
  return { weights, prior, total, probability: 1 / (1 + Math.exp(-total)) };
}

function spamScene(): StageScene {
  const v = spamVerdict();
  const maxAbs = Math.max(Math.abs(v.total), ...v.weights.map(Math.abs));
  return {
    id: 'spam',
    title: 'How an email is sorted into spam or not',
    lesson: 'ml/linear-and-logistic-regression',
    caption: 'The sums are real arithmetic on made-up example counts (20 spam and 20 ordinary emails); real filters learn from far more mail.',
    stages: [
      { label: '1  An email arrives', note: 'an example email', kind: 'text', glyph: 'doc', lines: ['Claim your free prize', 'now. Meeting is at 3.'] },
      {
        label: '2  Look for clue words',
        note: 'under each: spam emails vs ordinary emails with it, of 20 each (example)',
        kind: 'chips',
        reveal: true,
        chips: SPAM.clues.map((c) => ({ text: c.word, sub: `${c.spam} vs ${c.ham}` })),
      },
      {
        label: '3  Add up the evidence',
        note: 'each clue pushes towards spam (+) or away (−); sum = log-odds',
        kind: 'bars',
        hot: SPAM.clues.length,
        bars: [
          ...SPAM.clues.map((c, i) => ({ label: c.word, value: Math.abs(v.weights[i]) / maxAbs, text: signed(v.weights[i]), negative: v.weights[i] < 0 })),
          { label: 'Total', value: Math.abs(v.total) / maxAbs, text: signed(v.total), negative: v.total < 0 },
        ],
      },
      { label: '4  Decide', note: `from the sum ${signed(v.total)}; example counts, real arithmetic`, kind: 'text', glyph: 'shield', lines: [`${Math.round(v.probability * 100)}% likely spam`, `${'→'} spam folder`] },
    ],
    alt: `How an email is sorted into spam or not, in four steps, with real arithmetic on made-up counts. 1: an example email arrives: Claim your free prize now. Meeting is at 3. 2: the filter finds clue words and compares how often each appears in spam and in ordinary mail, out of 20 of each: ${SPAM.clues.map((c) => `${c.word} ${c.spam} versus ${c.ham}`).join(', ')}. 3: each clue adds evidence, ${SPAM.clues.map((c, i) => `${c.word} ${signed(v.weights[i])}`).join(', ')}, and the total is ${signed(v.total)}. 4: that total means about ${Math.round(v.probability * 100)} percent likely spam, so the email goes to the spam folder.`,
  };
}

/* ---------- guardrails: a check in front and a check behind ---------- */

export const GUARD_CHECKS = {
  input: [
    { name: 'Private data', result: 'none found', pass: true },
    { name: 'Attack text', result: 'none found', pass: true },
    { name: 'On topic', result: 'yes', pass: true },
  ],
  output: [
    { name: 'Secrets leaked', result: 'none', pass: true },
    { name: 'Harmful advice', result: 'none', pass: true },
    { name: 'Matches sources', result: 'yes', pass: true },
  ],
};

function guardrailsScene(): StageScene {
  const all = [...GUARD_CHECKS.input, ...GUARD_CHECKS.output];
  const passed = all.filter((c) => c.pass).length;
  const sent = passed === all.length;
  const toCard = (c: { name: string; result: string; pass: boolean }): Card => ({ glyph: c.pass ? 'check' : 'flag', title: c.name, sub: c.result });
  return {
    id: 'guardrails',
    title: 'How a safety check wraps an AI assistant',
    lesson: 'evals/guardrails-in-practice',
    caption: 'An illustration: the checks and their results are examples; checking before and after the model is how guardrails are really built.',
    stages: [
      { label: '1  A message arrives', note: 'an example message', kind: 'text', glyph: 'user', lines: ['What is your', 'refund policy?'] },
      { label: '2  Input check first', note: `example: the message passes all ${GUARD_CHECKS.input.length}`, kind: 'stack', cards: GUARD_CHECKS.input.map(toCard) },
      { label: '3  The model drafts', note: 'the draft is not shown to anyone yet', kind: 'text', glyph: 'box', lines: ['Draft answer', 'written, not sent'] },
      {
        label: '4  Output check, then reply',
        note: `${passed} of ${all.length} checks passed (example): ${sent ? 'the reply is sent' : 'the reply is held back'}`,
        kind: 'stack',
        hot: 3,
        cards: [...GUARD_CHECKS.output.map(toCard), { glyph: 'shield', title: 'Reply', sub: sent ? 'sent' : 'held back' }],
      },
    ],
    alt: `How a safety check wraps an AI assistant, in four steps, with example results. 1: a message arrives, what is your refund policy. 2: an input check runs first: ${GUARD_CHECKS.input.map((c) => `${c.name}, ${c.result}`).join('; ')}. 3: the model writes a draft that nobody sees yet. 4: an output check runs on the draft: ${GUARD_CHECKS.output.map((c) => `${c.name}, ${c.result}`).join('; ')}. ${passed} of ${all.length} checks passed, so the reply is ${sent ? 'sent' : 'held back'}.`,
  };
}

/* ---------- the list ---------- */

/** The chatbot figure, drawn by HeroFlow itself. */
export const CHATBOT_SCENE: ChatbotScene = {
  id: 'chatbot',
  component: 'HeroFlow',
  title: 'What happens when you ask a chatbot a question',
  lesson: 'start/how-a-chatbot-answers',
  caption: 'Real pieces and numbers from a real tokenizer. Other chatbots cut text a little differently.',
  stages: [],
  alt: 'What happens when you ask a chatbot a question: your 6 words are cut into 7 pieces, each one a number, the model works through 32 layers of number crunching, and the answer is written one piece at a time.',
};

export const HERO_SCENES: Scene[] = [
  CHATBOT_SCENE,
  ragScene(),
  agentScene(),
  learningScene(),
  nextWordScene(),
  kvScene(),
  imageScene(),
  servingScene(),
  hearingScene(),
  spamScene(),
  guardrailsScene(),
];

/* ---------- which figure today ---------- */

/**
 * The scene for a day. The scenes are put in a stable shuffled order and shown one a day, every scene once before any
 * repeats, so two neighbouring days never match, including where one round ends and the next begins.
 * `dayIndex` counts days since 2026-01-01, as in daily-card.ts.
 */
export function pickScene<T extends { id: string }>(dayIndex: number, scenes: T[]): T {
  if (!scenes.length) throw new Error('pickScene needs at least one scene');
  const order = shuffled(scenes, (s) => s.id);
  const n = order.length;
  return order[((Math.floor(dayIndex) % n) + n) % n];
}

/* ---------- checks a test (and a dev) can run on any scene ---------- */

const LIMITS = { label: 34, note: 2, text: 22, chip: 8, chipSub: 8, cardTitle: 16, cardSub: 13, barLabel: 9, barText: 7, cell: 6, side: 17, loop: 8, center: 11 };

/** Everything that could overflow or break the layout, as a list of plain-English problems. Empty means fine. */
export function sceneProblems(s: Scene): string[] {
  const bad: string[] = [];
  if (!isStaged(s)) return bad;
  if (s.stages.length !== 4) bad.push(`${s.id}: needs exactly 4 stages`);
  const over = (what: string, text: string, max: number) => {
    if (text.length > max) bad.push(`${s.id}: ${what} "${text}" is longer than ${max}`);
  };
  s.stages.forEach((st, i) => {
    const at = `stage ${i + 1}`;
    over(`${at} label`, st.label, LIMITS.label);
    const note = wrapText(st.note, NOTE_CHARS);
    if (note.length > LIMITS.note || note.some((l) => l.length > NOTE_CHARS)) bad.push(`${s.id}: ${at} note does not fit in ${LIMITS.note} lines`);
    switch (st.kind) {
      case 'text':
        if (st.lines.length < 1 || st.lines.length > 3) bad.push(`${s.id}: ${at} text needs 1 to 3 lines`);
        st.lines.forEach((l) => over(`${at} line`, l, LIMITS.text));
        break;
      case 'chips':
        if (st.chips.length < 1 || st.chips.length > 8) bad.push(`${s.id}: ${at} chips need 1 to 8`);
        st.chips.forEach((c) => {
          over(`${at} chip`, c.text, LIMITS.chip);
          if (c.sub) over(`${at} chip sub`, c.sub, LIMITS.chipSub);
        });
        break;
      case 'stack':
        if (st.cards.length < 2 || st.cards.length > 4) bad.push(`${s.id}: ${at} stack needs 2 to 4 cards`);
        st.cards.forEach((c) => {
          over(`${at} card title`, c.title, LIMITS.cardTitle);
          over(`${at} card sub`, c.sub ?? '', LIMITS.cardSub);
        });
        break;
      case 'bars':
        if (st.bars.length < 3 || st.bars.length > 5) bad.push(`${s.id}: ${at} bars need 3 to 5`);
        st.bars.forEach((b) => {
          over(`${at} bar label`, b.label, LIMITS.barLabel);
          over(`${at} bar text`, b.text, LIMITS.barText);
          if (!(b.value >= 0 && b.value <= 1)) bad.push(`${s.id}: ${at} bar value ${b.value} is outside 0 to 1`);
        });
        break;
      case 'cells': {
        const cols = Math.max(...st.rows.map((r) => r.length));
        const lay = cellLayout(st.rows.length, cols, !!st.side, !!st.square);
        if (st.rows.some((r) => r.length !== cols)) bad.push(`${s.id}: ${at} grid rows differ in length`);
        const fit = Math.floor((lay.cw - 2) / 6.6);
        st.rows.forEach((r) =>
          r.forEach((c) => {
            over(`${at} cell`, c.text, LIMITS.cell);
            if (c.text.length > fit) bad.push(`${s.id}: ${at} cell "${c.text}" is wider than its ${lay.cw}px cell`);
          }),
        );
        (st.side ?? []).forEach((l) => over(`${at} side line`, l, LIMITS.side));
        if ((st.side?.length ?? 0) > 6) bad.push(`${s.id}: ${at} side text has too many lines`);
        break;
      }
      case 'loop':
        if (st.nodes.length < 3 || st.nodes.length > 4) bad.push(`${s.id}: ${at} loop needs 3 or 4 nodes`);
        st.nodes.forEach((n) => over(`${at} node`, n.label, LIMITS.loop));
        (st.center ?? []).forEach((l) => over(`${at} center`, l, LIMITS.center));
        if ((st.center?.length ?? 0) > 2) bad.push(`${s.id}: ${at} center has more than 2 lines`);
        break;
    }
  });
  if (!/example/i.test(s.caption)) bad.push(`${s.id}: the caption must say what is an example`);
  if (!s.alt || s.alt.length < 80) bad.push(`${s.id}: alt text is missing or too short`);
  return bad;
}
