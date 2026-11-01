import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  ARROWS,
  DEFAULTS,
  MOVE_NAMES,
  WORLDS,
  bestAction,
  cellId,
  cols,
  greedyPath,
  kindAt,
  newLearner,
  recent,
  rowsOf,
  smooth,
  train,
  valueOf,
  type Learner,
  type Params,
} from '../../lib/qgrid';

const fmtV = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toString() : Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)).replace('-', '−');
const fmtQ = (v: number) => v.toFixed(2).replace('-', '−');

function ReturnChart({ values }: { values: number[] }) {
  const W = 340;
  const H = 120;
  const pad = { l: 44, r: 8, t: 10, b: 22 };
  if (values.length < 2) {
    return <p className="wc-empty">The chart appears after a few episodes.</p>;
  }
  const sm = smooth(values, 20);
  const lo = Math.min(...sm, 0);
  const hi = Math.max(...sm, 0);
  const span = hi - lo || 1;
  const sx = (i: number) => pad.l + (i / (sm.length - 1)) * (W - pad.l - pad.r);
  const sy = (v: number) => pad.t + (1 - (v - lo) / span) * (H - pad.t - pad.b);
  const d = sm.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="wc-ret" role="img" aria-label={`Return per episode, averaged over the last 20 episodes, over ${values.length} episodes. It ends at ${fmtV(sm[sm.length - 1])}.`}>
      <line x1={pad.l} x2={W - pad.r} y1={sy(0)} y2={sy(0)} className="wc-grid" />
      <text x={pad.l - 5} y={sy(hi) + 4} textAnchor="end" className="wc-ax">
        {fmtV(hi)}
      </text>
      {lo < 0 && (
        <text x={pad.l - 5} y={sy(lo) + 4} textAnchor="end" className="wc-ax">
          {fmtV(lo)}
        </text>
      )}
      <text x={pad.l} y={H - 5} className="wc-ax">
        1
      </text>
      <text x={W - pad.r} y={H - 5} textAnchor="end" className="wc-ax">
        episode {values.length}
      </text>
      <path d={d} fill="none" className="wc-retline" />
    </svg>
  );
}

export default function QGridLab() {
  const [wi, setWi] = useState(0);
  const [p, setP] = useState<Params>(DEFAULTS);
  const w = WORLDS[wi];
  const [learner, setLearner] = useState<Learner>(() => newLearner(WORLDS[0]));
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [note, setNote] = useState('No episodes yet. The agent knows nothing: every value is zero.');

  const path = useMemo(() => greedyPath(w, learner.q), [w, learner.q]);
  const onPath = useMemo(() => new Set(path.cells.map(([x, y]) => cellId(w, x, y))), [path, w]);
  const rec = recent(learner, 50);

  // shade by the best value in each cell, relative to the range seen so far
  const values: (number | null)[] = [];
  for (let y = 0; y < rowsOf(w); y++)
    for (let x = 0; x < cols(w); x++) {
      const k = kindAt(w, x, y);
      const base = cellId(w, x, y) * 4;
      values.push(k === 'wall' || k === 'goal' || bestAction(learner.q, base) === null ? null : valueOf(learner.q, base));
    }
  const seen = values.filter((v): v is number => v !== null);
  const vLo = seen.length ? Math.min(...seen) : 0;
  const vHi = seen.length ? Math.max(...seen) : 0;

  const reset = (nextWorld = wi) => {
    setLearner(newLearner(WORLDS[nextWorld]));
    setSel(null);
    setNote('Reset. The agent knows nothing: every value is zero.');
  };

  const run = (n: number) => {
    const next = train(w, learner, p, n);
    setLearner(next);
    const r = recent(next, 50);
    const g = greedyPath(w, next.q);
    const extra = w.cliff !== 0 ? `fell off the cliff ${r.falls} ${r.falls === 1 ? 'time' : 'times'}` : `stepped on the coin ${r.coins} times`;
    const route = g.reached ? `The greedy route reaches the goal in ${g.cells.length - 1} moves, return ${fmtV(g.ret)}.` : g.looped ? 'The greedy route loops back on itself and never reaches the goal.' : 'The greedy route does not reach the goal yet.';
    setNote(`Trained ${n} more, ${next.episodes} episodes in all. In the last ${r.n}: average return ${fmtV(r.meanReturn)}, reached the goal ${r.reached} ${r.reached === 1 ? 'time' : 'times'}, ${extra}. ${route}`);
  };

  const set = (k: keyof Params, v: number) => setP((cur) => ({ ...cur, [k]: v }));

  const selBase = sel ? cellId(w, sel[0], sel[1]) * 4 : -1;
  const selBest = sel ? bestAction(learner.q, selBase) : null;

  return (
    <Root>
      <div className="viz wc wc-grid-lab">
        <p className="viz-title">Q-learning on a grid: set the knobs and watch the table fill in</p>

        <div className="wc-chips" role="group" aria-label="World">
          {WORLDS.map((x, i) => (
            <button
              key={x.id}
              type="button"
              className="wc-chip"
              aria-pressed={wi === i}
              onClick={() => {
                setWi(i);
                reset(i);
              }}
            >
              {x.name}
            </button>
          ))}
        </div>
        <p className="wc-intro">{w.blurb}</p>

        <div className="wc-controls wc-three">
          <label className="field">
            <span>
              Learning rate (alpha) <b>{p.alpha.toFixed(2)}</b>
            </span>
            <input type="range" min={0.05} max={1} step={0.05} value={p.alpha} aria-label="Learning rate alpha" onChange={(e) => set('alpha', +e.target.value)} />
          </label>
          <label className="field">
            <span>
              Discount (gamma) <b>{p.gamma.toFixed(2)}</b>
            </span>
            <input type="range" min={0} max={1} step={0.05} value={p.gamma} aria-label="Discount gamma" onChange={(e) => set('gamma', +e.target.value)} />
          </label>
          <label className="field">
            <span>
              Exploration (epsilon) <b>{p.epsilon.toFixed(2)}</b>
            </span>
            <input type="range" min={0} max={0.5} step={0.05} value={p.epsilon} aria-label="Exploration epsilon" onChange={(e) => set('epsilon', +e.target.value)} />
          </label>
        </div>

        <div className="wc-buttons">
          <button type="button" className="btn" onClick={() => run(1)}>
            Train 1 episode
          </button>
          <button type="button" className="btn" onClick={() => run(10)}>
            Train 10
          </button>
          <button type="button" className="btn" onClick={() => run(100)}>
            Train 100
          </button>
          <button type="button" className="btn quiet" onClick={() => reset()}>
            Reset
          </button>
        </div>

        <div className="wc-board" style={{ gridTemplateColumns: `repeat(${cols(w)}, minmax(0, 1fr))` }} role="group" aria-label="The grid. Each cell shows the greedy action and the best value found so far. Tap a cell to see its four values.">
          {w.rows.map((_, y) =>
            Array.from({ length: cols(w) }, (__, x) => {
              const k = kindAt(w, x, y);
              const id = cellId(w, x, y);
              const base = id * 4;
              const v = values[id];
              const a = k === 'wall' || k === 'goal' ? null : bestAction(learner.q, base);
              const shade = v === null ? 0 : vHi === vLo ? 40 : 15 + ((v - vLo) / (vHi - vLo)) * 55;
              const label =
                k === 'wall'
                  ? 'Wall'
                  : k === 'goal'
                    ? 'Goal'
                    : `${k === 'cliff' ? 'Cliff' : k === 'start' ? 'Start' : k === 'coin' ? 'Coin' : 'Floor'} cell, column ${x + 1}, row ${y + 1}${a === null ? ', nothing learned yet' : `, best move ${MOVE_NAMES[a]}, value ${fmtV(valueOf(learner.q, base))}`}`;
              if (k === 'wall') return <div key={id} className="wc-c wc-wall" role="img" aria-label={label} />;
              const cls = `wc-c wc-k-${k}${onPath.has(id) ? ' wc-path' : ''}${sel && sel[0] === x && sel[1] === y ? ' wc-sel' : ''}`;
              return (
                <button
                  key={id}
                  type="button"
                  className={cls}
                  style={v !== null ? { backgroundColor: `color-mix(in srgb, var(--wc-a) ${shade}%, var(--surface))` } : undefined}
                  aria-label={label}
                  aria-pressed={!!sel && sel[0] === x && sel[1] === y}
                  onClick={() => setSel([x, y])}
                >
                  <span className="wc-tag">{k === 'goal' ? 'G' : k === 'start' ? 'S' : k === 'coin' ? 'coin' : k === 'cliff' ? 'cliff' : ''}</span>
                  <span className="wc-arrow">{a !== null ? ARROWS[a] : ''}</span>
                  <span className="wc-val num">{v !== null ? fmtV(v) : ''}</span>
                </button>
              );
            }),
          )}
        </div>
        <p className="wc-legend">
          Arrow: the best move so far. Number: its value. Darker blue: higher value. Outlined cells: the route the agent would take if it always chose its best move.
        </p>

        {sel && kindAt(w, sel[0], sel[1]) !== 'wall' && kindAt(w, sel[0], sel[1]) !== 'goal' && (
          <p className="wc-selected" aria-live="polite">
            Cell (column {sel[0] + 1}, row {sel[1] + 1}): {MOVE_NAMES.map((m, a) => (
              <span key={m} className={selBest === a ? 'wc-bestq' : ''}>
                {m} <b className="num">{fmtQ(learner.q[selBase + a])}</b>
                {a < 3 ? ', ' : ''}
              </span>
            ))}
            .
          </p>
        )}

        <p className="wc-status" aria-live="polite">
          {note}
        </p>

        <figure className="wc-fig">
          <figcaption className="wc-figcap">Return per episode (average of the last 20), episodes so far</figcaption>
          <ReturnChart values={learner.log.map((e) => e.ret)} />
        </figure>

        <p className="viz-cap">
          Tabular Q-learning with the update Q(s,a) &larr; Q(s,a) + alpha [ r + gamma max Q(s&prime;,a&prime;) &minus; Q(s,a) ] from Sutton and Barto. All values start at zero, ties are broken at random, and a fixed random seed makes the same clicks give the same result. You can change the knobs between episodes without resetting. The cliff world is a smaller copy of Example 6.6 in the book; the coin room is an invented example.
        </p>
      </div>
    </Root>
  );
}
