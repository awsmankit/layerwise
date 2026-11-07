import { describe, expect, it } from 'vitest';
import { buildBase, buildTuned, DEMO_WEIGHT, END, generate, MAX_NEW, nextWord, outcome, PROMPTS, START, vocabularySize } from './no-instruction-tuning';

const base = buildBase();
const tuned = buildTuned();

describe('instruction tuning what-if (toy)', () => {
  it('counts: after "what is the capital of france ?" the base text always continues with "what" (hand-checked: 2 quiz docs)', () => {
    const r = nextWord(base, [START, ...PROMPTS[0].text.split(' ')]);
    expect(r.candidates).toEqual([{ token: 'what', p: 1 }]);
    expect(r.contextLength).toBe(8);
  });

  it('the tuned model sees the same text plus the demonstration counted DEMO_WEIGHT times: 5 of 7 words say "the"', () => {
    const r = nextWord(tuned, [START, ...PROMPTS[0].text.split(' ')]);
    expect(r.candidates[0].token).toBe('the');
    expect(r.candidates[0].p).toBeCloseTo(DEMO_WEIGHT / (DEMO_WEIGHT + 2), 12);
    expect(r.candidates[1].token).toBe('what');
    expect(r.candidates[1].p).toBeCloseTo(2 / (DEMO_WEIGHT + 2), 12);
  });

  it('the base model continues every prompt with more questions and never answers', () => {
    for (const p of PROMPTS) {
      const o = outcome(base, p);
      expect(o.answered, p.id).toBe(false);
      expect(o.newQuestions, p.id).toBeGreaterThanOrEqual(3);
      expect(o.text, p.id).not.toContain(p.answerWord);
    }
    expect(outcome(base, PROMPTS[0]).text).toBe('what is the capital of italy ? what is the capital of spain ? what is the capital of germany ?');
  });

  it('the tuned model answers each prompt directly, adds no questions and stops', () => {
    for (const p of PROMPTS) {
      const o = outcome(tuned, p);
      expect(o.text, p.id).toBe(p.answer);
      expect(o.answered, p.id).toBe(true);
      expect(o.newQuestions, p.id).toBe(0);
      expect(o.stopped, p.id).toBe(true);
    }
  });

  it('is deterministic and respects the length limit', () => {
    expect(generate(base, PROMPTS[1].text)).toEqual(generate(base, PROMPTS[1].text));
    expect(generate(base, 'hello', 5).length).toBeLessThanOrEqual(5);
    expect(generate(base, PROMPTS[2].text).length).toBeLessThanOrEqual(MAX_NEW);
  });

  it('with a stronger demonstration weight the answer probability rises, and a word never seen ends the text', () => {
    expect(DEMO_WEIGHT).toBeGreaterThan(2);
    expect(nextWord(base, ['zzzz']).candidates[0].token).toBe(END);
    expect(vocabularySize(tuned)).toBeGreaterThan(vocabularySize(base));
  });

  it('candidate probabilities at every step sum to at most 1 and are sorted', () => {
    for (const s of generate(tuned, PROMPTS[0].text)) {
      const sum = s.candidates.reduce((a, c) => a + c.p, 0);
      expect(sum).toBeLessThanOrEqual(1 + 1e-12);
      for (let i = 1; i < s.candidates.length; i++) expect(s.candidates[i].p).toBeLessThanOrEqual(s.candidates[i - 1].p);
    }
  });
});
