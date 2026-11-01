import { useState } from 'react';
import { Root } from './shared';
import { kappa2x2, readKappa } from '../../lib/kappa';

/*
 * Cohen's kappa for two labellers who graded the same answers pass or fail. The learner edits the
 * four cells of the agreement table; the page shows each step of the arithmetic.
 */

type Cells = [number, number, number, number]; // both pass, A pass B fail, A fail B pass, both fail

const PRESETS: { name: string; cells: Cells; note: string }[] = [
  { name: 'Worked example (50 answers)', cells: [20, 5, 10, 15], note: 'Agree on 35 of 50 (70%), but half of that is expected by chance.' },
  { name: '90% agreement, rare fails', cells: [85, 5, 5, 5], note: 'High raw agreement, but almost everything is "pass", so chance agreement is already high.' },
  { name: 'Perfect agreement', cells: [30, 0, 0, 20], note: 'Kappa is 1.' },
  { name: 'Just as good as guessing', cells: [25, 25, 25, 25], note: 'They agree half the time, which is what two coin-flippers would do.' },
];

const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : 'not defined');

export default function KappaCalculator() {
  const [cells, setCells] = useState<Cells>(PRESETS[0].cells);
  const [note, setNote] = useState(PRESETS[0].note);
  const k = kappa2x2(...cells);
  const set = (i: number, raw: string) => {
    const v = Math.max(0, Math.min(999, Math.floor(Number(raw) || 0)));
    setCells((c) => c.map((x, j) => (j === i ? v : x)) as Cells);
    setNote('');
  };
  const [aPass, aFail] = k.rowTotals;
  const [bPass, bFail] = k.colTotals;

  const cell = (i: number, name: string) => (
    <label className="ev-cell">
      <span>{name}</span>
      <input type="number" inputMode="numeric" min={0} max={999} value={cells[i]} onChange={(e) => set(i, e.target.value)} />
    </label>
  );

  return (
    <Root>
      <div className="viz ev-kappa">
        <p className="viz-title">Kappa calculator: how much do two labellers agree beyond chance?</p>
        <div className="ev-presets" role="group" aria-label="Example tables">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="btn quiet"
              onClick={() => {
                setCells(p.cells);
                setNote(p.note);
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="ev-grid" role="group" aria-label="Agreement table: counts of answers">
          {cell(0, 'A pass, B pass')}
          {cell(1, 'A pass, B fail')}
          {cell(2, 'A fail, B pass')}
          {cell(3, 'A fail, B fail')}
        </div>

        {k.n === 0 ? (
          <p className="ev-say" aria-live="polite">Enter some counts.</p>
        ) : (
          <div aria-live="polite">
            <ol className="ev-steps">
              <li>
                <b>Observed agreement.</b> They agree on {cells[0]} + {cells[3]} = {cells[0] + cells[3]} of {k.n} answers: p<sub>o</sub> = <b className="num">{f2(k.po)}</b>.
              </li>
              <li>
                <b>Agreement expected by chance.</b> A passes {aPass} of {k.n} ({f2(aPass / k.n)}), B passes {bPass} ({f2(bPass / k.n)}). Chance of both passing {f2((aPass / k.n) * (bPass / k.n))}, of both failing {f2((aFail / k.n) * (bFail / k.n))}: p<sub>e</sub> = <b className="num">{f2(k.pe)}</b>.
              </li>
              <li>
                <b>Kappa.</b> (p<sub>o</sub> &minus; p<sub>e</sub>) / (1 &minus; p<sub>e</sub>) = ({f2(k.po)} &minus; {f2(k.pe)}) / (1 &minus; {f2(k.pe)}) = <b className="num">{f2(k.kappa)}</b>.
              </li>
            </ol>
            <p className="ev-say">
              Reading: <b>{readKappa(k.kappa)}</b> {note}
            </p>
          </div>
        )}
        <p className="viz-cap">
          The verbal bands are a rough convention (Landis and Koch, 1977), not a pass mark. Decide what you need from what a wrong label would cost you. If kappa is low, read the answers where A and B disagree: the rubric is usually unclear.
        </p>
      </div>
    </Root>
  );
}
