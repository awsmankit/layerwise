import { useState } from 'react';
import { Root } from './shared';

/** Dot product of two equal-length lists: multiply pairs and add the results. */
export const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);

/** A layer without its bend: each output is the dot product of one row of the grid with the input. */
export const layer = (W: number[][], x: number[]) => W.map((row) => dot(row, x));

/**
 * A linear layer as a grid of numbers. Change the grid (the weights) or the input
 * and watch each output come from one row dotted with the input.
 */
export default function MatrixLayer() {
  const [W, setW] = useState<number[][]>([
    [1, 2],
    [0, -1],
  ]);
  const [x, setX] = useState<number[]>([3, 4]);

  const y = layer(W, x);

  const setCell = (r: number, c: number, v: number) => {
    setW((prev) => prev.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? v : cell)) : row)));
  };

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">A layer is a grid times a list</p>
        <div className="viz-controls">
          {W.map((row, r) =>
            row.map((cell, c) => (
              <label key={`${r}-${c}`} htmlFor={`ml-w-${r}-${c}`}>
                w{r + 1}{c + 1}{' '}
                <input
                  id={`ml-w-${r}-${c}`}
                  type="number"
                  step={0.5}
                  value={cell}
                  onChange={(e) => setCell(r, c, Number(e.target.value))}
                  style={{ width: '4.5em' }}
                />
              </label>
            )),
          )}
          {x.map((v, i) => (
            <label key={`x-${i}`} htmlFor={`ml-x-${i}`}>
              x{i + 1} <b className="num">{v}</b>
              <input id={`ml-x-${i}`} type="range" min={-5} max={5} step={1} value={v} onChange={(e) => setX((prev) => prev.map((p, j) => (j === i ? Number(e.target.value) : p)))} />
            </label>
          ))}
        </div>
        <p className="viz-cap" aria-live="polite">
          {W.map((row, r) => (
            <span key={r} style={{ display: 'block' }}>
              y{r + 1} = ({row[0]} × {x[0]}) + ({row[1]} × {x[1]}) = <b className="num">{y[r]}</b>
            </span>
          ))}
        </p>
      </div>
    </Root>
  );
}
