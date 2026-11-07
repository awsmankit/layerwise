import { describe, expect, it } from 'vitest';
import { bisect, bisectRefunds, cases, categories, diffAt, edits, firstDrop, hiddenDrops, history, passes, promptAt, score, VERSIONS } from './no-prompt-versioning';

describe('no prompt versioning what-if', () => {
  it('has 8 edits, 9 versions and 40 test cases, 8 in each of 5 categories', () => {
    expect(edits).toHaveLength(8);
    expect(VERSIONS).toBe(9);
    expect(cases).toHaveLength(40);
    for (const c of categories) expect(cases.filter((x) => x.category === c)).toHaveLength(8);
    expect(new Set(cases.map((c) => c.id)).size).toBe(40);
  });
  it('the prompt grows by one line per edit and the reword changes text, not the number of lines', () => {
    expect(promptAt(0)).toHaveLength(3);
    expect(promptAt(4).map((l) => l.id)).toEqual(['role', 'policy', 'ship', 'account', 'tone', 'greet', 'short']);
    expect(promptAt(7)).toHaveLength(10);
    expect(promptAt(8)).toHaveLength(10);
    expect(promptAt(8).find((l) => l.id === 'greet')!.text).not.toBe(promptAt(7).find((l) => l.id === 'greet')!.text);
    expect(promptAt(99)).toEqual(promptAt(8));
  });
  it('a case passes only with every needed line present and no forbidden line present', () => {
    const r1 = cases.find((c) => c.id === 'R1')!;
    expect(passes(r1, promptAt(3))).toBe(true);
    expect(passes(r1, promptAt(4))).toBe(false);
    expect(passes(r1, [])).toBe(false);
    const r5 = cases.find((c) => c.id === 'R5')!;
    expect(passes(r5, promptAt(4))).toBe(true);
  });
  it('totals out of 40, version by version: 12, 20, 24, 24, 24, 32, 36, 36, 36', () => {
    expect(history.map((h) => h.total)).toEqual([12, 20, 24, 24, 24, 32, 36, 36, 36]);
    expect(score(8).failing).toHaveLength(4);
  });
  it('refund cases: 8 of 8 until edit 4 ("keep answers short"), then 4 of 8 for ever after', () => {
    expect(history.map((h) => h.by.refund)).toEqual([8, 8, 8, 8, 4, 4, 4, 4, 4]);
    expect(score(4).failing.filter((id) => id.startsWith('R'))).toEqual(['R1', 'R2', 'R3', 'R4']);
    expect(edits[3].label).toBe('Keep answers short');
  });
  it('the total did not fall at edit 4 (+4 chat cases, -4 refund cases = 0), so the drop was hidden', () => {
    expect(history[4].total - history[3].total).toBe(0);
    expect(hiddenDrops()).toEqual([{ version: 4, category: 'refund', lost: 4, totalChange: 0 }]);
    expect(firstDrop('refund')).toBe(4);
    expect(firstDrop('account')).toBeNull();
  });
  it('bisecting the refund cases over saved versions takes 3 test runs and finds edit 4', () => {
    const b = bisectRefunds();
    expect(b.culprit).toBe(4);
    expect(b.tested).toEqual([4, 2, 3]);
  });
  it('bisect finds the first bad version from any threshold in about log2 steps', () => {
    for (let bad = 1; bad <= 8; bad++) {
      const b = bisect((v) => v >= bad);
      expect(b.culprit).toBe(bad);
      expect(b.tested.length).toBeLessThanOrEqual(3);
    }
    expect(bisect(() => true, 0, 1)).toEqual({ culprit: 1, tested: [] });
  });
  it('the saved diff for each version is the edit that made it', () => {
    expect(diffAt(0)).toBeNull();
    expect(diffAt(4)).toEqual({ kind: 'add', text: 'Answer in two sentences at most.', before: undefined });
    expect(diffAt(8)?.kind).toBe('reword');
    expect(diffAt(8)?.before).toBe('Greet the customer by name.');
    expect(diffAt(9)).toBeNull();
  });
});
