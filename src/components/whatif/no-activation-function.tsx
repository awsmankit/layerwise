import { useEffect, useMemo, useState } from 'react';
import WhatIfFrame from './WhatIfFrame';
import { collapse, HIDDEN_LAYER_COUNTS, runAll, score, type Point, type Trial } from '../../lib/whatif/no-activation-function';

const GRID = 24;
const SPAN = 2; // the plot shows x and y from -2 to 2
const PLOT = 300;
const PX = 30; // left margin of the plot inside the svg
const PY = 74;
const A = '#3d6fd6'; // class A: circles
const B = '#e08a1e'; // class B: squares

const sign = (v: number) => (Math.round(v * 100) < 0 ? '-' : '+');
const r1 = (n: number) => Math.round(n * 10) / 10; // rounded so the server and the browser print the same text
const toX = (v: number) => r1(PX + ((v + SPAN) / (2 * SPAN)) * PLOT);
const toY = (v: number) => r1(PY + ((SPAN - v) / (2 * SPAN)) * PLOT);

/**
 * Two classes of dots that no straight line can split. A stack of layers with no activation function
 * is still one straight cut however many layers you add; put tanh between them and the cut bends.
 */
export default function NoActivationFunction() {
  const [on, setOn] = useState(false);
  const [hidden, setHidden] = useState(2);
  const [run, setRun] = useState<{ data: Point[]; trials: Trial[] } | null>(null);

  // training takes a moment, so it runs once after the page is ready
  useEffect(() => {
    const t = setTimeout(() => setRun(runAll()), 0);
    return () => clearTimeout(t);
  }, []);

  const trial = run?.trials.find((t) => t.hidden === hidden && t.activation === (on ? 'tanh' : 'none'));

  const cells = useMemo(() => {
    if (!trial) return [];
    const out: { i: number; j: number; cls: 0 | 1; strength: number }[] = [];
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const x = -SPAN + ((i + 0.5) / GRID) * 2 * SPAN;
        const y = SPAN - ((j + 0.5) / GRID) * 2 * SPAN;
        const s = score(trial.net, x, y);
        out.push({ i, j, cls: s > 0 ? 1 : 0, strength: Math.min(1, 0.3 + Math.abs(s) / 4) });
      }
    }
    return out;
  }, [trial]);

  const line = trial && !on ? collapse(trial.net.layers) : null;
  const pct = trial ? Math.round(trial.accuracy * 100) : 0;
  const layersTotal = hidden + 1;
  const cell = PLOT / GRID;

  const boxW = 48;
  const gapW = 22;
  const rowW = layersTotal * boxW + (layersTotal - 1) * gapW;
  const rowX = (360 - rowW) / 2;

  if (!run || !trial) {
    return (
      <WhatIfFrame title="Can a stack of layers split this pattern?" withLabel="With an activation" withoutLabel="No activation" on={on} onChange={setOn} verdict="Training the tiny networks…">
        <div style={{ minHeight: 320 }} />
      </WhatIfFrame>
    );
  }

  return (
    <WhatIfFrame
      title="Can a stack of layers split this pattern?"
      withLabel="With an activation"
      withoutLabel="No activation"
      on={on}
      onChange={setOn}
      verdict={
        on ? (
          <>
            With a bend (tanh) between the layers, {layersTotal} layers get {pct}% of the 80 dots right. The boundary curves around the pattern.
          </>
        ) : (
          <>
            With no activation, {layersTotal} layers get only {pct}% right, about the same as guessing. They multiply into one straight cut, so more layers do not help.
          </>
        )
      }
      controls={
        <label className="field">
          <span>
            Hidden layers <b>{hidden}</b> (so {layersTotal} layers in all)
          </span>
          <input type="range" min={HIDDEN_LAYER_COUNTS[0]} max={HIDDEN_LAYER_COUNTS[HIDDEN_LAYER_COUNTS.length - 1]} value={hidden} onChange={(e) => setHidden(+e.target.value)} aria-label="Number of hidden layers" />
        </label>
      }
    >
      <div className="wt-fig">
        <svg
          viewBox={`0 0 360 ${PY + PLOT + 56}`}
          className="dx-svg wi-svg"
          role="img"
          aria-label={`A network of ${layersTotal} layers ${on ? 'with' : 'without'} an activation function trying to separate two classes of dots arranged in the XOR pattern. It gets ${pct} percent right.`}
        >
          {/* the stack of layers */}
          {Array.from({ length: layersTotal }, (_, k) => {
            const x = rowX + k * (boxW + gapW);
            return (
              <g key={k}>
                <rect x={x} y={8} width={boxW} height={28} rx={8} fill="var(--surface)" stroke="currentColor" strokeWidth={1.5} />
                <text x={x + boxW / 2} y={27} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 13 }}>
                  layer
                </text>
                {k < layersTotal - 1 &&
                  (on ? (
                    <path d={`M ${x + boxW + 4} 29 C ${x + boxW + 9} 29 ${x + boxW + 8} 15 ${x + boxW + 18} 15`} fill="none" stroke="#1f9d6b" strokeWidth={2.4} strokeLinecap="round" />
                  ) : (
                    <path d={`M ${x + boxW + 3} 22 L ${x + boxW + gapW - 3} 22`} stroke="currentColor" strokeWidth={1.5} />
                  ))}
              </g>
            );
          })}
          <text x={180} y={56} textAnchor="middle" style={{ fill: on ? '#1f9d6b' : '#d6453d', fontSize: 13, fontWeight: 700 }}>
            {on ? 'each gap bends the signal (tanh)' : `these ${layersTotal} layers = one straight cut`}
          </text>

          {/* decision regions */}
          <g aria-hidden="true">
            {cells.map((c) => (
              <rect key={`${c.i}-${c.j}`} className="wt-cell" x={r1(PX + c.i * cell)} y={r1(PY + c.j * cell)} width={r1(cell + 0.4)} height={r1(cell + 0.4)} fill={c.cls ? B : A} fillOpacity={Math.round(c.strength * 38) / 100} />
            ))}
          </g>
          <rect x={PX} y={PY} width={PLOT} height={PLOT} fill="none" stroke="currentColor" strokeWidth={1.2} />
          <line x1={toX(0)} x2={toX(0)} y1={PY} y2={PY + PLOT} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="3 4" />
          <line x1={PX} x2={PX + PLOT} y1={toY(0)} y2={toY(0)} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="3 4" />

          {/* the dots; a red ring means the network gets this one wrong */}
          {run.data.map((p, k) => {
            const wrong = (score(trial.net, p.x, p.y) > 0 ? 1 : 0) !== p.label;
            const cx = toX(p.x);
            const cy = toY(p.y);
            const col = p.label ? B : A;
            return (
              <g key={k}>
                {p.label ? <rect x={cx - 4.5} y={cy - 4.5} width={9} height={9} rx={1.5} fill={col} stroke="var(--surface)" strokeWidth={1} /> : <circle cx={cx} cy={cy} r={5} fill={col} stroke="var(--surface)" strokeWidth={1} />}
                {wrong && <circle cx={cx} cy={cy} r={8} fill="none" stroke="#d6453d" strokeWidth={1.8} />}
              </g>
            );
          })}

          <text x={PX} y={PY + PLOT + 20} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
            ● circles = class A   ■ squares = class B
          </text>
          <text x={PX} y={PY + PLOT + 40} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
            shaded = prediction; red ring = wrong
          </text>
        </svg>
      </div>
      <p className="wt-note">
        {line ? (
          <>
            Numbers: multiplying all {layersTotal} layers gives one rule, score = {line.w[0].toFixed(2)} x {sign(line.w[1])} {Math.abs(line.w[1]).toFixed(2)} y {sign(line.b)} {Math.abs(line.b).toFixed(2)}. Dots above 0 are called one class, below 0 the other. Final loss {trial.finalLoss.toFixed(3)} (a coin flip scores 0.693).
          </>
        ) : (
          <>
            Numbers: {layersTotal} layers of 6 units trained for 700 steps. Final loss {trial.finalLoss.toFixed(3)} (a coin flip scores 0.693). Switch the bend off to see the same network collapse into one line.
          </>
        )}
      </p>
    </WhatIfFrame>
  );
}
