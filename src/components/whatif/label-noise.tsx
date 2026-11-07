import { useMemo, useState } from "react";
import WhatIfFrame from "./WhatIfFrame";
import {
  GRID,
  LIM,
  MODELS,
  NOISE_STEPS,
  SIZES,
  ceiling,
  curve,
  flippedSet,
  mapChange,
  noisyLabels,
  run,
  trainSet,
  type ModelId,
} from "../../lib/whatif/label-noise";

const r1 = (v: number) => Math.round(v * 10) / 10;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const C0 = "#3b6fd8";
const C1 = "#e08a1e";

/* map */
const S = 340;
const CELL = S / GRID;
const px = (v: number) => r1(((v + LIM) / (2 * LIM)) * S);
const py = (v: number) => r1(S - ((v + LIM) / (2 * LIM)) * S);

/* chart */
const CW = 340;
const CH = 210;
const X0 = 36;
const X1 = 332;
const Y0 = 12;
const Y1 = 172;
const A_LO = 0.5;
const A_HI = 0.95;
const cx = (p: number) => r1(X0 + (p / 45) * (X1 - X0));
const cy = (a: number) =>
  r1(
    Y1 -
      ((Math.max(A_LO, Math.min(A_HI, a)) - A_LO) / (A_HI - A_LO)) * (Y1 - Y0),
  );

const STYLE: Record<
  ModelId,
  { color: string; dash?: string; shape: "circle" | "square" | "tri" }
> = {
  line: { color: "#1f9d6b", shape: "circle" },
  smoother: { color: "#8a5cd6", dash: "7 4", shape: "square" },
  memoriser: { color: "#d6453d", dash: "2 4", shape: "tri" },
};

function Mark({
  shape,
  x,
  y,
  color,
  r = 4,
}: {
  shape: "circle" | "square" | "tri";
  x: number;
  y: number;
  color: string;
  r?: number;
}) {
  if (shape === "circle") return <circle cx={x} cy={y} r={r} fill={color} />;
  if (shape === "square")
    return (
      <rect
        x={r1(x - r)}
        y={r1(y - r)}
        width={2 * r}
        height={2 * r}
        fill={color}
      />
    );
  return (
    <path
      d={`M ${x} ${r1(y - r - 1)} L ${r1(x + r + 1)} ${r1(y + r)} L ${r1(x - r - 1)} ${r1(y + r)} Z`}
      fill={color}
    />
  );
}

/**
 * Flip a share of the training labels and retrain. The map shows what each model predicts at every spot of the plane
 * (blue tint = group A, orange tint = group B). Red-ringed points are the ones with a wrong label.
 * Accuracy is always measured on a separate set of clean test points.
 */
export default function LabelNoise() {
  const [noise, setNoise] = useState(0);
  const [lastNoisy, setLastNoisy] = useState(25);
  const [model, setModel] = useState<ModelId>("memoriser");
  const [n, setN] = useState<number>(60);

  const clean = noise === 0;
  const train = useMemo(() => trainSet(n), [n]);
  const flipped = useMemo(() => flippedSet(n, noise), [n, noise]);
  const shown = useMemo(() => noisyLabels(train, flipped), [train, flipped]);
  const now = useMemo(() => run(model, n, noise), [model, n, noise]);
  const base = useMemo(() => run(model, n, 0), [model, n]);
  const curves = useMemo(
    () =>
      Object.fromEntries(MODELS.map((m) => [m.id, curve(m.id, n)])) as Record<
        ModelId,
        number[]
      >,
    [n],
  );
  const best = useMemo(() => ceiling(), []);

  const setLevel = (v: number) => {
    setNoise(v);
    if (v > 0) setLastNoisy(v);
  };
  const idx = NOISE_STEPS.indexOf(noise);
  const modelName = MODELS.find((m) => m.id === model)!.name.toLowerCase();
  const moved = mapChange(base.map, now.map);
  const ranking = MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    a: curves[m.id][idx],
  })).sort((a, b) => b.a - a.a);
  const r = n <= 100 ? 4 : 2.3;

  return (
    <WhatIfFrame
      title="Wrong labels in, a bent boundary out"
      withLabel="Clean labels"
      withoutLabel="Some labels wrong"
      on={clean}
      onChange={(on) => (on ? setNoise(0) : setNoise(lastNoisy))}
      verdict={
        clean ? (
          <>
            All {n} labels are right. The {modelName} scores {pct(now.accuracy)}{" "}
            on clean test points. The best possible straight rule, which knows
            how the data was made, scores {pct(best)}, so that is the ceiling.
          </>
        ) : (
          <>
            With {noise}% of the {n} training labels flipped ({flipped.size}{" "}
            rows), the {modelName} falls from {pct(base.accuracy)} to{" "}
            {pct(now.accuracy)} on clean test points, and its map changes in{" "}
            {pct(moved)} of the plane. Best at this noise:{" "}
            {ranking[0].name.toLowerCase()}, {pct(ranking[0].a)}.
          </>
        )
      }
      controls={
        <div className="wm-controls">
          <label className="field">
            <span>
              Share of training labels flipped <b>{noise}%</b>
            </span>
            <input
              type="range"
              min={0}
              max={45}
              step={5}
              value={noise}
              onChange={(e) => setLevel(+e.target.value)}
              aria-label="Share of training labels that are wrong, in percent"
            />
          </label>
          <div
            className="wm-picks"
            role="group"
            aria-label="Which model learns"
          >
            <span className="wm-picks-label">Model</span>
            {MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`wm-pick${model === m.id ? " is-on" : ""}`}
                aria-pressed={model === m.id}
                onClick={() => setModel(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
          <div
            className="wm-picks"
            role="group"
            aria-label="How many training rows"
          >
            <span className="wm-picks-label">Training rows</span>
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={`wm-pick${n === s ? " is-on" : ""}`}
                aria-pressed={n === s}
                onClick={() => setN(s)}
              >
                {s} rows
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="wm-fig">
        <svg
          viewBox={`0 0 ${S} ${S}`}
          className="dx-svg wi-svg wm-svg"
          role="img"
          aria-label={`A map of what the ${modelName} predicts after learning from ${n} rows, ${noise} percent of whose labels are wrong. Tint shows the predicted group. It scores ${pct(now.accuracy)} on clean test points.`}
        >
          {now.map.map((v, i) => {
            const c = i % GRID;
            const rr = Math.floor(i / GRID);
            const x = r1(c * CELL);
            const y = r1(rr * CELL);
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={r1((c + 1) * CELL) - x + 0.4}
                height={r1((rr + 1) * CELL) - y + 0.4}
                className="wm-cell"
                fill={v === 1 ? C1 : C0}
                fillOpacity={0.26}
              />
            );
          })}
          <line
            x1={0}
            y1={0}
            x2={S}
            y2={S}
            stroke="var(--ink)"
            strokeWidth={1.4}
            strokeDasharray="6 5"
            opacity={0.7}
          />
          {train.map((p, i) => {
            const label = shown[i];
            const bad = flipped.has(i);
            return label === 1 ? (
              <rect
                key={i}
                x={r1(px(p.x) - r)}
                y={r1(py(p.y) - r)}
                width={2 * r}
                height={2 * r}
                fill={C1}
                stroke={bad ? "#d6453d" : "var(--surface)"}
                strokeWidth={bad ? 1.8 : 0.5}
              />
            ) : (
              <circle
                key={i}
                cx={px(p.x)}
                cy={py(p.y)}
                r={r}
                fill={C0}
                stroke={bad ? "#d6453d" : "var(--surface)"}
                strokeWidth={bad ? 1.8 : 0.5}
              />
            );
          })}
          <text
            x={S - 6}
            y={S - 8}
            textAnchor="end"
            className="wm-tb"
            style={{
              paintOrder: "stroke",
              stroke: "var(--surface)",
              strokeWidth: 4,
            }}
          >
            dashed = best possible line
          </text>
        </svg>
      </div>
      <ul className="wm-legend" aria-label="Key">
        <li>
          <span className="wm-sw is-round" style={{ background: C0 }} /> label A
        </li>
        <li>
          <span className="wm-sw" style={{ background: C1 }} /> label B
        </li>
        <li>
          <span className="wm-sw is-ring" style={{ color: "#d6453d" }} /> red
          ring = label is wrong
        </li>
        <li>tint = what the model predicts there</li>
      </ul>
      <ul className="wm-nums" aria-label="Numbers for this setting">
        <li className="is-lit">
          Clean-test accuracy<b>{pct(now.accuracy)}</b>
        </li>
        <li>
          With no noise<b>{pct(base.accuracy)}</b>
        </li>
        <li>
          Map changed<b>{pct(moved)}</b>
        </li>
        <li>
          Wrong labels
          <b>
            {flipped.size} of {n}
          </b>
        </li>
      </ul>

      <div className="wm-fig">
        <p className="wm-h">
          Accuracy on clean test points, {n} training rows{" "}
          <small>
            Each line is one model; the ring on the vertical bar shows where you
            are.
          </small>
        </p>
        <svg
          viewBox={`0 0 ${CW} ${CH}`}
          className="dx-svg wi-svg wm-svg"
          role="img"
          aria-label={`Accuracy against share of flipped labels for three models trained on ${n} rows. Best possible is ${pct(best)}.`}
        >
          {[0.5, 0.6, 0.7, 0.8, 0.9].map((a) => (
            <g key={a}>
              <line x1={X0} x2={X1} y1={cy(a)} y2={cy(a)} className="wm-grid" />
              <text x={X0 - 5} y={cy(a) + 4} textAnchor="end" className="wm-t">
                {pct(a)}
              </text>
            </g>
          ))}
          <rect
            x={X0}
            y={Y0}
            width={X1 - X0}
            height={Y1 - Y0}
            className="wm-frame"
          />
          <line
            x1={X0}
            x2={X1}
            y1={cy(best)}
            y2={cy(best)}
            stroke="var(--ink)"
            strokeWidth={1.4}
            strokeDasharray="6 4"
            opacity={0.7}
          />
          <text x={X1 - 2} y={cy(best) - 4} textAnchor="end" className="wm-t">
            best possible {pct(best)}
          </text>
          <line
            x1={cx(noise)}
            x2={cx(noise)}
            y1={Y0}
            y2={Y1}
            stroke="var(--ink)"
            strokeWidth={1.6}
            opacity={0.5}
          />
          {MODELS.map((m) => {
            const st = STYLE[m.id];
            const vals = curves[m.id];
            const sel = m.id === model;
            return (
              <g key={m.id} opacity={sel ? 1 : 0.8}>
                <path
                  d={vals
                    .map(
                      (v, i) =>
                        `${i ? "L" : "M"} ${cx(NOISE_STEPS[i])} ${cy(v)}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={st.color}
                  strokeWidth={sel ? 3 : 1.8}
                  strokeDasharray={st.dash}
                />
                {vals.map((v, i) => (
                  <Mark
                    key={i}
                    shape={st.shape}
                    x={cx(NOISE_STEPS[i])}
                    y={cy(v)}
                    color={st.color}
                    r={sel ? 3.6 : 2.6}
                  />
                ))}
                <circle
                  cx={cx(noise)}
                  cy={cy(vals[idx])}
                  r={sel ? 7.5 : 5.5}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={sel ? 2.2 : 1.4}
                />
              </g>
            );
          })}
          {[0, 15, 30, 45].map((p) => (
            <text
              key={p}
              x={cx(p)}
              y={Y1 + 16}
              textAnchor={p === 0 ? "start" : p === 45 ? "end" : "middle"}
              className="wm-t"
            >
              {p}%
            </text>
          ))}
          <text x={X0} y={Y1 + 34} className="wm-tb">
            share of training labels flipped
          </text>
        </svg>
      </div>
      <ul className="wm-legend" aria-label="Lines on the chart">
        {MODELS.map((m) => (
          <li key={m.id}>
            <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">
              <line
                x1="0"
                x2="26"
                y1="6"
                y2="6"
                stroke={STYLE[m.id].color}
                strokeWidth="2.4"
                strokeDasharray={STYLE[m.id].dash}
              />
              <Mark
                shape={STYLE[m.id].shape}
                x={13}
                y={6}
                color={STYLE[m.id].color}
                r={3.4}
              />
            </svg>
            {m.name}
          </li>
        ))}
      </ul>
      <p className="wm-foot">
        Toy data, made up for this demo: two overlapping groups, so even a
        perfect model tops out near {pct(best)}. Flips are chosen in a fixed
        order, so every extra 5% keeps the earlier flips. Models: a straight
        line (logistic regression trained by gradient descent), a memoriser that
        copies its single closest training row, and a smoother that takes a vote
        of its 15 closest. Every accuracy uses 500 clean test points that were
        never trained on. Try 600 rows: more data dilutes the wrong labels, and
        the straight line barely notices them. With only 60 rows the same flips
        hurt every model.
      </p>
    </WhatIfFrame>
  );
}
