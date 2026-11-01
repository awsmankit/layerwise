import { useEffect, useMemo, useState } from 'react';
import { Root, useNarrow } from './shared';
import { leakDemo, makeSeries, meanOf, METHODS, rollingOrigins, type MethodId } from '../../lib/forecasting';

const PICK: MethodId[] = ['snaive', 'hw', 'gbChange', 'gbLevel'];
const INITIAL = 48;
const HORIZON = 12;
const STEP = 6;
const f1 = (x: number) => x.toFixed(1);

/** A rolling-origin backtest, one origin at a time, and what a shuffled split would have hidden. */
export default function RollingBacktest() {
  const narrow = useNarrow();
  const [method, setMethod] = useState<MethodId>('hw');
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const series = useMemo(() => makeSeries({ trend: 0.5, season: 1, noise: 4, seed: 1 }), []);
  const origins = useMemo(() => rollingOrigins(series, method, { initial: INITIAL, horizon: HORIZON, step: STEP }), [series, method]);
  const leak = useMemo(() => leakDemo(series, 1), [series]);
  const n = origins.length;
  const cur = origins[Math.min(idx, n - 1)];

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setIdx((i) => {
        if (i >= n - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [playing, n]);

  const meanMae = meanOf(origins.map((o) => o.mae));
  const meanBase = meanOf(origins.map((o) => o.baselineMae));
  const meanMase = meanOf(origins.map((o) => o.mase));

  const W = narrow ? 280 : 640;
  const H1 = narrow ? 210 : 240;
  const ML = 34;
  const MR = 8;
  const MT = 10;
  const MB = 22;
  const lo = 60;
  const hi = 200;
  const total = series.length;
  const sx = (t: number) => ML + (t / (total - 1)) * (W - ML - MR);
  const sy = (v: number) => H1 - MB - ((v - lo) / (hi - lo)) * (H1 - MT - MB);
  const line = (from: number, vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${sx(from + i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');

  const H2 = narrow ? 170 : 190;
  const maxErr = Math.max(...origins.map((o) => Math.max(o.mae, o.baselineMae)), 1) * 1.15;
  const by = (v: number) => H2 - 24 - (v / maxErr) * (H2 - 40);
  const bw = (W - ML - MR) / n;

  const status = `Origin ${idx + 1} of ${n}: trained on the first ${cur.origin} months, forecast months ${cur.origin + 1} to ${cur.origin + HORIZON}. ${METHODS.find((m) => m.id === method)!.short} average error ${f1(cur.mae)}, seasonal naive ${f1(cur.baselineMae)}. Across all ${n} origins the average error is ${f1(meanMae)} against ${f1(meanBase)} for seasonal naive (MASE ${meanMase.toFixed(2)}).`;

  return (
    <Root>
      <div className="viz ap1">
        <p className="viz-title">Rolling-origin backtest</p>
        <p className="ap1-note">
          Invented 108-month series. The first forecast is made after month 48. The origin then moves forward 6 months at a time, always training only on the past and forecasting the next 12 months. Nine forecasts, nine honest scores.
        </p>
        <div className="ap1-btns" role="group" aria-label="Method">
          {PICK.map((id) => (
            <button key={id} type="button" className="btn quiet" aria-pressed={method === id} onClick={() => setMethod(id)}>
              {METHODS.find((m) => m.id === id)!.short}
            </button>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H1}`} className="ap1-svg" role="img" aria-label={`The series with the training window up to month ${cur.origin}, the next ${HORIZON} months highlighted, and the forecast line. ${status}`}>
          <rect x={ML} y={MT} width={W - ML - MR} height={H1 - MT - MB} className="ap1-frame" />
          <rect x={sx(cur.origin - 0.5)} y={MT} width={sx(cur.origin + HORIZON - 0.5) - sx(cur.origin - 0.5)} height={H1 - MT - MB} className="ap1-band" />
          {[80, 120, 160].map((t) => (
            <g key={t}>
              <line x1={ML} x2={W - MR} y1={sy(t)} y2={sy(t)} className="ap1-grid-line" />
              <text x={ML - 6} y={sy(t) + 4} textAnchor="end" className="ap1-tick">{t}</text>
            </g>
          ))}
          <path d={line(0, series.slice(0, cur.origin))} className="ap1-line hist" />
          <path d={line(cur.origin, cur.actual)} className="ap1-line truth" />
          <path d={line(cur.origin, cur.forecast)} className="ap1-line fc" />
          {[0, 24, 48, 72, 96].map((t) => (
            <text key={t} x={sx(t)} y={H1 - 6} textAnchor="middle" className="ap1-tick">{t}</text>
          ))}
        </svg>
        <p className="ap1-legend-row">
          <span><i className="ap1-sw hist" />months the method may use</span>
          <span><i className="ap1-sw truth" />what happened next</span>
          <span><i className="ap1-sw fc" />forecast</span>
        </p>

        <p className="ap1-h">Average error at each origin (lower is better)</p>
        <svg viewBox={`0 0 ${W} ${H2}`} className="ap1-svg" role="img" aria-label={`Bars of the average absolute error at each of the ${n} origins for the chosen method, with a marker for the seasonal-naive baseline at the same origin.`}>
          <rect x={ML} y={6} width={W - ML - MR} height={H2 - 30} className="ap1-frame" />
          {origins.map((o, i) => {
            const x = ML + i * bw;
            return (
              <g key={i} className={i === idx ? 'is-cur' : ''}>
                <rect x={x + 4} y={by(o.mae)} width={bw - 8} height={Math.max(0, H2 - 24 - by(o.mae))} className="ap1-bar" />
                <line x1={x + 2} x2={x + bw - 2} y1={by(o.baselineMae)} y2={by(o.baselineMae)} className="ap1-basemark" />
                <text x={x + bw / 2} y={H2 - 8} textAnchor="middle" className="ap1-tick">{o.origin}</text>
              </g>
            );
          })}
          <line x1={ML} x2={W - MR} y1={by(meanMae)} y2={by(meanMae)} className="ap1-mean" />
          <text x={ML + 4} y={by(meanMae) - 4} className="ap1-tick">mean {f1(meanMae)}</text>
        </svg>
        <p className="ap1-small">Bars are the chosen method. The dark tick on each bar is the seasonal-naive baseline for the same origin. Labels are the origin month.</p>

        <div className="ap1-ctrls">
          <label className="field">
            <span>Origin <b>{idx + 1}</b> of {n}</span>
            <input type="range" min={0} max={n - 1} step={1} value={idx} onChange={(e) => { setPlaying(false); setIdx(+e.target.value); }} />
          </label>
        </div>
        <div className="ap1-btns">
          <button type="button" className="btn quiet" onClick={() => { if (idx >= n - 1) setIdx(0); setPlaying((p) => !p); }}>
            {playing ? 'Pause' : idx >= n - 1 ? 'Replay' : 'Play the origins'}
          </button>
        </div>
        <p className="ap1-readout" role="status" aria-live="polite">{status}</p>

        <p className="ap1-h">What a shuffled split would have said about the same series</p>
        <p className="ap1-small">
          Linear model on lag features, one month ahead, average error on this series. The first two rows use a random 25% of months as the test set. The third forecasts each of the last 24 months from the months before it only.
        </p>
        <ul className="ap1-bars">
          <li>
            <span className="ap1-bl">Shuffled split, honest features</span>
            <span className="ap1-track"><i style={{ width: `${Math.round((Math.min(100, (leak.randomSplitMae / 12) * 100)) * 10) / 10}%` }} /></span>
            <b>{f1(leak.randomSplitMae)}</b>
          </li>
          <li className="ap1-leaky">
            <span className="ap1-bl">Shuffled split, with a feature that includes the month itself</span>
            <span className="ap1-track"><i style={{ width: `${Math.round((Math.min(100, (leak.leakyRandomSplitMae / 12) * 100)) * 10) / 10}%` }} /></span>
            <b>{leak.leakyRandomSplitMae < 0.05 ? '0.0' : f1(leak.leakyRandomSplitMae)}</b>
          </li>
          <li>
            <span className="ap1-bl">Rolling origin, honest features</span>
            <span className="ap1-track"><i style={{ width: `${Math.round((Math.min(100, (leak.honestMae / 12) * 100)) * 10) / 10}%` }} /></span>
            <b>{f1(leak.honestMae)}</b>
          </li>
        </ul>
        <p className="viz-cap">Bars are scaled to an error of 12. The leaky feature is a 3-month rolling average that ends on the month being predicted: the one-line mistake of forgetting to shift it by a month. The shuffled split calls the model perfect. In production the feature would not exist yet.</p>
      </div>
    </Root>
  );
}
