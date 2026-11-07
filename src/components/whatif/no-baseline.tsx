import { useMemo, useState } from "react";
import { motion } from "motion/react";
import WhatIfFrame from "./WhatIfFrame";
import { EASE } from "../viz/shared";
import {
  FEATURES,
  N_TRAIN,
  TEST_SIZES,
  report,
  trainAll,
  verdict,
  type Verdict,
} from "../../lib/whatif/no-baseline";

const r1 = (v: number) => Math.round(v * 10) / 10;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const pct0 = (v: number) => `${Math.round(v * 100)}%`;
const signed = (v: number) =>
  `${v >= 0 ? "+" : "-"}${Math.abs(v * 100).toFixed(1)}`;

const SHORT: Record<string, string> = {
  majority: "Always the common answer",
  rule: "One-sensor rule",
  line: "Straight line",
  forest: "Fancy forest",
};

/* accuracy rows */
const AX0 = 150;
const AX1 = 330;
const A_LO = 0.75;
const A_HI = 1;
const ax = (v: number) =>
  r1(
    AX0 +
      ((Math.max(A_LO, Math.min(A_HI, v)) - A_LO) / (A_HI - A_LO)) *
        (AX1 - AX0),
  );
const ROW0 = 28;
const ROWH = 40;

/* difference axis */
const DX0 = 30;
const DX1 = 326;
const D_LO = -0.04;
const D_HI = 0.06;
const dx = (v: number) =>
  r1(
    DX0 +
      ((Math.max(D_LO, Math.min(D_HI, v)) - D_LO) / (D_HI - D_LO)) *
        (DX1 - DX0),
  );

const VERDICT: Record<Verdict, { badge: string; cls: string }> = {
  "worth-it": { badge: "Worth it", cls: "is-good" },
  small: { badge: "Better, but maybe not enough", cls: "is-mid" },
  "cannot-tell": { badge: "Cannot tell it from the baseline", cls: "is-bad" },
  worse: { badge: "Worse than the baseline", cls: "is-bad" },
};

/**
 * Toy "machine fault" data where faults are rare. A fancy forest scores about 90%. Alone, that sounds great. Next to
 * "always say no fault" it is a small gain, and a paired bootstrap interval says whether the gain is real.
 */
export default function NoBaseline() {
  const [compare, setCompare] = useState(true);
  const [m, setM] = useState<number>(400);
  const [needed, setNeeded] = useState(2);

  const trained = useMemo(() => trainAll(), []);
  const rep = useMemo(() => report(trained, m), [trained, m]);
  const rows = trained.models
    .map((md, i) => ({ id: md.id, i }))
    .filter((r) => !(r.id === "rule" && trained.ruleInfo.feature < 0));
  const bestName = SHORT[trained.models[rep.best].id].toLowerCase();
  const fancyAcc = rep.acc[rep.fancy];
  const bestAcc = rep.acc[rep.best];
  const v = verdict(rep.diff.lo, rep.diff.hi, needed / 100);
  const H = ROW0 + rows.length * ROWH + 8;
  const DIFF_Y = 52;
  const ruleSame = trained.ruleInfo.feature < 0;

  return (
    <WhatIfFrame
      title="A great score, next to what?"
      withLabel="With baselines"
      withoutLabel="Fancy model alone"
      on={compare}
      onChange={setCompare}
      verdict={
        compare ? (
          <>
            The fancy forest scores {pct1(fancyAcc)}, the strongest simple model
            ({bestName}) scores {pct1(bestAcc)}. The gain is{" "}
            {signed(rep.diff.diff)} points, 95% interval {signed(rep.diff.lo)}{" "}
            to {signed(rep.diff.hi)}. Verdict: {VERDICT[v].badge.toLowerCase()}.
          </>
        ) : (
          <>
            The fancy forest scores {pct1(fancyAcc)} on {m} held-back machines.
            That sounds great, but on its own the number cannot say if{" "}
            {pct0(fancyAcc)} is good here. Switch to the baselines to see.
          </>
        )
      }
      controls={
        <div className="wm-controls">
          <div
            className="wm-picks"
            role="group"
            aria-label="How many rows are held back for testing"
          >
            <span className="wm-picks-label">Rows held back for testing</span>
            {TEST_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={`wm-pick${m === s ? " is-on" : ""}`}
                aria-pressed={m === s}
                onClick={() => setM(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="field">
            <span>
              Gain needed to be worth the extra complexity{" "}
              <b>+{needed.toFixed(1)} points</b>
            </span>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={needed}
              onChange={(e) => setNeeded(+e.target.value)}
              aria-label="How many points of accuracy the fancy model must gain to be worth its cost"
            />
          </label>
        </div>
      }
    >
      <div className="wm-big" aria-live="polite">
        <b>{pct1(fancyAcc)}</b>
        <span>
          accuracy of the fancy model on {m} held-back machines (example data)
        </span>
      </div>
      <div className="wm-fig">
        <svg
          viewBox={`0 0 340 ${H}`}
          className="dx-svg wi-svg wm-svg"
          role="img"
          aria-label={`Accuracy of ${rows.length} models with 95 percent intervals. ${compare ? rows.map((r) => `${SHORT[r.id]} ${pct1(rep.acc[r.i])}`).join(", ") : `Only the fancy forest is shown, ${pct1(fancyAcc)}; the baselines are hidden.`}`}
        >
          {[0.8, 0.85, 0.9, 0.95, 1].map((a) => (
            <g key={a}>
              <line
                x1={ax(a)}
                x2={ax(a)}
                y1={ROW0 - 12}
                y2={H - 14}
                className="wm-grid"
              />
              <text x={ax(a)} y={H - 2} textAnchor="middle" className="wm-t">
                {pct0(a)}
              </text>
            </g>
          ))}
          {rows.map((r, k) => {
            const y = ROW0 + k * ROWH;
            const fancy = r.id === "forest";
            const visible = compare || fancy;
            const [lo, hi] = rep.ci[r.i];
            const isBest = r.i === rep.best;
            return (
              <motion.g
                key={r.id}
                initial={false}
                animate={{ opacity: visible ? 1 : 0.0 }}
                transition={{ duration: 0.5, ease: EASE }}
                aria-hidden={!visible}
              >
                <text
                  x={4}
                  y={y + 4}
                  className={isBest && compare ? "wm-tb" : "wm-t"}
                  style={
                    fancy ? { fill: "var(--ink)", fontWeight: 650 } : undefined
                  }
                >
                  {SHORT[r.id]}
                </text>
                <text x={4} y={y + 19} className="wm-t">
                  {pct1(rep.acc[r.i])}
                  {isBest && compare ? " (strongest simple)" : ""}
                </text>
                <line
                  x1={ax(lo)}
                  x2={ax(hi)}
                  y1={y}
                  y2={y}
                  stroke={fancy ? "#d6453d" : "#3d6fd6"}
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.55}
                />
                {fancy ? (
                  <rect
                    x={r1(ax(rep.acc[r.i]) - 6)}
                    y={r1(y - 6)}
                    width={12}
                    height={12}
                    fill="#d6453d"
                    stroke="var(--surface)"
                    strokeWidth={1.5}
                  />
                ) : (
                  <circle
                    cx={ax(rep.acc[r.i])}
                    cy={y}
                    r={6}
                    fill="#3d6fd6"
                    stroke="var(--surface)"
                    strokeWidth={1.5}
                  />
                )}
              </motion.g>
            );
          })}
          {!compare && (
            <text x={4} y={ROW0 + ROWH + 4} className="wm-t">
              Baselines: never checked.
            </text>
          )}
        </svg>
      </div>
      <p className="wm-foot" style={{ marginTop: 0 }}>
        Dots are accuracies; bars are 95% intervals for each (Wilson).{" "}
        {ruleSame
          ? 'The best one-sensor threshold rule could not beat "always the common answer" on the training rows, so it would give the same answers and is not drawn.'
          : ""}
      </p>

      {compare && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="wm-fig"
        >
          <p className="wm-h">
            Gain over the strongest simple model{" "}
            <small>
              Fancy forest minus {bestName}, in accuracy points, with a 95%
              interval from resampling the test rows.
            </small>
          </p>
          <svg
            viewBox={`0 0 340 ${DIFF_Y + 46}`}
            className="dx-svg wi-svg wm-svg"
            role="img"
            aria-label={`The gain of the fancy model over the best simple model is ${signed(rep.diff.diff)} points, with a 95 percent interval from ${signed(rep.diff.lo)} to ${signed(rep.diff.hi)}. You asked for at least ${needed.toFixed(1)} points.`}
          >
            <rect
              x={dx(needed / 100)}
              y={10}
              width={r1(DX1 - dx(needed / 100))}
              height={DIFF_Y - 14}
              fill="#1f9d6b"
              opacity={0.14}
            />
            <line
              x1={dx(0)}
              x2={dx(0)}
              y1={6}
              y2={DIFF_Y}
              stroke="var(--ink)"
              strokeWidth={1.6}
            />
            <line
              x1={dx(needed / 100)}
              x2={dx(needed / 100)}
              y1={6}
              y2={DIFF_Y}
              stroke="#1f9d6b"
              strokeWidth={1.6}
              strokeDasharray="5 4"
            />
            <line
              x1={DX0}
              x2={DX1}
              y1={DIFF_Y}
              y2={DIFF_Y}
              className="wm-axl"
            />
            {[-0.04, -0.02, 0, 0.02, 0.04, 0.06].map((d) => (
              <text
                key={d}
                x={dx(d)}
                y={DIFF_Y + 16}
                textAnchor="middle"
                className="wm-t"
              >
                {d > 0 ? "+" : ""}
                {d * 100}
              </text>
            ))}
            <line
              x1={dx(rep.diff.lo)}
              x2={dx(rep.diff.hi)}
              y1={30}
              y2={30}
              stroke="#d6453d"
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.6}
            />
            <rect
              x={r1(dx(rep.diff.diff) - 6)}
              y={24}
              width={12}
              height={12}
              fill="#d6453d"
              stroke="var(--surface)"
              strokeWidth={1.5}
            />
            <text x={DX0} y={DIFF_Y + 36} className="wm-t">
              points gained (0 = none, green = your target)
            </text>
          </svg>
          <p className="wm-verdict-box" aria-live="polite">
            <span className={`wm-badge ${VERDICT[v].cls}`}>
              {VERDICT[v].badge}
            </span>{" "}
            {v === "worth-it" && (
              <>
                Even the low end of the interval ({signed(rep.diff.lo)} points)
                is above the {needed.toFixed(1)} you asked for.
              </>
            )}
            {v === "small" && (
              <>
                The gain is probably real (the interval stays above 0), but its
                low end ({signed(rep.diff.lo)}) is under the {needed.toFixed(1)}{" "}
                points you asked for.
              </>
            )}
            {v === "cannot-tell" && (
              <>
                The interval {signed(rep.diff.lo)} to {signed(rep.diff.hi)}{" "}
                includes 0, so with {m} test rows this could be luck. More test
                rows would narrow it.
              </>
            )}
            {v === "worse" && (
              <>
                The whole interval is below 0: the extra complexity made it
                worse.
              </>
            )}
          </p>
        </motion.div>
      )}

      <p className="wm-foot">
        Toy data, made up for this demo: {N_TRAIN} training machines with{" "}
        {FEATURES} sensor numbers each. About {Math.round(rep.faultShare * 100)}
        % of the {m} test machines are faulty.
        {compare
          ? ` So "always say no fault" is right ${pct1(rep.acc[0])} of the time without learning anything.`
          : ""}{" "}
        The models are trained once on the same {N_TRAIN} rows. "Strongest
        simple" is chosen by training accuracy, not by peeking at the test rows.
        The interval comes from 1,000 resamples of the test rows, comparing both
        models on the same rows each time. Accuracy is the only metric here; on
        rare events a team would also check how many real faults each model
        finds.
      </p>
    </WhatIfFrame>
  );
}
