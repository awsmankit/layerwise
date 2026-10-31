import { useMemo, useState } from 'react';
import { Root } from './shared';
import { CAREFUL, MAX_PRICE, MAX_SIZE_M2, NAIVE, cleanRows, evaluate, makeHouses, problems, type Gap, type LeakKind, type Options } from '../../lib/data-prep';

const HOUSES = makeHouses();
const PROBLEMS = problems(HOUSES);

const GAPS: { id: Gap; label: string }[] = [
  { id: 'zero', label: 'Put 0' },
  { id: 'drop', label: 'Drop the rows' },
  { id: 'mean', label: 'Fill with the average' },
  { id: 'median', label: 'Fill with the median' },
  { id: 'flag', label: 'Median, plus a "was blank" flag' },
];
const AREAS: { id: Options['area']; label: string }[] = [
  { id: 'skip', label: 'Leave it out' },
  { id: 'codes', label: 'Numbers 1, 2, 3, 4' },
  { id: 'onehot', label: 'One-hot columns' },
];
const SCALES: { id: Options['scaling']; label: string }[] = [
  { id: 'none', label: 'Leave as is' },
  { id: 'minmax', label: 'Squash to 0 to 1' },
  { id: 'standard', label: 'Centre and divide by spread' },
];
const LEAKS: { id: LeakKind; label: string; note: string }[] = [
  { id: 'prep', label: 'Learn the fill value and the scaling from all the houses', note: 'The quiet leak: statistics from the test houses seep into training.' },
  { id: 'copy', label: 'Let the model train on the houses it is scored on', note: 'What happens when the same house is in both piles, for example a relisted duplicate.' },
  { id: 'target', label: 'Add a "valuation after the sale" column', note: 'A column that can only exist once the price is known.' },
];

const k = (n: number | null) => (n === null ? 'no score' : `£${Math.round(n)}k`);

type Last = { what: string; from: number | null; to: number | null } | null;

/**
 * A messy table of invented house listings that the learner cleans step by step. A small model is rescored
 * after every change. The "leak it" switch shows how a falsely good score appears.
 */
export default function DataPrepLab() {
  const [opts, setOpts] = useState<Options>(NAIVE);
  const [last, setLast] = useState<Last>(null);

  const result = useMemo(() => evaluate(HOUSES, opts), [opts]);
  const honest = useMemo(() => (opts.leak ? evaluate(HOUSES, { ...opts, leak: null }) : null), [opts]);
  const rows = useMemo(() => cleanRows(HOUSES, opts), [opts]);

  const change = (patch: Partial<Options>, what: string) => {
    const next = { ...opts, ...patch };
    setLast({ what, from: evaluate(HOUSES, opts).mae, to: evaluate(HOUSES, next).mae });
    setOpts(next);
  };
  const hasGap = (r: { size: number | null; age: number | null }) => r.size === null || r.age === null;

  const delta = last && last.from !== null && last.to !== null ? last.to - last.from : null;
  const shown = result.mae;
  const base = result.baseline ?? 1;
  const barPct = shown === null ? 0 : Math.min(100, (shown / Math.max(base, shown)) * 100);
  const falseGood = opts.leak && honest && shown !== null && honest.mae !== null && shown < honest.mae - 0.5;

  return (
    <Root>
      <div className="viz mb-prep">
        <p className="viz-title">Clean a messy table and watch the score</p>
        <p className="viz-cap" style={{ marginTop: 0 }}>
          Example data, invented for this lesson: 200 house listings, price in thousands of pounds. {PROBLEMS.blankSize} sizes are blank, {PROBLEMS.squareFeet} are in square feet instead of square metres, {PROBLEMS.placeholderAge} ages are the placeholder 999, two rows have an extra zero, and the area names are spelt {PROBLEMS.spellings} different ways. 120 houses train the model, 40 score it, and 40 are locked away and never used here.
        </p>

        <div className="mb-controls">
          <fieldset className="mb-set">
            <legend>1. Fix what was typed wrong</legend>
            <label className="mb-opt">
              <input type="checkbox" checked={opts.fixUnits} onChange={(e) => change({ fixUnits: e.target.checked }, 'convert square feet')} />
              Convert square feet to square metres
            </label>
            <label className="mb-opt">
              <input type="checkbox" checked={opts.tidyText} onChange={(e) => change({ tidyText: e.target.checked }, 'tidy the spelling')} />
              Make the area spellings agree
            </label>
            <label className="mb-opt">
              <input type="checkbox" checked={opts.fixImpossible} onChange={(e) => change({ fixImpossible: e.target.checked }, 'remove impossible values')} />
              Age 999 becomes blank; drop the two impossible rows
            </label>
          </fieldset>

          <fieldset className="mb-set">
            <legend>2. Blank sizes and ages</legend>
            {GAPS.map((g) => (
              <label key={g.id} className="mb-opt">
                <input type="radio" name="mb-gap" checked={opts.gap === g.id} onChange={() => change({ gap: g.id }, 'blanks: ' + g.label.toLowerCase())} />
                {g.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="mb-set">
            <legend>3. The area column (text)</legend>
            {AREAS.map((a) => (
              <label key={a.id} className="mb-opt">
                <input type="radio" name="mb-area" checked={opts.area === a.id} onChange={() => change({ area: a.id }, 'area: ' + a.label.toLowerCase())} />
                {a.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="mb-set">
            <legend>4. Scale the number columns</legend>
            {SCALES.map((a) => (
              <label key={a.id} className="mb-opt">
                <input type="radio" name="mb-scale" checked={opts.scaling === a.id} onChange={() => change({ scaling: a.id }, 'scaling: ' + a.label.toLowerCase())} />
                {a.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="mb-set">
            <legend>The model</legend>
            <label className="mb-opt">
              <input type="radio" name="mb-model" checked={opts.model === 'line'} onChange={() => change({ model: 'line' }, 'model: straight line')} />
              Straight-line fit
            </label>
            <label className="mb-opt">
              <input type="radio" name="mb-model" checked={opts.model === 'knn'} onChange={() => change({ model: 'knn' }, 'model: nearest neighbours')} />
              Nearest neighbours (5)
            </label>
          </fieldset>

          <fieldset className="mb-set mb-leak">
            <legend>Break the rules</legend>
            <label className="mb-opt mb-opt-warn">
              <input type="checkbox" checked={opts.leak !== null} onChange={(e) => change({ leak: e.target.checked ? 'target' : null }, e.target.checked ? 'leak it' : 'stop the leak')} />
              Leak it
            </label>
            {opts.leak &&
              LEAKS.map((l) => (
                <label key={l.id} className="mb-opt">
                  <input type="radio" name="mb-leak" checked={opts.leak === l.id} onChange={() => change({ leak: l.id }, 'leak: ' + l.label.toLowerCase())} />
                  <span>
                    {l.label}
                    <small>{l.note}</small>
                  </span>
                </label>
              ))}
          </fieldset>
        </div>

        <div className="mb-actions">
          <button type="button" className="btn quiet" onClick={() => { setOpts(NAIVE); setLast(null); }}>
            Back to the messy start
          </button>
          <button type="button" className="btn quiet" onClick={() => { change({ ...CAREFUL, model: opts.model, leak: opts.leak }, 'all the careful steps'); }}>
            Apply the careful steps
          </button>
        </div>

        <div className="mb-result" aria-live="polite" role="status">
          <p className="mb-big">
            <span className="mb-label">{opts.leak ? 'Score you would report' : 'Typical error on the 40 scoring houses'}</span>
            <b className={falseGood ? 'mb-false' : ''}>{k(shown)}</b>
          </p>
          <div className="mb-bar" aria-hidden="true">
            <i style={{ width: `${barPct}%` }} className={falseGood ? 'mb-false-bar' : ''} />
          </div>
          <p className="mb-small">
            Always guessing the average price: {k(result.baseline)}. Lower is better. Trained on {result.nTrain} houses, scored on {result.nValid}
            {result.nRemoved ? `, ${result.nRemoved} impossible rows removed` : ''}.
            {opts.gap === 'drop' && ' Dropping rows also means the model cannot price any house with a blank.'}
          </p>
          {last && (
            <p className="mb-small">
              Last change ({last.what}): {k(last.from)} to {k(last.to)}
              {delta !== null && Math.abs(delta) >= 0.5 ? (delta < 0 ? `, better by £${Math.round(-delta)}k.` : `, worse by £${Math.round(delta)}k.`) : delta !== null ? ', about the same.' : '.'}
            </p>
          )}
          {opts.leak && honest && (
            <p className={'mb-small mb-note' + (falseGood ? ' mb-warn' : '')}>
              Same steps with no leak: {k(honest.mae)}.{' '}
              {falseGood
                ? 'The leaked score is falsely good: new houses will not come with a leaked column or a memorised twin, so the real error stays near the second number.'
                : 'This leak barely changed the score here. It can be small for a simple model on plenty of data, which is why it goes unnoticed.'}
            </p>
          )}
          <p className="mb-small">Columns the model sees: {result.features.join(', ')}.</p>
        </div>

        <div className="mb-table-wrap" tabIndex={0} role="region" aria-label="The house table after your cleaning. Scroll to see more rows.">
          <table className="mb-table">
            <thead>
              <tr>
                <th>id</th>
                <th>pile</th>
                <th>size</th>
                <th>rooms</th>
                <th>age</th>
                <th>station (m)</th>
                <th>area</th>
                <th>price (£k)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const raw = HOUSES[i];
                const gone = r.removed || (opts.gap === 'drop' && hasGap(r) && r.split !== 'test');
                const cls = gone ? 'mb-gone' : r.split === 'test' ? 'mb-locked' : '';
                const sizeBad = !opts.fixImpossible && raw.unit === 'm2' && (raw.size ?? 0) > MAX_SIZE_M2;
                const unitBad = raw.unit === 'ft2' && !opts.fixUnits;
                const fillSize = opts.gap !== 'drop' ? result.fill.size : null;
                const fillAge = opts.gap !== 'drop' ? result.fill.age : null;
                return (
                  <tr key={r.id} className={cls}>
                    <td>{r.id}</td>
                    <td>{r.split === 'valid' ? 'score' : r.split}</td>
                    <td className={(r.changed.size ? 'mb-chg ' : '') + (unitBad || sizeBad ? 'mb-bad' : '')}>
                      {r.size === null ? (fillSize !== null ? <i className="mb-fill">{Math.round(fillSize)}</i> : <span className="mb-blank">blank</span>) : <>{r.size.toLocaleString('en-GB')}{unitBad ? ' ft²' : ''}</>}
                    </td>
                    <td>{r.rooms}</td>
                    <td className={(r.changed.age ? 'mb-chg ' : '') + (r.age === 999 ? 'mb-bad' : '')}>
                      {r.age === null ? (fillAge !== null ? <i className="mb-fill">{Math.round(fillAge)}</i> : <span className="mb-blank">blank</span>) : r.age}
                    </td>
                    <td>{r.station}</td>
                    <td className={r.changed.area ? 'mb-chg' : ''}>{r.area}{r.area !== r.area.trim() ? '␣' : ''}</td>
                    <td className={r.price > MAX_PRICE && !opts.fixImpossible ? 'mb-bad' : ''}>{r.price.toLocaleString('en-GB')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="viz-cap">
          Table key: red cells are wrong or suspicious, shaded cells were changed by your choices, italic numbers are filled-in blanks, crossed-out rows are removed, and faded rows are the locked test pile. Square feet are shown with the unit; real tables often do not say.
        </p>
      </div>
    </Root>
  );
}
