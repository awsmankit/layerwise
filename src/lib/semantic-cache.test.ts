import { describe, expect, it } from 'vitest';
import { ANSWERS, EXAMPLE_PRICES, STREAM, SWEEP, cacheEconomics, cosine, embed, jobCost, normalise, simulate, sweep, type BatchInput } from './semantic-cache';

const sim = (a: string, b: string) => cosine(embed(a), embed(b));

describe('toy embedding', () => {
  it('ignores case and punctuation', () => {
    expect(normalise('  How do I reset my password?! ')).toBe('how do i reset my password');
    expect(sim('How do I reset my password?', 'how do i reset my password')).toBeCloseTo(1, 10);
  });
  it('gives vectors of length 1', () => {
    let n = 0;
    for (const v of embed('hello there').values()) n += v * v;
    expect(n).toBeCloseTo(1, 10);
  });
  it('scores unrelated text low', () => {
    expect(sim('How do I reset my password?', 'What is your return policy')).toBeLessThan(0.1);
  });
  it('scores a paraphrase lower than a near-duplicate that means something else', () => {
    const paraphrase = sim('How do I reset my password?', 'I forgot my password, how do I reset it?');
    const different = sim('What time do you open on Sunday?', 'What time do you open on Monday?');
    expect(paraphrase).toBeGreaterThan(0.8);
    expect(different).toBeGreaterThan(paraphrase);
  });
});

describe('stream', () => {
  it('has an answer text for every answer key', () => {
    for (const q of STREAM) expect(ANSWERS[q.answer]).toBeTruthy();
  });
  it('contains the same question text with different correct answers for different tenants', () => {
    const a = STREAM.find((q) => q.text === 'what is your return policy' && q.tenant === 'North')!;
    const b = STREAM.find((q) => q.text === 'what is your return policy' && q.tenant === 'South')!;
    expect(a.answer).not.toBe(b.answer);
  });
});

describe('simulation', () => {
  it('counts add up at every threshold', () => {
    for (const scope of [false, true]) {
      for (const t of SWEEP) {
        const r = simulate(t, scope);
        expect(r.hits + r.misses).toBe(r.total);
        expect(r.rightHits + r.wrongHits).toBe(r.hits);
        expect(r.steps).toHaveLength(STREAM.length);
      }
    }
  });

  it('hits nothing above a similarity of 1 and more at 0.5 than at 0.95', () => {
    // Hits can rise when a stricter threshold lets more questions miss and be added to the cache, so only check the extremes.
    expect(simulate(1.01, false).hits).toBe(0);
    expect(simulate(0.5, false).hits).toBeGreaterThan(simulate(0.95, false).hits);
  });

  it('a threshold of 1.0 still serves the wrong answer to a different tenant unless the cache is scoped', () => {
    const open = simulate(1, false);
    const scoped = simulate(1, true);
    expect(open.wrongHits).toBe(3);
    expect(scoped.wrongHits).toBe(0);
  });

  it('a low threshold serves wrong answers for near-duplicate questions', () => {
    const r = simulate(0.8, true);
    const wrong = r.steps.filter((s) => s.outcome === 'hit-wrong').map((s) => s.question.text);
    expect(wrong.some((t) => t.includes('Ireland') || t.includes('Monday'))).toBe(true);
  });

  it('a very low threshold answers different-intent questions from the wrong cached entry', () => {
    expect(simulate(0.5, true).wrongHits).toBeGreaterThan(simulate(0.9, true).wrongHits);
  });

  it('matches hand-counted values at threshold 0.9 with the cache scoped by tenant', () => {
    const r = simulate(0.9, true);
    expect(r.wrongHits).toBe(0);
    expect(r.hits).toBe(18);
    expect(r.hitRate).toBeCloseTo(18 / 40, 10);
  });

  it('savings arithmetic: hits times the call price minus every lookup', () => {
    const r = simulate(0.9, true);
    expect(r.grossSaving).toBeCloseTo(18 * EXAMPLE_PRICES.llmCall - 40 * EXAMPLE_PRICES.lookup, 10);
    expect(r.netSaving).toBeCloseTo(r.grossSaving - r.wrongHits * EXAMPLE_PRICES.wrongAnswer, 10);
  });

  it('wrong answers can make a high hit rate lose money', () => {
    const r = simulate(0.5, false);
    expect(r.hitRate).toBeGreaterThan(0.8);
    expect(r.netSaving).toBeLessThan(0);
  });

  it('sweep returns one result per threshold', () => {
    expect(sweep(true)).toHaveLength(SWEEP.length);
  });
});

describe('batch job cost', () => {
  const base: BatchInput = { requests: 100000, inputTokens: 2000, outputTokens: 300, inputPerM: 3, outputPerM: 15, discount: 0.5, cachedShare: 0, cacheReadFraction: 0.1 };
  it('example job: 200M input and 30M output tokens', () => {
    // input 200M x $3 = $600; output 30M x $15 = $450
    expect(jobCost(base, false)).toBeCloseTo(1050, 6);
    expect(jobCost(base, true)).toBeCloseTo(525, 6);
  });
  it('stacks a cache-read share on top of the batch discount when the vendor allows it', () => {
    const c = { ...base, cachedShare: 0.8 };
    // input: 600 x (0.2 + 0.8 x 0.1) = 168; output 450; sum 618; half = 309
    expect(jobCost(c, false)).toBeCloseTo(618, 6);
    expect(jobCost(c, true)).toBeCloseTo(309, 6);
  });
});

describe('daily cache economics (the lesson table)', () => {
  const base = { questionsPerDay: 100000, callCost: 0.01, lookupCost: 0.0001, hitRate: 0.3, wrongShare: 0, wrongCost: 0.05 };
  it('with no wrong answers', () => {
    const r = cacheEconomics(base);
    expect(r.baseline).toBeCloseTo(1000, 6);
    expect(r.hits).toBeCloseTo(30000, 6);
    expect(r.lookups).toBeCloseTo(10, 6);
    expect(r.gross).toBeCloseTo(290, 6);
    expect(r.net).toBeCloseTo(290, 6);
  });
  it('with 3 per cent of hits wrong', () => {
    const r = cacheEconomics({ ...base, wrongShare: 0.03 });
    expect(r.wrong).toBeCloseTo(900, 6);
    expect(r.wrongTotal).toBeCloseTo(45, 6);
    expect(r.net).toBeCloseTo(245, 6);
  });
  it('with 10 per cent of hits wrong', () => {
    const r = cacheEconomics({ ...base, wrongShare: 0.1 });
    expect(r.wrong).toBeCloseTo(3000, 6);
    expect(r.net).toBeCloseTo(140, 6);
  });
  it('break-even wrong share: where the net saving reaches zero', () => {
    // gross 290 = hits x wrongShare x 0.05 = 1500 x wrongShare -> 19.33 per cent
    const r = cacheEconomics({ ...base, wrongShare: 290 / 1500 });
    expect(r.net).toBeCloseTo(0, 6);
  });
});
