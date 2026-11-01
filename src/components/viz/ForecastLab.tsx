import { useMemo, useState } from 'react';
import { Root, useNarrow } from './shared';
import { forecast, mae, makeSeries, mase, METHODS, seasonalNaiveForecast, type MethodId } from '../../lib/forecasting';

const TRAIN = 84;
const MAX_H = 24;
const SHOW_BACK = 36;

const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);

/** Pick a forecasting method and a horizon on an invented monthly series, and see the forecast against the months that were held out. */
export default function ForecastLab() {
  const narrow = useNarrow();
  const [trend, setTrend] = useState(0.5);
  const [season, setSeason] = useState(1);
  const [noise, setNoise] = useState(4);
  const [seed, setSeed] = useState(1);
  const [h, setH] = useState(12);
  const [method, setMethod] = useState<MethodId>('hw');

  const series = useMemo(() => makeSeries({ trend, season, noise, seed, n: TRAIN + MAX_H }), [trend, season, noise, seed]);
  const train = series.slice(0, TRAIN);
  const all = useMemo(() => {
    const out = {} as Record<MethodId, number[]>;
    for (const m of METHODS) out[m.id] = forecast(m.id, train, MAX_H);
    return out;
  }, [train]);

  const test = series.slice(TRAIN, TRAIN + h);
  const base = seasonalNaiveForecast(train, h);
  const baseMae = mae(test, base);
  const rows = METHODS.map((m) => {
    const fc = all[m.id].slice(0, h);
    const e = mae(test, fc);
    return { ...m, mae: e, mase: mase(test, fc, train), ratio: baseMae > 1e-9 ? e / baseMae : NaN };
  });
  const cur = rows.find((r) => r.id === method)!;
  const fc = all[method].slice(0, h);

  const W = narrow ? 280 : 640;
  const H = narrow ? 250 : 280;
  const ML = 40;
  const MR = 10;
  const MT = 12;
  const MB = 26;
  const first = TRAIN - SHOW_BACK;
  const last = TRAIN + h - 1;
  const vals = [...series.slice(first, TRAIN + h), ...fc, ...base];
  const lo = Math.floor((Math.min(...vals) - 5) / 10) * 10;
  const hi = Math.ceil((Math.max(...vals) + 5) / 10) * 10;
  const sx = (t: number) => ML + ((t - first) / (last - first)) * (W - ML - MR);
  const sy = (v: number) => H - MB - ((v - lo) / (hi - lo)) * (H - MT - MB);
  const path = (ts: number[], vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${sx(ts[i]).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  const trainTs = Array.from({ length: SHOW_BACK }, (_, i) => first + i);
  const testTs = Array.from({ length: h }, (_, i) => TRAIN + i);
  const ticks = [lo, lo + (hi - lo) / 2, hi];

  const beats = isFinite(cur.ratio) && cur.ratio < 1;
  const status = `${cur.short} over the next ${h} months: average error ${f1(cur.mae)}, MASE ${f2(cur.mase)}. ${
    method === 'snaive'
      ? 'This is the seasonal-naive baseline itself.'
      : isFinite(cur.ratio)
        ? `That is ${f2(cur.ratio)} times the seasonal-naive baseline's error, so it ${beats ? 'beats' : 'does not beat'} the baseline.`
        : 'The baseline is exact on this series, so there is nothing to compare against.'
  }`;

  return (
    <Root>
      <div className="viz ap1">
        <div className="ap1-top">
          <p className="viz-title">Forecasting lab</p>
          <button type="button" className="btn quiet" onClick={() => setSeed((s) => s + 1)}>New random series</button>
        </div>
        <p className="ap1-note">
          An invented monthly series: 84 months to learn from, then months that are held back to test on. The chart shows the last 3 years of history, the held-back months (solid) and the forecast.
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="ap1-svg" role="img" aria-label={`Line chart of an invented monthly series. History, then the held-back months, then the ${cur.short} forecast. Average error ${f1(cur.mae)}.`}>
          <rect x={ML} y={MT} width={W - ML - MR} height={H - MT - MB} className="ap1-frame" />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={ML} x2={W - MR} y1={sy(t)} y2={sy(t)} className="ap1-grid-line" />
              <text x={ML - 6} y={sy(t) + 4} textAnchor="end" className="ap1-tick">{Math.round(t)}</text>
            </g>
          ))}
          <line x1={sx(TRAIN - 0.5)} x2={sx(TRAIN - 0.5)} y1={MT} y2={H - MB} className="ap1-cut" />
          <text x={sx(TRAIN - 0.5) - 4} y={MT + 12} textAnchor="end" className="ap1-tick">history</text>
          {sx(TRAIN - 0.5) + 74 < W - MR ? (
            <text x={sx(TRAIN - 0.5) + 4} y={MT + 12} className="ap1-tick">held back</text>
          ) : (
            <text x={sx(TRAIN - 0.5) - 4} y={MT + 26} textAnchor="end" className="ap1-tick">held back: right</text>
          )}
          <path d={path(trainTs, series.slice(first, TRAIN))} className="ap1-line hist" />
          <path d={path(testTs, test)} className="ap1-line truth" />
          {method !== 'snaive' && <path d={path(testTs, base)} className="ap1-line base" />}
          <path d={path(testTs, fc)} className="ap1-line fc" />
          {[0, 12, 24, 36, 48].map((i) => (i < SHOW_BACK ? <text key={i} x={sx(first + i)} y={H - 8} textAnchor="middle" className="ap1-tick">{`m${first + i + 1}`}</text> : null))}
        </svg>
        <p className="ap1-legend-row">
          <span><i className="ap1-sw hist" />history</span>
          <span><i className="ap1-sw truth" />what really happened</span>
          <span><i className="ap1-sw fc" />forecast: {cur.short}</span>
          {method !== 'snaive' && <span><i className="ap1-sw base" />seasonal naive</span>}
        </p>

        <div className="ap1-ctrls">
          <label className="field">
            <span>Forecast horizon <b>{h}</b> months</span>
            <input type="range" min={3} max={MAX_H} step={1} value={h} onChange={(e) => setH(+e.target.value)} />
          </label>
          <label className="field">
            <span>Trend per month <b>{trend.toFixed(1)}</b></span>
            <input type="range" min={0} max={2} step={0.1} value={trend} onChange={(e) => setTrend(+e.target.value)} />
          </label>
          <label className="field">
            <span>Seasonal swing <b>{season.toFixed(1)}</b></span>
            <input type="range" min={0} max={2} step={0.1} value={season} onChange={(e) => setSeason(+e.target.value)} />
          </label>
          <label className="field">
            <span>Noise <b>{noise}</b></span>
            <input type="range" min={0} max={12} step={1} value={noise} onChange={(e) => setNoise(+e.target.value)} />
          </label>
        </div>

        <p className="ap1-h">Pick a method. Error compared with the seasonal-naive baseline (a bar shorter than the black tick beats it):</p>
        <ul className="ap1-methods">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" aria-pressed={method === r.id} className={`ap1-mbtn ${method === r.id ? 'is-sel' : ''}`} onClick={() => setMethod(r.id)} title={r.label}>
                <span className="ap1-mname">{r.short}</span>
                <span className="ap1-mbar" aria-hidden="true">
                  <i style={{ width: `${Math.round((isFinite(r.ratio) ? Math.min(100, (r.ratio / 2) * 100) : 0) * 10) / 10}%` }} className={isFinite(r.ratio) && r.ratio < 1 ? 'win' : ''} />
                  <u />
                </span>
                <span className="ap1-mnum">{isFinite(r.ratio) ? `${f2(r.ratio)}x` : '-'}</span>
                <span className="ap1-mnum dim">MASE {f2(r.mase)}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="ap1-small">{cur.label}. The bar is cut off at 2 times the baseline error.</p>
        <p className="ap1-readout" role="status" aria-live="polite">{status}</p>
        <p className="viz-cap">Try a strong trend (2.0) and a 24-month horizon: the boosted trees that predict the level stall, while the one that predicts the change from last year keeps climbing. Set the seasonal swing to 0 and notice that the seasonal-naive baseline gets worse than a plain average.</p>
      </div>
    </Root>
  );
}
