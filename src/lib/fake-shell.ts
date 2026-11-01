/**
 * A tiny, deterministic imitation of a shell and of git, for the "Your toolkit" lesson.
 * It runs a handful of commands on an invented file system and prints text in the shape the real tools use.
 * It is a teaching model, not a faithful copy: hashes are made up, there are no dates, and merges that conflict stop
 * without changing anything (real git leaves markers in the file for you to resolve).
 */

export type FsNode = { type: 'file'; content: string } | { type: 'dir'; children: Record<string, FsNode> };
export type Commit = { id: string; seq: number; parents: string[]; message: string; files: Record<string, string> };
export type Repo = {
  root: string;
  head: string;
  branches: Record<string, string | null>;
  commits: Record<string, Commit>;
  index: Record<string, string>;
  seq: number;
};
export type Shell = { cwd: string; home: string; fs: FsNode; repo: Repo | null };
export type Result = { state: Shell; out: string[]; ok: boolean };
export type Entry = { cmd: string; ok: boolean; out: string[] };

const dir = (children: Record<string, FsNode> = {}): FsNode => ({ type: 'dir', children });
const file = (content: string): FsNode => ({ type: 'file', content });

/** The two starting worlds used by the lesson. */
export function initialShell(kind: 'shell' | 'git'): Shell {
  if (kind === 'git') {
    return {
      cwd: '/home/you/project',
      home: '/home/you',
      fs: dir({ home: dir({ you: dir({ project: dir({ 'notes.txt': file('Ideas for my spam filter\n') }) }) }) }),
      repo: null,
    };
  }
  return {
    cwd: '/home/you',
    home: '/home/you',
    fs: dir({
      home: dir({
        you: dir({
          'hello.txt': file('Hello from the home folder\n'),
          Downloads: dir({ 'cat.jpg': file('(a picture)\n') }),
          project: dir({ 'notes.txt': file('My first AI project\nTo do: collect 100 examples\n'), 'scores.csv': file('name,score\nAda,91\nBen,78\n') }),
        }),
      }),
    }),
    repo: null,
  };
}

/* ---------- paths and nodes ---------- */

export function resolvePath(cwd: string, home: string, p: string): string {
  let q = p;
  if (q === '~' || q.startsWith('~/')) q = home + q.slice(1);
  const parts = (q.startsWith('/') ? q : `${cwd}/${q}`).split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return '/' + stack.join('/');
}

export function getNode(fs: FsNode, path: string): FsNode | null {
  let cur: FsNode = fs;
  for (const part of path.split('/').filter(Boolean)) {
    if (cur.type !== 'dir' || !(part in cur.children)) return null;
    cur = cur.children[part];
  }
  return cur;
}

function parentOf(path: string): { parent: string; name: string } {
  const i = path.lastIndexOf('/');
  return { parent: i <= 0 ? '/' : path.slice(0, i), name: path.slice(i + 1) };
}

/** Write a node into the tree (mutates `fs`, which the caller has already cloned). */
function setNode(fs: FsNode, path: string, node: FsNode): boolean {
  const { parent, name } = parentOf(path);
  const p = getNode(fs, parent);
  if (!p || p.type !== 'dir') return false;
  p.children[name] = node;
  return true;
}

function removeNode(fs: FsNode, path: string): void {
  const { parent, name } = parentOf(path);
  const p = getNode(fs, parent);
  if (p && p.type === 'dir') delete p.children[name];
}

/** All files under a directory, as paths relative to it, sorted. */
export function filesUnder(fs: FsNode, absDir: string): string[] {
  const start = getNode(fs, absDir);
  const out: string[] = [];
  const walk = (n: FsNode, prefix: string) => {
    if (n.type === 'file') {
      out.push(prefix);
      return;
    }
    for (const k of Object.keys(n.children).sort()) walk(n.children[k], prefix ? `${prefix}/${k}` : k);
  };
  if (start && start.type === 'dir') for (const k of Object.keys(start.children).sort()) walk(start.children[k], k);
  return out;
}

export function readFile(state: Shell, abs: string): string | null {
  const n = getNode(state.fs, abs);
  return n && n.type === 'file' ? n.content : null;
}

/* ---------- parsing ---------- */

export function tokenise(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  let has = false;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      if (cur || has) out.push(cur);
      cur = '';
      has = false;
    } else cur += ch;
  }
  if (cur || has) out.push(cur);
  return out;
}

/* ---------- diff helpers ---------- */

const linesOf = (s: string): string[] => (s === '' ? [] : s.replace(/\n$/, '').split('\n'));

type DiffOp = { op: ' ' | '+' | '-'; text: string };

/** Line diff by longest common subsequence. Fine for the tiny files of this lesson. */
export function diffLines(a: string, b: string): DiffOp[] {
  const x = linesOf(a);
  const y = linesOf(b);
  const n = x.length;
  const m = y.length;
  const t: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = x[i] === y[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      out.push({ op: ' ', text: x[i] });
      i++;
      j++;
    } else if (t[i + 1][j] >= t[i][j + 1]) out.push({ op: '-', text: x[i++] });
    else out.push({ op: '+', text: y[j++] });
  }
  while (i < n) out.push({ op: '-', text: x[i++] });
  while (j < m) out.push({ op: '+', text: y[j++] });
  return out;
}

const countOps = (ops: DiffOp[]) => ({ add: ops.filter((o) => o.op === '+').length, del: ops.filter((o) => o.op === '-').length });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The summary git prints after a commit or merge: per-file lines and a total. */
export function statLines(before: Record<string, string>, after: Record<string, string>, perFile = true): string[] {
  const paths = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  const rows: { path: string; add: number; del: number; mode?: string }[] = [];
  for (const p of paths) {
    if (before[p] === after[p]) continue;
    const ops = countOps(diffLines(before[p] ?? '', after[p] ?? ''));
    rows.push({ path: p, ...ops, mode: before[p] === undefined ? 'create' : after[p] === undefined ? 'delete' : undefined });
  }
  if (rows.length === 0) return [];
  const width = Math.max(...rows.map((r) => r.path.length));
  const out = perFile ? rows.map((r) => ` ${r.path.padEnd(width)} | ${r.add + r.del} ${'+'.repeat(r.add)}${'-'.repeat(r.del)}`) : [];
  const add = rows.reduce((s, r) => s + r.add, 0);
  const del = rows.reduce((s, r) => s + r.del, 0);
  let total = ` ${plural(rows.length, 'file', 'files')} changed`;
  if (add > 0) total += `, ${plural(add, 'insertion(+)', 'insertions(+)')}`;
  if (del > 0) total += `, ${plural(del, 'deletion(-)', 'deletions(-)')}`;
  out.push(total);
  for (const r of rows) if (r.mode) out.push(` ${r.mode} mode 100644 ${r.path}`);
  return out;
}

/* ---------- git helpers ---------- */

function hash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 7);
}

export const headCommit = (r: Repo): Commit | null => {
  const id = r.branches[r.head];
  return id ? r.commits[id] : null;
};
const headFiles = (r: Repo): Record<string, string> => headCommit(r)?.files ?? {};

function ancestors(r: Repo, id: string | null): Set<string> {
  const seen = new Set<string>();
  const stack = id ? [id] : [];
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(c)) continue;
    seen.add(c);
    stack.push(...r.commits[c].parents);
  }
  return seen;
}

function globToRegex(g: string): RegExp {
  const esc = g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp('^' + esc + '$');
}

/** Very small .gitignore: names, *.ext style globs, and directory names ending in a slash. */
export function ignoreRules(state: Shell, repo: Repo): ((relPath: string) => boolean) {
  const text = readFile(state, `${repo.root}/.gitignore`) ?? '';
  const rules = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => ({ dirOnly: l.endsWith('/'), re: globToRegex(l.replace(/^\//, '').replace(/\/$/, '')) }));
  return (rel) => {
    const parts = rel.split('/');
    return rules.some((r) => parts.some((part, i) => r.re.test(part) && (!r.dirOnly || i < parts.length - 1)));
  };
}

function workingFiles(state: Shell, repo: Repo): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rel of filesUnder(state.fs, repo.root)) out[rel] = readFile(state, `${repo.root}/${rel}`) ?? '';
  return out;
}

export type FileStatus = 'untracked' | 'ignored' | 'clean' | 'modified' | 'staged-new' | 'staged-modified' | 'staged-deleted' | 'staged+modified' | 'deleted';

export type StatusInfo = {
  staged: { path: string; kind: 'new file' | 'modified' | 'deleted' }[];
  unstaged: { path: string; kind: 'modified' | 'deleted' }[];
  untracked: string[];
};

export function statusInfo(state: Shell, repo: Repo): StatusInfo {
  const work = workingFiles(state, repo);
  const head = headFiles(repo);
  const ignored = ignoreRules(state, repo);
  const staged: StatusInfo['staged'] = [];
  for (const p of Object.keys({ ...repo.index, ...head }).sort()) {
    if (repo.index[p] !== undefined && head[p] === undefined) staged.push({ path: p, kind: 'new file' });
    else if (repo.index[p] === undefined && head[p] !== undefined) staged.push({ path: p, kind: 'deleted' });
    else if (repo.index[p] !== head[p]) staged.push({ path: p, kind: 'modified' });
  }
  const unstaged: StatusInfo['unstaged'] = [];
  for (const p of Object.keys(repo.index).sort()) {
    if (work[p] === undefined) unstaged.push({ path: p, kind: 'deleted' });
    else if (work[p] !== repo.index[p]) unstaged.push({ path: p, kind: 'modified' });
  }
  const untracked = Object.keys(work)
    .filter((p) => repo.index[p] === undefined && !ignored(p))
    .sort();
  return { staged, unstaged, untracked };
}

/** Collapse untracked files into folder names when nothing in the folder is tracked, as git does. */
function untrackedDisplay(repo: Repo, untracked: string[]): string[] {
  const shown = new Set<string>();
  for (const p of untracked) {
    const top = p.split('/')[0];
    const tracked = Object.keys(repo.index).some((q) => q.startsWith(top + '/'));
    shown.add(p.includes('/') && !tracked ? top + '/' : p);
  }
  return Array.from(shown).sort();
}

export function statusText(state: Shell, repo: Repo): string[] {
  const s = statusInfo(state, repo);
  const noCommits = !headCommit(repo);
  const out: string[] = [`On branch ${repo.head}`];
  if (noCommits) out.push('', 'No commits yet');
  if (s.staged.length) {
    out.push('', 'Changes to be committed:', noCommits ? '  (use "git rm --cached <file>..." to unstage)' : '  (use "git restore --staged <file>..." to unstage)');
    for (const f of s.staged) out.push(`\t${(f.kind + ':').padEnd(12)}${f.path}`);
  }
  if (s.unstaged.length) {
    out.push('', 'Changes not staged for commit:', '  (use "git add <file>..." to update what will be committed)', '  (use "git restore <file>..." to discard changes in working directory)');
    for (const f of s.unstaged) out.push(`\t${(f.kind + ':').padEnd(12)}${f.path}`);
  }
  if (s.untracked.length) {
    out.push('', 'Untracked files:', '  (use "git add <file>..." to include in what will be committed)');
    for (const f of untrackedDisplay(repo, s.untracked)) out.push(`\t${f}`);
  }
  out.push('');
  if (!s.staged.length) {
    if (s.unstaged.length) out.push('no changes added to commit (use "git add" and/or "git commit -a")');
    else if (s.untracked.length) out.push('nothing added to commit but untracked files present (use "git add" to track)');
    else if (noCommits) out.push('nothing to commit (create/copy files and use "git add" to track)');
    else out.push('nothing to commit, working tree clean');
  }
  return out;
}

/** Per-file status for the picture of the three areas. */
export function fileStatuses(state: Shell, repo: Repo): { path: string; status: FileStatus }[] {
  const work = workingFiles(state, repo);
  const head = headFiles(repo);
  const ignored = ignoreRules(state, repo);
  const rows: { path: string; status: FileStatus }[] = [];
  for (const p of Array.from(new Set([...Object.keys(work), ...Object.keys(repo.index)])).sort()) {
    const inIndex = repo.index[p] !== undefined;
    if (!inIndex) {
      rows.push({ path: p, status: ignored(p) ? 'ignored' : 'untracked' });
      continue;
    }
    const stagedChange = head[p] === undefined ? 'new' : repo.index[p] !== head[p] ? 'mod' : null;
    const wt = work[p] === undefined ? 'del' : work[p] !== repo.index[p] ? 'mod' : null;
    if (stagedChange === 'new') rows.push({ path: p, status: wt ? 'staged+modified' : 'staged-new' });
    else if (stagedChange === 'mod') rows.push({ path: p, status: wt ? 'staged+modified' : 'staged-modified' });
    else rows.push({ path: p, status: wt === 'del' ? 'deleted' : wt === 'mod' ? 'modified' : 'clean' });
  }
  for (const p of Object.keys(head)) if (repo.index[p] === undefined) rows.push({ path: p, status: 'staged-deleted' });
  return rows;
}

/** Commits newest first, with the lane (column) each belongs to, for drawing the history graph. */
export function historyGraph(repo: Repo): { id: string; message: string; lane: number; parents: string[]; refs: string[] }[] {
  const names = Object.keys(repo.branches).sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b)));
  const lane: Record<string, number> = {};
  names.forEach((name, li) => {
    let id: string | null = repo.branches[name];
    while (id && lane[id] === undefined) {
      lane[id] = li;
      id = repo.commits[id].parents[0] ?? null;
    }
  });
  const all = Object.values(repo.commits).sort((a, b) => b.seq - a.seq);
  return all.map((c) => ({
    id: c.id,
    message: c.message,
    lane: lane[c.id] ?? 0,
    parents: c.parents,
    refs: names.filter((n) => repo.branches[n] === c.id).map((n) => (n === repo.head ? `HEAD -> ${n}` : n)),
  }));
}

/* ---------- running a line ---------- */

const NOT_REPO = 'fatal: not a git repository (or any of the parent directories): .git';

function relToRoot(state: Shell, repo: Repo, p: string): string | null {
  const abs = resolvePath(state.cwd, state.home, p);
  if (abs === repo.root) return '';
  return abs.startsWith(repo.root + '/') ? abs.slice(repo.root.length + 1) : null;
}

function tracked(repo: Repo, rel: string): string[] {
  return rel === '' ? Object.keys(repo.index) : Object.keys(repo.index).filter((q) => q === rel || q.startsWith(rel + '/'));
}

function checkout(state: Shell, repo: Repo, targetName: string): string[] | null {
  // returns an error message, or null after switching
  const targetId = repo.branches[targetName];
  const curFiles = headFiles(repo);
  const tgtFiles = targetId ? repo.commits[targetId].files : {};
  const work = workingFiles(state, repo);
  const blocked: string[] = [];
  for (const p of Array.from(new Set([...Object.keys(curFiles), ...Object.keys(tgtFiles)])).sort()) {
    if (curFiles[p] === tgtFiles[p]) continue;
    const dirty = repo.index[p] !== curFiles[p] || (repo.index[p] !== undefined && work[p] !== repo.index[p]);
    if (dirty) blocked.push(p);
  }
  if (blocked.length) {
    return ['error: Your local changes to the following files would be overwritten by checkout:', ...blocked.map((p) => `\t${p}`), 'Please commit your changes or stash them before you switch branches.', 'Aborting'];
  }
  for (const p of Array.from(new Set([...Object.keys(curFiles), ...Object.keys(tgtFiles)]))) {
    if (curFiles[p] === tgtFiles[p]) continue;
    const abs = `${repo.root}/${p}`;
    if (tgtFiles[p] === undefined) {
      removeNode(state.fs, abs);
      delete repo.index[p];
    } else {
      // make parent folders as needed
      const parts = p.split('/');
      for (let i = 1; i < parts.length; i++) {
        const d = `${repo.root}/${parts.slice(0, i).join('/')}`;
        if (!getNode(state.fs, d)) setNode(state.fs, d, dir());
      }
      setNode(state.fs, abs, file(tgtFiles[p]));
      repo.index[p] = tgtFiles[p];
    }
  }
  repo.head = targetName;
  return null;
}

function git(state: Shell, args: string[]): { out: string[]; ok: boolean } {
  const sub = args[0];
  const fail = (...out: string[]) => ({ out, ok: false });
  const done = (...out: string[]) => ({ out, ok: true });

  if (!sub) return done('usage: git <command> [<args>]', '', 'Commands used in this lesson: init, status, add, commit, diff, log, branch, switch, merge');

  if (sub === 'init') {
    if (state.repo) return done(`Reinitialized existing Git repository in ${state.repo.root}/.git/`);
    state.repo = { root: state.cwd, head: 'main', branches: { main: null }, commits: {}, index: {}, seq: 0 };
    return done(`Initialized empty Git repository in ${state.cwd}/.git/`);
  }

  const repo = state.repo;
  if (!repo || !(state.cwd === repo.root || state.cwd.startsWith(repo.root + '/'))) {
    if (!['status', 'add', 'commit', 'diff', 'log', 'branch', 'switch', 'checkout', 'merge'].includes(sub)) return fail(`git: '${sub}' is not a git command. See 'git --help'.`);
    return fail(NOT_REPO);
  }

  switch (sub) {
    case 'status':
      return done(...statusText(state, repo));

    case 'add': {
      const paths = args.slice(1).filter((a) => !a.startsWith('-'));
      if (paths.length === 0) return fail('Nothing specified, nothing added.', 'hint: Maybe you wanted to say \'git add .\'?');
      const ignored = ignoreRules(state, repo);
      const work = workingFiles(state, repo);
      const refused: string[] = [];
      for (const p of paths) {
        const rel = relToRoot(state, repo, p);
        if (rel === null) return fail(`fatal: ${p}: '${p}' is outside repository at '${repo.root}'`);
        const matches = Object.keys(work).filter((q) => rel === '' || q === rel || q.startsWith(rel + '/'));
        const goneTracked = tracked(repo, rel).filter((q) => work[q] === undefined);
        if (matches.length === 0 && goneTracked.length === 0) return fail(`fatal: pathspec '${p}' did not match any files`);
        const explicit = matches.length === 1 && matches[0] === rel;
        for (const q of matches) {
          if (ignored(q)) {
            if (explicit) refused.push(q);
            continue;
          }
          repo.index[q] = work[q];
        }
        for (const q of goneTracked) delete repo.index[q];
      }
      if (refused.length) return fail('The following paths are ignored by one of your .gitignore files:', ...refused, 'hint: Use -f if you really want to add them.');
      return done();
    }

    case 'commit': {
      const flags = args.slice(1);
      const all = flags.some((f) => /^-[a-z]*a[a-z]*$/.test(f) && !f.startsWith('--'));
      const mi = flags.findIndex((f) => /^-[a-z]*m$/.test(f));
      const message = mi >= 0 ? flags[mi + 1] : undefined;
      if (all) {
        const work = workingFiles(state, repo);
        for (const p of Object.keys(repo.index)) {
          if (work[p] === undefined) delete repo.index[p];
          else repo.index[p] = work[p];
        }
      }
      const head = headFiles(repo);
      const info = statusInfo(state, repo);
      if (info.staged.length === 0) return fail(...statusText(state, repo));
      if (!message) return fail('Aborting commit due to empty commit message.', '(This simulator has no editor, so give the message yourself: git commit -m "your message")');
      const parent = repo.branches[repo.head];
      const files = { ...repo.index };
      const id = hash(`${parent ?? ''}|${message}|${JSON.stringify(files)}`);
      repo.seq += 1;
      repo.commits[id] = { id, seq: repo.seq, parents: parent ? [parent] : [], message, files };
      repo.branches[repo.head] = id;
      return done(`[${repo.head}${parent ? '' : ' (root-commit)'} ${id}] ${message}`, ...statLines(head, files, false));
    }

    case 'diff': {
      const staged = args.includes('--staged') || args.includes('--cached');
      const work = workingFiles(state, repo);
      const a = staged ? headFiles(repo) : repo.index;
      const b = staged ? repo.index : work;
      const out: string[] = [];
      for (const p of Object.keys(a).sort()) {
        if (b[p] === undefined || b[p] === a[p]) continue;
        const ops = diffLines(a[p], b[p]);
        const nOld = ops.filter((o) => o.op !== '+').length;
        const nNew = ops.filter((o) => o.op !== '-').length;
        out.push(`diff --git a/${p} b/${p}`, `--- a/${p}`, `+++ b/${p}`, `@@ -1,${nOld} +1,${nNew} @@`, ...ops.map((o) => `${o.op}${o.text}`));
      }
      if (staged) {
        for (const p of Object.keys(b).sort()) {
          if (a[p] !== undefined || b[p] === undefined) continue;
          const ops = diffLines('', b[p]);
          out.push(`diff --git a/${p} b/${p}`, 'new file mode 100644', '--- /dev/null', `+++ b/${p}`, `@@ -0,0 +1,${ops.length} @@`, ...ops.map((o) => `${o.op}${o.text}`));
        }
      }
      return done(...out);
    }

    case 'log': {
      if (!headCommit(repo)) return fail(`fatal: your current branch '${repo.head}' does not have any commits yet`);
      const mine = ancestors(repo, repo.branches[repo.head]);
      const rows = historyGraph(repo).filter((r) => mine.has(r.id));
      const out = rows.map((r) => `${r.id}${r.refs.length ? ` (${r.refs.join(', ')})` : ''} ${r.message}`);
      if (!args.includes('--oneline')) out.push('', '(Simulator note: real "git log" also shows author and date. This is the short form, like "git log --oneline".)');
      return done(...out);
    }

    case 'branch': {
      const names = args.slice(1).filter((a) => !a.startsWith('-'));
      if (names.length === 0) return done(...Object.keys(repo.branches).sort().map((n) => `${n === repo.head ? '* ' : '  '}${n}`));
      const name = names[0];
      if (repo.branches[name] !== undefined) return fail(`fatal: a branch named '${name}' already exists`);
      const id = repo.branches[repo.head];
      if (!id) return fail(`fatal: not a valid object name: '${repo.head}'`, '(Make a first commit before you create a branch.)');
      repo.branches[name] = id;
      return done();
    }

    case 'switch':
    case 'checkout': {
      const create = args.includes('-c') || args.includes('-b');
      const name = args.slice(1).filter((a) => !a.startsWith('-'))[0];
      if (!name) return fail(`fatal: missing branch name`);
      if (create) {
        if (repo.branches[name] !== undefined) return fail(`fatal: a branch named '${name}' already exists`);
        const id = repo.branches[repo.head];
        if (!id) return fail('fatal: you need at least one commit before you can make a branch.');
        repo.branches[name] = id;
        repo.head = name;
        return done(`Switched to a new branch '${name}'`);
      }
      if (repo.branches[name] === undefined) return fail(sub === 'switch' ? `fatal: invalid reference: ${name}` : `error: pathspec '${name}' did not match any file(s) known to git`);
      if (name === repo.head) return done(`Already on '${name}'`);
      const err = checkout(state, repo, name);
      return err ? fail(...err) : done(`Switched to branch '${name}'`);
    }

    case 'merge': {
      const name = args.slice(1).filter((a) => !a.startsWith('-'))[0];
      if (!name) return fail('fatal: No commit specified and merge.defaultToUpstream not set.');
      const theirs = repo.branches[name];
      if (theirs === undefined) return fail(`merge: ${name} - not something we can merge`);
      const ours = repo.branches[repo.head];
      if (!theirs || !ours) return fail('fatal: you need a commit on both sides to merge.');
      const info = statusInfo(state, repo);
      if (info.staged.length || info.unstaged.length) {
        return fail('error: Your local changes would be overwritten by merge.', 'Please commit your changes first.', 'Aborting');
      }
      const mineSet = ancestors(repo, ours);
      if (mineSet.has(theirs)) return done('Already up to date.');
      const theirSet = ancestors(repo, theirs);
      const before = repo.commits[ours].files;
      if (theirSet.has(ours)) {
        const after = repo.commits[theirs].files;
        const a = ours;
        repo.branches[repo.head] = theirs;
        applyFiles(state, repo, before, after);
        return done(`Updating ${a}..${theirs}`, 'Fast-forward', ...statLines(before, after));
      }
      // three-way merge at file level; the base is the newest commit both sides share
      const shared = [...mineSet].filter((c) => theirSet.has(c)).sort((x, y) => repo.commits[y].seq - repo.commits[x].seq);
      const base = shared.length ? repo.commits[shared[0]].files : {};
      const t = repo.commits[theirs].files;
      const merged: Record<string, string> = {};
      const conflicts: string[] = [];
      for (const p of Array.from(new Set([...Object.keys(base), ...Object.keys(before), ...Object.keys(t)])).sort()) {
        const o = before[p];
        const th = t[p];
        const b = base[p];
        let pick: string | undefined;
        if (o === th) pick = o;
        else if (o === b) pick = th;
        else if (th === b) pick = o;
        else {
          conflicts.push(p);
          continue;
        }
        if (pick !== undefined) merged[p] = pick;
      }
      if (conflicts.length) {
        return fail(
          ...conflicts.flatMap((p) => [`Auto-merging ${p}`, `CONFLICT (content): Merge conflict in ${p}`]),
          'Automatic merge failed; fix conflicts and then commit the result.',
          '(Simulator note: real git would put conflict markers in the file for you to edit. This simulator stops here and leaves everything as it was.)',
        );
      }
      applyFiles(state, repo, before, merged);
      const message = `Merge branch '${name}'`;
      const id = hash(`${ours}|${theirs}|${message}|${JSON.stringify(merged)}`);
      repo.seq += 1;
      repo.commits[id] = { id, seq: repo.seq, parents: [ours, theirs], message, files: merged };
      repo.branches[repo.head] = id;
      return done("Merge made by the 'ort' strategy.", ...statLines(before, merged));
    }

    default:
      return fail(`git: '${sub}' is not a git command. See 'git --help'.`);
  }
}

/** Make the working folder and the staging area match a new snapshot, for files that changed between two snapshots. */
function applyFiles(state: Shell, repo: Repo, from: Record<string, string>, to: Record<string, string>): void {
  for (const p of Array.from(new Set([...Object.keys(from), ...Object.keys(to)]))) {
    if (from[p] === to[p]) continue;
    const abs = `${repo.root}/${p}`;
    if (to[p] === undefined) {
      removeNode(state.fs, abs);
      delete repo.index[p];
    } else {
      const parts = p.split('/');
      for (let i = 1; i < parts.length; i++) {
        const d = `${repo.root}/${parts.slice(0, i).join('/')}`;
        if (!getNode(state.fs, d)) setNode(state.fs, d, dir());
      }
      setNode(state.fs, abs, file(to[p]));
      repo.index[p] = to[p];
    }
  }
}

export const HELP = [
  'Commands in this simulator:',
  '  pwd                    show the folder you are in',
  '  ls [-a] [folder]       list what is inside (-a also shows hidden names)',
  '  cd folder              move into a folder (cd .. goes up, cd alone goes home)',
  '  cat file               print what is inside a file',
  '  mkdir name             make a new folder',
  '  echo "text" > file     write text into a file (>> adds to the end)',
  '  git init | status | add | commit -m | diff | log --oneline',
  '  git branch | switch [-c] | merge',
  '  clear                  clear the screen',
];

/** Run one command line against a copy of the state. */
export function run(prev: Shell, line: string): Result {
  const state: Shell = structuredClone(prev);
  const text = line.trim();
  if (!text) return { state, out: [], ok: true };

  // redirection: find > or >> outside quotes by tokenising and looking for a bare token
  const rawTokens = tokenise(text);
  let redirect: { path: string; append: boolean } | null = null;
  let tokens = rawTokens;
  const gi = rawTokens.findIndex((t, i) => (t === '>' || t === '>>') && isBareToken(text, i));
  if (gi >= 0) {
    if (!rawTokens[gi + 1]) return { state, out: ['bash: syntax error near unexpected token `newline\''], ok: false };
    redirect = { path: rawTokens[gi + 1], append: rawTokens[gi] === '>>' };
    tokens = rawTokens.slice(0, gi);
  }
  const [cmd, ...args] = tokens;
  const reply = (out: string[], ok = true): Result => ({ state, out, ok });

  if (redirect) {
    if (cmd !== 'echo') return reply([`bash: redirection is only supported with echo in this simulator`], false);
    const abs = resolvePath(state.cwd, state.home, redirect.path);
    const existing = getNode(state.fs, abs);
    if (existing && existing.type === 'dir') return reply([`bash: ${redirect.path}: Is a directory`], false);
    const body = args.join(' ') + '\n';
    const content = redirect.append && existing && existing.type === 'file' ? existing.content + body : body;
    if (!setNode(state.fs, abs, file(content))) return reply([`bash: ${redirect.path}: No such file or directory`], false);
    return reply([]);
  }

  switch (cmd) {
    case 'pwd':
      return reply([state.cwd]);
    case 'echo':
      return reply([args.join(' ')]);
    case 'help':
      return reply(HELP);
    case 'cd': {
      const target = args[0] ?? '~';
      const abs = resolvePath(state.cwd, state.home, target);
      const n = getNode(state.fs, abs);
      if (!n) return reply([`bash: cd: ${target}: No such file or directory`], false);
      if (n.type !== 'dir') return reply([`bash: cd: ${target}: Not a directory`], false);
      state.cwd = abs;
      return reply([]);
    }
    case 'ls': {
      const flags = args.filter((a) => a.startsWith('-'));
      const bad = flags.find((f) => /[^-al]/.test(f));
      if (bad) return reply([`ls: invalid option -- '${bad.replace(/[-al]/g, '')[0]}'`], false);
      const all = flags.some((f) => f.includes('a'));
      const target = args.find((a) => !a.startsWith('-')) ?? '.';
      const abs = resolvePath(state.cwd, state.home, target);
      const n = getNode(state.fs, abs);
      if (!n) return reply([`ls: cannot access '${target}': No such file or directory`], false);
      if (n.type === 'file') return reply([target]);
      let names = Object.keys(n.children).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).map((k) => (n.children[k].type === 'dir' ? k + '/' : k));
      const hidden = names.filter((k) => k.startsWith('.'));
      names = names.filter((k) => !k.startsWith('.'));
      if (all) names = ['.', '..', ...(state.repo && state.repo.root === abs ? ['.git/'] : []), ...hidden, ...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
      return reply(names.length ? [names.join('  ')] : []);
    }
    case 'cat': {
      if (args.length === 0) return reply(['cat: this simulator needs a file name, for example: cat notes.txt'], false);
      const out: string[] = [];
      let ok = true;
      for (const a of args) {
        const n = getNode(state.fs, resolvePath(state.cwd, state.home, a));
        if (!n) {
          out.push(`cat: ${a}: No such file or directory`);
          ok = false;
        } else if (n.type === 'dir') {
          out.push(`cat: ${a}: Is a directory`);
          ok = false;
        } else out.push(...linesOf(n.content));
      }
      return reply(out, ok);
    }
    case 'mkdir': {
      if (args.length === 0) return reply(['mkdir: missing operand'], false);
      for (const a of args) {
        const abs = resolvePath(state.cwd, state.home, a);
        if (getNode(state.fs, abs)) return reply([`mkdir: cannot create directory '${a}': File exists`], false);
        if (!setNode(state.fs, abs, dir())) return reply([`mkdir: cannot create directory '${a}': No such file or directory`], false);
      }
      return reply([]);
    }
    case 'git': {
      const r = git(state, args);
      return reply(r.out, r.ok);
    }
    default:
      return reply([`bash: ${cmd}: command not found`], false);
  }
}

/** True if the i-th token came from unquoted text (so a quoted ">" is not treated as redirection). */
function isBareToken(line: string, index: number): boolean {
  // walk the line again, tracking which tokens contained quote characters
  let cur = '';
  let quote: string | null = null;
  let has = false;
  let quoted = false;
  let n = 0;
  for (const ch of line + ' ') {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
      quoted = true;
    } else if (/\s/.test(ch)) {
      if (cur || has) {
        if (n === index) return !quoted;
        n++;
      }
      cur = '';
      has = false;
      quoted = false;
    } else cur += ch;
  }
  return true;
}
