import { useMemo, useState } from 'react';
import { Root } from './shared';
import { DEFAULTS, SCENARIOS, STRATEGIES, simulate, summarise, type ScenarioId, type Settings, type Strategy } from '../../lib/rollout-sim';

const SHARES = [0.01, 0.02, 0.05, 0.1, 0.25];
const RATES = [500, 2000, 10000];
const DELAYS = [0, 6, 24];
const ZS = [1.64, 2.33, 3, 4];
const DURATIONS = [24, 72, 168];

const W = 300;
const H = 170;
const PAD = { l: 30, r: 10, t: 12, b: 28 };

const num = (n: number) => Math.round(n).toLocaleString('en-GB');

/**
 * Shadow, canary or A/B for a new model with a hidden regression. Shows the z statistic hour by hour against the
 * halt line, how many real users got the new model before the halt, and, over 200 repeated rollouts, how often
 * and how fast the regression is caught.
 */
export default function RolloutSim() {
  const [strategy, setStrategy] = useState<Strategy>('canary');
  const [scenario, setScenario] = useState<ScenarioId>('bug');
  const [si, setSi] = useState(2);
  const [ri, setRi] = useState(1);
  const [di, setDi] = useState(0);
  const [zi, setZi] = useState(2);
  const [hi, setHi] = useState(1);
  const [seed, setSeed] = useState(1);

  const settings: Settings = {
    ...DEFAULTS,
    strategy,
    scenario,
    share: SHARES[si],
    requestsPerHour: RATES[ri],
    labelDelay: DELAYS[di],
    zHalt: ZS[zi],
    hours: strategy === 'ab' ? DURATIONS[hi] : 168,
    seed,
  };
  const key = JSON.stringify(settings);
  const run = useMemo(() => simulate(settings), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const sum = useMemo(() => summarise(settings, 200), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const sc = SCENARIOS.find((s) => s.id === scenario)!;
  const st = STRATEGIES.find((s) => s.id === strategy)!;

  const pts = run.points.filter((p) => p.z !== null);
  const lastHour = run.points.length ? run.points[run.points.length - 1].hour : 1;
  const zs = pts.map((p) => p.z as number);
  const zMax = Math.max(run.zNeeded + 1, ...zs, 3);
  const zMin = Math.min(-2, ...zs);
  const x = (h: number) => PAD.l + (h / Math.max(lastHour, 1)) * (W - PAD.l - PAD.r);
  const y = (z: number) => PAD.t + (1 - (z - zMin) / (zMax - zMin)) * (H - PAD.t - PAD.b);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.hour).toFixed(1)} ${y(p.z as number).toFixed(1)}`).join(' ');
  const ticks = [...new Set([0, 0.5, 1].map((f) => Math.round(lastHour * f)))]; // a short run can round two ticks to the same hour

  const caught = run.haltHour !== null;
  const outcome =
    strategy === 'ab'
      ? caught
        ? `The end-of-test analysis found the new model worse (hour ${run.haltHour}).`
        : 'The end-of-test analysis found no clear difference.'
      : caught
        ? `Halted at hour ${run.haltHour}.`
        : `Never halted in ${lastHour} hours.`;

  const blindShadow = strategy === 'shadow' && scenario === 'behaviour';
  const ariaChart = `Chart of the z statistic by hour, up to hour ${lastHour}. The halt line is at ${run.zNeeded}. ${outcome}`;

  return (
    <Root>
      <div className="viz mo2-roll">
        <p className="viz-title">Roll out a new model that may be worse: how many users see it before you know?</p>

        <div className="mo2-chips" role="group" aria-label="Rollout strategy">
          {STRATEGIES.map((s) => (
            <button key={s.id} type="button" className="btn quiet" aria-pressed={strategy === s.id} onClick={() => setStrategy(s.id)}>{s.label}</button>
          ))}
        </div>
        <p className="mo2-small">{st.detail}</p>

        <fieldset className="mo2-set">
          <legend>What is really wrong (hidden in real life)</legend>
          {SCENARIOS.map((s) => (
            <label key={s.id} className="mo2-opt">
              <input type="radio" name="mo2-scenario" checked={scenario === s.id} onChange={() => setScenario(s.id)} />
              <span>
                {s.label}
                <small>{s.detail}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="viz-controls">
          {strategy === 'canary' && (
            <label className="field">
              <span>Canary share of traffic: <b>{Math.round(SHARES[si] * 100)}%</b></span>
              <input type="range" min={0} max={SHARES.length - 1} step={1} value={si} onChange={(e) => setSi(+e.target.value)} aria-valuetext={`${Math.round(SHARES[si] * 100)} percent`} />
            </label>
          )}
          {strategy !== 'ab' && (
            <label className="field">
              <span>Halt when z reaches <b>{ZS[zi]}</b></span>
              <input type="range" min={0} max={ZS.length - 1} step={1} value={zi} onChange={(e) => setZi(+e.target.value)} aria-valuetext={`z of ${ZS[zi]}`} />
            </label>
          )}
          {strategy === 'ab' && (
            <label className="field">
              <span>Planned length: <b>{DURATIONS[hi]} hours</b></span>
              <input type="range" min={0} max={DURATIONS.length - 1} step={1} value={hi} onChange={(e) => setHi(+e.target.value)} aria-valuetext={`${DURATIONS[hi]} hours`} />
            </label>
          )}
          <label className="field">
            <span>Requests per hour: <b>{num(RATES[ri])}</b></span>
            <input type="range" min={0} max={RATES.length - 1} step={1} value={ri} onChange={(e) => setRi(+e.target.value)} aria-valuetext={`${num(RATES[ri])} requests per hour`} />
          </label>
          <label className="field">
            <span>Hours until an outcome is known: <b>{DELAYS[di]}</b></span>
            <input type="range" min={0} max={DELAYS.length - 1} step={1} value={di} onChange={(e) => setDi(+e.target.value)} aria-valuetext={`${DELAYS[di]} hours`} />
          </label>
        </div>
        <p className="mo2-small">Example simulation, not real traffic. The old model has a {Math.round(DEFAULTS.baseRate * 100)}% bad-outcome rate. Every check is a pooled two-proportion z test; A/B uses z = 1.96 once, at the end.</p>

        <div className="mo2-actions">
          <button type="button" className="btn quiet" onClick={() => setSeed(seed + 1)}>Run again with new random numbers</button>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="mo2-svg" role="img" aria-label={ariaChart}>
          <path d={`M${PAD.l} ${y(0)} H${W - PAD.r}`} className="mo2-grid" />
          <text x={PAD.l - 4} y={y(0) + 4} textAnchor="end" className="mo2-tick">0</text>
          <path d={`M${PAD.l} ${y(run.zNeeded)} H${W - PAD.r}`} className="mo2-thr" />
          <text x={PAD.l - 4} y={y(run.zNeeded) + 4} textAnchor="end" className="mo2-tick">{run.zNeeded}</text>
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor={t === 0 ? 'start' : t === lastHour ? 'end' : 'middle'} className="mo2-tick">{t}h</text>
          ))}
          {line && <path d={line} className={strategy === 'ab' ? 'mo2-zline mo2-faint' : 'mo2-zline'} />}
          {caught && run.haltHour !== null && (() => {
            const p = run.points.find((q) => q.hour === run.haltHour);
            return p && p.z !== null ? <circle cx={x(p.hour)} cy={y(p.z)} r={6} className="mo2-halt" /> : null;
          })()}
        </svg>
        <p className="mo2-small mo2-chartnote">z statistic of "new model is worse" by hour, against the halt line.{strategy === 'ab' ? ' The faint line is what you would see by peeking; the plan does not act on it.' : ''}</p>

        <div className="mo2-result" aria-live="polite" role="status">
          <p className="mo2-big"><span>This rollout</span><b className={caught === (scenario !== 'none') ? 'mo2-good' : 'mo2-bad'}>{outcome}</b></p>
          <p className="mo2-small">
            Real users who got the new model: <b>{num(run.servedNew)}</b>. Expected extra bad outcomes among them: <b>{num(run.extraBad)}</b> ({Math.round(sc.delta * 100)} points x users).
            {strategy === 'shadow' ? ' Shadow serves no real user from the new model.' : ''}
          </p>
          <p className="mo2-small">
            Over 200 repeated rollouts with these settings: {scenario === 'none' ? 'false halts in' : 'regression caught in'} <b>{Math.round(sum.detectionRate * 100)}%</b>
            {sum.medianHours !== null ? `, median hour ${sum.medianHours}` : ''}; median extra bad outcomes <b>{num(sum.medianExtraBad)}</b>.
          </p>
          {blindShadow && <p className="mo2-small mo2-note">Shadow compares the new model's predictions with outcomes, so it cannot see harm that only appears when users act on what the model shows them.</p>}
          {scenario === 'none' && strategy !== 'ab' && sum.detectionRate > 0.1 && <p className="mo2-small mo2-note">With nothing wrong, a low halt line plus hourly checks still stops many rollouts. That is peeking.</p>}
        </div>
      </div>
    </Root>
  );
}
