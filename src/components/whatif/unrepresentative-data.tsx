import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { BOUNDARY, USER_SHARE_B, atShare, bestShareForUsers, curve, mixDots } from '../../lib/whatif/unrepresentative-data';

const W = 340;
const RED = '#d6453d';
const q = (v: number) => Math.round(v * 10) / 10;
const pct = (v: number) => `${Math.round(v * 100)}%`;

// training mix dots
const DOT_COLS = 50;
const DOT = W / DOT_COLS;

// number line
const NL_Y = 118;
const nx = (v: number) => q(24 + ((Math.min(2.4, Math.max(-0.8, v)) + 0.8) / 3.2) * (W - 48));

// chart
const CL = 38;
const CR = W - 22;
const CT = 192;
const CB = 330;
const cx = (f: number) => q(CL + (f / 100) * (CR - CL));
const cy = (a: number) => q(CB - ((Math.min(1, Math.max(0.5, a)) - 0.5) / 0.5) * (CB - CT));

/**
 * A TOY model with one number per person and one cut-off, trained on a mix of two made-up groups.
 * In group A the true answer flips at 0, in group B at 1. Slide the share of group B in the training data.
 */
export default function UnrepresentativeDataWhatIf() {
  const [f, setF] = useState(30);
  const all = useMemo(() => curve(), []);
  const p = useMemo(() => atShare(f), [f]);
  const dots = useMemo(() => mixDots(f), [f]);
  const best = useMemo(() => bestShareForUsers(), []);
  const bUsers = Math.round(USER_SHARE_B * 100);
  const on = f >= 15;

  const lineA = all.map((d) => `${cx(d.f)},${cy(d.accA)}`).join(' ');
  const lineB = all.map((d) => `${cx(d.f)},${cy(d.accB)}`).join(' ');
  const gapPts = Math.round(Math.abs(p.gap) * 100);
  const behind = p.accA >= p.accB ? 'B' : 'A';

  const verdict = (
    <>
      With {f}% of the training data from group B, the toy model is {pct(p.accA)} right for group A and {pct(p.accB)} for group B
      {gapPts >= 1 ? <>: group {behind} is {gapPts} points behind.</> : <>: about equal.</>}
      {f === 0 ? ' It has never seen group B, so its cut-off fits group A only.' : ''}
    </>
  );

  return (
    <WhatIfFrame
      title="One cut-off for two groups (toy model, made-up data)"
      withLabel="Group B in the training data"
      withoutLabel="Group A only"
      on={on}
      onChange={(v) => setF(v ? bUsers : 0)}
      verdict={verdict}
      controls={
        <label className="field">
          <span>
            Share of training data from group B <b>{f}%</b>
          </span>
          <input type="range" min={0} max={100} step={5} value={f} onChange={(e) => setF(+e.target.value)} aria-label="Share of the training examples that come from group B, in percent" />
        </label>
      }
    >
      <svg viewBox={`0 0 ${W} 348`} className="dx-svg wi-svg wx-svg" role="img" aria-label={`Training data is ${100 - f} percent group A and ${f} percent group B. The model's cut-off is ${p.cutoff}. Group A is ${pct(p.accA)} right and group B is ${pct(p.accB)} right.`}>
        <text x={0} y={14} className="wx-t-b">Training data: 100 examples</text>
        <text x={W} y={14} textAnchor="end" className="wx-t">{100 - f} from A, {f} from B</text>
        {dots.map((isB, i) => {
          const x = q((i % DOT_COLS) * DOT + DOT / 2);
          const y = q(26 + Math.floor(i / DOT_COLS) * DOT + DOT / 2);
          return isB ? (
            <rect key={i} x={q(x - 2.6)} y={q(y - 2.6)} width={5.2} height={5.2} className="wx-dot" fill="var(--ink)" />
          ) : (
            <circle key={i} cx={x} cy={y} r={2.5} className="wx-dot" fill="var(--ink)" opacity={0.28} />
          );
        })}

        <text x={0} y={72} className="wx-t-b">Where the right answer flips</text>
        <text x={0} y={88} className="wx-t">Above the model's cut-off it says yes</text>
        <line x1={20} x2={W - 20} y1={NL_Y} y2={NL_Y} className="wx-axis" />
        <g>
          <line x1={nx(BOUNDARY.A)} x2={nx(BOUNDARY.A)} y1={NL_Y - 12} y2={NL_Y + 12} stroke="var(--ink)" strokeWidth={2} />
          <text x={nx(BOUNDARY.A)} y={NL_Y - 16} textAnchor="middle" className="wx-t-b">A flips here</text>
          <line x1={nx(BOUNDARY.B)} x2={nx(BOUNDARY.B)} y1={NL_Y - 12} y2={NL_Y + 12} stroke="var(--ink)" strokeWidth={2} strokeDasharray="3 2" />
          <text x={nx(BOUNDARY.B)} y={NL_Y - 16} textAnchor="start" dx={4} className="wx-t-b">B flips here</text>
        </g>
        <motion.g initial={false} animate={{ x: nx(p.cutoff) }} transition={{ duration: 0.45, ease: EASE }}>
          <polygon points="0,6 -8,20 8,20" fill={RED} stroke="var(--ink)" strokeWidth={1} transform={`translate(0 ${NL_Y})`} />
        </motion.g>
        <motion.text y={NL_Y + 38} textAnchor="middle" className="wx-t-b" initial={false} animate={{ x: Math.min(W - 48, Math.max(48, nx(p.cutoff))) }} transition={{ duration: 0.45, ease: EASE }}>
          {`model's cut-off ${p.cutoff.toFixed(2)}`}
        </motion.text>

        <text x={0} y={CT - 12} className="wx-t-b">Accuracy by share of group B in training</text>
        {[0.5, 0.75, 1].map((a) => (
          <g key={a}>
            <line x1={CL} x2={CR} y1={cy(a)} y2={cy(a)} className="wx-grid" />
            <text x={CL - 4} y={q(cy(a) + 4)} textAnchor="end" className="wx-t">{Math.round(a * 100)}%</text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((t) => (
          <text key={t} x={cx(t)} y={CB + 16} textAnchor="middle" className="wx-t">{t}%</text>
        ))}
        <text x={CR} y={CB + 31} textAnchor="end" className="wx-t">share of training data from group B</text>
        <line x1={cx(bUsers)} x2={cx(bUsers)} y1={CT} y2={CB} stroke="var(--ink-2)" strokeWidth={1.2} strokeDasharray="3 3" />
        <text x={q(cx(bUsers) + 3)} y={CT + 11} className="wx-t">users: {bUsers}% B</text>
        <polyline points={lineA} fill="none" stroke="var(--ink)" strokeWidth={2.4} />
        <polyline points={lineB} fill="none" stroke="var(--ink)" strokeWidth={2.4} strokeDasharray="6 4" />
        <text x={q(CL + 4)} y={q(cy(all[0].accA) - 6)} className="wx-t-b">A</text>
        <text x={q(CR - 10)} y={q(cy(all[all.length - 1].accB) - 6)} className="wx-t-b">B</text>
        <motion.line y1={CT} y2={CB} initial={false} animate={{ x1: cx(f), x2: cx(f) }} transition={{ duration: 0.4, ease: EASE }} stroke={RED} strokeWidth={2} />
        <motion.circle r={6} initial={false} animate={{ cx: cx(f), cy: cy(p.accA) }} transition={{ duration: 0.4, ease: EASE }} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2.4} />
        <motion.rect width={11} height={11} initial={false} animate={{ x: q(cx(f) - 5.5), y: q(cy(p.accB) - 5.5) }} transition={{ duration: 0.4, ease: EASE }} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2.4} />
      </svg>
      <ul className="wx-legend" aria-label="Key">
        <li><span className="wx-sw is-round" style={{ background: 'var(--ink)', opacity: 0.3 }} /> group A example (solid line, circle)</li>
        <li><span className="wx-sw" style={{ background: 'var(--ink)' }} /> group B example (dashed line, square)</li>
      </ul>

      <div className="wx-bars">
        <h4>Accuracy of the trained model</h4>
        <Bar label="Group A" value={p.accA} />
        <Bar label="Group B" value={p.accB} bad={p.accB < p.accA - 0.05} />
        <Bar label={`Example users (${100 - bUsers}% A, ${bUsers}% B)`} value={p.users} mid />
      </div>
      <p className="wx-example">
        <b>Toy model, made-up data:</b> one signal per person and one learned cut-off. The groups, the flip points and the user mix ({bUsers}% group B) are example settings. For these users the best training share of B is {best}%, but at {bUsers}% group B is still {Math.round((atShare(bUsers).accA - atShare(bUsers).accB) * 100)} points behind group A. Only a heavier share of B closes that gap, and then group A pays for it.
      </p>
    </WhatIfFrame>
  );
}

function Bar({ label, value, bad, mid }: { label: string; value: number; bad?: boolean; mid?: boolean }) {
  return (
    <div className="wx-bar">
      <span>{label}</span>
      <div className="wx-track">
        <motion.div className={`wx-fill${bad ? ' is-bad' : mid ? ' is-ink' : ''}`} initial={false} animate={{ width: `${value * 100}%` }} transition={{ duration: 0.45, ease: EASE }} />
      </div>
      <b>{pct(value)}</b>
    </div>
  );
}
