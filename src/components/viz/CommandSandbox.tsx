import { useState } from 'react';
import { Root } from './shared';
import { commands, helpLines, type Command } from '../../data/sandbox';

type Line = { kind: 'in' | 'out' | 'note'; text: string };

/** Find a recorded command. The learner's first words must match the start of the recorded one. */
function find(input: string): Command | undefined {
  const typed = input.trim().replace(/\s+/g, ' ');
  return commands.find((c) => typed === c.cmd || typed.startsWith(c.cmd.split(' ').slice(0, 2).join(' ')));
}

/**
 * A terminal that replays recorded output for the tool commands. It cannot
 * run the real tools in the browser; it shows what each command prints and
 * what to look for in it.
 */
export default function CommandSandbox() {
  const [history, setHistory] = useState<Line[]>(() => helpLines.map((text) => ({ kind: 'note' as const, text })));
  const [value, setValue] = useState('');

  const run = (raw: string) => {
    const typed = raw.trim();
    if (!typed) return;
    const next: Line[] = [{ kind: 'in', text: typed }];
    if (typed === 'help') {
      next.push(...commands.map((c) => ({ kind: 'out' as const, text: c.cmd })));
    } else {
      const hit = find(typed);
      if (hit) {
        next.push(...hit.output.map((text) => ({ kind: 'out' as const, text })));
        next.push({ kind: 'note', text: hit.note });
      } else {
        next.push({ kind: 'out', text: `not in this sandbox: ${typed.split(' ')[0]}. Type "help" to see the recorded commands.` });
      }
    }
    setHistory((h) => [...h, ...next]);
    setValue('');
  };

  return (
    <Root>
      <div className="viz dx cs">
        <p className="viz-title">Terminal, recorded output</p>
        <div className="cs-screen" role="log" aria-live="polite">
          {history.map((l, i) => (
            <div key={i} className={`cs-line cs-${l.kind}`}>
              {l.kind === 'in' ? <><span className="cs-prompt">$ </span>{l.text}</> : l.text}
            </div>
          ))}
        </div>
        <form
          className="cs-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(value);
          }}
        >
          <span className="cs-prompt" aria-hidden="true">$</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} aria-label="Command" placeholder="type a command" spellCheck={false} autoComplete="off" />
          <button type="submit" className="btn quiet">Run</button>
        </form>
        <div className="cs-suggest">
          {commands.slice(0, 4).map((c) => (
            <button key={c.cmd} type="button" className="btn quiet" onClick={() => run(c.cmd)}>
              {c.cmd.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
        <p className="viz-cap">Output is recorded from example runs. Versions, model sizes and hardware change what your own machine prints.</p>
      </div>
    </Root>
  );
}
