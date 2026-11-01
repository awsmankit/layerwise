import { describe, expect, it } from 'vitest';
import {
  EXAMPLES,
  SHAPES,
  SIZE,
  bestMatch,
  cloneGrid,
  countByDirection,
  detect,
  emptyGrid,
  findParts,
  partCells,
  place,
  shapeParts,
} from './pixel-detective';

const ex = (id: string) => EXAMPLES.find((e) => e.id === id)!.grid;
const shape = (id: string) => SHAPES.find((s) => s.id === id)!;

describe('small patterns (parts)', () => {
  it('finds nothing on a blank grid', () => {
    expect(findParts(emptyGrid())).toEqual([]);
  });

  it('a run of three squares is one part and a run of two is none', () => {
    const g = emptyGrid();
    g[2][1] = g[2][2] = 1;
    expect(findParts(g)).toHaveLength(0);
    g[2][3] = 1;
    expect(findParts(g)).toEqual([{ r: 2, c: 1, dir: 'across' }]);
    g[2][4] = 1;
    expect(findParts(g)).toHaveLength(2);
  });

  it('finds the four directions, and both slants run the way their names say', () => {
    const g = emptyGrid();
    for (let k = 0; k < 3; k++) {
      g[k][4 + k] = 1; // backslash: down and right
      g[4 + k][2 - k] = 1; // slash: down and left, which looks like /
    }
    const parts = findParts(g);
    const n = countByDirection(parts);
    expect(n).toEqual({ across: 0, down: 0, slash: 1, backslash: 1 });
    expect(partCells({ r: 4, c: 2, dir: 'slash' })).toEqual([[4, 2], [5, 1], [6, 0]]);
  });

  it('does not run off the edge of the grid', () => {
    const g = emptyGrid();
    g[0][SIZE - 1] = g[0][SIZE - 2] = 1;
    expect(findParts(g)).toHaveLength(0);
  });
});

describe('shapes are made of the parts you would expect', () => {
  it('plus 3+3, cross 3+3, square 6+6, L 3+3', () => {
    const n = (id: string) => countByDirection(shapeParts(shape(id)));
    expect(n('plus')).toEqual({ across: 3, down: 3, slash: 0, backslash: 0 });
    expect(n('cross')).toEqual({ across: 0, down: 0, slash: 3, backslash: 3 });
    expect(n('square')).toEqual({ across: 6, down: 6, slash: 0, backslash: 0 });
    expect(n('ell')).toEqual({ across: 3, down: 3, slash: 0, backslash: 0 });
  });
});

describe('the detective', () => {
  it('says the grid is blank when nothing is shaded', () => {
    expect(detect(emptyGrid()).verdict).toBe('blank');
  });

  it('recognises every clean shape at 100 percent, wherever it sits', () => {
    for (const id of ['plus', 'cross', 'square', 'ell']) {
      const r = detect(ex(id));
      expect(r.verdict, id).toBe('sure');
      expect(r.best?.shape.id, id).toBe(id);
      expect(r.best?.confidence, id).toBe(1);
    }
    // the same plus in all nine positions
    for (let top = 0; top <= 2; top++) {
      for (let left = 0; left <= 2; left++) {
        const r = detect(place(shape('plus'), top, left));
        expect(r.best?.shape.id).toBe('plus');
        expect(r.best?.top).toBe(top);
        expect(r.best?.left).toBe(left);
      }
    }
  });

  it('a missing square at the end of an arm costs one part: 5 of 6 is 83 percent', () => {
    const r = detect(ex('dent'));
    expect(r.best?.shape.id).toBe('plus');
    expect(r.best?.found).toBe(5);
    expect(r.best?.needed).toBe(6);
    expect(r.best?.confidence).toBeCloseTo(5 / 6, 10);
    expect(r.best?.missing).toHaveLength(1);
    expect(r.verdict).toBe('sure');
  });

  it('a gap in the middle breaks every line and the detective finds nothing', () => {
    const r = detect(ex('gap'));
    expect(r.verdict).toBe('nothing');
    expect(r.parts).toHaveLength(0);
    expect(r.detail).toContain('gaps');
  });

  it('lone dots are ignored and counted as stray', () => {
    const r = detect(ex('dots'));
    expect(r.best?.confidence).toBe(1);
    expect(r.stray).toBe(2);
    expect(r.detail).toContain('ignored 2');
  });

  it('a lone dot on its own gives no parts', () => {
    const g = emptyGrid();
    g[3][3] = 1;
    const r = detect(g);
    expect(r.verdict).toBe('nothing');
    expect(r.stray).toBe(1);
  });

  it('a plus drawn over a cross: both match all their parts, but extra parts pull both down, so it is torn', () => {
    const r = detect(ex('mixed'));
    expect(r.verdict).toBe('torn');
    const plus = r.matches.find((m) => m.shape.id === 'plus')!;
    const cross = r.matches.find((m) => m.shape.id === 'cross')!;
    expect(plus.found).toBe(6);
    expect(cross.found).toBe(6);
    expect(plus.confidence).toBeCloseTo(cross.confidence, 10);
    expect(plus.confidence).toBeLessThan(0.4);
  });

  it('an L inside a bigger square: a square is found at 100 percent and the L only at 50 percent', () => {
    const r = detect(ex('square'));
    const ell = r.matches.find((m) => m.shape.id === 'ell')!;
    expect(ell.found).toBe(6);
    expect(ell.extra).toBe(6);
    expect(ell.confidence).toBeCloseTo(0.5, 10);
    expect(r.best?.shape.id).toBe('square');
  });

  it('is deterministic and does not change the grid it is given', () => {
    const g = ex('mixed');
    const copy = cloneGrid(g);
    const a = detect(g);
    const b = detect(g);
    expect(g).toEqual(copy);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('bestMatch keeps the first position when two score the same', () => {
    const m = bestMatch(emptyGrid(), shape('plus'));
    expect(m.top).toBe(0);
    expect(m.left).toBe(0);
  });

  it('every example grid is 7 by 7 with only 0 and 1', () => {
    for (const e of EXAMPLES) {
      expect(e.grid).toHaveLength(SIZE);
      for (const row of e.grid) {
        expect(row).toHaveLength(SIZE);
        for (const v of row) expect([0, 1]).toContain(v);
      }
    }
  });
});
