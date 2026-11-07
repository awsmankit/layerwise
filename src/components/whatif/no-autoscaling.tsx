import { useEffect, useMemo, useState } from 'react';
import WhatIfFrame from './WhatIfFrame';
import { fmt } from '../viz/shared';
import { chartMax, config, fixedChoices, serversForPeak, simulateAuto, simulateFixed, startChoices, summarise } from '../../lib/whatif/no-autoscaling';

const X0 = 34;
const PW = 340;
const TOP = 30;
const PH = 170;
const BASE = TOP + PH;
const H = BASE + 94;

const pct = (x: number) => `${(x * 100).toFixed(x > 0 && x < 0.1 ? 1 : 0)}%`;

/**
 * One day, left to right. The black line is the load (requests per second). The purple line is how much the paid servers
 * can finish. Red between them is load turned away. Hatched amber is capacity paid for and not used.
 */
export default function NoAutoscalingWhatIf() {
  const [auto, setAuto] = useState(true);
  const [fixed, setFixed] = useState(6);
  const [start, setStart] = useState(1);
  const last = config.ticks - 1;
  const [shown, setShown] = useState(last);
  const [playing, setPlaying] = useState(false);

  const fixedRun = useMemo(() => simulateFixed(fixed), [fixed]);
  const autoRun = useMemo(() => simulateAuto(start), [start]);
  const run = auto ? autoRun : fixedRun;
  const sum = summarise(run);
  const peakServers = serversForPeak();
  const max = chartMax([fixedRun, autoRun]);
  const now = run[Math.min(shown, last)];

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setShown((s) => {
        if (s >= last) {
          setPlaying(false);
          return last;
        }
        return Math.min(last, s + 3);
      });
    }, 40);
    return () => clearInterval(id);
  }, [playing, last]);

  const replay = () => {
    setShown(0);
    setPlaying(true);
  };
  const flip = (v: boolean) => {
    setAuto(v);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPlaying(false);
      setShown(last);
    } else replay();
  };

  const bw = PW / config.ticks;
  const y = (v: number) => (v / max) * PH;
  const capPts = run
    .filter((r) => r.t <= shown)
    .flatMap((r) => [`${(X0 + r.t * bw).toFixed(1)},${(BASE - y(r.capacity)).toFixed(1)}`, `${(X0 + (r.t + 1) * bw).toFixed(1)},${(BASE - y(r.capacity)).toFixed(1)}`])
    .join(' ');
  const demandPts = run
    .filter((r) => r.t <= shown)
    .map((r) => `${(X0 + (r.t + 0.5) * bw).toFixed(1)},${(BASE - y(r.demand)).toFixed(1)}`)
    .join(' ');
  const hour = (t: number) => {
    const h = Math.floor((t * config.tickMinutes) / 60);
    const m = (t * config.tickMinutes) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <WhatIfFrame
      title="One day of traffic against a set number of servers"
      withLabel="With autoscaling"
      withoutLabel="Fixed servers"
      on={auto}
      onChange={flip}
      verdict={
        auto ? (
          <>
            Autoscaling costs {fmt.usd(sum.cost)} for the day, uses {pct(sum.utilisation)} of the capacity it pays for, and turns away {pct(sum.droppedShare)} of requests with a {start * config.tickMinutes}-minute start-up delay (example numbers).
          </>
        ) : (
          <>
            {fixed} fixed servers cost {fmt.usd(sum.cost)} a day. {sum.dropped > 0 ? `${pct(sum.droppedShare)} of requests are turned away at the peaks, and ` : 'Nothing is turned away, but '}only {pct(sum.utilisation)} of the paid capacity is used (example numbers). The peak needs {peakServers} servers.
          </>
        )
      }
      controls={
        <>
          {auto ? (
            <label className="field">
              <span>
                Time for a new server to start <b>{start * config.tickMinutes} min</b>
              </span>
              <input type="range" min={0} max={startChoices.length - 1} value={start} onChange={(e) => setStart(+e.target.value)} aria-label="Minutes a new server needs before it can take requests" aria-valuetext={`${start * config.tickMinutes} minutes`} />
            </label>
          ) : (
            <label className="field">
              <span>
                Fixed servers <b>{fixed}</b>
              </span>
              <input
                type="range"
                min={0}
                max={fixedChoices.length - 1}
                value={fixedChoices.indexOf(fixed as (typeof fixedChoices)[number])}
                onChange={(e) => setFixed(fixedChoices[+e.target.value])}
                aria-label="Number of servers that never changes"
                aria-valuetext={`${fixed} servers`}
              />
            </label>
          )}
          <div className="ws-btnrow">
            <button type="button" className="btn quiet" onClick={replay}>
              {playing ? 'Playing…' : 'Play the day'}
            </button>
          </div>
        </>
      }
    >
      <p className="ws-idea">
        Visitors come and go through the day. Servers cost money whether or not they are busy. A fixed number has to be wrong for most of the day.
      </p>
      <svg
        viewBox={`0 0 380 ${H}`}
        className="dx-svg wi-svg ws-svg"
        role="img"
        aria-label={`A day of load against server capacity. ${auto ? 'Capacity follows the load with a delay.' : `Capacity is a flat line of ${fixed * config.perServer} requests per second.`} ${pct(sum.droppedShare)} of requests are turned away and ${pct(sum.utilisation)} of paid capacity is used.`}
      >
        <defs>
          <pattern id="ws-idle-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="#c98a12" strokeWidth="2" />
          </pattern>
        </defs>
        <text x={6} y={14} className="ws-svg-h">
          Requests per second, over one day
        </text>
        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line x1={X0} x2={X0 + PW} y1={BASE - y(v)} y2={BASE - y(v)} className="ws-grid" />
            <text x={X0 - 4} y={BASE - y(v) + 4} textAnchor="end" className="ws-svg-t">
              {v}
            </text>
          </g>
        ))}
        {run.map((r) => {
          if (r.t > shown) return null;
          const gx = X0 + r.t * bw;
          if (r.dropped > 0) return <rect key={r.t} x={gx} y={BASE - y(r.demand)} width={bw + 0.3} height={y(r.dropped)} className="ws-bad" />;
          if (r.capacity > r.demand) return <rect key={r.t} x={gx} y={BASE - y(r.capacity)} width={bw + 0.3} height={y(r.capacity - r.demand)} fill="url(#ws-idle-hatch)" />;
          return null;
        })}
        <polyline points={demandPts} className="ws-demand" />
        <polyline points={capPts} className="ws-cap" />
        <line x1={X0 + (shown + 0.5) * bw} x2={X0 + (shown + 0.5) * bw} y1={TOP} y2={BASE} className="ws-now" />
        {[0, 6, 12, 18, 24].map((h) => (
          <text key={h} x={X0 + (h / 24) * PW} y={BASE + 15} textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'} className="ws-svg-t">
            {String(h).padStart(2, '0')}:00
          </text>
        ))}
        <g>
          <line x1={6} x2={26} y1={BASE + 31} y2={BASE + 31} className="ws-demand" />
          <text x={30} y={BASE + 35} className="ws-legend-t">
            load
          </text>
          <line x1={80} x2={100} y1={BASE + 31} y2={BASE + 31} className="ws-cap" />
          <text x={104} y={BASE + 35} className="ws-legend-t">
            paid capacity
          </text>
          <rect x={218} y={BASE + 25} width={14} height={12} className="ws-bad" />
          <text x={236} y={BASE + 35} className="ws-legend-t">
            turned away
          </text>
          <rect x={6} y={BASE + 45} width={14} height={12} fill="url(#ws-idle-hatch)" stroke="#c98a12" strokeWidth={1} />
          <text x={26} y={BASE + 56} className="ws-legend-t">
            paid, not used
          </text>
          <text x={6} y={BASE + 80} className="ws-svg-t">
            At {hour(Math.min(shown, last))}: {now.demand} req/s, {now.ready} of {now.billed} servers ready
          </text>
        </g>
      </svg>
      <div className="ws-stats is-tight" aria-live="off">
        <div>
          <b>{fmt.usd(sum.cost)}</b>
          <span>cost for the day</span>
        </div>
        <div>
          <b>{pct(sum.droppedShare)}</b>
          <span>turned away</span>
        </div>
        <div>
          <b>{pct(sum.utilisation)}</b>
          <span>of paid capacity used</span>
        </div>
      </div>
      <p className="ws-note">
        Example setup, not a benchmark: one server finishes {config.perServer} requests per second and costs ${config.pricePerHour.toFixed(2)} an hour, billed also while it starts. The load runs from {Math.min(...run.map((r) => r.demand))} to {sum.peakDemand} requests per second. Time moves in {config.tickMinutes}-minute steps. Requests above capacity are turned away.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <p className="ws-note" style={{ marginTop: 0 }}>
          Autoscaling rule (the Kubernetes one): servers wanted = ceil(load / {config.targetPerServer}), with a target of 70% of {config.perServer} per server. It sees the load {config.metricLagTicks * config.tickMinutes} minutes late and scales down only to the highest value wanted over the last {config.stabilisationTicks * config.tickMinutes} minutes. Peak load {sum.peakDemand} needs ceil({sum.peakDemand} / {config.perServer}) = {peakServers} fixed servers to turn nothing away.
        </p>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Cost/day</th>
                <th>Turned away</th>
                <th>Used</th>
              </tr>
            </thead>
            <tbody>
              {[...new Set([...fixedChoices.filter((n) => n <= peakServers + 2), peakServers])]
                .sort((a, b) => a - b)
                .map((n) => {
                  const s = summarise(simulateFixed(n));
                  return (
                    <tr key={n} className={!auto && n === fixed ? 'is-now' : ''}>
                      <td>{n} fixed</td>
                      <td>{fmt.usd(s.cost)}</td>
                      <td>{pct(s.droppedShare)}</td>
                      <td>{pct(s.utilisation)}</td>
                    </tr>
                  );
                })}
              {[0, 1, 3, 5].map((l) => {
                const s = summarise(simulateAuto(l));
                return (
                  <tr key={`a${l}`} className={auto && l === start ? 'is-now' : ''}>
                    <td>Auto, {l * config.tickMinutes} min start</td>
                    <td>{fmt.usd(s.cost)}</td>
                    <td>{pct(s.droppedShare)}</td>
                    <td>{pct(s.utilisation)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </WhatIfFrame>
  );
}
