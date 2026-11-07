import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { RULE, TOTAL, errorDots, evaluate, largestSharePassing, passesEveryGroup, passesOverall, type GroupResult } from '../../lib/whatif/no-group-check';

const W = 340;
const COLS = 40;
const CELL = W / COLS;
const TITLE_H = 20;
const GREEN = '#1f9d6b';
const RED = '#d6453d';

const q = (v: number) => Math.round(v * 10) / 10;
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const rowsFor = (n: number) => Math.ceil(n / COLS);

function Block({ y, title, right, n, errors, shape, showErrors }: { y: number; title: string; right: string; n: number; errors: number; shape: 'circle' | 'square'; showErrors: boolean }) {
  const flags = useMemo(() => errorDots(n, errors), [n, errors]);
  return (
    <g transform={`translate(0 ${y})`}>
      <text x={0} y={13} className="wx-t-b">{title}</text>
      <text x={W} y={13} textAnchor="end" className="wx-t">{right}</text>
      <g transform={`translate(0 ${TITLE_H})`}>
        {flags.map((bad, i) => {
          const cx = q((i % COLS) * CELL + CELL / 2);
          const cy = q(Math.floor(i / COLS) * CELL + CELL / 2);
          const isBad = showErrors && bad;
          const fill = isBad ? RED : 'var(--ink)';
          const op = isBad ? 1 : 0.24;
          return shape === 'circle' ? (
            <circle key={i} cx={cx} cy={cy} r={isBad ? 3.2 : 2.5} className="wx-dot" style={{ fill, opacity: op }} stroke={isBad ? 'var(--ink)' : 'none'} strokeWidth={0.7} />
          ) : (
            <rect key={i} x={q(cx - (isBad ? 3.4 : 2.7))} y={q(cy - (isBad ? 3.4 : 2.7))} width={isBad ? 6.8 : 5.4} height={isBad ? 6.8 : 5.4} className="wx-dot" style={{ fill, opacity: op }} stroke={isBad ? 'var(--ink)' : 'none'} strokeWidth={0.7} />
          );
        })}
      </g>
    </g>
  );
}

const PX0 = 92;
const PX1 = 296;
const xOf = (v: number) => q(PX0 + v * (PX1 - PX0));

function Row({ y, label, value, ci, bad, hint }: { y: number; label: string; value: number; ci?: [number, number]; bad?: boolean; hint?: string }) {
  const w = q(value * (PX1 - PX0));
  return (
    <g transform={`translate(0 ${y})`}>
      <text x={0} y={16} className="wx-t-b">{label}</text>
      {hint && <text x={0} y={30} className="wx-t">{hint}</text>}
      <rect x={PX0} y={4} width={PX1 - PX0} height={16} rx={8} fill="var(--ink)" opacity={0.09} />
      <motion.rect x={PX0} y={4} height={16} rx={8} initial={false} animate={{ width: w }} transition={{ duration: 0.45, ease: EASE }} fill={bad ? RED : GREEN} />
      {ci && (
        <motion.g initial={false} animate={{ opacity: 1 }}>
          <motion.line y1={12} y2={12} initial={false} animate={{ x1: xOf(ci[0]), x2: xOf(ci[1]) }} transition={{ duration: 0.45, ease: EASE }} stroke="var(--ink)" strokeWidth={2} />
          <motion.line y1={6} y2={18} initial={false} animate={{ x1: xOf(ci[0]), x2: xOf(ci[0]) }} transition={{ duration: 0.45, ease: EASE }} stroke="var(--ink)" strokeWidth={2} />
          <motion.line y1={6} y2={18} initial={false} animate={{ x1: xOf(ci[1]), x2: xOf(ci[1]) }} transition={{ duration: 0.45, ease: EASE }} stroke="var(--ink)" strokeWidth={2} />
        </motion.g>
      )}
      <text x={W} y={16} textAnchor="end" className={bad ? 'wx-t-bad' : 'wx-t-b'}>{pct(value, value < 0.995 && value > 0.005 ? 1 : 0)}</text>
    </g>
  );
}

/**
 * A TOY test of 1,000 made-up people in two groups. One overall accuracy, or the same test split by group with a 95 percent interval.
 * The per-group accuracy and miss rates are example settings, not measurements.
 */
export default function NoGroupCheckWhatIf() {
  const [check, setCheck] = useState(true);
  const [share, setShare] = useState(10);

  const s = useMemo(() => evaluate(share), [share]);
  const maxPass = useMemo(() => largestSharePassing(), []);
  const okOverall = passesOverall(s);
  const okGroups = passesEveryGroup(s);
  const { A, B } = s;

  const rowsA = rowsFor(A.n);
  const rowsB = rowsFor(B.n);
  const blockA = TITLE_H + rowsA * CELL;
  const blockB = TITLE_H + rowsB * CELL;
  const H = check ? blockA + 10 + blockB + 4 : TITLE_H + rowsFor(TOTAL) * CELL + 4;

  const ci = (r: GroupResult) => `${pct(r.accuracyCI[0])} to ${pct(r.accuracyCI[1])}`;

  const verdict = check ? (
    <>
      Overall {pct(s.overall, 1)} {okOverall ? `passes the ${pct(RULE)} rule` : `misses the ${pct(RULE)} rule`}, but group B ({B.n} people) gets {pct(B.accuracy)} (95% interval {ci(B)}) and misses {pct(B.missShare)} of its true cases, against {pct(A.missShare)} for group A.
    </>
  ) : (
    <>
      One number: {pct(s.overall, 1)} right overall, so the {pct(RULE)} rule {okOverall ? 'passes' : 'fails'}. Nothing here says who the {TOTAL - Math.round(s.overall * TOTAL)} mistakes land on.
    </>
  );

  return (
    <WhatIfFrame
      title={`1,000 made-up people, ${B.n} of them in group B`}
      withLabel="Check each group"
      withoutLabel="Overall number only"
      on={check}
      onChange={setCheck}
      verdict={verdict}
      controls={
        <label className="field">
          <span>
            Group B share of the people <b>{share}%</b>
          </span>
          <input type="range" min={2} max={50} step={1} value={share} onChange={(e) => setShare(+e.target.value)} aria-label="Share of the 1,000 test people who are in the smaller group B, in percent" />
        </label>
      }
    >
      <svg viewBox={`0 0 ${W} ${q(H)}`} className="dx-svg wi-svg wx-svg" role="img" aria-label={check ? `Two grids of dots, one dot per person. Group A has ${A.n} people and ${A.errors} wrong answers. Group B has ${B.n} people and ${B.errors} wrong answers shown in red.` : `One grid of ${TOTAL} dots, one per person. Wrong answers are not shown. Overall accuracy is ${pct(s.overall, 1)}.`}>
        {check ? (
          <>
            <Block y={0} title={`Group A: ${A.n} people`} right={`${A.errors} wrong`} n={A.n} errors={A.errors} shape="circle" showErrors />
            <Block y={q(blockA + 10)} title={`Group B: ${B.n} people`} right={`${B.errors} wrong`} n={B.n} errors={B.errors} shape="square" showErrors />
          </>
        ) : (
          <Block y={0} title="All 1,000 people" right="errors hidden in the average" n={TOTAL} errors={TOTAL - Math.round(s.overall * TOTAL)} shape="circle" showErrors={false} />
        )}
      </svg>
      <ul className="wx-legend" aria-label="Key">
        <li><span className="wx-sw is-round" style={{ background: 'var(--ink)', opacity: 0.3 }} /> group A, right</li>
        <li><span className="wx-sw" style={{ background: 'var(--ink)', opacity: 0.3 }} /> group B, right</li>
        <li><span className="wx-sw" style={{ background: RED, border: '1px solid var(--ink)' }} /> wrong answer (shown only when we check by group)</li>
      </ul>

      <svg viewBox={`0 0 ${W} ${check ? 214 : 44}`} className="dx-svg wi-svg wx-svg" role="img" aria-label={`Accuracy bars. Overall ${pct(s.overall, 1)}.${check ? ` Group A ${pct(A.accuracy, 1)}. Group B ${pct(B.accuracy, 1)}, interval ${ci(B)}.` : ''}`} style={{ marginTop: '0.8rem' }}>
        <Row y={0} label="Overall" value={s.overall} ci={check ? s.overallCI : undefined} />
        {check && (
          <>
            <Row y={36} label="Group A" value={A.accuracy} ci={A.accuracyCI} />
            <Row y={72} label="Group B" value={B.accuracy} ci={B.accuracyCI} bad={B.accuracy < RULE} />
            <text x={0} y={118} className="wx-t-b">True cases the model missed (lower is better)</text>
            <Row y={124} label="Group A" value={A.missShare} ci={A.missCI} bad={A.missShare > 0.2} />
            <Row y={160} label="Group B" value={B.missShare} ci={B.missCI} bad={B.missShare > 0.2} />
            <text x={0} y={206} className="wx-t">Whiskers: 95% interval. Wider means less sure.</text>
          </>
        )}
        <line x1={xOf(RULE)} x2={xOf(RULE)} y1={0} y2={check ? 98 : 24} stroke="var(--ink)" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.7} />
      </svg>
      <p className="wx-note" style={{ marginTop: 0 }}>Dashed line: the example release rule, {pct(RULE)}.</p>

      <ul className="wx-checks">
        <li className={okOverall ? 'is-pass' : 'is-fail'}>
          <b>{okOverall ? 'Pass' : 'Fail'}: overall at least {pct(RULE)}</b>
          {pct(s.overall, 1)} overall
        </li>
        {check && (
          <li className={okGroups ? 'is-pass' : 'is-fail'}>
            <b>{okGroups ? 'Pass' : 'Fail'}: every group at least {pct(RULE)}</b>
            A {pct(A.accuracy)}, B {pct(B.accuracy)}
          </li>
        )}
      </ul>
      {!check && <p className="wx-note">The group split is hidden. Switch to "Check each group" to see who gets the mistakes.</p>}
      <p className="wx-example">
        <b>Made-up toy, not a real system:</b> the model is right {pct(A.accuracy)} of the time for group A and {pct(B.accuracy)} for group B, set by hand for this demo. With these settings the overall {pct(RULE)} rule still passes as long as group B is {maxPass}% of the people or less, while group B itself stays at {pct(B.accuracy)}.
      </p>
    </WhatIfFrame>
  );
}
