import { describe, expect, it } from 'vitest';
import { DEFAULT_ANSWERS, DIMENSIONS, QUESTIONS, STYLES, STYLE_ORDER, allAnswers, recommend, toAnswers, type Answers, type StyleId } from './arch-style';

const base: Answers = { ...DEFAULT_ANSWERS };
const a = (over: Partial<Answers>): Answers => ({ ...base, ...over });

describe('comparison data', () => {
  it('has all six styles, each with every dimension filled in', () => {
    expect(STYLE_ORDER).toHaveLength(6);
    for (const id of STYLE_ORDER) {
      const s = STYLES[id];
      expect(s.id).toBe(id);
      expect(s.what.length).toBeGreaterThan(20);
      for (const d of DIMENSIONS) expect(s.cells[d.id].length, `${id}/${d.id}`).toBeGreaterThan(20);
    }
  });

  it('uses no em dashes', () => {
    for (const id of STYLE_ORDER) {
      expect(JSON.stringify(STYLES[id])).not.toContain('—');
    }
  });

  it('puts the model in charge least for a single call and most for multi-agent', () => {
    expect(STYLES.single.modelSteers).toBe(0);
    expect(STYLES.multi.modelSteers).toBe(4);
    expect(STYLES.workflow.modelSteers).toBeLessThan(STYLES.loop.modelSteers);
  });
});

describe('the chooser: every outcome', () => {
  it('single: one prompt, nothing risky', () => {
    expect(recommend(base).style).toBe('single');
  });
  it('workflow: steps you can list', () => {
    expect(recommend(a({ shape: 'fixed' })).style).toBe('workflow');
  });
  it('loop: open-ended and nothing else', () => {
    expect(recommend(a({ shape: 'open' })).style).toBe('loop');
  });
  it('graph: fixed steps that must wait', () => {
    expect(recommend(a({ shape: 'fixed', pause: true })).style).toBe('graph');
  });
  it('multi: open-ended with separate contexts', () => {
    expect(recommend(a({ shape: 'open', isolation: true })).style).toBe('multi');
  });
  it('harness: open-ended and long', () => {
    expect(recommend(a({ shape: 'open', long: true })).style).toBe('harness');
  });
});

describe('the chooser: tricky combinations', () => {
  it('a single call that must wait becomes a workflow, not a graph', () => {
    expect(recommend(a({ shape: 'single', pause: true })).style).toBe('workflow');
  });
  it('a single call with an irreversible action gets a check step', () => {
    const r = recommend(a({ shape: 'single', irreversible: true }));
    expect(r.style).toBe('workflow');
    expect(r.why.toLowerCase()).toContain('check');
  });
  it('open-ended work that must pause goes on a graph runtime', () => {
    expect(recommend(a({ shape: 'open', pause: true })).style).toBe('graph');
  });
  it('long work wins over separate contexts, and the next step points at the harness sub-agents', () => {
    const r = recommend(a({ shape: 'open', long: true, isolation: true }));
    expect(r.style).toBe('harness');
    expect(r.next.toLowerCase()).toContain('sub-agent');
  });
  it('long work that must pause is still a harness', () => {
    expect(recommend(a({ shape: 'open', long: true, pause: true })).style).toBe('harness');
  });
  it('fixed steps with separate contexts stay a workflow', () => {
    expect(recommend(a({ shape: 'fixed', isolation: true })).style).toBe('workflow');
  });
  it('fixed steps that are long stay a workflow and say to run an open-ended step as an agent', () => {
    const r = recommend(a({ shape: 'fixed', long: true }));
    expect(r.style).toBe('workflow');
    expect(r.next.toLowerCase()).toContain('open-ended');
  });
  it('tight cost and delay on an agent style adds a caution about caps', () => {
    for (const shape of ['open'] as const) {
      const r = recommend(a({ shape, bounded: true }));
      expect(r.style).toBe('loop');
      expect(r.cautions.join(' ')).toContain('hard caps');
    }
    expect(recommend(a({ shape: 'open', bounded: true, long: true })).cautions.join(' ')).toContain('hard caps');
    expect(recommend(a({ shape: 'open', bounded: true, isolation: true })).cautions.join(' ')).toContain('hard caps');
  });
  it('tight cost on a workflow or single call needs no caution', () => {
    expect(recommend(a({ shape: 'fixed', bounded: true })).cautions).toEqual([]);
    expect(recommend(a({ shape: 'single', bounded: true })).cautions).toEqual([]);
  });
  it('an irreversible action under a model-steered style asks for an approval tool', () => {
    const r = recommend(a({ shape: 'open', irreversible: true }));
    expect(r.style).toBe('loop');
    expect(r.cautions.join(' ')).toContain('approval');
  });
  it('an irreversible action in a graph says to approve before the step', () => {
    const r = recommend(a({ shape: 'fixed', pause: true, irreversible: true }));
    expect(r.style).toBe('graph');
    expect(r.cautions.join(' ')).toContain('before the irreversible step');
  });
  it('separate permissions with a single call is flagged', () => {
    const r = recommend(a({ shape: 'single', isolation: true }));
    expect(r.style).toBe('single');
    expect(r.cautions.join(' ')).toContain('one context');
  });
  it('the support bot (fixed steps, refund, approval can wait) is a graph', () => {
    const r = recommend(a({ shape: 'fixed', irreversible: true, pause: true }));
    expect(r.style).toBe('graph');
  });
});

describe('the chooser: all 96 answer combinations', () => {
  it('gives every combination a style, a reason, a next step and a link that exists in the lesson list', () => {
    const all = allAnswers();
    expect(all).toHaveLength(96);
    const seen = new Set<StyleId>();
    for (const ans of all) {
      const r = recommend(ans);
      seen.add(r.style);
      expect(STYLE_ORDER).toContain(r.style);
      expect(r.why.length).toBeGreaterThan(20);
      expect(r.next.length).toBeGreaterThan(20);
      expect(r.link.href.startsWith('/learn/')).toBe(true);
      expect(r.link.label.length).toBeGreaterThan(3);
      expect(JSON.stringify(r)).not.toContain('—');
    }
    expect([...seen].sort()).toEqual([...STYLE_ORDER].sort());
  });

  it('never picks a model-steered style for a task whose steps are listed or single', () => {
    for (const ans of allAnswers().filter((x) => x.shape !== 'open')) {
      expect(['loop', 'multi', 'harness']).not.toContain(recommend(ans).style);
    }
  });

  it('never picks multi-agent unless separate contexts were asked for', () => {
    for (const ans of allAnswers()) {
      if (recommend(ans).style === 'multi') expect(ans.isolation).toBe(true);
    }
  });

  it('is deterministic', () => {
    for (const ans of allAnswers()) expect(recommend(ans)).toEqual(recommend({ ...ans }));
  });
});

describe('question list and answer parsing', () => {
  it('has 6 questions with at least two options each, and ids that match the answers', () => {
    expect(QUESTIONS).toHaveLength(6);
    for (const q of QUESTIONS) expect(q.options.length).toBeGreaterThanOrEqual(2);
    expect(QUESTIONS.map((q) => q.id)).toEqual(['shape', 'irreversible', 'pause', 'isolation', 'long', 'bounded']);
  });
  it('turns option values into answers', () => {
    expect(toAnswers({ shape: 'open', pause: 'yes', long: 'no' })).toEqual({ shape: 'open', irreversible: false, pause: true, isolation: false, long: false, bounded: false });
    expect(toAnswers({})).toEqual(DEFAULT_ANSWERS);
  });
});
