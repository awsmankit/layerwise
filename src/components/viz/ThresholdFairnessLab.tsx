import { useState } from 'react';
import { Root } from './shared';
import {
  BAND_COUNT,
  GROUPS,
  MAX_K,
  START,
  TOLERANCES,
  evaluate,
  matchThreshold,
  pct,
  type Confusion,
  type GroupData,
  type GroupId,
  type LabState,
  type MatchTarget,
  type Metrics,
} from '../../lib/fairness-lab';

/*
 * "Threshold fairness lab": two invented groups of applicants, each with a score from a made-up
 * lending-style model. The learner moves a threshold per group and watches the confusion tables,
 * the group metrics, which fairness criteria hold, and what it costs in correct decisions.
 * All data are invented (see lib/fairness-lab.ts). Nothing is stored or sent anywhere.
 */

const W = 340;
const H = 150;
const PAD_L = 6;
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 26;
const MAX_BAND = Math.max(...Object.values(GROUPS).flatMap((g) => g.bands.map((b) => b.total)));
const BW = (W - PAD_L - PAD_R) / BAND_COUNT;
const th = (k: number) => (k / BAND_COUNT).toFixed(2);

function Bars({ group, k }: { group: GroupData; k: number }) {
  const plotH = H - PAD_T - PAD_B;
  const x = PAD_L + k * BW;
  const approved = group.bands.filter((b) => b.index >= k).reduce((s, b) => s + b.total, 0);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="rs-fl-svg"
      role="img"
      aria-label={`${group.name}: ${group.total.toLocaleString('en-GB')} applicants in 20 score bands from 0 to 1. Threshold ${th(k)}; ${approved.toLocaleString('en-GB')} applicants are approved.`}
    >
      {k < BAND_COUNT && <rect x={x} y={PAD_T} width={W - PAD_R - x} height={plotH} className="rs-fl-approve" />}
      {group.bands.map((b) => {
        const hp = (b.positives / MAX_BAND) * plotH;
        const hn = ((b.total - b.positives) / MAX_BAND) * plotH;
        const bx = PAD_L + b.index * BW + 1;
        return (
          <g key={b.index}>
            <rect x={bx} y={H - PAD_B - hn} width={BW - 2} height={hn} className="rs-fl-neg" />
            <rect x={bx} y={H - PAD_B - hn - hp} width={BW - 2} height={hp} className="rs-fl-pos" />
          </g>
        );
      })}
      <path d={`M${PAD_L} ${H - PAD_B} H${W - PAD_R}`} className="rs-fl-axis" />
      <path d={`M${x} ${PAD_T} V${H - PAD_B + 4}`} className="rs-fl-cut" />
      <text x={PAD_L} y={H - 8} className="rs-fl-tick">0</text>
      <text x={PAD_L + BW * 10} y={H - 8} textAnchor="middle" className="rs-fl-tick">0.5</text>
      <text x={W - PAD_R} y={H - 8} textAnchor="end" className="rs-fl-tick">1.0</text>
    </svg>
  );
}

function Table({ c }: { c: Confusion }) {
  return (
    <table className="rs-fl-conf">
      <thead>
        <tr>
          <td />
          <th scope="col">Approved</th>
          <th scope="col">Refused</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Would repay</th>
          <td className="rs-fl-good">{c.tp.toLocaleString('en-GB')}<small>true positive</small></td>
          <td className="rs-fl-bad">{c.fn.toLocaleString('en-GB')}<small>false negative</small></td>
        </tr>
        <tr>
          <th scope="row">Would not repay</th>
          <td className="rs-fl-bad">{c.fp.toLocaleString('en-GB')}<small>false positive</small></td>
          <td className="rs-fl-good">{c.tn.toLocaleString('en-GB')}<small>true negative</small></td>
        </tr>
      </tbody>
    </table>
  );
}

const ROWS: { key: keyof Metrics; label: string; hint: string }[] = [
  { key: 'selectionRate', label: 'Approval rate', hint: 'approved / everyone' },
  { key: 'tpr', label: 'True positive rate', hint: 'approved / would repay' },
  { key: 'fpr', label: 'False positive rate', hint: 'approved / would not repay' },
  { key: 'ppv', label: 'Precision', hint: 'would repay / approved' },
  { key: 'accuracy', label: 'Accuracy', hint: 'correct / everyone' },
];

export default function ThresholdFairnessLab() {
  const [s, setS] = useState<LabState>(START);
  const [tol, setTol] = useState<number>(0.02);
  const r = evaluate(s, tol);

  const set = (id: GroupId, k: number) => setS(id === 'A' ? { ...s, kA: k } : { ...s, kB: k });
  const match = (t: MatchTarget) => setS({ kA: START.kA, kB: matchThreshold(START.kA, t) });

  const total = GROUPS.A.total + GROUPS.B.total;
  const holdsNames = r.criteria.filter((c) => c.holds).map((c) => c.name.split(' (')[0]);
  const summary =
    `Group A threshold ${th(s.kA)}, group B threshold ${th(s.kB)}. ${(total - r.wrong).toLocaleString('en-GB')} of ${total.toLocaleString('en-GB')} decisions correct. ` +
    (holdsNames.length ? `Holding within ${Math.round(tol * 100)} points: ${holdsNames.join(', ')}.` : `No criterion holds within ${Math.round(tol * 100)} points.`);

  return (
    <Root>
      <div className="viz rs-fl">
        <p className="viz-title">Threshold fairness lab</p>
        <p className="rs-note">
          Invented data, not real people. A made-up lending-style model gives every applicant a score between 0 and 1, an estimate of the chance they repay. The scores are well calibrated in both groups. Group B has fewer applicants and a lower share who repay. Approve everyone at or above the threshold.
        </p>

        <div className="rs-fl-presets" role="group" aria-label="Presets">
          <button type="button" className="btn quiet" onClick={() => setS(START)}>One threshold, 0.50</button>
          <button type="button" className="btn quiet" onClick={() => match('demographic')}>Match approval rates</button>
          <button type="button" className="btn quiet" onClick={() => match('opportunity')}>Match true positive rates</button>
          <button type="button" className="btn quiet" onClick={() => match('predictive')}>Match precision</button>
        </div>
        <p className="rs-small">Each preset keeps group A at 0.50 and moves group B's threshold to the value that brings that rate closest to A's.</p>

        <div className="rs-fl-groups">
          {(['A', 'B'] as GroupId[]).map((id) => {
            const g = GROUPS[id];
            const k = id === 'A' ? s.kA : s.kB;
            const rep = id === 'A' ? r.a : r.b;
            return (
              <section key={id} className="rs-fl-group" aria-label={g.name}>
                <h4 className="rs-h">{g.name}: {g.total.toLocaleString('en-GB')} applicants, {pct(rep.metrics.baseRate, 0)} would repay</h4>
                <label className="field">
                  <span>
                    Threshold <b>{th(k)}</b>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={MAX_K}
                    step={1}
                    value={k}
                    onChange={(e) => set(id, +e.target.value)}
                    aria-valuetext={`threshold ${th(k)} for ${g.name}`}
                  />
                </label>
                <Bars group={g} k={k} />
                <p className="rs-fl-legend">
                  <span><i className="rs-fl-sw rs-fl-sw-pos" /> would repay</span>
                  <span><i className="rs-fl-sw rs-fl-sw-neg" /> would not repay</span>
                  <span><i className="rs-fl-sw rs-fl-sw-cut" /> threshold (approved to the right)</span>
                </p>
                <Table c={rep.confusion} />
              </section>
            );
          })}
        </div>

        <h4 className="rs-h">Rates by group</h4>
        <div className="rs-fl-scroll" tabIndex={0} role="region" aria-label="Rates by group">
          <table className="rs-fl-rates">
            <thead>
              <tr>
                <th scope="col">Rate</th>
                <th scope="col">A</th>
                <th scope="col">B</th>
                <th scope="col">Gap</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const a = r.a.metrics[row.key] as number | null;
                const b = r.b.metrics[row.key] as number | null;
                return (
                  <tr key={row.key}>
                    <th scope="row">
                      {row.label}
                      <small>{row.hint}</small>
                    </th>
                    <td>{pct(a)}</td>
                    <td>{pct(b)}</td>
                    <td>{a === null || b === null ? 'n/a' : `${(Math.abs(a - b) * 100).toFixed(1)} pts`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rs-fl-tol" role="group" aria-label="How close counts as equal">
          <span>Count two rates as equal if they are within</span>
          {TOLERANCES.map((t) => (
            <button key={t} type="button" className="btn quiet" aria-pressed={tol === t} onClick={() => setTol(t)}>
              {Math.round(t * 100)} {t === 0.01 ? 'point' : 'points'}
            </button>
          ))}
        </div>

        <h4 className="rs-h">Which criteria hold?</h4>
        <ul className="rs-fl-criteria">
          {r.criteria.map((c) => (
            <li key={c.id} className={c.holds ? 'rs-fl-yes' : 'rs-fl-no'}>
              <span className="rs-fl-mark" aria-hidden="true">{c.holds ? '✓' : '✗'}</span>
              <span>
                <b>{c.name}</b>: {c.holds ? 'holds' : 'does not hold'}
                {c.gap !== null && c.id !== 'calibration' ? ` (gap ${(c.gap * 100).toFixed(1)} points)` : ''}
                {c.id === 'calibration' ? ' (built into the data: the score means the same thing in both groups, whatever the threshold)' : ''}
              </span>
            </li>
          ))}
        </ul>

        <div className="rs-result" role="status" aria-live="polite">
          <p className="rs-fl-acc">
            <b>{(r.accuracy * 100).toFixed(1)}%</b> of all {total.toLocaleString('en-GB')} decisions correct
          </p>
          <p className="rs-small">
            {r.extraWrong === 0
              ? 'This is the best any pair of thresholds can do with these scores.'
              : `That is ${r.extraWrong.toLocaleString('en-GB')} more wrong decisions than the best pair of thresholds (${(r.bestAccuracy * 100).toFixed(1)}% correct).`}
          </p>
          <p className="rs-sr">{summary}</p>
        </div>
        <p className="viz-cap">
          Try this: match the approval rates, then read the precision row. Then match the true positive rates and read it again. No setting of the two thresholds makes every criterion hold at once.
        </p>
      </div>
    </Root>
  );
}
