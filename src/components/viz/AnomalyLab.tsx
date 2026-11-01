import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  alertsPerDay,
  bestThreshold,
  buildIForest,
  confusion,
  iforestScores,
  isolationTrace,
  madScoreMax,
  makeAnomalyData,
  totalCost,
  zScoreMax,
  type AnomalyKind,
  type Pt,
} from '../../lib/anomaly';

type Method = 'z' | 'mad' | 'iforest';

const KINDS: { id: AnomalyKind; label: string; rate: number; blurb: string }[] = [
  { id: 'blob', label: 'One group', rate: 0.02, blurb: 'One tilted group of ordinary points; anomalies are scattered around it.' },
  { id: 'two', label: 'Two groups', rate: 0.05, blurb: 'Two groups of ordinary points. Half the anomalies sit in the empty gap between them.' },
  { id: 'loud', label: 'Loud outliers', rate: 0.1, blurb: 'One group, and anomalies far off in every direction. So many large values distort the plain mean and spread.' },
];
const RATES = [0.005, 0.02, 0.1];
const METHODS: Record<Method, { label: string; min: number; max: number; step: number; start: number; unit: string }> = {
  z: { label: 'z-score', min: 1, max: 6, step: 0.1, start: 3, unit: 'z' },
  mad: { label: 'Robust (MAD)', min: 1.5, max: 12, step: 0.1, start: 3.5, unit: 'score' },
  iforest: { label: 'Isolation forest', min: 0.45, max: 0.85, step: 0.005, start: 0.6, unit: 'score' },
};

const N = 1000;
const S = 400;
const M = 14;
const pctTxt = (v: number) => Math.round(v * 100) + '%';

/**
 * 1,000 points with a few anomalies mixed in. Choose a way to score them, set the threshold, and see what is flagged, how
 * many are real, and what the mistakes cost. Select a point to watch random cuts isolate it.
 */
export default function AnomalyLab() {
  const [kind, setKind] = useState<AnomalyKind>('blob');
  const [rate, setRate] = useState(0.02);
  const [seed, setSeed] = useState(3);
  const [method, setMethod] = useState<Method>('z');
  const [thr, setThr] = useState(3);
  const [depth, setDepth] = useState(8);
  const [missCost, setMissCost] = useState(20);
  const [sel, setSel] = useState<number | null>(null);
  const [trySeed, setTrySeed] = useState(1);

  const data = useMemo(() => makeAnomalyData(kind, seed, N, rate), [kind, seed, rate]);
  const forest = useMemo(() => (method === 'iforest' ? buildIForest(data.points, { nTrees: 100, psi: 256, maxDepth: depth, seed: 2 }) : null), [method, data, depth]);
  const scores = useMemo(() => {
    if (method === 'z') return zScoreMax(data.points);
    if (method === 'mad') return madScoreMax(data.points);
    return forest ? iforestScores(forest, data.points) : [];
  }, [method, data, forest]);
  const spec = METHODS[method];
  const conf = useMemo(() => confusion(scores, data.labels, thr), [scores, data, thr]);
  const nAnom = data.labels.reduce((a, b) => a + b, 0);
  const cost = totalCost(conf, missCost, 1);
  const costNothing = nAnom * missCost;
  const costAll = N - nAnom;
  const best = useMemo(() => bestThreshold(scores, data.labels, missCost, 1), [scores, data, missCost]);

  const ext = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of data.points) {
      lo = Math.min(lo, p[0], p[1]);
      hi = Math.max(hi, p[0], p[1]);
    }
    const pad = (hi - lo) * 0.04;
    return { lo: lo - pad, hi: hi + pad };
  }, [data]);
  const sx = (v: number) => M + ((v - ext.lo) / (ext.hi - ext.lo)) * (S - 2 * M);
  const sy = (v: number) => S - M - ((v - ext.lo) / (ext.hi - ext.lo)) * (S - 2 * M);
  const fromPx = (v: number) => ext.lo + ((v - M) / (S - 2 * M)) * (ext.hi - ext.lo);

  const trace = useMemo(() => {
    if (sel === null) return null;
    const e = { x0: ext.lo, x1: ext.hi, y0: ext.lo, y1: ext.hi };
    return isolationTrace(data.points, sel, trySeed * 7919 + sel, e, 40);
  }, [sel, trySeed, data, ext]);
  const avgCuts = useMemo(() => {
    if (sel === null) return null;
    const e = { x0: ext.lo, x1: ext.hi, y0: ext.lo, y1: ext.hi };
    let s = 0;
    for (let k = 0; k < 100; k++) s += isolationTrace(data.points, sel, k + 1, e, 40).cuts.length;
    return s / 100;
  }, [sel, data, ext]);
  const typicalCuts = useMemo(() => {
    // The average number of cuts for the middle 100 points by score, as a yardstick.
    const e = { x0: ext.lo, x1: ext.hi, y0: ext.lo, y1: ext.hi };
    const order = scores.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]);
    const mid = order.slice(Math.floor(N / 2) - 5, Math.floor(N / 2) + 5).map((p) => p[1]);
    let s = 0;
    let c = 0;
    for (const i of mid) for (let k = 0; k < 10; k++) { s += isolationTrace(data.points, i, k + 1, e, 40).cuts.length; c++; }
    return s / c;
  }, [data, ext, scores]);

  function pickMethod(m: Method) {
    setMethod(m);
    setThr(METHODS[m].start);
  }
  function pickKind(id: AnomalyKind) {
    setKind(id);
    setRate(KINDS.find((k) => k.id === id)?.rate ?? 0.02);
    setSel(null);
  }
  function selectNearest(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = fromPx(((e.clientX - r.left) / r.width) * S);
    const vy = fromPx(S - ((e.clientY - r.top) / r.height) * S);
    let bi = -1;
    let bd = Infinity;
    data.points.forEach((p, i) => {
      const d = (p[0] - vx) ** 2 + (p[1] - vy) ** 2;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    setSel(bi);
    setTrySeed(1);
  }
  function selectKind(anom: boolean) {
    const idx = data.labels.map((l, i) => (l === (anom ? 1 : 0) ? i : -1)).filter((i) => i >= 0);
    // Pick a clear example: the highest-scoring anomaly, or the median-scoring ordinary point.
    const sorted = idx.sort((a, b) => scores[b] - scores[a]);
    setSel(anom ? sorted[0] : sorted[Math.floor(sorted.length / 2)]);
    setTrySeed(1);
  }
  function useBest() {
    if (!isFinite(best.threshold)) setThr(spec.max);
    else setThr(Math.min(spec.max, Math.max(spec.min, Math.round(best.threshold / spec.step) * spec.step)));
  }

  // Rates in a busy system: the same recall and false alarm rate on a stream where 1 event in 10,000 is anomalous.
  const day = alertsPerDay({ events: 10000, anomalyRate: 0.0001, recall: conf.recall, falseAlarmRate: conf.falseAlarmRate });

  const status = `${spec.label}, threshold ${method === 'iforest' ? thr.toFixed(3) : thr.toFixed(1)}: ${conf.flagged} of ${N} points flagged. ${conf.tp} of the ${nAnom} true anomalies caught (recall ${pctTxt(conf.recall)}), ${conf.fp} false alarms (precision ${conf.flagged ? pctTxt(conf.precision) : 'not defined, nothing flagged'}). Cost ${cost} (a miss costs ${missCost}, a false alarm 1); flagging nothing would cost ${costNothing}, flagging everything ${costAll}. ${isFinite(best.threshold) ? `The cheapest threshold for this miss cost is about ${method === 'iforest' ? best.threshold.toFixed(3) : best.threshold.toFixed(1)}, with a cost of ${best.cost}.` : `For this miss cost, flagging nothing is the cheapest option.`}${sel !== null && trace ? ` Selected point: it was isolated in ${trace.cuts.length} random cut${trace.cuts.length === 1 ? '' : 's'} this try, ${avgCuts?.toFixed(1)} on average over 100 tries; a typical ordinary point needs about ${typicalCuts.toFixed(1)}.` : ''}`;

  return (
    <Root>
      <div className="viz ap2 ap2-anom">
        <p className="viz-title">Anomaly lab</p>
        <div className="ap2-row" role="group" aria-label="Scenario">
          <span className="ap2-lab">Data</span>
          {KINDS.map((k) => (
            <button key={k.id} type="button" className="btn quiet" aria-pressed={kind === k.id} onClick={() => pickKind(k.id)}>
              {k.label}
            </button>
          ))}
          <button type="button" className="btn quiet" onClick={() => { setSeed((s) => s + 1); setSel(null); }}>
            New sample
          </button>
        </div>
        <div className="ap2-row ap2-tight" role="group" aria-label="How rare the anomalies are">
          <span className="ap2-lab">Rare?</span>
          {RATES.map((r) => (
            <button key={r} type="button" className="btn quiet" aria-pressed={rate === r} onClick={() => { setRate(r); setSel(null); }}>
              {r * 100}% ({Math.max(1, Math.round(N * r))} in {N})
            </button>
          ))}
        </div>
        <p className="ap2-note">{KINDS.find((k) => k.id === kind)?.blurb} Made-up example data.</p>
        <div className="ap2-row" role="group" aria-label="Scoring method">
          <span className="ap2-lab">Method</span>
          {(Object.keys(METHODS) as Method[]).map((m) => (
            <button key={m} type="button" className="btn quiet" aria-pressed={method === m} onClick={() => pickMethod(m)}>
              {METHODS[m].label}
            </button>
          ))}
        </div>

        <div className="ap2-ctrls">
          <label className="field">
            <span>
              Flag when the score is at least <b>{method === 'iforest' ? thr.toFixed(3) : thr.toFixed(1)}</b>
            </span>
            <input type="range" min={spec.min} max={spec.max} step={spec.step} value={thr} onChange={(e) => setThr(+e.target.value)} />
          </label>
          {method === 'iforest' && (
            <label className="field">
              <span>
                Deepest a tree may grow <b>{depth}</b>
              </span>
              <input type="range" min={1} max={10} step={1} value={depth} onChange={(e) => setDepth(+e.target.value)} />
            </label>
          )}
          <label className="field">
            <span>
              A missed anomaly costs <b>{missCost}</b> false alarms
            </span>
            <input type="range" min={1} max={200} step={1} value={missCost} onChange={(e) => setMissCost(+e.target.value)} />
          </label>
        </div>
        <div className="ap2-row ap2-tight">
          <button type="button" className="btn" onClick={useBest}>
            Set the cheapest threshold
          </button>
          <button type="button" className="btn quiet" onClick={() => selectKind(true)}>
            Isolate an anomaly
          </button>
          <button type="button" className="btn quiet" onClick={() => selectKind(false)}>
            Isolate an ordinary point
          </button>
          {trace && (
            <button type="button" className="btn quiet" onClick={() => setTrySeed((s) => s + 1)}>
              Cut again at random
            </button>
          )}
        </div>

        <div className="ap2-split">
          <svg viewBox={`0 0 ${S} ${S}`} className="ap2-svg ap2-anom-svg" role="img" aria-label={`Scatter plot of ${N} points. Diamonds are true anomalies, circles are ordinary points, and a ring marks every flagged point. Tap a point to watch random cuts isolate it.`} onPointerDown={selectNearest}>
            <rect x={M} y={M} width={S - 2 * M} height={S - 2 * M} className="ap2-frame" />
            {trace &&
              trace.cuts.map((c, i) => {
                const b = c.box;
                const x0 = sx(b.x0);
                const x1 = sx(b.x1);
                const y0 = sy(b.y1);
                const y1 = sy(b.y0);
                return c.f === 0 ? (
                  <line key={i} x1={sx(c.v)} x2={sx(c.v)} y1={y0} y2={y1} className="ap2-cutline" />
                ) : (
                  <line key={i} x1={x0} x2={x1} y1={sy(c.v)} y2={sy(c.v)} className="ap2-cutline" />
                );
              })}
            {data.points.map((p: Pt, i) => {
              const a = data.labels[i] === 1;
              const f = scores[i] >= thr;
              const x = sx(p[0]);
              const y = sy(p[1]);
              return (
                <g key={i}>
                  {f && <circle cx={x} cy={y} r={a ? 8 : 6.5} className="ap2-ring" />}
                  {a ? <path d={`M${x},${y - 5} l5,5 l-5,5 l-5,-5 z`} className="ap2-anom-pt" /> : <circle cx={x} cy={y} r={2.4} className="ap2-norm-pt" />}
                </g>
              );
            })}
            {sel !== null && (
              <circle cx={sx(data.points[sel][0])} cy={sy(data.points[sel][1])} r={11} className="ap2-sel" />
            )}
          </svg>

          <div className="ap2-side">
            <dl className="ap2-stats" aria-hidden="true">
              <div>
                <dt>Flagged</dt>
                <dd>
                  {conf.flagged} <small>of {N}</small>
                </dd>
              </div>
              <div>
                <dt>Anomalies caught (recall)</dt>
                <dd>
                  {pctTxt(conf.recall)} <small>{conf.tp} of {nAnom}</small>
                </dd>
              </div>
              <div>
                <dt>Flags that are real (precision)</dt>
                <dd>
                  {conf.flagged ? pctTxt(conf.precision) : '-'} <small>{conf.fp} false</small>
                </dd>
              </div>
              <div className={cost <= Math.min(costNothing, costAll) ? 'ap2-good' : ''}>
                <dt>Total cost</dt>
                <dd>
                  {cost} <small>nothing: {costNothing}</small>
                </dd>
              </div>
            </dl>
            <p className="ap2-legend ap2-legend-row">
              <span><i className="ap2-key-d" /> true anomaly</span>
              <span><i className="ap2-key-c" /> ordinary</span>
              <span><i className="ap2-key-r" /> flagged</span>
            </p>
            <p className="ap2-note">
              <b>Same detector, busier stream.</b> If only 1 event in 10,000 were anomalous, this recall ({pctTxt(conf.recall)}) and false alarm rate ({(conf.falseAlarmRate * 100).toFixed(2)}%) would raise about {Math.round(day.alerts)} alert{Math.round(day.alerts) === 1 ? '' : 's'} on a day of 10,000 events, of which about {day.real.toFixed(1)} would be real.
            </p>
          </div>
        </div>

        <p className="ap2-readout" role="status" aria-live="polite">
          {status}
        </p>
        <p className="viz-cap">
          Scores: z-score = the larger of the two coordinates' distances from the mean in standard deviations; robust = the same with median and MAD (modified z-score); isolation forest = 100 trees on 256-point samples, score near 1 is quickly isolated. Cost is in units of one false alarm. Tap or click a point to isolate it with random cuts (on a 256-point sample that always contains it).
        </p>
      </div>
    </Root>
  );
}
