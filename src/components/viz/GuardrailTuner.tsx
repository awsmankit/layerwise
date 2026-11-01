import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  JUDGE_BAND,
  LATENCY,
  THRESHOLDS,
  counts,
  decideAll,
  latencySummary,
  sweep,
  totalCost,
  trafficStats,
  wilson,
  type Config,
  type Layer,
  type RuleMode,
  type Traffic,
} from '../../lib/guardrail-tuner';

/*
 * Guardrail tuner. Forty invented prompts, a toy classifier score for each, an optional keyword rule and an optional
 * second-look judge. The learner moves the threshold and sees which benign prompts get blocked and which bad ones get
 * through, then what that means for real traffic once the base rate is applied. Every number is an example value;
 * see src/lib/guardrail-tuner.ts.
 */

const RULES: { id: RuleMode; label: string }[] = [
  { id: 'off', label: 'No rules' },
  { id: 'phrase', label: 'Known injection phrase' },
  { id: 'words', label: 'Blunt word list' },
];
const RATIOS = [5, 20, 100] as const;
const N = 10000;

const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const int = (x: number) => Math.round(x).toLocaleString('en-GB');
const BY: Record<Exclude<Layer, null>, string> = { rule: 'the rule', classifier: 'the classifier', judge: 'the judge' };

/* strip geometry (viewBox units; no text lives inside the SVG) */
const SX0 = 10;
const SX1 = 390;
const sx = (v: number) => SX0 + v * (SX1 - SX0);

export default function GuardrailTuner() {
  const [rules, setRules] = useState<RuleMode>('off');
  const [threshold, setThreshold] = useState(0.6);
  const [judge, setJudge] = useState(false);
  const [prevalence, setPrevalence] = useState(1); // percent
  const [baitShare, setBaitShare] = useState(5); // percent
  const [ratio, setRatio] = useState<number>(20);

  const cfg: Config = { rules, threshold, judge };
  const traffic: Traffic = { n: N, prevalence: prevalence / 100, baitShare: baitShare / 100 };

  const decisions = useMemo(() => decideAll(cfg), [rules, threshold, judge]);
  const c = useMemo(() => counts(decisions), [decisions]);
  const stats = useMemo(() => trafficStats(decisions, traffic), [decisions, prevalence, baitShare]);
  const lat = useMemo(() => latencySummary(decisions, traffic), [decisions, prevalence, baitShare]);
  const sw = useMemo(() => sweep({ rules, judge }, traffic, ratio), [rules, judge, prevalence, baitShare, ratio]);
  const cost = totalCost(stats, ratio);

  const [recLo, recHi] = wilson(c.caught, c.nBad);
  const falseBlocked = decisions.filter((d) => d.prompt.label === 'ok' && d.blocked);
  const missed = decisions.filter((d) => d.prompt.label === 'bad' && !d.blocked);

  /* cost curve */
  const maxCost = Math.max(...sw.points.map((p) => p.cost));
  const cx = (t: number) => 8 + ((t - 0.05) / 0.95) * 384;
  const cy = (v: number) => 92 - (maxCost ? v / maxCost : 0) * 80;
  const path = sw.points.map((p, i) => `${i ? 'L' : 'M'}${cx(p.threshold).toFixed(1)} ${cy(p.cost).toFixed(1)}`).join(' ');

  const say = `Settings: ${RULES.find((r) => r.id === rules)!.label.toLowerCase()}, classifier threshold ${threshold.toFixed(2)}, second-look judge ${judge ? 'on' : 'off'}. On the 40 prompts: ${c.caught} of ${c.nBad} bad prompts blocked, ${falseBlocked.length} of ${c.nPlain + c.nBait} benign prompts blocked. For ${int(N)} example requests with ${prevalence}% bad: ${int(stats.falseBlocks)} benign requests blocked, ${int(stats.caught)} bad ones caught, ${int(stats.missed)} missed. Only ${pct(stats.precision)} of blocks are right.`;

  return (
    <Root>
      <div className="viz wle-tuner">
        <p className="viz-title">Guardrail tuner: 40 invented prompts</p>
        <p className="wle-note">
          Every score, latency, cost ratio and traffic mix here is an example value, not a measurement of any real classifier. The prompts are invented and mild.
        </p>

        <div className="wle-group" role="group" aria-label="Rule layer">
          <span className="wle-label">Rule layer (runs first)</span>
          <div className="wle-row">
            {RULES.map((r) => (
              <button key={r.id} type="button" className="btn quiet" aria-pressed={rules === r.id} onClick={() => setRules(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="wle-controls">
          <label className="field">
            <span>
              Classifier blocks at score <b>{threshold.toFixed(2)}</b> and above
            </span>
            <input type="range" min={0.05} max={1} step={0.05} value={threshold} onChange={(e) => setThreshold(+e.target.value)} aria-valuetext={`threshold ${threshold.toFixed(2)}`} />
          </label>
          <div className="wle-group">
            <button type="button" className="btn quiet" aria-pressed={judge} onClick={() => setJudge(!judge)}>
              Second-look judge on the grey band: {judge ? 'on' : 'off'}
            </button>
          </div>
          <label className="field">
            <span>
              Real requests that are bad: <b>{prevalence}%</b>
            </span>
            <input type="range" min={0.1} max={5} step={0.1} value={prevalence} onChange={(e) => setPrevalence(+e.target.value)} aria-valuetext={`${prevalence} percent`} />
          </label>
          <label className="field">
            <span>
              Benign requests that look risky: <b>{baitShare}%</b>
            </span>
            <input type="range" min={2} max={30} step={1} value={baitShare} onChange={(e) => setBaitShare(+e.target.value)} aria-valuetext={`${baitShare} percent`} />
          </label>
        </div>
        <div className="wle-group" role="group" aria-label="Cost of a missed bad request">
          <span className="wle-label">One missed bad request costs as much as this many wrongly blocked ones</span>
          <div className="wle-row">
            {RATIOS.map((r) => (
              <button key={r} type="button" className="btn quiet" aria-pressed={ratio === r} onClick={() => setRatio(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <svg className="wle-strip" viewBox="0 0 400 120" role="img" aria-label={`Each prompt placed by risk score from 0 to 1. Benign prompts on the top lane, bad prompts on the bottom lane. The threshold line is at ${threshold.toFixed(2)}. ${c.caught} of ${c.nBad} bad prompts and ${falseBlocked.length} benign prompts are blocked.`}>
          {judge && threshold - JUDGE_BAND < 1 && (
            <rect x={sx(Math.max(0, threshold - JUDGE_BAND))} y={4} width={sx(threshold) - sx(Math.max(0, threshold - JUDGE_BAND))} height={112} className="wle-band" />
          )}
          <line x1={SX0} y1={60} x2={SX1} y2={60} className="wle-mid" />
          {decisions.map((d, i) => {
            const bad = d.prompt.label === 'bad';
            const y = (bad ? 84 : 34) + ((i * 7) % 5) * 5 - 8;
            return (
              <circle
                key={d.prompt.id}
                cx={sx(d.prompt.score)}
                cy={y}
                r={5.5}
                className={`wle-dot ${bad ? 'wle-bad' : 'wle-ok'} ${d.blocked ? 'is-blocked' : ''}`}
              />
            );
          })}
          <line x1={sx(threshold)} y1={2} x2={sx(threshold)} y2={118} className="wle-thr" />
        </svg>
        <div className="wle-axis" aria-hidden="true">
          <span>risk score 0</span>
          <span>1</span>
        </div>
        <ul className="wle-legend" aria-label="Key to the strip">
          <li><i className="wle-key wle-ok" /> benign (top lane)</li>
          <li><i className="wle-key wle-bad" /> bad (bottom lane)</li>
          <li><i className="wle-key wle-ok is-blocked" /> filled: blocked</li>
          {judge && <li><i className="wle-key wle-bandkey" /> shaded: sent to the judge</li>}
        </ul>

        <div className="wle-result" role="status" aria-live="polite">
          <span className="wle-sr">{say}</span>
          <p aria-hidden="true">
            <b>On the 40 prompts:</b> {c.caught} of {c.nBad} bad prompts blocked (recall {pct(c.caught / c.nBad)}, 95% interval {pct(recLo)} to {pct(recHi)}, from only {c.nBad} cases).{' '}
            {falseBlocked.length} of {c.nPlain + c.nBait} benign prompts blocked.
          </p>
          <p aria-hidden="true">
            <b>In {int(N)} example requests, {prevalence}% of them bad:</b> {int(stats.falseBlocks)} benign requests blocked, {int(stats.caught)} bad ones caught, {int(stats.missed)} missed. Only{' '}
            <b>{pct(stats.precision)}</b> of the blocks are right.
          </p>
          <p aria-hidden="true">
            <b>Cost:</b> {int(cost)} units (a wrongly blocked request is 1, a missed bad one is {ratio}).{' '}
            {sw.best.threshold === threshold ? 'This threshold is the cheapest for these settings.' : `The cheapest threshold for these settings is ${sw.best.threshold.toFixed(2)} (${int(sw.best.cost)} units).`}
          </p>
          <p aria-hidden="true">
            <b>Added delay:</b> {lat.mean.toFixed(0)} ms on average, {lat.p95} ms at the 95th percentile. {pct(lat.judgeShare, 1)} of requests reach the judge ({LATENCY.rule} ms rule, {LATENCY.classifier} ms classifier, {LATENCY.judge} ms judge in this example).
          </p>
        </div>

        <h4 className="wle-h">Cost at every threshold, with these other settings</h4>
        <svg className="wle-curve" viewBox="0 0 400 100" role="img" aria-label={`Cost against threshold. The cheapest threshold is ${sw.best.threshold.toFixed(2)} at ${int(sw.best.cost)} units. Your threshold ${threshold.toFixed(2)} costs ${int(cost)} units.`}>
          <path d={path} className="wle-line" />
          <circle cx={cx(sw.best.threshold)} cy={cy(sw.best.cost)} r={5} className="wle-best" />
          <line x1={cx(threshold)} y1={4} x2={cx(threshold)} y2={96} className="wle-thr" />
        </svg>
        <div className="wle-axis" aria-hidden="true">
          <span>{THRESHOLDS[0].toFixed(2)}</span>
          <span>threshold (green dot: cheapest)</span>
          <span>1.00</span>
        </div>

        <div className="wle-cols">
          <div>
            <h4 className="wle-h">Benign prompts a user would see blocked ({falseBlocked.length})</h4>
            {falseBlocked.length === 0 ? (
              <p className="wle-small">None at these settings.</p>
            ) : (
              <ul className="wle-list">
                {falseBlocked.map((d) => (
                  <li key={d.prompt.id}>
                    {d.prompt.text} <span className="wle-tag">by {BY[d.by!]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="wle-h">Bad prompts that got through ({missed.length})</h4>
            {missed.length === 0 ? (
              <p className="wle-small">None at these settings.</p>
            ) : (
              <ul className="wle-list">
                {missed.map((d) => (
                  <li key={d.prompt.id}>
                    {d.prompt.text} <span className="wle-tag">{d.prompt.kind === 'sneaky' ? 'sneaky' : 'obvious'}, score {d.prompt.score.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <details className="wle-all">
          <summary>See all 40 prompts with their scores</summary>
          <div className="wle-table-wrap">
            <table className="wle-table">
              <caption className="wle-sr">Every prompt, its answer key, risk score and what the current settings do with it</caption>
              <thead>
                <tr>
                  <th scope="col">Prompt</th>
                  <th scope="col">Truth</th>
                  <th scope="col">Score</th>
                  <th scope="col">Now</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d) => {
                  const wrong = d.blocked !== (d.prompt.label === 'bad');
                  return (
                    <tr key={d.prompt.id} className={wrong ? 'is-wrong' : ''}>
                      <td>{d.prompt.text}</td>
                      <td>{d.prompt.label === 'bad' ? 'bad' : 'benign'}</td>
                      <td className="num">{d.prompt.score.toFixed(2)}</td>
                      <td>{d.blocked ? `blocked (${d.by})` : 'allowed'}{wrong ? ' - wrong' : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>

        <p className="viz-cap">
          Things to try: set bad traffic to 0.1% and watch the precision of the blocks collapse. Turn the blunt word list on and see who it blocks. Switch the judge on, drop the threshold to 0.45, and compare cost and delay. The 40 prompts are a hard-case test set, so the tool reweights them by the traffic mix you choose; a test set is not a sample of real traffic.
        </p>
      </div>
    </Root>
  );
}
