import { useMemo, useState } from 'react';
import { Root } from './shared';
import { benchmarkSeries, summarise, type BenchmarkModel, type Stat } from '../../lib/realtime-budget';

/*
 * One number from a benchmark depends on which runs you keep and which statistic you report. The 600 run times
 * below are invented (a seeded series with a slow start and a later thermal slowdown), not a measurement of any
 * device. The learner picks how many early runs to skip, how many to measure and the statistic, and sees how far
 * the headline number sits from what a user would get after the chip has been working for a while.
 */

const MODEL: BenchmarkModel = { steadyMs: 8, warmupRuns: 12, warmupFactor: 6, throttleStart: 250, throttleRamp: 120, throttleFactor: 1.45, noise: 0.03 };
const RUNS = 600;
const Y_MAX = 30;
const X0 = 34;
const X1 = 334;
const Y0 = 142; // value 0
const Y1 = 10; // value Y_MAX
const r2 = (n: number) => Math.round(n * 100) / 100;
const xOf = (i: number) => r2(X0 + (i / RUNS) * (X1 - X0));
const yOf = (v: number) => r2(Y0 - (Math.min(v, Y_MAX) / Y_MAX) * (Y0 - Y1));

const STATS: { id: Stat; label: string }[] = [
  { id: 'mean', label: 'Mean' },
  { id: 'median', label: 'Median' },
  { id: 'p99', label: 'p99' },
  { id: 'max', label: 'Slowest' },
];
const STAT_WORD: Record<Stat, string> = { mean: 'mean', median: 'median', p99: '99th percentile', max: 'slowest run' };

const PRESETS = [
  { label: 'Quick test: first 10 runs, mean', skip: 0, count: 10, stat: 'mean' as Stat },
  { label: 'Warmed up: skip 50, next 150, median', skip: 50, count: 150, stat: 'median' as Stat },
  { label: 'Long run: all 600 runs, p99', skip: 0, count: 600, stat: 'p99' as Stat },
];

const f1 = (n: number) => n.toFixed(1);

export default function BenchmarkLies() {
  const [skip, setSkip] = useState(0);
  const [count, setCount] = useState(10);
  const [stat, setStat] = useState<Stat>('mean');
  const series = useMemo(() => benchmarkSeries(RUNS, MODEL, 3), []);
  const path = useMemo(() => Array.from(series, (v, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' '), [series]);

  const kept = Math.max(0, Math.min(count, RUNS - skip));
  const reported = summarise(series, skip, kept, stat);
  const settled = summarise(series, 50, 150, 'median');
  const sustained = summarise(series, 400, 200, 'median');
  const sustainedP99 = summarise(series, 400, 200, 'p99');
  const diff = (reported / sustained - 1) * 100;

  const say = `You would report ${f1(reported)} ms, the ${STAT_WORD[stat]} of runs ${skip + 1} to ${skip + kept}. After the chip has been busy for a while (runs 401 to 600) the median is ${f1(sustained)} ms and the 99th percentile ${f1(sustainedP99)} ms. Your number is ${Math.abs(diff) < 3 ? 'within 3% of the sustained median' : diff < 0 ? `${Math.round(-diff)}% lower than the sustained median: a flattering figure` : `${Math.round(diff)}% higher than the sustained median`}.`;

  return (
    <Root>
      <div className="viz eb">
        <p className="viz-title">One benchmark, many numbers</p>
        <div className="eb-chips" role="group" aria-label="Starting points">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="eb-chip"
              onClick={() => {
                setSkip(p.skip);
                setCount(p.count);
                setStat(p.stat);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="eb-cols">
          <div>
            <label className="field">
              <span>
                Skip the first <b>{skip} runs</b>
              </span>
              <input type="range" min={0} max={200} step={5} value={skip} onChange={(e) => setSkip(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                Then measure <b>{kept} runs</b>
              </span>
              <input type="range" min={5} max={600} step={5} value={count} onChange={(e) => setCount(+e.target.value)} />
            </label>
          </div>
          <div className="eb-chips" role="group" aria-label="Statistic to report">
            <span className="eb-chip-label">Report</span>
            {STATS.map((s) => (
              <button key={s.id} type="button" className="eb-chip" aria-pressed={stat === s.id} onClick={() => setStat(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 340 168" className="eb-svg" role="img" aria-label={`Latency of 600 invented runs. The first runs are slow while the device warms up, then it settles near ${f1(settled)} milliseconds, then slows to about ${f1(sustained)} milliseconds once it heats up. You are measuring runs ${skip + 1} to ${skip + kept} and would report ${f1(reported)} milliseconds.`}>
          <rect x={xOf(skip)} y={Y1} width={r2(Math.max(2, xOf(skip + kept) - xOf(skip)))} height={Y0 - Y1} className="eb-win" />
          {[0, 10, 20, 30].map((v) => (
            <g key={v}>
              <path d={`M ${X0} ${yOf(v)} H ${X1}`} className="eb-grid" />
              <text x={X0 - 5} y={yOf(v) + 4} textAnchor="end" className="eb-t">
                {v}
              </text>
            </g>
          ))}
          <path d={path} className="eb-line" />
          <path d={`M ${X0} ${yOf(sustained)} H ${X1}`} className="eb-ref" />
          <path d={`M ${X0} ${yOf(reported)} H ${X1}`} className="eb-rep" />
          {[0, 200, 400, 600].map((i) => (
            <text key={i} x={r2(Math.min(Math.max(xOf(i), 16), 328))} y={162} textAnchor="middle" className="eb-t">
              {i}
            </text>
          ))}
        </svg>
        <p className="eb-axis">Vertical: milliseconds for one inference (clipped at 30). Horizontal: run number.</p>
        <ul className="eb-legend">
          <li>
            <span className="eb-sw eb-sw-win" aria-hidden="true" />
            Runs you measure
          </li>
          <li>
            <span className="eb-sw eb-sw-rep" aria-hidden="true" />
            Your reported number: <b className="num">{f1(reported)} ms</b>
          </li>
          <li>
            <span className="eb-sw eb-sw-ref" aria-hidden="true" />
            Sustained median (runs 401 to 600): <b className="num">{f1(sustained)} ms</b>
          </li>
        </ul>
        <p className="eb-say" aria-live="polite">
          {say}
        </p>
        <p className="viz-cap">These 600 run times are invented: a seeded series with a slow start (cold caches, lazy set-up), a stretch where the device runs at its settled speed, and a later slowdown as it heats up. No real device is being measured.</p>
      </div>
    </Root>
  );
}
