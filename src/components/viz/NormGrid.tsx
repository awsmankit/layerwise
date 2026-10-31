import { useState } from 'react';
import { Root } from './shared';

/** A made-up batch: 4 examples (rows) by 5 features (columns). Example numbers, not from a real network. */
const X = [
  [2, 10, 1, 7, 4],
  [4, 14, 3, 9, 6],
  [3, 6, 2, 8, 5],
  [7, 10, 4, 6, 3],
];

type Mode = 'batch' | 'layer';

function stats(v: number[]) {
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const std = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  return { mean, std };
}

/**
 * The same grid of numbers normalised two ways. Batch norm treats each column (one feature across the
 * batch) as a group; layer norm treats each row (all features of one example) as a group. Pick a cell
 * to see its group, the group's mean and spread, and the cell's normalised value.
 */
export default function NormGrid() {
  const [mode, setMode] = useState<Mode>('batch');
  const [cell, setCell] = useState<[number, number]>([1, 1]);
  const [r, c] = cell;
  const group = mode === 'batch' ? X.map((row) => row[c]) : X[r];
  const { mean, std } = stats(group);
  const x = X[r][c];
  const z = (x - mean) / std;
  const inGroup = (i: number, j: number) => (mode === 'batch' ? j === c : i === r);

  return (
    <Root>
      <div className="viz da-norm">
        <p className="viz-title">Which numbers are normalised together?</p>
        <p className="da-note">Rows are examples in the batch, columns are features. Pick a number.</p>
        <div className="da-row" role="group" aria-label="Kind of normalisation">
          <button type="button" className="da-chip" aria-pressed={mode === 'batch'} onClick={() => setMode('batch')}>
            Batch norm: down a column
          </button>
          <button type="button" className="da-chip" aria-pressed={mode === 'layer'} onClick={() => setMode('layer')}>
            Layer norm: along a row
          </button>
        </div>

        <div className="da-grid" role="group" aria-label="A batch of 4 examples with 5 features each. Pick a number.">
          <span className="da-corner" aria-hidden="true" />
          {X[0].map((_, j) => (
            <span key={j} className="da-head2" aria-hidden="true">
              {j + 1}
            </span>
          ))}
          {X.map((row, i) => (
            <div key={i} className="da-gridrow" role="presentation">
              <span className="da-head2" aria-hidden="true">
                ex. {i + 1}
              </span>
              {row.map((v, j) => (
                <button
                  key={j}
                  type="button"
                  className={`da-cell${inGroup(i, j) ? ' da-in' : ''}${i === r && j === c ? ' da-sel' : ''}`}
                  aria-pressed={i === r && j === c}
                  aria-label={`Example ${i + 1}, feature ${j + 1}, value ${v}`}
                  onClick={() => setCell([i, j])}
                >
                  {v}
                </button>
              ))}
            </div>
          ))}
        </div>

        <p className="da-calc num" aria-live="polite">
          Group: {group.join(', ')}. Mean <b>{mean.toFixed(2)}</b>, spread (standard deviation) <b>{std.toFixed(2)}</b>.
          <br />
          The picked number {x} becomes ({x} − {mean.toFixed(2)}) ÷ {std.toFixed(2)} = <b>{z.toFixed(2)}</b>.
        </p>
        <p className="viz-cap">
          {mode === 'batch'
            ? 'Batch norm asks how this feature looks across all the examples in the batch. It needs a decent batch size, and at test time it falls back on averages saved during training.'
            : 'Layer norm asks how this one example looks across all its own features. It never looks at other examples, so batch size does not matter. That is why transformers use it (or its simpler cousin RMSNorm).'}{' '}
          Both then multiply by a learned scale and add a learned shift, so the layer can undo the normalising if that helps.
        </p>
      </div>
    </Root>
  );
}
