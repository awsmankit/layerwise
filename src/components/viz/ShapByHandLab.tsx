import { useState } from 'react';
import { Root } from './shared';
import {
  BASELINE,
  FEATURES,
  PEOPLE,
  allCoalitions,
  allShapley,
  coalitionValue,
  shapleyByOrderings,
  shapleyFor,
  totalToExplain,
  type FeatureId,
} from '../../lib/explain-lab';

/*
 * "Shapley values by hand": a three-feature loan-score model with invented numbers. The learner
 * picks a person, sees the score for all eight coalitions of known features (the others sit at
 * the typical applicant's values), then reveals the Shapley value of one feature a row at a time.
 * Everything runs in the browser; nothing is sent anywhere.
 */

const label = (f: FeatureId) => FEATURES.find((x) => x.id === f)!.label;
const short: Record<FeatureId, string> = { income: 'income', debt: 'debt', years: 'years' };
const setName = (s: FeatureId[]) => (s.length ? s.map((f) => short[f]).join(' + ') : 'nothing known');
const n1 = (x: number) => {
  const r = Math.round(x * 100) / 100;
  return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toString();
};
const plain = (x: number) => {
  const r = Math.round(x * 100) / 100;
  return (r < 0 ? '−' : '') + Math.abs(r).toString();
};
const WEIGHT_TEXT: Record<number, string> = { 0: '1/3', 1: '1/6', 2: '1/3' };

export default function ShapByHandLab() {
  const [pid, setPid] = useState(PEOPLE[0].id);
  const [feature, setFeature] = useState<FeatureId>('income');
  const [inter, setInter] = useState(true);
  const [shown, setShown] = useState(0);
  const [orders, setOrders] = useState(false);

  const person = PEOPLE.find((p) => p.id === pid)!;
  const all = allShapley(person, inter);
  const res = shapleyFor(person, feature, inter);
  const total = totalToExplain(person, inter);
  const coalitions = allCoalitions();
  const ord = shapleyByOrderings(person, feature, inter);
  const done = shown >= res.terms.length;
  const partial = res.terms.slice(0, shown).reduce((s, t) => s + t.contribution, 0);
  const maxAbs = Math.max(1, ...all.map((r) => Math.abs(r.phi)));

  const pick = (fn: () => void) => {
    fn();
    setShown(0);
  };

  const status = done
    ? `${label(feature)} for ${person.name}: Shapley value ${n1(res.phi)}. All three values: ${all.map((r) => `${short[r.feature]} ${n1(r.phi)}`).join(', ')}. They add up to ${n1(total.diff)}, which is the score ${plain(total.score)} minus the typical score ${plain(total.base)}.`
    : `Showing ${shown} of ${res.terms.length} rows for ${label(feature)}. Running total ${plain(partial)}.`;

  return (
    <Root>
      <div className="viz wra-shap">
        <p className="viz-title">Shapley values by hand</p>
        <p className="wra-note">
          Invented numbers. A made-up model gives each applicant a score out of 100. A feature that is "unknown" is set to the typical applicant's value: income {BASELINE.income}, debt {BASELINE.debt}, years in job {BASELINE.years}, which scores 50.
        </p>

        <div className="wra-row" role="group" aria-label="Choose an applicant">
          {PEOPLE.map((p) => (
            <button key={p.id} type="button" className="btn quiet" aria-pressed={pid === p.id} onClick={() => pick(() => setPid(p.id))}>
              {p.name}: income {p.values.income}, debt {p.values.debt}, {p.values.years} yrs
            </button>
          ))}
        </div>
        <label className="wra-check">
          <input type="checkbox" checked={inter} onChange={(e) => pick(() => setInter(e.target.checked))} />
          <span>Model has an interaction: years in the job matter more the further income is from typical</span>
        </label>

        <h4 className="wra-h">Step 1. The model's score for every coalition of known features</h4>
        <div className="wra-scroll" tabIndex={0} role="region" aria-label="Scores for all eight coalitions">
          <table className="wra-table">
            <thead>
              <tr>
                <th scope="col">Features known</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {coalitions.map((c) => (
                <tr key={c.join('-') || 'none'}>
                  <th scope="row">{setName(c)}</th>
                  <td>{plain(coalitionValue(person, c, inter))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="wra-small">The top row is the typical applicant (50). The bottom row is {person.name}'s real score ({plain(total.score)}). Shapley values share the difference, {n1(total.diff)}, between the three features.</p>

        <h4 className="wra-h">Step 2. Pick a feature and add it to every coalition</h4>
        <div className="wra-row" role="group" aria-label="Choose a feature to explain">
          {FEATURES.map((f) => (
            <button key={f.id} type="button" className="btn quiet" aria-pressed={feature === f.id} onClick={() => pick(() => setFeature(f.id))}>
              {f.label}
            </button>
          ))}
        </div>
        <p className="wra-small">
          For each coalition of the other two features, compare the score with and without {short[feature]}. Weight each difference by the share of the six possible arrival orders in which exactly that coalition arrives before {short[feature]}.
        </p>

        <div className="wra-scroll" tabIndex={0} role="region" aria-label={`Working for ${label(feature)}`}>
          <table className="wra-table wra-work">
            <thead>
              <tr>
                <th scope="col">Known</th>
                <th scope="col">Without</th>
                <th scope="col">With</th>
                <th scope="col">Adds</th>
                <th scope="col">Weight</th>
                <th scope="col">Adds x weight</th>
              </tr>
            </thead>
            <tbody>
              {res.terms.map((t, i) => {
                const on = i < shown;
                return (
                  <tr key={i} className={on ? '' : 'wra-hidden'}>
                    <th scope="row">{setName(t.without)}</th>
                    <td>{on ? plain(t.vWithout) : '?'}</td>
                    <td>{on ? plain(t.vWith) : '?'}</td>
                    <td>{on ? n1(t.marginal) : '?'}</td>
                    <td>{WEIGHT_TEXT[t.without.length]}</td>
                    <td>{on ? n1(Math.round(t.contribution * 1000) / 1000) : '?'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={5}>Shapley value of {short[feature]}</th>
                <td>{done ? n1(res.phi) : '?'}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="wra-row wra-actions">
          <button type="button" className="btn" onClick={() => setShown((s) => Math.min(res.terms.length, s + 1))} disabled={done}>
            Reveal next row
          </button>
          <button type="button" className="btn quiet" onClick={() => setShown(res.terms.length)} disabled={done}>
            Reveal all
          </button>
          <button type="button" className="btn quiet" onClick={() => setShown(0)} disabled={shown === 0}>
            Hide again
          </button>
        </div>

        <div className="wra-result" role="status" aria-live="polite">
          <p>{status}</p>
        </div>

        {done && (
          <>
            <h4 className="wra-h">Step 3. The three values, and the check</h4>
            <ul className="wra-bars" aria-label="Shapley values for the three features">
              {all.map((r) => (
                <li key={r.feature}>
                  <span className="wra-bar-name">{label(r.feature)}</span>
                  <span className="wra-bar-track" aria-hidden="true">
                    <span
                      className={r.phi >= 0 ? 'wra-bar wra-pos' : 'wra-bar wra-neg'}
                      style={{ width: `${(Math.abs(r.phi) / maxAbs) * 50}%`, [r.phi >= 0 ? 'left' : 'right']: '50%' }}
                    />
                  </span>
                  <span className="wra-bar-val">{n1(r.phi)}</span>
                </li>
              ))}
            </ul>
            <p className="wra-small">
              Check: {all.map((r) => n1(r.phi)).join(' ')} = {n1(all.reduce((s, r) => s + r.phi, 0))}, and {plain(total.score)} {'−'} {plain(total.base)} = {n1(total.diff)}. They always match: this is the "efficiency" property.
            </p>
            {!inter && <p className="wra-small">Without the interaction, each value is just that feature's own effect, and years in the job gets zero because the model ignores it.</p>}
            {inter && person.id === 'asha' && <p className="wra-small">Years gets +4 although the model has no years term of its own: the interaction term is worth +8 here, and Shapley splits it equally between income and years.</p>}
          </>
        )}

        <label className="wra-check">
          <input type="checkbox" checked={orders} onChange={(e) => setOrders(e.target.checked)} />
          <span>Show the same answer as an average over the six orders the features could arrive in</span>
        </label>
        {orders && (
          <div className="wra-scroll" tabIndex={0} role="region" aria-label={`Orderings for ${label(feature)}`}>
            <table className="wra-table">
              <thead>
                <tr>
                  <th scope="col">Order of arrival</th>
                  <th scope="col">{label(feature)} adds</th>
                </tr>
              </thead>
              <tbody>
                {ord.map((o, i) => (
                  <tr key={i}>
                    <th scope="row">{o.order.map((f) => short[f]).join(', then ')}</th>
                    <td>{n1(o.gain)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Average of the six</th>
                  <td>{n1(Math.round((ord.reduce((s, o) => s + o.gain, 0) / 6) * 1000) / 1000)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="viz-cap">
          Try this: turn the interaction on and off for Asha and watch the years row. Then pick Cara, whose debt and years are exactly typical, and see why those two get zero.
        </p>
      </div>
    </Root>
  );
}
