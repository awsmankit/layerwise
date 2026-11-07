import { useEffect, useMemo, useState } from 'react';
import WhatIfFrame from './WhatIfFrame';
import { fmt } from '../viz/shared';
import { config, simulate, type Plan, type Run } from '../../lib/whatif/no-canary-release';

const r1 = (n: number) => Math.round(n * 10) / 10;
const X0 = 46;
const CW = 322;
const H1_TOP = 46;
const H1_BASE = 114;
const H2_TOP = 172;
const H2_BASE = 270;
const HOR = config.horizonMinutes;

const mx = (m: number) => r1(X0 + (m / HOR) * CW);
const ey = (s: number) => r1(H1_BASE - Math.sqrt(s) * (H1_BASE - H1_TOP));
const pct = (s: number) => `${Math.round(s * 100)}%`;
const mins = (n: number) => `${n} min`;

/**
 * Top: how much of the traffic is on the bad version, minute by minute (a square-root scale so 1% is still visible).
 * Bottom: users harmed so far, for both ways of releasing it. The chosen way is solid, the other is dashed.
 */
export default function NoCanaryReleaseWhatIf() {
  const [canary, setCanary] = useState(true);
  const [failPct, setFailPct] = useState(20);
  const [rate, setRate] = useState(600);
  const last = HOR - 1;
  const [shown, setShown] = useState(last);
  const [playing, setPlaying] = useState(false);

  const share = failPct / 100;
  const runAll = useMemo(() => simulate('all', share, rate), [share, rate]);
  const runCan = useMemo(() => simulate('canary', share, rate), [share, rate]);
  const plan: Plan = canary ? 'canary' : 'all';
  const run: Run = canary ? runCan : runAll;
  const other: Run = canary ? runAll : runCan;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setShown((s) => {
        if (s >= last) {
          setPlaying(false);
          return last;
        }
        return Math.min(last, s + 1);
      });
    }, 45);
    return () => clearInterval(id);
  }, [playing, last]);

  const replay = () => {
    setShown(0);
    setPlaying(true);
  };
  const flip = (v: boolean) => {
    setCanary(v);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPlaying(false);
      setShown(last);
    } else replay();
  };

  const upto = (r: Run) => r.minutes.filter((m) => m.t <= shown);
  const maxH = Math.max(1, runAll.harmed, runCan.harmed);
  const hy = (v: number) => r1(H2_BASE - (v / maxH) * (H2_BASE - H2_TOP));
  const harmPts = (r: Run) => `${mx(0)},${hy(0)} ` + upto(r).map((m) => `${mx(m.t + 1)},${hy(m.cumulative)}`).join(' ');

  const expoPts = (() => {
    const pts: string[] = [`${mx(0)},${H1_BASE}`];
    for (const m of upto(run)) pts.push(`${mx(m.t)},${ey(m.exposure)}`, `${mx(m.t + 1)},${ey(m.exposure)}`);
    pts.push(`${mx(Math.min(shown + 1, HOR))},${H1_BASE}`);
    return pts.join(' ');
  })();

  const now = run.minutes[Math.min(shown, last)];
  const finished = shown >= last;
  const endAll = runAll.harmed;
  const endCan = runCan.harmed;
  const ratio = endCan > 0 ? endAll / endCan : null;

  const verdict = run.alarmAt === null ? (
    <>
      The alarm never fires: {share < config.minShare - 1e-9 ? `only ${failPct}% of requests break, below the alarm's ${pct(config.minShare)} line` : `too few failures pile up to reach the alarm's ${config.minFailures}-failure bar`}. {canary ? 'The ramp reaches everyone and' : 'The change stays on for everyone and'} {fmt.int(run.harmed)} users are harmed in the hour (example numbers).
    </>
  ) : canary ? (
    <>
      With a canary the bad change reached at most {pct(run.peakExposure)} of users, was caught after {mins(run.alarmAt)} and harmed {fmt.int(run.harmed)} users, against {fmt.int(endAll)} if shipped to everyone{ratio && ratio >= 1.5 ? ` (${Math.round(ratio)} times more)` : ''} (example numbers).
    </>
  ) : (
    <>
      Shipped to everyone, the bad change is caught after {mins(run.alarmAt)} but still harms {fmt.int(run.harmed)} users before the rollback finishes, against {fmt.int(endCan)} with a canary (example numbers).
    </>
  );

  // end labels on the harm chart, larger value above
  const lbl = (r: Run, text: string, above: boolean) => {
    const x = mx(Math.min(shown + 1, HOR));
    const y = hy(upto(r)[upto(r).length - 1]?.cumulative ?? 0);
    return (
      <text x={Math.min(x, mx(HOR))} y={r1(above ? y - 7 : y + 15)} textAnchor="end" className={r.plan === 'all' ? 'ws-t-red' : 'ws-t-green'}>
        {text}
      </text>
    );
  };

  const stageLabels = plan === 'canary' ? config.stages.map((s, i) => ({ s: s.share, t: i * 10 + 5 })).concat([{ s: 1, t: 45 }]) : [{ s: 1, t: 30 }];

  return (
    <WhatIfFrame
      title="One bad change, two ways to release it"
      withLabel="With a canary"
      withoutLabel="Everyone at once"
      on={canary}
      onChange={flip}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Requests the bad change breaks <b>{failPct}%</b>
            </span>
            <input type="range" min={1} max={40} step={1} value={failPct} onChange={(e) => setFailPct(+e.target.value)} aria-label="Share of requests that the bad change breaks, in percent" aria-valuetext={`${failPct} percent`} />
          </label>
          <label className="field">
            <span>
              Traffic (example) <b>{fmt.int(rate)} a minute</b>
            </span>
            <input type="range" min={200} max={2000} step={100} value={rate} onChange={(e) => setRate(+e.target.value)} aria-label="Requests per minute, an example traffic level" aria-valuetext={`${rate} requests per minute`} />
          </label>
          <div className="ws-btnrow">
            <button type="button" className="btn quiet" onClick={replay}>
              {playing ? 'Playing…' : 'Play the hour'}
            </button>
          </div>
        </>
      }
    >
      <p className="ws-idea">
        Imagine a new version has a bug that breaks some requests. If everyone gets it at once, everyone meets the bug at once. A canary release shows it to a few users first and widens only while things look fine.
      </p>
      <svg
        viewBox="0 0 380 298"
        className="dx-svg wi-svg ws-fig"
        role="img"
        aria-label={`An hour after release. ${canary ? 'Canary: 1, 5, 25 percent, then everyone.' : 'Everyone at once.'} The alarm ${run.alarmAt === null ? 'never fires' : `fires after ${run.alarmAt} minutes`}. Users harmed: ${fmt.int(run.harmed)} with this way, ${fmt.int(other.harmed)} with the other way.`}
      >
        <text x={12} y={16} className="ws-svg-h">
          Share of users on the bad version
        </text>
        <text x={12} y={31} className="ws-svg-t" style={{ fontSize: 12.5 }}>
          square-root scale, so 1% stays visible
        </text>
        <line x1={X0} x2={X0 + CW} y1={H1_BASE} y2={H1_BASE} className="ws-grid" />
        <line x1={X0} x2={X0 + CW} y1={H1_TOP} y2={H1_TOP} className="ws-grid" />
        <text x={X0 - 6} y={H1_TOP + 4} textAnchor="end" className="ws-svg-t" style={{ fontSize: 12.5 }}>
          100%
        </text>
        <text x={X0 - 6} y={H1_BASE + 4} textAnchor="end" className="ws-svg-t" style={{ fontSize: 12.5 }}>
          0%
        </text>
        <polygon points={expoPts} className="ws-expo" />
        {stageLabels
          .filter((l) => l.t <= shown && run.minutes[l.t] && run.minutes[l.t].exposure > 0)
          .map((l) => (
            <text key={l.t} x={mx(l.t)} y={ey(run.minutes[l.t].exposure) - 4} textAnchor="middle" className="ws-svg-t" style={{ fontSize: 12.5 }}>
              {pct(run.minutes[l.t].exposure)}
            </text>
          ))}

        <text x={12} y={H2_TOP - 18} className="ws-svg-h">
          Users harmed so far
        </text>
        <line x1={X0} x2={X0 + CW} y1={H2_BASE} y2={H2_BASE} className="ws-grid" />
        <line x1={X0} x2={X0 + CW} y1={H2_TOP} y2={H2_TOP} className="ws-grid" />
        <text x={X0 - 6} y={H2_TOP + 4} textAnchor="end" className="ws-svg-t" style={{ fontSize: 12.5 }}>
          {fmt.int(maxH)}
        </text>
        <text x={X0 - 6} y={H2_BASE + 4} textAnchor="end" className="ws-svg-t" style={{ fontSize: 12.5 }}>
          0
        </text>
        <polyline fill="none" points={harmPts(other)} className={`ws-ln ${other.plan === 'all' ? 'is-red' : 'is-green'} is-dashed`} />
        <polyline fill="none" points={harmPts(run)} className={`ws-ln ${plan === 'all' ? 'is-red' : 'is-green'}`} />
        {run.alarmAt !== null && run.alarmAt - 1 <= shown && (
          <g>
            <line x1={mx(run.alarmAt)} x2={mx(run.alarmAt)} y1={H2_TOP} y2={H2_BASE} className="ws-now" strokeDasharray="3 3" />
            <text x={mx(run.alarmAt) + (run.alarmAt > 40 ? -4 : 4)} y={H2_TOP + 32} textAnchor={run.alarmAt > 40 ? 'end' : 'start'} className="ws-svg-b" style={{ fontSize: 12 }}>
              alarm at {mins(run.alarmAt)}
            </text>
          </g>
        )}
        {lbl(runAll, `Everyone at once: ${fmt.int(upto(runAll)[upto(runAll).length - 1]?.cumulative ?? 0)}`, true)}
        {lbl(runCan, `Canary: ${fmt.int(upto(runCan)[upto(runCan).length - 1]?.cumulative ?? 0)}`, !true)}
        {[0, 15, 30, 45, 60].map((m) => (
          <text key={m} x={mx(m)} y={H2_BASE + 17} textAnchor={m === 0 ? 'start' : m === 60 ? 'end' : 'middle'} className="ws-svg-t" style={{ fontSize: 12.5 }}>
            {m === 60 ? '60 min' : m}
          </text>
        ))}
        {!finished && <line x1={mx(shown + 1)} x2={mx(shown + 1)} y1={H1_TOP - 4} y2={H2_BASE} className="ws-now" />}
      </svg>

      <div className="ws-stats is-tight" role="group" aria-label="Results for this way of releasing">
        <div>
          <b>{fmt.int(finished ? run.harmed : now.cumulative)}</b>
          <span>users harmed{finished ? '' : ` by minute ${shown + 1}`}</span>
        </div>
        <div>
          <b>{run.alarmAt === null ? 'never' : mins(run.alarmAt)}</b>
          <span>until the alarm</span>
        </div>
        <div>
          <b>{pct(run.peakExposure)}</b>
          <span>most users exposed</span>
        </div>
      </div>

      <p className="ws-note">
        Simulation, not data: expected counts from the rule below, the same every time. Traffic and the share of broken requests are examples; one request stands for one user.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Alarm</th>
                <th>Gone</th>
                <th>Peak</th>
                <th>Harmed</th>
              </tr>
            </thead>
            <tbody>
              {[runAll, runCan].map((r) => (
                <tr key={r.plan} className={r.plan === plan ? 'is-now' : ''}>
                  <td>{r.plan === 'all' ? 'Everyone' : 'Canary'}</td>
                  <td>{r.alarmAt === null ? 'never' : mins(r.alarmAt)}</td>
                  <td>{r.rolledBackAt === null ? '-' : mins(r.rolledBackAt)}</td>
                  <td>{pct(r.peakExposure)}</td>
                  <td>{fmt.int(r.harmed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ws-note">
          Users harmed each minute = traffic x share on the new version x share broken. The canary starts at 1% for 10 minutes, then 5% for 10, then 25% for 10, then everyone, moving up only while the alarm is quiet. The alarm rule is checked every minute: in the last {config.windowMinutes} minutes the new version failed at least {config.minFailures} requests and at least {pct(config.minShare)} of the requests it served. Once it fires, the rollback takes {config.rollbackMinutes} minutes, during which the bad version keeps its share; then it serves nobody. With {fmt.int(rate)} requests a minute and {failPct}% broken: everyone-at-once harms {fmt.int(rate * share)} users a minute.
        </p>
      </details>
    </WhatIfFrame>
  );
}

