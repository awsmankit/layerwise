import { useMemo, useState } from 'react';
import { Root } from './shared';
import { SKEWS, THRESHOLD, evaluate, makeCustomers, type SkewId } from '../../lib/feature-skew';

const customers = makeCustomers(300, 11);
const money = (v: number) => v.toFixed(1);
const pct = (n: number, total: number) => `${Math.round((n / total) * 100)}%`;

/**
 * One feature, two code paths. The learner picks how the training job and the serving code differ, and sees
 * the features and the model's score for the same customer at the same moment, computed both ways.
 */
export default function SkewDemo() {
  const [skew, setSkew] = useState<SkewId>('window');
  const cur = SKEWS.find((s) => s.id === skew)!;
  const report = useMemo(() => evaluate(customers, skew), [skew]);

  // show the customers where the paths disagree most; with no skew, show the first six
  const shown = useMemo(() => {
    const rows = [...report.rows];
    if (skew === 'none') return rows.slice(0, 6);
    return rows.sort((a, b) => Math.abs(b.pTrain - b.pServe) - Math.abs(a.pTrain - a.pServe)).slice(0, 6);
  }, [report, skew]);

  return (
    <Root>
      <div className="viz mo2-skew">
        <p className="viz-title">Same feature, two code paths: how far apart do the scores drift?</p>
        <div className="mo2-chips" role="group" aria-label="How the two code paths differ">
          {SKEWS.map((s) => (
            <button key={s.id} type="button" className="btn quiet" aria-pressed={skew === s.id} onClick={() => setSkew(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="mo2-two">
          <div className="mo2-card">
            <p className="mo2-card-h">Training job</p>
            <p>{cur.training}</p>
          </div>
          <div className="mo2-card">
            <p className="mo2-card-h">Serving code</p>
            <p>{cur.serving}</p>
          </div>
        </div>

        <div className="mo2-result" aria-live="polite" role="status">
          <p className="mo2-big">
            <span>Customers whose features differ</span>
            <b className={report.skewedAny ? 'mo2-bad' : 'mo2-good'}>{report.skewedAny} of {report.n} ({pct(report.skewedAny, report.n)})</b>
          </p>
          <p className="mo2-small">
            Check per feature, as the ML Test Score paper suggests: <b>orders_7d</b> differs for {report.skewedOrders}, <b>avg_basket_7d</b> for {report.skewedBasket}.
          </p>
          <p className="mo2-small">
            Mean gap between the two scores {report.meanAbsScoreGap.toFixed(3)}, largest {report.maxAbsScoreGap.toFixed(2)}. Decisions that flip at a {THRESHOLD} cut-off: <b>{report.flips}</b> of {report.n}.
          </p>
        </div>

        <div className="mo2-wrap" tabIndex={0} role="region" aria-label="Six customers, features and scores computed both ways">
          <table className="mo2-table">
            <caption className="mo2-sr">{skew === 'none' ? 'The first six customers' : 'The six customers whose scores differ most'}, with each feature and the model score computed by the training path and the serving path.</caption>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">orders_7d<br />train / serve</th>
                <th scope="col">avg_basket_7d<br />train / serve</th>
                <th scope="col">Score<br />train / serve</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const oDiff = Math.abs(r.train.orders - r.serve.orders) > 1e-9;
                const bDiff = Math.abs(r.train.basket - r.serve.basket) > 1e-9;
                return (
                  <tr key={r.id} className={r.flipped ? 'mo2-flip' : undefined}>
                    <th scope="row">#{r.id}</th>
                    <td className={oDiff ? 'mo2-diff' : undefined}>{r.train.orders} / {r.serve.orders}</td>
                    <td className={bDiff ? 'mo2-diff' : undefined}>{money(r.train.basket)} / {money(r.serve.basket)}</td>
                    <td>
                      {r.pTrain.toFixed(2)} / {r.pServe.toFixed(2)}
                      {r.flipped && <span className="mo2-tag"> flips</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="viz-cap">
          Invented customers and a fixed made-up model (score = chance of ordering again within three days). Features are the number of orders and the mean basket value in pounds over the 7 days before the request. In the first option the training table holds the values the service computed at request time, so the two columns match exactly.
        </p>
      </div>
    </Root>
  );
}
