import { describe, expect, it } from 'vitest';
import { disagreements, editCell, newNotebook, restartAndRunAll, runCell } from './notebook-sim';

describe('notebook kernel', () => {
  it('runs top to bottom and numbers each run', () => {
    let nb = newNotebook();
    for (const i of [0, 1, 2]) nb = runCell(nb, i);
    expect(nb.cells.map((c) => c.count)).toEqual([1, 2, 3]);
    expect(nb.cells[2].out).toBe('30');
    expect(disagreements(nb)).toEqual([false, false, false]);
  });
  it('running a cell before its inputs exist gives a NameError', () => {
    const nb = runCell(newNotebook(), 2);
    expect(nb.cells[2].error).toBe("NameError: name 'total' is not defined");
    expect(nb.cells[2].count).toBe(1);
  });
  it('the stale-output bug: edit a cell, rerun only some, and the screen tells a lie', () => {
    let nb = newNotebook();
    for (const i of [0, 1, 2]) nb = runCell(nb, i);
    nb = editCell(nb, 0, 'price = 20');
    nb = runCell(nb, 0);
    nb = runCell(nb, 2); // skipped cell 2, so total is still 30
    expect(nb.cells[2].out).toBe('30');
    expect(disagreements(nb)).toEqual([false, false, true]);
    const fixed = restartAndRunAll(nb);
    expect(fixed.cells[2].out).toBe('60');
    expect(fixed.cells.map((c) => c.count)).toEqual([1, 2, 3]);
    expect(disagreements(fixed)).toEqual([false, false, false]);
  });
  it('handles brackets, precedence and errors', () => {
    let nb = newNotebook(['a = (2 + 3) * 4', 'b = a / 0', 'print(a - 1)', 'oops !']);
    for (const i of [0, 1, 2, 3]) nb = runCell(nb, i);
    expect(nb.vars.a).toBe(20);
    expect(nb.cells[1].error).toMatch(/ZeroDivisionError/);
    expect(nb.cells[2].out).toBe('19');
    expect(nb.cells[3].error).toMatch(/SyntaxError/);
  });
});
