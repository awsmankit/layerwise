import { useState } from 'react';
import { Root } from './shared';
import { disagreements, editCell, newNotebook, restartAndRunAll, runCell, type Notebook } from '../../lib/notebook-sim';

const EDITS: Record<string, string> = { 'price = 10': 'price = 20', 'price = 20': 'price = 10' };

/**
 * Three notebook cells and a kernel that remembers. Run them in any order, edit the first, and see how an output can
 * go stale. "Restart and run all" is the honest check. The cells use a tiny stand-in for Python.
 */
export default function NotebookOrder() {
  const [nb, setNb] = useState<Notebook>(() => newNotebook());
  const off = disagreements(nb);
  const fresh = restartAndRunAll(nb);
  const stale = nb.cells.map((_, i) => (off[i] ? i : -1)).filter((i) => i >= 0);
  const vars = Object.entries(nb.vars);

  return (
    <Root>
      <div className="viz ws-nb">
        <div className="ws-top">
          <p className="viz-title">A notebook with a memory</p>
          <div className="ws-btns">
            <button type="button" className="btn" onClick={() => setNb(restartAndRunAll(nb))}>
              Restart and run all
            </button>
            <button type="button" className="btn quiet" onClick={() => setNb(newNotebook())}>
              Start over
            </button>
          </div>
        </div>
        <p className="ws-note">
          Run the cells in order, then press the button in cell 1 to change the price, and run only some cells again. A stand-in for Python, with three one-line cells.
        </p>

        <ol className="ws-cells-list">
          {nb.cells.map((c, i) => (
            <li key={i} className={'ws-cell' + (off[i] ? ' is-stale' : '')}>
              <div className="ws-cell-head">
                <span className="ws-in" aria-label={c.count === null ? 'Not run yet' : `Run number ${c.count}`}>
                  In [{c.count === null ? ' ' : c.count}]
                </span>
                <code className="ws-src">{c.src}</code>
                <button type="button" className="btn quiet" onClick={() => setNb(runCell(nb, i))} aria-label={`Run cell ${i + 1}`}>
                  Run cell {i + 1}
                </button>
              </div>
              {i === 0 && (
                <button type="button" className="ws-chip" onClick={() => setNb(editCell(nb, 0, EDITS[c.src] ?? 'price = 10'))}>
                  Edit cell 1: change it to <code>{EDITS[c.src] ?? 'price = 10'}</code>
                </button>
              )}
              {(c.out !== null || c.error !== null) && (
                <div className={'ws-out' + (c.error ? ' is-err' : '')}>
                  <span className="ws-in">Out</span> {c.error ?? c.out}
                </div>
              )}
              {off[i] && (
                <p className="ws-note ws-bad">
                  Out of date: a clean top-to-bottom run would show {fresh.cells[i].error ?? fresh.cells[i].out ?? 'nothing'}.
                </p>
              )}
            </li>
          ))}
        </ol>

        <p className="ws-kernel">
          Kernel memory: {vars.length ? vars.map(([k, v]) => `${k} = ${v}`).join(', ') : 'empty'}
        </p>
        <p className="ws-say" aria-live="polite">
          {nb.counter === 0
            ? 'Nothing has run yet. The kernel is empty.'
            : stale.length
              ? `What you see disagrees with the code in cell${stale.length > 1 ? 's' : ''} ${stale.map((i) => i + 1).join(' and ')}. Someone who reads this notebook would be misled. Press Restart and run all.`
              : 'Every output matches what a clean run from the top would show.'}
        </p>
      </div>
    </Root>
  );
}
