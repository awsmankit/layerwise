import { useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import {
  ACTION_TEXT,
  BEHAVIOUR_TEXT,
  BIN,
  CAMERA,
  COLS,
  HORIZON,
  MOVE_COST,
  RUG,
  STORY,
  TERMS,
  plan,
  summarisePlan,
  type TermId,
  type TermSet,
} from '../../lib/reward-hacking';

/*
 * Reward-hacking toy world. The learner switches reward terms on and off; an exact planner then
 * finds the plan that collects the most reward, and the learner watches what it does. Every fix to
 * the reward closes one loophole and the planner finds the next. Deterministic: no randomness and
 * no learning model (see lib/reward-hacking.ts). Invented world, not a real robot.
 */

const CELL = 56;
const W = COLS * CELL;
const H = 4 * CELL;
const cx = (x: number) => x * CELL + CELL / 2;
const cy = (y: number) => y * CELL + CELL / 2;

const sameTerms = (a: TermSet, b: TermSet) => (Object.keys(a) as TermId[]).every((k) => a[k] === b[k]);

function Dirt({ x, y, small }: { x: number; y: number; small?: boolean }) {
  const r = small ? 6 : 9;
  return (
    <g className="rs-rh-dirt" aria-hidden="true">
      <circle cx={x} cy={y} r={r} />
      <circle cx={x + r * 0.9} cy={y + r * 0.5} r={r * 0.55} />
      <circle cx={x - r * 0.8} cy={y + r * 0.6} r={r * 0.45} />
    </g>
  );
}

export default function RewardHackWorld() {
  const [terms, setTerms] = useState<TermSet>(STORY[0].terms);
  const [t, setT] = useState(HORIZON);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const p = useMemo(() => plan(terms), [terms]);
  const f = p.frames[t];
  const prev = t > 0 ? p.frames[t - 1] : null;

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  };
  useEffect(() => stop, []);

  const choose = (next: TermSet) => {
    stop();
    setTerms(next);
    setT(HORIZON);
  };
  const toggle = (id: TermId) => choose({ ...terms, [id]: !terms[id] });

  const play = () => {
    if (playing) return stop();
    setT(0);
    setPlaying(true);
    let step = 0;
    timer.current = setInterval(() => {
      step += 1;
      setT(step);
      if (step >= HORIZON) stop();
    }, 450);
  };

  const sofar = p.frames.slice(1, t + 1).reduce((s, fr) => s + fr.reward, 0) + (t === HORIZON ? p.endBonus : 0);
  const o = p.outcome;
  const dirtLeft = o.onFloor + o.carried;
  const doneText = (() => {
    const parts = [`${o.inBin} of 2 bits of dirt in the bin`];
    if (o.underRug) parts.push(`${o.underRug} under the rug`);
    if (dirtLeft) parts.push(`${dirtLeft} still on the floor or in the robot's hands`);
    parts.push(o.coverCovered ? 'the camera is covered' : 'the camera is uncovered');
    return parts.join('; ');
  })();

  const step = t === 0 ? 'Start of the plan.' : `Step ${t}: the robot ${ACTION_TEXT[f.action ?? 'wait']}.`;
  const aria = `A room of ${COLS} by 4 cells. Camera at the top left, rug near the top, bin at the top right. ${step} Dirt: ${f.dirt.map((d) => (d.where === 'floor' ? 'on the floor' : d.where === 'carried' ? 'in the robot\'s hands' : d.where === 'bin' ? 'in the bin' : 'under the rug')).join(' and ')}. Camera ${f.covered ? 'covered' : 'uncovered'}.`;

  return (
    <Root>
      <div className="viz rs-rh">
        <p className="viz-title">The cleaning robot and its reward</p>
        <p className="rs-note">
          Invented world, not a real robot. The robot has {HORIZON} steps. What we want: both bits of dirt in the bin. What it chases: whatever the reward below pays. It is an exact planner, so it finds the best plan for the reward you choose, loopholes included.
        </p>

        <h4 className="rs-h">1. Choose the reward</h4>
        <div className="rs-rh-story" role="group" aria-label="Walk through the story">
          {STORY.map((s, i) => (
            <button key={s.label} type="button" className="btn quiet" aria-pressed={sameTerms(terms, s.terms)} onClick={() => choose(s.terms)}>
              <b>{i + 1}</b> {s.label}
            </button>
          ))}
        </div>
        <fieldset className="rs-rh-terms">
          <legend>Or build your own: switch the rules on and off</legend>
          {TERMS.map((term) => (
            <label key={term.id} className="rs-rh-term">
              <input type="checkbox" checked={terms[term.id]} onChange={() => toggle(term.id)} />
              <span>
                <b>{term.label}</b>
                <small>{term.rule}</small>
              </span>
            </label>
          ))}
          <p className="rs-small">Every move also costs {MOVE_COST}, so the robot takes short routes instead of wandering.</p>
        </fieldset>

        <h4 className="rs-h">2. Watch what it does</h4>
        <svg viewBox={`0 0 ${W} ${H}`} className="rs-rh-svg" role="img" aria-label={aria}>
          {Array.from({ length: COLS * 4 }, (_, i) => (
            <rect key={i} x={(i % COLS) * CELL} y={Math.floor(i / COLS) * CELL} width={CELL} height={CELL} className="rs-rh-cell" />
          ))}
          {/* rug */}
          <rect x={RUG.x * CELL + 4} y={RUG.y * CELL + 4} width={CELL - 8} height={CELL - 22} rx="6" className="rs-rh-rug" />
          <text x={cx(RUG.x)} y={RUG.y * CELL + CELL - 5} textAnchor="middle" className="rs-rh-label">rug</text>
          {/* bin */}
          <rect x={BIN.x * CELL + 8} y={BIN.y * CELL + 4} width={CELL - 16} height={CELL - 22} rx="4" className="rs-rh-bin" />
          <text x={cx(BIN.x)} y={BIN.y * CELL + CELL - 5} textAnchor="middle" className="rs-rh-label">bin</text>
          {/* camera: a small unit on the wall corner of its cell, so the robot can stand below it */}
          <g className={f.covered ? 'rs-rh-cam rs-rh-cam-off' : 'rs-rh-cam'}>
            <rect x={CAMERA.x * CELL + 5} y={CAMERA.y * CELL + 4} width="24" height="13" rx="3" />
            <circle cx={CAMERA.x * CELL + 17} cy={CAMERA.y * CELL + 10.5} r="4" />
          </g>
          {f.covered && <path d={`M${CAMERA.x * CELL + 6} ${CAMERA.y * CELL + 5} l22 11 M${CAMERA.x * CELL + 28} ${CAMERA.y * CELL + 5} l-22 11`} className="rs-rh-cross" />}
          <text x={cx(CAMERA.x)} y={CAMERA.y * CELL + CELL - 4} textAnchor="middle" className="rs-rh-label">camera</text>
          {/* floor dirt */}
          {f.dirt.map((d, i) => (d.where === 'floor' && d.cell ? <Dirt key={i} x={cx(d.cell.x)} y={cy(d.cell.y)} /> : null))}
          {/* robot */}
          <g transform={`translate(${cx(f.robot.x)} ${cy(f.robot.y)})`} className="rs-rh-robot-g">
            <rect x="-16" y="-14" width="32" height="28" rx="8" className="rs-rh-robot" />
            <circle cx="-6" cy="-3" r="3" className="rs-rh-eye" />
            <circle cx="6" cy="-3" r="3" className="rs-rh-eye" />
            <path d="M-6 6 H6" className="rs-rh-mouth" />
            {f.dirt.some((d) => d.where === 'carried') && <Dirt x={0} y={-22} small />}
          </g>
          {/* hidden and binned dirt counters */}
          {f.dirt.filter((d) => d.where === 'rug').length > 0 && (
            <text x={cx(RUG.x)} y={RUG.y * CELL + 26} textAnchor="middle" className="rs-rh-count">{`${f.dirt.filter((d) => d.where === 'rug').length} hidden`}</text>
          )}
          {f.dirt.filter((d) => d.where === 'bin').length > 0 && (
            <text x={cx(BIN.x)} y={BIN.y * CELL + 26} textAnchor="middle" className="rs-rh-count">{`${f.dirt.filter((d) => d.where === 'bin').length} in`}</text>
          )}
        </svg>

        <div className="rs-actions rs-rh-controls">
          <button type="button" className="btn" onClick={play}>{playing ? 'Pause' : 'Play the plan'}</button>
          <label className="field rs-rh-scrub">
            <span>
              Step <b>{t}</b> of {HORIZON}
            </span>
            <input type="range" min={0} max={HORIZON} step={1} value={t} onChange={(e) => { stop(); setT(+e.target.value); }} aria-valuetext={`step ${t} of ${HORIZON}`} />
          </label>
        </div>

        <div className="rs-result" role="status" aria-live="polite">
          <p className="rs-rh-step">{step}{prev && prev.sawNoMess !== f.sawNoMess ? (f.sawNoMess ? ' The camera now sees no mess.' : ' The camera sees mess.') : ''}</p>
          <p className="rs-small">Reward collected so far: <b>{sofar.toFixed(2)}</b> of {p.total.toFixed(2)}.</p>
          <p className="rs-rh-verdict"><b>What it does:</b> {BEHAVIOUR_TEXT[o.behaviour]}</p>
          <p className="rs-small"><b>At the end:</b> {doneText}. The camera saw no mess in {p.quietSteps} of {HORIZON} steps.</p>
          <p className="rs-small"><b>Its plan:</b> {summarisePlan(p)}.</p>
        </div>
        <p className="viz-cap">
          Try the five buttons in order. Each fix charges for the last trick, and the planner finds the next cheapest way to collect reward. Then try your own mix. Nothing here is random.
        </p>
      </div>
    </Root>
  );
}
