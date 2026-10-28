import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { labs } from './index';
import { program, type CheckResult } from './types';

/** Run a program under real Python (isolated mode) and read back the check results. */
function run(code: string, tests: string): { results: CheckResult[]; error: string } {
  const src = program(code, tests) + '\nprint("@@RESULTS@@" + _report())\n';
  const r = spawnSync('python3', ['-I', '-c', src], { encoding: 'utf8', timeout: 20000 });
  const out = (r.stdout ?? '').split('@@RESULTS@@')[1];
  if (!out) return { results: [], error: (r.stderr || r.error?.message || 'no output').slice(-400) };
  return { results: JSON.parse(out) as CheckResult[], error: '' };
}

describe('practice labs', () => {
  it('has labs, each with a unique id', () => {
    expect(labs.length).toBeGreaterThan(0);
    expect(new Set(labs.map((l) => l.id)).size).toBe(labs.length);
  });

  for (const lab of labs) {
    describe(lab.id, () => {
      it('has the parts a learner needs', () => {
        expect(lab.goal.length).toBeGreaterThan(30);
        expect(lab.starter).toMatch(/TODO/);
        expect(lab.tests).toMatch(/check\(/);
        expect(lab.hints.length).toBeGreaterThanOrEqual(1);
        expect(lab.hints.length).toBeLessThanOrEqual(3);
        expect(lab.minutes).toBeGreaterThan(0);
      });

      it('passes every check with the solution', () => {
        const { results, error } = run(lab.solution, lab.tests);
        expect(error, error).toBe('');
        expect(results.length).toBeGreaterThanOrEqual(3);
        expect(results.filter((r) => !r.ok).map((r) => `${r.name}: ${r.why}`)).toEqual([]);
      });

      it('runs the starter without crashing, and fails at least one check until it is filled in', () => {
        const { results, error } = run(lab.starter, lab.tests);
        expect(error, error).toBe('');
        expect(results.some((r) => !r.ok)).toBe(true);
      });
    });
  }
});
