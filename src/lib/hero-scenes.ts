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
import { example as batchExample, lastReplySeconds, perUserTokS, stepSeconds, totalTokS, weightsGB } from './whatif/no-batching';
import { ALERT_SHIFT, COMPLAINT_ACCURACY, WINDOW, simulate as simulateDrift, warningDays } from './whatif/no-drift-monitoring';
import { applyMerges, countPairs, encode as encodeBpe, tokenLabel, totalTokens, train as trainBpe, vocabBytes, wordsFromText } from './bpe';
import { affineParams, dequantise, quantise } from './int-quant';

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

/* ---------- more helpers for the second batch ---------- */

/** 16777216 as "16,777,216". */
export const grp = (n: number): string => n.toLocaleString('en-US');

/** A count in a few characters: 131072 becomes "131K", 16777216 becomes "16.8M". */
export function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e5) return `${Math.round(n / 1e3)}K`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/* ---------- attention: which words matter ---------- */

/** Toy numbers of 4 per word: the word "it" asks (query), each earlier word offers a key and a value. All made up. */
export const ATTN = {
  sentence: ['The', 'cat', 'drank', 'milk', 'because', 'it'],
  query: [2, 2, 0, 2],
  keys: [
    [0.1, 0, 0.2, 0.1],
    [1, 0.8, 0.1, 0.6],
    [0.2, 0.1, 0.9, 0.2],
    [0.5, 0.6, 0.3, 0.1],
    [0.1, 0.2, 0.1, 0.4],
  ],
  values: [
    [0.1, 0.2],
    [0.9, 0.1],
    [0.2, 0.8],
    [0.7, 0.4],
    [0.3, 0.3],
  ],
};

/** The score of each earlier word: query dot key, divided by the square root of the number of numbers (4, so 2). */
export function attentionScores(): number[] {
  const d = ATTN.query.length;
  return ATTN.keys.map((k) => k.reduce((s, v, i) => s + v * ATTN.query[i], 0) / Math.sqrt(d));
}
/** The weights after softmax, and the weighted sum of the value numbers. */
export function attentionResult() {
  const scores = attentionScores();
  const weights = softmax(scores);
  const mix = [0, 1].map((j) => weights.reduce((s, w, i) => s + w * ATTN.values[i][j], 0));
  return { scores, weights, mix };
}

function attentionScene(): StageScene {
  const a = attentionResult();
  const words = ATTN.sentence.slice(0, 5);
  const top = a.weights.indexOf(Math.max(...a.weights));
  const maxScore = Math.max(...a.scores);
  const mixText = `[${a.mix.map((v) => v.toFixed(2)).join(', ')}]`;
  return {
    id: 'attention',
    title: 'How a model decides which words matter',
    lesson: 'foundations/attention-intuition',
    caption: 'The scores and weights are real arithmetic (dot products, then softmax) on example 4-number vectors; real models do this with many more numbers.',
    stages: [
      { label: '1  Read the word "it"', note: 'which earlier word does it mean? (example)', kind: 'chips', hot: [ATTN.sentence.length - 1], chips: ATTN.sentence.map((text) => ({ text })) },
      {
        label: '2  Score every earlier word',
        note: 'score = query · key ÷ 2; example vectors; higher = more related',
        kind: 'bars',
        hot: top,
        bars: words.map((w, i) => ({ label: w, value: Math.max(0, a.scores[i]) / maxScore, text: num(a.scores[i], 1) })),
      },
      {
        label: '3  Scores to weights',
        note: `softmax makes them add up to 100%: ${words[top]} gets ${pct(a.weights[top], 0)}`,
        kind: 'bars',
        hot: top,
        bars: words.map((w, i) => ({ label: w, value: a.weights[i], text: pct(a.weights[i], 0) })),
      },
      {
        label: '4  Blend the words by weight',
        note: 'each word brings a value; the blend is the new "it"',
        kind: 'text',
        glyph: 'layers',
        lines: ['mix = weight × value', `= ${mixText}`, `mostly from "${words[top]}"`],
      },
    ],
    alt: `How a model decides which words matter, in four steps, with real arithmetic on made-up numbers. 1: in the sentence ${ATTN.sentence.join(' ')}, the model reads the word it and asks which earlier word it means. 2: each earlier word gets a score, the dot product of the question numbers with its key numbers divided by 2: ${words.map((w, i) => `${w} ${num(a.scores[i], 1)}`).join(', ')}. 3: a softmax turns the scores into weights that add up to 100 percent: ${words.map((w, i) => `${w} ${pct(a.weights[i], 0)}`).join(', ')}. 4: the model blends the words' value numbers by those weights, giving ${mixText}, mostly from ${words[top]}.`,
  };
}

/* ---------- bpe: a real run of byte-pair merges ---------- */

export const BPE_TEXT = 'the cat sat on the mat. the cat ate the rat. the rat sat on the mat.';
export const BPE = { merges: 4, sample: 'the cat sat' };

/** The first merges learned from the example text, how many pieces are left after each, and the sample cut into pieces. */
export function bpeRun() {
  const words = wordsFromText(BPE_TEXT);
  const merges = trainBpe(BPE_TEXT, BPE.merges);
  const bytes = vocabBytes(merges);
  const label = (id: number) => tokenLabel(bytes.get(id) ?? []);
  const start = totalTokens(words);
  const left = merges.map((_, k) => totalTokens(applyMerges(words, merges, k + 1)));
  const pairs = countPairs(words).slice(0, 4).map((p) => ({ name: `${label(p.pair[0])}+${label(p.pair[1])}`, count: p.count }));
  const sampleIds = encodeBpe(BPE.sample, merges);
  return {
    start,
    merges: merges.map((m, k) => ({ name: label(m.id), made: `${label(m.pair[0])}+${label(m.pair[1])}`, count: m.count, left: left[k] })),
    pairs,
    sampleBytes: BPE.sample.length,
    sample: sampleIds.map((id) => ({ text: label(id), merged: (bytes.get(id) ?? []).length > 1 })),
  };
}

function bpeScene(): StageScene {
  const r = bpeRun();
  return {
    id: 'bpe',
    title: 'How text is cut into pieces',
    lesson: 'deep-learning/build-a-tokenizer',
    caption: `Real byte-pair merging, run on a ${BPE_TEXT.length}-character example text; real tokenizers learn tens of thousands of merges from huge amounts of text.`,
    stages: [
      {
        label: '1  Start with single letters',
        note: `the whole example text is ${r.start} pieces (· = space)`,
        kind: 'chips',
        hot: [],
        chips: 'the cat'.split('').map((c) => ({ text: c === ' ' ? '·' : c })),
      },
      {
        label: '2  Count the pairs',
        note: `the most common pair, ${r.pairs[0].name}, is joined into one piece`,
        kind: 'bars',
        hot: 0,
        bars: r.pairs.map((p) => ({ label: p.name, value: p.count / r.pairs[0].count, text: String(p.count) })),
      },
      {
        label: '3  Join it, then repeat',
        note: 'under each new piece: pieces left in the whole text',
        kind: 'chips',
        reveal: true,
        chips: r.merges.map((m) => ({ text: m.name, sub: String(m.left) })),
      },
      {
        label: '4  Text becomes pieces',
        note: `"${BPE.sample}": ${r.sampleBytes} letters became ${r.sample.length} pieces (example)`,
        kind: 'chips',
        hot: r.sample.map((c, i) => (c.merged ? i : -1)).filter((i) => i >= 0),
        chips: r.sample.map((c) => ({ text: c.text })),
      },
    ],
    alt: `How text is cut into pieces, in four steps, using a real byte-pair merge run on a short example text. 1: the text starts as ${r.start} single letters. 2: the most common neighbouring pairs are counted: ${r.pairs.map((p) => `${p.name} ${p.count} times`).join(', ')}. 3: the most common pair is joined into one piece and the count repeats; the first ${r.merges.length} pieces made are ${r.merges.map((m) => `${m.name} (${m.left} pieces left)`).join(', ')}. 4: the phrase ${BPE.sample} is now cut into ${r.sample.length} pieces instead of ${r.sampleBytes} letters: ${r.sample.map((c) => c.text).join(' ')}.`,
  };
}

/* ---------- embeddings: meaning as numbers ---------- */

/** Toy 2-number "meaning" vectors: how much a word is about animals, how much about wheeled things. Example numbers. */
export const EMB_AXES = ['animal', 'wheels'] as const;
export const EMB_WORDS = [
  { word: 'cat', v: [0.9, 0.1] },
  { word: 'kitten', v: [0.95, 0.2] },
  { word: 'dog', v: [0.8, 0.3] },
  { word: 'car', v: [0.1, 0.9] },
  { word: 'truck', v: [0.2, 0.8] },
];

/** Cosine similarity of "cat" to each other word, best first. */
export function embeddingNeighbours() {
  const cat = EMB_WORDS[0];
  return EMB_WORDS.slice(1)
    .map((w) => ({ word: w.word, score: cosine(cat.v, w.v) }))
    .sort((a, b) => b.score - a.score);
}

function embeddingsScene(): StageScene {
  const near = embeddingNeighbours();
  return {
    id: 'embeddings',
    title: 'How meaning becomes numbers',
    lesson: 'foundations/tokens-and-embeddings',
    caption: 'The similarities are real cosine arithmetic on example 2-number vectors; real embeddings have hundreds or thousands of numbers.',
    stages: [
      { label: '1  Start with words', note: 'a computer sees only letters', kind: 'chips', hot: [], chips: EMB_WORDS.map((w) => ({ text: w.word })) },
      {
        label: '2  Give each word numbers',
        note: 'example: how much each word is about animals or wheels',
        kind: 'cells',
        header: true,
        rows: [
          ['word', ...EMB_AXES].map((t) => ({ text: t })),
          ...EMB_WORDS.map((w) => [{ text: w.word }, ...w.v.map((x) => ({ text: x.toFixed(2), heat: x }))]),
        ],
      },
      {
        label: '3  Compare with "cat"',
        note: 'cosine: 1 = same direction, 0 = unrelated',
        kind: 'bars',
        hot: 0,
        bars: near.map((n) => ({ label: n.word, value: n.score, text: n.score.toFixed(2) })),
      },
      {
        label: '4  Closest words win',
        note: 'a search compares numbers, not spelling',
        kind: 'stack',
        hot: 1,
        cards: [
          { glyph: 'search', title: 'Look up: cat', sub: '' },
          ...near.slice(0, 2).map((n) => ({ glyph: 'vector' as GlyphName, title: n.word, sub: n.score.toFixed(2) })),
        ],
      },
    ],
    alt: `How meaning becomes numbers, in four steps, with made-up 2-number vectors. 1: we start with the words ${EMB_WORDS.map((w) => w.word).join(', ')}. 2: each word gets two numbers, how much it is about animals and how much about wheeled things: ${EMB_WORDS.map((w) => `${w.word} ${w.v.join(' and ')}`).join('; ')}. 3: comparing each word with cat using cosine similarity gives ${near.map((n) => `${n.word} ${n.score.toFixed(2)}`).join(', ')}. 4: the closest words to cat are ${near[0].word} and ${near[1].word}, found by comparing numbers, not spelling.`,
  };
}

/* ---------- lora: a small add-on instead of changing everything ---------- */

export const LORA = { d: 4096, rank: 16, ranks: [4, 16, 64] };
export const fullParams = (d: number): number => d * d;
/** Two thin matrices: A is rank by d and B is d by rank. */
export const loraParams = (d: number, rank: number): number => 2 * d * rank;

function loraScene(): StageScene {
  const { d, rank } = LORA;
  const full = fullParams(d);
  const small = loraParams(d, rank);
  const share = (small / full) * 100;
  return {
    id: 'lora',
    title: 'How a model is adapted with a small add-on',
    lesson: 'llm/fine-tuning-in-practice',
    caption: `The counts are exact for one example ${grp(d)} × ${grp(d)} layer; a real model has many such layers.`,
    stages: [
      { label: '1  One big weight matrix', note: 'an example layer; changing all of it is costly', kind: 'text', glyph: 'table', lines: [`${grp(d)} × ${grp(d)}`, `= ${grp(full)} numbers`] },
      {
        label: '2  Freeze it, add two thin ones',
        note: `rank ${rank} (example): only A and B are trained`,
        kind: 'stack',
        hot: 1,
        cards: [
          { glyph: 'lock', title: 'Big matrix W', sub: 'frozen' },
          { glyph: 'pen', title: `A: ${rank} × ${grp(d)}`, sub: grp(rank * d) },
          { glyph: 'pen', title: `B: ${grp(d)} × ${rank}`, sub: grp(d * rank) },
        ],
      },
      {
        label: '3  Count what is trained',
        note: `numbers to train in this layer, for different ranks`,
        kind: 'bars',
        hot: 2,
        bars: [
          { label: 'Full', value: 1, text: compact(full) },
          ...[...LORA.ranks].reverse().map((r) => ({ label: `rank ${r}`, value: loraParams(d, r) / full, text: compact(loraParams(d, r)) })),
        ],
      },
      { label: '4  Add the update back', note: 'B starts at zero, so training starts from the original', kind: 'text', glyph: 'layers', lines: ['output = W·x + B·A·x', `${share.toFixed(2)}% as many to train`] },
    ],
    alt: `How a model is adapted with a small add-on, in four steps, with exact counts for one example ${grp(d)} by ${grp(d)} layer. 1: the layer has ${grp(full)} numbers, and changing all of them is costly. 2: instead the big matrix is frozen and two thin matrices are added, A with ${rank} by ${grp(d)} and B with ${grp(d)} by ${rank}, ${grp(small)} numbers together. 3: comparing the numbers to train: full ${grp(full)}; rank 64 ${grp(loraParams(d, 64))}; rank 16 ${grp(small)}; rank 4 ${grp(loraParams(d, 4))}. 4: the layer's output is the frozen part plus the small add-on, and only ${share.toFixed(2)} percent as many numbers are trained.`,
  };
}

/* ---------- quantization: fewer bits per weight ---------- */

export const QUANT = { weights: [-0.4, -0.12, 0, 0.31, 0.74], paramsB: 8, bits: [32, 16, 8, 4] };

/** Real 8-bit mapping of the example weights: scale, zero point, the integer for each, and the value you get back. */
export function quantRun() {
  const lo = Math.min(...QUANT.weights);
  const hi = Math.max(...QUANT.weights);
  const p = affineParams(lo, hi);
  const q = QUANT.weights.map((w) => quantise(w, p));
  const back = q.map((v) => dequantise(v, p));
  return { lo, hi, scale: p.scale, zeroPoint: p.zeroPoint, q, back, err: QUANT.weights.map((w, i) => Math.abs(w - back[i])) };
}
/** Gigabytes needed to store `paramsB` billion weights at `bits` bits each. */
export const weightGB = (paramsB: number, bits: number): number => (paramsB * bits) / 8;

function quantizationScene(): StageScene {
  const r = quantRun();
  const mem = QUANT.bits.map((b) => weightGB(QUANT.paramsB, b));
  return {
    id: 'quantization',
    title: 'How a model is made smaller',
    lesson: 'edge/quantization-for-edge',
    caption: `The 8-bit mapping is real arithmetic on 5 example weights; the memory is for an example ${QUANT.paramsB}-billion-weight model and ignores small extras.`,
    stages: [
      { label: '1  Weights are decimals', note: 'example weights, each stored in 32 bits', kind: 'chips', hot: [], chips: QUANT.weights.map((w) => ({ text: num(w), sub: '32 bits' })) },
      {
        label: '2  Find the scale and zero',
        note: '256 steps from smallest to largest: scale = range ÷ 255',
        kind: 'stack',
        hot: 2,
        cards: [
          { glyph: 'arrow', title: 'Smallest', sub: num(r.lo) },
          { glyph: 'arrow', title: 'Largest', sub: num(r.hi) },
          { glyph: 'compress', title: 'Scale', sub: r.scale.toFixed(4) },
          { glyph: 'target', title: 'Zero point', sub: num(r.zeroPoint, 0) },
        ],
      },
      {
        label: '3  Round to whole numbers',
        note: 'int = round(w ÷ scale) + zero; back = (int − zero) × scale',
        kind: 'cells',
        header: true,
        rows: [
          ['weight', 'int8', 'back'].map((t) => ({ text: t })),
          ...QUANT.weights.map((w, i) => [{ text: num(w) }, { text: num(r.q[i], 0), hot: r.q[i] === 127 || r.q[i] === -128 }, { text: num(r.back[i]) }]),
        ],
      },
      {
        label: '4  A quarter of the memory',
        note: `weights of an example ${QUANT.paramsB}-billion model, by bits per weight`,
        kind: 'bars',
        hot: 2,
        bars: QUANT.bits.map((b, i) => ({ label: `${b}-bit`, value: mem[i] / mem[0], text: `${mem[i]} GB` })),
      },
    ],
    alt: `How a model is made smaller, in four steps, with real arithmetic on five example weights: ${QUANT.weights.map((w) => num(w)).join(', ')}. 1: each weight is a decimal stored in 32 bits. 2: the smallest, ${num(r.lo)}, and largest, ${num(r.hi)}, are mapped onto 256 whole-number steps, which gives a scale of ${r.scale.toFixed(4)} and a zero point of ${num(r.zeroPoint, 0)}. 3: each weight is rounded to a whole number from minus 128 to 127: ${r.q.map((v) => num(v, 0)).join(', ')}; converting back gives ${r.back.map((v) => num(v)).join(', ')}, close but not exact. 4: for an example ${QUANT.paramsB}-billion-weight model the weights take ${mem[0]} gigabytes in 32 bits, ${mem[1]} in 16 bits, ${mem[2]} in 8 bits and ${mem[3]} in 4 bits.`,
  };
}

/* ---------- preference: a person picks, the scores move ---------- */

export const PREF = { before: { a: 0.2, b: 0.5 }, picked: 'a' as 'a' | 'b', lr: 0.5 };

/** One step of reward-model training on one pair: the chance the model gave the winner, the loss, and the new scores. */
export function preferenceStep() {
  const { a, b } = PREF.before;
  const win = PREF.picked === 'a' ? a : b;
  const lose = PREF.picked === 'a' ? b : a;
  const chance = sigmoid(win - lose);
  const loss = -Math.log(chance);
  const move = PREF.lr * (1 - chance);
  const newWin = win + move;
  const newLose = lose - move;
  const after = PREF.picked === 'a' ? { a: newWin, b: newLose } : { a: newLose, b: newWin };
  return { chance, loss, move, after, chanceAfter: sigmoid(newWin - newLose) };
}

function preferenceScene(): StageScene {
  const s = preferenceStep();
  const { a, b } = PREF.before;
  const pickA = PREF.picked === 'a';
  return {
    id: 'preference',
    title: 'How a model learns what people prefer',
    lesson: 'deep-learning/rl-post-training',
    caption: 'The pick and the starting scores are an example; the update is the real pairwise-preference arithmetic, shown for a single pair.',
    stages: [
      {
        label: '1  Two answers, one question',
        note: 'an example pair of answers',
        kind: 'stack',
        cards: [
          { glyph: 'question', title: 'A question', sub: '' },
          { glyph: 'doc', title: 'Answer A', sub: 'brief, clear' },
          { glyph: 'doc', title: 'Answer B', sub: 'long, vague' },
        ],
      },
      { label: '2  A person picks one', note: 'the pick is the training signal (example)', kind: 'text', glyph: 'thumb', lines: [`They pick answer ${pickA ? 'A' : 'B'}`, 'it was clearer'] },
      {
        label: '3  The model scores both',
        note: `chance = 1 ÷ (1 + e^−(own − other)): the model favoured ${a > b ? 'A' : 'B'}`,
        kind: 'cells',
        header: true,
        rows: [
          ['', 'A', 'B'].map((t) => ({ text: t })),
          [{ text: 'score' }, { text: num(a) }, { text: num(b) }],
          [{ text: 'chance' }, { text: pct(sigmoid(a - b), 0), hot: pickA }, { text: pct(sigmoid(b - a), 0), hot: !pickA }],
        ],
      },
      {
        label: '4  Nudge the scores',
        note: `move = ${PREF.lr} × (1 − ${num(s.chance)}) = ${num(s.move)}; picked answer up, other down`,
        kind: 'cells',
        header: true,
        rows: [
          ['', 'A', 'B'].map((t) => ({ text: t })),
          [{ text: 'before' }, { text: num(a) }, { text: num(b) }],
          [{ text: 'after' }, { text: num(s.after.a), hot: pickA }, { text: num(s.after.b), hot: !pickA }],
          [{ text: 'chance' }, { text: pct(sigmoid(s.after.a - s.after.b), 0) }, { text: pct(sigmoid(s.after.b - s.after.a), 0) }],
        ],
      },
    ],
    alt: `How a model learns what people prefer, in four steps, with an example pair of answers. 1: one question gets two answers, A is brief and clear, B is long and vague. 2: a person picks answer ${pickA ? 'A' : 'B'}. 3: a reward model gives scores of ${num(a)} to A and ${num(b)} to B, so it gave A only a ${pct(sigmoid(a - b), 0)} chance of winning. 4: the scores are nudged by ${num(s.move)}, up for the picked answer and down for the other, giving A ${num(s.after.a)} and B ${num(s.after.b)}; A's chance of winning rises to ${pct(sigmoid(s.after.a - s.after.b), 0)}.`,
  };
}

/* ---------- evals: a test set, a pass rate and how sure it is ---------- */

export const EVAL = { total: 20, failed: [3, 9, 14] };

/** 95% Wilson score interval for k passes out of n. */
export function wilsonInterval(k: number, n: number, z = 1.96): { lo: number; hi: number } {
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

function evalsScene(): StageScene {
  const n = EVAL.total;
  const passed = n - EVAL.failed.length;
  const rate = passed / n;
  const w = wilsonInterval(passed, n);
  const cells: Cell[][] = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => {
      const bad = EVAL.failed.includes(r * 5 + c);
      return { text: bad ? 'fail' : 'pass', hot: bad, heat: bad ? 0.5 : 0.08 };
    }),
  );
  return {
    id: 'evals',
    title: 'How we test an AI answer',
    lesson: 'evals/evals-101',
    caption: `The test results are an example (${passed} of ${n} passed); the pass rate and its 95% Wilson interval are real arithmetic.`,
    stages: [
      { label: '1  Make a set of test cases', note: 'an example set; real ones are bigger', kind: 'text', glyph: 'check', lines: [`${n} questions with`, 'known good answers'] },
      { label: '2  Run the AI on every one', note: 'each answer is marked pass or fail (example)', kind: 'cells', rows: cells },
      { label: '3  Count the passes', note: 'passed ÷ questions asked: the measured pass rate', kind: 'text', glyph: 'chart', lines: [`${passed} of ${n} passed`, `= ${pct(rate, 0)}`] },
      {
        label: '4  How sure are we?',
        note: `95% Wilson interval: the true rate is probably in this range`,
        kind: 'bars',
        hot: 1,
        bars: [
          { label: 'Low end', value: w.lo, text: pct(w.lo) },
          { label: 'Measured', value: rate, text: pct(rate) },
          { label: 'High end', value: w.hi, text: pct(w.hi) },
        ],
      },
    ],
    alt: `How we test an AI answer, in four steps, with an example test set. 1: we make ${n} questions with known good answers. 2: the AI answers every one and each is marked pass or fail; in this example ${EVAL.failed.length} fail. 3: ${passed} of ${n} passed, which is ${pct(rate, 0)}. 4: with so few cases the true pass rate is uncertain: a 95 percent Wilson interval runs from ${pct(w.lo)} to ${pct(w.hi)}, so ${pct(rate, 0)} could easily be a little lower or higher on new questions.`,
  };
}

/* ---------- batching: one read of the weights serves everyone ---------- */

export const BATCH = { people: 16, sizes: [1, 4, 16, 64] };

export function batchRun() {
  const n = BATCH.people;
  return {
    alone: { step: stepSeconds(1) * 1000, total: totalTokS(1), each: perUserTokS(1) },
    together: { step: stepSeconds(n) * 1000, total: totalTokS(n), each: perUserTokS(n) },
    lastAlone: lastReplySeconds(1, true),
    lastBatched: lastReplySeconds(n, true),
    lastOneByOne: lastReplySeconds(n, false),
    weightsGB: weightsGB(),
    replyTokens: batchExample.replyTokens,
  };
}

function batchingScene(): StageScene {
  const b = batchRun();
  const n = BATCH.people;
  const fmtS = (s: number) => `${s.toFixed(1)} s`;
  return {
    id: 'batching',
    title: 'How a GPU serves many people at once',
    lesson: 'serving/inference-optimisation',
    caption: `Computed from example numbers: an ${batchExample.paramsB}-billion-weight model in 16-bit and an example GPU. Real products differ.`,
    stages: [
      { label: '1  Many people ask at once', note: `an example: ${n} people, ${b.replyTokens}-token replies`, kind: 'text', glyph: 'user', lines: [`${n} people at once`, `each wants ${b.replyTokens} tokens`] },
      {
        label: '2  Alone: the GPU mostly waits',
        note: `each step reads all ${b.weightsGB} GB of weights for one person`,
        kind: 'text',
        glyph: 'chip',
        lines: [`one step: ${b.alone.step.toFixed(1)} ms`, `${Math.round(b.alone.total)} tokens/s in all`],
      },
      {
        label: '3  Together: share each read',
        note: `one read of the weights serves all ${n}; each adds a little cache`,
        kind: 'text',
        glyph: 'server',
        lines: [`one step: ${b.together.step.toFixed(1)} ms`, `${grp(Math.round(b.together.total))} tokens/s in all`, `${Math.round(b.together.each)} tokens/s each`],
      },
      {
        label: '4  Everyone gets done sooner',
        note: `time until the last of ${n} has a whole reply; in turn = one by one`,
        kind: 'bars',
        hot: 1,
        bars: [
          { label: 'Just you', value: b.lastAlone / b.lastOneByOne, text: fmtS(b.lastAlone) },
          { label: 'Batched', value: b.lastBatched / b.lastOneByOne, text: fmtS(b.lastBatched) },
          { label: 'In turn', value: 1, text: fmtS(b.lastOneByOne) },
        ],
      },
    ],
    alt: `How a GPU serves many people at once, in four steps, with example numbers. 1: ${n} people send messages at the same moment and each wants a ${b.replyTokens}-token reply. 2: handled alone, each step takes ${b.alone.step.toFixed(1)} milliseconds, mostly reading the ${b.weightsGB} gigabytes of model weights from memory, for ${Math.round(b.alone.total)} tokens per second in all. 3: together in one batch the same weight read serves everyone; a step takes ${b.together.step.toFixed(1)} milliseconds, giving ${grp(Math.round(b.together.total))} tokens per second in all, ${Math.round(b.together.each)} for each person. 4: the last of the ${n} people has a whole reply after ${fmtS(b.lastBatched)} when batched, against ${fmtS(b.lastOneByOne)} if they are served one by one and ${fmtS(b.lastAlone)} for a single person alone.`,
  };
}

/* ---------- abtest: did the change really help? ---------- */

export const AB = { a: { yes: 240, n: 2000 }, b: { yes: 290, n: 2000 } };

/** Two-proportion z test (pooled) and a 95% interval for the gap (unpooled), all in fractions. */
export function twoProportions(a = AB.a, b = AB.b) {
  const p1 = a.yes / a.n;
  const p2 = b.yes / b.n;
  const gap = p2 - p1;
  const pooled = (a.yes + b.yes) / (a.n + b.n);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / a.n + 1 / b.n));
  const seGap = Math.sqrt((p1 * (1 - p1)) / a.n + (p2 * (1 - p2)) / b.n);
  return { p1, p2, gap, se, z: gap / se, lo: gap - 1.96 * seGap, hi: gap + 1.96 * seGap };
}

function abtestScene(): StageScene {
  const t = twoProportions();
  const pts = (x: number) => signed(x * 100, 1);
  return {
    id: 'abtest',
    title: 'How we know a change helped',
    lesson: 'ml/is-the-difference-real',
    caption: 'The two groups are an example; the rates, the z value and the interval are real arithmetic on those counts.',
    stages: [
      { label: '1  Split people into two groups', note: 'by chance; one sees the old version (example)', kind: 'text', glyph: 'user', lines: [`A: ${grp(AB.a.n)} people, old`, `B: ${grp(AB.b.n)} people, new`] },
      {
        label: '2  Count who succeeded',
        note: 'an example outcome, such as "found the answer"',
        kind: 'cells',
        header: true,
        rows: [
          ['group', 'yes', 'of', 'rate'].map((x) => ({ text: x })),
          [{ text: 'A old' }, { text: String(AB.a.yes) }, { text: grp(AB.a.n) }, { text: pct(t.p1) }],
          [{ text: 'B new' }, { text: String(AB.b.yes), hot: true }, { text: grp(AB.b.n) }, { text: pct(t.p2), hot: true }],
        ],
      },
      {
        label: '3  Is the gap more than luck?',
        note: 'a z beyond 1.96 happens under 5% of the time by luck alone',
        kind: 'text',
        glyph: 'chart',
        lines: [`gap: ${pts(t.gap)} points`, `luck wobble: ${(t.se * 100).toFixed(2)} pts`, `z = ${t.z.toFixed(2)}`],
      },
      {
        label: '4  The range it could be',
        note: '95% range for the gap, in points; it stays above 0',
        kind: 'bars',
        hot: 1,
        bars: [
          { label: 'Low end', value: t.lo / t.hi, text: pts(t.lo) },
          { label: 'Measured', value: t.gap / t.hi, text: pts(t.gap) },
          { label: 'High end', value: 1, text: pts(t.hi) },
        ],
      },
    ],
    alt: `How we know a change helped, in four steps, with example groups. 1: people are split by chance into group A, ${grp(AB.a.n)} people who see the old version, and group B, ${grp(AB.b.n)} people who see the new one. 2: ${AB.a.yes} of A succeeded, ${pct(t.p1)}, and ${AB.b.yes} of B, ${pct(t.p2)}. 3: the gap is ${pts(t.gap)} points; with a luck-sized wobble of ${(t.se * 100).toFixed(2)} points the z value is ${t.z.toFixed(2)}, beyond 1.96, which luck alone would rarely produce. 4: the 95 percent range for the gap runs from ${pts(t.lo)} to ${pts(t.hi)} points, above zero, so the change very likely helped.`,
  };
}

/* ---------- drift: the inputs move before the complaints come ---------- */

export const DRIFT = { rate: 0.03, days: [10, 20, 40, 60] };

export function driftRun() {
  const sim = simulateDrift(DRIFT.rate);
  return {
    sim,
    launchAcc: sim.acc[WINDOW - 1],
    shift: DRIFT.days.map((d) => sim.shift[d]),
    acc: DRIFT.days.map((d) => sim.acc[d]),
    alertDay: sim.alertDay,
    complaintDay: sim.complaintDay,
    warning: warningDays(sim),
  };
}

function driftScene(): StageScene {
  const r = driftRun();
  if (r.alertDay === null || r.complaintDay === null || r.warning === null) throw new Error('the drift example must alert and then slip');
  const maxShift = Math.max(...r.shift);
  return {
    id: 'drift',
    title: 'How we notice a model getting worse',
    lesson: 'systems/monitoring-and-drift',
    caption: 'A simulation with made-up data and an example drift speed, computed by running it; real drift is messier and needs many checks.',
    stages: [
      { label: '1  A model launches', note: 'example: 200 labelled cases a day; day 0 is launch', kind: 'text', glyph: 'check', lines: ['It tests well:', `${pct(r.launchAcc, 0)} right`] },
      {
        label: '2  The inputs slowly shift',
        note: 'how far the 7-day average moved, in launch spreads',
        kind: 'bars',
        hot: 3,
        bars: DRIFT.days.map((d, i) => ({ label: `day ${d}`, value: r.shift[i] / maxShift, text: num(r.shift[i]) })),
      },
      {
        label: '3  The accuracy slips',
        note: '7-day accuracy; bars start at 50%',
        kind: 'bars',
        hot: 3,
        bars: DRIFT.days.map((d, i) => ({ label: `day ${d}`, value: (r.acc[i] - 0.5) / 0.5, text: pct(r.acc[i], 0) })),
      },
      {
        label: '4  A monitor warns first',
        note: `alert at a shift of ${num(ALERT_SHIFT)}; users complain below ${pct(COMPLAINT_ACCURACY, 0)} accuracy`,
        kind: 'text',
        glyph: 'bell',
        lines: [`alert: day ${r.alertDay}`, `complaints: day ${r.complaintDay}`, `${r.warning} days of warning`],
      },
    ],
    alt: `How we notice a model getting worse, in four steps, from a simulation with made-up data. 1: a model launches and tests well, about ${pct(r.launchAcc, 0)} right. 2: the inputs slowly shift; the 7-day average has moved ${DRIFT.days.map((d, i) => `${num(r.shift[i])} by day ${d}`).join(', ')} launch spreads. 3: the 7-day accuracy slips: ${DRIFT.days.map((d, i) => `${pct(r.acc[i], 0)} by day ${d}`).join(', ')}. 4: a monitor that needs no labels alerts on day ${r.alertDay}, when the shift passes ${num(ALERT_SHIFT)}; users would only complain on day ${r.complaintDay}, when accuracy drops below ${pct(COMPLAINT_ACCURACY, 0)}, which is ${r.warning} days of warning.`,
  };
}

/* ---------- speech: slices, pitch bands, a model step, words ---------- */

/** Four slices of 8 made-up sample values. */
export const SPEECH_SLICES: number[][] = [
  [3, -3, 3, -3, 2, -2, 3, -3],
  [4, 4, 3, 3, -3, -3, -4, -4],
  [3, 3, 4, 4, -2, -2, -3, -3],
  [0, 1, 0, -1, 0, 0, 1, 0],
];
export const SPEECH_LETTERS = ['h', 'i', '_'] as const;
/** Example weights of the stand-in model: letter h listens to the high band, i to the low band, and "_" (nothing) has a fixed score. */
export const SPEECH_MODEL = { h: [0.5, 0, 0], i: [0, 0, 0.5], blank: 1 };

const meanSquare = (a: number[]): number => a.reduce((s, v) => s + v * v, 0) / a.length;

/** Energy in three pitch bands from a 3-level Haar split (sums and differences of neighbours, no trigonometry). */
export function haarBands(slice: number[]): { high: number; mid: number; low: number } {
  const pairs = (a: number[]) => Array.from({ length: a.length / 2 }, (_, i) => [a[2 * i], a[2 * i + 1]]);
  const d1 = pairs(slice).map(([a, b]) => (a - b) / 2);
  const s1 = pairs(slice).map(([a, b]) => (a + b) / 2);
  const d2 = pairs(s1).map(([a, b]) => (a - b) / 2);
  const s2 = pairs(s1).map(([a, b]) => (a + b) / 2);
  const d3 = [(s2[0] - s2[1]) / 2];
  const s3 = [(s2[0] + s2[1]) / 2];
  return { high: meanSquare(d1), mid: meanSquare(d2), low: meanSquare([...d3, ...s3]) };
}

/** First step of CTC-style decoding: a letter repeated in neighbouring slices counts once. */
export const mergeRepeats = (letters: string[]): string[] => letters.filter((l, i) => l !== letters[i - 1]);
/** Second step: blanks are dropped. */
export const collapseLetters = (letters: string[]): string[] => mergeRepeats(letters).filter((l) => l !== '_');

const dot = (a: number[], b: number[]): number => a.reduce((s, v, i) => s + v * b[i], 0);

export function speechRun() {
  const bands = SPEECH_SLICES.map(haarBands);
  const probs = bands.map((b) => softmax([dot(SPEECH_MODEL.h, [b.high, b.mid, b.low]), dot(SPEECH_MODEL.i, [b.high, b.mid, b.low]), SPEECH_MODEL.blank]));
  const picks = probs.map((p) => SPEECH_LETTERS[p.indexOf(Math.max(...p))]);
  const sure = probs.map((p) => Math.max(...p));
  return { bands, probs, picks, sure, word: collapseLetters([...picks]).join('') };
}

function speechScene(): StageScene {
  const r = speechRun();
  const head = ['', ...SPEECH_SLICES.map((_, i) => String(i + 1))].map((text) => ({ text }));
  const maxE = Math.max(...r.bands.flatMap((b) => [b.high, b.mid, b.low]));
  const band = (name: 'high' | 'mid' | 'low'): Cell[] => [{ text: name }, ...r.bands.map((b) => ({ text: b[name].toFixed(2), heat: b[name] / maxE }))];
  const repeats = mergeRepeats([...r.picks]);
  return {
    id: 'speech',
    title: 'How speech becomes text',
    lesson: 'audio/speech-recognition',
    caption: 'Real arithmetic on 32 example sample values; the model weights are an example, and real recognisers use large trained networks.',
    stages: [
      {
        label: '1  Sound is cut into slices',
        note: `${SPEECH_SLICES.length} slices × ${SPEECH_SLICES[0].length} samples = ${SPEECH_SLICES.flat().length} example numbers`,
        kind: 'text',
        glyph: 'bell',
        lines: ['A short clip of', 'someone talking'],
      },
      { label: '2  Energy in each pitch band', note: 'high, mid, low from a simple filter split (not a full spectrogram)', kind: 'cells', header: true, rows: [head, band('high'), band('mid'), band('low')] },
      {
        label: '3  A model picks a letter',
        note: 'example weights; "_" means nothing new is said',
        kind: 'cells',
        header: true,
        rows: [head, [{ text: 'letter' }, ...r.picks.map((l) => ({ text: l, hot: l !== '_' }))], [{ text: 'sure' }, ...r.sure.map((p) => ({ text: pct(p, 0), heat: p * 0.8 }))]],
      },
      {
        label: '4  Letters become words',
        note: 'repeats are merged and blanks dropped',
        kind: 'text',
        glyph: 'pen',
        lines: [r.picks.join(' '), `merge repeats: ${repeats.join(' ')}`, `drop blanks: "${r.word}"`],
      },
    ],
    alt: `How speech becomes text, in four steps, with real arithmetic on example numbers. 1: a short clip is cut into ${SPEECH_SLICES.length} slices of ${SPEECH_SLICES[0].length} sample values, ${SPEECH_SLICES.flat().length} numbers in all. 2: for each slice the energy in a high, a middle and a low pitch band is worked out with a simple filter split: high ${r.bands.map((b) => b.high.toFixed(2)).join(', ')}; mid ${r.bands.map((b) => b.mid.toFixed(2)).join(', ')}; low ${r.bands.map((b) => b.low.toFixed(2)).join(', ')}. 3: a stand-in model with example weights picks the most likely letter for each slice, ${r.picks.join(' ')}, with confidence ${r.sure.map((p) => pct(p, 0)).join(', ')}. 4: repeated letters are merged and blanks dropped, giving the text ${r.word}.`,
  };
}

/* ---------- mcp: an agent, a shared protocol, two tool servers ---------- */

/** The same running example as the MCP lesson: a work assistant with an issue tracker and a notes folder. */
export const MCP_SERVERS = [
  { name: 'Issues server', tools: ['create_issue', 'search_issues'], resources: [] as string[] },
  { name: 'Notes server', tools: ['search_notes'], resources: ['read_note'] },
];
export const mcpToolCount = (): number => MCP_SERVERS.reduce((n, s) => n + s.tools.length, 0);

function mcpScene(): StageScene {
  const total = mcpToolCount();
  const call = MCP_SERVERS[0];
  const counts = MCP_SERVERS.map((s) => `${s.tools.length} tool${s.tools.length === 1 ? '' : 's'}`);
  return {
    id: 'mcp',
    title: 'How an agent finds and uses tools',
    lesson: 'rag-agents/mcp-in-depth',
    caption: 'An example in the style of the MCP lesson: the task, the two servers and their tools are made up; the roles of host, client and server are real.',
    stages: [
      { label: '1  An agent gets a task', note: 'an example task in an app that hosts the agent', kind: 'text', glyph: 'target', lines: ['"File an issue for', 'the bug in my notes"'] },
      {
        label: '2  It asks what is on offer',
        note: `${MCP_SERVERS.length} example servers list ${total} tools in one shared format`,
        kind: 'stack',
        hot: 1,
        cards: [
          { glyph: 'user', title: 'Agent + client', sub: 'host app' },
          { glyph: 'network', title: 'MCP', sub: 'shared format' },
          { glyph: 'server', title: call.name, sub: counts[0] },
          { glyph: 'server', title: MCP_SERVERS[1].name, sub: counts[1] },
        ],
      },
      { label: '3  It picks a tool and calls it', note: 'the app can ask you to approve a call first', kind: 'text', glyph: 'wrench', lines: [`call: ${call.tools[0]}`, `on: ${call.name}`, 'with: a title'] },
      { label: '4  The result comes back', note: 'the agent reads it, then writes your reply (example)', kind: 'text', glyph: 'check', lines: ['result: created', 'goes back to the agent'] },
    ],
    alt: `How an agent finds and uses tools, in four steps, with an example. 1: an agent in a host app gets a task, file an issue for the bug in my notes. 2: through a client and a shared protocol, MCP, it asks each server what it offers: ${MCP_SERVERS.map((s, i) => `the ${s.name} has ${counts[i]}`).join(' and ')}, ${total} tools in all. 3: it picks ${call.tools[0]} on the ${call.name} and calls it with a title; the app can ask you to approve the call first. 4: the server sends the result, created, back to the agent, which reads it and writes the reply.`,
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
  attentionScene(),
  bpeScene(),
  embeddingsScene(),
  loraScene(),
  quantizationScene(),
  preferenceScene(),
  evalsScene(),
  batchingScene(),
  abtestScene(),
  driftScene(),
  speechScene(),
  mcpScene(),
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
