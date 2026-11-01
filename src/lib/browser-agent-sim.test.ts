import { describe, expect, it } from 'vitest';
import { ATTACKS, NO_DEFENCES, pageView, simulate, type AttackId, type Defences } from './browser-agent-sim';

const all: Defences[] = [];
for (let n = 0; n < 16; n++) all.push({ allowList: !!(n & 1), confirm: !!(n & 2), sandbox: !!(n & 4), filter: !!(n & 8) });

describe('browser agent simulation', () => {
  it('with no defences the fooled agent leaks the address and still buys the book', () => {
    for (const a of ['other-site', 'same-site'] as AttackId[]) {
      const t = simulate(a, NO_DEFENCES);
      expect(t.leaked).toBe(true);
      expect(t.task).toBe('completed');
      expect(t.prompts).toBe(0);
      expect(t.results.every((r) => r.status === 'done')).toBe(true);
    }
  });

  it('Attack A leaks only when no defence at all is on', () => {
    for (const d of all) {
      const none = !d.allowList && !d.confirm && !d.sandbox && !d.filter;
      expect(simulate('other-site', d).leaked, JSON.stringify(d)).toBe(none);
    }
  });

  it('Attack B is stopped by the confirmation gate or the sandbox, not by the allow-list or the filter', () => {
    for (const d of all) {
      expect(simulate('same-site', d).leaked, JSON.stringify(d)).toBe(!d.confirm && !d.sandbox);
    }
  });

  it('the allow-list blocks the off-site steps and nothing else', () => {
    const t = simulate('other-site', { ...NO_DEFENCES, allowList: true });
    expect(t.results.filter((r) => r.status === 'blocked-allowlist').map((r) => r.step.id)).toEqual(['i2', 'i3']);
    expect(t.task).toBe('completed');
  });

  it('the confirmation gate asks about the send and the purchase, approves the task and refuses the injected step', () => {
    const t = simulate('same-site', { ...NO_DEFENCES, confirm: true });
    expect(t.prompts).toBe(2);
    expect(t.results.find((r) => r.step.id === 'i3')!.status).toBe('denied');
    expect(t.results.find((r) => r.step.id === 't4')!.status).toBe('approved');
    expect(t.task).toBe('completed');
    expect(t.leaked).toBe(false);
  });

  it('the sandbox leaves nothing to steal but hands the purchase to the person', () => {
    const t = simulate('other-site', { ...NO_DEFENCES, sandbox: true });
    expect(t.leaked).toBe(false);
    expect(t.task).toBe('handed-off');
    expect(t.results.find((r) => r.step.id === 'i1')!.page).toBe('signin');
  });

  it('the filter catches the plain wording of Attack A but misses Attack B', () => {
    const a = simulate('other-site', { ...NO_DEFENCES, filter: true });
    expect(a.results.filter((r) => r.status === 'ignored-filter').map((r) => r.step.id)).toEqual(['i1', 'i2', 'i3']);
    const b = simulate('same-site', { ...NO_DEFENCES, filter: true });
    expect(b.results.some((r) => r.status === 'ignored-filter')).toBe(false);
    expect(b.leaked).toBe(true);
  });

  it('every step yields a result in order, and the injected text appears in what the model reads', () => {
    for (const a of Object.keys(ATTACKS) as AttackId[]) {
      const t = simulate(a, NO_DEFENCES);
      expect(t.results.map((r) => r.step.id)).toEqual(ATTACKS[a].steps.map((s) => s.id));
      expect(pageView('item', a).tree.join('\n')).toContain(ATTACKS[a].injectedText);
    }
  });
});
