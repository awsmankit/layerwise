import { describe, expect, it } from 'vitest';
import { BAD_DEFAULTS, BAD_FIXED, GOOD_DEFAULTS, cueMet, definitionTokens, estimateTokens, measure, rawOrdersJson, run, toolsFor, badSet, goodSet } from './tool-lab';

const NO_TIMEOUT = { timeout: false };
const TIMEOUT = { timeout: true };
const bad = (desc: Record<string, string> = {}, o = NO_TIMEOUT) => {
  const r = run('bad', desc, o);
  return { r, m: measure(r, toolsFor('bad', desc)) };
};
const good = (desc: Record<string, string> = {}, o = NO_TIMEOUT) => {
  const r = run('good', desc, o);
  return { r, m: measure(r, toolsFor('good', desc)) };
};

describe('token estimate', () => {
  it('is about four characters per token and rounds up', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });
  it('counts longer descriptions as more definition tokens', () => {
    expect(definitionTokens(badSet(BAD_FIXED))).toBeGreaterThan(definitionTokens(badSet(BAD_DEFAULTS)));
  });
});

describe('cues', () => {
  it('are not met by the vague defaults', () => {
    expect(cueMet('email-not-id', BAD_DEFAULTS.get_customer)).toBe(false);
    expect(cueMet('limit', BAD_DEFAULTS.list_orders)).toBe(false);
    expect(cueMet('captured', BAD_DEFAULTS.refund)).toBe(false);
    expect(cueMet('cents', BAD_DEFAULTS.refund)).toBe(false);
  });
  it('are met by the careful rewrites', () => {
    expect(cueMet('email-not-id', BAD_FIXED.get_customer)).toBe(true);
    expect(cueMet('limit', BAD_FIXED.list_orders)).toBe(true);
    expect(cueMet('captured', BAD_FIXED.refund)).toBe(true);
    expect(cueMet('cents', BAD_FIXED.refund)).toBe(true);
    expect(cueMet('latest', GOOD_DEFAULTS.billing_get_order_charges)).toBe(true);
  });
});

describe('the badly designed set', () => {
  it('fails in several ways with the vague descriptions', () => {
    const { r, m } = bad();
    const tags = r.turns.map((t) => t.tag);
    expect(tags).toContain('bad-args');
    expect(tags).toContain('opaque-error');
    expect(tags).toContain('bloat');
    expect(tags).toContain('wrong-tool');
    expect(tags).toContain('silent-wrong');
    expect(m.correct).toBe(false);
    expect(m.refundedCents).toBe(42);
  });

  it('returns a result far larger than the one order the task needs', () => {
    expect(estimateTokens(rawOrdersJson())).toBeGreaterThan(3000);
    expect(estimateTokens(rawOrdersJson(1))).toBeLessThan(150);
  });

  it('gets the amount right once the descriptions say the unit, but still has more calls than the good set', () => {
    const { m } = bad({ refund: BAD_FIXED.refund });
    expect(m.correct).toBe(true);
  });

  it('is clean and correct when all three descriptions are rewritten', () => {
    const { r, m } = bad(BAD_FIXED);
    expect(r.turns.map((t) => t.tag).every((t) => t === 'ok')).toBe(true);
    expect(m.failedCalls).toBe(0);
    expect(m.correct).toBe(true);
  });

  it('improves with each fix', () => {
    const base = bad().m;
    expect(bad({ get_customer: BAD_FIXED.get_customer }).m.calls).toBeLessThan(base.calls);
    expect(bad({ list_orders: BAD_FIXED.list_orders }).m.resultTokens).toBeLessThan(base.resultTokens / 3);
    expect(bad({ refund: BAD_FIXED.refund }).m.calls).toBeLessThan(base.calls);
    expect(bad(BAD_FIXED).m.cumulativeInput).toBeLessThan(base.cumulativeInput / 2);
  });

  it('refunds twice after a timeout, even with good descriptions', () => {
    const { m } = bad(BAD_FIXED, TIMEOUT);
    expect(m.correct).toBe(false);
    expect(m.refundedCents).toBe(8400);
  });
});

describe('the well designed set', () => {
  it('finishes correctly with no failed calls', () => {
    const { r, m } = good();
    expect(m.correct).toBe(true);
    expect(m.failedCalls).toBe(0);
    expect(r.turns.some((t) => t.tag === 'preview')).toBe(true);
    expect(r.turns.some((t) => t.tag === 'approval')).toBe(true);
  });

  it('uses fewer calls, fewer definition tokens and far fewer total input tokens than the default bad set', () => {
    const b = bad().m;
    const g = good().m;
    expect(g.calls).toBeLessThan(b.calls);
    expect(g.cumulativeInput).toBeLessThan(b.cumulativeInput / 4);
    expect(g.peakContext).toBeLessThan(b.peakContext / 4);
  });

  it('turns a missing description into one cheap, helpful error and still succeeds', () => {
    const { r, m } = good({ billing_get_order_charges: 'Shows charges.' });
    expect(r.turns.filter((t) => t.tag === 'helpful-error')).toHaveLength(1);
    expect(m.failedCalls).toBe(1);
    expect(m.correct).toBe(true);
    expect(m.cumulativeInput).toBeGreaterThan(good().m.cumulativeInput);
  });

  it('refunds once after a timeout, because the retry is safe', () => {
    const { r, m } = good({}, TIMEOUT);
    expect(m.correct).toBe(true);
    expect(r.turns.some((t) => t.tag === 'safe-retry')).toBe(true);
  });

  it('does not count the approval step as a model call', () => {
    const { r, m } = good();
    expect(m.calls).toBe(r.turns.filter((t) => t.kind === 'call').length);
    expect(m.calls).toBe(r.turns.length - 1);
  });

  it('has fewer tools than the bad set', () => {
    expect(goodSet({}).length).toBeLessThan(badSet({}).length);
  });
});

describe('determinism', () => {
  it('gives identical runs for identical input', () => {
    expect(run('bad', {}, NO_TIMEOUT)).toEqual(run('bad', {}, NO_TIMEOUT));
    expect(run('good', {}, TIMEOUT)).toEqual(run('good', {}, TIMEOUT));
  });
});
