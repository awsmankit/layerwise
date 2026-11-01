import { useMemo, useState } from 'react';
import { Root, useNarrow } from './shared';
import { bestRound, boost, boostPredict, lossCurve, makeCurveData, target, treeSteps } from '../../lib/boosting';

const MAX_ROUNDS = 150;
const TRAIN_SEED = 3;
const VALID_SEED = 53;
const Y_LO = -3;
const Y_HI = 5.4;
const R_LIM = 3.6;

const n2 = (v: number) => v.toFixed(2);

/**
 * Gradient boosting on a 1D curve, one tree at a time. Top: the model so far and what it still gets wrong.
 * Middle: those leftovers and the small tree that is added next. Bottom: training and validation error by round.
 */
export default function BoostingSteps() {
  const narrow = useNarrow();
  const W = narrow ? 340 : 640;
  const ML = 34;
  const MR = 10;
  const MT = 10;
  const MB = 24;
  const H1 = narrow ? 230 : 270;
  const H2 = narrow ? 180 : 200;
  const H3 = narrow ? 170 : 190;

  const [round, setRound] = useState(3);
  const [lr, setLr] = useState(0.1);
  const [depth, setDepth] = useState(2);

  const train = useMemo(() => makeCurveData(TRAIN_SEED, 40), []);
  const valid = useMemo(() => makeCurveData(VALID_SEED, 40), []);
  const model = useMemo(() => boost(train, { rounds: MAX_ROUNDS, learningRate: lr, depth }), [train, lr, depth]);
  const trainLoss = useMemo(() => lossCurve(model, train), [model, train]);
  const validLoss = useMemo(() => lossCurve(model, valid), [model, valid]);
  const best = useMemo(() => bestRound(validLoss), [validLoss]);

  const r = Math.min(round, MAX_ROUNDS);
  const next = r < MAX_ROUNDS ? model.trees[r] : null;

  const r2 = (v: number) => Math.round(v * 100) / 100; // fixed precision so server and browser draw identical coordinates
  const sx = (x: number) => r2(ML + (x / 10) * (W - ML - MR));
  const sy1 = (v: number) => r2(H1 - MB - ((v - Y_LO) / (Y_HI - Y_LO)) * (H1 - MT - MB));
  const sy2 = (v: number) => r2(H2 - MB - ((v + R_LIM) / (2 * R_LIM)) * (H2 - MT - MB));
  const lossMax = Math.max(validLoss[0], trainLoss[0]) * 1.05;
  const sx3 = (k: number) => r2(ML + (k / MAX_ROUNDS) * (W - ML - MR));
  const sy3 = (v: number) => r2(H3 - MB - (v / lossMax) * (H3 - MT - MB));

  const predAt = (x: number) => boostPredict(model, x, r);
  const predPath = useMemo(
    () => Array.from({ length: 401 }, (_, i) => `${i ? 'L' : 'M'}${sx(i / 40).toFixed(1)} ${sy1(boostPredict(model, i / 40, r)).toFixed(1)}`).join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, r, W, H1],
  );
  const truePath = useMemo(
    () => Array.from({ length: 101 }, (_, i) => `${i ? 'L' : 'M'}${sx(i / 10).toFixed(1)} ${sy1(target(i / 10)).toFixed(1)}`).join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [W, H1],
  );

  const resid = train.map((p) => p.y - predAt(p.x));
  const stepPath = (() => {
    if (!next) return '';
    const steps = treeSteps(next, 0, 10);
    return steps.map((s, i) => `${i ? 'L' : 'M'}${sx(s.x0).toFixed(1)} ${sy2(s.value).toFixed(1)} L${sx(s.x1).toFixed(1)} ${sy2(s.value).toFixed(1)}`).join(' ');
  })();
  const lossPath = (c: number[]) => c.map((v, k) => `${k ? 'L' : 'M'}${sx3(k).toFixed(1)} ${sy3(v).toFixed(1)}`).join(' ');

  const over = r > best && validLoss[r] > validLoss[best] + 0.005;
  const status = `After ${r} tree${r === 1 ? '' : 's'}: error on the 40 training points ${n2(trainLoss[r])}, on 40 held-back validation points ${n2(validLoss[r])}. The lowest validation error, ${n2(validLoss[best])}, comes at ${best} tree${best === 1 ? '' : 's'}.${over ? ' Past that point training error keeps falling but validation error is rising: the model has started fitting noise.' : ''}${next ? ` The next tree is shown in the middle chart; it will be added at ${Math.round(lr * 100)}% strength.` : ''}`;

  return (
    <Root>
      <div className="viz ma">
        <div className="ma-top">
          <p className="viz-title">Boosting, one small tree at a time</p>
        </div>
        <p className="ma-axes">
          The dots are noisy measurements of a hidden curve (dotted). Made-up example data: 40 points to train on, and 40 more held back to check on. Each tree here has a depth limit of {depth}, so it is a short list of questions.
        </p>

        <p className="ma-cap-h">1. The model so far, and what it still gets wrong</p>
        <svg viewBox={`0 0 ${W} ${H1}`} className="ma-svg" role="img" aria-label={`Noisy points, the hidden curve, and the staircase prediction after ${r} trees, with dashed lines showing each point's leftover error.`}>
          {[-2, 0, 2, 4].map((t) => (
            <g key={t}>
              <line x1={ML} x2={W - MR} y1={sy1(t)} y2={sy1(t)} className="ma-grid" />
              <text x={ML - 6} y={sy1(t) + 4} textAnchor="end" className="ma-tick">
                {t}
              </text>
            </g>
          ))}
          {[0, 2, 4, 6, 8, 10].map((t) => (
            <text key={t} x={sx(t)} y={H1 - 6} textAnchor="middle" className="ma-tick">
              {t}
            </text>
          ))}
          <rect x={ML} y={MT} width={W - ML - MR} height={H1 - MT - MB} className="ma-frame" />
          <path d={truePath} className="ma-truth" />
          {train.map((p, i) => (
            <line key={'l' + i} x1={sx(p.x)} x2={sx(p.x)} y1={sy1(p.y)} y2={sy1(predAt(p.x))} className="ma-resid" />
          ))}
          <path d={predPath} className="ma-pred-line" />
          {train.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy1(p.y)} r="4.5" className="ma-dot a" />
          ))}
        </svg>

        <p className="ma-cap-h">2. The leftovers, and the small tree that fits them</p>
        <svg viewBox={`0 0 ${W} ${H2}`} className="ma-svg" role="img" aria-label={next ? 'Each point leftover error, and the step function of the next tree fitted to those leftovers.' : 'Each point leftover error. All trees have been added.'}>
          {[-3, 0, 3].map((t) => (
            <g key={t}>
              <line x1={ML} x2={W - MR} y1={sy2(t)} y2={sy2(t)} className={t === 0 ? 'ma-axis' : 'ma-grid'} />
              <text x={ML - 6} y={sy2(t) + 4} textAnchor="end" className="ma-tick">
                {t}
              </text>
            </g>
          ))}
          {[0, 2, 4, 6, 8, 10].map((t) => (
            <text key={t} x={sx(t)} y={H2 - 6} textAnchor="middle" className="ma-tick">
              {t}
            </text>
          ))}
          <rect x={ML} y={MT} width={W - ML - MR} height={H2 - MT - MB} className="ma-frame" />
          {stepPath && <path d={stepPath} className="ma-tree-line" />}
          {train.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy2(Math.max(-R_LIM, Math.min(R_LIM, resid[i])))} r="4" className="ma-dot b" />
          ))}
        </svg>

        <p className="ma-cap-h">3. Error as trees are added</p>
        <svg viewBox={`0 0 ${W} ${H3}`} className="ma-svg" role="img" aria-label={`Training error falls steadily; validation error is lowest at ${best} trees. The marker is at ${r} trees.`}>
          {[0, 1, 2].filter((t) => t <= lossMax).map((t) => (
            <g key={t}>
              <line x1={ML} x2={W - MR} y1={sy3(t)} y2={sy3(t)} className="ma-grid" />
              <text x={ML - 6} y={sy3(t) + 4} textAnchor="end" className="ma-tick">
                {t}
              </text>
            </g>
          ))}
          {[0, 50, 100, 150].map((t) => (
            <text key={t} x={sx3(t)} y={H3 - 6} textAnchor="middle" className="ma-tick">
              {t}
            </text>
          ))}
          <rect x={ML} y={MT} width={W - ML - MR} height={H3 - MT - MB} className="ma-frame" />
          <path d={lossPath(trainLoss)} className="ma-loss train" />
          <path d={lossPath(validLoss)} className="ma-loss valid" />
          <line x1={sx3(best)} x2={sx3(best)} y1={MT} y2={H3 - MB} className="ma-best-mark" />
          <line x1={sx3(r)} x2={sx3(r)} y1={MT} y2={H3 - MB} className="ma-now" />
          <circle cx={sx3(r)} cy={sy3(validLoss[r])} r="4.5" className="ma-dot b" />
          <circle cx={sx3(r)} cy={sy3(trainLoss[r])} r="4.5" className="ma-dot a" />
        </svg>
        <p className="ma-legend">
          <span><i className="ma-key a" />training error</span>
          <span><i className="ma-key b" />validation error</span>
          <span><i className="ma-key m" />best round for validation</span>
        </p>

        <div className="ma-ctrls">
          <label className="field">
            <span>
              Trees added so far <b>{r}</b>
            </span>
            <input type="range" min={0} max={MAX_ROUNDS} step={1} value={r} onChange={(e) => setRound(+e.target.value)} />
          </label>
          <label className="field">
            <span>
              Learning rate <b>{lr.toFixed(2)}</b>
            </span>
            <input type="range" min={0.02} max={1} step={0.01} value={lr} onChange={(e) => setLr(+e.target.value)} />
          </label>
          <div className="field">
            <span>Depth of each tree</span>
            <div className="ma-btns" role="group" aria-label="Depth of each tree">
              {[1, 2, 3].map((d) => (
                <button key={d} type="button" className="btn quiet" aria-pressed={depth === d} onClick={() => setDepth(d)}>
                  {d === 1 ? '1 (a stump)' : d}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="ma-btns">
          <button type="button" className="btn quiet" disabled={r >= MAX_ROUNDS} onClick={() => setRound(Math.min(MAX_ROUNDS, r + 1))}>
            Add one tree
          </button>
          <button type="button" className="btn quiet" disabled={r >= MAX_ROUNDS} onClick={() => setRound(Math.min(MAX_ROUNDS, r + 10))}>
            Add ten
          </button>
          <button type="button" className="btn quiet" onClick={() => setRound(best)}>
            Stop at the best round
          </button>
          <button type="button" className="btn quiet" onClick={() => setRound(0)}>
            Start again
          </button>
        </div>

        <p className="ma-readout" role="status" aria-live="polite">
          {status}
        </p>
        <p className="viz-cap">Try a learning rate of 1: it fits fast and overshoots. Try 0.05: it needs many more trees but gets a smoother result. The depth buttons change how much each tree can do alone.</p>
      </div>
    </Root>
  );
}
