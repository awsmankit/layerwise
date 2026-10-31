import { useId, useMemo, useState } from 'react';
import { Root, useNarrow } from './shared';
import { DATA_SEED, LAMBDAS, LAMBDA_NAMES, MAX_DEGREE, NOISE, SIZES, TEST, decompose, errorsByDegree, fit, learningCurve, predict, rmse, sample, truth, type Point } from '../../lib/biasvariance';

const YMIN = -2;
const YMAX = 2.4;
const GRID = Array.from({ length: 121 }, (_, i) => i / 120);
const f2 = (v: number) => (v >= 100 ? Math.round(v).toLocaleString('en-GB') : v >= 10 ? v.toFixed(1) : v.toFixed(2));

type Tab = 'capacity' | 'data';

/**
 * Fit a polynomial to a fixed set of noisy points. The sliders set how flexible the curve is and how strongly
 * it is held back (ridge penalty). Training and test error update live; "get more data" adds points.
 */
export default function FitCapacity() {
  const narrow = useNarrow('(max-width: 640px)');
  const clipId = useId().replace(/:/g, '');
  const [degree, setDegree] = useState(12);
  const [lam, setLam] = useState(0);
  const [step, setStep] = useState(0);
  const [others, setOthers] = useState(false);
  const [tab, setTab] = useState<Tab>('capacity');

  const n = SIZES[step];
  const lambda = LAMBDAS[lam];
  const train = useMemo(() => sample(DATA_SEED, n), [n]);
  const current = useMemo(() => fit(train, degree, lambda), [train, degree, lambda]);
  const trainErr = rmse(current, train);
  const testErr = rmse(current, TEST);
  const byDegree = useMemo(() => errorsByDegree(train, lambda), [train, lambda]);
  const best = byDegree.reduce((b, e) => (e.test < b.test ? e : b));
  const curve = useMemo(() => (tab === 'data' ? learningCurve(degree, lambda, SIZES) : []), [tab, degree, lambda]);
  const parts = useMemo(() => decompose(n, degree, lambda, 30), [n, degree, lambda]);
  const extra = useMemo(() => (others ? Array.from({ length: 12 }, (_, i) => fit(sample(777 + i, n), degree, lambda)) : []), [others, n, degree, lambda]);

  const W = narrow ? 300 : 640;
  const H = narrow ? 250 : 300;
  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 24;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const px = (x: number) => r1(padL + x * (W - padL - padR));
  const py = (y: number) => r1(padT + ((YMAX - Math.max(Math.min(y, 1e3), -1e3)) / (YMAX - YMIN)) * (H - padT - padB));
  const path = (f: (x: number) => number) => GRID.map((x, i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)} ${py(f(x)).toFixed(1)}`).join(' ');

  const verdict =
    testErr <= byDegree[best.degree - 1].test * 1.2 + 0.02 && trainErr > NOISE * 0.6
      ? 'About right: the curve follows the pattern and ignores most of the noise.'
      : degree < best.degree
        ? 'Too stiff (underfitting): the curve cannot bend enough, so both errors are high.'
        : trainErr < testErr * 0.6
          ? 'Too flexible (overfitting): the curve chases the noise, so training error is low but test error is much higher.'
          : 'Close, but a different setting would do better.';

  /* second chart: error against capacity, or against amount of data */
  const W2 = W;
  const H2 = narrow ? 200 : 220;
  const EMAX = 1;
  const cx = (i: number, count: number) => r1(padL + (i / (count - 1)) * (W2 - padL - padR));
  const cy = (v: number) => r1(padT + (1 - Math.min(v, EMAX) / EMAX) * (H2 - padT - padB));
  const series =
    tab === 'capacity'
      ? { xs: byDegree.map((e) => e.degree), tr: byDegree.map((e) => e.train), te: byDegree.map((e) => e.test), at: degree - 1, ticks: [1, 5, 10, 15], xlabel: 'degree (flexibility)' }
      : { xs: curve.map((c) => c.n), tr: curve.map((c) => c.train), te: curve.map((c) => c.test), at: step, ticks: SIZES, xlabel: 'training points' };
  const line = (v: number[]) => v.map((y, i) => `${i ? 'L' : 'M'}${cx(i, v.length).toFixed(1)} ${cy(y).toFixed(1)}`).join(' ');
  const off = [...series.tr, ...series.te].some((v) => v > EMAX);

  const bar = (v: number) => Math.min(100, (v / 0.5) * 100);

  return (
    <Root>
      <div className="viz mb-fit">
        <p className="viz-title">Fit a curve to {n} noisy points</p>

        <div className="viz-controls">
          <label className="field">
            <span>
              Flexibility (polynomial degree) <b>{degree}</b>
            </span>
            <input type="range" min={1} max={MAX_DEGREE} step={1} value={degree} onChange={(e) => setDegree(+e.target.value)} aria-valuetext={`degree ${degree}`} />
          </label>
          <label className="field">
            <span>
              Regulariser (ridge penalty) <b>{LAMBDA_NAMES[lam]}</b>
            </span>
            <input type="range" min={0} max={LAMBDAS.length - 1} step={1} value={lam} onChange={(e) => setLam(+e.target.value)} aria-valuetext={LAMBDA_NAMES[lam]} />
          </label>
        </div>
        <div className="mb-actions">
          <button type="button" className="btn quiet" disabled={step >= SIZES.length - 1} onClick={() => setStep(step + 1)}>
            Get more data{step < SIZES.length - 1 ? ` (${n} to ${SIZES[step + 1]} points)` : ' (at the most)'}
          </button>
          <button type="button" className="btn quiet" disabled={step === 0} onClick={() => setStep(0)}>
            Back to {SIZES[0]} points
          </button>
          <button type="button" className="btn quiet" aria-pressed={others} onClick={() => setOthers(!others)}>
            {others ? 'Hide' : 'Show'} 12 other samples
          </button>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="mb-svg" role="img" aria-label={`Scatter of ${n} noisy training points with a fitted polynomial of degree ${degree}. Training error ${f2(trainErr)}, test error ${f2(testErr)}.`}>
          <defs>
            <clipPath id={clipId}>
              <rect x={padL} y={padT} width={W - padL - padR} height={H - padT - padB} />
            </clipPath>
          </defs>
          <rect x={padL} y={padT} width={W - padL - padR} height={H - padT - padB} className="mb-frame" />
          {[-1, 0, 1, 2].map((v) => (
            <g key={v}>
              <path d={`M${padL} ${py(v)} H${W - padR}`} className="mb-grid" />
              <text x={padL - 6} y={py(v) + 4} textAnchor="end" className="mb-tick">{v}</text>
            </g>
          ))}
          <text x={padL} y={H - 6} className="mb-tick">0</text>
          <text x={W - padR} y={H - 6} textAnchor="end" className="mb-tick">1</text>
          <g clipPath={`url(#${clipId})`}>
            <path d={path(truth)} className="mb-truth" />
            {extra.map((f, i) => (
              <path key={i} d={path((x) => predict(f, x))} className="mb-other" />
            ))}
            <path d={path((x) => predict(current, x))} className="mb-curve" />
            {train.map((p: Point, i) => (
              <circle key={i} cx={px(p.x)} cy={py(p.y)} r={narrow ? 3.5 : 4} className="mb-dot" />
            ))}
          </g>
        </svg>
        <p className="mb-legend">
          <span><i className="mb-sw mb-sw-dot" />training points</span>
          <span><i className="mb-sw mb-sw-curve" />fitted curve</span>
          <span><i className="mb-sw mb-sw-truth" />the hidden pattern</span>
          {others && <span><i className="mb-sw mb-sw-other" />fits to 12 other samples</span>}
        </p>

        <div className="mb-result" aria-live="polite" role="status">
          <div className="mb-pair">
            <p className="mb-big">
              <span className="mb-label">Training error</span>
              <b style={{ color: 'var(--ok)' }}>{f2(trainErr)}</b>
            </p>
            <p className="mb-big">
              <span className="mb-label">Test error</span>
              <b style={{ color: 'var(--warn)' }}>{f2(testErr)}</b>
            </p>
          </div>
          <p className="mb-small">Both are typical misses in the units of the vertical axis (root mean squared error). The test error uses {TEST.length} fresh points the curve never saw. Noise alone gives about {NOISE.toFixed(2)}, so no model can score much below that on test.</p>
          <p className="mb-small mb-verdict">{verdict}</p>
        </div>

        <div className="mb-actions" role="group" aria-label="Second chart">
          <button type="button" className="btn quiet" aria-pressed={tab === 'capacity'} onClick={() => setTab('capacity')}>
            Error against flexibility
          </button>
          <button type="button" className="btn quiet" aria-pressed={tab === 'data'} onClick={() => setTab('data')}>
            Learning curve: error against data
          </button>
        </div>
        <svg viewBox={`0 0 ${W2} ${H2}`} className="mb-svg" role="img" aria-label={tab === 'capacity' ? `Training error falls as degree rises; test error is lowest near degree ${best.degree} and then rises.` : 'Learning curve: as training points increase, training error rises and test error falls until they meet.'}>
          <rect x={padL} y={padT} width={W2 - padL - padR} height={H2 - padT - padB} className="mb-frame" />
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <path d={`M${padL} ${cy(v)} H${W2 - padR}`} className="mb-grid" />
              <text x={padL - 6} y={cy(v) + 4} textAnchor="end" className="mb-tick">{v}</text>
            </g>
          ))}
          <path d={`M${padL} ${cy(NOISE)} H${W2 - padR}`} className="mb-floor" />
          {series.ticks.map((t) => {
            const i = series.xs.indexOf(t);
            return i < 0 ? null : (
              <text key={t} x={cx(i, series.xs.length)} y={H2 - 6} textAnchor="middle" className="mb-tick">{t}</text>
            );
          })}
          {series.xs.length > 1 && (
            <>
              <path d={line(series.tr)} className="mb-line mb-line-train" />
              <path d={line(series.te)} className="mb-line mb-line-test" />
              <path d={`M${cx(series.at, series.xs.length)} ${padT} V${H2 - padB}`} className="mb-here" />
              <circle cx={cx(series.at, series.xs.length)} cy={cy(series.tr[series.at])} r="4.5" className="mb-pt mb-pt-train" />
              <circle cx={cx(series.at, series.xs.length)} cy={cy(series.te[series.at])} r="4.5" className="mb-pt mb-pt-test" />
            </>
          )}
        </svg>
        <p className="mb-legend">
          <span><i className="mb-sw mb-sw-train" />training error</span>
          <span><i className="mb-sw mb-sw-test" />test error</span>
          <span><i className="mb-sw mb-sw-floor" />noise floor ({NOISE.toFixed(2)})</span>
          <span>{series.xlabel}</span>
        </p>
        <p className="viz-cap">
          {tab === 'capacity'
            ? `Same ${n} points and the same regulariser, every degree from 1 to ${MAX_DEGREE}. The lowest test error is at degree ${best.degree}.`
            : `Average of 12 different training sets at each size, using your current degree and regulariser. If the lines meet high up, more data will not help; if there is a wide gap, it will.`}
          {off && ' Values above 1 are cut off at the top of the chart.'}
        </p>

        <p className="viz-title" style={{ marginTop: '1.4rem', marginBottom: '0.5rem' }}>Where the test error comes from (average of 30 different training sets of {n} points)</p>
        <div className="mb-parts">
          {[
            { name: 'Bias squared', v: parts.bias2, hint: 'wrong on average' },
            { name: 'Variance', v: parts.variance, hint: 'changes with the sample' },
            { name: 'Noise', v: parts.noise, hint: 'cannot be removed' },
          ].map((p) => (
            <div key={p.name} className="mb-part">
              <span>{p.name}</span>
              <div className="mb-bar" aria-hidden="true">
                <i style={{ width: `${bar(p.v)}%` }} />
              </div>
              <b>{f2(p.v)}</b>
              <small>{p.hint}</small>
            </div>
          ))}
        </div>
        <p className="viz-cap">The three add up to about the mean squared test error ({f2(parts.meanTestMse)}). Bars stop at 0.5; the number beside each bar is the real value.</p>
      </div>
    </Root>
  );
}
