import { useMemo, useState } from 'react';
import { Root, fmt, useNarrow } from './shared';
import { CENTRE, oneBoard, repeatExperiment, votedGap, votesNeeded, type Params, type Repeat } from '../../lib/arena-sim';

const NS = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const SPAN = 110;
const TRIALS = 400;
const pct = (n: number, t: number) => `${Math.round((n / t) * 100)}%`;

/**
 * Two models, a chosen true gap, N head-to-head votes. Shows the two published ratings with 95% bars, and
 * repeats the experiment to count how often the order comes out wrong. An optional style bonus shows narrow
 * bars around the wrong thing.
 */
export default function EloBars() {
  const narrow = useNarrow('(max-width: 640px)');
  const [gap, setGap] = useState(20);
  const [ni, setNi] = useState(3);
  const [style, setStyle] = useState(0);
  const [draw, setDraw] = useState(1);
  const [rep, setRep] = useState<Repeat | null>(null);

  const n = NS[ni];
  const p: Params = { trueGap: gap, n, styleBonusB: style };
  const board = useMemo(() => oneBoard(p, 11 + draw), [gap, n, style, draw]); // eslint-disable-line react-hooks/exhaustive-deps
  const need = votesNeeded(gap);
  const voted = votedGap(p);

  const W = narrow ? 320 : 640;
  const H = narrow ? 156 : 150;
  const padX = 14;
  const x = (r: number) => Math.round((padX + ((Math.min(CENTRE + SPAN, Math.max(CENTRE - SPAN, r)) - (CENTRE - SPAN)) / (2 * SPAN)) * (W - 2 * padX)) * 10) / 10;
  const rows = [
    { name: 'Model A', r: board.ratingA, y: narrow ? 44 : 42, truth: CENTRE + gap / 2 },
    { name: 'Model B', r: board.ratingB, y: narrow ? 96 : 92, truth: CENTRE - gap / 2 },
  ];
  const e = board.est;
  const verdict = board.overlap
    ? 'The bars overlap, so this leaderboard cannot say which model is better.'
    : e.gap > 0
      ? 'The bars are apart: this leaderboard puts Model A ahead.'
      : 'The bars are apart: this leaderboard puts Model B ahead.';
  const signed = (v: number) => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(0);

  const reset = () => setRep(null);

  return (
    <Root>
      <div className="viz pr-elo">
        <p className="viz-title">How many votes before a leaderboard gap means something?</p>
        <div className="viz-controls">
          <label className="field">
            <span>True quality gap, A over B <b>{gap} points</b></span>
            <input type="range" min={0} max={100} step={5} value={gap} onChange={(e) => { setGap(+e.target.value); reset(); }} aria-valuetext={`${gap} rating points`} />
          </label>
          <label className="field">
            <span>Votes, N <b>{fmt.int(n)}</b></span>
            <input type="range" min={0} max={NS.length - 1} step={1} value={ni} onChange={(e) => { setNi(+e.target.value); reset(); }} aria-valuetext={`${fmt.int(n)} votes`} />
          </label>
          <label className="field">
            <span>Style appeal of B (longer, tidier answers) <b>{style} points</b></span>
            <input type="range" min={0} max={60} step={5} value={style} onChange={(e) => { setStyle(+e.target.value); reset(); }} aria-valuetext={`${style} rating points`} />
          </label>
        </div>
        <p className="pr-small" style={{ marginTop: 0 }}>
          Simulation, not real models. Voters pick the better answer each time, with the odds set by the rating gap (400 points is 10 to 1). Ties are left out.
        </p>

        <svg viewBox={`0 0 ${W} ${H}`} className="pr-svg" role="img" aria-label={`Two rating bars. Model A: ${board.ratingA.toFixed(0)} plus or minus ${board.halfWidth.toFixed(0)}. Model B: ${board.ratingB.toFixed(0)} plus or minus ${board.halfWidth.toFixed(0)}. ${board.overlap ? 'The bars overlap.' : 'The bars do not overlap.'}`}>
          <path d={`M${padX} ${H - 28} H${W - padX}`} className="pr-axis" />
          {[-100, 0, 100].map((d) => (
            <g key={d}>
              <path d={`M${x(CENTRE + d)} ${H - 32} v8`} className="pr-axis" />
              <text x={x(CENTRE + d)} y={H - 8} textAnchor="middle" className="pr-tick">{CENTRE + d}</text>
            </g>
          ))}
          {rows.map((r) => {
            const lo = x(r.r - board.halfWidth);
            const hi = x(r.r + board.halfWidth);
            return (
              <g key={r.name}>
                <text x={padX} y={r.y - 14} className="pr-lab">{r.name}: {r.r.toFixed(0)} <tspan className="pr-lab-pm">± {board.halfWidth.toFixed(0)}</tspan></text>
                <path d={`M${lo} ${r.y} H${hi}`} className="pr-bar" />
                <path d={`M${lo} ${r.y - 7} v14 M${hi} ${r.y - 7} v14`} className="pr-bar" />
                <circle cx={x(r.r)} cy={r.y} r={5} className="pr-dot" />
                <path d={`M${x(r.truth)} ${r.y - 12} v24`} className="pr-truth" />
              </g>
            );
          })}
        </svg>
        <p className="pr-small">The dashed tick on each row is that model's true quality position. The dot is what {fmt.int(n)} votes made it look like.</p>

        <div className="pr-result" role="status" aria-live="polite">
          <p className="pr-big">Estimated gap <b>{signed(e.gap)}</b> points, 95% interval {signed(e.lo)} to {signed(e.hi)}</p>
          <p>{verdict}</p>
          {style > 0 && (
            <p className="pr-small">With a style appeal of {style} points, voters express a gap of {signed(voted)} points even though the quality gap is {signed(gap)}. More votes shrink the bars around {signed(voted)}, not around the quality gap.</p>
          )}
          {gap > 0 && <p className="pr-small">For a true gap of {gap} points, about {fmt.int(need)} votes are needed before the interval is narrower than the gap.</p>}
        </div>

        <div className="pr-actions">
          <button type="button" className="btn quiet" onClick={() => { setDraw(draw + 1); reset(); }}>Draw a new set of votes</button>
          <button type="button" className="btn" onClick={() => setRep(repeatExperiment(p, TRIALS, 7))}>Run {TRIALS} experiments at these settings</button>
        </div>
        {rep && (
          <div className="pr-result" role="status" aria-live="polite">
            <p className="pr-small" style={{ marginTop: 0 }}>{TRIALS} fresh sets of {fmt.int(n)} votes each.</p>
            {[
              { k: gap >= 0 ? 'Model A on top (the right order)' : 'Model B on top (the right order)', v: rep.rightOrder, cls: 'pr-ok' },
              { k: gap >= 0 ? 'Model B on top (flipped)' : 'Model A on top (flipped)', v: rep.flipped, cls: 'pr-bad' },
              { k: 'Bars overlap (cannot tell them apart)', v: rep.unclear, cls: 'pr-mid' },
              { k: 'Bars apart and wrong way round', v: rep.clearWrong, cls: 'pr-bad' },
            ].map((r) => (
              <div key={r.k} className="pr-part">
                <span>{r.k}</span>
                <div className="pr-meter" aria-hidden="true"><i className={r.cls} style={{ width: `${(r.v / rep.trials) * 100}%` }} /></div>
                <b>{pct(r.v, rep.trials)}</b>
              </div>
            ))}
          </div>
        )}
        <p className="viz-cap">Ratings are centred on {CENTRE}. Each bar is half the width of the gap interval, because the two ratings share one constraint, so the bars overlap exactly when the interval for the gap includes zero. Seeded, so the same settings give the same numbers.</p>
      </div>
    </Root>
  );
}
