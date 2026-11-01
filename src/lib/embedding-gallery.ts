import { GROUPS_DATA, GROUPS_TRUTH, NOISE_DATA, type GalleryData, type LayoutKey } from './embedding-gallery-data';

export { GROUPS_TRUTH, type GalleryData, type LayoutKey };
export const GALLERY: { groups: GalleryData; noise: GalleryData } = { groups: GROUPS_DATA, noise: NOISE_DATA };

export const LAYOUT_LABELS: Record<LayoutKey, string> = {
  pca: 'PCA',
  tsne2: 't-SNE, perplexity 2',
  tsne5: 't-SNE, perplexity 5',
  tsne30: 't-SNE, perplexity 30',
  tsne100: 't-SNE, perplexity 100',
  umap3: 'UMAP, 3 neighbours',
  umap15: 'UMAP, 15 neighbours',
  umap60: 'UMAP, 60 neighbours',
};

/** The points of one layout as [x, y] pairs. */
export function layoutPoints(data: GalleryData, key: LayoutKey): [number, number][] {
  const xy = data.layouts[key].xy;
  const out: [number, number][] = [];
  for (let i = 0; i < xy.length; i += 2) out.push([xy[i] / 100, xy[i + 1] / 100]);
  return out;
}

function centre(points: [number, number][], groups: number[], g: number): [number, number] {
  let sx = 0;
  let sy = 0;
  let n = 0;
  points.forEach((p, i) => {
    if (groups[i] === g) {
      sx += p[0];
      sy += p[1];
      n++;
    }
  });
  return [sx / n, sy / n];
}

/** Root-mean-square distance of a group's points from the group's own centre in the layout. */
export function groupSpread(points: [number, number][], groups: number[], g: number): number {
  const c = centre(points, groups, g);
  let s = 0;
  let n = 0;
  points.forEach((p, i) => {
    if (groups[i] === g) {
      s += (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2;
      n++;
    }
  });
  return Math.sqrt(s / n);
}

/**
 * Two ratios that a faithful picture would reproduce for the three-group data:
 * how much further group C's centre is from A than B's centre is (A-C divided by A-B), and how much wider group B is than group A.
 * (Spread here is the root-mean-square distance from the group centre; the scale of the layout cancels out of both ratios.)
 */
export function groupRatios(points: [number, number][], groups: number[]): { acOverAb: number; bOverA: number } {
  const [a, b, c] = [0, 1, 2].map((g) => centre(points, groups, g));
  const d = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  return { acOverAb: d(a, c) / d(a, b), bOverA: groupSpread(points, groups, 1) / groupSpread(points, groups, 0) };
}

/** The same two ratios in the original 10-dimensional data. */
export function trueRatios(): { acOverAb: number; bOverA: number } {
  return { acOverAb: GROUPS_TRUTH.centreDist[1] / GROUPS_TRUTH.centreDist[0], bOverA: GROUPS_TRUTH.spread[1] / GROUPS_TRUTH.spread[0] };
}
