import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  EPSILONS,
  PEOPLE,
  TARGET_ID,
  averageStdDev,
  makeRng,
  maxOddsFactor,
  membershipGuessAccuracy,
  noiseScale,
  noiseStdDev,
  noisyCount,
  probNoiseWithin,
  queriesInBudget,
  runMany,
  totalEpsilonSpent,
  trueCount,
} from '../../lib/dp-noise';

/*
 * Differential-privacy noise demo. Twenty invented people, one yes/no flag each. The learner asks
 * "how many people have the flag?", with or without one person in the data, and sees what the exact
 * answer gives away and how much noise hides it at each epsilon. A second part shows how the
 * privacy budget is used up. The maths is in lib/dp-noise.ts. All data are invented.
 */

const RUNS = 2000;
const BUDGETS = [1, 2, 5] as const;
const REPEATS = [1, 10, 100] as const;
const W = 340;
const H = 150;
const PAD = 6;
const PAD_B = 26;

const fixed = (x: number, d = 1) => x.toFixed(d);

function Histogram({ epsilon, seed, withCount, withoutCount }: { epsilon: number; seed: number; withCount: number; withoutCount: number }) {
  const half = Math.max(6, Math.ceil(5 / epsilon));
  const centre = (withCount + withoutCount) / 2;
  const lo = Math.round(centre - half);
  const hi = Math.round(centre + half);
  const a = useMemo(() => runMany(seed, withCount, epsilon, RUNS, lo, hi), [seed, withCount, epsilon, lo, hi]);
  const b = useMemo(() => runMany(seed + 1, withoutCount, epsilon, RUNS, lo, hi), [seed, withoutCount, epsilon, lo, hi]);
  const bins = hi - lo + 1;
  const bw = (W - 2 * PAD) / bins;
  const top = Math.max(...a.counts, ...b.counts, 1);
  const plotH = H - PAD - PAD_B;
  const x = (v: number) => PAD + (v - lo) * bw;
  const bar = (c: number, i: number, cls: string) => {
    const h = (c / top) * plotH;
    return <rect key={`${cls}${i}`} x={PAD + i * bw + 0.3} y={H - PAD_B - h} width={Math.max(bw - 0.6, 0.5)} height={h} className={cls} />;
  };
  const step = bins > 60 ? 20 : bins > 30 ? 10 : 5;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="rs-dp-svg"
      role="img"
      aria-label={`Histogram of ${RUNS.toLocaleString('en-GB')} noisy answers with the person in the data (exact count ${withCount}) and ${RUNS.toLocaleString('en-GB')} without (exact count ${withoutCount}), at epsilon ${epsilon}. The two piles overlap more as epsilon gets smaller.`}
    >
      {a.counts.map((c, i) => bar(c, i, 'rs-dp-in'))}
      {b.counts.map((c, i) => bar(c, i, 'rs-dp-out'))}
      <path d={`M${PAD} ${H - PAD_B} H${W - PAD}`} className="rs-dp-axis" />
      <path d={`M${x(withCount) + bw / 2} ${PAD} V${H - PAD_B}`} className="rs-dp-true rs-dp-true-in" />
      <path d={`M${x(withoutCount) + bw / 2} ${PAD} V${H - PAD_B}`} className="rs-dp-true rs-dp-true-out" />
      {ticks.map((v) => (
        <text key={v} x={x(v) + bw / 2} y={H - 8} textAnchor="middle" className="rs-dp-tick">{v}</text>
      ))}
    </svg>
  );
}

export default function DpNoiseDemo() {
  const [hanaIn, setHanaIn] = useState(true);
  const [ei, setEi] = useState(3); // epsilon 1
  const [seed, setSeed] = useState(1);
  const [asks, setAsks] = useState(1);
  const [budget, setBudget] = useState<number>(2);
  const [repeats, setRepeats] = useState<number>(1);
  const [single, setSingle] = useState<{ value: number; world: boolean } | null>(null);

  const epsilon = EPSILONS[ei];
  const withCount = trueCount(PEOPLE, null);
  const withoutCount = trueCount(PEOPLE, TARGET_ID);
  const exact = hanaIn ? withCount : withoutCount;
  const target = PEOPLE[TARGET_ID];

  const draw = () => {
    const rng = makeRng(asks * 7919 + Math.round(epsilon * 1000));
    const v = noisyCount(rng, exact, epsilon);
    setSingle({ value: v, world: hanaIn });
    setAsks(asks + 1);
  };

  const affordable = queriesInBudget(budget, epsilon);
  const spent = totalEpsilonSpent(epsilon, repeats);
  const over = spent > budget + 1e-9;
  const cells = Math.min(affordable, 20);

  return (
    <Root>
      <div className="viz rs-dp">
        <p className="viz-title">The noisy counter</p>
        <p className="rs-note">
          Invented data: twenty imaginary people, each with a yes/no flag (think "has a particular health condition"). The question is "how many people have the flag?". Hana is one of them, and has the flag.
        </p>

        <h4 className="rs-h">1. What the exact answer gives away</h4>
        <ul className="rs-dp-people" aria-label="The twenty people. Filled means the flag is set.">
          {PEOPLE.map((p) => {
            const gone = !hanaIn && p.id === TARGET_ID;
            return (
              <li key={p.id} className={`${p.flag ? 'rs-dp-flag' : ''}${gone ? ' rs-dp-gone' : ''}${p.id === TARGET_ID ? ' rs-dp-target' : ''}`}>
                <span className="rs-dp-dot" aria-hidden="true" />
                {p.name}
                <span className="rs-sr">{p.flag ? ', flag set' : ', no flag'}{gone ? ', removed' : ''}</span>
              </li>
            );
          })}
        </ul>
        <div className="rs-actions">
          <button type="button" className="btn quiet" aria-pressed={!hanaIn} onClick={() => { setHanaIn(!hanaIn); setSingle(null); }}>
            {hanaIn ? `Remove ${target.name} from the data` : `Put ${target.name} back`}
          </button>
        </div>
        <p className="rs-result" role="status" aria-live="polite">
          <b>Exact count: {exact}.</b>{' '}
          {hanaIn
            ? `Remove ${target.name} and it becomes ${withoutCount}. Anyone who sees both exact answers learns that ${target.name} has the flag.`
            : `With ${target.name} it was ${withCount}. The one-point difference is the whole secret.`}
        </p>

        <h4 className="rs-h">2. Add noise</h4>
        <label className="field">
          <span>
            Privacy setting, epsilon <b>{epsilon}</b>
          </span>
          <input type="range" min={0} max={EPSILONS.length - 1} step={1} value={ei} onChange={(e) => { setEi(+e.target.value); setSingle(null); }} aria-valuetext={`epsilon ${epsilon}`} />
        </label>
        <p className="rs-small">
          Small epsilon means more privacy and more noise. Noise scale 1 / epsilon = <b>{fixed(noiseScale(epsilon), 1)}</b>: the answer is typically off by about {fixed(1 / epsilon, 1)}, and in {Math.round(probNoiseWithin(1, epsilon) * 100)}% of runs it is within 1 of the truth.
        </p>
        <div className="rs-actions">
          <button type="button" className="btn" onClick={draw}>Ask once</button>
          <button type="button" className="btn quiet" onClick={() => setSeed(seed + 2)}>Run the {RUNS.toLocaleString('en-GB')} again with new noise</button>
        </div>
        <p className="rs-result" role="status" aria-live="polite">
          {single
            ? `One noisy answer (${single.world ? `${target.name} in` : `${target.name} out`}, exact ${single.world ? withCount : withoutCount}): ${fixed(single.value, 2)}. Rounded: ${Math.round(single.value)}.`
            : 'Press "Ask once" to see a single noisy answer.'}
        </p>

        <Histogram epsilon={epsilon} seed={seed} withCount={withCount} withoutCount={withoutCount} />
        <p className="rs-dp-legend">
          <span><i className="rs-dp-sw rs-dp-sw-in" /> {target.name} in the data (exact {withCount})</span>
          <span><i className="rs-dp-sw rs-dp-sw-out" /> {target.name} out (exact {withoutCount})</span>
        </p>
        <p className="viz-cap">
          Each pile counts {RUNS.toLocaleString('en-GB')} noisy answers, rounded to whole numbers. Answers beyond the edges are counted in the end bars. Seeded random numbers: the same settings always draw the same picture until you press the button for new noise.
        </p>
        <div className="rs-result" role="status" aria-live="polite">
          <p className="rs-dp-line">
            An attacker who knows everything about the other 19 people sees one noisy answer and guesses whether {target.name} is in. Best possible accuracy: <b>{Math.round(membershipGuessAccuracy(epsilon) * 100)}%</b> (a coin flip is 50%).
          </p>
          <p className="rs-small">
            Epsilon also bounds how much one answer can shift the odds about {target.name}: by at most a factor of e^epsilon, which is <b>{fixed(maxOddsFactor(epsilon), 2)}</b> here.
          </p>
        </div>

        <h4 className="rs-h">3. The privacy budget runs out</h4>
        <div className="rs-dp-row" role="group" aria-label="Total privacy budget">
          <span>Total budget for this data set</span>
          {BUDGETS.map((bgt) => (
            <button key={bgt} type="button" className="btn quiet" aria-pressed={budget === bgt} onClick={() => setBudget(bgt)}>
              epsilon {bgt}
            </button>
          ))}
        </div>
        <p className="rs-small">
          With simple composition, the epsilons of separate answers add up. At epsilon {epsilon} per answer, a budget of {budget} pays for <b>{affordable}</b> {affordable === 1 ? 'answer' : 'answers'}.
        </p>
        <div className="rs-dp-budget" aria-hidden="true">
          {Array.from({ length: cells }, (_, i) => (
            <i key={i} />
          ))}
          {affordable > 20 && <em>+{affordable - 20}</em>}
          {affordable === 0 && <em>none: one answer costs more than the whole budget</em>}
        </div>
        <div className="rs-dp-row" role="group" aria-label="How many times the same question is asked">
          <span>Ask the same question</span>
          {REPEATS.map((n) => (
            <button key={n} type="button" className="btn quiet" aria-pressed={repeats === n} onClick={() => setRepeats(n)}>
              {n} {n === 1 ? 'time' : 'times'}
            </button>
          ))}
        </div>
        <p className="rs-result" role="status" aria-live="polite">
          {repeats} {repeats === 1 ? 'answer' : 'answers'} at epsilon {epsilon} cost <b className={over ? 'rs-dp-over' : ''}>epsilon {fixed(spent, 2)}</b>
          {over ? `, which is over the budget of ${budget}.` : `, within the budget of ${budget}.`}{' '}
          {repeats > 1
            ? `Averaging the ${repeats} answers cuts the noise from about ${fixed(noiseStdDev(epsilon), 1)} to ${fixed(averageStdDev(epsilon, repeats), 1)} (standard deviation). Fresh noise each time lets an asker average it away, so every repeat has to be paid for.`
            : `A single answer has noise of about ${fixed(noiseStdDev(epsilon), 1)} (standard deviation). Try asking the same question 10 or 100 times.`}
        </p>
      </div>
    </Root>
  );
}
