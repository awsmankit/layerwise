/**
 * A tiny model of a notebook kernel, for the "run order matters" demo. Cells hold one-line statements of the forms
 * `name = expression` and `print(name)`, where an expression uses numbers, names and + - * / with brackets.
 * This is a stand-in for Python, not Python.
 */

export type Cell = { src: string; count: number | null; out: string | null; error: string | null };
export type Notebook = { cells: Cell[]; vars: Record<string, number>; counter: number };

export const START_CELLS = ['price = 10', 'total = price * 3', 'print(total)'];

export function newNotebook(srcs: string[] = START_CELLS): Notebook {
  return { cells: srcs.map((src) => ({ src, count: null, out: null, error: null })), vars: {}, counter: 0 };
}

class NameErr extends Error {}

function evaluate(expr: string, vars: Record<string, number>): number {
  const tokens = expr.match(/\d+(?:\.\d+)?|[A-Za-z_]\w*|[()+\-*/]|\S/g) ?? [];
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  function atom(): number {
    const t = next();
    if (t === undefined) throw new SyntaxError('invalid syntax');
    if (t === '(') {
      const v = sum();
      if (next() !== ')') throw new SyntaxError("'(' was never closed");
      return v;
    }
    if (t === '-') return -atom();
    if (/^\d/.test(t)) return Number(t);
    if (/^[A-Za-z_]/.test(t)) {
      if (!(t in vars)) throw new NameErr(`name '${t}' is not defined`);
      return vars[t];
    }
    throw new SyntaxError('invalid syntax');
  }
  function product(): number {
    let v = atom();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const r = atom();
      if (op === '/' && r === 0) throw new RangeError('division by zero');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function sum(): number {
    let v = product();
    while (peek() === '+' || peek() === '-') v = next() === '+' ? v + product() : v - product();
    return v;
  }
  const v = sum();
  if (pos < tokens.length) throw new SyntaxError('invalid syntax');
  return v;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 1e6) / 1e6));

/** Run one cell in the current kernel. Every run, successful or not, takes the next In [n] number. */
export function runCell(nb: Notebook, i: number): Notebook {
  const next: Notebook = { cells: nb.cells.map((c) => ({ ...c })), vars: { ...nb.vars }, counter: nb.counter + 1 };
  const cell = next.cells[i];
  cell.count = next.counter;
  cell.out = null;
  cell.error = null;
  const src = cell.src.trim();
  try {
    const assign = /^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(src);
    const show = /^print\((.*)\)$/.exec(src);
    if (assign) next.vars[assign[1]] = evaluate(assign[2], next.vars);
    else if (show) cell.out = fmt(evaluate(show[1], next.vars));
    else throw new SyntaxError('invalid syntax');
  } catch (e) {
    const kind = e instanceof NameErr ? 'NameError' : e instanceof RangeError ? 'ZeroDivisionError' : 'SyntaxError';
    cell.error = `${kind}: ${(e as Error).message}`;
  }
  return next;
}

export function editCell(nb: Notebook, i: number, src: string): Notebook {
  return { ...nb, cells: nb.cells.map((c, k) => (k === i ? { ...c, src } : c)) };
}

/** Wipe the kernel's memory and all outputs, but keep the code. */
export function restart(nb: Notebook): Notebook {
  return { cells: nb.cells.map((c) => ({ src: c.src, count: null, out: null, error: null })), vars: {}, counter: 0 };
}

export function restartAndRunAll(nb: Notebook): Notebook {
  let cur = restart(nb);
  for (let i = 0; i < cur.cells.length; i++) cur = runCell(cur, i);
  return cur;
}

/** For each cell: does what it shows match what a clean top-to-bottom run would show? Cells never run count as matching. */
export function disagreements(nb: Notebook): boolean[] {
  const fresh = restartAndRunAll(nb);
  return nb.cells.map((c, i) => c.count !== null && (c.out !== fresh.cells[i].out || c.error !== fresh.cells[i].error));
}
