/**
 * Clustering and dimensionality reduction on small point sets: k-means, DBSCAN, agglomerative (hierarchical)
 * clustering, silhouette scores and PCA. Pure functions, no DOM. Written for teaching, not for large data.
 * The tests compare the results with scikit-learn and SciPy reference runs.
 */

export type Vec = number[];

/** Small seeded random number generator so every visit draws the same data. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal draw (Box-Muller) from a uniform generator. */
export function gauss(rng: () => number): number {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Round to 4 decimals. Generated data is rounded so that the server and the browser (whose Math.log and Math.cos may differ in the last digit) draw exactly the same page. */
export const r4 = (v: number): number => Math.round(v * 1e4) / 1e4;

export const dist2 = (a: Vec, b: Vec): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
  return s;
};
export const dist = (a: Vec, b: Vec): number => Math.sqrt(dist2(a, b));

/* ------------------------------------------------------------------ datasets */

export type DatasetKind = 'blobs' | 'moons' | 'rings' | 'stretched';
export type Dataset = { points: Vec[]; truth: number[] };

/**
 * Four toy 2D datasets, deterministic for a seed. `blobs`: three round groups of different density.
 * `moons`: two interleaved half circles. `rings`: a small ring inside a large one. `stretched`: two long, thin, parallel groups.
 */
export function makeDataset(kind: DatasetKind, seed: number, n = 150): Dataset {
  const rng = mulberry32(seed);
  const points: Vec[] = [];
  const truth: number[] = [];
  if (kind === 'blobs') {
    const centres: [number, number, number][] = [
      [2, 2, 0.8],
      [7, 3, 1.0],
      [4.5, 7.5, 0.7],
    ];
    for (let i = 0; i < n; i++) {
      const c = i % 3;
      const [cx, cy, s] = centres[c];
      points.push([cx + s * gauss(rng), cy + s * gauss(rng)]);
      truth.push(c);
    }
  } else if (kind === 'moons') {
    for (let i = 0; i < n; i++) {
      const c = i % 2;
      const t = rng() * Math.PI;
      const x = c === 0 ? Math.cos(t) : 1 - Math.cos(t);
      const y = c === 0 ? Math.sin(t) : 0.5 - Math.sin(t);
      points.push([5 + 3.2 * (x - 0.5) + 0.3 * gauss(rng), 5 + 3.2 * (y - 0.25) + 0.3 * gauss(rng)]);
      truth.push(c);
    }
  } else if (kind === 'rings') {
    for (let i = 0; i < n; i++) {
      const c = i % 2;
      const t = rng() * 2 * Math.PI;
      const r = (c === 0 ? 1.3 : 3.6) + 0.18 * gauss(rng);
      points.push([5 + r * Math.cos(t), 5 + r * Math.sin(t)]);
      truth.push(c);
    }
  } else {
    for (let i = 0; i < n; i++) {
      const c = i % 2;
      points.push([5 + 3.4 * (rng() * 2 - 1), (c === 0 ? 3.6 : 6.4) + 0.35 * gauss(rng)]);
      truth.push(c);
    }
  }
  return { points: points.map((p) => p.map(r4)), truth };
}

/* ------------------------------------------------------------------ k-means */

export type KMeansInit = 'random' | 'plusplus';

/** Pick k starting centres. `random`: k distinct data points. `plusplus`: k-means++ (Arthur and Vassilvitskii, 2007). */
export function initCentroids(points: Vec[], k: number, rng: () => number, init: KMeansInit = 'plusplus'): Vec[] {
  const n = points.length;
  k = Math.min(k, n);
  if (init === 'random') {
    const picked = new Set<number>();
    while (picked.size < k) picked.add(Math.floor(rng() * n));
    return [...picked].map((i) => points[i].slice());
  }
  const centres: Vec[] = [points[Math.floor(rng() * n)].slice()];
  const d2 = points.map((p) => dist2(p, centres[0]));
  while (centres.length < k) {
    const total = d2.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let pick = n - 1;
    for (let i = 0; i < n; i++) {
      r -= d2[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    centres.push(points[pick].slice());
    for (let i = 0; i < n; i++) d2[i] = Math.min(d2[i], dist2(points[i], centres[centres.length - 1]));
  }
  return centres;
}

/** Assignment step: the index of the nearest centre for every point (ties go to the lower index). */
export function assign(points: Vec[], centres: Vec[]): number[] {
  return points.map((p) => {
    let best = 0;
    let bd = Infinity;
    for (let c = 0; c < centres.length; c++) {
      const d = dist2(p, centres[c]);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  });
}

/** Update step: every centre moves to the mean of its points. A centre with no points stays where it is. */
export function updateCentroids(points: Vec[], labels: number[], prev: Vec[]): Vec[] {
  const dim = points[0].length;
  const sums = prev.map(() => new Array<number>(dim).fill(0));
  const counts = prev.map(() => 0);
  points.forEach((p, i) => {
    counts[labels[i]]++;
    for (let d = 0; d < dim; d++) sums[labels[i]][d] += p[d];
  });
  return prev.map((c, j) => (counts[j] === 0 ? c.slice() : sums[j].map((s) => s / counts[j])));
}

/** Inertia (within-cluster sum of squares): the total squared distance from each point to its own centre. */
export function inertia(points: Vec[], labels: number[], centres: Vec[]): number {
  let s = 0;
  points.forEach((p, i) => {
    s += dist2(p, centres[labels[i]]);
  });
  return s;
}

export type KMeansResult = { centres: Vec[]; labels: number[]; inertia: number; iterations: number };

/** Lloyd's algorithm from given starting centres, until no point changes cluster or `maxIter` rounds. */
export function kmeansFrom(points: Vec[], start: Vec[], maxIter = 100): KMeansResult {
  let centres = start.map((c) => c.slice());
  let labels = assign(points, centres);
  let iterations = 0;
  for (let it = 0; it < maxIter; it++) {
    iterations = it + 1;
    centres = updateCentroids(points, labels, centres);
    const next = assign(points, centres);
    const same = next.every((l, i) => l === labels[i]);
    labels = next;
    if (same) break;
  }
  return { centres, labels, inertia: inertia(points, labels, centres), iterations };
}

/** k-means with `nInit` different starts, keeping the one with the lowest inertia. */
export function kmeans(points: Vec[], k: number, o: { seed?: number; nInit?: number; init?: KMeansInit; maxIter?: number } = {}): KMeansResult {
  const rng = mulberry32(o.seed ?? 1);
  let best: KMeansResult | null = null;
  for (let r = 0; r < (o.nInit ?? 1); r++) {
    const res = kmeansFrom(points, initCentroids(points, k, rng, o.init ?? 'plusplus'), o.maxIter ?? 100);
    if (!best || res.inertia < best.inertia) best = res;
  }
  return best as KMeansResult;
}

/** Inertia and silhouette for k = 2..kMax, using the best of `nInit` starts for each k. */
export function elbowTable(points: Vec[], kMax: number, seed = 1, nInit = 6): { k: number; inertia: number; silhouette: number | null }[] {
  const out: { k: number; inertia: number; silhouette: number | null }[] = [];
  for (let k = 2; k <= kMax; k++) {
    const r = kmeans(points, k, { seed: seed + k, nInit });
    out.push({ k, inertia: r.inertia, silhouette: silhouetteScore(points, r.labels) });
  }
  return out;
}

/* ------------------------------------------------------------------ silhouette */

/**
 * Silhouette value of every point: s = (b - a) / max(a, b), where a is the mean distance to the other points in its
 * own cluster and b the smallest mean distance to another cluster. A point alone in its cluster scores 0 (as in scikit-learn).
 * Points labelled -1 (noise) are left out of everything and get NaN. Needs at least two clusters, otherwise returns null.
 */
export function silhouetteSamples(points: Vec[], labels: number[]): number[] | null {
  const idx = points.map((_, i) => i).filter((i) => labels[i] >= 0);
  const ids = [...new Set(idx.map((i) => labels[i]))];
  if (ids.length < 2) return null;
  const sizes = new Map<number, number>();
  idx.forEach((i) => sizes.set(labels[i], (sizes.get(labels[i]) ?? 0) + 1));
  const out = new Array<number>(points.length).fill(NaN);
  for (const i of idx) {
    const sums = new Map<number, number>();
    for (const j of idx) {
      if (j === i) continue;
      sums.set(labels[j], (sums.get(labels[j]) ?? 0) + dist(points[i], points[j]));
    }
    const own = sizes.get(labels[i]) as number;
    if (own <= 1) {
      out[i] = 0;
      continue;
    }
    const a = (sums.get(labels[i]) ?? 0) / (own - 1);
    let b = Infinity;
    for (const id of ids) {
      if (id === labels[i]) continue;
      b = Math.min(b, (sums.get(id) ?? 0) / (sizes.get(id) as number));
    }
    out[i] = (b - a) / Math.max(a, b);
  }
  return out;
}

/** Mean silhouette over the points that are not noise, or null when there are fewer than two clusters. */
export function silhouetteScore(points: Vec[], labels: number[]): number | null {
  const s = silhouetteSamples(points, labels);
  if (!s) return null;
  const v = s.filter((x) => !Number.isNaN(x));
  return v.reduce((a, b) => a + b, 0) / v.length;
}

/* ------------------------------------------------------------------ DBSCAN */

/**
 * DBSCAN (Ester et al., 1996). A point is a core point if at least `minPts` points (itself included, as in scikit-learn)
 * lie within distance `eps`. Clusters grow from core points; a point reachable from no core point is noise (label -1).
 * A border point joins the first cluster that reaches it.
 */
export function dbscan(points: Vec[], eps: number, minPts: number): number[] {
  const n = points.length;
  const e2 = eps * eps;
  const near: number[][] = points.map((p) => {
    const out: number[] = [];
    for (let j = 0; j < n; j++) if (dist2(p, points[j]) <= e2) out.push(j);
    return out;
  });
  const core = near.map((nb) => nb.length >= minPts);
  const labels = new Array<number>(n).fill(-1);
  let cluster = 0;
  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1 || !core[i]) continue;
    const stack = [i];
    while (stack.length) {
      const v = stack.pop() as number;
      if (labels[v] !== -1) continue;
      labels[v] = cluster;
      if (!core[v]) continue;
      for (const u of near[v]) if (labels[u] === -1) stack.push(u);
    }
    cluster++;
  }
  return labels;
}

/** Distance from each point to its `k`-th nearest neighbour (itself counts as the first), sorted ascending: the usual "k-distance" plot used to choose eps. */
export function kDistances(points: Vec[], k: number): number[] {
  return points
    .map((p) => {
      const d = points.map((q) => dist(p, q)).sort((a, b) => a - b);
      return d[Math.min(k, d.length) - 1];
    })
    .sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ hierarchical */

export type Linkage = 'single' | 'complete' | 'average' | 'ward';
export type Merge = { a: number; b: number; height: number; size: number };

/**
 * Agglomerative clustering: start with every point alone and repeatedly merge the two closest clusters.
 * Returns the n-1 merges in SciPy's convention: ids 0..n-1 are the points and the merge at position m creates id n+m.
 * Heights match `scipy.cluster.hierarchy.linkage` (Euclidean). O(n^3): fine for a few hundred points.
 */
export function agglomerate(points: Vec[], linkage: Linkage): Merge[] {
  const n = points.length;
  // Work on distances; for Ward, on squared distances (the Lance-Williams update SciPy uses), and report the square root.
  const D: number[][] = points.map((p) => points.map((q) => (linkage === 'ward' ? dist2(p, q) : dist(p, q))));
  const active = new Set<number>();
  const id = new Array<number>(n);
  const size = new Array<number>(n).fill(1);
  for (let i = 0; i < n; i++) {
    active.add(i);
    id[i] = i;
  }
  const merges: Merge[] = [];
  for (let m = 0; m < n - 1; m++) {
    let bi = -1;
    let bj = -1;
    let bd = Infinity;
    const list = [...active];
    for (let x = 0; x < list.length; x++) {
      for (let y = x + 1; y < list.length; y++) {
        const d = D[list[x]][list[y]];
        if (d < bd) {
          bd = d;
          bi = list[x];
          bj = list[y];
        }
      }
    }
    // Merge bj into bi (Lance-Williams update).
    const ni = size[bi];
    const nj = size[bj];
    for (const k of active) {
      if (k === bi || k === bj) continue;
      const nk = size[k];
      let d: number;
      if (linkage === 'single') d = Math.min(D[bi][k], D[bj][k]);
      else if (linkage === 'complete') d = Math.max(D[bi][k], D[bj][k]);
      else if (linkage === 'average') d = (ni * D[bi][k] + nj * D[bj][k]) / (ni + nj);
      else d = ((ni + nk) * D[bi][k] + (nj + nk) * D[bj][k] - nk * D[bi][bj]) / (ni + nj + nk);
      D[bi][k] = D[k][bi] = d;
    }
    const height = linkage === 'ward' ? Math.sqrt(D[bi][bj]) : D[bi][bj];
    merges.push({ a: Math.min(id[bi], id[bj]), b: Math.max(id[bi], id[bj]), height, size: ni + nj });
    size[bi] = ni + nj;
    id[bi] = n + m;
    active.delete(bj);
  }
  return merges;
}

/** Cut the merge tree into `k` clusters. Labels are numbered by the lowest point index in each cluster. */
export function cutTree(n: number, merges: Merge[], k: number): number[] {
  const parent = Array.from({ length: n + merges.length }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const use = Math.max(0, Math.min(merges.length, n - k));
  for (let m = 0; m < use; m++) {
    parent[find(merges[m].a)] = n + m;
    parent[find(merges[m].b)] = n + m;
  }
  const names = new Map<number, number>();
  return Array.from({ length: n }, (_, i) => {
    const r = find(i);
    if (!names.has(r)) names.set(r, names.size);
    return names.get(r) as number;
  });
}

/* ------------------------------------------------------------------ PCA */

/** Eigen-decomposition of a small symmetric matrix by Jacobi rotations. Eigenvalues descending, eigenvectors as rows. */
export function symmetricEigen(A: number[][]): { values: number[]; vectors: number[][] } {
  const n = A.length;
  const a = A.map((r) => r.slice());
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
    if (off < 1e-24) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((x, y) => a[y][y] - a[x][x]);
  return { values: order.map((i) => a[i][i]), vectors: order.map((i) => v.map((row) => row[i])) };
}

export type PcaResult = {
  mean: Vec;
  /** Sample covariance matrix (divides by n - 1, as scikit-learn does). */
  cov: number[][];
  /** Variance along each principal component, largest first. */
  variances: number[];
  /** Share of the total variance on each component. */
  ratios: number[];
  /** Principal directions as unit vectors, one per row. The sign of each is arbitrary. */
  components: Vec[];
};

export function pca(points: Vec[]): PcaResult {
  const n = points.length;
  const d = points[0].length;
  const mean = Array.from({ length: d }, (_, j) => points.reduce((s, p) => s + p[j], 0) / n);
  const cov = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  for (const p of points) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) cov[i][j] += ((p[i] - mean[i]) * (p[j] - mean[j])) / (n - 1);
  const { values, vectors } = symmetricEigen(cov);
  const total = values.reduce((a, b) => a + Math.max(b, 0), 0);
  return { mean, cov, variances: values, ratios: values.map((v) => (total > 0 ? Math.max(v, 0) / total : 0)), components: vectors };
}

/** Variance of the data along one unit direction u: u' C u. */
export function varianceAlong(cov: number[][], u: Vec): number {
  let s = 0;
  for (let i = 0; i < u.length; i++) for (let j = 0; j < u.length; j++) s += u[i] * cov[i][j] * u[j];
  return s;
}

/** Share of the total variance kept when the data are flattened onto the plane spanned by two orthonormal directions. */
export function planeVarianceShare(cov: number[][], u: Vec, v: Vec): number {
  const total = cov.reduce((s, row, i) => s + row[i], 0);
  return total > 0 ? (varianceAlong(cov, u) + varianceAlong(cov, v)) / total : 0;
}

/**
 * The screen axes of a 3D view. `yaw` turns the scene about the vertical axis, `pitch` tips it towards or away from you
 * (both in radians) and `roll` spins the picture in the screen plane. Returns two orthonormal vectors: the direction that
 * points right on screen and the direction that points up. The viewing direction is right x up.
 */
export function viewAxes(yaw: number, pitch: number, roll = 0): { right: Vec; up: Vec } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const r0: Vec = [c, s, 0];
  const u0: Vec = [-s * sp, c * sp, cp];
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  return {
    right: r0.map((x, i) => cr * x + sr * u0[i]),
    up: r0.map((x, i) => -sr * x + cr * u0[i]),
  };
}

/** The yaw, pitch and roll that make the first two principal components the screen axes (PCA's own best 2D view). */
export function anglesForPlane(pc1: Vec, pc2: Vec): { yaw: number; pitch: number; roll: number } {
  let n: Vec = [pc1[1] * pc2[2] - pc1[2] * pc2[1], pc1[2] * pc2[0] - pc1[0] * pc2[2], pc1[0] * pc2[1] - pc1[1] * pc2[0]];
  if (n[2] < 0) n = n.map((x) => -x);
  const pitch = Math.asin(Math.max(-1, Math.min(1, n[2])));
  const yaw = Math.atan2(n[0], -n[1]);
  const base = viewAxes(yaw, pitch, 0);
  const dot = (a: Vec, b: Vec) => a.reduce((s, x, i) => s + x * b[i], 0);
  const roll = Math.atan2(dot(pc1, base.up), dot(pc1, base.right));
  return { yaw, pitch, roll };
}

/** 3D datasets for the PCA rotator: a flat tilted pancake, a long cigar, and a ball with no best view. */
export type CloudKind = 'pancake' | 'cigar' | 'ball';

export function makeCloud(kind: CloudKind, seed: number, n = 120): Vec[] {
  const rng = mulberry32(seed);
  const sd: [number, number, number] = kind === 'pancake' ? [3, 1.6, 0.4] : kind === 'cigar' ? [3.4, 0.6, 0.5] : [1.6, 1.5, 1.4];
  // A fixed tilt so the long axes do not line up with the screen axes.
  const R: number[][] = rotation(0.7, 0.5, 0.35);
  return Array.from({ length: n }, () => {
    const l = [sd[0] * gauss(rng), sd[1] * gauss(rng), sd[2] * gauss(rng)];
    return [0, 1, 2].map((i) => r4(R[i][0] * l[0] + R[i][1] * l[1] + R[i][2] * l[2]));
  });
}

function rotation(a: number, b: number, c: number): number[][] {
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(c), Math.sin(c)];
  return [
    [ca * cb, ca * sb * sc - sa * cc, ca * sb * cc + sa * sc],
    [sa * cb, sa * sb * sc + ca * cc, sa * sb * cc - ca * sc],
    [-sb, cb * sc, cb * cc],
  ];
}

/** Project centred points onto two directions. */
export function projectTo(points: Vec[], mean: Vec, right: Vec, up: Vec): [number, number, number][] {
  const viewDir: Vec = [right[1] * up[2] - right[2] * up[1], right[2] * up[0] - right[0] * up[2], right[0] * up[1] - right[1] * up[0]];
  return points.map((p) => {
    const q = p.map((x, i) => x - mean[i]);
    const dot = (u: Vec) => u[0] * q[0] + u[1] * q[1] + u[2] * q[2];
    return [dot(right), dot(up), dot(viewDir)];
  });
}

/* ------------------------------------------------------------------ comparing with known groups */

/**
 * Adjusted Rand index between two labelings: 1 means the same partition, about 0 means no better than chance, and it can go
 * below 0. A label of -1 (noise) is treated as one more group, as scikit-learn does.
 */
export function adjustedRand(a: number[], b: number[]): number {
  const n = a.length;
  const table = new Map<string, number>();
  const rows = new Map<number, number>();
  const cols = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const key = a[i] + ',' + b[i];
    table.set(key, (table.get(key) ?? 0) + 1);
    rows.set(a[i], (rows.get(a[i]) ?? 0) + 1);
    cols.set(b[i], (cols.get(b[i]) ?? 0) + 1);
  }
  const c2 = (x: number) => (x * (x - 1)) / 2;
  let sumCells = 0;
  table.forEach((v) => (sumCells += c2(v)));
  let sumRows = 0;
  rows.forEach((v) => (sumRows += c2(v)));
  let sumCols = 0;
  cols.forEach((v) => (sumCols += c2(v)));
  const expected = (sumRows * sumCols) / c2(n);
  const maxIndex = (sumRows + sumCols) / 2;
  return maxIndex === expected ? 1 : (sumCells - expected) / (maxIndex - expected);
}
