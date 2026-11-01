import { useEffect, useId, useRef, useState } from 'react';
import { Root } from './shared';
import { HELP, fileStatuses, historyGraph, initialShell, run, type Entry, type FileStatus, type Repo, type Shell } from '../../lib/fake-shell';
import { GIT_TASKS, SHELL_TASKS } from '../../lib/terminal-tasks';

type Mode = 'shell' | 'git';
type Line = { kind: 'in' | 'out' | 'err' | 'note'; text: string };

const CHIPS: Record<Mode, string[]> = {
  shell: ['pwd', 'ls', 'cd project', 'cd ..', 'cat notes.txt', 'mkdir data', 'help'],
  git: [
    'git init',
    'git status',
    'git add notes.txt',
    'git add .',
    'git commit -m "first save"',
    'echo "more ideas" >> notes.txt',
    'git diff',
    'git commit -am "more ideas"',
    'git log --oneline',
    'git switch -c experiment',
    'git switch main',
    'git merge experiment',
    'git branch',
  ],
};

const START_NOTE: Record<Mode, string> = {
  shell: 'A pretend computer. Type a command and press Enter, or tap one below. Type help to see them all. Folder names end in / here; a real terminal would colour them instead.',
  git: 'A pretend project folder with one file, notes.txt. Type a command, or tap one below. Output is a close imitation of git, with made-up save-point codes.',
};

const STATUS_WORD: Record<FileStatus, string> = {
  untracked: 'new, not tracked',
  ignored: 'ignored',
  clean: 'saved, unchanged',
  modified: 'changed, not staged',
  'staged-new': 'staged (new)',
  'staged-modified': 'staged',
  'staged-deleted': 'staged (removed)',
  'staged+modified': 'staged, then changed again',
  deleted: 'removed, not staged',
};

const LANE_VAR = ['var(--signal)', 'var(--ok)', 'var(--warn)', 'var(--ink-2)'];
const ROW = 44;
const LANE = 22;

function Graph({ repo }: { repo: Repo }) {
  const rows = historyGraph(repo);
  if (rows.length === 0) return <p className="ws-note">No save points yet. The history starts with your first commit.</p>;
  const lanes = Math.max(...rows.map((r) => r.lane)) + 1;
  const w = lanes * LANE + 10;
  const x = (l: number) => 12 + l * LANE;
  const y = (i: number) => ROW / 2 + i * ROW;
  const index: Record<string, number> = {};
  rows.forEach((r, i) => (index[r.id] = i));
  return (
    <div className="ws-graph">
      <svg width={w} height={rows.length * ROW} viewBox={`0 0 ${w} ${rows.length * ROW}`} aria-hidden="true" className="ws-graph-svg">
        {rows.flatMap((r, i) =>
          r.parents.map((p) => {
            const j = index[p];
            const pl = rows[j].lane;
            const mid = (y(i) + y(j)) / 2;
            return <path key={r.id + p} d={`M${x(r.lane)},${y(i)} C${x(r.lane)},${mid} ${x(pl)},${mid} ${x(pl)},${y(j)}`} stroke={LANE_VAR[pl % 4]} />;
          }),
        )}
        {rows.map((r, i) => (
          <circle key={r.id} cx={x(r.lane)} cy={y(i)} r={6} fill={LANE_VAR[r.lane % 4]} />
        ))}
      </svg>
      <ol className="ws-graph-rows">
        {rows.map((r) => (
          <li key={r.id}>
            <span className="ws-sha">{r.id}</span>
            {r.refs.map((ref) => (
              <span key={ref} className="ws-ref">
                {ref}
              </span>
            ))}
            <span className="ws-msg">{r.message}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ThreePlaces({ shell }: { shell: Shell }) {
  const repo = shell.repo;
  if (!repo) return <p className="ws-note">This folder is not tracked yet. Run <code>git init</code> to start.</p>;
  const files = fileStatuses(shell, repo);
  const staged = files.filter((f) => f.status.startsWith('staged'));
  return (
    <div className="ws-places">
      <section aria-label="Working folder">
        <h4>Working folder</h4>
        <p className="ws-note">Your files as they are now.</p>
        <ul>
          {files.filter((f) => f.status !== 'staged-deleted').map((f) => (
            <li key={f.path}>
              <code>{f.path}</code> <span className={'ws-tag is-' + f.status.replace('+', '-')}>{STATUS_WORD[f.status]}</span>
            </li>
          ))}
          {files.filter((f) => f.status !== 'staged-deleted').length === 0 && <li className="ws-note">No files.</li>}
        </ul>
      </section>
      <section aria-label="Staging area">
        <h4>Staging area</h4>
        <p className="ws-note">What the next save point will contain, changes only.</p>
        <ul>
          {staged.map((f) => (
            <li key={f.path}>
              <code>{f.path}</code> <span className="ws-tag is-staged-new">{STATUS_WORD[f.status]}</span>
            </li>
          ))}
          {staged.length === 0 && <li className="ws-note">Nothing staged.</li>}
        </ul>
      </section>
      <section aria-label="Saved history" className="ws-places-wide">
        <h4>Saved history, newest first</h4>
        <Graph repo={repo} />
      </section>
    </div>
  );
}

/**
 * A pretend terminal on an invented folder. In "shell" mode the learner practises pwd, ls, cd, cat and mkdir;
 * in "git" mode they run the save-point cycle, branch and merge, and watch three areas and the history graph change.
 * Everything runs in the page: nothing is sent anywhere and no real files are touched.
 */
export default function TerminalLab({ mode }: { mode: Mode }) {
  const [shell, setShell] = useState<Shell>(() => initialShell(mode));
  const [lines, setLines] = useState<Line[]>([{ kind: 'note', text: START_NOTE[mode] }]);
  const [log, setLog] = useState<Entry[]>([]);
  const [value, setValue] = useState('');
  const [past, setPast] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const screen = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const uid = useId();
  const tasks = mode === 'git' ? GIT_TASKS : SHELL_TASKS;
  const doneFlags = tasks.map((t) => t.check(shell, log));
  const doneCount = doneFlags.filter(Boolean).length;
  const nextTask = tasks.find((_, i) => !doneFlags[i]);

  useEffect(() => {
    const el = screen.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const prompt = () => {
    const rel = shell.cwd === shell.home ? '~' : shell.cwd.startsWith(shell.home + '/') ? '~' + shell.cwd.slice(shell.home.length) : shell.cwd;
    return `${rel} $`;
  };

  const exec = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    if (text === 'clear') {
      setLines([]);
      setValue('');
      return;
    }
    const r = run(shell, text);
    setShell(r.state);
    setLog((l) => [...l, { cmd: text, ok: r.ok, out: r.out }]);
    setLines((ls) => [...ls, { kind: 'in', text: `${prompt()} ${text}` }, ...r.out.map((t): Line => ({ kind: r.ok ? 'out' : 'err', text: t }))]);
    setPast((p) => [...p, text]);
    setCursor(-1);
    setValue('');
  };

  const reset = () => {
    setShell(initialShell(mode));
    setLines([{ kind: 'note', text: START_NOTE[mode] }]);
    setLog([]);
    setValue('');
    setPast([]);
    setCursor(-1);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' && past.length) {
      e.preventDefault();
      const c = cursor < 0 ? past.length - 1 : Math.max(0, cursor - 1);
      setCursor(c);
      setValue(past[c]);
    } else if (e.key === 'ArrowDown' && cursor >= 0) {
      e.preventDefault();
      const c = cursor + 1;
      if (c >= past.length) {
        setCursor(-1);
        setValue('');
      } else {
        setCursor(c);
        setValue(past[c]);
      }
    }
  };

  return (
    <Root>
      <div className="viz ws-term">
        <div className="ws-top">
          <p className="viz-title">{mode === 'git' ? 'Git practice: save points, branches, merging' : 'Your first terminal'}</p>
          <p className="ws-count" aria-live="polite">
            {doneCount} of {tasks.length} tasks done
          </p>
        </div>

        <ol className="ws-tasks" aria-label="Tasks">
          {tasks.map((t, i) => (
            <li key={t.id} className={doneFlags[i] ? 'is-done' : ''}>
              <span className="ws-tick" aria-hidden="true">{doneFlags[i] ? '✓' : ''}</span>
              <span>
                {t.text}
                <span className="ws-sr">{doneFlags[i] ? ' (done)' : ' (to do)'}</span>
              </span>
            </li>
          ))}
        </ol>
        {nextTask ? (
          <p className="ws-note">
            Next: <code>{nextTask.hint}</code>
          </p>
        ) : (
          <p className="ws-note ws-yes">All tasks done. You can keep experimenting, or press Reset to start again.</p>
        )}

        <div className="ws-screen" ref={screen} role="log" aria-live="polite" aria-label="Terminal output" tabIndex={0}>
          {lines.map((l, i) => (
            <div key={i} className={'ws-line is-' + l.kind}>
              {l.text || ' '}
            </div>
          ))}
        </div>

        <form
          className="ws-form"
          onSubmit={(e) => {
            e.preventDefault();
            exec(value);
          }}
        >
          <label htmlFor={uid} className="ws-prompt">
            {prompt()}
          </label>
          <input
            id={uid}
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="type a command"
          />
          <button type="submit" className="btn">
            Run
          </button>
        </form>

        <div className="ws-chips" role="group" aria-label="Commands to try. Tapping one fills the box.">
          {CHIPS[mode].map((c) => (
            <button
              key={c}
              type="button"
              className="ws-chip ws-code"
              onClick={() => {
                setValue(c);
                input.current?.focus();
              }}
            >
              {c}
            </button>
          ))}
          <button type="button" className="btn quiet" onClick={reset}>
            Reset
          </button>
        </div>

        {mode === 'git' && <ThreePlaces shell={shell} />}
        <p className="ws-note">
          {mode === 'git' ? 'A simplified imitation of git for learning. When a merge would conflict, this one stops and changes nothing.' : 'Only these commands exist here: ' + HELP.slice(1, 7).map((h) => h.trim().split(' ')[0]).join(', ') + '.'}
        </p>
      </div>
    </Root>
  );
}
