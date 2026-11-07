import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLD, DRAFTS, SOURCES, TRUTH, checkDraft, checkSentence, checkerCorrect, flaggedCount, isNumber, overlap, sentences, stem, supportedCount, words } from './no-grounding-check';

const draft = (id: string) => DRAFTS.find((d) => d.id === id)!;

describe('no grounding check what-if', () => {
  it('splits a draft into sentences and finds content words', () => {
    expect(sentences('One. Two words here! Three?')).toEqual(['One.', 'Two words here!', 'Three?']);
    expect(words('You get 25 days of paid holiday a year.')).toEqual(['get', '25', 'day', 'paid', 'holiday', 'year']);
    expect(stem('carried')).toBe('carry');
    expect(isNumber('25')).toBe(true);
    expect(isNumber('two')).toBe(true);
    expect(isNumber('year')).toBe(false);
  });
  it('overlap is the share of the claim\'s content words found in the source (hand-checked)', () => {
    // claim: get 25 day paid holiday year (6 words), all 6 are in source 1
    expect(overlap('You get 25 days of paid holiday a year.', SOURCES[0])).toBe(1);
    // claim: also(stopword) get bonus day birthday -> get, bonus, day, birthday; source 1 has get and day
    expect(overlap('You also get a bonus day on your birthday.', SOURCES[0])).toBe(0.5);
    expect(overlap('', SOURCES[0])).toBe(0);
  });
  it('flags the invented sentence and passes the three backed ones', () => {
    const checks = checkDraft(draft('invented'), DEFAULT_THRESHOLD);
    expect(checks.map((c) => c.supported)).toEqual([true, true, false, true]);
    expect(checks[2].overlap).toBe(0.5);
    expect(supportedCount(checks)).toBe(3);
    expect(flaggedCount(checks)).toBe(1);
  });
  it('a wrong number is caught even when 5 of 6 words match', () => {
    const c = checkSentence('You get 30 days of paid holiday a year.', DEFAULT_THRESHOLD);
    expect(c.overlap).toBeCloseTo(5 / 6, 10);
    expect(c.badNumbers).toEqual(['30']);
    expect(c.supported).toBe(false);
    expect(c.reason).toContain('30');
  });
  it('a clean answer passes everywhere', () => {
    expect(flaggedCount(checkDraft(draft('clean'), DEFAULT_THRESHOLD))).toBe(0);
  });
  it('a stricter checker flags more, a looser one flags fewer (monotonic)', () => {
    const counts = [0.3, 0.5, 0.6, 0.8, 1].map((t) => flaggedCount(checkDraft(draft('invented'), t)));
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    // at 50% the 0.5-overlap invented sentence slips through
    expect(flaggedCount(checkDraft(draft('invented'), 0.5))).toBe(0);
    expect(flaggedCount(checkDraft(draft('invented'), 0.55))).toBe(1);
  });
  it('the toy has a false alarm: a true paraphrase is flagged', () => {
    const c = checkDraft(draft('paraphrase'), DEFAULT_THRESHOLD)[0];
    expect(c.supported).toBe(false);
    expect(TRUTH.paraphrase[0]).toBe(true);
    expect(checkerCorrect(draft('paraphrase'), DEFAULT_THRESHOLD)).toBe(0);
  });
  it('the toy has a blind spot: "unpaid" instead of "paid" still passes', () => {
    const c = checkDraft(draft('unpaid'), DEFAULT_THRESHOLD)[0];
    expect(c.supported).toBe(true);
    expect(TRUTH.unpaid[0]).toBe(false);
    expect(checkerCorrect(draft('unpaid'), DEFAULT_THRESHOLD)).toBe(0);
  });
  it('the hand labels line up with the sentence counts, and the toy is right on the first three drafts', () => {
    for (const d of DRAFTS) expect(TRUTH[d.id]).toHaveLength(checkDraft(d, DEFAULT_THRESHOLD).length);
    expect(checkerCorrect(draft('invented'), DEFAULT_THRESHOLD)).toBe(4);
    expect(checkerCorrect(draft('number'), DEFAULT_THRESHOLD)).toBe(2);
    expect(checkerCorrect(draft('clean'), DEFAULT_THRESHOLD)).toBe(3);
  });
});
