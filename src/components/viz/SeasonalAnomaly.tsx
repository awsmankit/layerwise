import { useMemo, useState } from 'react';
import { Root, useNarrow } from './shared';
import { makeSeasonalSeries, median, seasonalScores } from '../../lib/anomaly';

type Method = 'global' | 'seasonal';
const START: Record<Method, number> = { global: 3, seasonal: 5 };

const when = (i: number) => `day ${Math.floor(i / 24) + 1} at ${String(i % 24).padStart(2, '0')}:00`;

/**
 * A week of hourly traffic with a daily cycle and three planted anomalies, one of which is a perfectly ordinary daytime value
 * arriving at 03:00. A plain z-score cannot see it; scoring against the same hour on other days can.
 */
export default function SeasonalAnomaly() {
  const narrow = useNarrow();
  const [method, setMethod] = useState<Method>('global');
  const [thr, setThr] = useState(START.global);
  const [pattern, setPattern] = useState(false);

  const series = useMemo(() => makeSeasonalSeries(2), []);
  const { values, anomalies, period } = series;
  const scores = useMemo(() => seasonalScores(values, period, method), [values, period, method]);
  const flagged = scores.map((s, i) => (s >= thr ? i : -1)).filter((i) => i >= 0);
  const truth = new Set(anomalies.map((a) => a.index));
  const caught = flagged.filter((i) => truth.has(i));
  const falseAlarms = flagged.filter((i) => !truth.has(i));
  const missed = anomalies.filter((a) => !flagged.includes(a.index));

  const hourMedian = useMemo(() => Array.from({ length: period }, (_, p) => median(values.filter((_, i) => i % period === p))), [values, period]);

  const W = narrow ? 340 : 560;
  const H = narrow ? 230 : 250;
  const L = 34;
  const R = 8;
  const T = 10;
  const B = 28;
  const ymax = 300;
  const x = (i: number) => L + (i / (values.length - 1)) * (W - L - R);
  const y = (v: number) => H - B - (v / ymax) * (H - T - B);
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const pat = values.map((_, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(hourMedian[i % period]).toFixed(1)}`).join(' ');

  const status = `${method === 'global' ? 'Plain z-score of the raw values' : 'Robust score of what is left after subtracting the usual value for that hour'}, threshold ${thr.toFixed(1)}. ${flagged.length} hour${flagged.length === 1 ? '' : 's'} flagged: ${flagged.length ? flagged.map(when).join('; ') : 'none'}. ${caught.length} of 3 planted anomalies caught, ${falseAlarms.length} false alarm${falseAlarms.length === 1 ? '' : 's'}.${missed.length ? ` Missed: ${missed.map((a) => a.why).join('; ')}.` : ''}`;

  return (
    <Root>
      <div className="viz ap2 ap2-seas">
        <p className="viz-title">The same value, normal at 3 pm and alarming at 3 am</p>
        <div className="ap2-row" role="group" aria-label="Scoring method">
          <span className="ap2-lab">Score</span>
          <button type="button" className="btn quiet" aria-pressed={method === 'global'} onClick={() => { setMethod('global'); setThr(START.global); }}>
            Plain z-score
          </button>
          <button type="button" className="btn quiet" aria-pressed={method === 'seasonal'} onClick={() => { setMethod('seasonal'); setThr(START.seasonal); }}>
            Against the same hour
          </button>
          <button type="button" className="btn quiet" aria-pressed={pattern} onClick={() => setPattern((p) => !p)}>
            {pattern ? 'Hide' : 'Show'} the usual daily pattern
          </button>
        </div>
        <label className="field ap2-seas-field">
          <span>
            Flag when the score is at least <b>{thr.toFixed(1)}</b>
          </span>
          <input type="range" min={1} max={12} step={0.1} value={thr} onChange={(e) => setThr(+e.target.value)} />
        </label>

        <svg viewBox={`0 0 ${W} ${H}`} className="ap2-svg ap2-seas-svg" role="img" aria-label={`Line chart of 168 hourly values over seven days with a daily cycle. Planted anomalies: ${anomalies.map((a) => a.why).join('; ')}. ${flagged.length} hours are flagged at this threshold.`}>
          <rect x={L} y={T} width={W - L - R} height={H - T - B} className="ap2-frame" />
          {[0, 100, 200, 300].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="ap2-gridline" />
              <text x={L - 5} y={y(v) + 4} textAnchor="end" className="ap2-t">
                {v}
              </text>
            </g>
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <g key={d}>
              <line x1={x(d * 24)} x2={x(d * 24)} y1={T} y2={H - B} className="ap2-gridline" />
              <text x={x(d * 24 + 12)} y={H - 9} textAnchor="middle" className="ap2-t">
                {narrow ? d + 1 : `day ${d + 1}`}
              </text>
            </g>
          ))}
          {pattern && <path d={pat} className="ap2-pattern" />}
          <path d={path} className="ap2-series" />
          {anomalies.map((a) => (
            <path key={a.index} d={`M${x(a.index)},${y(values[a.index]) - 6} l6,6 l-6,6 l-6,-6 z`} className="ap2-anom-pt" />
          ))}
          {flagged.map((i) => (
            <circle key={i} cx={x(i)} cy={y(values[i])} r={9} className="ap2-ring" />
          ))}
        </svg>
        <p className="ap2-legend ap2-legend-row">
          <span><i className="ap2-key-d" /> planted anomaly</span>
          <span><i className="ap2-key-r" /> flagged</span>
          <span>vertical axis: requests per hour (example numbers); horizontal axis: day 1 to 7</span>
        </p>

        <p className="ap2-readout" role="status" aria-live="polite">
          {status}
        </p>
        <p className="viz-cap">
          Made-up example series: seven days of hourly counts, a daily cycle between about 30 (03:00) and 170 (15:00), noise, and three planted anomalies. The seasonal score subtracts the median of the seven values for each hour of the day, then takes the robust (median and MAD) score of what is left.
        </p>
      </div>
    </Root>
  );
}
