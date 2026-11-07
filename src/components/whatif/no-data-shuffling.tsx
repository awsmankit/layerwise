import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  CLASS_NAMES, DEFAULT_LR, EPOCH_ENDS, LR_MAX, LR_MIN, PER_CLASS, STEPS, STEPS_PER_EPOCH,
  batchMix, biggestLurch, indexFromLr, lrFromIndex, makeData, predict, train, type Snapshot,
} from '../../lib/whatif/no-data-shuffling';

const r1 = (n: number) => Math.round(n * 10) / 10;
const COLOUR = ['#e8833a', '#3b82c4', '#8a5cc2'];
const pct = (v: number) => `${Math.round(v * 100)}%`;
const DATA = makeData();

// map geometry: x from -4.5 to 4.5, y from -3.5 to 4.5 drawn on a 30 x 20 grid of 12 px cells
const COLS = 30;
const ROWS = 20;
const CELL = 12;
const X0 = -4.5;
const X1 = 4.5;
const Y0 = -3.5;
const Y1 = 4.5;
const mx = (x: number) => r1(((x - X0) / (X1 - X0)) * COLS * CELL);
const my = (y: number) => r1(((Y1 - y) / (Y1 - Y0)) * ROWS * CELL);

function shape(c: number, x: number, y: number, key: number) {
  const fill = COLOUR[c];
  const common = { fill, stroke: 'var(--ink)', strokeWidth: 0.9 };
  if (c === 0) return <circle key={key} cx={x} cy={y} r={3.4} {...common} />;
  if (c === 1) return <rect key={key} x={r1(x - 3.1)} y={r1(y - 3.1)} width={6.2} height={6.2} {...common} />;
  return <path key={key} d={`M${x} ${r1(y - 4)} L${r1(x + 3.8)} ${r1(y + 3)} L${r1(x - 3.8)} ${r1(y + 3)} Z`} {...common} />;
}

// loss chart geometry
const LX0 = 40;
const LX1 = 352;
const LY0 = 12;
const LY1 = 128;
const LMAX = 2.4;
const lx = (t: number) => r1(LX0 + (t / STEPS) * (LX1 - LX0));
const ly = (l: number) => r1(LY1 - (Math.min(l, LMAX) / LMAX) * (LY1 - LY0));
const SW = (LX1 - LX0) / STEPS;

export default function NoDataShuffling() {
  const [shuffled, setShuffled] = useState(false);
  const [lr, setLr] = useState(DEFAULT_LR);
  const [t, setT] = useState(STEPS);
  const [playing, setPlaying] = useState(false);

  const runs = useMemo(() => ({ sorted: train('sorted', lr), shuffled: train('shuffled', lr) }), [lr]);
  const mixes = useMemo(() => ({ sorted: batchMix('sorted'), shuffled: batchMix('shuffled') }), []);
  const order = shuffled ? 'shuffled' : 'sorted';
  const other = shuffled ? 'sorted' : 'shuffled';
  const run: Snapshot[] = runs[order];
  const ghost: Snapshot[] = runs[other];
  const snap = run[t];
  const mix = mixes[order];

  useEffect(() => {
    if (!playing) return;
    if (t >= STEPS) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setT((v) => Math.min(STEPS, v + 1)), 90);
    return () => clearTimeout(id);
  }, [playing, t]);

  const cells = useMemo(() => {
    const out: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = X0 + ((c + 0.5) / COLS) * (X1 - X0);
        const y = Y1 - ((r + 0.5) / ROWS) * (Y1 - Y0);
        out.push(predict(snap.weights, x, y));
      }
    }
    return out;
  }, [snap]);

  const curve = (arr: Snapshot[], upTo: number) => arr.slice(0, upTo + 1).map((s, i) => `${i === 0 ? 'M' : 'L'}${lx(i)} ${ly(s.loss)}`).join(' ');
  const ghostPath = curve(ghost, STEPS);
  const mainPath = curve(run, t);

  const lastClass = t > 0 ? mix[t - 1].indexOf(Math.max(...mix[t - 1])) : 0;
  const lurch = biggestLurch(run);
  const worst = snap.recall.indexOf(Math.min(...snap.recall));

  const verdict = shuffled
    ? `Shuffled, after step ${t}: loss ${snap.loss.toFixed(2)} (fed in order: ${runs.sorted[t].loss.toFixed(2)}). It labels ${CLASS_NAMES.map((n, i) => `${n} ${pct(snap.share[i])}`).join(', ')} of all points, close to a fair third each, and gets ${pct(snap.recall[0])} of class A right.`
    : t === 0
      ? 'Press Play it, or drag the step slider, to feed the batches in order: all of A first, then all of B, then all of C.'
      : `Fed in order, after step ${t}: loss ${snap.loss.toFixed(2)} (shuffled: ${runs.shuffled[t].loss.toFixed(2)}). The model labels ${pct(snap.share[lastClass])} of all points ${CLASS_NAMES[lastClass]}, the class it saw most recently (a fair model says 33%), and gets ${snap.recall[worst] < 0.7 ? 'only ' : ''}${pct(snap.recall[worst])} of class ${CLASS_NAMES[worst]} right, its worst class.`;

  const setOrder = (sh: boolean) => {
    setShuffled(sh);
    setT(STEPS);
    setPlaying(false);
  };

  return (
    <WhatIfFrame
      title="Same points, same number of steps, different order"
      withLabel="Shuffled each epoch"
      withoutLabel="Fed in fixed order"
      on={shuffled}
      onChange={setOrder}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Learning rate <b>{lr.toFixed(1)}</b>
            </span>
            <input
              type="range"
              min={indexFromLr(LR_MIN)}
              max={indexFromLr(LR_MAX)}
              step={1}
              value={indexFromLr(lr)}
              onChange={(e) => setLr(lrFromIndex(+e.target.value))}
              aria-label="Learning rate, from 0.5 to 3"
            />
          </label>
          <label className="field">
            <span>
              Training step <b>{t}</b> of {STEPS}
            </span>
            <input
              type="range"
              min={0}
              max={STEPS}
              step={1}
              value={t}
              onChange={(e) => {
                setPlaying(false);
                setT(+e.target.value);
              }}
              aria-label={`Training step, from 0 to ${STEPS}`}
            />
          </label>
          <div className="wt-btnrow">
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                } else {
                  if (t >= STEPS) setT(0);
                  setPlaying(true);
                }
              }}
            >
              {playing ? 'Pause' : t >= STEPS ? 'Play it' : 'Keep playing'}
            </button>
          </div>
        </>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`} className="dx-svg wi-svg" role="img" aria-label={`A map of three groups of points, A circles, B squares and C triangles. The shaded regions show which group the model picks after training step ${t}, ${shuffled ? 'with shuffled data' : 'with data fed in class order'}. ${pct(snap.share[2])} of all points are labelled C.`}>
          {cells.map((c, i) => (
            <rect key={i} className="wt-cell" x={(i % COLS) * CELL} y={Math.floor(i / COLS) * CELL} width={CELL} height={CELL} fill={COLOUR[c]} fillOpacity={0.3} shapeRendering="crispEdges" />
          ))}
          <rect x={0} y={0} width={COLS * CELL} height={ROWS * CELL} fill="none" stroke="currentColor" strokeOpacity={0.3} />
          {DATA.map((d, i) => shape(d.c, mx(d.x), my(d.y), i))}
          <rect x={6} y={6} width={150} height={22} rx={6} fill="var(--surface)" fillOpacity={0.9} />
          <text x={12} y={21} style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
            Shaded = what it picks
          </text>
        </svg>
      </div>

      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 214" className="dx-svg wi-svg" role="img" aria-label={`Loss on all the points after every training step. ${shuffled ? 'The shuffled curve falls steadily.' : 'The curve for data fed in order lurches up and down and ends higher.'} Below it, the class mix of every batch.`}>
          {[0, 1, 2].map((v) => (
            <g key={v}>
              <line x1={LX0} x2={LX1} y1={ly(v)} y2={ly(v)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
              <text x={LX0 - 5} y={ly(v) + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                {v}
              </text>
            </g>
          ))}
          {EPOCH_ENDS.slice(0, 2).map((e, i) => (
            <g key={e}>
              <line x1={lx(e)} x2={lx(e)} y1={LY0} y2={LY1} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="2 3" />
              <text x={lx(e) + 3} y={LY0 + 10} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                epoch {i + 1} ends
              </text>
            </g>
          ))}
          <path d={ghostPath} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.8} strokeDasharray="5 4" />
          <motion.path
            key={order}
            d={mainPath}
            fill="none"
            stroke={shuffled ? '#1f9d6b' : '#d6453d'}
            strokeWidth={2.6}
            strokeLinejoin="round"
            initial={{ pathLength: 0.2 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
          />
          <circle cx={lx(t)} cy={ly(snap.loss)} r={4.5} fill={shuffled ? '#1f9d6b' : '#d6453d'} stroke="var(--surface)" strokeWidth={1.5} />
          <text x={LX1} y={LY1 - 6} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            dashed: the {other === 'sorted' ? 'fixed-order' : 'shuffled'} run
          </text>
          <text x={LX0} y={LY1 + 14} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step 0
          </text>
          <text x={(LX0 + LX1) / 2} y={LY1 + 14} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            loss on all points
          </text>
          <text x={LX1} y={LY1 + 14} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step {STEPS}
          </text>
          {/* the order the batches arrive in */}
          <text x={LX0} y={LY1 + 34} style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
            Batches, in the order they arrive
          </text>
          {mix.map((m, s) => {
            let y = LY1 + 42;
            return (
              <g key={s} opacity={s < t ? 1 : 0.35}>
                {m.map((f, c) => {
                  if (f === 0) return null;
                  const h = f * 26;
                  const el = <rect key={c} x={r1(LX0 + s * SW + 0.4)} y={r1(y)} width={r1(SW - 0.8)} height={r1(h)} fill={COLOUR[c]} />;
                  y += h;
                  return el;
                })}
              </g>
            );
          })}
          <rect x={r1(LX0 + Math.max(0, t - 1) * SW - 0.4)} y={LY1 + 40} width={r1(SW + 0.8)} height={30} fill="none" stroke="var(--ink)" strokeWidth={1.5} display={t === 0 ? 'none' : undefined} />
          {!shuffled &&
            [0, 1, 2].flatMap((e) => [0, 1, 2].map((c) => (
              <text key={`${e}-${c}`} x={r1(LX0 + (e * STEPS_PER_EPOCH + c * (STEPS_PER_EPOCH / 3) + STEPS_PER_EPOCH / 6) * SW)} y={LY1 + 89} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
                {CLASS_NAMES[c]}
              </text>
            )))}
          {shuffled && (
            <text x={LX0} y={LY1 + 89} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
              every batch is a mix of A, B and C
            </text>
          )}
        </svg>
      </div>

      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 132" className="dx-svg wi-svg" role="img" aria-label={`For each group, the share of its points the model gets right and the share of all points it labels with that group, after step ${t}.`}>
          <text x={34} y={14} style={{ fill: 'var(--ink-2)', fontSize: 12, fontWeight: 700 }}>
            gets right
          </text>
          <text x={206} y={14} style={{ fill: 'var(--ink-2)', fontSize: 12, fontWeight: 700 }}>
            labels as this (fair: 33%)
          </text>
          {[0, 1, 2].map((c) => {
            const y = 24 + c * 34;
            return (
              <g key={c}>
                {shape(c, 14, y + 12, c)}
                <text x={24} y={y + 17} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
                  {CLASS_NAMES[c]}
                </text>
                <rect x={44} y={y + 4} width={100} height={16} rx={4} fill="currentColor" fillOpacity={0.1} />
                <rect className="wt-bar" x={44} y={y + 4} width={r1(snap.recall[c] * 100)} height={16} rx={4} fill={COLOUR[c]} />
                <text x={150} y={y + 17} style={{ fill: 'var(--ink)', fontSize: 12 }}>
                  {pct(snap.recall[c])}
                </text>
                <rect x={206} y={y + 4} width={100} height={16} rx={4} fill="currentColor" fillOpacity={0.1} />
                <rect className="wt-bar" x={206} y={y + 4} width={r1(Math.min(1, snap.share[c] * 1) * 100)} height={16} rx={4} fill={COLOUR[c]} />
                <line x1={r1(206 + 100 / 3)} x2={r1(206 + 100 / 3)} y1={y + 1} y2={y + 23} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="2 2" />
                <text x={312} y={y + 17} style={{ fill: 'var(--ink)', fontSize: 12 }}>
                  {pct(snap.share[c])}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="wt-note">
        A toy: a one-layer classifier (softmax regression) on {3 * PER_CLASS} made-up points, {PER_CLASS} per group, trained with batches of 10 for {STEPS / STEPS_PER_EPOCH} passes ({STEPS} steps). Both runs use the same points, the same learning rate and the same number of steps; only the order differs. The loss is measured on all points after every step, not just on the batch. Biggest one-step jump in loss for this run: {lurch.toFixed(2)}; the other run: {biggestLurch(ghost).toFixed(2)}. A real network is bigger, but the same pull toward the latest batch applies.
      </p>
    </WhatIfFrame>
  );
}
