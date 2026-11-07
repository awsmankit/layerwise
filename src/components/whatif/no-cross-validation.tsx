import { useMemo, useState } from "react";
import { motion } from "motion/react";
import WhatIfFrame from "./WhatIfFrame";
import { EASE } from "../viz/shared";
import {
  DEFAULT_ROWS,
  FOLDS,
  FRESH_ROWS,
  K,
  MAX_ROWS,
  MIN_ROWS,
  REPEATS,
  crossValidate,
  holdout,
  makeRows,
  mean,
  sd,
  splitSeed,
  study,
} from "../../lib/whatif/no-cross-validation";

const r1 = (v: number) => Math.round(v * 10) / 10;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const pts = (v: number) => (v * 100).toFixed(1);
const C0 = "#3b6fd8";
const C1 = "#e08a1e";

/* scatter */
const SW = 340;
const SH = 230;
const LIM = 3.2;
const sx = (v: number) => r1(((v + LIM) / (2 * LIM)) * SW);
const sy = (v: number) => r1(SH - ((v + LIM) / (2 * LIM)) * SH);

/* strips */
const AX0 = 22;
const AX1 = 326;
const LO = 0.3;
const HI = 1;
const ax = (v: number) =>
  r1(AX0 + ((Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO)) * (AX1 - AX0));
const ROW1 = 96;
const ROW2 = 252;
const SVG_H = 302;

type Strip = {
  y: number;
  title: string;
  values: number[];
  active: boolean;
  shown: number;
  color: string;
};

function Dots({ s }: { s: Strip }) {
  const m = mean(s.values);
  const d = sd(s.values);
  const bins = new Map<number, number>();
  const placed = s.values.map((v, i) => {
    const key = Math.round(v * 100);
    const level = bins.get(key) ?? 0;
    bins.set(key, level + 1);
    return { v, i, level };
  });
  return (
    <g
      opacity={s.active ? 1 : 0.28}
      style={{ transition: "opacity 0.4s ease" }}
    >
      <text x={AX0} y={s.y - 82} className="wm-tb">
        {s.title}
      </text>
      <line x1={AX0} x2={AX1} y1={s.y} y2={s.y} className="wm-axl" />
      {placed.map(({ v, i, level }) => (
        <circle
          key={i}
          cx={ax(v)}
          cy={r1(s.y - 6 - level * 8.6)}
          r={4.4}
          fill={s.color}
          stroke={i === s.shown ? "var(--ink)" : "none"}
          strokeWidth={2.4}
        />
      ))}
      <line
        x1={ax(m - d)}
        x2={ax(m + d)}
        y1={s.y + 13}
        y2={s.y + 13}
        stroke={s.color}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <line
        x1={ax(m)}
        x2={ax(m)}
        y1={s.y + 8}
        y2={s.y + 18}
        stroke="var(--ink)"
        strokeWidth={2}
      />
      <text x={AX0} y={s.y + 34} className="wm-t">
        {pct(Math.min(...s.values))} to {pct(Math.max(...s.values))}, average{" "}
        {pct(m)} (SD {pts(d)} points)
      </text>
    </g>
  );
}

/**
 * The same 5-nearest-neighbours model on the same rows, scored on 20 different random splits (one held-back fifth each)
 * and on 20 different shuffles of 5-fold cross-validation. Dots are scores; the dashed line is what the model really
 * scores on fresh rows from the same recipe.
 */
export default function NoCrossValidation() {
  const [cv, setCv] = useState(true);
  const [n, setN] = useState(DEFAULT_ROWS);
  const [s, setS] = useState(3);

  const rows = useMemo(() => makeRows(n), [n]);
  const st = useMemo(() => study(rows), [rows]);
  const one = useMemo(() => holdout(rows, splitSeed(s)), [rows, s]);
  const cvRun = useMemo(() => crossValidate(rows, splitSeed(s)), [rows, s]);

  // which rows are ringed, and whether each was right
  const ring = useMemo(() => {
    const m = new Map<number, boolean>();
    if (cv)
      cvRun.folds.forEach((f) =>
        f.test.forEach((idx, j) => m.set(idx, f.correct[j])),
      );
    else one.test.forEach((idx, j) => m.set(idx, one.correct[j]));
    return m;
  }, [cv, cvRun, one]);

  const single = {
    min: Math.min(...st.single),
    max: Math.max(...st.single),
    sd: sd(st.single),
  };
  const cvs = {
    min: Math.min(...st.cvMeans),
    max: Math.max(...st.cvMeans),
    sd: sd(st.cvMeans),
  };
  const shownScore = cv ? cvRun.mean : one.accuracy;

  return (
    <WhatIfFrame
      title="One split, or every row tested once"
      withLabel="5-fold cross-validation"
      withoutLabel="One train/test split"
      on={cv}
      onChange={setCv}
      verdict={
        cv ? (
          <>
            Cross-validation tests every row once. Over {REPEATS} reshuffles its
            average stays between {pct(cvs.min)} and {pct(cvs.max)} (SD{" "}
            {pts(cvs.sd)} points), against {pct(single.min)} to{" "}
            {pct(single.max)} for single splits. The model's real score on fresh
            rows is about {pct(st.truth)}.
          </>
        ) : (
          <>
            This one split says {pct(one.accuracy)} (
            {one.correct.filter(Boolean).length} of {one.test.length} test rows
            right). Another split of the same rows says anything from{" "}
            {pct(single.min)} to {pct(single.max)} (SD {pts(single.sd)} points).
            The real score on fresh rows is about {pct(st.truth)}.
          </>
        )
      }
      controls={
        <div className="wm-controls">
          <label className="field">
            <span>
              Rows in the dataset <b>{n}</b>
            </span>
            <input
              type="range"
              min={MIN_ROWS}
              max={MAX_ROWS}
              step={10}
              value={n}
              onChange={(e) => setN(+e.target.value)}
              aria-label="How many rows the toy dataset has"
            />
          </label>
          <div className="wm-btnrow">
            <button
              type="button"
              className="btn quiet"
              onClick={() => setS((s + 1) % REPEATS)}
            >
              Try another shuffle ({s + 1} of {REPEATS})
            </button>
          </div>
        </div>
      }
    >
      <div className="wm-fig">
        <svg
          viewBox={`0 0 ${SW} ${SH}`}
          className="dx-svg wi-svg wm-svg"
          role="img"
          aria-label={`${n} rows in two overlapping groups. ${cv ? "Every row is tested once across five folds." : `${one.test.length} rows are held back as the test set.`} The score for shuffle ${s + 1} is ${pct(shownScore)}.`}
        >
          <rect
            x={0.5}
            y={0.5}
            width={SW - 1}
            height={SH - 1}
            rx={10}
            className="wm-frame"
          />
          {rows.map((p, i) => {
            const tested = ring.has(i);
            const ok = ring.get(i);
            const stroke = tested ? (ok ? "#1f9d6b" : "#d6453d") : "none";
            const c = sx(p.x);
            const d = sy(p.y);
            return p.label === 1 ? (
              <rect
                key={i}
                x={r1(c - 3.4)}
                y={r1(d - 3.4)}
                width={6.8}
                height={6.8}
                fill={C1}
                opacity={tested ? 1 : 0.4}
                stroke={stroke}
                strokeWidth={2.2}
              />
            ) : (
              <circle
                key={i}
                cx={c}
                cy={d}
                r={3.6}
                fill={C0}
                opacity={tested ? 1 : 0.4}
                stroke={stroke}
                strokeWidth={2.2}
              />
            );
          })}
        </svg>
      </div>
      <ul className="wm-legend" aria-label="Key">
        <li>
          <span className="wm-sw is-round" style={{ background: C0 }} /> group A
        </li>
        <li>
          <span className="wm-sw" style={{ background: C1 }} /> group B
        </li>
        <li>
          <span className="wm-sw is-ring" style={{ color: "#1f9d6b" }} />{" "}
          tested, right
        </li>
        <li>
          <span className="wm-sw is-ring" style={{ color: "#d6453d" }} />{" "}
          tested, wrong
        </li>
        <li>faded = only used for training</li>
      </ul>
      {cv && (
        <ul className="wm-nums" aria-label="Score of each fold">
          {cvRun.folds.map((f, i) => (
            <li key={i}>
              Fold {i + 1}
              <b>{pct(f.accuracy)}</b>
            </li>
          ))}
          <li className="is-lit">
            Average
            <b>{pct(cvRun.mean)}</b>
          </li>
        </ul>
      )}
      <div className="wm-fig">
        <p className="wm-h">
          The same model, {REPEATS} different shuffles{" "}
          <small>
            Each dot is one score. Ringed dot = the shuffle you are looking at.
          </small>
        </p>
        <svg
          viewBox={`0 0 ${SW} ${SVG_H}`}
          className="dx-svg wi-svg wm-svg"
          role="img"
          aria-label={`Scores over ${REPEATS} shuffles. Single splits range from ${pct(single.min)} to ${pct(single.max)}. Cross-validation averages range from ${pct(cvs.min)} to ${pct(cvs.max)}. The real score on fresh rows is about ${pct(st.truth)}.`}
        >
          <Dots
            s={{
              y: ROW1,
              title: "Single 80/20 splits",
              values: st.single,
              active: !cv,
              shown: s,
              color: "#d6453d",
            }}
          />
          <Dots
            s={{
              y: ROW2,
              title: "5-fold averages",
              values: st.cvMeans,
              active: cv,
              shown: s,
              color: "#1f9d6b",
            }}
          />
          <motion.line
            initial={false}
            animate={{ x1: ax(st.truth), x2: ax(st.truth) }}
            transition={{ duration: 0.5, ease: EASE }}
            y1={6}
            y2={ROW2 + 4}
            stroke="var(--ink)"
            strokeWidth={1.6}
            strokeDasharray="5 4"
          />
          <text x={Math.min(ax(st.truth) + 4, 250)} y={14} className="wm-t">
            real: {pct(st.truth)}
          </text>
          {[0.4, 0.6, 0.8, 1].map((v) => (
            <text
              key={v}
              x={ax(v)}
              y={SVG_H - 2}
              textAnchor="middle"
              className="wm-t"
            >
              {pct(v)}
            </text>
          ))}
        </svg>
      </div>
      <p className="wm-foot">
        Toy data, made up for this demo: {n} rows, two overlapping groups, so
        even the best rule cannot reach 100%. The model is {K}
        -nearest-neighbours. A single split holds back one fifth of the rows (
        {Math.round(n * 0.2)} here) to test on, so each score moves in steps of{" "}
        {pct(1 / Math.round(n * 0.2))}. {FOLDS}-fold splits the rows into{" "}
        {FOLDS} parts and tests on each in turn. Both train on 80% of the rows.
        The dashed line is the average score of those {REPEATS} models on{" "}
        {FRESH_ROWS} fresh rows from the same recipe, so it is the answer you
        were trying to estimate. Try the dataset slider: more rows narrow both
        spreads, but single splits stay wider.
      </p>
    </WhatIfFrame>
  );
}
