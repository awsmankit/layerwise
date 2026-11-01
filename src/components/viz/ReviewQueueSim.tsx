import { useId, useMemo, useState } from 'react';
import { Root } from './shared';
import { DEFAULT_QUEUE, P_MAX, SHIFT_MIN, SLA_MIN, runQueue, type Order, type QueueConfig } from '../../lib/review-queue';

/**
 * Review-queue simulator: an agent drafts decisions all shift, each with a risk score.
 * The learner sets who gets a human look (a threshold) and how many reviewers there are,
 * and sees the queue, the wait and the errors that still reach customers.
 * Every parameter is illustrative. See src/lib/review-queue.ts.
 */

type Field = { key: 'rate' | 'reviewers' | 'minutes' | 'threshold' | 'catchRate'; label: string; min: number; max: number; step: number; show: (v: number) => string };

const FIELDS: Field[] = [
  { key: 'threshold', label: 'Send to a person at risk score of at least', min: 0, max: P_MAX, step: 0.01, show: (v) => v.toFixed(2) },
  { key: 'rate', label: 'Drafts arriving per hour', min: 20, max: 120, step: 10, show: (v) => String(v) },
  { key: 'reviewers', label: 'Reviewers on shift', min: 1, max: 6, step: 1, show: (v) => String(v) },
  { key: 'minutes', label: 'Minutes per review', min: 1, max: 8, step: 0.5, show: (v) => v.toFixed(1) },
  { key: 'catchRate', label: 'Chance a reviewer spots a wrong draft', min: 0.5, max: 1, step: 0.05, show: (v) => `${Math.round(v * 100)}%` },
];

const pct = (n: number, d: number) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`);
const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export default function ReviewQueueSim() {
  const uid = useId();
  const [cfg, setCfg] = useState<QueueConfig>({ ...DEFAULT_QUEUE });
  const r = useMemo(() => runQueue(cfg), [cfg]);
  const set = (patch: Partial<QueueConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const maxBin = Math.max(1, ...r.bins.map((b) => b.auto + b.sent));
  const maxQ = Math.max(1, ...r.series);
  const overloaded = r.load > 1;
  const slider = (f: Field) => (
    <div key={f.key} className="wld-field">
      <label htmlFor={`${uid}-${f.key}`}>
        <span>{f.label}</span>
        <b className="num">{f.show(cfg[f.key])}</b>
      </label>
      <input id={`${uid}-${f.key}`} type="range" min={f.min} max={f.max} step={f.step} value={cfg[f.key]} onChange={(e) => set({ [f.key]: Number(e.target.value) } as Partial<QueueConfig>)} />
    </div>
  );

  const summary = `${r.sent} of ${r.total} drafts go to a person (${pct(r.sent, r.total)}). Reviewer load is ${Math.round(r.load * 100)}%${overloaded ? ', so the queue cannot clear' : ''}. About ${one(r.reachCustomers)} wrong drafts reach customers, out of ${one(r.expectedErrors)} expected with no review.`;

  return (
    <Root>
      <div className="viz wld-rq">
        <p className="viz-title">A review queue for one 8-hour shift</p>
        <p className="wld-lead">
          An agent drafts replies to refund requests. Each draft gets a risk score, the model&rsquo;s estimate that the draft is wrong. Drafts at or above your threshold wait for a person. The rest go out automatically.
        </p>

        <div className="wld-fields">{FIELDS.map(slider)}</div>

        <div className="wld-controls">
          <fieldset className="wld-fs">
            <legend>Who is reviewed first</legend>
            {(
              [
                ['risk', 'Riskiest first'],
                ['fifo', 'Oldest first'],
              ] as [Order, string][]
            ).map(([id, label]) => (
              <label key={id} className="wld-check">
                <input type="radio" name={`${uid}-order`} checked={cfg.order === id} onChange={() => set({ order: id })} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="wld-fs">
            <legend>The risk score</legend>
            <label className="wld-check">
              <input type="checkbox" checked={cfg.overconfident} onChange={(e) => set({ overconfident: e.target.checked })} />
              <span>
                Overconfident: it shows half the true risk
                <small>Same ranking, wrong numbers. Your threshold now means something different.</small>
              </span>
            </label>
          </fieldset>
        </div>

        <figure className="wld-fig">
          <figcaption>
            Drafts by risk score. Filled bars go to a person ({r.sent}), outlined bars go out automatically ({r.auto}).
          </figcaption>
          <div className="wld-hist" role="img" aria-label={`Histogram of ${r.total} drafts by risk score from 0 to ${P_MAX}. ${r.sent} are at or above the threshold of ${cfg.threshold.toFixed(2)}.`}>
            {r.bins.map((b, i) => (
              <span key={i} className="wld-hcol">
                <span className="wld-hbar wld-hbar-sent" style={{ height: `${(b.sent / maxBin) * 100}%` }} />
                <span className="wld-hbar wld-hbar-auto" style={{ height: `${(b.auto / maxBin) * 100}%` }} />
              </span>
            ))}
          </div>
          <div className="wld-haxis" aria-hidden="true">
            <span>0</span>
            <span>risk score shown</span>
            <span>{P_MAX}</span>
          </div>
        </figure>

        <figure className="wld-fig">
          <figcaption>
            Drafts waiting for a person, every 30 minutes. {overloaded ? 'The line only climbs.' : 'It stays near zero.'}
          </figcaption>
          <div className="wld-qs" role="img" aria-label={`Queue length every 30 minutes: ${r.series.join(', ')}.`}>
            {r.series.map((q, i) => (
              <span key={i} className="wld-qcol">
                <span className={`wld-qbar${overloaded ? ' is-over' : ''}`} style={{ height: `${(q / maxQ) * 100}%` }} />
              </span>
            ))}
          </div>
          <div className="wld-haxis" aria-hidden="true">
            <span>start</span>
            <span>peak {Math.max(...r.series)}</span>
            <span>{SHIFT_MIN / 60} h</span>
          </div>
        </figure>

        <dl className="wld-stats">
          <div>
            <dt>Sent to a person</dt>
            <dd className="num">
              {r.sent} <small>of {r.total} ({pct(r.sent, r.total)})</small>
            </dd>
          </div>
          <div className={overloaded ? 'is-bad' : undefined}>
            <dt>Reviewer load</dt>
            <dd className="num">
              {Math.round(r.load * 100)}% <small>{overloaded ? 'over capacity' : 'of capacity'}</small>
            </dd>
          </div>
          <div className={r.backlog > 5 ? 'is-bad' : undefined}>
            <dt>Still waiting at the end</dt>
            <dd className="num">{r.backlog}</dd>
          </div>
          <div className={r.breached > 0 ? 'is-bad' : undefined}>
            <dt>Waited over {SLA_MIN} min</dt>
            <dd className="num">
              {r.breached} <small>mean wait {one(r.meanWait)} min</small>
            </dd>
          </div>
          <div>
            <dt>Wrong drafts that reach customers</dt>
            <dd className="num">
              {one(r.reachCustomers)} <small>of {one(r.expectedErrors)} expected</small>
            </dd>
          </div>
          <div className={cfg.overconfident ? 'is-bad' : undefined}>
            <dt>What the dashboard predicts</dt>
            <dd className="num">
              {one(r.predicted)} <small>{cfg.overconfident ? 'too low' : 'matches'}</small>
            </dd>
          </div>
        </dl>

        <p className="wld-verdict" aria-live="polite">
          {summary}
        </p>
        <div className="wld-row">
          <button type="button" className="wld-btn" onClick={() => setCfg({ ...DEFAULT_QUEUE })}>
            Reset
          </button>
          <button type="button" className="wld-btn" onClick={() => set({ threshold: 0 })}>
            Review everything
          </button>
        </div>
        <p className="viz-cap">
          Illustrative, not measured: risk is spread so that about 12% of drafts are wrong overall, drafts arrive at an even pace, a review takes a fixed time, and held drafts at the end of the shift have not reached customers. Errors are expected values, so the numbers are the same each time.
        </p>
      </div>
    </Root>
  );
}
