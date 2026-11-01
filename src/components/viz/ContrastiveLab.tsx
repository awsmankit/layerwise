import { useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import {
  CLASSES,
  backgroundShare,
  embed,
  inputWeights,
  makeItems,
  makePairs,
  meanPairAngle,
  neighbourPurity,
  newTrainer,
  train,
  type Trainer,
} from '../../lib/selfsup';

const SEED = 7;
const W = 290;
const CX = W / 2;
const CY = 150;
const R_OUT = 118;
const R_IN = 92;
const NAMES = ['content 1', 'content 2', 'background 1', 'background 2'];
const r1 = (v: number) => Math.round(v * 10) / 10;
const CLASS_NAMES = ['class A', 'class B', 'class C'];

function Mark({ cls, x, y, filled }: { cls: number; x: number; y: number; filled: boolean }) {
  const c = `wa-c${cls}`;
  const s = 5;
  const common = { className: `${c} ${filled ? 'wa-pt' : 'wa-pt wa-pt-hollow'}` };
  if (cls === 0) return <circle cx={x} cy={y} r={s} {...common} />;
  if (cls === 1) return <rect x={x - s} y={y - s} width={2 * s} height={2 * s} {...common} />;
  return <polygon points={`${x},${y - s - 1} ${x + s + 1},${y + s} ${x - s - 1},${y + s}`} {...common} />;
}

/**
 * Contrastive learning on a toy. Thirty-six items, each with two content numbers (which carry the hidden
 * class) and two background numbers (random). Two augmented views of each item are pulled together and
 * pushed away from the other items. The class colours are never used in training.
 */
export default function ContrastiveLab() {
  const items = useMemo(() => makeItems(36, SEED), []);
  const [aug, setAug] = useState(1);
  const [tau, setTau] = useState(0.5);
  const trRef = useRef<Trainer>(newTrainer(SEED));
  const [, bump] = useState(0);
  const [running, setRunning] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    setRunning(false);
    trRef.current = newTrainer(SEED);
    bump((n) => n + 1);
  }, [aug, tau]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const go = (steps: number) => {
    if (running) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      trRef.current = train(trRef.current, items, aug, tau, SEED, steps);
      bump((n) => n + 1);
      return;
    }
    setRunning(true);
    let left = steps;
    const tick = () => {
      const k = Math.min(5, left);
      trRef.current = train(trRef.current, items, aug, tau, SEED, k);
      left -= k;
      bump((n) => n + 1);
      if (left > 0) raf.current = requestAnimationFrame(tick);
      else setRunning(false);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const reset = () => {
    cancelAnimationFrame(raf.current);
    setRunning(false);
    trRef.current = newTrainer(SEED);
    bump((n) => n + 1);
  };

  const tr = trRef.current;
  const pairs = useMemo(() => makePairs(items, aug, 99), [items, aug]);
  const pos = pairs.map((p, i) => {
    const a = embed(tr.W, p[0]);
    const b = embed(tr.W, p[1]);
    return { cls: items[i].cls, a: [r1(CX + R_OUT * a[0]), r1(CY - R_OUT * a[1])], b: [r1(CX + R_IN * b[0]), r1(CY - R_IN * b[1])] };
  });
  const purity = neighbourPurity(tr.W, items);
  const angle = meanPairAngle(tr.W, pairs);
  const bg = backgroundShare(tr.W);
  const weights = inputWeights(tr.W);

  const verdict =
    tr.t === 0
      ? 'Not trained yet: the encoder starts with random weights, so the classes are mixed up.'
      : bg > 0.1
        ? 'The encoder leans on the background numbers. Because the two views share their background, it is a shortcut: easy to match the pair, useless for telling classes apart.'
        : purity > 0.9
          ? 'The encoder has learned to ignore the background and to use the content numbers, so items of one class sit together, and nobody gave it a label.'
          : 'Still learning: the background weights are shrinking but the classes are not yet clean.';

  return (
    <Root>
      <div className="viz wa-ssl">
        <p className="viz-title">Pull the two views together, push the others apart</p>

        <div className="wa-sliders">
          <label className="wa-slide">
            <span>
              How much augmentation scrambles the background <b>{aug.toFixed(1)}</b>
            </span>
            <input type="range" min={0} max={1} step={0.1} value={aug} onChange={(e) => setAug(Number(e.target.value))} aria-label="Augmentation strength, from 0 (background copied) to 1 (background redrawn)" aria-valuetext={`${aug.toFixed(1)}`} />
          </label>
          <label className="wa-slide">
            <span>
              Temperature <b>{tau.toFixed(1)}</b>
            </span>
            <input type="range" min={0.1} max={1} step={0.1} value={tau} onChange={(e) => setTau(Number(e.target.value))} aria-label="Temperature" aria-valuetext={tau.toFixed(1)} />
          </label>
        </div>
        <div className="wa-row">
          <button type="button" className="wa-chip wa-go" disabled={running} onClick={() => go(50)}>
            Train 50 steps
          </button>
          <button type="button" className="wa-chip wa-go" disabled={running} onClick={() => go(150)}>
            Train 150 steps
          </button>
          <button type="button" className="wa-chip" onClick={reset}>
            Start again
          </button>
        </div>

        <svg className="wa-svg wa-ring" viewBox={`0 0 ${W} 300`} role="img" aria-label={`Embedding of 36 items, two views each, on two rings by direction. After ${tr.t} training steps, ${Math.round(purity * 100)} per cent of items have a nearest neighbour of the same hidden class.`}>
          <circle cx={CX} cy={CY} r={R_OUT} className="wa-guide" />
          <circle cx={CX} cy={CY} r={R_IN} className="wa-guide" />
          {pos.map((p, i) => (
            <line key={`l${i}`} x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} className="wa-pair" />
          ))}
          {pos.map((p, i) => (
            <g key={i}>
              <Mark cls={p.cls} x={p.a[0]} y={p.a[1]} filled />
              <Mark cls={p.cls} x={p.b[0]} y={p.b[1]} filled={false} />
            </g>
          ))}
          <text x={CX} y={296} textAnchor="middle" className="wa-t">
            position = output direction
          </text>
        </svg>
        <ul className="wa-legend wa-keys" aria-label="Hidden classes, shown only so you can read the result">
          {CLASS_NAMES.slice(0, CLASSES).map((n, c) => (
            <li key={n}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <Mark cls={c} x={7} y={7.5} filled />
              </svg>{' '}
              {n}
            </li>
          ))}
          <li className="wa-dim">filled = view 1 (outer ring), hollow = view 2 (inner ring); the class labels are never used in training</li>
        </ul>

        <dl className="wa-stats">
          <div>
            <dt>Steps</dt>
            <dd>{tr.t}</dd>
          </div>
          <div>
            <dt>Loss</dt>
            <dd>{tr.t === 0 ? '-' : tr.loss.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Same-class nearest neighbour</dt>
            <dd>{Math.round(purity * 100)}%</dd>
          </div>
          <div>
            <dt>Gap between the two views</dt>
            <dd>{angle.toFixed(0)}°</dd>
          </div>
        </dl>

        <p className="wa-h wa-h2">What the encoder pays attention to</p>
        {weights.map((v, j) => (
          <div className="wa-gate" key={j}>
            <span>{NAMES[j]}</span>
            <span className="wa-bar" aria-hidden="true">
              <i className={j >= 2 ? 'wa-bar-bg' : ''} style={{ width: `${Math.min(100, (v / 3) * 100)}%` }} />
            </span>
            <b>{v.toFixed(2)}</b>
          </div>
        ))}
        <p className="wa-status" aria-live="polite">
          {verdict}
        </p>
        <p className="viz-cap">
          Made-up toy data, with a fixed random start. Each item has four numbers: two content numbers near one of three class centres, and two background numbers that vary a lot and mean nothing. An augmented view nudges the content a little and
          scrambles the background by the amount you set. The encoder is one linear map from 4 numbers to 2, and its output is read as a direction, so only the angle matters. Training uses the InfoNCE loss on all 72 views and the Adam optimiser. The same-class score uses the hidden labels, and nothing in training does.
        </p>
      </div>
    </Root>
  );
}
