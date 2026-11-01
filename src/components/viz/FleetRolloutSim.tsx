import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE, fmt } from './shared';
import { CLASSES, FLEET, SCENARIOS, analyse, falseHaltProb, simulate, type Config } from '../../lib/fleet-rollout';

/*
 * Staged-rollout simulator. A fleet of 100,000 invented devices in three classes gets a new model in
 * stages. A regression hits one class only. The learner sets the canary size, the growth factor, the
 * halt rule, how many devices have reported back, and whether the canary is spread evenly across
 * device classes. The chances are exact binomial tails (lib/fleet-rollout.ts); the sample run uses a
 * seeded generator. All numbers are invented examples.
 */

const CANARIES = [0.001, 0.005, 0.01, 0.02, 0.05];
const GROWTHS = [2, 3, 5, 10];

const pc = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const pcAuto = (x: number) => (x < 0.001 ? '<0.1%' : x > 0.999 ? '>99.9%' : pc(x, x < 0.1 ? 1 : 0));

export default function FleetRolloutSim() {
  const [scenarioId, setScenarioId] = useState('lowram');
  const [ci, setCi] = useState(2);
  const [growth, setGrowth] = useState(5);
  const [thrTenths, setThrTenths] = useState(15); // threshold in tenths of a percent
  const [reporting, setReporting] = useState(50);
  const [even, setEven] = useState(false);
  const [sliced, setSliced] = useState(false);
  const [seed, setSeed] = useState(1);
  const [ran, setRan] = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const config: Config = useMemo(
    () => ({ canary: CANARIES[ci], growth, threshold: thrTenths / 1000, reporting: reporting / 100, evenCanary: even, perClass: sliced, scenario }),
    [ci, growth, thrTenths, reporting, even, sliced, scenario],
  );
  const a = useMemo(() => analyse(config), [config]);
  const falseAlarm = useMemo(() => falseHaltProb(config), [config]);
  const run = useMemo(() => simulate(config, seed), [config, seed]);

  const affectedClass = CLASSES.find((c) => c.id === scenario.affected);
  const summary =
    scenario.affected === null
      ? `Healthy update. The rule halts it by mistake with chance ${pcAuto(a.pHalt)}.`
      : `Regression on ${affectedClass!.label.toLowerCase()} devices. Chance it reaches the whole fleet: ${pcAuto(a.pFull)}. Expected devices updated before a halt: ${fmt.int(a.expectedExposed)}, of which ${fmt.int(a.expectedAffected)} in the affected class.`;

  return (
    <Root>
      <div className="viz ec-roll">
        <p className="viz-title">Staged rollout simulator</p>
        <p className="ec-note">
          Invented fleet of {fmt.int(FLEET)} devices: {CLASSES.map((c) => `${c.label} ${Math.round(c.share * 100)}%`).join(', ')}. Healthy devices fail at 0.5% over the watch window.
        </p>

        <div className="ec-row" role="group" aria-label="What the new model gets wrong">
          {SCENARIOS.map((s) => (
            <button key={s.id} type="button" className="btn quiet" aria-pressed={s.id === scenarioId} onClick={() => setScenarioId(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="ec-small">{scenario.blurb}</p>

        <div className="viz-controls">
          <label className="field">
            <span>
              Canary stage <b>{pc(CANARIES[ci], CANARIES[ci] < 0.01 ? 1 : 0)} ({fmt.int(Math.round(CANARIES[ci] * FLEET))} devices)</b>
            </span>
            <input type="range" min={0} max={CANARIES.length - 1} step={1} value={ci} onChange={(e) => setCi(+e.target.value)} aria-valuetext={`${pc(CANARIES[ci], 1)} of the fleet`} />
          </label>
          <div className="field">
            <span>
              Each stage grows by <b>x{growth}</b>
            </span>
            <div className="ec-row" role="group" aria-label="Growth factor per stage">
              {GROWTHS.map((g) => (
                <button key={g} type="button" className="btn quiet" aria-pressed={g === growth} onClick={() => setGrowth(g)}>
                  x{g}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>
              Halt if failure rate is at least <b>{(thrTenths / 10).toFixed(1)}%</b>
            </span>
            <input type="range" min={5} max={100} step={5} value={thrTenths} onChange={(e) => setThrTenths(+e.target.value)} aria-valuetext={`${(thrTenths / 10).toFixed(1)} percent`} />
          </label>
          <label className="field">
            <span>
              Devices reported back before deciding <b>{reporting}%</b>
            </span>
            <input type="range" min={10} max={100} step={10} value={reporting} onChange={(e) => setReporting(+e.target.value)} aria-valuetext={`${reporting} percent`} />
          </label>
        </div>
        <label className="ec-check">
          <input type="checkbox" checked={even} onChange={(e) => setEven(e.target.checked)} />
          <span>Fill the canary evenly across the three device classes, instead of in proportion</span>
        </label>
        <label className="ec-check">
          <input type="checkbox" checked={sliced} onChange={(e) => setSliced(e.target.checked)} />
          <span>Judge each device class on its own, and halt if any one class reaches the line</span>
        </label>

        <h4 className="ec-h">The plan, and the chance each stage halts</h4>
        <ol className="ec-stages">
          {a.rows.map((r) => (
            <li key={r.index}>
              <div className="ec-st-head">
                <b>Stage {r.index + 1}</b>
                <span>{pc(r.cumulative, r.cumulative < 0.01 ? 1 : 0)} of the fleet, {fmt.int(r.cohort)} new devices</span>
              </div>
              <div className="ec-meter" aria-hidden="true">
                <motion.i initial={false} animate={{ width: `${r.cumulative * 100}%` }} transition={{ duration: 0.35, ease: EASE }} />
              </div>
              <p className="ec-small">
                {fmt.int(r.observed)} report; expected failure rate {pc(r.rate, 2)};{' '}
                {sliced
                  ? `halts if a class reaches the line (${r.classes.map((x) => `${x.id}: ${x.haltAt}+ of ${fmt.int(x.observed)}`).join(', ')}).`
                  : `halts at ${r.haltAt} or more failures.`}{' '}
                <b>
                  Chance of halting here: {pcAuto(r.haltProb)}
                </b>
                {r.reachProb < 0.999 ? `; chance this stage is reached: ${pcAuto(r.reachProb)}` : ''}.
              </p>
            </li>
          ))}
        </ol>

        <div className="ec-result" role="status" aria-live="polite">
          <p>{summary}</p>
        </div>
        <dl className="rl-readout">
          <div>
            <dt>Updated before a halt (expected)</dt>
            <dd className="num">{fmt.int(a.expectedExposed)}</dd>
          </div>
          <div>
            <dt>Of those, in the affected class</dt>
            <dd className="num">{fmt.int(a.expectedAffected)}</dd>
          </div>
          <div>
            <dt>Extra failures caused</dt>
            <dd className="num">{fmt.int(a.expectedExtraFailures)}</dd>
          </div>
          <div>
            <dt>Reaches the whole fleet</dt>
            <dd className="num">{pcAuto(a.pFull)}</dd>
          </div>
          <div>
            <dt>Healthy update halted by mistake</dt>
            <dd className="num">{pcAuto(falseAlarm)}</dd>
          </div>
        </dl>

        <h4 className="ec-h">One rollout, drawn at random</h4>
        <div className="ec-row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSeed(seed + 1);
              setRan(true);
            }}
          >
            Run another rollout
          </button>
        </div>
        <ol className="ec-run" aria-live="polite">
          {run.rows.map((r) => (
            <li key={r.index} className={r.halted ? 'halt' : ''}>
              Stage {r.index + 1}: {r.failures} failures among {fmt.int(r.observed)} reporting ({pc(r.rate, 2)}).{' '}
              <b>{r.halted ? `Halted${r.haltedClass ? ` (class ${r.haltedClass})` : ''}.` : 'Continue.'}</b>
            </li>
          ))}
        </ol>
        <p className="ec-small">
          {run.haltedAt === null
            ? `This rollout reached everyone: ${fmt.int(run.exposed)} devices updated${scenario.affected ? `, ${fmt.int(run.affected)} of them in the affected class` : ''}.`
            : `Stopped after stage ${run.haltedAt + 1} with ${fmt.int(run.exposed)} devices updated${scenario.affected ? `, about ${fmt.int(run.affected)} of them in the affected class` : ''}.`}
          {ran ? '' : ' Press the button to draw a different one.'}
        </p>
        <p className="viz-cap">
          Failures in a stage follow a binomial distribution, so the chances above are exact for these invented settings, and the sample rollout draws from the same distribution with seeded random numbers. The halt rule is checked on each stage's own cohort; classes are labelled A (recent flagship), B (mid-range) and C (older, low memory). A halt stops further stages; devices already updated stay exposed until a rollback reaches them.
        </p>
      </div>
    </Root>
  );
}
