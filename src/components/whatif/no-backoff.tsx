import { useEffect, useMemo, useState } from 'react';
import WhatIfFrame from './WhatIfFrame';
import { chartMax, config, simulate, stalledFrom, summarise } from '../../lib/whatif/no-backoff';

const X0 = 38;
const PW = 336;
const TOP = 24;
const PH = 190;
const BASE = TOP + PH;

/**
 * Each bar is one tick of the clock: its height is the load that hit the server. Green is what the server
 * finished, red is what it turned away (and will be retried). With immediate retries the red tower keeps growing.
 */
export default function NoBackoffWhatIf() {
  const [backoff, setBackoff] = useState(true);
  const [shown, setShown] = useState(config.ticks - 1);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(1);

  const runs = useMemo(() => ({ backoff: simulate('backoff'), immediate: simulate('immediate') }), []);
  const run = backoff ? runs.backoff : runs.immediate;
  const other = backoff ? runs.immediate : runs.backoff;
  const max = useMemo(() => chartMax([runs.backoff, runs.immediate]), [runs]);
  const sum = summarise(run);
  const stalled = stalledFrom(run);
  const last = config.ticks - 1;
  const now = run[Math.min(shown, last)];

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setShown((s) => {
        if (s >= last) {
          setPlaying(false);
          return last;
        }
        return Math.min(last, s + step);
      });
    }, 60);
    return () => clearInterval(id);
  }, [playing, step, last]);

  const replay = (fast: boolean) => {
    setShown(0);
    setStep(fast ? 5 : 1);
    setPlaying(true);
  };
  const flip = (v: boolean) => {
    setBackoff(v);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPlaying(false);
      setShown(last);
    } else replay(true);
  };

  const bw = PW / config.ticks;
  const y = (v: number) => (v / max) * PH;
  const ghost = other.map((t) => `${X0 + (t.tick + 0.5) * bw},${BASE - y(t.offered)}`).join(' ');
  const H = 302;

  return (
    <WhatIfFrame
      title="A short burst of traffic hits an overloaded server"
      withLabel="Backoff and jitter"
      withoutLabel="Retry at once"
      on={backoff}
      onChange={flip}
      verdict={
        backoff ? (
          <>
            Load peaks at {sum.peakOffered} requests per tick (capacity {config.capacity}), nobody gives up, and from tick {sum.recoveredAt} nothing is turned away: {sum.done.toLocaleString('en-US')} requests finished (toy model, example numbers).
          </>
        ) : (
          <>
            Load climbs to {sum.peakOffered} requests per tick against a capacity of {config.capacity}. From tick {stalled} the server finishes nothing, {sum.gaveUp} clients give up, and only {sum.done} requests ever finish (toy model, example numbers).
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Clock <b>tick {Math.min(shown, last)} of {last}</b>
            </span>
            <input
              type="range"
              min={0}
              max={last}
              value={Math.min(shown, last)}
              onChange={(e) => {
                setPlaying(false);
                setShown(+e.target.value);
              }}
              aria-label="Tick of the simulation to show"
            />
          </label>
          <div className="ws-btnrow">
            <button type="button" className="btn quiet" onClick={() => replay(false)}>
              {playing ? 'Playing…' : 'Play it'}
            </button>
          </div>
        </>
      }
    >
      <p className="ws-idea">
        Same server, same short burst of visitors. The only thing that changes is how long a turned-away client waits before trying again.
      </p>
      <svg viewBox={`0 0 380 ${H}`} className="dx-svg wi-svg ws-svg" role="img" aria-label={`Requests hitting the server in each tick up to tick ${now.tick}. Green is finished, red is turned away. ${backoff ? 'The load stays small and drains.' : 'The red tower keeps growing.'}`}>
        <text x={6} y={14} className="ws-svg-h">
          Requests hitting the server per tick
        </text>
        <rect x={X0 + config.spikeStart * bw} y={TOP} width={(config.spikeEnd - config.spikeStart) * bw} height={PH} fill="#c98a12" opacity={0.18} />
        <text x={X0 + config.spikeStart * bw + 2} y={TOP + 12} className="ws-svg-t">
          burst
        </text>
        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line x1={X0} x2={X0 + PW} y1={BASE - y(v)} y2={BASE - y(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={X0 - 4} y={BASE - y(v) + 4} textAnchor="end" className="ws-svg-t">
              {v}
            </text>
          </g>
        ))}
        {run.map((t) => {
          if (t.tick > shown) return null;
          const gx = X0 + t.tick * bw;
          return (
            <g key={t.tick}>
              <rect x={gx + 0.4} y={BASE - y(t.offered)} width={Math.max(1, bw - 0.8)} height={y(t.offered)} className="ws-bad" />
              <rect x={gx + 0.4} y={BASE - y(t.served)} width={Math.max(1, bw - 0.8)} height={y(t.served)} className="ws-good" />
            </g>
          );
        })}
        <polyline points={ghost} fill="none" stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
        <line x1={X0} x2={X0 + PW} y1={BASE - y(config.capacity)} y2={BASE - y(config.capacity)} stroke="var(--ink)" strokeWidth={2} />
        <text x={X0 + PW} y={BASE - y(config.capacity) - 5} textAnchor="end" className="ws-svg-b" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 3 }}>
          capacity {config.capacity}
        </text>
        <line x1={X0 + (shown + 0.5) * bw} x2={X0 + (shown + 0.5) * bw} y1={TOP} y2={BASE} stroke="var(--ink)" strokeWidth={1.5} opacity={0.8} />
        {[0, 20, 40, 60, last].map((tk) => (
          <text key={tk} x={X0 + (tk + 0.5) * bw} y={BASE + 16} textAnchor="middle" className="ws-svg-t">
            {tk}
          </text>
        ))}
        <text x={X0 + PW / 2} y={BASE + 32} textAnchor="middle" className="ws-svg-t">
          time (ticks)
        </text>
        <text x={6} y={H - 20} className="ws-svg-t">
          green = finished, red = turned away (it will retry)
        </text>
        <text x={6} y={H - 4} className="ws-svg-t">
          dashed line = the load the other way would give
        </text>
      </svg>
      <div className="ws-stats" aria-live="off">
        <div>
          <b>{now.offered}</b>
          <span>hit the server</span>
        </div>
        <div>
          <b>{now.served}</b>
          <span>finished</span>
        </div>
        <div>
          <b>{now.waiting}</b>
          <span>waiting to retry</span>
        </div>
        <div>
          <b>{now.gaveUp}</b>
          <span>gave up so far</span>
        </div>
      </div>
      <p className="ws-note">
        Toy model, example numbers: the server finishes {config.capacity} requests per tick; normal traffic is {config.baseArrivals} per tick; a burst of {config.spikeArrivals} per tick lasts {config.spikeEnd - config.spikeStart} ticks; each request turned away wastes {Math.round(config.rejectCost * 100)}% of a request's work; a client gives up {config.deadline} ticks after its first try. Backoff waits a random 1 to min({config.maxWait}, 2^k) ticks before retry k.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <p className="ws-note" style={{ marginTop: 0 }}>
          If L requests are offered and L is more than {config.capacity}, the server finishes floor(({config.capacity} - {config.rejectCost} x L) / (1 - {config.rejectCost})), and never less than 0. At L = 63 that is 15, at L = 200 it is 0. Same random seed every time, so the run is repeatable.
        </p>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Whole run</th>
                <th>Peak load</th>
                <th>Peak waiting</th>
                <th>Finished</th>
                <th>Gave up</th>
              </tr>
            </thead>
            <tbody>
              {(['backoff', 'immediate'] as const).map((k) => {
                const s = summarise(runs[k]);
                return (
                  <tr key={k} className={(k === 'backoff') === backoff ? 'is-now' : ''}>
                    <td>{k === 'backoff' ? 'Backoff' : 'At once'}</td>
                    <td>{s.peakOffered}</td>
                    <td>{s.peakWaiting}</td>
                    <td>{s.done}</td>
                    <td>{s.gaveUp}</td>
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
