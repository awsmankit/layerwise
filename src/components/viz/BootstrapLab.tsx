import { useEffect, useMemo, useRef, useState } from 'react';
import { Root, useNarrow } from './shared';
import { bootstrapDifference, drawResults, interval, mean, mulberry32, observedDifference, runExperiments, type Experiments } from '../../lib/difference';

const NS = [10, 20, 30, 50, 100, 200, 500, 1000];
const P_A = 0.7;
const SHARED = 0.6;
const REPS = 2000;
const BINS = 31;

const pts = (v: number, d = 1) => `${v >= 0 ? '+' : '-'}${Math.abs(v * 100).toFixed(d)}`;
const pct = (n: number, total: number) => `${Math.round((n / total) * 100)}%`;

function Hist({ values, lo, hi, w, h, ci, trueAt, tint, label }: { values: ArrayLike<number>; lo: number; hi: number; w: number; h: number; ci?: [number, number]; trueAt: number | null; tint: 'boot' | 'runs'; label: string }) {
  const padL = 8;
  const padR = 8;
  const padT = 8;
  const padB = 26;
  const counts = new Array<number>(BINS).fill(0);
  for (let i = 0; i < values.length; i++) {
    const b = Math.min(BINS - 1, Math.max(0, Math.floor(((values[i] - lo) / (hi - lo)) * BINS)));
    counts[b]++;
  }
  const top = Math.max(...counts, 1);
  const bw = (w - padL - padR) / BINS;
  const x = (v: number) => Math.round((padL + ((v - lo) / (hi - lo)) * (w - padL - padR)) * 10) / 10;
  const mid = (b: number) => lo + ((b + 0.5) / BINS) * (hi - lo);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mb-svg" role="img" aria-label={label}>
      {counts.map((c, b) => {
        const m = mid(b);
        const inCi = ci ? m >= ci[0] && m <= ci[1] : m >= 0;
        const cls = tint === 'boot' ? (inCi ? 'mb-bin-in' : 'mb-bin-out') : m < 0 ? 'mb-bin-bad' : m === 0 ? 'mb-bin-out' : 'mb-bin-in';
        const bh = Math.round((c / top) * (h - padT - padB) * 10) / 10;
        return <rect key={b} x={Math.round((padL + b * bw + 0.5) * 10) / 10} y={Math.round((h - padB - bh) * 10) / 10} width={Math.round((bw - 1) * 10) / 10} height={bh} className={cls} />;
      })}
      <path d={`M${padL} ${h - padB} H${w - padR}`} className="mb-frame" />
      {0 >= lo && 0 <= hi && (
        <>
          <path d={`M${x(0)} ${padT} V${h - padB}`} className="mb-zero" />
          <text x={x(0)} y={h - 8} textAnchor="middle" className="mb-tick">0</text>
        </>
      )}
      {trueAt !== null && trueAt >= lo && trueAt <= hi && trueAt !== 0 && (
        <>
          <path d={`M${x(trueAt)} ${padT} V${h - padB}`} className="mb-true" />
          <text x={x(trueAt)} y={h - 8} textAnchor="middle" className="mb-tick mb-tick-true">true</text>
        </>
      )}
      <text x={padL} y={h - 8} className="mb-tick">{pts(lo, 0)}</text>
      <text x={w - padR} y={h - 8} textAnchor="end" className="mb-tick">{pts(hi, 0)}</text>
    </svg>
  );
}

/**
 * Two models, the same N test cases. Draw a test set, bootstrap the gap between the models, and read the
 * interval. Then repeat the whole experiment 200 times to see how often a small test fools you.
 */
export default function BootstrapLab() {
  const narrow = useNarrow('(max-width: 640px)');
  const [ni, setNi] = useState(4);
  const [gap, setGap] = useState(5);
  const [draw, setDraw] = useState(1);
  const [paired, setPaired] = useState(true);
  const [exp, setExp] = useState<Experiments | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const n = NS[ni];
  const pB = P_A + gap / 100;

  const one = useMemo(() => {
    const r = drawResults(n, P_A, pB, SHARED, mulberry32(100 + draw));
    const boot = bootstrapDifference(r, REPS, mulberry32(900 + draw), paired);
    const ci = interval(boot, 0.95);
    const diff = observedDifference(r);
    let aOnly = 0;
    let bOnly = 0;
    for (let i = 0; i < n; i++) {
      if (r.a[i] && !r.b[i]) aOnly++;
      if (!r.a[i] && r.b[i]) bOnly++;
    }
    const sd = Math.sqrt(boot.reduce((s, v) => s + (v - mean(boot)) ** 2, 0) / boot.length);
    return { r, boot, ci, diff, aOnly, bOnly, sd, passA: Array.from(r.a).reduce((s, v) => s + v, 0), passB: Array.from(r.b).reduce((s, v) => s + v, 0) };
  }, [n, pB, draw, paired]);

  const reset = () => setExp(null);
  const run = () => {
    setBusy(true);
    timer.current = setTimeout(() => {
      setExp(runExperiments(n, P_A, pB, 200, 3000 + draw, SHARED));
      setBusy(false);
    }, 20);
  };

  const call = one.ci[0] > 0 ? 'B is clearly ahead' : one.ci[1] < 0 ? 'A is clearly ahead' : 'cannot tell them apart';
  const W = narrow ? 300 : 640;
  const H = narrow ? 170 : 190;
  const half = Math.max(Math.abs(one.diff) + 4 * one.sd, Math.abs(gap / 100) * 1.3, 0.05);
  const lo = Math.floor((one.diff - half) * 100) / 100;
  const hi = Math.ceil((one.diff + half) * 100) / 100;
  const runHalf = Math.max(Math.abs(gap / 100) * 1.5, 4.2 * Math.sqrt((0.5 * 0.5) / n) * 0.6, 0.06);
  const trueDiff = gap === 0 ? null : gap / 100;

  return (
    <Root>
      <div className="viz mb-boot">
        <p className="viz-title">Is B really better than A? Two models, the same {n} test cases</p>
        <div className="viz-controls">
          <label className="field">
            <span>
              Test cases, N <b>{n}</b>
            </span>
            <input type="range" min={0} max={NS.length - 1} step={1} value={ni} onChange={(e) => { setNi(+e.target.value); reset(); }} aria-valuetext={`${n} test cases`} />
          </label>
          <label className="field">
            <span>
              True gap: B passes more often than A by <b>{gap} points</b>
            </span>
            <input type="range" min={0} max={15} step={1} value={gap} onChange={(e) => { setGap(+e.target.value); reset(); }} aria-valuetext={`${gap} points`} />
          </label>
        </div>
        <p className="mb-small" style={{ marginTop: 0 }}>
          Example simulation, not real models. A truly passes {Math.round(P_A * 100)}% of all cases; B truly passes {Math.round(pB * 100)}%. The slider sets what is really true, which in real life you never get to see.
        </p>

        <div className="mb-actions">
          <button type="button" className="btn quiet" onClick={() => { setDraw(draw + 1); reset(); }}>
            Draw a new test set
          </button>
          <button type="button" className="btn quiet" aria-pressed={paired} onClick={() => setPaired(!paired)}>
            {paired ? 'Paired: resample whole cases' : 'Unpaired: resample each model separately'}
          </button>
        </div>

        <div className="mb-result" aria-live="polite" role="status">
          <div className="mb-pair">
            <p className="mb-big">
              <span className="mb-label">A passed</span>
              <b>{one.passA} of {n}</b>
            </p>
            <p className="mb-big">
              <span className="mb-label">B passed</span>
              <b>{one.passB} of {n}</b>
            </p>
          </div>
          <p className="mb-small">
            Observed gap: <b>{pts(one.diff)} points</b>. 95% interval from {REPS.toLocaleString('en-GB')} resamples: <b>{pts(one.ci[0])} to {pts(one.ci[1])}</b>. Verdict: {call}.
          </p>
          <p className="mb-small">
            B passed {one.bOnly} cases that A failed and A passed {one.aOnly} that B failed. {paired ? 'The paired bootstrap resamples whole cases, so it only has to explain those differing cases.' : 'The unpaired bootstrap ignores that both models saw the same cases, so its interval is wider.'}
          </p>
        </div>

        <Hist values={one.boot} lo={lo} hi={hi} w={W} h={H} ci={one.ci} trueAt={trueDiff} tint="boot" label={`Histogram of ${REPS} resampled gaps between B and A, from ${pts(lo, 0)} to ${pts(hi, 0)} points. The 95% interval runs from ${pts(one.ci[0])} to ${pts(one.ci[1])}.`} />
        <p className="viz-cap">
          Each bar counts resamples (drawn with replacement from these {n} cases) that gave that gap, in percentage points. Filled bars are the middle 95%. The dashed line is zero; the other line marks the true gap.
        </p>

        <div className="mb-actions">
          <button type="button" className="btn" onClick={run} disabled={busy}>
            {busy ? 'Running...' : 'Run 200 experiments at these settings'}
          </button>
        </div>
        {exp && (
          <div className="mb-result" aria-live="polite" role="status">
            <p className="mb-small" style={{ marginTop: 0 }}>
              200 fresh test sets of {n} cases, same two models each time (paired interval).
            </p>
            <div className="mb-parts">
              {[
                { name: 'B looked ahead', v: exp.bAhead },
                { name: 'tied', v: exp.tied },
                { name: 'A looked ahead', v: exp.aAhead },
                { name: 'Clear: B better', v: exp.clearB },
                { name: 'Clear: A better', v: exp.clearA },
              ].map((p) => (
                <div key={p.name} className="mb-part mb-part-wide">
                  <span>{p.name}</span>
                  <div className="mb-bar" aria-hidden="true">
                    <i style={{ width: `${(p.v / exp.trials) * 100}%` }} />
                  </div>
                  <b>{pct(p.v, exp.trials)}</b>
                </div>
              ))}
            </div>
            <p className="mb-small mb-verdict">
              {gap === 0
                ? `The models are identical, yet B looked ahead in ${pct(exp.bAhead, exp.trials)} of the tests and the interval called a winner in ${pct(exp.clearA + exp.clearB, exp.trials)}.`
                : `B is truly better, but the measured gap put A ahead or level in ${pct(exp.aAhead + exp.tied, exp.trials)} of the tests, and the interval confirmed B in only ${pct(exp.clearB, exp.trials)}.`}
            </p>
            <Hist values={exp.diffs} lo={-runHalf} hi={runHalf} w={W} h={H - 20} trueAt={trueDiff} tint="runs" label="Histogram of the observed gap in each of the 200 experiments. Bars left of zero are tests where A looked better." />
            <p className="viz-cap">Each bar counts experiments with that observed gap, in percentage points. Red bars are tests where the worse model looked better.</p>
          </div>
        )}
        <p className="viz-cap">
          In each simulated test, {Math.round(SHARED * 100)}% of cases are equally easy or hard for both models, which is typical when both models are built on similar data. Seeded, so the same settings give the same numbers every time.
        </p>
      </div>
    </Root>
  );
}
