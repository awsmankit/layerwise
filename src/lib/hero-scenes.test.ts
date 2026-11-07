import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { shuffled } from './daily-card';
import {
  AGENT_TRACE,
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
  clueWeight,
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
  it('has the chatbot (drawn by HeroFlow) plus 10 new stage scenes', () => {
    expect(HERO_SCENES).toHaveLength(11);
    expect(HERO_SCENES.map((s) => s.id).sort()).toEqual(
      ['agent', 'chatbot', 'guardrails', 'hearing', 'image', 'kv-cache', 'learning', 'next-word', 'rag', 'serving', 'spam'].sort(),
    );
    const chatbot = HERO_SCENES.find((s) => s.id === 'chatbot')!;
    expect(chatbot.component).toBe('HeroFlow');
    expect(chatbot.stages).toEqual([]);
    expect(staged).toHaveLength(10);
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
