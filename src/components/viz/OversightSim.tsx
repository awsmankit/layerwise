import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  BASE_CATCH,
  COMFORTABLE_ITEMS,
  MINUTES_PER_ITEM,
  POLICY_LABELS,
  expected,
  missedShare,
  simulate,
  tierErrorRates,
  type Params,
  type PolicyKind,
} from '../../lib/oversight-sim';

/*
 * Oversight simulator. A batch of AI recommendations with a planted error rate, a reviewer who looks at
 * some of them, and a policy that decides which. Every parameter is illustrative; see lib/oversight-sim.ts.
 */

const SIZES = [100, 200, 400] as const;
const POLICIES: PolicyKind[] = ['all', 'low', 'lowmed', 'sample'];

const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const one = (x: number) => x.toFixed(1);

export default function OversightSim() {
  const [n, setN] = useState<number>(200);
  const [errorPct, setErrorPct] = useState(8);
  const [biasPct, setBiasPct] = useState(30);
  const [forcing, setForcing] = useState(false);
  const [kind, setKind] = useState<PolicyKind>('all');
  const [samplePct, setSamplePct] = useState(25);
  const [seed, setSeed] = useState(1);

  const params: Params = useMemo(
    () => ({ n, errorRate: errorPct / 100, bias: biasPct / 100, forcing, policy: { kind, fraction: samplePct / 100 } }),
    [n, errorPct, biasPct, forcing, kind, samplePct],
  );
  const run = useMemo(() => simulate(params, seed), [params, seed]);
  const exp = useMemo(() => expected(params), [params]);
  const rates = tierErrorRates(params.errorRate);
  const o = run.outcome;

  const compare = useMemo(
    () => POLICIES.map((k) => ({ k, e: expected({ ...params, policy: { kind: k, fraction: samplePct / 100 } }) })),
    [params, samplePct],
  );

  const missed = o.missedReviewed + o.missedUnreviewed;

  return (
    <Root>
      <div className="viz wrb-sim">
        <p className="viz-title">The review desk</p>
        <p className="wrb-note">
          Illustrative model, not data from any real system. Every setting below is a made-up example value, chosen to show how the pieces interact.
        </p>

        <div className="wrb-controls">
          <div className="wrb-group" role="group" aria-label="Number of AI recommendations in the batch">
            <span className="wrb-label">Recommendations in the batch</span>
            <div className="wrb-row">
              {SIZES.map((s) => (
                <button key={s} type="button" className="btn quiet" aria-pressed={n === s} onClick={() => setN(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>
              Share of AI recommendations that are wrong: <b>{errorPct}%</b>
            </span>
            <input type="range" min={2} max={20} step={1} value={errorPct} onChange={(e) => setErrorPct(+e.target.value)} aria-valuetext={`${errorPct} percent wrong`} />
          </label>
          <label className="field">
            <span>
              Automation bias: <b>{biasPct}%</b> lower chance of noticing a wrong suggestion
            </span>
            <input type="range" min={0} max={60} step={5} value={biasPct} onChange={(e) => setBiasPct(+e.target.value)} aria-valuetext={`${biasPct} percent`} />
          </label>
          <div className="wrb-group">
            <button type="button" className="btn quiet" aria-pressed={forcing} onClick={() => setForcing(!forcing)}>
              Reviewer commits to their own answer first: {forcing ? 'on' : 'off'}
            </button>
          </div>
        </div>

        <div className="wrb-group" role="group" aria-label="Review policy">
          <span className="wrb-label">Review policy</span>
          <div className="wrb-row">
            {POLICIES.map((k) => (
              <button key={k} type="button" className="btn quiet" aria-pressed={kind === k} onClick={() => setKind(k)}>
                {POLICY_LABELS[k]}
              </button>
            ))}
          </div>
          {kind === 'sample' && (
            <label className="field wrb-sample">
              <span>
                Sample size: <b>{samplePct}%</b> of items, picked at random
              </span>
              <input type="range" min={10} max={50} step={5} value={samplePct} onChange={(e) => setSamplePct(+e.target.value)} aria-valuetext={`${samplePct} percent`} />
            </label>
          )}
        </div>

        <div className="wrb-grid" aria-hidden="true">
          {run.items.map((it, i) => {
            let cls = 'wrb-cell';
            if (it.wrong) cls += it.reviewed ? (it.caught ? ' wrb-caught' : ' wrb-missed-r') : ' wrb-missed-u';
            else cls += it.reviewed ? ' wrb-seen' : '';
            return <i key={i} className={cls} />;
          })}
        </div>
        <ul className="wrb-legend" aria-label="Key to the grid">
          <li><i className="wrb-cell wrb-seen" /> right, and a person looked</li>
          <li><i className="wrb-cell" /> right, not looked at</li>
          <li><i className="wrb-cell wrb-caught" /> wrong, caught</li>
          <li><i className="wrb-cell wrb-missed-r" /> wrong, looked at but missed</li>
          <li><i className="wrb-cell wrb-missed-u" /> wrong, never looked at</li>
        </ul>

        <div className="wrb-result" role="status" aria-live="polite">
          <p>
            <b>
              This batch: {o.errors} wrong, {o.caught} caught, {missed} got through ({pct(o.errors ? missed / o.errors : 0)} of the errors).
            </b>{' '}
            The reviewer looked at {o.reviewed} of {n} items ({one(o.hours)} hours at {MINUTES_PER_ITEM} minutes each). Of the {missed} that got through, {o.missedReviewed} were looked at and missed, and {o.missedUnreviewed} were never looked at.
          </p>
          <p>
            Chance of noticing a wrong item that is looked at: <b>{pct(o.catchProb)}</b> = {pct(BASE_CATCH)} for a fresh, unbiased reviewer, lowered by bias
            {forcing ? ' (halved, because the reviewer commits first)' : ''} and by load ({o.reviewed <= COMFORTABLE_ITEMS ? 'within' : 'over'} the {COMFORTABLE_ITEMS}-item comfortable load).
          </p>
          <p className="wrb-small">
            Average over many batches with these settings: {one(exp.errors)} wrong, {one(exp.caught)} caught, {pct(missedShare(exp))} of errors get through. Errors are planted unevenly: {pct(rates.low, 1)} of low-confidence items are wrong, {pct(rates.medium, 1)} of medium and {pct(rates.high, 1)} of high.
          </p>
        </div>
        <div className="wrb-actions">
          <button type="button" className="btn" onClick={() => setSeed(seed + 1)}>
            Draw a new batch
          </button>
        </div>

        <h4 className="wrb-h">All four policies, same settings (averages)</h4>
        <div className="wrb-table-wrap">
          <table className="wrb-table">
            <caption className="wrb-sr">Expected results for each review policy with the current settings</caption>
            <thead>
              <tr>
                <th scope="col">Policy</th>
                <th scope="col">Items reviewed</th>
                <th scope="col">Hours</th>
                <th scope="col">Chance of noticing</th>
                <th scope="col">Errors caught</th>
                <th scope="col">Errors through</th>
              </tr>
            </thead>
            <tbody>
              {compare.map(({ k, e }) => (
                <tr key={k} className={k === kind ? 'wrb-now' : ''}>
                  <th scope="row">{POLICY_LABELS[k]}{k === 'sample' ? ` (${samplePct}%)` : ''}</th>
                  <td>{Math.round(e.reviewed)}</td>
                  <td>{one(e.hours)}</td>
                  <td>{pct(e.catchProb)}</td>
                  <td>{one(e.caught)}</td>
                  <td>{one(e.errors - e.caught)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="viz-cap">
          Things to try: with 400 items, compare review-everything with low-confidence-only. Then cut the batch to 100 and compare again. Then raise bias, and turn on commit-first. The confidence tiers help only because errors cluster in the low tier in this model. A score that does not do that (see the calibration reference in the lesson) gives targeted review no edge.
        </p>
      </div>
    </Root>
  );
}
