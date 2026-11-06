import { describe, expect, it } from 'vitest';
import { BACKUP, actions, interruptions, needsApproval, runAgent } from './no-approval-gate';

describe('no-approval-gate', () => {
  it('only the irreversible action needs a person', () => {
    expect(actions.map((a) => needsApproval(a))).toEqual([false, false, true]);
    expect(interruptions()).toBe(1);
  });

  it('without a gate every action runs and the backups are gone, whatever a person would have said', () => {
    for (const d of ['pending', 'deny', 'approve'] as const) {
      const r = runAgent(false, d);
      expect(r.steps.every((s) => s.outcome === 'ran')).toBe(true);
      expect(r.deleted).toBe(true);
      expect(r.filesLeft).toBe(0);
      expect(r.held).toBe(0);
    }
  });

  it('with a gate the irreversible action waits, and is denied or approved by the person', () => {
    const wait = runAgent(true);
    expect(wait.steps.map((s) => s.outcome)).toEqual(['ran', 'ran', 'paused']);
    expect(wait.filesLeft).toBe(BACKUP.files);
    expect(wait.held).toBe(1);
    const no = runAgent(true, 'deny');
    expect(no.steps.map((s) => s.outcome)).toEqual(['ran', 'ran', 'denied']);
    expect(no.deleted).toBe(false);
    expect(no.filesLeft).toBe(42);
    // a gate is only as good as the person: approving without reading loses everything
    const yes = runAgent(true, 'approve');
    expect(yes.deleted).toBe(true);
    expect(yes.filesLeft).toBe(0);
    expect(yes.held).toBe(0);
  });

  it('the useful work is identical either way', () => {
    const a = runAgent(true, 'deny').steps.slice(0, 2).map((s) => s.outcome);
    const b = runAgent(false).steps.slice(0, 2).map((s) => s.outcome);
    expect(a).toEqual(b);
  });

  it('the approval text states the size of the loss and that it is permanent', () => {
    const del = actions[2];
    expect(del.plain).toContain('42 files');
    expect(del.plain).toContain('3.1 GB');
    expect(del.plain).toContain('no undo');
    expect(del.source).toBe('document');
  });
});
