import { getNode, readFile, type Entry, type Shell } from './fake-shell';

export type Task = { id: string; text: string; hint: string; check: (s: Shell, log: Entry[]) => boolean };

const ran = (log: Entry[], re: RegExp) => log.some((e) => e.ok && re.test(e.cmd.trim()));
const ranAfter = (log: Entry[], first: RegExp, then: RegExp) => {
  const i = log.findIndex((e) => e.ok && first.test(e.cmd.trim()));
  return i >= 0 && log.slice(i + 1).some((e) => e.ok && then.test(e.cmd.trim()));
};

/** Tasks for the "first terminal" practice: five commands on an invented home folder. */
export const SHELL_TASKS: Task[] = [
  { id: 'pwd', text: 'Find out which folder you are in', hint: 'pwd', check: (_s, log) => ran(log, /^pwd$/) },
  { id: 'ls', text: 'List what is in the folder', hint: 'ls', check: (_s, log) => ran(log, /^ls\b/) },
  { id: 'cd', text: 'Move into the folder called project', hint: 'cd project', check: (s) => s.cwd === '/home/you/project' },
  { id: 'cat', text: 'Read the file notes.txt', hint: 'cat notes.txt', check: (_s, log) => log.some((e) => e.ok && /^cat\s+(\.\/)?notes\.txt$/.test(e.cmd.trim())) },
  { id: 'mkdir', text: 'Make a new folder called data inside project', hint: 'mkdir data', check: (s) => getNode(s.fs, '/home/you/project/data')?.type === 'dir' },
];

/** Tasks for the git practice: the save-point cycle, a branch, a merge and a secret kept out. */
export const GIT_TASKS: Task[] = [
  { id: 'init', text: 'Start tracking the folder', hint: 'git init', check: (s) => s.repo !== null },
  { id: 'status', text: 'Ask what git can see', hint: 'git status', check: (_s, log) => ranAfter(log, /^git init$/, /^git status$/) },
  { id: 'add', text: 'Put notes.txt in the staging area', hint: 'git add notes.txt', check: (s) => !!s.repo && (s.repo.index['notes.txt'] !== undefined) },
  { id: 'commit', text: 'Make your first save point', hint: 'git commit -m "first save"', check: (s) => !!s.repo && Object.keys(s.repo.commits).length >= 1 },
  {
    id: 'second',
    text: 'Add a line to notes.txt, then save it as a second save point',
    hint: 'echo "more ideas" >> notes.txt   then   git commit -am "more ideas"',
    check: (s) => !!s.repo && Object.keys(s.repo.commits).length >= 2,
  },
  { id: 'log', text: 'Read the history', hint: 'git log --oneline', check: (_s, log) => ran(log, /^git log\b/) },
  {
    id: 'branch',
    text: 'Make a branch called experiment and save a change on it',
    hint: 'git switch -c experiment   then edit a file and   git commit -am "try it"',
    check: (s, log) => !!s.repo && s.repo.branches.experiment !== undefined && ranAfter(log, /^git (switch|checkout) -[cb] experiment$/, /^git commit\b/),
  },
  { id: 'merge', text: 'Go back to main and merge experiment into it', hint: 'git switch main   then   git merge experiment', check: (_s, log) => ranAfter(log, /^git switch -c experiment$/, /^git merge experiment$/) },
  {
    id: 'secret',
    text: 'Keep a secret out: make a file .env, list it in .gitignore, and check git status no longer shows it',
    hint: 'echo "KEY=not-a-real-key" > .env   then   echo ".env" > .gitignore   then   git status',
    check: (s, log) => {
      if (!s.repo) return false;
      if (readFile(s, `${s.repo.root}/.env`) === null) return false;
      if (!(readFile(s, `${s.repo.root}/.gitignore`) ?? '').split('\n').includes('.env')) return false;
      const last = [...log].reverse().find((e) => e.ok && /^git status$/.test(e.cmd.trim()));
      return !!last && !last.out.some((l) => l.trim() === '.env');
    },
  },
];
