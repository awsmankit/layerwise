import { useId, useMemo, useState } from "react";
import { motion } from "motion/react";
import WhatIfFrame from "./WhatIfFrame";
import { EASE } from "../viz/shared";
import {
  K,
  MAX_STEPS,
  N_TEST,
  N_TRAIN,
  accuracy,
  bowl,
  descend,
  fitScaler,
  makeData,
  neighbours,
  ratioMeans,
  showcaseQuery,
  unitSweep,
} from "../../lib/whatif/no-feature-scaling";

/* plot A: income across, ratio up */
const W = 340;
const PX0 = 36;
const PX1 = 334;
const PY0 = 8;
const PY1 = 226;
const INC_LO = 0;
const INC_HI = 120000;
const r1 = (v: number) => Math.round(v * 10) / 10;
const sx = (income: number) =>
  r1(PX0 + ((income - INC_LO) / (INC_HI - INC_LO)) * (PX1 - PX0));
const sy = (ratio: number) => r1(PY1 - ratio * (PY1 - PY0));
const C0 = "#3b6fd8";
const C1 = "#e08a1e";
const pct = (v: number) => `${Math.round(v * 100)}%`;
const int = (v: number) => Math.round(v).toLocaleString("en-US");

/* panel B: contours and loss curve */
const BH = 176;
const CX = 66;
const CY = 88;
const LX0 = 190;
const LX1 = 332;
const LY0 = 30;
const LY1 = 140;
const STEPS = 200;
const LOG_FLOOR = -6;
const lx = (s: number) => r1(LX0 + (s / STEPS) * (LX1 - LX0));
const ly = (rem: number) =>
  r1(
    LY0 +
      ((0 - Math.max(LOG_FLOOR, Math.log10(Math.max(rem, 1e-12)))) /
        (0 - LOG_FLOOR)) *
        (LY1 - LY0),
  );
const curvePath = (rem: number[]) =>
  rem.map((v, i) => `${i ? "L" : "M"} ${lx(i)} ${ly(v)}`).join(" ");

function Meter({
  label,
  value,
  bad,
  top,
}: {
  label: string;
  value: number;
  bad?: boolean;
  top: boolean;
}) {
  return (
    <div className={`wm-meter${top ? " is-top" : ""}`}>
      <span>{label}</span>
      <div className="wm-track">
        <motion.div
          className={`wm-fill${bad ? " is-bad" : ""}`}
          initial={false}
          animate={{ width: `${r1(value * 100)}%` }}
          transition={{ duration: 0.45, ease: EASE }}
        />
      </div>
      <b>{pct(value)}</b>
    </div>
  );
}

/**
 * Customers with income (tens of thousands) and a repayment ratio (0 to 1). The k nearest customers vote.
 * Unscaled, income swamps the distance, so the "neighbourhood" is a thin vertical stripe that ignores the ratio.
 * Standardised, the neighbourhood is round. A second panel shows the same stretch as a long thin loss bowl
 * that gradient descent crawls along.
 */
export default function NoFeatureScaling() {
  const clip = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { train, test } = useMemo(() => makeData(), []);
  const sc = useMemo(() => fitScaler(train), [train]);
  const accRaw = useMemo(() => accuracy(train, test, false), [train, test]);
  const accScaled = useMemo(() => accuracy(train, test, true), [train, test]);
  const means = useMemo(() => ratioMeans(train), [train]);
  const units = useMemo(() => unitSweep(train, test), [train, test]);
  const bowls = useMemo(
    () => ({ raw: bowl(train, false), scaled: bowl(train, true) }),
    [train],
  );
  const runs = useMemo(
    () => ({
      raw: descend(bowls.raw, STEPS),
      scaled: descend(bowls.scaled, STEPS),
    }),
    [bowls],
  );

  const [scaled, setScaled] = useState(true);
  const [qi, setQi] = useState(() => showcaseQuery(train, test));
  const q = test[qi];
  const nb = useMemo(
    () => neighbours(train, q, scaled ? sc : null),
    [train, q, scaled, sc],
  );
  const nbRaw = useMemo(() => neighbours(train, q, null), [train, q]);
  const ratios = nb.idx.map((i) => train[i].ratio);
  const rLo = Math.min(...ratios);
  const rHi = Math.max(...ratios);
  const right = nb.vote === q.label;

  // the neighbourhood as an ellipse on the plot (the plot is drawn in raw units, so a round ball in scaled space is an ellipse here)
  const pxPerIncome = (PX1 - PX0) / (INC_HI - INC_LO);
  const pxPerRatio = PY1 - PY0;
  const rx = scaled ? nb.radius * sc.si * pxPerIncome : nb.radius * pxPerIncome;
  const ry = scaled
    ? nb.radius * sc.sr * pxPerRatio
    : Math.min(nb.radius * pxPerRatio, 4000);

  const bw = scaled ? bowls.scaled : bowls.raw;
  const run = scaled ? runs.scaled : runs.raw;
  const otherRun = scaled ? runs.raw : runs.scaled;
  const stretchTxt =
    bw.stretch >= 1000
      ? `1 : ${int(bw.stretch)}`
      : `1 : ${bw.stretch.toFixed(1)}`;
  const angleDeg = r1((-bw.angle * 180) / Math.PI);

  return (
    <WhatIfFrame
      title="Neighbours, with and without a common ruler"
      withLabel="Standardised"
      withoutLabel="Not scaled"
      on={scaled}
      onChange={setScaled}
      verdict={
        scaled ? (
          <>
            Standardised, income and ratio each count by how unusual they are,
            so this customer's {K} neighbours are close on both. The score on
            the {N_TEST} test customers is {pct(accScaled)}.
          </>
        ) : (
          <>
            Not scaled, income makes up{" "}
            {nbRaw.incomeShare > 0.9999
              ? "over 99.99%"
              : pct(nbRaw.incomeShare)}{" "}
            of the distance, so the {K} neighbours are picked by income alone
            (their ratios run from {rLo.toFixed(2)} to {rHi.toFixed(2)}). The
            score is {pct(accRaw)}
            {accRaw < 0.62 ? ", not much better than a coin flip" : ""}, against{" "}
            {pct(accScaled)} when standardised.
          </>
        )
      }
      controls={
        <label className="field">
          <span>
            New customer to classify{" "}
            <b>
              {qi + 1} of {N_TEST}
            </b>
          </span>
          <input
            type="range"
            min={0}
            max={N_TEST - 1}
            step={1}
            value={qi}
            onChange={(e) => setQi(+e.target.value)}
            aria-label={`Which of the ${N_TEST} test customers to look at`}
          />
        </label>
      }
    >
      <div className="wm-fig">
        <svg
          viewBox={`0 0 ${W} 262`}
          className="dx-svg wi-svg wm-svg"
          role="img"
          aria-label={`Customers plotted by yearly income across and repayment ratio up. The new customer's ${K} nearest neighbours are ringed. ${scaled ? "The search area is a round neighbourhood that uses both features." : "The search area is a thin vertical stripe: only income was used to pick neighbours."} The neighbours vote ${nb.vote === 1 ? "on time" : "late"} and the customer really is ${q.label === 1 ? "on time" : "late"}.`}
        >
          <defs>
            <clipPath id={clip}>
              <rect x={PX0} y={PY0} width={PX1 - PX0} height={PY1 - PY0} />
            </clipPath>
          </defs>
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line
                x1={PX0}
                x2={PX1}
                y1={sy(v)}
                y2={sy(v)}
                className="wm-grid"
              />
              <text x={PX0 - 5} y={sy(v) + 4} textAnchor="end" className="wm-t">
                {v}
              </text>
            </g>
          ))}
          {[0, 40000, 80000, 120000].map((v) => (
            <text
              key={v}
              x={Math.min(sx(v), PX1 - 12)}
              y={PY1 + 16}
              textAnchor={v === 0 ? "start" : v === INC_HI ? "end" : "middle"}
              className="wm-t"
            >
              {v === 0 ? "$0" : `$${v / 1000}k`}
            </text>
          ))}
          <rect
            x={PX0}
            y={PY0}
            width={PX1 - PX0}
            height={PY1 - PY0}
            className="wm-frame"
          />
          <text x={PX0} y={PY1 + 34} className="wm-tb">
            yearly income, across (example)
          </text>
          <text x={PX1} y={PY1 + 34} textAnchor="end" className="wm-tb">
            ratio, up
          </text>
          <g clipPath={`url(#${clip})`}>
            {train.map((t, i) => {
              const c = sx(t.income);
              const d = sy(t.ratio);
              const hit = nb.idx.includes(i);
              return t.label === 1 ? (
                <rect
                  key={i}
                  x={c - 3.2}
                  y={d - 3.2}
                  width={6.4}
                  height={6.4}
                  fill={C1}
                  opacity={hit ? 1 : 0.45}
                />
              ) : (
                <circle
                  key={i}
                  cx={c}
                  cy={d}
                  r={3.4}
                  fill={C0}
                  opacity={hit ? 1 : 0.45}
                />
              );
            })}
            <motion.ellipse
              initial={false}
              animate={{
                cx: sx(q.income),
                cy: sy(q.ratio),
                rx: r1(rx),
                ry: r1(ry),
              }}
              transition={{ duration: 0.6, ease: EASE }}
              fill={right ? "#1f9d6b" : "#d6453d"}
              fillOpacity={0.12}
              stroke={right ? "#1f9d6b" : "#d6453d"}
              strokeWidth={2}
              strokeDasharray="5 4"
            />
            {nb.idx.map((i) => (
              <circle
                key={i}
                cx={sx(train[i].income)}
                cy={sy(train[i].ratio)}
                r={7}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={1.6}
              />
            ))}
            <path
              d={`M ${sx(q.income)} ${r1(sy(q.ratio) - 9)} L ${r1(sx(q.income) + 8)} ${sy(q.ratio)} L ${sx(q.income)} ${r1(sy(q.ratio) + 9)} L ${r1(sx(q.income) - 8)} ${sy(q.ratio)} Z`}
              fill={q.label === 1 ? C1 : C0}
              stroke="var(--ink)"
              strokeWidth={2}
            />
          </g>
        </svg>
      </div>
      <ul className="wm-legend" aria-label="Key">
        <li>
          <span className="wm-sw is-round" style={{ background: C0 }} /> paid
          late
        </li>
        <li>
          <span className="wm-sw" style={{ background: C1 }} /> paid on time
        </li>
        <li>diamond = new customer</li>
        <li>rings = its {K} neighbours</li>
      </ul>
      <p className="wm-foot" aria-live="polite">
        <span className={`wm-badge ${right ? "is-good" : "is-bad"}`}>
          {right ? "Right" : "Wrong"}
        </span>{" "}
        Neighbours vote{" "}
        <b>
          {nb.idx.filter((i) => train[i].label === 1).length} on time,{" "}
          {nb.idx.filter((i) => train[i].label === 0).length} late
        </b>
        , so the model says <b>{nb.vote === 1 ? "on time" : "late"}</b>. This
        customer really {q.label === 1 ? "paid on time" : "paid late"}.
      </p>

      <div
        className="wm-meters"
        role="group"
        aria-label="Score on the test customers"
      >
        <p className="wm-h">
          Score on {N_TEST} test customers{" "}
          <small>
            {K}-nearest-neighbours, {N_TRAIN} training customers
          </small>
        </p>
        <Meter label="Standardised" value={accScaled} top={scaled} />
        <Meter
          label="Not scaled"
          value={accRaw}
          bad={accRaw < 0.7}
          top={!scaled}
        />
      </div>

      <div className="wm-fig">
        <p className="wm-h">
          A second model, the same stretch{" "}
          <small>
            Linear regression, trained by gradient descent. The loss bowl is the
            map the learner walks downhill on.
          </small>
        </p>
        <svg
          viewBox={`0 0 ${W} ${BH}`}
          className="dx-svg wi-svg wm-svg"
          role="img"
          aria-label={`Left: contour lines of the loss bowl, stretched ${stretchTxt}. Right: the share of the starting loss still left over 200 steps of gradient descent. After 200 steps ${pct(run.remaining[STEPS])} is left.`}
        >
          <defs>
            <clipPath id={`${clip}b`}>
              <rect x={6} y={26} width={120} height={124} />
            </clipPath>
          </defs>
          <text x={6} y={18} className="wm-tb">
            loss contours
          </text>
          <rect x={6} y={26} width={120} height={124} className="wm-frame" />
          <g clipPath={`url(#${clip}b)`}>
            <g
              className="wm-rot"
              style={{
                transform: `rotate(${angleDeg}deg)`,
                transformOrigin: `${CX}px ${CY}px`,
              }}
            >
              {[12, 24, 36].map((s) => (
                <motion.ellipse
                  key={s}
                  cx={CX}
                  cy={CY}
                  initial={false}
                  animate={{ rx: s, ry: r1(Math.min(s * bw.stretch, 1000)) }}
                  transition={{ duration: 0.6, ease: EASE }}
                  fill="none"
                  stroke={scaled ? "#1f9d6b" : "#d6453d"}
                  strokeWidth={1.8}
                />
              ))}
            </g>
          </g>
          <circle cx={CX} cy={CY} r={3} fill="var(--ink)" />
          <text x={6} y={166} className="wm-t">
            stretch {stretchTxt}
          </text>
          <text x={LX0} y={18} className="wm-tb">
            loss left to remove
          </text>
          <rect
            x={LX0}
            y={LY0}
            width={LX1 - LX0}
            height={LY1 - LY0}
            className="wm-frame"
          />
          {[0, -2, -4, -6].map((d) => (
            <g key={d}>
              <line
                x1={LX0}
                x2={LX1}
                y1={ly(10 ** d)}
                y2={ly(10 ** d)}
                className="wm-grid"
              />
              <text
                x={LX0 - 4}
                y={ly(10 ** d) + 4}
                textAnchor="end"
                className="wm-t"
              >
                {d === 0 ? "100%" : d === -2 ? "1%" : d === -4 ? ".01%" : "~0"}
              </text>
            </g>
          ))}
          <path
            d={curvePath(otherRun.remaining)}
            fill="none"
            stroke="var(--ink-2)"
            strokeOpacity={0.55}
            strokeDasharray="4 4"
            strokeWidth={1.6}
          />
          <path
            d={curvePath(run.remaining)}
            fill="none"
            stroke={scaled ? "#1f9d6b" : "#d6453d"}
            strokeWidth={2.6}
          />
          <text x={LX0} y={LY1 + 16} className="wm-t">
            0
          </text>
          <text x={LX1} y={LY1 + 16} textAnchor="end" className="wm-t">
            {STEPS} steps
          </text>
          <text x={LX0} y={166} className="wm-t">
            dashed = the other
          </text>
        </svg>
      </div>

      <p className="wm-foot">
        <b>
          {scaled ? "Standardised" : "Not scaled"}:{" "}
          {run.stepsTo1pct !== null
            ? `1% of the loss is left after ${run.stepsTo1pct} steps`
            : `after 200 steps ${pct(run.remaining[STEPS])} of the loss is still left, and it would take over ${int(MAX_STEPS)} steps to get within 1%`}
          .
        </b>{" "}
        The step size was the biggest safe one for each (one over the sharpest
        curvature); any larger and the steep direction blows up. For comparison,
        standardised needs{" "}
        {runs.scaled.stepsTo1pct === null
          ? "more than 200"
          : runs.scaled.stepsTo1pct}{" "}
        steps and unscaled{" "}
        {runs.raw.stepsTo1pct === null
          ? `over ${int(MAX_STEPS)}`
          : int(runs.raw.stepsTo1pct)}
        .
      </p>
      <p className="wm-foot">
        Example data, made up for this demo: {N_TRAIN} training and {N_TEST}{" "}
        test customers. Ratio is the strong clue (on-time customers average{" "}
        {means.onTime.toFixed(2)}, late ones {means.late.toFixed(2)}); income is
        a weak one. Standardising uses the mean and spread of the training rows
        only. Change only the unit of income with no scaling: dollars{" "}
        {pct(units[0].accuracy)}, thousands of dollars {pct(units[1].accuracy)},
        tens of thousands {pct(units[2].accuracy)}, hundreds of thousands{" "}
        {pct(units[3].accuracy)}. Nothing about the customers changed, only the
        ruler.
      </p>
    </WhatIfFrame>
  );
}
