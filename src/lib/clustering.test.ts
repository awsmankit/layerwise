import { describe, expect, it } from 'vitest';
import {
  adjustedRand, agglomerate, anglesForPlane, assign, cutTree, dbscan, elbowTable, inertia, kDistances, kmeans, kmeansFrom, makeCloud, makeDataset,
  mulberry32, pca, planeVarianceShare, projectTo, silhouetteSamples, silhouetteScore, updateCentroids, varianceAlong, viewAxes, initCentroids,
} from './clustering';

/*
 * Reference values were computed offline with scikit-learn 1.9.1, SciPy 1.18.1 and NumPy 2.5.4 (Python 3.12) on the exact
 * (3-decimal) inputs below, so these tests pin the TypeScript against those libraries.
 */
const BLOBS: number[][] = [[2.001,2.239],[1.781,1.288],[1.636,1.207],[2.048,3.072],[1.606,1.504],[2.392,2.286],[2.084,1.256],[1.977,2.556],[0.925,1.634],[0.479,0.968],[0.527,1.812],[0.986,2.217],[7.125,2.85],[4.987,2.569],[6.961,3.091],[5.776,2.618],[6.217,2.353],[7.849,2.354],[6.974,3.708],[6.533,2.911],[7.088,3.051],[6.02,3.061],[8.087,1.762],[7.688,3.095],[3.987,9.1],[5.11,6.541],[4.56,7.961],[4.349,8.046],[4.447,8.034],[5.651,6.959],[4.663,7.129],[4.602,6.55],[4.037,7.343],[5.219,8.416],[3.441,6.864],[5.018,5.906]];
const MOONS: number[][] = [[-0.48,0.781],[0.991,0.488],[-0.888,0.451],[-0.995,0.114],[-0.889,0.265],[-0.22,0.929],[0.86,0.365],[0.898,0.559],[-0.917,0.225],[-0.205,0.967],[0.81,0.538],[-0.957,0.338],[-0.513,0.854],[-0.118,0.936],[0.316,0.946],[0.361,0.874],[0.718,0.645],[0.887,0.163],[-0.927,0.383],[0.056,1.022],[-0.181,0.98],[0.464,0.775],[-0.63,0.674],[1.014,0.077],[0.364,0.89],[1.033,0.077],[0.917,0.378],[-0.924,0.144],[-0.453,0.846],[0.141,1.032],[1.132,-0.506],[1.954,0.158],[0.58,-0.327],[1.253,-0.369],[1.471,-0.286],[0.591,-0.346],[1.173,-0.409],[1.671,-0.274],[2.009,0.158],[0.11,0.093],[1.88,0.166],[0.016,0.486],[1.699,-0.198],[1.776,-0.152],[0.081,0.025],[0.649,-0.437],[1.833,-0.024],[-0.058,0.416],[1.333,-0.473],[1.808,-0.152],[1.062,-0.479],[1.773,-0.342],[0.296,-0.158],[0.187,-0.171],[0.556,-0.364],[0.15,-0.029],[0.518,-0.316],[1.985,0.206],[1.187,-0.592],[0.323,-0.408]];
const AGG: number[][] = [[1.334,0.047,-1.173],[-0.941,1.131,0.158],[0.048,-0.053,0.038],[0.805,0.553,0.216],[-1.043,0.511,-0.684],[1.094,-1.271,-0.138],[-0.007,-1.325,1.722],[1.46,-0.464,0.772],[5.568,1.08,5.376],[4.908,5.125,3.385],[4.596,4.733,6.782],[5.502,4.992,7.293],[4.167,4.416,2.275],[7.354,6.446,6.375],[6.003,5.165,5.323],[-0.176,5.857,0.038],[1.058,6.389,-0.041],[-0.406,5.556,1.122],[0.355,6.047,-0.242],[-0.776,5.953,0.612]];
const PCAPTS: number[][] = [[-1.178,-0.469,-0.236],[0.329,-1.857,-0.686],[-2.563,0.634,-0.048],[1.731,2.118,0.631],[-1.805,-0.071,-0.044],[-2.981,0.056,0.59],[-0.774,-0.373,-0.446],[0.957,-1.337,-0.767],[3.839,-0.447,0.218],[4.573,1.073,0.575],[5.857,0.74,0.134],[-4.06,-0.627,0.19],[2.879,-0.651,-0.442],[-1.513,0.099,-0.046],[0.643,0.463,0.072],[-0.121,0.228,0.049],[1.511,2.497,1.027],[0.167,-1.995,-0.547],[-5.84,-2.664,-0.697],[2.119,0.173,-0.432],[-1.114,-1.0,-0.155],[6.773,1.389,0.305],[-3.512,-0.653,-0.31],[-3.455,-0.436,-0.529],[3.336,1.831,0.973],[-1.422,0.38,0.071],[-1.166,-0.601,-0.603],[-4.332,0.231,-0.028],[0.649,1.31,-0.076],[-2.352,-0.182,0.031],[-1.131,1.046,0.399],[-3.64,-1.724,-0.373],[1.391,-2.047,-0.263],[1.794,1.911,0.542],[-0.887,-1.5,0.251],[-0.526,1.817,0.406],[0.492,-1.924,-0.751],[2.951,-1.01,0.018],[1.012,-1.084,-0.501],[-1.377,-0.289,-0.272]];
const REF = {"kmeans":{"init":[[2.001,2.239],[7.125,2.85],[3.987,9.1]],"labels":[0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2],"inertia":34.28199933333334,"centres":[[1.536833333333334,1.8365833333333335],[6.775416666666667,2.7852500000000004],[4.590333333333334,7.404083333333333]]},"kmeans_bad":{"init":[[2.001,2.239],[1.781,1.288],[7.125,2.85]],"labels":[0,1,1,0,1,0,1,0,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],"inertia":186.04377320833333,"centres":[[2.1045,2.5382499999999997],[1.2530000000000001,1.48575],[5.682875,5.094666666666667]]},"sil":{"lab3":[0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2],"s3":0.7437760682034313,"samples3":[0.7890098378376378,0.8121387228971924,0.8131190532739867,0.6721189035772955,0.8332679400227024,0.7196590447855841,0.7721382773279133,0.7609714493188392,0.8244603935558971,0.7578698046916654,0.7942241573348693,0.8098278339961499,0.8163633343997168,0.43454387989009585,0.8085176666418251,0.6908424168503136,0.7484985265353293,0.7583176937936734,0.7034050821181966,0.80358482059697,0.809913877647032,0.7379407225351365,0.7085016244069101,0.7575803346698304,0.7045155298412505,0.6715384799745688,0.8054089987071947,0.8017033074677313,0.8043907721724901,0.6502109103560125,0.7821322056012907,0.7083916688466225,0.7821784515824493,0.7341319559614015,0.6882991712209526,0.5062216048867996],"lab2":[0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,0,0,1,0,0,0,1,0,1],"s2":0.3476711193847205,"single":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],"ssingle":-0.16062313772695658,"samples_single_last":0.0},"db_0.25_4":[0,1,2,2,2,0,1,1,2,0,1,2,0,0,3,3,1,1,2,0,0,3,0,1,3,1,1,2,0,0,4,4,5,4,4,5,4,4,4,6,4,-1,4,4,6,5,4,-1,4,4,4,4,6,6,5,6,5,4,4,5],"db_0.15_4":[-1,-1,0,0,0,1,-1,-1,0,1,-1,0,-1,1,2,2,-1,-1,0,-1,1,2,-1,-1,2,-1,-1,0,-1,-1,3,4,5,3,-1,5,3,6,4,7,4,-1,6,6,7,5,6,-1,-1,6,3,-1,-1,7,5,7,5,4,3,-1],"db_0.4_5":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,2,1,1,1,2,1,-1,1,1,2,2,1,2,1,1,1,1,2,2,2,2,2,1,1,2],"agg_single":{"heights":[0.6296514909058818,0.7447207530343172,0.8072013379572661,0.835877981526012,0.9858848817179419,1.0506036360112219,1.0719319008220625,1.2701594388107345,1.331333917542853,1.4246617142325402,1.5112451819608888,1.5700949015903465,1.9483095236640404,2.0400563717701528,2.138426056706193,2.226312871094268,4.03311653687319,4.349996091952267,4.560279158121792],"sizes":[2.0,2.0,3.0,5.0,2.0,2.0,2.0,2.0,4.0,6.0,2.0,7.0,8.0,3.0,4.0,6.0,7.0,12.0,20.0],"a":[15.0,17.0,16.0,21.0,2.0,1.0,10.0,5.0,24.0,25.0,9.0,0.0,6.0,14.0,13.0,30.0,8.0,23.0,32.0],"b":[18.0,19.0,20.0,22.0,3.0,4.0,11.0,7.0,27.0,28.0,12.0,29.0,31.0,26.0,33.0,34.0,35.0,36.0,37.0],"cut3":[1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,2,2,2,2,2]},"agg_complete":{"heights":[0.6296514909058818,0.7447207530343172,0.9858848817179419,1.0506036360112219,1.0719319008220625,1.2701594388107345,1.3461132938946854,1.5112451819608888,1.7692701885240705,2.01494962716193,2.04688885873171,2.0724270795374196,3.1620317835214755,3.272091380142064,3.4729943852531635,4.7652804744317,5.742974229438959,7.984246363934419,12.472502355181176],"sizes":[2.0,2.0,2.0,2.0,2.0,2.0,3.0,2.0,3.0,5.0,5.0,3.0,7.0,4.0,8.0,3.0,7.0,13.0,20.0],"a":[15.0,17.0,2.0,1.0,10.0,5.0,16.0,9.0,0.0,25.0,21.0,14.0,23.0,13.0,6.0,8.0,33.0,30.0,36.0],"b":[18.0,19.0,3.0,4.0,11.0,7.0,20.0,12.0,22.0,28.0,26.0,24.0,29.0,31.0,32.0,27.0,35.0,34.0,37.0],"cut3":[3,3,3,3,3,3,3,3,1,1,1,1,1,1,1,2,2,2,2,2]},"agg_average":{"heights":[0.6296514909058818,0.7447207530343172,0.9858848817179419,1.0506036360112219,1.0719319008220625,1.0766573159259758,1.2701594388107345,1.5112451819608888,1.5139442339841604,1.6176076845316705,1.761806528709932,2.056241725653786,2.4188947236731506,2.641688192829035,2.6459060866311304,4.084071434933356,4.593876249699569,6.257880092479414,8.481878547482053],"sizes":[2.0,2.0,2.0,2.0,2.0,3.0,2.0,2.0,5.0,4.0,5.0,3.0,7.0,8.0,4.0,6.0,7.0,13.0,20.0],"a":[15.0,17.0,2.0,1.0,10.0,16.0,5.0,9.0,21.0,22.0,0.0,14.0,23.0,6.0,13.0,27.0,8.0,28.0,36.0],"b":[18.0,19.0,3.0,4.0,11.0,20.0,7.0,12.0,25.0,26.0,29.0,24.0,30.0,32.0,31.0,34.0,35.0,33.0,37.0],"cut3":[3,3,3,3,3,3,3,3,1,1,1,1,1,1,1,2,2,2,2,2]},"agg_ward":{"heights":[0.6296514909058818,0.7447207530343172,0.9858848817179419,1.0506036360112219,1.0719319008220625,1.2289194440645816,1.2701594388107345,1.5112451819608888,1.8456309670859627,2.0732574209039587,2.138426056706193,2.20421936294916,2.9607675806565203,3.1486668607523405,3.858103398476165,5.312103977396025,6.367585417379105,15.085530508761343,23.080167886194957],"sizes":[2.0,2.0,2.0,2.0,2.0,3.0,2.0,2.0,3.0,5.0,2.0,5.0,6.0,4.0,8.0,3.0,7.0,13.0,20.0],"a":[15.0,17.0,2.0,1.0,10.0,16.0,5.0,9.0,0.0,26.0,13.0,21.0,6.0,24.0,23.0,8.0,33.0,31.0,36.0],"b":[18.0,19.0,3.0,4.0,11.0,20.0,7.0,12.0,22.0,28.0,14.0,25.0,29.0,30.0,32.0,27.0,35.0,34.0,37.0],"cut3":[3,3,3,3,3,3,3,3,1,1,1,1,1,1,1,2,2,2,2,2]},"pca":{"var":[8.137698289509053,1.4627783633793783,0.0718032951884911],"ratio":[0.8413423032825905,0.15123408040626585,0.007423616311143608],"comps":[[0.9781431614344023,0.19874853294037156,0.0611144532264138],[-0.2079270325970475,0.9370612109240833,0.28050425325987133],[-0.0015181747263727004,-0.28708066398756593,0.9579052079981393]],"mean":[-0.06864999999999995,-0.12362500000000001,-0.04425000000000002]}};

/** True when two labelings describe the same partition, whatever the label numbers. */
function samePartition(a: number[], b: number[]): boolean {
  const m = new Map<number, number>();
  const back = new Map<number, number>();
  for (let i = 0; i < a.length; i++) {
    if (m.has(a[i]) && m.get(a[i]) !== b[i]) return false;
    if (back.has(b[i]) && back.get(b[i]) !== a[i]) return false;
    m.set(a[i], b[i]);
    back.set(b[i], a[i]);
  }
  return true;
}

describe('k-means against scikit-learn', () => {
  it('matches labels, centres and inertia from the same starting centres', () => {
    const res = kmeansFrom(BLOBS, REF.kmeans.init);
    expect(res.labels).toEqual(REF.kmeans.labels);
    expect(res.inertia).toBeCloseTo(REF.kmeans.inertia, 6);
    res.centres.forEach((c, i) => c.forEach((v, d) => expect(v).toBeCloseTo(REF.kmeans.centres[i][d], 8)));
  });
  it('gets stuck in the same poor solution as scikit-learn from a bad start (two centres in one blob)', () => {
    const res = kmeansFrom(BLOBS, REF.kmeans_bad.init);
    expect(res.labels).toEqual(REF.kmeans_bad.labels);
    expect(res.inertia).toBeCloseTo(REF.kmeans_bad.inertia, 6);
    expect(res.inertia).toBeGreaterThan(REF.kmeans.inertia * 4);
  });
  it('assign and update are the two halves of one round', () => {
    const c0 = REF.kmeans.init as number[][];
    const labels = assign(BLOBS, c0);
    const c1 = updateCentroids(BLOBS, labels, c0);
    expect(inertia(BLOBS, assign(BLOBS, c1), c1)).toBeLessThanOrEqual(inertia(BLOBS, labels, c0));
  });
  it('an empty cluster keeps its old centre', () => {
    const c = updateCentroids([[0, 0], [1, 1]], [0, 0], [[0, 0], [9, 9]]);
    expect(c[1]).toEqual([9, 9]);
    expect(c[0]).toEqual([0.5, 0.5]);
  });
  it('is deterministic for a seed, and best-of-several never does worse than one start', () => {
    const a = kmeans(BLOBS, 3, { seed: 5 });
    const b = kmeans(BLOBS, 3, { seed: 5 });
    expect(a.labels).toEqual(b.labels);
    const many = kmeans(BLOBS, 3, { seed: 5, nInit: 10 });
    expect(many.inertia).toBeLessThanOrEqual(a.inertia + 1e-9);
    expect(many.inertia).toBeCloseTo(REF.kmeans.inertia, 4);
  });
  it('k-means++ and random starts return distinct points from the data', () => {
    for (const init of ['random', 'plusplus'] as const) {
      const c = initCentroids(BLOBS, 4, mulberry32(3), init);
      expect(c.length).toBe(4);
      c.forEach((p) => expect(BLOBS.some((q) => q[0] === p[0] && q[1] === p[1])).toBe(true));
    }
  });
  it('inertia always falls as k grows (elbow table)', () => {
    const t = elbowTable(makeDataset('blobs', 3, 90).points, 6, 1, 4);
    for (let i = 1; i < t.length; i++) expect(t[i].inertia).toBeLessThan(t[i - 1].inertia + 1e-6);
  });
});

describe('silhouette against scikit-learn', () => {
  it('matches the mean and every per-point value', () => {
    expect(silhouetteScore(BLOBS, REF.sil.lab3)).toBeCloseTo(REF.sil.s3, 10);
    const s = silhouetteSamples(BLOBS, REF.sil.lab3) as number[];
    s.forEach((v, i) => expect(v).toBeCloseTo(REF.sil.samples3[i], 10));
    expect(silhouetteScore(BLOBS, REF.sil.lab2)).toBeCloseTo(REF.sil.s2, 10);
  });
  it('a cluster of one point scores 0 for that point', () => {
    expect(silhouetteScore(BLOBS, REF.sil.single)).toBeCloseTo(REF.sil.ssingle, 10);
    expect((silhouetteSamples(BLOBS, REF.sil.single) as number[])[35]).toBe(REF.sil.samples_single_last);
  });
  it('needs two clusters, and ignores noise labelled -1', () => {
    expect(silhouetteScore(BLOBS, BLOBS.map(() => 0))).toBeNull();
    const labels = REF.sil.lab3.map((l: number, i: number) => (i < 4 ? -1 : l));
    const keep = BLOBS.map((_, i) => i).filter((i) => i >= 4);
    const direct = silhouetteScore(keep.map((i) => BLOBS[i]), keep.map((i) => REF.sil.lab3[i]));
    expect(silhouetteScore(BLOBS, labels)).toBeCloseTo(direct as number, 12);
  });
});

describe('DBSCAN against scikit-learn', () => {
  for (const key of ['db_0.25_4', 'db_0.15_4', 'db_0.4_5'] as const) {
    it(`gives the same labels for ${key}`, () => {
      const [, eps, ms] = key.split('_');
      expect(dbscan(MOONS, Number(eps), Number(ms))).toEqual((REF as Record<string, unknown>)[key]);
    });
  }
  it('a huge eps makes one cluster and a tiny eps makes only noise', () => {
    expect(new Set(dbscan(MOONS, 50, 3))).toEqual(new Set([0]));
    expect(new Set(dbscan(MOONS, 0.0001, 3))).toEqual(new Set([-1]));
  });
  it('k-distances are sorted and the 1st is zero (the point itself)', () => {
    const d = kDistances(MOONS, 1);
    expect(d.every((v) => v === 0)).toBe(true);
    const d4 = kDistances(MOONS, 4);
    for (let i = 1; i < d4.length; i++) expect(d4[i]).toBeGreaterThanOrEqual(d4[i - 1]);
  });
});

describe('agglomerative clustering against SciPy', () => {
  for (const linkage of ['single', 'complete', 'average', 'ward'] as const) {
    it(`${linkage}: merge heights, sizes and a 3-cluster cut`, () => {
      const ref = (REF as unknown as Record<string, { heights: number[]; sizes: number[]; cut3: number[] }>)['agg_' + linkage];
      const m = agglomerate(AGG, linkage);
      expect(m.length).toBe(AGG.length - 1);
      m.forEach((x, i) => {
        expect(x.height).toBeCloseTo(ref.heights[i], 8);
        expect(x.size).toBe(ref.sizes[i]);
      });
      expect(samePartition(cutTree(AGG.length, m, 3), ref.cut3)).toBe(true);
    });
  }
  it('cutting into n clusters leaves every point alone, and into 1 joins all', () => {
    const m = agglomerate(AGG, 'average');
    expect(new Set(cutTree(AGG.length, m, AGG.length)).size).toBe(AGG.length);
    expect(new Set(cutTree(AGG.length, m, 1)).size).toBe(1);
  });
});

describe('PCA against scikit-learn', () => {
  it('matches variances, ratios, means and directions (up to sign)', () => {
    const p = pca(PCAPTS);
    p.variances.forEach((v, i) => expect(v).toBeCloseTo(REF.pca.var[i], 8));
    p.ratios.forEach((v, i) => expect(v).toBeCloseTo(REF.pca.ratio[i], 10));
    p.mean.forEach((v, i) => expect(v).toBeCloseTo(REF.pca.mean[i], 10));
    p.components.forEach((c, i) => {
      const dot = c.reduce((s, x, d) => s + x * REF.pca.comps[i][d], 0);
      expect(Math.abs(dot)).toBeCloseTo(1, 8);
    });
  });
  it('ratios add up to 1 and variance along a component equals its eigenvalue', () => {
    const p = pca(PCAPTS);
    expect(p.ratios.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(varianceAlong(p.cov, p.components[0])).toBeCloseTo(p.variances[0], 8);
  });
});

describe('the 3D view', () => {
  it('screen axes are orthonormal for any angles', () => {
    for (const [y, p, r] of [[0, 0, 0], [1, 0.4, 2], [-2.5, 1.2, -1]]) {
      const { right, up } = viewAxes(y, p, r);
      const dot = right.reduce((s, x, i) => s + x * up[i], 0);
      expect(dot).toBeCloseTo(0, 12);
      expect(right.reduce((s, x) => s + x * x, 0)).toBeCloseTo(1, 12);
      expect(up.reduce((s, x) => s + x * x, 0)).toBeCloseTo(1, 12);
    }
  });
  it('anglesForPlane makes the first two principal components the screen axes, and keeps the most variance', () => {
    const pts = makeCloud('pancake', 4);
    const p = pca(pts);
    const a = anglesForPlane(p.components[0], p.components[1]);
    const { right, up } = viewAxes(a.yaw, a.pitch, a.roll);
    expect(Math.abs(right.reduce((s, x, i) => s + x * p.components[0][i], 0))).toBeCloseTo(1, 8);
    expect(Math.abs(up.reduce((s, x, i) => s + x * p.components[1][i], 0))).toBeCloseTo(1, 8);
    const best = planeVarianceShare(p.cov, right, up);
    expect(best).toBeCloseTo(p.ratios[0] + p.ratios[1], 10);
    // No other view keeps more.
    const rng = mulberry32(11);
    for (let i = 0; i < 200; i++) {
      const v = viewAxes(rng() * 6.28, (rng() - 0.5) * 3.14, rng() * 6.28);
      expect(planeVarianceShare(p.cov, v.right, v.up)).toBeLessThanOrEqual(best + 1e-9);
    }
  });
  it('the spread of projected points matches the variance share', () => {
    const pts = makeCloud('cigar', 2, 300);
    const p = pca(pts);
    const { right, up } = viewAxes(0.3, 0.9, 0.2);
    const proj = projectTo(pts, p.mean, right, up);
    const n = proj.length;
    const v = (k: number) => proj.reduce((s, q) => s + q[k] * q[k], 0) / (n - 1);
    const total = p.variances.reduce((a, b) => a + b, 0);
    expect((v(0) + v(1)) / total).toBeCloseTo(planeVarianceShare(p.cov, right, up), 10);
  });
  it('a ball has no best view: every plane keeps about two thirds', () => {
    const p = pca(makeCloud('ball', 2, 400));
    expect(p.ratios[0] + p.ratios[1]).toBeLessThan(0.78);
  });
});

describe('datasets', () => {
  it('are deterministic and have the requested size', () => {
    for (const k of ['blobs', 'moons', 'rings', 'stretched'] as const) {
      const a = makeDataset(k, 3, 90);
      expect(a.points.length).toBe(90);
      expect(a.truth.length).toBe(90);
      expect(makeDataset(k, 3, 90).points).toEqual(a.points);
    }
  });
});

describe('adjusted Rand index against scikit-learn', () => {
  const CASES = [{"a": [2, 0, 0, 0, 0, 2, 2, 1, 0, 0, 0, 1, 1, 1, 0, 0, 2, 2, 0, 0, 1, 1, 2, 1, 1, 1, 1, 1, 0, 2, 2, 2, 2, 0, 0, 1, 1, 2, 2, 0], "b": [1, -1, -1, -1, -1, 1, 1, 0, -1, 1, -1, 0, 0, 1, -1, -1, 1, 1, 1, -1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, -1, -1, 0, 0, 1, 1, -1], "ari": 0.5168248490077653}, {"a": [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1], "b": [-1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 1, -1, 0, 1, 0, 0, 0, -1, -1, 0, 0, -1, 2, -1, -1, -1, 0, 1], "ari": 0.522665530282853}, {"a": [1, 1, 2, 1, 0, 0, 0, 0, 2, 2, 1, 0, 2, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 2, 2], "b": [0, 0, 0, -1, -1, -1, 0, -1, 1, 1, 0, -1, 1, -1, -1, -1, 1, 0, -1, -1, 0, -1, 0, 1, 1], "ari": 0.4667885435709933}, {"a": [0, 0, 1, 1], "b": [5, 5, 2, 2], "ari": 1.0}, {"a": [0, 0, 1, 1], "b": [0, 1, 0, 1], "ari": -0.5}] as { a: number[]; b: number[]; ari: number }[];
  it('matches on random partitions (including a -1 "noise" label)', () => {
    for (const t of CASES) expect(adjustedRand(t.a, t.b)).toBeCloseTo(t.ari, 12);
  });
  it('is 1 for the same partition under other names', () => {
    expect(adjustedRand([0, 0, 1, 1], [5, 5, 2, 2])).toBe(1);
  });
});

/* The numbers quoted in the lesson "Clustering and dimensionality reduction". */
describe('lesson worked examples', () => {
  const line = [1, 2, 3, 10, 11, 12].map((v) => [v, 0]);
  it('k-means on six numbers from starting centres 1 and 2 ends at centres 2 and 11 with inertia 4 after two rounds', () => {
    const start = [[1, 0], [2, 0]];
    // Round 1: assign, then move.
    const l1 = assign(line, start);
    expect(l1).toEqual([0, 1, 1, 1, 1, 1]);
    const c1 = updateCentroids(line, l1, start);
    expect(c1[0][0]).toBe(1);
    expect(c1[1][0]).toBeCloseTo(7.6, 12);
    // Round 2.
    const l2 = assign(line, c1);
    expect(l2).toEqual([0, 0, 0, 1, 1, 1]);
    const c2 = updateCentroids(line, l2, c1);
    expect(c2.map((c) => c[0])).toEqual([2, 11]);
    const res = kmeansFrom(line, start);
    expect(res.inertia).toBe(4);
    expect(res.labels).toEqual([0, 0, 0, 1, 1, 1]);
  });
  it('silhouette of the two obvious groups: point 2 scores 8/9, point 3 scores 0.8125, mean 0.8505', () => {
    const s = silhouetteSamples(line, [0, 0, 0, 1, 1, 1]) as number[];
    expect(s[1]).toBeCloseTo(8 / 9, 12);
    expect(s[2]).toBeCloseTo(0.8125, 12);
    expect(s[0]).toBeCloseTo(0.85, 12);
    expect(silhouetteScore(line, [0, 0, 0, 1, 1, 1])).toBeCloseTo(0.8505, 4);
  });
  it('silhouette prefers the wrong answer on moons, rings and stripes; DBSCAN or single linkage recovers the real groups', () => {
    for (const [kind, eps] of [['moons', 0.75], ['rings', 1.1], ['stretched', 0.8]] as const) {
      const d = makeDataset(kind, 3, 200);
      const km = kmeans(d.points, 2, { seed: 1, nInit: 6 });
      const db = dbscan(d.points, eps, 4);
      expect(adjustedRand(d.truth, db)).toBe(1);
      expect(adjustedRand(d.truth, km.labels)).toBeLessThan(0.3);
      expect(silhouetteScore(d.points, km.labels) as number).toBeGreaterThan(silhouetteScore(d.points, db) as number);
      const single = cutTree(200, agglomerate(d.points, 'single'), 2);
      expect(adjustedRand(d.truth, single)).toBe(1);
    }
  });
  it('on the three blobs, silhouette peaks at k = 3 and inertia falls sharply from k = 2 to 3', () => {
    const d = makeDataset('blobs', 3, 200);
    const t = elbowTable(d.points, 8, 1, 4);
    const best = t.reduce((a, b) => ((b.silhouette ?? -1) > (a.silhouette ?? -1) ? b : a));
    expect(best.k).toBe(3);
    expect(t[0].inertia / t[1].inertia).toBeGreaterThan(3);
    expect(adjustedRand(d.truth, kmeans(d.points, 3, { seed: 1, nInit: 6 }).labels)).toBe(1);
  });
  it('the pancake cloud: first two components keep about 99% of the spread, the ball only about 75%', () => {
    expect(pca(makeCloud('pancake', 4, 140)).ratios.map((r) => Math.round(r * 1000) / 1000)).toEqual([0.81, 0.176, 0.014]);
    expect(pca(makeCloud('cigar', 4, 140)).ratios[0]).toBeGreaterThan(0.95);
    const ball = pca(makeCloud('ball', 4, 140)).ratios;
    expect(ball[0] + ball[1]).toBeCloseTo(0.746, 3);
  });
  it('why scaling matters: 30 years of age difference counts for almost nothing next to 1,000 in income', () => {
    expect(Math.hypot(30, 1000)).toBeCloseTo(1000.45, 2);
  });
});

describe('numbers quoted from the clustering lab', () => {
  it('blobs: eps 0.4 gives 52 noise points and extra small clusters, eps 1.0 gives the three groups plus 2 noise points', () => {
    const d = makeDataset('blobs', 3, 200);
    const a = dbscan(d.points, 0.4, 4);
    expect(a.filter((l) => l < 0).length).toBe(52);
    expect(new Set(a.filter((l) => l >= 0)).size).toBeGreaterThan(3);
    const b = dbscan(d.points, 1.0, 4);
    expect(new Set(b.filter((l) => l >= 0)).size).toBe(3);
    expect(b.filter((l) => l < 0).length).toBe(2);
  });
  it('moons: eps 0.4 shatters, eps 1.0 merges into one cluster, 0.75 is right', () => {
    const d = makeDataset('moons', 3, 200);
    expect(new Set(dbscan(d.points, 0.4, 4).filter((l) => l >= 0)).size).toBeGreaterThan(4);
    expect(new Set(dbscan(d.points, 1.0, 4)).size).toBe(1);
    expect(adjustedRand(d.truth, dbscan(d.points, 0.75, 4))).toBe(1);
  });
});
