import { useMemo, useState } from 'react';
import { Root } from './shared';
import { NODES, numericalGradient, walk, type NodeId } from '../../lib/autograd';

const W = 340;
const H = 392;
const BW = 100;
const BH = 62;
const POS: Record<NodeId, [number, number]> = {
  a: [62, 44],
  b: [278, 44],
  p: [190, 150],
  q: [62, 256],
  r: [62, 348],
};
const EDGES: [NodeId, NodeId][] = [
  ['a', 'p'],
  ['b', 'p'],
  ['p', 'q'],
  ['a', 'q'],
  ['q', 'r'],
];

/** The point where a line from the centre of box `from` towards box `to` leaves the box. */
function edgePoint(from: NodeId, to: NodeId): [number, number] {
  const [x1, y1] = POS[from];
  const [x2, y2] = POS[to];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const k = Math.min(dx !== 0 ? BW / 2 / Math.abs(dx) : Infinity, dy !== 0 ? BH / 2 / Math.abs(dy) : Infinity);
  return [x1 + dx * k, y1 + dy * k];
}

const fmt = (n: number | null) => (n === null ? '?' : Math.abs(n) < 5e-5 ? '0.000' : n.toFixed(3));

/**
 * The expression p = a × b, q = p + a, r = tanh(q) drawn as a graph. Step forward to compute values,
 * then step backward to watch gradients flow and add up. a and b can be changed with the sliders.
 */
export default function GraphWalk() {
  const [a, setA] = useState(0.5);
  const [b, setB] = useState(-1.5);
  const [i, setI] = useState(0);
  const steps = useMemo(() => walk(a, b), [a, b]);
  const s = steps[i];
  const num = useMemo(() => numericalGradient(a, b), [a, b]);
  const last = steps[steps.length - 1];

  return (
    <Root>
      <div className="viz da-graph">
        <p className="viz-title">Forward and backward through a small graph</p>

        <div className="da-sliders">
          <label className="da-slide">
            <span>
              a <b className="num">{a.toFixed(1)}</b>
            </span>
            <input type="range" min={-2} max={2} step={0.1} value={a} onChange={(e) => setA(Number(e.target.value))} aria-label="Value of a" />
          </label>
          <label className="da-slide">
            <span>
              b <b className="num">{b.toFixed(1)}</b>
            </span>
            <input type="range" min={-2} max={2} step={0.1} value={b} onChange={(e) => setB(Number(e.target.value))} aria-label="Value of b" />
          </label>
        </div>

        <svg className="da-svg da-gsvg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Graph: a and b feed p equals a times b. p and a feed q equals p plus a. q feeds r equals tanh of q. ${s.title}.`}>
          {EDGES.map(([from, to]) => {
            const hot = s.edges.some(([x, y]) => x === from && y === to);
            const [x1, y1] = edgePoint(from, to);
            const [x2, y2] = edgePoint(to, from);
            const ang = Math.atan2(y2 - y1, x2 - x1);
            const ah = [
              [x2, y2],
              [x2 - 9 * Math.cos(ang - 0.4), y2 - 9 * Math.sin(ang - 0.4)],
              [x2 - 9 * Math.cos(ang + 0.4), y2 - 9 * Math.sin(ang + 0.4)],
            ]
              .map((p) => p.join(','))
              .join(' ');
            const local = s.locals[`${from}>${to}`];
            return (
              <g key={`${from}${to}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} className={hot ? 'da-edge da-edge-hot' : 'da-edge'} />
                <polygon points={ah} className={hot ? 'da-arrow da-arrow-hot' : 'da-arrow'} />
                {hot && local !== undefined && s.phase === 'backward' && (
                  <text x={(x1 + x2) / 2 + (from === 'a' && to === 'q' ? 8 : 0)} y={(y1 + y2) / 2 + (from === 'b' ? -4 : 4)} textAnchor={from === 'a' && to === 'q' ? 'start' : 'middle'} className="da-t da-local">
                    ×{fmt(local)}
                  </text>
                )}
              </g>
            );
          })}
          {NODES.map((n) => {
            const [cx, cy] = POS[n.id];
            const active = s.active === n.id;
            const v = s.values[n.id];
            const g = s.grads[n.id];
            return (
              <g key={n.id}>
                <rect x={cx - BW / 2} y={cy - BH / 2} width={BW} height={BH} rx="6" className={active ? 'da-box da-box-hot' : 'da-box'} />
                <text x={cx} y={cy - 12} textAnchor="middle" className="da-name">
                  {n.id}
                  {n.op !== 'input' ? ` = ${n.op === 'tanh' ? 'tanh q' : n.id === 'p' ? 'a × b' : 'p + a'}` : ''}
                </text>
                <text x={cx} y={cy + 5} textAnchor="middle" className="da-val">
                  value {fmt(v)}
                </text>
                <text x={cx} y={cy + 21} textAnchor="middle" className={`da-grad${g === null ? ' da-dim' : ''}`}>
                  grad {fmt(g)}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="da-play">
          <button type="button" className="btn quiet da-nav" onClick={() => setI((k) => Math.max(0, k - 1))} disabled={i === 0}>
            Back
          </button>
          <button type="button" className="btn da-nav" onClick={() => setI((k) => Math.min(steps.length - 1, k + 1))} disabled={i === steps.length - 1}>
            Next step
          </button>
          <button type="button" className="btn quiet da-nav" onClick={() => setI(0)} disabled={i === 0}>
            Start again
          </button>
          <span className="da-stepno num">
            Step {i + 1} of {steps.length}
          </span>
        </div>

        <div className="da-say" aria-live="polite">
          <p className={`da-phase da-phase-${s.phase}`}>{s.title}</p>
          <p>{s.text}</p>
          {i === steps.length - 1 && (
            <p className="da-check num">
              Check by nudging: a changes r by {fmt(num.a)} per unit (backprop said {fmt(last.grads.a)}), b by {fmt(num.b)} (backprop said {fmt(last.grads.b)}).
            </p>
          )}
        </div>
      </div>
    </Root>
  );
}
