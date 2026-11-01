import { useMemo, useState } from 'react';
import { Root } from './shared';
import { CUSTOMERS, RULE_THRESHOLD, join, ruleAccuracy, type JoinMode } from '../../lib/point-in-time';

const TTLS: (number | undefined)[] = [5, 10, 20, 30, 60, undefined];
const W = 300;
const H = 150;
const PAD = { l: 30, r: 10, t: 12, b: 28 };
const DAYS = 180;
const x = (d: number) => PAD.l + (d / DAYS) * (W - PAD.l - PAD.r);
const y = (v: number) => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b);

/**
 * A feature that changes over time, and labelled events that each need the value known at that moment.
 * The learner flips between joining the latest value and joining as of the event, and sees which values come
 * from the future and what that does to a simple rule's accuracy.
 */
export default function PointInTimeJoin() {
  const [mode, setMode] = useState<JoinMode>('latest');
  const [ti, setTi] = useState(3);
  const [who, setWho] = useState(1);
  const ttl = TTLS[ti];
  const rows = useMemo(() => join(CUSTOMERS, mode, mode === 'asof' ? ttl : undefined), [mode, ttl]);
  const acc = useMemo(() => ruleAccuracy(rows), [rows]);
  const c = CUSTOMERS[who];
  const mine = rows.filter((r) => r.customer === c.name);
  const leaks = rows.filter((r) => r.fromFuture).length;

  const step = c.updates.map((u, i) => `${i === 0 ? 'M' : 'L'}${x(u.day)} ${y(c.updates[Math.max(0, i - 1)].value)} L${x(u.day)} ${y(u.value)}`).join(' ');
  const last = c.updates[c.updates.length - 1];

  return (
    <Root>
      <div className="viz mo2-pit">
        <p className="viz-title">Join a changing feature to labelled events: latest value or value as of the event?</p>
        <div className="mo2-chips" role="group" aria-label="How to join">
          <button type="button" className="btn quiet" aria-pressed={mode === 'latest'} onClick={() => setMode('latest')}>Latest value</button>
          <button type="button" className="btn quiet" aria-pressed={mode === 'asof'} onClick={() => setMode('asof')}>Value as of the event</button>
        </div>
        <label className="field">
          <span>
            Time-to-live (how old a value may be): <b>{ttl === undefined ? 'no limit' : `${ttl} days`}</b>
          </span>
          <input type="range" min={0} max={TTLS.length - 1} step={1} value={ti} disabled={mode === 'latest'} onChange={(e) => setTi(+e.target.value)} aria-valuetext={ttl === undefined ? 'no limit' : `${ttl} days`} />
        </label>
        {mode === 'latest' && <p className="mo2-small">The time-to-live only applies to the as-of join.</p>}

        <div className="mo2-chips" role="group" aria-label="Customer to draw">
          {CUSTOMERS.map((cu, i) => (
            <button key={cu.name} type="button" className="btn quiet" aria-pressed={who === i} onClick={() => setWho(i)}>{cu.name}</button>
          ))}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="mo2-svg" role="img" aria-label={`Timeline for ${c.name}. Card utilisation was recorded on days ${c.updates.map((u) => u.day).join(', ')}. ${mine.map((r) => `The event on day ${r.eventDay} (${r.defaulted ? 'defaulted' : 'repaid'}) was joined to ${r.used ? `the value ${r.used.value} recorded on day ${r.used.day}${r.fromFuture ? ', which is after the event' : ''}` : 'no value'}.`).join(' ')}`}>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <path d={`M${PAD.l} ${y(v)} H${W - PAD.r}`} className="mo2-grid" />
              <text x={PAD.l - 4} y={y(v) + 4} textAnchor="end" className="mo2-tick">{v}</text>
            </g>
          ))}
          <path d={`M${PAD.l} ${y(RULE_THRESHOLD)} H${W - PAD.r}`} className="mo2-thr" />
          <text x={W - PAD.r} y={y(RULE_THRESHOLD) - 3} textAnchor="end" className="mo2-tick">rule: above {RULE_THRESHOLD}</text>
          {[0, 60, 120, 180].map((d) => (
            <text key={d} x={x(d)} y={H - 8} textAnchor="middle" className="mo2-tick">{d}</text>
          ))}
          <path d={`${step} L${x(DAYS)} ${y(last.value)}`} className="mo2-line" />
          {c.updates.map((u) => (
            <circle key={u.day} cx={x(u.day)} cy={y(u.value)} r={3.5} className="mo2-dot" />
          ))}
          {mine.map((r) => {
            const col = r.defaulted ? 'mo2-ev-bad' : 'mo2-ev-ok';
            return (
              <g key={r.eventDay}>
                <path d={`M${x(r.eventDay)} ${PAD.t} V${H - PAD.b}`} className={col} />
                <rect x={x(r.eventDay) - 5} y={PAD.t - 6} width={10} height={10} className={`${col} mo2-ev-box`} transform={`rotate(45 ${x(r.eventDay)} ${PAD.t - 1})`} />
                {r.used && (
                  <>
                    <path d={`M${x(r.eventDay)} ${y(r.used.value)} L${x(r.used.day)} ${y(r.used.value)}`} className={r.fromFuture ? 'mo2-pick mo2-future' : 'mo2-pick'} />
                    <circle cx={x(r.used.day)} cy={y(r.used.value)} r={6} className={r.fromFuture ? 'mo2-ring mo2-future' : 'mo2-ring'} />
                  </>
                )}
              </g>
            );
          })}
        </svg>
        <p className="mo2-legend">
          <span><i className="mo2-sw mo2-sw-dot" /> value recorded (day)</span>
          <span><i className="mo2-sw mo2-sw-bad" /> event: defaulted</span>
          <span><i className="mo2-sw mo2-sw-ok" /> event: repaid</span>
          <span><i className="mo2-sw mo2-sw-ring" /> value joined</span>
          <span><i className="mo2-sw mo2-sw-future" /> joined value is from the future</span>
        </p>

        <div className="mo2-wrap" tabIndex={0} role="region" aria-label="All events and the value each one was joined to">
          <table className="mo2-table">
            <caption className="mo2-sr">Each labelled event, the feature value joined to it, and whether a simple rule predicted it correctly.</caption>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Outcome</th>
                <th scope="col">Value joined</th>
                <th scope="col">Rule</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pred = r.used !== null && r.used.value > RULE_THRESHOLD;
                const ok = pred === r.defaulted;
                return (
                  <tr key={`${r.customer}-${r.eventDay}`}>
                    <th scope="row">{r.customer}, day {r.eventDay}</th>
                    <td>{r.defaulted ? 'defaulted' : 'repaid'}</td>
                    <td className={r.fromFuture ? 'mo2-diff' : undefined}>
                      {r.used ? `${r.used.value} from day ${r.used.day}` : 'no value'}
                      {r.fromFuture && <span className="mo2-tag"> future</span>}
                    </td>
                    <td>{ok ? 'right' : 'wrong'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mo2-result" aria-live="polite" role="status">
          <p className="mo2-big">
            <span>Rule "utilisation above {RULE_THRESHOLD} means default" is right on</span>
            <b className={mode === 'latest' ? 'mo2-bad' : 'mo2-good'}>{acc.correct} of {acc.total} events</b>
          </p>
          <p className="mo2-small">
            Defaults caught: {acc.caught} of {acc.defaults}. Events joined to a value recorded after them: <b>{leaks}</b> of {rows.length}.{' '}
            {mode === 'latest'
              ? 'Looks superb, and it is a mirage: utilisation shot up after the customers defaulted, and the join handed that future value to the past.'
              : 'This is what the system could have known. The rule misses two defaults whose utilisation only rose later, which is a true answer about this feature.'}
          </p>
        </div>
        <p className="viz-cap">Invented customers, dates and values. A real join does this for millions of rows; the point is the rule: for each event, take the newest value recorded on or before the event, and no older than the time-to-live.</p>
      </div>
    </Root>
  );
}
