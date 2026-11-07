import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { config as base, deadlineQueue, fairShare, noisyChoices, simulate, summarise, type Config } from '../../lib/whatif/no-rate-limits';

const X0 = 34;
const PW = 340;
const TOP = 30;
const PH = 100;
const B1 = TOP + PH;
const TOP2 = B1 + 78;
const PH2 = 92;
const Y2MAX = 4;
const B2 = TOP2 + PH2;
const H = B2 + 90;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Top: how many requests are waiting, tick by tick. Bottom: how much of the server each user got while the bug was running.
 * Without limits the noisy user takes most of it and the queue passes the point where requests time out.
 */
export default function NoRateLimitsWhatIf() {
  const [limited, setLimited] = useState(true);
  const [rateIdx, setRateIdx] = useState(3);
  const rate = noisyChoices[rateIdx];
  const last = base.ticks - 1;
  const [shown, setShown] = useState(last);
  const [playing, setPlaying] = useState(false);

  const cfg: Config = useMemo(() => ({ ...base, noisyRate: rate }), [rate]);
  const runs = useMemo(() => ({ open: simulate('open', cfg), limited: simulate('limited', cfg) }), [cfg]);
  const sums = useMemo(() => ({ open: summarise(runs.open, cfg), limited: summarise(runs.limited, cfg) }), [runs, cfg]);
  const run = limited ? runs.limited : runs.open;
  const other = limited ? runs.open : runs.limited;
  const sum = limited ? sums.limited : sums.open;
  const dq = deadlineQueue(cfg);
  const maxQ = Math.max(Math.ceil(Math.max(...runs.open.queue, ...runs.limited.queue, dq * 1.2) / 100) * 100, 200);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setShown((s) => {
        if (s >= last) {
          setPlaying(false);
          return last;
        }
        return Math.min(last, s + 2);
      });
    }, 40);
    return () => clearInterval(id);
  }, [playing, last]);

  const replay = () => {
    setShown(0);
    setPlaying(true);
  };
  const flip = (v: boolean) => {
    setLimited(v);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPlaying(false);
      setShown(last);
    } else replay();
  };

  const bw = PW / base.ticks;
  const y1 = (v: number) => (Math.min(v, maxQ) / maxQ) * PH;
  const ghost = other.queue.map((v, t) => `${(X0 + (t + 0.5) * bw).toFixed(1)},${(B1 - y1(v)).toFixed(1)}`).join(' ');

  const users = [...sum.perUserInBurst.normal, sum.perUserInBurst.noisy];
  const asked = [...sum.askedInBurst.normal, sum.askedInBurst.noisy];
  const colW = PW / users.length;
  const y2 = (v: number) => (Math.min(v, Y2MAX) / Y2MAX) * PH2;
  const burstX = (t: number) => X0 + t * bw;

  return (
    <WhatIfFrame
      title="Ten ordinary users and one noisy user share one server"
      withLabel="With per-user limits"
      withoutLabel="No limits"
      on={limited}
      onChange={flip}
      verdict={
        limited ? (
          <>
            With a token bucket per user, {pct(sum.normalServedShare)} of the ordinary users' requests finish in time and the noisy user gets {pct(sum.noisyShareInBurst)} of the server while the bug runs. {fmt.int(sum.noisyRejected)} of its requests get an instant "too many requests" (toy simulation).
          </>
        ) : (
          <>
            While the bug runs, the noisy user takes {pct(sum.noisyShareInBurst)} of the server. Only {pct(sum.normalServedShare)} of the ordinary users' requests finish in time, and {fmt.int(sum.normalTimedOut)} give up waiting (toy simulation).
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Noisy user sends <b>{rate} per tick</b>
            </span>
            <input
              type="range"
              min={0}
              max={noisyChoices.length - 1}
              value={rateIdx}
              onChange={(e) => setRateIdx(+e.target.value)}
              aria-label="Requests per tick that the noisy user sends while the bug runs"
              aria-valuetext={`${rate} requests per tick`}
            />
          </label>
          <div className="ws-btnrow">
            <button type="button" className="btn quiet" onClick={replay}>
              {playing ? 'Playing…' : 'Play it'}
            </button>
          </div>
        </>
      }
    >
      <p className="ws-idea">
        One request joins the queue after another, and the server finishes them in order. That is fair to requests, not to people. A user who sends far more gets far more of the server.
      </p>
      <svg
        viewBox={`0 0 380 ${H}`}
        className="dx-svg wi-svg ws-svg"
        role="img"
        aria-label={`Top chart: requests waiting over time. ${limited ? 'The queue stays near zero.' : 'The queue grows far past the point where requests time out while the bug runs.'} Bottom chart: requests finished per tick for each user during the bug. The noisy user got ${sum.perUserInBurst.noisy.toFixed(1)} of ${cfg.capacity}; the fair share is ${fairShare(cfg).toFixed(1)}.`}
      >
        <text x={6} y={14} className="ws-svg-h">
          Requests waiting
        </text>
        <text x={X0 + PW} y={14} textAnchor="end" className="ws-svg-b">
          peak {fmt.int(sum.peakQueue)}
        </text>
        <rect x={burstX(cfg.burstStart)} y={TOP} width={burstX(cfg.burstEnd) - burstX(cfg.burstStart)} height={PH} fill="#c98a12" opacity={0.16} />
        <text x={(burstX(cfg.burstStart) + burstX(cfg.burstEnd)) / 2} y={TOP - 5} textAnchor="middle" className="ws-svg-t">
          bug runs
        </text>
        {[0, maxQ].map((v) => (
          <g key={v}>
            <line x1={X0} x2={X0 + PW} y1={B1 - y1(v)} y2={B1 - y1(v)} className="ws-grid" />
            <text x={X0 - 4} y={B1 - y1(v) + 4} textAnchor="end" className="ws-svg-t">
              {v}
            </text>
          </g>
        ))}
        {run.queue.map((v, t) => (t > shown || v === 0 ? null : <rect key={t} x={X0 + t * bw + 0.3} y={B1 - y1(v)} width={Math.max(1, bw - 0.6)} height={y1(v)} className="ws-bad" />))}
        <polyline points={ghost} fill="none" stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
        <line x1={X0} x2={X0 + PW} y1={B1 - y1(dq)} y2={B1 - y1(dq)} stroke="var(--ink)" strokeWidth={2} />
        <text x={X0 + PW} y={B1 - y1(dq) - 5} textAnchor="end" className="ws-svg-b ws-halo">
          too long a wait: {dq}
        </text>
        <line x1={X0 + (shown + 0.5) * bw} x2={X0 + (shown + 0.5) * bw} y1={TOP} y2={B1} className="ws-now" />
        {[0, 20, 40, 60, last].map((tk) => (
          <text key={tk} x={X0 + (tk + 0.5) * bw} y={B1 + 15} textAnchor="middle" className="ws-svg-t">
            {tk}
          </text>
        ))}
        <text x={X0 + PW / 2} y={B1 + 29} textAnchor="middle" className="ws-svg-t">
          time (ticks); dashed line = the other way
        </text>

        <text x={6} y={TOP2 - 10} className="ws-svg-h">
          Finished per tick (bug running)
        </text>
        {[0, 2, Y2MAX].map((v) => (
          <g key={v}>
            <line x1={X0} x2={X0 + PW} y1={B2 - y2(v)} y2={B2 - y2(v)} className="ws-grid" />
            <text x={X0 - 4} y={B2 - y2(v) + 4} textAnchor="end" className="ws-svg-t">
              {v}
            </text>
          </g>
        ))}
        {users.map((v, u) => {
          const noisy = u === users.length - 1;
          const gx = X0 + u * colW;
          const okay = v >= asked[u] * 0.95;
          const off = v > Y2MAX;
          return (
            <g key={u}>
              <motion.rect x={gx + 3} y={B2 - PH2} width={colW - 6} height={PH2} className={noisy ? 'ws-warn' : okay ? 'ws-good' : 'ws-bad'} initial={false} animate={{ scaleY: Math.max(Math.min(v, Y2MAX), 0.03) / Y2MAX }} style={{ originY: 1, transformBox: 'fill-box' }} transition={{ duration: 0.5, ease: EASE }} />
              {!noisy && <line x1={gx + 1} x2={gx + colW - 1} y1={B2 - y2(asked[u])} y2={B2 - y2(asked[u])} stroke="var(--ink)" strokeWidth={2.2} />}
              <text x={off ? gx + colW : gx + colW / 2} y={off ? B2 - PH2 - 5 : B2 - y2(v) - 4} textAnchor={off ? 'end' : 'middle'} className={off ? 'ws-svg-b ws-halo' : 'ws-svg-t ws-halo'}>
                {off ? `${v.toFixed(1)} ▲` : v.toFixed(1)}
              </text>
              <text x={gx + colW / 2} y={B2 + 15} textAnchor="middle" className="ws-svg-t">
                {noisy ? 'bug' : u + 1}
              </text>
              {!noisy && !okay && (
                <text x={gx + colW / 2} y={B2 + 30} textAnchor="middle" className="ws-svg-t" style={{ fill: '#d6453d', fontWeight: 700 }}>
                  ✗
                </text>
              )}
            </g>
          );
        })}
        <line x1={X0} x2={X0 + PW} y1={B2 - y2(fairShare(cfg))} y2={B2 - y2(fairShare(cfg))} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={6} y={B2 + 47} className="ws-svg-t">
          bars: users 1 to 10, then the buggy one
        </text>
        <text x={6} y={B2 + 64} className="ws-svg-t">
          black tick = what that user asked for
        </text>
        <text x={6} y={B2 + 81} className="ws-svg-t">
          dashed = equal share ({fairShare(cfg).toFixed(1)}); ✗ = short-changed
        </text>
      </svg>
      <div className="ws-stats is-tight" aria-live="off">
        <div>
          <b>{pct(sum.normalServedShare)}</b>
          <span>of ordinary requests finished in time</span>
        </div>
        <div>
          <b>{fmt.int(sum.normalTimedOut)}</b>
          <span>ordinary requests gave up</span>
        </div>
        <div>
          <b>{pct(sum.noisyShareInBurst)}</b>
          <span>of the server taken by the bug</span>
        </div>
      </div>
      <p className="ws-note">
        Toy simulation, example numbers: the server finishes {cfg.capacity} requests per tick from one shared queue. Each ordinary user sends 1 or 2 requests per tick (1.5 on average). From tick {cfg.burstStart} to {cfg.burstEnd - 1} the noisy user sends {rate} per tick. A client gives up after waiting more than {cfg.deadline} ticks. The limit is a token bucket per user: room for {cfg.bucketSize} tokens, {cfg.refill} new tokens per tick, one token per request.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <p className="ws-note" style={{ marginTop: 0 }}>
          The "too long a wait" line is capacity x deadline = {cfg.capacity} x {cfg.deadline} = {dq} requests: a request that arrives behind that many others cannot be finished in time. An ordinary user needs at most {cfg.refill} tokens per tick, equal to the refill, so the bucket is never empty for them. The noisy user can spend {cfg.bucketSize} tokens at once and then {cfg.refill} per tick, so over a {cfg.burstEnd - cfg.burstStart}-tick burst only {cfg.bucketSize} + {cfg.burstEnd - cfg.burstStart - 1} x {cfg.refill} = {cfg.bucketSize + (cfg.burstEnd - cfg.burstStart - 1) * cfg.refill} of its requests get in. The rest are turned away straight away. Same random seed every time.
        </p>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Whole run</th>
                <th>Ordinary in time</th>
                <th>Peak queue</th>
                <th>Noisy share</th>
              </tr>
            </thead>
            <tbody>
              {(['open', 'limited'] as const).map((k) => (
                <tr key={k} className={(k === 'limited') === limited ? 'is-now' : ''}>
                  <td>{k === 'limited' ? 'Limits' : 'No limits'}</td>
                  <td>{pct(sums[k].normalServedShare)}</td>
                  <td>{fmt.int(sums[k].peakQueue)}</td>
                  <td>{pct(sums[k].noisyShareInBurst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </WhatIfFrame>
  );
}
