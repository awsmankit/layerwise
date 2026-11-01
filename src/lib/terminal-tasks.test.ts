import { describe, expect, it } from 'vitest';
import { initialShell, run, type Entry, type Shell } from './fake-shell';
import { GIT_TASKS, SHELL_TASKS } from './terminal-tasks';

function play(start: Shell, lines: string[]) {
  let s = start;
  const log: Entry[] = [];
  for (const l of lines) {
    const r = run(s, l);
    s = r.state;
    log.push({ cmd: l, ok: r.ok, out: r.out });
  }
  return { s, log };
}
const done = (tasks: typeof SHELL_TASKS, s: Shell, log: Entry[]) => tasks.map((t) => t.check(s, log));

describe('shell tasks', () => {
  it('start undone and finish done', () => {
    const start = initialShell('shell');
    expect(done(SHELL_TASKS, start, [])).toEqual([false, false, false, false, false]);
    const { s, log } = play(start, ['pwd', 'ls', 'cd project', 'cat notes.txt', 'mkdir data']);
    expect(done(SHELL_TASKS, s, log)).toEqual([true, true, true, true, true]);
  });
  it('a failed command does not count', () => {
    const { s, log } = play(initialShell('shell'), ['cat notes.txt', 'cd nowhere']);
    expect(done(SHELL_TASKS, s, log).some(Boolean)).toBe(false);
  });
});

describe('git tasks', () => {
  it('complete in order', () => {
    const start = initialShell('git');
    expect(done(GIT_TASKS, start, []).some(Boolean)).toBe(false);
    const { s, log } = play(start, [
      'git init',
      'git status',
      'git add notes.txt',
      'git commit -m "first save"',
      'echo "more ideas" >> notes.txt',
      'git commit -am "more ideas"',
      'git log --oneline',
      'git switch -c experiment',
      'echo "wild idea" >> notes.txt',
      'git commit -am "wild idea"',
      'git switch main',
      'git merge experiment',
      'echo "KEY=not-a-real-key" > .env',
      'git status',
      'echo ".env" > .gitignore',
      'git status',
    ]);
    expect(done(GIT_TASKS, s, log)).toEqual(GIT_TASKS.map(() => true));
  });
  it('the secret task is not done while .env still shows as untracked', () => {
    const { s, log } = play(initialShell('git'), ['git init', 'echo "KEY=x" > .env', 'echo ".env" > .gitignore', 'git status', 'echo "KEY=y" > other', 'git status']);
    expect(GIT_TASKS.find((t) => t.id === 'secret')!.check(s, log)).toBe(true);
    const { s: s2, log: log2 } = play(initialShell('git'), ['git init', 'echo "KEY=x" > .env', 'git status']);
    expect(GIT_TASKS.find((t) => t.id === 'secret')!.check(s2, log2)).toBe(false);
  });
});
