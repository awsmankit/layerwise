import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { CASES_PER_GROUP, FLOOR, RELEASES, blocked, cases, flips, groupPass, groups, overallRate, pct, totalPass, wilson } from '../../lib/whatif/no-evals';

const RED = '#d6453d';
const X0 = 44;
const STEP = 54;
const Y0 = 24;
const H = 150;
const xOf = (r: number) => X0 + STEP * (r - 1);
const yOf = (v: number) => Y0 + H - H * v;
const rel = Array.from({ length: RELEASES }, (_, i) => i + 1);
const important = groups.find((g) => g.important)!;

/**
 * Six releases of a made-up support assistant, scored on a 40-case test set. The line shows the average with its
 * 95% interval. The red line is the one important group. Without a test set only the average is visible.
 */
export default function NoEvalsWhatIf() {
  const [evals, setEvals] = useState(true);
  const [r, setR] = useState(5);

  const series = useMemo(
    () =>
      rel.map((n) => ({
        n,
        rate: overallRate(n),
        ...wilson(totalPass(n), cases.length),
        key: groupPass(important.id, n) / CASES_PER_GROUP,
        blocked: blocked(n),
      })),
    [],
  );
  const band =
    series.map((s) => `${xOf(s.n)},${yOf(s.hi)}`).join(' ') + ' ' + [...series].reverse().map((s) => `${xOf(s.n)},${yOf(s.lo)}`).join(' ');
  const f = flips(r);
  const prev = totalPass(r - 1);
  const now = totalPass(r);
  const keyPrev = groupPass(important.id, r - 1);
  const keyNow = groupPass(important.id, r);
  const iv = wilson(now, cases.length);

  const verdict = evals ? (
    blocked(r) ? (
      keyNow < keyPrev ? (
        <>Release {r}: the average rose from {pct(prev / 40)} to {pct(now / 40)}, but the test set shows {important.label.toLowerCase()} fell from {keyPrev} of {CASES_PER_GROUP} to {keyNow} of {CASES_PER_GROUP}. The release is blocked before any customer sees it.</>
      ) : (
        <>Release {r}: {important.label.toLowerCase()} are still at {keyNow} of {CASES_PER_GROUP}, below the floor of {FLOOR}. The test set keeps the release blocked until it is fixed.</>
      )
    ) : (
      <>Release {r}: {now} of 40 cases pass (last release {prev}). No important group fell below {FLOOR} of {CASES_PER_GROUP}, so it can ship.</>
    )
  ) : keyNow < keyPrev ? (
    <>Release {r}: the average looks fine, {pct(now / 40)} (up from {pct(prev / 40)}). Nothing tells you that {important.label.toLowerCase()} fell from {keyPrev} of {CASES_PER_GROUP} to {keyNow} of {CASES_PER_GROUP}. You find out when customers complain.</>
  ) : (
    <>Release {r}: the average is {pct(now / 40)} (last release {pct(prev / 40)}). With no test set you cannot tell if something important got worse underneath.</>
  );

  return (
    <WhatIfFrame
      title="Six releases of a made-up support assistant"
      withLabel="With a test set"
      withoutLabel="No evals"
      on={evals}
      onChange={setEvals}
      verdict={verdict}
      controls={
        <label className="field">
          <span>
            Compare release <b>R{r}</b> with R{r - 1}
          </span>
          <input type="range" min={2} max={RELEASES} value={r} onChange={(e) => setR(+e.target.value)} aria-label="Which release to compare with the one before" />
        </label>
      }
    >
      <p className="wa-tag">Made-up example: 40 test cases in 5 groups of 8, scored again after each of 6 changes. Not a measurement of any real product.</p>
      <svg
        viewBox="0 0 340 214"
        className="dx-svg wi-svg wa-svg"
        role="img"
        aria-label={`Line chart of quality over six releases. The overall average rises from ${pct(overallRate(1))} to ${pct(overallRate(RELEASES))}. The refund rules group falls from ${groupPass('refund', 4)} of 8 to ${groupPass('refund', 5)} of 8 at release 5.${evals ? ' The test set shows the fall and blocks the release.' : ' Without a test set the fall is not visible.'}`}
      >
        {/* grid */}
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={X0} x2={xOf(RELEASES)} y1={yOf(v)} y2={yOf(v)} stroke="var(--line-soft)" strokeWidth={1} />
            <text x={X0 - 6} y={yOf(v) + 4} textAnchor="end" className="wa-t2">{Math.round(v * 100)}%</text>
          </g>
        ))}
        {/* selected release */}
        <motion.rect y={Y0 - 6} height={H + 12} width={40} rx={8} fill="var(--ink)" fillOpacity={0.09} initial={false} animate={{ x: xOf(r) - 20 }} transition={{ duration: 0.4, ease: EASE }} />
        {/* average with interval */}
        <polygon points={band} fill="var(--ink)" fillOpacity={0.1} />
        <polyline points={series.map((s) => `${xOf(s.n)},${yOf(s.rate)}`).join(' ')} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
        {series.map((s) => (
          <circle key={s.n} cx={xOf(s.n)} cy={yOf(s.rate)} r={4.5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
        ))}
        {/* the important group */}
        <motion.g initial={false} animate={{ opacity: evals ? 1 : 0.5 }} transition={{ duration: 0.4, ease: EASE }}>
          <polyline points={series.map((s) => `${xOf(s.n)},${yOf(s.key)}`).join(' ')} fill="none" stroke={RED} strokeWidth={2.5} strokeDasharray={evals ? undefined : '6 5'} strokeLinejoin="round" />
          {series.map((s) => (
            <rect key={s.n} x={xOf(s.n) - 4.5} y={yOf(s.key) - 4.5} width={9} height={9} fill={RED} />
          ))}
        </motion.g>
        {evals &&
          series
            .filter((s) => s.blocked)
            .map((s, i) => (
              <text key={s.n} x={xOf(s.n) + (i === 0 ? -6 : 0)} y={yOf(s.key) - 11} textAnchor="middle" className="wa-tb" fill={RED}>
                {i === 0 ? '✗ blocked' : '✗'}
              </text>
            ))}
        {!evals && (
          <text x={xOf(5) - 20} y={yOf(0.15)} textAnchor="middle" className="wa-t" fill={RED}>
            real drop, not measured
          </text>
        )}
        {rel.map((n) => (
          <text key={n} x={xOf(n)} y={Y0 + H + 24} textAnchor="middle" className={n === r ? 'wa-tb' : 'wa-t2'}>R{n}</text>
        ))}
      </svg>
      <ul className="wa-legend" aria-label="Chart key">
        <li>
          <svg width="26" height="12" aria-hidden="true"><line x1="0" x2="26" y1="6" y2="6" stroke="var(--ink)" strokeWidth="2.5" /><circle cx="13" cy="6" r="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" /></svg>
          Average of all 40 cases, shaded = 95% interval
        </li>
        <li>
          <svg width="26" height="12" aria-hidden="true"><line x1="0" x2="26" y1="6" y2="6" stroke={RED} strokeWidth="2.5" strokeDasharray={evals ? undefined : '6 5'} /><rect x="9" y="2" width="8" height="8" fill={RED} /></svg>
          {important.label} ({CASES_PER_GROUP} cases){evals ? '' : ', invisible without a test set'}
        </li>
      </ul>
      {evals ? (
        <>
          <table className="wa-table">
            <caption>
              R{r - 1} compared with R{r}, cases passing
            </caption>
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">R{r - 1}</th>
                <th scope="col">R{r}</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const a = groupPass(g.id, r - 1);
                const b = groupPass(g.id, r);
                const d = b - a;
                return (
                  <tr key={g.id} className={g.important ? 'is-key' : ''}>
                    <th scope="row">{g.label}{g.important ? ' (important)' : ''}</th>
                    <td>{a}/{CASES_PER_GROUP}</td>
                    <td>{b}/{CASES_PER_GROUP}</td>
                    <td className={d < 0 ? 'wa-bad' : d > 0 ? 'wa-good' : ''}>{d < 0 ? `▼ ${-d}` : d > 0 ? `▲ ${d}` : 'same'}</td>
                  </tr>
                );
              })}
              <tr className="is-total">
                <th scope="row">All 40 cases</th>
                <td>{prev}/40</td>
                <td>{now}/40</td>
                <td>{now - prev > 0 ? `▲ ${now - prev}` : now - prev < 0 ? `▼ ${prev - now}` : 'same'}</td>
              </tr>
            </tbody>
          </table>
          <p className="wa-note">
            <b>Newly failing:</b> {f.broke.length ? f.broke.map((c) => c.label).join(', ') : 'none'}. <b>Newly passing:</b> {f.fixed.length ? f.fixed.map((c) => c.label).join(', ') : 'none'}.
          </p>
        </>
      ) : (
        <p className="wa-note">
          What you can see: the average, {pct(now / 40)}, with a 95% interval of about {pct(iv.lo)} to {pct(iv.hi)} on 40 cases. The interval is wide enough that it overlaps last release's, so a small move in the average tells you little. A group-by-group table, with the cases that broke, only exists if you keep a test set.
        </p>
      )}
    </WhatIfFrame>
  );
}
