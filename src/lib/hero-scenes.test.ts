import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { shuffled } from './daily-card';
import { affineParams, quantise } from './int-quant';
import { example as batchExample, lastReplySeconds, perUserTokS, stepSeconds, totalTokS } from './whatif/no-batching';
import { simulate } from './whatif/no-drift-monitoring';
import { wilson } from './whatif/no-evals';
import {
  AB,
  AGENT_TRACE,
  ATTN,
  BATCH,
  BPE,
  BPE_TEXT,
  DRIFT,
  EMB_WORDS,
  EVAL,
  LORA,
  MCP_SERVERS,
  PREF,
  QUANT,
  SPEECH_SLICES,
  EDGE_KERNEL,
  GUARD_CHECKS,
  HEAR,
  HERO_SCENES,
  HEAR_SLICES,
  KV,
  LEARN,
  NEXT,
  NOTE_CHARS,
  RAG_QUERY,
  SERVE,
  SPAM,
  T_PICTURE,
  attentionResult,
  attentionScores,
  batchRun,
  bpeRun,
  clueWeight,
  collapseLetters,
  compact,
  driftRun,
  embeddingNeighbours,
  fullParams,
  grp,
  haarBands,
  loraParams,
  mcpToolCount,
  mergeRepeats,
  preferenceStep,
  quantRun,
  speechRun,
  twoProportions,
  weightGB,
  wilsonInterval,
  cosine,
  edgeMap,
  hearingResult,
  isStaged,
  learnLoss,
  learnSlope,
  learnSteps,
  loopCentres,
  loopPath,
  nextProbs,
  num,
  pct,
  pickScene,
  ragScores,
  sceneProblems,
  serveTimes,
  sliceEnergy,
  softmax,
  spamVerdict,
  wrapText,
  type Scene,
  type StageScene,
} from './hero-scenes';

const staged = HERO_SCENES.filter(isStaged);
const get = (id: string): StageScene => {
  const s = staged.find((x) => x.id === id);
  if (!s) throw new Error(`no scene ${id}`);
  return s;
};
const stage = (id: string, i: number) => get(id).stages[i];
/** Every piece of text a stage shows, for "is this number really on screen" checks. */
const textOf = (id: string, i: number): string => JSON.stringify(stage(id, i));

describe('the scene list', () => {
  it('has the chatbot (drawn by HeroFlow) plus 22 stage scenes', () => {
    expect(HERO_SCENES).toHaveLength(23);
    expect(HERO_SCENES.map((s) => s.id).sort()).toEqual(
      [
        'abtest', 'agent', 'attention', 'batching', 'bpe', 'chatbot', 'drift', 'embeddings', 'evals', 'guardrails', 'hearing', 'image', 'kv-cache',
        'learning', 'lora', 'mcp', 'next-word', 'preference', 'quantization', 'rag', 'serving', 'spam', 'speech',
      ].sort(),
    );
    const chatbot = HERO_SCENES.find((s) => s.id === 'chatbot')!;
    expect(chatbot.component).toBe('HeroFlow');
    expect(chatbot.stages).toEqual([]);
    expect(staged).toHaveLength(22);
  });
  it('has unique ids and every stage scene has exactly four stages', () => {
    expect(new Set(HERO_SCENES.map((s) => s.id)).size).toBe(HERO_SCENES.length);
    for (const s of staged) expect(s.stages).toHaveLength(4);
  });
  it('links only to lessons that exist', () => {
    for (const s of HERO_SCENES) {
      const [track, slug, ...rest] = s.lesson.split('/');
      expect(rest, s.id).toEqual([]);
      const file = fileURLToPath(new URL(`../content/lessons/${track}/${slug}.mdx`, import.meta.url));
      expect(existsSync(file), `${s.id} -> ${s.lesson}`).toBe(true);
    }
  });
  it('links the lessons the brief asked for', () => {
    const want: Record<string, string> = {
      rag: 'rag-agents/rag-from-scratch',
      agent: 'rag-agents/agents-and-tool-use',
      learning: 'foundations/how-models-learn',
      'kv-cache': 'serving/kv-cache-and-memory',
      serving: 'serving/life-of-a-request',
      hearing: 'audio/noise-suppression-and-hearing-devices',
      guardrails: 'evals/guardrails-in-practice',
      image: 'deep-learning/how-computers-see',
      attention: 'foundations/attention-intuition',
      bpe: 'deep-learning/build-a-tokenizer',
      embeddings: 'foundations/tokens-and-embeddings',
      lora: 'llm/fine-tuning-in-practice',
      quantization: 'edge/quantization-for-edge',
      preference: 'deep-learning/rl-post-training',
      evals: 'evals/evals-101',
      batching: 'serving/inference-optimisation',
      abtest: 'ml/is-the-difference-real',
      drift: 'systems/monitoring-and-drift',
      speech: 'audio/speech-recognition',
      mcp: 'rag-agents/mcp-in-depth',
    };
    for (const [id, lesson] of Object.entries(want)) expect(get(id).lesson).toBe(lesson);
  });
  it('fits every label, note, line and cell in the layout, and says what is an example', () => {
    for (const s of HERO_SCENES) expect(sceneProblems(s), s.id).toEqual([]);
  });
  it('every note wraps to at most two short lines', () => {
    for (const s of staged) for (const st of s.stages) expect(wrapText(st.note, NOTE_CHARS).length).toBeLessThanOrEqual(2);
  });
  it('has a full text alternative for each figure', () => {
    for (const s of HERO_SCENES) expect(s.alt.length, s.id).toBeGreaterThan(120);
  });
  it('flags a broken scene', () => {
    const broken = { ...get('rag'), stages: get('rag').stages.slice(0, 3), caption: 'nothing here' } as Scene;
    expect(sceneProblems(broken).length).toBeGreaterThan(1);
  });
});

describe('number helpers', () => {
  it('formats with a real minus and never shows negative zero', () => {
    expect(num(-18.666, 2)).toBe('−18.67');
    expect(num(-0.001, 2)).toBe('0.00');
    expect(pct(0.52861)).toBe('52.9%');
  });
  it('softmax sums to 1 and a lower temperature sharpens it', () => {
    const p = softmax([1, 2, 3]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(softmax([1, 2, 3], 0.5)[2]).toBeGreaterThan(p[2]);
    expect(softmax([1, 2, 3], 5)[2]).toBeLessThan(p[2]);
    expect(softmax([1000, 1000])).toEqual([0.5, 0.5]); // no overflow
  });
  it('cosine similarity is 1 for the same direction and 0 for a right angle', () => {
    expect(cosine([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
    expect(cosine([1, 0], [0, 1])).toBe(0);
  });
  it('wraps words greedily', () => {
    expect(wrapText('one two three four', 8)).toEqual(['one two', 'three', 'four']);
  });
});

describe('rag', () => {
  it('scores each passage with cosine similarity, best first', () => {
    const r = ragScores();
    expect(r.map((p) => p.short)).toEqual(['Returns', 'Refunds', 'Shipping', 'Hours']);
    // worked by hand: q = (0.9, 0.3, 0.1); p1 = (0.9, 0.2, 0.1): dot 0.88, norms sqrt(0.91) and sqrt(0.86)
    expect(r[0].score).toBeCloseTo(0.88 / (Math.sqrt(0.91) * Math.sqrt(0.86)), 12);
    expect(r.map((p) => p.score.toFixed(2))).toEqual(['0.99', '0.90', '0.43', '0.24']);
    expect(RAG_QUERY).toEqual([0.9, 0.3, 0.1]);
  });
  it('shows those scores as the bars and pastes the top two', () => {
    const bars = stage('rag', 1);
    expect(bars.kind === 'bars' && bars.bars.map((b) => b.text)).toEqual(['0.99', '0.90', '0.43', '0.24']);
    const stack = stage('rag', 2);
    expect(stack.kind === 'stack' && stack.cards.map((c) => c.title)).toEqual(['Instructions', 'Returns policy', 'Refund steps', 'Your question']);
  });
});

describe('agent', () => {
  it('has a loop stage and a trace with a step count that matches', () => {
    const loop = stage('agent', 3);
    expect(loop.kind).toBe('loop');
    expect(loop.kind === 'loop' && loop.nodes.length).toBe(4);
    expect(AGENT_TRACE).toHaveLength(3);
    expect(stage('agent', 3).note).toContain('3 steps');
    expect(textOf('agent', 2)).toContain('step 1 of 3');
  });
});

describe('learning', () => {
  it('computes the loss and the slope for w = 0', () => {
    // misses 2, 4, 6: (4 + 16 + 36) / 3
    expect(learnLoss(0)).toBeCloseTo(56 / 3, 12);
    // mean of 2 * (0 - y) * x = -2 * (2 + 8 + 18) / 3
    expect(learnSlope(0)).toBeCloseTo(-56 / 3, 12);
  });
  it('is real gradient descent with learning rate 0.1', () => {
    expect(LEARN.lr).toBe(0.1);
    const s = learnSteps();
    expect(s.map((x) => x.step)).toEqual([0, 1, 2, 3]);
    expect(s[0].w).toBe(0);
    expect(s[1].w).toBeCloseTo(0 - 0.1 * (-56 / 3), 12); // 1.8667
    for (let k = 1; k < s.length; k++) expect(s[k].w).toBeCloseTo(s[k - 1].w - LEARN.lr * s[k - 1].slope, 12);
    // the error shrinks by the same factor every step: 1 - 0.1 * 28/3
    const factor = 1 - (LEARN.lr * 28) / 3;
    for (let k = 1; k < s.length; k++) expect(2 - s[k].w).toBeCloseTo((2 - s[k - 1].w) * factor, 12);
    for (let k = 1; k < s.length; k++) expect(s[k].loss).toBeLessThan(s[k - 1].loss);
    expect(num(s[0].loss)).toBe('18.67');
    expect(s.map((x) => num(x.w))).toEqual(['0.00', '1.87', '1.99', '2.00']);
    expect(num(s[1].loss)).toBe('0.08');
  });
  it('shows those numbers on screen', () => {
    expect(textOf('learning', 1)).toContain('18.67');
    expect(textOf('learning', 2)).toContain('slope  −18.67');
    expect(textOf('learning', 2)).toContain('w: 0.00 → 1.87');
    const last = stage('learning', 3);
    expect(last.kind === 'cells' && last.rows.map((r) => r.map((c) => c.text))).toEqual([
      ['step', 'w', 'loss'],
      ['0', '0.00', '18.67'],
      ['1', '1.87', '0.08'],
      ['2', '1.99', '<0.01'],
      ['3', '2.00', '<0.01'],
    ]);
  });
});

describe('next-word', () => {
  it('turns the example scores into percentages with a real softmax', () => {
    const p = nextProbs(1);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    const sum = NEXT.scores.reduce((a, s) => a + Math.exp(s), 0);
    expect(p[0]).toBeCloseTo(Math.exp(4) / sum, 12);
    expect(p.map((x) => pct(x))).toEqual(['52.9%', '23.8%', '17.6%', '3.9%', '1.8%']);
  });
  it('a lower temperature gives the top word more of the share', () => {
    const lo = nextProbs(NEXT.lowT);
    expect(lo.map((x) => pct(x))).toEqual(['75.8%', '15.3%', '8.4%', '0.4%', '0.1%']);
    expect(lo[0]).toBeGreaterThan(nextProbs(1)[0]);
    // dividing by T = 0.5 doubles every score
    const sum = NEXT.scores.reduce((a, s) => a + Math.exp(s / 0.5), 0);
    expect(lo[0]).toBeCloseTo(Math.exp(8) / sum, 12);
  });
  it('shows both on screen and adds the word', () => {
    const t1 = stage('next-word', 1);
    expect(t1.kind === 'bars' && t1.bars.map((b) => b.text)).toEqual(['52.9%', '23.8%', '17.6%', '3.9%', '1.8%']);
    const t2 = stage('next-word', 2);
    expect(t2.kind === 'bars' && t2.bars.map((b) => b.label)).toEqual(['mat 8.0', 'sofa 6.4', 'floor 5.8', 'roof 2.8', 'moon 1.2']);
    expect(t2.note).toContain('52.9% to 75.8%');
    const last = stage('next-word', 3);
    expect(last.kind === 'chips' && last.chips.map((c) => c.text)).toEqual(['The', 'cat', 'sat', 'on', 'the', 'mat']);
  });
});

describe('kv-cache', () => {
  it('counts the work with the same rule as the what-if page', () => {
    expect(KV).toEqual({ prompt: 10, reply: 8 });
    const no = stage('kv-cache', 1);
    expect(no.kind === 'chips' && no.chips.map((c) => c.sub)).toEqual(['10', '11', '12', '13', '14', '15', '16', '17']);
    const yes = stage('kv-cache', 2);
    expect(yes.kind === 'chips' && yes.chips.map((c) => c.sub)).toEqual(['10', '1', '1', '1', '1', '1', '1', '1']);
    expect(no.note).toContain('108');
    expect(yes.note).toContain('17');
  });
  it('compares the totals', () => {
    const bars = stage('kv-cache', 3);
    expect(bars.kind === 'bars' && bars.bars.map((b) => b.text)).toEqual(['108', '17', '91']);
    expect(bars.kind === 'bars' && bars.bars[1].value).toBeCloseTo(17 / 108, 12);
    expect(bars.note).toContain('6.4 times');
    expect(get('kv-cache').caption).toContain('128 KiB');
  });
});

describe('image', () => {
  it('is a real 6 by 6 picture and a real 4 by 4 vertical-edge map', () => {
    expect(T_PICTURE).toHaveLength(6);
    for (const r of T_PICTURE) expect(r).toHaveLength(6);
    expect(EDGE_KERNEL.w).toEqual([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]);
    const m = edgeMap();
    expect(m).toHaveLength(4);
    expect(m[0]).toHaveLength(4);
    // worked by hand: rows 2 to 4, columns 0 to 2 are each 1, 1, 8: (8 - 1) * (1 + 2 + 1) = 28
    expect(m[2][0]).toBe(28);
    // columns 2 to 4 are each 8, 8, 1: (1 - 8) * 4 = -28
    expect(m[2][2]).toBe(-28);
    expect(m[2]).toEqual([28, 28, -28, -28]);
    // top rows, columns 0 to 2: row 0 is flat (0), rows 1 and 2 give 7 each, weighted 2 and 1
    expect(m[0][0]).toBe(0 * 1 + 7 * 2 + 7 * 1);
  });
  it('shows the numbers on screen', () => {
    const grid = stage('image', 0);
    expect(grid.kind === 'cells' && grid.rows.map((r) => r.map((c) => c.text).join(''))).toEqual(['888888', '118811', '118811', '118811', '118811', '118811']);
    const edges = stage('image', 1);
    expect(edges.kind === 'cells' && edges.rows.flat().map((c) => c.text)).toEqual(edgeMap().flat().map((v) => num(v, 0)));
    expect(edges.kind === 'cells' && edges.side).toEqual(['filter:', '−1 0 1', '−2 0 2', '−1 0 1']);
  });
});

describe('serving', () => {
  it('computes timings from the stated example rates', () => {
    expect(SERVE).toEqual({ networkMs: 30, ahead: 3, admitMs: 20, promptTokens: 200, prefillPerSec: 4000, replyTokens: 60, decodePerSec: 25 });
    const t = serveTimes();
    expect(t.queue).toBe(60);
    expect(t.prefill).toBe(50); // 200 tokens at 4,000 per second
    expect(t.firstWord).toBe(140); // 30 + 60 + 50
    expect(t.streaming).toBe(2360); // 59 more tokens at 25 per second = 40 ms each
    expect(t.total).toBe(2500);
  });
  it('shows them on screen', () => {
    const bars = stage('serving', 3);
    expect(bars.kind === 'bars' && bars.bars.map((b) => b.text)).toEqual(['30 ms', '60 ms', '50 ms', '2.36 s']);
    expect(bars.note).toContain('140 ms');
    expect(bars.note).toContain('2.50 s');
    expect(bars.kind === 'bars' && bars.bars.reduce((a, b) => a + b.value, 0)).toBeCloseTo(1, 12);
    expect(stage('serving', 1).note).toContain('60 ms');
    expect(stage('serving', 2).note).toContain('50 ms');
    expect(stage('serving', 2).note).toContain('4,000');
  });
});

describe('hearing', () => {
  it('computes loudness as the mean of squares and decides with a threshold', () => {
    expect(sliceEnergy([3, -2, 3, -3])).toBe(7.75);
    expect(HEAR_SLICES).toHaveLength(8);
    const h = hearingResult();
    expect(h.energy).toEqual([0.75, 0.5, 7.75, 6.5, 6.5, 0.75, 4.5, 0.5]);
    expect(h.speech).toEqual([false, false, true, true, true, false, true, false]);
    expect(h.gain).toEqual([0.2, 0.2, 1, 1, 1, 0.2, 1, 0.2]);
    expect(HEAR.threshold).toBe(2);
    expect(h.out[0]).toBeCloseTo(0.75 * 0.04, 12);
    expect(h.out[2]).toBe(7.75);
  });
  it('shows the numbers on screen', () => {
    const s2 = stage('hearing', 1);
    expect(s2.kind === 'cells' && s2.rows[1].map((c) => c.text)).toEqual(['0.75', '0.50', '7.75', '6.50', '6.50', '0.75', '4.50', '0.50']);
    const s3 = stage('hearing', 2);
    expect(s3.kind === 'cells' && s3.rows[1].map((c) => c.text)).toEqual(['no', 'no', 'yes', 'yes', 'yes', 'no', 'yes', 'no']);
    const s4 = stage('hearing', 3);
    expect(s4.kind === 'cells' && s4.rows[0].map((c) => c.text)).toEqual(['×0.2', '×0.2', '×1', '×1', '×1', '×0.2', '×1', '×0.2']);
    expect(s4.kind === 'cells' && s4.rows[1].map((c) => c.text)).toEqual(['0.03', '0.02', '7.75', '6.50', '6.50', '0.03', '4.50', '0.02']);
    expect(stage('hearing', 0).note).toContain('32 numbers');
  });
});

describe('spam', () => {
  it('weighs each clue by how much likelier it is in spam, with add-one smoothing', () => {
    const w = SPAM.clues.map(clueWeight);
    expect(w[0]).toBeCloseTo(Math.log(13 / 2), 12);
    expect(w[1]).toBeCloseTo(Math.log(10), 12);
    expect(w[2]).toBeCloseTo(Math.log(7 / 2), 12);
    expect(w[3]).toBeCloseTo(Math.log(1 / 11), 12);
    expect(w[3]).toBeLessThan(0);
  });
  it('adds the evidence and turns it into a probability', () => {
    const v = spamVerdict();
    expect(v.prior).toBe(0);
    expect(v.total).toBeCloseTo(Math.log(13 / 2) + Math.log(10) + Math.log(7 / 2) + Math.log(1 / 11), 12);
    expect(v.total).toBeCloseTo(3.0293, 3);
    expect(v.probability).toBeCloseTo(1 / (1 + Math.exp(-v.total)), 12);
    expect(v.probability).toBeCloseTo(0.9539, 3);
  });
  it('shows the numbers on screen', () => {
    const bars = stage('spam', 2);
    expect(bars.kind === 'bars' && bars.bars.map((b) => b.text)).toEqual(['+1.87', '+2.30', '+1.25', '−2.40', '+3.03']);
    expect(bars.kind === 'bars' && bars.bars.map((b) => !!b.negative)).toEqual([false, false, false, true, false]);
    const chips = stage('spam', 1);
    expect(chips.kind === 'chips' && chips.chips.map((c) => c.sub)).toEqual(['12 vs 1', '9 vs 0', '6 vs 1', '0 vs 10']);
    expect(textOf('spam', 3)).toContain('95% likely spam');
  });
});

describe('guardrails', () => {
  it('counts the checks that passed', () => {
    const all = [...GUARD_CHECKS.input, ...GUARD_CHECKS.output];
    expect(all).toHaveLength(6);
    expect(stage('guardrails', 3).note).toContain('6 of 6 checks passed (example)');
    expect(stage('guardrails', 1).note).toContain('example');
  });
});

const bars = (id: string, i: number) => {
  const s = stage(id, i);
  if (s.kind !== 'bars') throw new Error(`${id} stage ${i + 1} is not bars`);
  return s.bars;
};
const cells = (id: string, i: number) => {
  const s = stage(id, i);
  if (s.kind !== 'cells') throw new Error(`${id} stage ${i + 1} is not cells`);
  return s.rows.map((r) => r.map((c) => c.text));
};

describe('attention', () => {
  it('scores each word with query dot key over the square root of 4', () => {
    // worked by hand for "cat": (2*1 + 2*0.8 + 0*0.1 + 2*0.6) / 2 = 4.8 / 2 = 2.4
    const s = attentionScores();
    expect(s[1]).toBeCloseTo(2.4, 12);
    expect(s.map((x) => x.toFixed(1))).toEqual(['0.2', '2.4', '0.5', '1.2', '0.7']);
    expect(ATTN.query).toHaveLength(4);
  });
  it('turns the scores into weights that add up to 1, and blends the values', () => {
    const a = attentionResult();
    expect(a.weights.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 12);
    const sum = a.scores.reduce((x, v) => x + Math.exp(v), 0);
    expect(a.weights[1]).toBeCloseTo(Math.exp(2.4) / sum, 12);
    expect(a.weights.map((w) => pct(w, 0))).toEqual(['6%', '57%', '9%', '17%', '10%']);
    expect(a.mix[0]).toBeCloseTo(a.weights.reduce((x, w, i) => x + w * ATTN.values[i][0], 0), 12);
    expect(a.mix.map((v) => v.toFixed(2))).toEqual(['0.69', '0.24']);
  });
  it('shows them on screen', () => {
    expect(bars('attention', 1).map((b) => b.text)).toEqual(['0.2', '2.4', '0.5', '1.2', '0.7']);
    expect(bars('attention', 2).map((b) => b.text)).toEqual(['6%', '57%', '9%', '17%', '10%']);
    expect(textOf('attention', 3)).toContain('[0.69, 0.24]');
    expect(stage('attention', 2).note).toContain('cat gets 57%');
  });
});

describe('bpe', () => {
  it('runs real merges on the 68-character example, matching the tokenizer lesson', () => {
    expect(BPE_TEXT).toHaveLength(68);
    const r = bpeRun();
    expect(r.start).toBe(68);
    expect(r.merges.map((m) => m.name)).toEqual(['at', 'he', 'the', '·the']);
    // the lesson's table: 59, 53, 47, 42 tokens after merges 1 to 4
    expect(r.merges.map((m) => m.left)).toEqual([59, 53, 47, 42]);
    expect(r.merges.map((m) => m.count)).toEqual([9, 6, 6, 5]);
    expect(r.pairs.map((p) => [p.name, p.count])).toEqual([['a+t', 9], ['h+e', 6], ['t+h', 6], ['·+t', 5]]);
    // every merge removes exactly as many pieces as the pair occurred
    expect(68 - r.merges[0].count).toBe(r.merges[0].left);
  });
  it('cuts the sample phrase into fewer pieces than letters', () => {
    const r = bpeRun();
    expect(BPE.sample).toBe('the cat sat');
    expect(r.sampleBytes).toBe(11);
    expect(r.sample.map((c) => c.text)).toEqual(['the', '·', 'c', 'at', '·', 's', 'at']);
    expect(stage('bpe', 3).note).toContain('11 letters became 7 pieces');
  });
  it('shows the pieces left after each merge', () => {
    const s = stage('bpe', 2);
    expect(s.kind === 'chips' && s.chips.map((c) => c.sub)).toEqual(['59', '53', '47', '42']);
    expect(bars('bpe', 1).map((b) => b.text)).toEqual(['9', '6', '6', '5']);
    expect(stage('bpe', 0).note).toContain('68 pieces');
  });
});

describe('embeddings', () => {
  it('compares every word with cat using cosine similarity, best first', () => {
    const n = embeddingNeighbours();
    expect(n.map((x) => x.word)).toEqual(['kitten', 'dog', 'truck', 'car']);
    // worked by hand: cat (0.9, 0.1) and car (0.1, 0.9): dot 0.18, norms both sqrt(0.82)
    expect(n[3].score).toBeCloseTo(0.18 / 0.82, 12);
    expect(n.map((x) => x.score.toFixed(2))).toEqual(['1.00', '0.97', '0.35', '0.22']);
    expect(EMB_WORDS[0].word).toBe('cat');
  });
  it('shows the numbers and the nearest two on screen', () => {
    expect(bars('embeddings', 2).map((b) => b.text)).toEqual(['1.00', '0.97', '0.35', '0.22']);
    expect(cells('embeddings', 1)[1]).toEqual(['cat', '0.90', '0.10']);
    const stack = stage('embeddings', 3);
    expect(stack.kind === 'stack' && stack.cards.map((c) => c.title)).toEqual(['Look up: cat', 'kitten', 'dog']);
  });
});

describe('lora', () => {
  it('counts the parameters exactly, as in the fine-tuning lesson', () => {
    expect(LORA).toMatchObject({ d: 4096, rank: 16 });
    expect(fullParams(4096)).toBe(16_777_216);
    expect(loraParams(4096, 16)).toBe(131_072);
    expect(loraParams(4096, 16) / fullParams(4096)).toBeCloseTo((2 * 16) / 4096, 12);
    expect(compact(16_777_216)).toBe('16.8M');
    expect(compact(131_072)).toBe('131K');
    expect(compact(32_768)).toBe('32.8K');
    expect(grp(16_777_216)).toBe('16,777,216');
  });
  it('shows them on screen', () => {
    expect(textOf('lora', 0)).toContain('16,777,216');
    expect(bars('lora', 2).map((b) => b.text)).toEqual(['16.8M', '524K', '131K', '32.8K']);
    expect(bars('lora', 2)[2].value).toBeCloseTo(131_072 / 16_777_216, 12);
    const st = stage('lora', 1);
    expect(st.kind === 'stack' && st.cards.map((c) => c.sub)).toEqual(['frozen', '65,536', '65,536']);
    expect(textOf('lora', 3)).toContain('0.78% as many');
  });
  it('the lesson prints the same worked count', () => {
    const lesson = readFileSync(fileURLToPath(new URL('../content/lessons/llm/fine-tuning-in-practice.mdx', import.meta.url)), 'utf8');
    expect(lesson).toContain('16,777,216');
    expect(lesson).toContain('131,072');
  });
});

describe('quantization', () => {
  it('maps the example weights onto int8 with a real scale and zero point', () => {
    const r = quantRun();
    expect(QUANT.weights).toEqual([-0.4, -0.12, 0, 0.31, 0.74]);
    expect(r.scale).toBeCloseTo(1.14 / 255, 12);
    expect(r.zeroPoint).toBe(-39); // round(-128 + 0.40 / scale) = round(-38.53)
    expect(r.q).toEqual([-128, -66, -39, 30, 127]);
    expect(r.q.map((v, i) => v === quantise(QUANT.weights[i], affineParams(-0.4, 0.74)))).toEqual([true, true, true, true, true]);
    // the end points land on the ends of the range, and zero maps to the zero point
    expect(r.q[2]).toBe(r.zeroPoint);
    // rounding can be off by at most half a step
    for (const e of r.err) expect(e).toBeLessThanOrEqual(r.scale / 2 + 1e-12);
  });
  it('shows them and the memory saved', () => {
    expect(cells('quantization', 2).map((row) => row[1])).toEqual(['int8', '−128', '−66', '−39', '30', '127']);
    expect(cells('quantization', 2).map((row) => row[2])).toEqual(['back', '−0.40', '−0.12', '0.00', '0.31', '0.74']);
    const st = stage('quantization', 1);
    expect(st.kind === 'stack' && st.cards.map((c) => c.sub)).toEqual(['−0.40', '0.74', '0.0045', '−39']);
    expect(weightGB(8, 8)).toBe(8);
    expect(bars('quantization', 3).map((b) => b.text)).toEqual(['32 GB', '16 GB', '8 GB', '4 GB']);
    expect(bars('quantization', 3).map((b) => b.value)).toEqual([1, 0.5, 0.25, 0.125]);
  });
});

describe('preference', () => {
  it('does one real step of reward-model training on a pair', () => {
    expect(PREF).toEqual({ before: { a: 0.2, b: 0.5 }, picked: 'a', lr: 0.5 });
    const s = preferenceStep();
    // chance the model gave the winner: sigmoid(0.2 - 0.5)
    expect(s.chance).toBeCloseTo(1 / (1 + Math.exp(0.3)), 12);
    expect(s.chance).toBeCloseTo(0.4256, 3);
    expect(s.loss).toBeCloseTo(-Math.log(s.chance), 12);
    // the slope of the loss with respect to the winner's score is -(1 - chance), so the step is lr * (1 - chance)
    const f = (w: number) => -Math.log(1 / (1 + Math.exp(-(w - 0.5))));
    const slope = (f(0.2 + 1e-6) - f(0.2 - 1e-6)) / 2e-6;
    expect(slope).toBeCloseTo(-(1 - s.chance), 6);
    expect(s.move).toBeCloseTo(0.5 * (1 - s.chance), 12);
    expect(s.after.a).toBeCloseTo(0.2 + s.move, 12);
    expect(s.after.b).toBeCloseTo(0.5 - s.move, 12);
  });
  it('moves the scores the right way and lowers the loss', () => {
    const s = preferenceStep();
    expect(s.after.a).toBeGreaterThan(PREF.before.a);
    expect(s.after.b).toBeLessThan(PREF.before.b);
    expect(s.chanceAfter).toBeGreaterThan(s.chance);
    expect(-Math.log(s.chanceAfter)).toBeLessThan(s.loss);
  });
  it('shows the numbers on screen', () => {
    expect(cells('preference', 2)).toEqual([['', 'A', 'B'], ['score', '0.20', '0.50'], ['chance', '43%', '57%']]);
    expect(cells('preference', 3)).toEqual([['', 'A', 'B'], ['before', '0.20', '0.50'], ['after', '0.49', '0.21'], ['chance', '57%', '43%']]);
    expect(stage('preference', 3).note).toContain('0.29');
    expect(get('preference').caption).toContain('example');
  });
});

describe('evals', () => {
  it('computes the pass rate and a 95% Wilson interval', () => {
    expect(EVAL.total - EVAL.failed.length).toBe(17);
    const w = wilsonInterval(17, 20);
    expect(w.lo).toBeCloseTo(0.6396, 4);
    expect(w.hi).toBeCloseTo(0.9476, 4);
    // the same interval as the what-if page
    expect(w.lo).toBeCloseTo(wilson(17, 20).lo, 12);
    expect(w.hi).toBeCloseTo(wilson(17, 20).hi, 12);
    // more cases, same rate: a tighter interval
    expect(wilsonInterval(170, 200).hi - wilsonInterval(170, 200).lo).toBeLessThan(w.hi - w.lo);
    expect(wilsonInterval(0, 10).lo).toBe(0);
  });
  it('shows the marks and the numbers on screen', () => {
    const grid = cells('evals', 1);
    expect(grid).toHaveLength(4);
    expect(grid.flat().filter((x) => x === 'fail')).toHaveLength(3);
    expect(grid.flat().filter((x) => x === 'pass')).toHaveLength(17);
    expect(textOf('evals', 2)).toContain('17 of 20 passed');
    expect(textOf('evals', 2)).toContain('85%');
    expect(bars('evals', 3).map((b) => b.text)).toEqual(['64.0%', '85.0%', '94.8%']);
  });
});

describe('batching', () => {
  it('reuses the what-if page numbers', () => {
    const b = batchRun();
    expect(BATCH.people).toBe(16);
    expect(b.alone.total).toBeCloseTo(totalTokS(1), 12);
    expect(b.together.total).toBeCloseTo(totalTokS(16), 12);
    expect(b.together.each).toBeCloseTo(perUserTokS(16), 12);
    expect(b.alone.step).toBeCloseTo(stepSeconds(1) * 1000, 12);
    expect(b.lastBatched).toBeCloseTo(lastReplySeconds(16, true), 12);
    expect(b.lastOneByOne).toBeCloseTo(lastReplySeconds(16, false), 12);
    // by hand: one step reads 16 GB of weights at 2,000 GB/s * 0.65 = 1,300 GB/s, 16 / 1300 s = 12.3 ms, plus one cache of 0.262 GB
    expect(b.alone.step).toBeCloseTo(((16 + 0.262144) / 1300) * 1000, 6);
    expect(b.lastOneByOne).toBeCloseTo(16 * b.lastAlone, 9);
    expect(b.together.total).toBeGreaterThan(10 * b.alone.total);
    expect(batchExample.replyTokens).toBe(200);
  });
  it('shows them on screen', () => {
    expect(textOf('batching', 1)).toContain('12.5 ms');
    expect(textOf('batching', 1)).toContain('80 tokens/s');
    expect(textOf('batching', 2)).toContain('15.5 ms');
    expect(textOf('batching', 2)).toContain('1,030 tokens/s');
    expect(textOf('batching', 2)).toContain('64 tokens/s each');
    expect(bars('batching', 3).map((b) => b.text)).toEqual(['2.5 s', '3.1 s', '40.0 s']);
  });
});

describe('abtest', () => {
  it('computes rates, a pooled two-proportion z and a 95% interval for the gap', () => {
    const t = twoProportions();
    expect(AB).toEqual({ a: { yes: 240, n: 2000 }, b: { yes: 290, n: 2000 } });
    expect(t.p1).toBe(0.12);
    expect(t.p2).toBe(0.145);
    expect(t.gap).toBeCloseTo(0.025, 12);
    // by hand: pooled 530 / 4000 = 0.1325, se = sqrt(0.1325 * 0.8675 * (1/2000 + 1/2000))
    expect(t.se).toBeCloseTo(Math.sqrt(0.1325 * 0.8675 * 0.001), 12);
    expect(t.z).toBeCloseTo(2.3318, 3);
    expect(t.lo).toBeCloseTo(0.0040, 3);
    expect(t.hi).toBeCloseTo(0.0460, 3);
    // the interval excludes zero exactly when the gap is beyond about 1.96 standard errors (close here, since the two standard errors nearly agree)
    expect(t.lo > 0).toBe(Math.abs(t.z) > 1.96);
    // no difference at all gives z = 0
    expect(twoProportions({ yes: 100, n: 1000 }, { yes: 100, n: 1000 }).z).toBe(0);
  });
  it('shows them on screen', () => {
    expect(cells('abtest', 1)).toEqual([['group', 'yes', 'of', 'rate'], ['A old', '240', '2,000', '12.0%'], ['B new', '290', '2,000', '14.5%']]);
    expect(textOf('abtest', 2)).toContain('+2.5 points');
    expect(textOf('abtest', 2)).toContain('z = 2.33');
    expect(bars('abtest', 3).map((b) => b.text)).toEqual(['+0.4', '+2.5', '+4.6']);
  });
});

describe('drift', () => {
  it('reuses the what-if simulation at one example drift speed', () => {
    const r = driftRun();
    const sim = simulate(DRIFT.rate);
    expect(r.sim.alertDay).toBe(sim.alertDay);
    expect(r.alertDay).toBe(17);
    expect(r.complaintDay).toBe(37);
    expect(r.warning).toBe(20);
    expect(r.alertDay!).toBeLessThan(r.complaintDay!);
    for (let i = 1; i < r.shift.length; i++) expect(r.shift[i]).toBeGreaterThan(r.shift[i - 1]);
    expect(r.acc[3]).toBeLessThan(r.acc[0]);
  });
  it('shows them on screen', () => {
    expect(textOf('drift', 0)).toContain('94% right');
    expect(bars('drift', 1).map((b) => b.text)).toEqual(['0.08', '0.24', '0.60', '0.90']);
    expect(bars('drift', 2).map((b) => b.text)).toEqual(['93%', '93%', '84%', '72%']);
    expect(textOf('drift', 3)).toContain('alert: day 17');
    expect(textOf('drift', 3)).toContain('complaints: day 37');
    expect(textOf('drift', 3)).toContain('20 days of warning');
  });
});

describe('speech', () => {
  it('splits each slice into three bands with Haar sums and differences', () => {
    expect(SPEECH_SLICES).toHaveLength(4);
    for (const s of SPEECH_SLICES) expect(s).toHaveLength(8);
    // slice 1 by hand: the pair differences are 3, 3, 2, 3, so high = (9 + 9 + 4 + 9) / 4 = 7.75
    expect(haarBands(SPEECH_SLICES[0]).high).toBe(7.75);
    // nothing is lost: the total energy of the samples equals 8 * high + 8 * mid + 16 * low
    for (const s of SPEECH_SLICES) {
      const b = haarBands(s);
      expect(s.reduce((a, v) => a + v * v, 0)).toBeCloseTo(8 * b.high + 8 * b.mid + 16 * b.low, 12);
    }
    // a flat slice has only low energy
    expect(haarBands([2, 2, 2, 2, 2, 2, 2, 2])).toEqual({ high: 0, mid: 0, low: 2 });
    // slice 4 by hand: pair differences -0.5, 0.5, 0, 0.5 give (0.25 + 0.25 + 0 + 0.25) / 4 = 0.1875
    expect(haarBands(SPEECH_SLICES[3]).high).toBe(0.1875);
  });
  it('picks a letter per slice and decodes to a word', () => {
    const r = speechRun();
    expect(r.picks).toEqual(['h', 'i', 'i', '_']);
    for (const p of r.probs) expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(r.sure.map((p) => pct(p, 0))).toEqual(['93%', '85%', '73%', '56%']);
    expect(mergeRepeats(['h', 'i', 'i', '_'])).toEqual(['h', 'i', '_']);
    expect(collapseLetters(['h', '_', 'h', 'h'])).toEqual(['h', 'h']);
    expect(r.word).toBe('hi');
  });
  it('shows the numbers on screen', () => {
    expect(cells('speech', 1)).toEqual([
      ['', '1', '2', '3', '4'],
      ['high', '7.75', '0.00', '0.00', '0.19'],
      ['mid', '0.00', '0.25', '0.25', '0.16'],
      ['low', '0.00', '6.13', '4.63', '0.02'],
    ]);
    expect(cells('speech', 2)[1]).toEqual(['letter', 'h', 'i', 'i', '_']);
    expect(cells('speech', 2)[2]).toEqual(['sure', '93%', '85%', '73%', '56%']);
    expect(textOf('speech', 3)).toContain('drop blanks: \\"hi\\"');
    expect(stage('speech', 0).note).toContain('32 example numbers');
  });
});

describe('mcp', () => {
  it('counts the tools it lists', () => {
    expect(MCP_SERVERS.map((s) => s.name)).toEqual(['Issues server', 'Notes server']);
    expect(mcpToolCount()).toBe(3);
    expect(stage('mcp', 1).note).toContain('2 example servers list 3 tools');
    const st = stage('mcp', 1);
    expect(st.kind === 'stack' && st.cards.map((c) => c.sub)).toEqual(['host app', 'shared format', '2 tools', '1 tool']);
  });
  it('uses the names from the MCP lesson and says it is an example', () => {
    const lesson = readFileSync(fileURLToPath(new URL('../content/lessons/rag-agents/mcp-in-depth.mdx', import.meta.url)), 'utf8');
    for (const s of MCP_SERVERS) for (const name of [...s.tools, ...s.resources]) expect(lesson, name).toContain(name);
    expect(textOf('mcp', 2)).toContain('create_issue');
    expect(get('mcp').caption).toContain('example');
  });
});

describe('loop geometry', () => {
  it('places 3 or 4 nodes clockwise from the top, rounded to one decimal', () => {
    for (const n of [3, 4]) {
      const c = loopCentres(n);
      expect(c).toHaveLength(n);
      expect(c[0]).toEqual({ x: 125, y: 30 });
      for (const p of c) {
        expect(p.x).toBe(Math.round(p.x * 10) / 10);
        expect(p.y).toBe(Math.round(p.y * 10) / 10);
        expect(p.x).toBeGreaterThan(40 - 1);
        expect(p.x).toBeLessThan(210 + 1);
      }
    }
    expect(loopCentres(4)[1]).toEqual({ x: 209, y: 76 });
    expect(loopCentres(4)[3]).toEqual({ x: 41, y: 76 });
  });
  it('the dot path closes the loop with rounded points', () => {
    const p = loopPath();
    expect(p[0]).toEqual(p[p.length - 1]);
    for (const q of p) expect(q.x).toBe(Math.round(q.x * 10) / 10);
  });
});

describe('pickScene', () => {
  const scenes = HERO_SCENES;
  const n = scenes.length;
  it('is stable: the same day always gives the same scene', () => {
    for (let d = -5; d < 400; d += 7) expect(pickScene(d, scenes).id).toBe(pickScene(d, [...scenes].reverse()).id);
  });
  it('shows every scene once before any repeats', () => {
    for (const start of [0, 1, 311, 1000]) {
      const ids = Array.from({ length: n }, (_, k) => pickScene(start + k, scenes).id);
      expect(new Set(ids).size).toBe(n);
    }
  });
  it('follows the shuffled order of the ids', () => {
    const order = shuffled(scenes, (s) => s.id).map((s) => s.id);
    for (let d = 0; d < 3 * n; d++) expect(pickScene(d, scenes).id).toBe(order[d % n]);
  });
  it('never shows the same scene on two days in a row, including where a round ends', () => {
    for (let d = -50; d < 3000; d++) expect(pickScene(d, scenes).id).not.toBe(pickScene(d + 1, scenes).id);
    // the boundary between the first and second round
    expect(pickScene(n - 1, scenes).id).not.toBe(pickScene(n, scenes).id);
  });
  it('works for days before the start date and for one or two scenes', () => {
    expect(pickScene(-1, scenes).id).toBe(pickScene(n - 1, scenes).id);
    expect(pickScene(5, [scenes[0]]).id).toBe(scenes[0].id);
    const two = scenes.slice(0, 2);
    for (let d = 0; d < 20; d++) expect(pickScene(d, two).id).not.toBe(pickScene(d + 1, two).id);
  });
  it('rejects an empty list', () => {
    expect(() => pickScene(0, [])).toThrow();
  });
});
