import { useEffect, useMemo, useState } from 'react';
import { Root } from './shared';
import {
  DISTRACTOR_LABEL,
  KEYWORD_COUNT,
  ROOMS,
  STREAM_SECONDS,
  buildStream,
  falseAcceptSources,
  falseAcceptsPerHour,
  hopSeconds,
  logMelFrames,
  matchScores,
  median,
  runDetector,
  sweepThresholds,
  type DistractorKind,
  type StreamEvent,
} from '../../lib/kws';

/*
 * The decision step of a streaming detector on two minutes of invented audio: 12 keywords hidden among 22 other
 * sounds, in a quiet room or a noisy one. The learner moves the threshold and the smoothing and sees which keywords
 * were missed, which sounds fooled the detector, and where the setting sits on the trade-off curve. The scores come
 * from the toy matched-filter model in src/lib/kws.ts, run over the real log-mel front end.
 */

type Room = keyof typeof ROOMS;
type Prepared = { scores: Float64Array; events: StreamEvent[] };
const cache = new Map<Room, Prepared>();

function prepare(room: Room): Prepared {
  const hit = cache.get(room);
  if (hit) return hit;
  const stream = buildStream(11, ROOMS[room]);
  const scores = matchScores(logMelFrames(stream.samples));
  const out = { scores, events: stream.events };
  cache.set(room, out);
  return out;
}

const PAGE_SEC = 20;
const PAGES = STREAM_SECONDS / PAGE_SEC;
const PX0 = 30;
const PX1 = 336;
const PY0 = 128; // score 0
const PY1 = 14; // score 1
const r2 = (n: number) => Math.round(n * 100) / 100;
const tx = (t: number, page: number) => r2(PX0 + ((t - page * PAGE_SEC) / PAGE_SEC) * (PX1 - PX0));
const sy = (v: number) => r2(PY0 - v * (PY0 - PY1));

const f0 = (n: number) => Math.round(n).toLocaleString('en-GB');

export default function KwsThreshold() {
  const [room, setRoom] = useState<Room>('quiet');
  const [threshold, setThreshold] = useState(0.5);
  const [smooth, setSmooth] = useState(5);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Prepared | null>(cache.get('quiet') ?? null);
  const [busy, setBusy] = useState(!cache.has('quiet'));

  useEffect(() => {
    if (cache.has(room)) {
      setData(cache.get(room)!);
      setBusy(false);
      return;
    }
    setBusy(true);
    const id = setTimeout(() => {
      setData(prepare(room));
      setBusy(false);
    }, 20);
    return () => clearTimeout(id);
  }, [room]);

  const run = useMemo(() => (data ? runDetector(data.scores, data.events, threshold, smooth) : null), [data, threshold, smooth]);
  const sweep = useMemo(() => (data ? sweepThresholds(data.scores, data.events, smooth) : []), [data, smooth]);

  if (!data || !run) {
    return (
      <Root>
        <div className="viz eb">
          <p className="viz-title">Threshold lab</p>
          <p className="eb-hint" role="status">
            Preparing two minutes of invented audio and running the detector over it. This takes a moment.
          </p>
        </div>
      </Root>
    );
  }

  const { result, smoothed, triggerFrames, triggerTimes } = run;
  const smoothMs = Math.round(smooth * hopSeconds * 1000);
  const frr = (result.misses / KEYWORD_COUNT) * 100;
  const perHour = falseAcceptsPerHour(result.falseAccepts, STREAM_SECONDS);
  const sources = falseAcceptSources(triggerTimes, data.events, result);
  const counts = new Map<string, number>();
  for (const s of sources) {
    const label = s === 'background' ? 'background noise only' : DISTRACTOR_LABEL[s as DistractorKind];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const fromList = [...counts].map(([k, n]) => (n > 1 ? `${k} (${n})` : k)).join(', ');
  const delay = median(result.delaysSec);

  const say = `Threshold ${threshold.toFixed(2)}, smoothing ${smoothMs} ms, ${room} room. Heard ${result.hits} of ${KEYWORD_COUNT} keywords (${result.misses} missed: a false-reject rate of ${Math.round(frr)}%). ${result.falseAccepts} false accept${result.falseAccepts === 1 ? '' : 's'} in two minutes, which would be ${f0(perHour)} an hour if every minute were like this${result.falseAccepts ? `. Fired by: ${fromList}` : ''}.${result.hits ? ` Median trigger time: ${f0(delay * 1000)} ms ${delay >= 0 ? 'after' : 'before'} the end of the word.` : ''}`;

  /* the page being shown */
  const t0 = page * PAGE_SEC;
  const f_a = Math.floor(t0 / hopSeconds);
  const f_b = Math.min(smoothed.length, Math.ceil((t0 + PAGE_SEC) / hopSeconds));
  const path: string[] = [];
  for (let i = f_a; i < f_b; i++) path.push(`${i === f_a ? 'M' : 'L'}${tx(i * hopSeconds + 0.032, page).toFixed(1)} ${sy(smoothed[i]).toFixed(1)}`);
  const evs = data.events
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.endSec >= t0 && e.startSec <= t0 + PAGE_SEC);
  const hitSet = new Set(result.matched.filter((m) => m >= 0));
  const trig = triggerFrames
    .map((f, k) => ({ f, k, t: triggerTimes[k], hit: result.matched[k] >= 0 }))
    .filter(({ t }) => t >= t0 && t < t0 + PAGE_SEC);

  /* the trade-off curve */
  const maxFa = Math.min(16, Math.max(4, ...sweep.map((s) => s.falseAccepts)));
  const cx = (fa: number) => r2(34 + (Math.min(fa, maxFa) / maxFa) * 296);
  const cy = (m: number) => r2(118 - (m / KEYWORD_COUNT) * 100);

  /* the overview strip */
  const ox = (t: number) => r2(4 + (t / STREAM_SECONDS) * 332);

  return (
    <Root>
      <div className="viz eb">
        <p className="viz-title">Threshold lab: 12 keywords hidden in 2 minutes</p>

        <div className="eb-chips" role="group" aria-label="Room">
          <span className="eb-chip-label">Room</span>
          <button type="button" className="eb-chip" aria-pressed={room === 'quiet'} onClick={() => setRoom('quiet')}>
            Quiet room
          </button>
          <button type="button" className="eb-chip" aria-pressed={room === 'noisy'} onClick={() => setRoom('noisy')}>
            Noisy room
          </button>
        </div>
        <div className="eb-cols">
          <label className="field">
            <span>
              Threshold <b>{threshold.toFixed(2)}</b>
            </span>
            <input type="range" min={0.05} max={0.95} step={0.01} value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
          </label>
          <label className="field">
            <span>
              Smoothing <b>{smoothMs} ms</b> ({smooth} frame{smooth === 1 ? '' : 's'})
            </span>
            <input type="range" min={1} max={25} step={1} value={smooth} onChange={(e) => setSmooth(+e.target.value)} />
          </label>
        </div>
        {busy && (
          <p className="eb-hint" role="status">
            Preparing the {room} room.
          </p>
        )}

        <svg viewBox="0 0 340 160" className="eb-svg" role="img" aria-label={`Smoothed model score from ${t0} to ${t0 + PAGE_SEC} seconds, with the threshold ${threshold.toFixed(2)}. ${trig.length} trigger${trig.length === 1 ? '' : 's'} on this page. ${say}`}>
          {evs.map(({ e, i }) => {
            const x0 = Math.max(PX0, tx(e.startSec, page));
            const x1 = Math.min(PX1, tx(e.endSec, page));
            const kw = e.kind === 'keyword';
            const cls = kw ? (hitSet.has(i) ? 'eb-ev eb-ev-kw' : 'eb-ev eb-ev-kw eb-ev-miss') : 'eb-ev eb-ev-other';
            return <rect key={i} x={x0} y={PY1} width={r2(Math.max(3, x1 - x0))} height={PY0 - PY1} className={cls} />;
          })}
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <path d={`M ${PX0} ${sy(v)} H ${PX1}`} className="eb-grid" />
              <text x={PX0 - 5} y={sy(v) + 4} textAnchor="end" className="eb-t">
                {v}
              </text>
            </g>
          ))}
          <path d={path.join(' ')} className="eb-line eb-line-bold" />
          <path d={`M ${PX0} ${sy(threshold)} H ${PX1}`} className="eb-thr" />
          {trig.map(({ f, k, hit }) => (
            <circle key={k} cx={tx(triggerTimes[k], page)} cy={sy(Math.min(1, smoothed[f]))} r="5.5" className={hit ? 'eb-dot-ok' : 'eb-dot-no'} />
          ))}
          {[0, 5, 10, 15, 20].map((s) => (
            <text key={s} x={Math.min(Math.max(PX0 + (s / PAGE_SEC) * (PX1 - PX0), 22), 330)} y={150} textAnchor="middle" className="eb-t">
              {t0 + s}s
            </text>
          ))}
        </svg>
        <div className="eb-pager">
          <button type="button" className="eb-chip" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            Earlier
          </button>
          <span className="num" aria-live="polite">
            Seconds {t0} to {t0 + PAGE_SEC} of {STREAM_SECONDS}
          </span>
          <button type="button" className="eb-chip" onClick={() => setPage((p) => Math.min(PAGES - 1, p + 1))} disabled={page === PAGES - 1}>
            Later
          </button>
        </div>
        <ul className="eb-legend">
          <li>
            <span className="eb-sw eb-sw-kw" aria-hidden="true" />
            Keyword
          </li>
          <li>
            <span className="eb-sw eb-sw-miss" aria-hidden="true" />
            Keyword that was missed
          </li>
          <li>
            <span className="eb-sw eb-sw-other" aria-hidden="true" />
            Another sound
          </li>
          <li>
            <span className="eb-dot eb-dot-ok" aria-hidden="true" />
            Fired correctly
          </li>
          <li>
            <span className="eb-dot eb-dot-no" aria-hidden="true" />
            False accept
          </li>
        </ul>

        <svg viewBox="0 0 340 30" className="eb-svg eb-strip" role="img" aria-label="Whole two-minute stream: where the keywords and other sounds are, and where the detector fired.">
          <rect x={ox(t0)} y="1" width={r2(ox(t0 + PAGE_SEC) - ox(t0))} height="28" className="eb-strip-box" />
          {data.events.map((e, i) => (
            <path key={i} d={`M ${ox(e.startSec)} ${e.kind === 'keyword' ? 12 : 18} V 27`} className={e.kind === 'keyword' ? (hitSet.has(i) ? 'eb-tick-kw' : 'eb-tick-kw eb-tick-miss') : 'eb-tick-other'} />
          ))}
          {triggerTimes.map((t, k) => (
            <circle key={k} cx={ox(t)} cy="6" r="2.6" className={result.matched[k] >= 0 ? 'eb-dot-ok' : 'eb-dot-no'} />
          ))}
        </svg>

        <p className="eb-say" aria-live="polite">
          {say}
        </p>

        <h3 className="eb-h">The trade-off for this smoothing</h3>
        <svg viewBox="0 0 340 150" className="eb-svg" role="img" aria-label={`Trade-off curve: each point is one threshold. Moving right means more false accepts, moving up means more missed keywords. The current setting misses ${result.misses} and has ${result.falseAccepts} false accepts.`}>
          <path d={`M 34 18 V 118 H 330`} className="eb-axis-line" />
          <path d={sweep.map((s, i) => `${i ? 'L' : 'M'}${cx(s.falseAccepts).toFixed(1)} ${cy(s.misses).toFixed(1)}`).join(' ')} className="eb-curve" />
          {sweep.filter((_, i) => i % 3 === 0).map((s) => (
            <circle key={s.threshold} cx={cx(s.falseAccepts)} cy={cy(s.misses)} r="2.6" className="eb-curve-dot" />
          ))}
          <circle cx={cx(result.falseAccepts)} cy={cy(result.misses)} r="6.5" className="eb-dot-now" />
          <text x="38" y="14" className="eb-t">
            missed (of {KEYWORD_COUNT})
          </text>
          <text x="330" y="146" textAnchor="end" className="eb-t">
            false accepts in 2 minutes
          </text>
          <text x="30" y="122" textAnchor="end" className="eb-t">
            0
          </text>
          <text x="34" y="136" textAnchor="middle" className="eb-t">
            0
          </text>
          <text x="330" y="136" textAnchor="end" className="eb-t">
            {maxFa}{sweep.some((s) => s.falseAccepts > maxFa) ? '+' : ''}
          </text>
        </svg>
        <p className="eb-axis">
          Each dot is one threshold, 0.05 to 0.95. The ringed dot is your setting.{' '}
          {sweep.some((s) => s.misses === 0 && s.falseAccepts === 0)
            ? 'In this room, with this smoothing, some thresholds miss nothing and fire on nothing else.'
            : 'The corner at bottom left (nothing missed, nothing false) is not reached by any threshold in this room with this smoothing.'}
        </p>
        <p className="viz-cap">Everything here is synthetic: invented sounds, a stand-in model, and only 34 events. Two minutes cannot measure a false-accept rate that matters for a product, which is why the per-hour figure above is only a scale.</p>
      </div>
    </Root>
  );
}
