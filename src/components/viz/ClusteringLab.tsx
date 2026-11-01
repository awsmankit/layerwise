import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  adjustedRand,
  agglomerate,
  assign,
  cutTree,
  dbscan,
  elbowTable,
  inertia,
  initCentroids,
  makeDataset,
  mulberry32,
  silhouetteScore,
  updateCentroids,
  type DatasetKind,
  type KMeansInit,
  type Linkage,
  type Vec,
} from '../../lib/clustering';

type Algo = 'kmeans' | 'dbscan' | 'hier';

const KINDS: { id: DatasetKind; label: string; groups: number }[] = [
  { id: 'blobs', label: 'Three blobs', groups: 3 },
  { id: 'moons', label: 'Two moons', groups: 2 },
  { id: 'rings', label: 'Two rings', groups: 2 },
  { id: 'stretched', label: 'Two stripes', groups: 2 },
];
const LINKAGES: { id: Linkage; label: string }[] = [
  { id: 'single', label: 'single' },
  { id: 'complete', label: 'complete' },
  { id: 'average', label: 'average' },
  { id: 'ward', label: 'Ward' },
];

const N = 200;
const S = 400; // square drawing area
const M = 14;
const px = (v: number) => M + ((v + 1) / 12) * (S - 2 * M);
const py = (v: number) => S - M - ((v + 1) / 12) * (S - 2 * M);

type KState = { centres: Vec[]; labels: number[] | null; phase: 'start' | 'assigned' | 'moved'; round: number; done: boolean };

/** Replay k-means half-step by half-step from a fixed start, so any change of settings simply starts again. */
function replay(points: Vec[], k: number, seed: number, init: KMeansInit, steps: number): KState {
  let centres = initCentroids(points, k, mulberry32(seed), init);
  let labels: number[] | null = null;
  let phase: KState['phase'] = 'start';
  let round = 0;
  let done = false;
  for (let s = 0; s < steps && !done; s++) {
    if (phase !== 'assigned') {
      const next = assign(points, centres);
      if (labels && next.every((l, i) => l === (labels as number[])[i])) done = true;
      labels = next;
      phase = 'assigned';
      round++;
    } else {
      centres = updateCentroids(points, labels as number[], centres);
      phase = 'moved';
    }
  }
  return { centres, labels, phase, round, done };
}

const fmt2 = (v: number | null) => (v === null ? 'n/a' : v.toFixed(2));

/**
 * Pick a dataset, pick an algorithm, move its settings, and see the clusters, the silhouette score and how well the result
 * matches the groups the data were drawn from. k-means can be stepped one half-round at a time.
 */
export default function ClusteringLab() {
  const [kind, setKind] = useState<DatasetKind>('blobs');
  const [dataSeed, setDataSeed] = useState(3);
  const [algo, setAlgo] = useState<Algo>('kmeans');
  const [k, setK] = useState(3);
  const [init, setInit] = useState<KMeansInit>('random');
  const [startSeed, setStartSeed] = useState(1);
  const [steps, setSteps] = useState(0);
  const [eps, setEps] = useState(0.5);
  const [minPts, setMinPts] = useState(4);
  const [linkage, setLinkage] = useState<Linkage>('ward');

  const data = useMemo(() => makeDataset(kind, dataSeed, N), [kind, dataSeed]);
  const pts = data.points;
  const groups = KINDS.find((x) => x.id === kind)?.groups ?? 2;

  const ks = useMemo(() => replay(pts, k, startSeed, init, steps), [pts, k, startSeed, init, steps]);
  const dbLabels = useMemo(() => (algo === 'dbscan' ? dbscan(pts, eps, minPts) : null), [algo, pts, eps, minPts]);
  const merges = useMemo(() => (algo === 'hier' ? agglomerate(pts, linkage) : null), [algo, pts, linkage]);
  const hierLabels = useMemo(() => (merges ? cutTree(pts.length, merges, k) : null), [merges, pts, k]);
  const elbow = useMemo(() => (algo === 'kmeans' ? elbowTable(pts, 8, 1, 4) : null), [algo, pts]);

  const labels: number[] | null = algo === 'kmeans' ? ks.labels : algo === 'dbscan' ? dbLabels : hierLabels;
  const sil = labels ? silhouetteScore(pts, labels) : null;
  const ari = labels ? adjustedRand(data.truth, labels) : null;
  const nClusters = labels ? new Set(labels.filter((l) => l >= 0)).size : 0;
  const nNoise = labels ? labels.filter((l) => l < 0).length : 0;
  const inertiaNow = algo === 'kmeans' && ks.labels ? inertia(pts, ks.labels, ks.centres) : null;

  function resetKmeans(patch: { k?: number; init?: KMeansInit; seed?: number }) {
    if (patch.k !== undefined) setK(patch.k);
    if (patch.init !== undefined) setInit(patch.init);
    if (patch.seed !== undefined) setStartSeed(patch.seed);
    setSteps(0);
  }
  function pickKind(next: DatasetKind) {
    setKind(next);
    const g = KINDS.find((x) => x.id === next)?.groups ?? 2;
    setK(g);
    setSteps(0);
  }

  const verdict = (() => {
    if (!labels) return 'Press the step button to start.';
    if (algo === 'kmeans' && !ks.done) return 'k-means has not finished: keep stepping, or run to the end.';
    if (sil === null) return 'Only one group was found, so there is no silhouette score.';
    if (ari !== null && ari > 0.9) return 'This matches the groups the data were drawn from.';
    if (ari !== null && sil > 0.3 && ari < 0.6) return 'The silhouette looks respectable, yet the groups do not match the shapes that were drawn. Silhouette rewards round, well-separated clusters, not correct ones.';
    if (ari !== null && ari < 0.6) return 'These clusters do not match the groups the data were drawn from.';
    return 'A partial match with the groups the data were drawn from.';
  })();

  const status = (() => {
    const name = algo === 'kmeans' ? `k-means with k = ${k}` : algo === 'dbscan' ? `DBSCAN with eps ${eps.toFixed(2)} and minimum points ${minPts}` : `${linkage} linkage cut into ${k} clusters`;
    const kmNote =
      algo === 'kmeans'
        ? ks.phase === 'start'
          ? ' The diamonds are the starting centres; no point has been assigned yet.'
          : ` Round ${ks.round}, ${ks.phase === 'assigned' ? 'points assigned to the nearest centre' : 'centres moved to the middle of their points'}.${ks.done ? ' Nothing changed on the last assignment, so k-means has stopped.' : ''}${inertiaNow !== null ? ` Inertia ${inertiaNow.toFixed(0)}.` : ''}`
        : '';
    const found = labels ? ` ${nClusters} cluster${nClusters === 1 ? '' : 's'}${algo === 'dbscan' ? ` and ${nNoise} noise point${nNoise === 1 ? '' : 's'}` : ''}. Silhouette ${fmt2(sil)}. Agreement with the real groups ${fmt2(ari)}.` : '';
    return `${name}.${kmNote}${found} ${verdict}`;
  })();

  const cls = (l: number) => (l < 0 ? 'ap2-noise' : `ap2-c${l % 8}`);

  // The eps circle is drawn in plot units: 12 units across the full width.
  const epsPx = (eps / 12) * (S - 2 * M);

  return (
    <Root>
      <div className="viz ap2 ap2-clu">
        <p className="viz-title">Clustering lab</p>
        <div className="ap2-row" role="group" aria-label="Dataset">
          <span className="ap2-lab">Data</span>
          {KINDS.map((x) => (
            <button key={x.id} type="button" className="btn quiet" aria-pressed={kind === x.id} onClick={() => pickKind(x.id)}>
              {x.label}
            </button>
          ))}
          <button type="button" className="btn quiet" onClick={() => { setDataSeed((s) => s + 1); setSteps(0); }}>
            New sample
          </button>
        </div>
        <div className="ap2-row" role="group" aria-label="Algorithm">
          <span className="ap2-lab">Method</span>
          <button type="button" className="btn quiet" aria-pressed={algo === 'kmeans'} onClick={() => setAlgo('kmeans')}>
            k-means
          </button>
          <button type="button" className="btn quiet" aria-pressed={algo === 'dbscan'} onClick={() => setAlgo('dbscan')}>
            DBSCAN
          </button>
          <button type="button" className="btn quiet" aria-pressed={algo === 'hier'} onClick={() => setAlgo('hier')}>
            Hierarchical
          </button>
        </div>

        <div className="ap2-ctrls">
          {algo !== 'dbscan' && (
            <label className="field">
              <span>
                Number of clusters k <b>{k}</b>
              </span>
              <input type="range" min={2} max={8} step={1} value={k} onChange={(e) => (algo === 'kmeans' ? resetKmeans({ k: +e.target.value }) : setK(+e.target.value))} />
            </label>
          )}
          {algo === 'dbscan' && (
            <>
              <label className="field">
                <span>
                  Neighbourhood radius eps <b>{eps.toFixed(2)}</b>
                </span>
                <input type="range" min={0.2} max={2} step={0.05} value={eps} onChange={(e) => setEps(+e.target.value)} />
              </label>
              <label className="field">
                <span>
                  Points needed to form a core <b>{minPts}</b>
                </span>
                <input type="range" min={2} max={10} step={1} value={minPts} onChange={(e) => setMinPts(+e.target.value)} />
              </label>
            </>
          )}
          {algo === 'hier' && (
            <div className="field">
              <span>Linkage (how far apart two clusters are)</span>
              <div className="ap2-row ap2-tight" role="group" aria-label="Linkage">
                {LINKAGES.map((x) => (
                  <button key={x.id} type="button" className="btn quiet" aria-pressed={linkage === x.id} onClick={() => setLinkage(x.id)}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {algo === 'kmeans' && (
          <div className="ap2-row ap2-tight">
            <button type="button" className="btn" disabled={ks.done} onClick={() => setSteps((s) => s + 1)}>
              {ks.phase === 'assigned' ? 'Move each centre to the middle of its points' : 'Give each point to its nearest centre'}
            </button>
            <button type="button" className="btn quiet" disabled={ks.done} onClick={() => setSteps(500)}>
              Run to the end
            </button>
            <button type="button" className="btn quiet" onClick={() => resetKmeans({ seed: startSeed + 1 })}>
              New starting centres
            </button>
            <button type="button" className="btn quiet" aria-pressed={init === 'plusplus'} onClick={() => resetKmeans({ init: init === 'random' ? 'plusplus' : 'random' })}>
              Starts: {init === 'random' ? 'random points' : 'k-means++ (spread out)'}
            </button>
          </div>
        )}

        <div className="ap2-split">
          <svg viewBox={`0 0 ${S} ${S}`} className="ap2-svg" role="img" aria-label={`Scatter plot of ${N} points (${KINDS.find((x) => x.id === kind)?.label.toLowerCase()}) coloured by the cluster the chosen method puts them in.`}>
            <rect x={M} y={M} width={S - 2 * M} height={S - 2 * M} className="ap2-frame" />
            {pts.map((p, i) => {
              const l = labels ? labels[i] : 0;
              return l < 0 ? (
                <path key={i} d={`M${px(p[0]) - 3},${py(p[1]) - 3}l6,6m0,-6l-6,6`} className="ap2-x" />
              ) : (
                <circle key={i} cx={px(p[0])} cy={py(p[1])} r={4} className={labels ? `ap2-dot ${cls(l)}` : 'ap2-dot ap2-plain'} />
              );
            })}
            {algo === 'kmeans' &&
              ks.centres.map((c, j) => (
                <path key={'c' + j} d={`M${px(c[0])},${py(c[1]) - 9} l9,9 l-9,9 l-9,-9 z`} className={`ap2-centre ap2-f${j % 8}`} />
              ))}
            {algo === 'dbscan' && (
              <g>
                <circle cx={S - M - epsPx - 6} cy={M + epsPx + 6} r={epsPx} className="ap2-eps" />
                <circle cx={S - M - epsPx - 6} cy={M + epsPx + 6} r={2.5} className="ap2-eps-dot" />
              </g>
            )}
          </svg>

          <div className="ap2-side">
            <dl className="ap2-stats" aria-hidden="true">
              <div>
                <dt>Clusters found</dt>
                <dd>{labels ? nClusters : '-'}</dd>
              </div>
              {algo === 'dbscan' && (
                <div>
                  <dt>Noise points</dt>
                  <dd>{labels ? nNoise : '-'}</dd>
                </div>
              )}
              {algo === 'kmeans' && (
                <div>
                  <dt>Inertia</dt>
                  <dd>{inertiaNow !== null ? inertiaNow.toFixed(0) : '-'}</dd>
                </div>
              )}
              <div>
                <dt>Silhouette</dt>
                <dd>{fmt2(sil)}</dd>
              </div>
              <div>
                <dt>Match with the {groups} real groups (ARI)</dt>
                <dd>{fmt2(ari)}</dd>
              </div>
            </dl>

            {algo === 'kmeans' && elbow && (
              <figure className="ap2-fig">
                <MiniChart title="Inertia for k = 2 to 8" rows={elbow.map((r) => ({ k: r.k, v: r.inertia }))} k={k} lo={0} />
                <MiniChart title="Silhouette for k = 2 to 8" rows={elbow.map((r) => ({ k: r.k, v: r.silhouette ?? 0 }))} k={k} lo={0} hi={1} />
              </figure>
            )}
            {algo === 'hier' && merges && <MergeBars merges={merges} n={pts.length} k={k} />}
            {algo === 'dbscan' && (
              <p className="ap2-note">The circle in the corner is the neighbourhood radius eps. A point with at least {minPts} points (itself included) inside such a circle is a core point. Crosses are noise.</p>
            )}
          </div>
        </div>

        <p className="ap2-readout" role="status" aria-live="polite">
          {status}
        </p>
        <p className="viz-cap">
          Made-up example data, {N} points each. The coloured diamonds are k-means centres. ARI (adjusted Rand index) is 1 when the clusters match the groups the points were drawn from and about 0 for a random split; in real work you rarely have this answer, which is the whole difficulty.
        </p>
      </div>
    </Root>
  );
}

function MiniChart({ title, rows, k, lo = 0, hi }: { title: string; rows: { k: number; v: number }[]; k: number; lo?: number; hi?: number }) {
  const W = 280;
  const H = 118;
  const L = 8;
  const R = 8;
  const T = 8;
  const B = 24;
  const top = hi ?? Math.max(...rows.map((r) => r.v)) * 1.05;
  const x = (kk: number) => L + ((kk - 2) / 6) * (W - L - R);
  const y = (v: number) => H - B - ((v - lo) / (top - lo)) * (H - T - B);
  const path = rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.k).toFixed(1)},${y(r.v).toFixed(1)}`).join(' ');
  return (
    <div className="ap2-mini">
      <p className="ap2-mini-title">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="ap2-mini-svg" role="img" aria-label={`${title}: ${rows.map((r) => `k ${r.k}: ${r.v.toFixed(2)}`).join(', ')}`}>
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="ap2-axis" />
        <path d={path} className="ap2-line" />
        {rows.map((r) => (
          <g key={r.k}>
            <circle cx={x(r.k)} cy={y(r.v)} r={r.k === k ? 5 : 3} className={r.k === k ? 'ap2-pt-on' : 'ap2-pt'} />
            <text x={x(r.k)} y={H - 7} textAnchor="middle" className="ap2-t">
              {r.k}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function MergeBars({ merges, n, k }: { merges: { height: number }[]; n: number; k: number }) {
  const shown = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // number of clusters left after the merge
  const heights = shown.map((m) => merges[n - 1 - m].height); // the merge that leaves m clusters is merge number n - 1 - m
  const max = Math.max(...heights);
  const W = 280;
  const rowH = 20;
  const H = shown.length * rowH + 6;
  const LBL = 92;
  return (
    <figure className="ap2-fig">
      <p className="ap2-mini-title">Distance at which the last merges happen</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="ap2-mini-svg" role="img" aria-label={`Merge distances for the last ten merges: ${shown.map((m, i) => `leaves ${m} cluster${m === 1 ? '' : 's'} at ${heights[i].toFixed(2)}`).join(', ')}. The cut into ${k} clusters keeps every merge that leaves ${k} or more clusters.`}>
        {shown.map((m, i) => (
          <g key={m}>
            <text x={LBL - 6} y={i * rowH + 15} textAnchor="end" className="ap2-t">
              leaves {m}
            </text>
            <rect x={LBL} y={i * rowH + 4} width={Math.max(2, (heights[i] / max) * (W - LBL - 6))} height={13} className={m >= k ? 'ap2-bar' : 'ap2-bar ap2-cut'} />
          </g>
        ))}
      </svg>
      <p className="ap2-note">Solid bars are merges kept in your cut. A tall bar after a run of short ones means two well-separated groups were forced together.</p>
    </figure>
  );
}
