import { describe, expect, it } from 'vitest';
import { diffLines, fileStatuses, historyGraph, initialShell, resolvePath, run, statLines, tokenise, type Shell } from './fake-shell';

/** Run several lines in a row and return the final state and the output of the last one. */
function go(start: Shell, ...lines: string[]) {
  let state = start;
  let last = { out: [] as string[], ok: true };
  const all: { cmd: string; out: string[]; ok: boolean }[] = [];
  for (const l of lines) {
    const r = run(state, l);
    state = r.state;
    last = { out: r.out, ok: r.ok };
    all.push({ cmd: l, out: r.out, ok: r.ok });
  }
  return { state, ...last, all };
}

describe('paths and parsing', () => {
  it('resolves ., .., ~ and absolute paths', () => {
    expect(resolvePath('/home/you/project', '/home/you', '..')).toBe('/home/you');
    expect(resolvePath('/home/you/project', '/home/you', '../Downloads/./x')).toBe('/home/you/Downloads/x');
    expect(resolvePath('/home/you/project', '/home/you', '~/hello.txt')).toBe('/home/you/hello.txt');
    expect(resolvePath('/home/you', '/home/you', '/')).toBe('/');
  });
  it('tokenises with quotes', () => {
    expect(tokenise('git commit -m "first save"')).toEqual(['git', 'commit', '-m', 'first save']);
    expect(tokenise("echo 'a b'  c")).toEqual(['echo', 'a b', 'c']);
  });
});

describe('the shell', () => {
  const s0 = initialShell('shell');
  it('pwd, ls and cd work together', () => {
    expect(run(s0, 'pwd').out).toEqual(['/home/you']);
    expect(run(s0, 'ls').out).toEqual(['Downloads/  hello.txt  project/']);
    const r = go(s0, 'cd project', 'pwd', 'ls');
    expect(r.all[1].out).toEqual(['/home/you/project']);
    expect(r.out).toEqual(['notes.txt  scores.csv']);
    expect(go(s0, 'cd project', 'cd ..', 'pwd').out).toEqual(['/home/you']);
    expect(go(s0, 'cd project', 'cd', 'pwd').out).toEqual(['/home/you']);
  });
  it('cat prints a file', () => {
    expect(run(s0, 'cat hello.txt').out).toEqual(['Hello from the home folder']);
    expect(run(s0, 'cat project/notes.txt').out).toEqual(['My first AI project', 'To do: collect 100 examples']);
  });
  it('mkdir makes a folder that ls shows', () => {
    const r = go(s0, 'mkdir data', 'ls');
    expect(r.out[0]).toContain('data/');
    expect(run(r.state, 'mkdir data').ok).toBe(false);
  });
  it('echo with > writes and >> appends', () => {
    const r = go(s0, 'echo "one" > a.txt', 'echo two >> a.txt', 'cat a.txt');
    expect(r.out).toEqual(['one', 'two']);
    expect(run(s0, 'echo "a > b"').out).toEqual(['a > b']);
  });
  it('reports errors in the shell style and leaves state alone', () => {
    const bad = run(s0, 'cd nowhere');
    expect(bad.ok).toBe(false);
    expect(bad.out[0]).toBe('bash: cd: nowhere: No such file or directory');
    expect(bad.state.cwd).toBe('/home/you');
    expect(run(s0, 'cat nope.txt').out[0]).toBe('cat: nope.txt: No such file or directory');
    expect(run(s0, 'frobnicate').out[0]).toBe('bash: frobnicate: command not found');
  });
  it('does not change the previous state object', () => {
    const before = JSON.stringify(s0);
    run(s0, 'mkdir x');
    expect(JSON.stringify(s0)).toBe(before);
  });
  it('ls -a shows hidden names', () => {
    const r = go(s0, 'echo hi > .secret', 'ls -a');
    expect(r.out[0]).toContain('.secret');
    expect(go(s0, 'echo hi > .secret', 'ls').out[0]).not.toContain('.secret');
  });
});

describe('git: the save-point cycle', () => {
  const g0 = initialShell('git');
  it('refuses to work outside a repository', () => {
    const r = run(g0, 'git status');
    expect(r.ok).toBe(false);
    expect(r.out[0]).toMatch(/not a git repository/);
  });
  it('init, status, add, commit', () => {
    const a = go(g0, 'git init');
    expect(a.out[0]).toBe('Initialized empty Git repository in /home/you/project/.git/');
    const st = run(a.state, 'git status').out;
    expect(st).toContain('No commits yet');
    expect(st).toContain('Untracked files:');
    expect(st).toContain('\tnotes.txt');
    const b = go(a.state, 'git add notes.txt', 'git status');
    expect(b.out).toContain('Changes to be committed:');
    expect(b.out).toContain('\tnew file:   notes.txt');
    const c = go(b.state, 'git commit -m "first save"');
    expect(c.out[0]).toMatch(/^\[main \(root-commit\) [0-9a-f]{7}\] first save$/);
    expect(c.out[1]).toBe(' 1 file changed, 1 insertion(+)');
    expect(c.out[2]).toBe(' create mode 100644 notes.txt');
    expect(run(c.state, 'git status').out).toEqual(['On branch main', '', 'nothing to commit, working tree clean']);
  });
  it('a commit needs staged changes and a message', () => {
    const a = go(g0, 'git init', 'git add notes.txt');
    expect(run(a.state, 'git commit').ok).toBe(false);
    const b = go(g0, 'git init');
    const r = run(b.state, 'git commit -m "x"');
    expect(r.ok).toBe(false);
    expect(r.out.join('\n')).toMatch(/Untracked files/);
  });
  it('shows modified files, diffs them and stages a file as it was when added', () => {
    const base = go(g0, 'git init', 'git add .', 'git commit -m "one"').state;
    const m = go(base, 'echo "more ideas" >> notes.txt', 'git status');
    expect(m.out).toContain('Changes not staged for commit:');
    expect(m.out).toContain('\tmodified:   notes.txt');
    const d = run(m.state, 'git diff').out;
    expect(d).toContain('+more ideas');
    expect(d).toContain(' Ideas for my spam filter');
    expect(d).toContain('@@ -1,1 +1,2 @@');
    // edit after add: staged and unstaged at once
    const both = go(m.state, 'git add notes.txt', 'echo "late idea" >> notes.txt', 'git status');
    expect(both.out).toContain('Changes to be committed:');
    expect(both.out).toContain('Changes not staged for commit:');
    expect(run(both.state, 'git diff --staged').out).toContain('+more ideas');
    const c = run(both.state, 'git commit -m "two"');
    expect(c.out[1]).toBe(' 1 file changed, 1 insertion(+)');
    // the late idea is still unsaved
    expect(run(c.state, 'git status').out).toContain('\tmodified:   notes.txt');
  });
  it('log lists commits newest first', () => {
    const s = go(g0, 'git init', 'git add .', 'git commit -m "one"', 'echo x >> notes.txt', 'git commit -am "two"').state;
    const l = run(s, 'git log --oneline').out;
    expect(l).toHaveLength(2);
    expect(l[0]).toMatch(/^[0-9a-f]{7} \(HEAD -> main\) two$/);
    expect(l[1]).toMatch(/^[0-9a-f]{7} one$/);
    expect(run(go(g0, 'git init').state, 'git log').ok).toBe(false);
  });
});

describe('git: .gitignore keeps secrets out', () => {
  it('ignored files are not listed or added', () => {
    const s = go(initialShell('git'), 'git init', 'echo "API_KEY=not-a-real-key" > .env', 'git status');
    expect(s.out).toContain('\t.env');
    const t = go(s.state, 'echo ".env" > .gitignore', 'git add .', 'git status');
    expect(t.out).not.toContain('\t.env');
    expect(t.out).toContain('\tnew file:   .gitignore');
    expect(t.out).toContain('\tnew file:   notes.txt');
    const forced = run(t.state, 'git add .env');
    expect(forced.ok).toBe(false);
    expect(forced.out[0]).toMatch(/ignored by one of your .gitignore files/);
    expect(fileStatuses(t.state, t.state.repo!).find((f) => f.path === '.env')?.status).toBe('ignored');
  });
});

describe('git: branches and merges', () => {
  const base = go(initialShell('git'), 'git init', 'git add .', 'git commit -m "one"').state;
  it('branch, switch -c and list', () => {
    const s = go(base, 'git switch -c experiment');
    expect(s.out).toEqual(["Switched to a new branch 'experiment'"]);
    expect(run(s.state, 'git branch').out).toEqual(['* experiment', '  main']);
    expect(run(s.state, 'git switch experiment').out).toEqual(["Already on 'experiment'"]);
    expect(run(base, 'git switch nope').ok).toBe(false);
  });
  it('a branch commit does not touch main, and a fast-forward merge brings it over', () => {
    const s = go(base, 'git switch -c experiment', 'echo "idea two" >> notes.txt', 'git commit -am "try an idea"', 'git switch main');
    expect(run(s.state, 'cat notes.txt').out).toEqual(['Ideas for my spam filter']);
    const m = run(s.state, 'git merge experiment');
    expect(m.out[0]).toMatch(/^Updating [0-9a-f]{7}\.\.[0-9a-f]{7}$/);
    expect(m.out[1]).toBe('Fast-forward');
    expect(run(m.state, 'cat notes.txt').out).toEqual(['Ideas for my spam filter', 'idea two']);
    expect(run(m.state, 'git merge experiment').out).toEqual(['Already up to date.']);
  });
  it('switching is refused when it would overwrite uncommitted work', () => {
    const s = go(base, 'git switch -c experiment', 'echo "idea two" >> notes.txt', 'git commit -am "try an idea"', 'git switch main', 'echo "scribble" >> notes.txt');
    // main and experiment differ in notes.txt and notes.txt has uncommitted changes on main
    const r = run(s.state, 'git switch experiment');
    expect(r.ok).toBe(false);
    expect(r.out[0]).toMatch(/would be overwritten by checkout/);
    expect(r.state.repo!.head).toBe('main');
  });
  it('a merge of changes to different files makes a merge commit with two parents', () => {
    let s = go(base, 'echo "csv" > data.txt', 'git add .', 'git commit -m "add data"').state;
    s = go(s, 'git switch -c side').state;
    s = go(s, 'echo "notes more" >> notes.txt', 'git commit -am "side work"', 'git switch main').state;
    s = go(s, 'echo "data more" >> data.txt', 'git commit -am "main work"').state;
    // base had notes.txt and data.txt? side branched after data.txt, so changes are to different files
    const m = run(s, 'git merge side');
    expect(m.ok).toBe(true);
    expect(m.out[0]).toBe("Merge made by the 'ort' strategy.");
    const tip = m.state.repo!.commits[m.state.repo!.branches.main!];
    expect(tip.parents).toHaveLength(2);
    expect(tip.message).toBe("Merge branch 'side'");
    expect(run(m.state, 'cat notes.txt').out).toEqual(['Ideas for my spam filter', 'notes more']);
    expect(run(m.state, 'cat data.txt').out).toEqual(['csv', 'data more']);
    expect(historyGraph(m.state.repo!).length).toBe(m.state.repo!.seq);
  });
  it('a conflict stops the merge and changes nothing', () => {
    let s = go(base, 'git switch -c side', 'echo "left" > notes.txt', 'git commit -am "left"', 'git switch main', 'echo "right" > notes.txt', 'git commit -am "right"').state;
    const before = JSON.stringify(s);
    const m = run(s, 'git merge side');
    expect(m.ok).toBe(false);
    expect(m.out.join('\n')).toMatch(/CONFLICT \(content\): Merge conflict in notes.txt/);
    expect(JSON.stringify(m.state)).toBe(before);
    s = m.state;
  });
  it('unknown git commands get git-style errors', () => {
    expect(run(base, 'git frob').out[0]).toBe("git: 'frob' is not a git command. See 'git --help'.");
  });
});

describe('diffs and stats', () => {
  it('diffLines finds insertions and deletions', () => {
    expect(diffLines('a\nb\n', 'a\nc\n').map((o) => o.op + o.text)).toEqual([' a', '-b', '+c']);
  });
  it('statLines counts like git', () => {
    expect(statLines({ 'a.txt': 'x\n' }, { 'a.txt': 'x\ny\n', 'b.txt': 'z\n' })).toEqual([
      ' a.txt | 1 +',
      ' b.txt | 1 +',
      ' 2 files changed, 2 insertions(+)',
      ' create mode 100644 b.txt',
    ]);
  });
});
