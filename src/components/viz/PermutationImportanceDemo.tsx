import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  COLUMNS,
  MODELS,
  N_ROWS,
  importanceRepeated,
  makeData,
  mae,
  permutationImportance,
  type ColumnId,
  type ModelKind,
} from '../../lib/explain-lab';

/*
 * "Permutation importance": 80 invented applicants and a fixed pretend-trained model. The learner
 * shuffles one column at a time and sees how much the model's error grows. Repeating the shuffle
 * shows the spread. Switching the model between "reads both income columns" and "reads one"
 * shows what correlated columns do to the numbers.
 */

const f2 = (x: number) => x.toFixed(2);

export default function PermutationImportanceDemo() {
  const rows = useMemo(() => makeData(), []);
  const [kind, setKind] = useState<ModelKind>('both');
  const [seed, setSeed] = useState(0);
  const [repeated, setRepeated] = useState(false);

  const base = mae(rows, kind);
  const once = COLUMNS.map((c, i) => permutationImportance(rows, kind, c.id, seed * 97 + 11 + i));
  const many = useMemo(() => importanceRepeated(rows, kind, 20), [rows, kind]);
  const values: Record<ColumnId, number> = Object.fromEntries(
    COLUMNS.map((c, i) => [c.id, repeated ? many[i].mean : once[i]]),
  ) as Record<ColumnId, number>;
  const max = Math.max(0.5, ...COLUMNS.map((c, i) => (repeated ? many[i].max : once[i])));
  const ranked = [...COLUMNS].sort((a, b) => values[b.id] - values[a.id]);

  const status = repeated
    ? `Average over 20 shuffles. Model error before shuffling: ${f2(base)} points. Largest increase: ${ranked[0].label}, ${f2(values[ranked[0].id])}. Smallest: ${ranked[ranked.length - 1].label}, ${f2(values[ranked[ranked.length - 1].id])}.`
    : `One shuffle of each column (shuffle number ${seed + 1}). Model error before shuffling: ${f2(base)} points. Largest increase: ${ranked[0].label}, ${f2(values[ranked[0].id])}.`;

  return (
    <Root>
      <div className="viz wra-perm">
        <p className="viz-title">Permutation importance</p>
        <p className="wra-note">
          Invented data: {N_ROWS} applicants and a fixed pretend-trained model that predicts a credit score. Shuffle one column, so each person gets someone else's value, and measure how much the average error grows.
        </p>

        <div className="wra-row" role="group" aria-label="Which model">
          {MODELS.map((m) => (
            <button key={m.id} type="button" className="btn quiet" aria-pressed={kind === m.id} onClick={() => setKind(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="wra-row wra-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRepeated(false);
              setSeed((s) => s + 1);
            }}
          >
            Shuffle every column once
          </button>
          <button type="button" className="btn quiet" aria-pressed={repeated} onClick={() => setRepeated((r) => !r)}>
            {repeated ? 'Showing the average of 20 shuffles' : 'Average over 20 shuffles'}
          </button>
        </div>

        <ul className="wra-bars wra-bars-pos" aria-label="Increase in error after shuffling each column">
          {COLUMNS.map((c, i) => {
            const v = values[c.id];
            const lo = repeated ? many[i].min : v;
            const hi = repeated ? many[i].max : v;
            return (
              <li key={c.id}>
                <span className="wra-bar-name">
                  {c.label}
                  <small>{c.note}</small>
                </span>
                <span className="wra-bar-track" aria-hidden="true">
                  <span className="wra-bar wra-pos" style={{ left: 0, width: `${Math.max(0, (v / max) * 100)}%` }} />
                  {repeated && <span className="wra-range" style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%` }} />}
                </span>
                <span className="wra-bar-val">
                  +{f2(v)}
                  {repeated && <small>{f2(lo)} to {f2(hi)}</small>}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="wra-result" role="status" aria-live="polite">
          <p>{status}</p>
          {kind === 'both' && <p>The two income columns carry the same information. Shuffling one still leaves the other, so each looks about half as important as income does when it is read alone.</p>}
          {kind === 'one' && <p>Now only one income column is read, so shuffling it removes the whole signal. The second column scores exactly zero because this model never looks at it.</p>}
        </div>
        <p className="viz-cap">
          Try this: shuffle again and watch the single-shuffle numbers move. Then average over 20 and compare the two models: income's importance changes although the model's answers hardly do. Shoe size stays at zero because the model ignores it.
        </p>
      </div>
    </Root>
  );
}
