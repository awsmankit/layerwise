/*
 * Logic for the "Detection and segmentation" lesson: boxes, intersection over union (IoU),
 * non-maximum suppression (NMS) and average precision (AP).
 *
 * Boxes use corner coordinates (x1, y1) top-left and (x2, y2) bottom-right, with y growing downwards,
 * as in most image libraries. The behaviour follows the common reference implementations:
 *  - IoU and NMS: torchvision.ops.box_iou and torchvision.ops.nms (a box is suppressed when its IoU
 *    with an already kept box is strictly greater than the threshold).
 *  - Matching and AP: the COCO evaluation code (pycocotools) for the 101-point average, and the
 *    all-point area under the precision envelope used by PASCAL VOC from 2010 for the plain version.
 */

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  id: string;
  box: Box;
  score: number;
}

export function area(b: Box): number {
  return Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
}

export interface IouParts {
  /** Width and height of the shared rectangle (0 when the boxes do not touch). */
  interW: number;
  interH: number;
  inter: number;
  areaA: number;
  areaB: number;
  union: number;
  iou: number;
}

/** Every number in the IoU sum, so a lesson can show the working. */
export function iouParts(a: Box, b: Box): IouParts {
  const interW = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const interH = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const inter = interW * interH;
  const areaA = area(a);
  const areaB = area(b);
  const union = areaA + areaB - inter;
  return { interW, interH, inter, areaA, areaB, union, iou: union > 0 ? inter / union : 0 };
}

export function iou(a: Box, b: Box): number {
  return iouParts(a, b).iou;
}

/* ---------- non-maximum suppression ---------- */

export interface NmsRow {
  det: Detection;
  kept: boolean;
  /** When removed: the kept box that removed it, and their IoU. */
  by?: Detection;
  iou?: number;
}

/**
 * Greedy NMS. Go through the boxes from the highest score to the lowest. Keep a box unless it overlaps
 * an already kept box by more than the threshold. Rows come back in score order. Ties keep input order.
 */
export function nms(dets: Detection[], threshold: number): NmsRow[] {
  const order = dets.map((d, i) => ({ d, i })).sort((p, q) => q.d.score - p.d.score || p.i - q.i);
  const kept: Detection[] = [];
  const rows: NmsRow[] = [];
  for (const { d } of order) {
    let by: Detection | undefined;
    let best = 0;
    for (const k of kept) {
      const v = iou(d.box, k.box);
      if (v > threshold && (by === undefined || v > best)) {
        by = k;
        best = v;
      }
    }
    if (by) {
      rows.push({ det: d, kept: false, by, iou: best });
    } else {
      kept.push(d);
      rows.push({ det: d, kept: true });
    }
  }
  return rows;
}

/* ---------- matching and average precision ---------- */

export interface Ranked {
  score: number;
  box: Box;
}

export interface RankedRow {
  rank: number;
  score: number;
  /** Index of the ground-truth box this detection was matched to, or -1. */
  gt: number;
  /** IoU with the best ground-truth box, matched or not, for display. */
  bestIou: number;
  /** True positive at this IoU threshold. */
  tp: boolean;
  tpCount: number;
  fpCount: number;
  precision: number;
  recall: number;
}

/**
 * Match detections to ground truth the way the COCO code does for one class in one pool of images:
 * highest score first; each detection takes the unmatched ground-truth box with the highest IoU that is
 * at least the threshold. A second detection of an already matched object is a false positive.
 */
export function matchDetections(dets: Ranked[], gts: Box[], threshold: number): RankedRow[] {
  const order = dets.map((d, i) => ({ d, i })).sort((p, q) => q.d.score - p.d.score || p.i - q.i);
  const taken = new Set<number>();
  const rows: RankedRow[] = [];
  let tpCount = 0;
  let fpCount = 0;
  order.forEach(({ d }, r) => {
    let m = -1;
    let best = threshold;
    let bestIou = 0;
    gts.forEach((g, gi) => {
      const v = iou(d.box, g);
      if (v > bestIou) bestIou = v;
      if (taken.has(gi)) return;
      if (v < best) return;
      best = v;
      m = gi;
    });
    if (m >= 0) taken.add(m);
    const tp = m >= 0;
    if (tp) tpCount += 1;
    else fpCount += 1;
    rows.push({
      rank: r + 1,
      score: d.score,
      gt: m,
      bestIou,
      tp,
      tpCount,
      fpCount,
      precision: tpCount / (tpCount + fpCount),
      recall: gts.length > 0 ? tpCount / gts.length : 0,
    });
  });
  return rows;
}

/** One step of the all-point area: a slice of recall and the precision that applies to it. */
export interface ApStep {
  recallFrom: number;
  recallTo: number;
  /** Interpolated precision: the highest precision reached at this recall or any higher recall. */
  precision: number;
  area: number;
}

/** The precision envelope: at each point, the best precision at this recall or higher. */
export function envelope(precisions: number[]): number[] {
  const out = precisions.slice();
  for (let i = out.length - 2; i >= 0; i--) out[i] = Math.max(out[i], out[i + 1]);
  return out;
}

/**
 * All-point average precision (PASCAL VOC 2010 onwards): the area under the precision envelope, summed
 * over the places where recall changes.
 */
export function apAllPoint(rows: RankedRow[]): { ap: number; steps: ApStep[] } {
  const env = envelope(rows.map((r) => r.precision));
  const steps: ApStep[] = [];
  let prev = 0;
  let ap = 0;
  rows.forEach((r, i) => {
    if (r.recall > prev) {
      const a = (r.recall - prev) * env[i];
      steps.push({ recallFrom: prev, recallTo: r.recall, precision: env[i], area: a });
      ap += a;
      prev = r.recall;
    }
  });
  return { ap, steps };
}

/**
 * COCO-style average precision for one threshold: take the precision envelope, read it at 101 evenly
 * spaced recall levels 0, 0.01, ... 1 (zero where recall is never reached), and average.
 */
export function apCoco101(rows: RankedRow[]): number {
  if (rows.length === 0) return 0;
  const recall = rows.map((r) => r.recall);
  const env = envelope(rows.map((r) => r.precision));
  let total = 0;
  for (let k = 0; k <= 100; k++) {
    const level = k / 100;
    // first row whose recall reaches the level (a small tolerance guards against rounding)
    const idx = recall.findIndex((v) => v >= level - 1e-12);
    total += idx >= 0 ? env[idx] : 0;
  }
  return total / 101;
}

export const COCO_THRESHOLDS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];

/** COCO's headline number for one class: the 101-point AP averaged over the ten IoU thresholds. */
export function apCocoMean(dets: Ranked[], gts: Box[]): number {
  const aps = COCO_THRESHOLDS.map((t) => apCoco101(matchDetections(dets, gts, t)));
  return aps.reduce((s, v) => s + v, 0) / aps.length;
}

/* ---------- the scripted scenes used in the lesson ---------- */

/** Two people standing close together. The boxes of the true people overlap by an IoU of about 0.28. */
export const PERSON_A: Box = { x1: 50, y1: 40, x2: 160, y2: 190 };
export const PERSON_B: Box = { x1: 110, y1: 50, x2: 220, y2: 190 };

/** Eight detections: four for person A, three for person B and one wrong box on empty ground. */
export const NMS_SCENE: Detection[] = [
  { id: 'A1', box: { x1: 52, y1: 42, x2: 158, y2: 188 }, score: 0.95 },
  { id: 'A2', box: { x1: 46, y1: 36, x2: 156, y2: 184 }, score: 0.88 },
  { id: 'A3', box: { x1: 60, y1: 48, x2: 168, y2: 196 }, score: 0.74 },
  { id: 'A4', box: { x1: 40, y1: 30, x2: 150, y2: 176 }, score: 0.52 },
  { id: 'B1', box: { x1: 112, y1: 52, x2: 218, y2: 188 }, score: 0.91 },
  { id: 'B2', box: { x1: 118, y1: 56, x2: 226, y2: 190 }, score: 0.8 },
  { id: 'B3', box: { x1: 104, y1: 46, x2: 212, y2: 184 }, score: 0.61 },
  { id: 'X1', box: { x1: 250, y1: 120, x2: 310, y2: 185 }, score: 0.35 },
];

/** Six objects in a big test set (80 by 80 boxes, 100 apart) and ten detections after NMS. */
export const AP_GTS: Box[] = Array.from({ length: 6 }, (_, i) => ({ x1: 100 * i, y1: 0, x2: 100 * i + 80, y2: 80 }));

const shift = (g: Box, dx: number, dy: number): Box => ({ x1: g.x1 + dx, y1: g.y1 + dy, x2: g.x2 + dx, y2: g.y2 + dy });

export const AP_DETS: Ranked[] = [
  { score: 0.97, box: shift(AP_GTS[0], 4, 2) },
  { score: 0.94, box: shift(AP_GTS[1], 6, 4) },
  { score: 0.9, box: shift(AP_GTS[0], -14, 0) }, // a second box on object 1
  { score: 0.85, box: shift(AP_GTS[2], 10, 6) },
  { score: 0.8, box: { x1: 500, y1: 150, x2: 580, y2: 230 } }, // nothing there
  { score: 0.72, box: shift(AP_GTS[3], 14, 10) },
  { score: 0.6, box: shift(AP_GTS[4], -20, 14) }, // a sloppy box
  { score: 0.5, box: { x1: 600, y1: 150, x2: 680, y2: 230 } },
  { score: 0.42, box: shift(AP_GTS[5], 3, 1) },
  { score: 0.3, box: { x1: 700, y1: 150, x2: 780, y2: 230 } },
];

/* ---------- a plain-words summary of what NMS left ---------- */

export interface KeptSummary {
  kept: number;
  /** True objects that have at least one kept box with IoU of at least `match`. */
  found: number;
  /** Kept boxes that sit on an object already covered by a better kept box. */
  duplicates: number;
  /** Kept boxes that match no true object. */
  wrong: number;
}

export function summariseKept(rows: NmsRow[], gts: Box[], match = 0.5): KeptSummary {
  const covered = new Set<number>();
  let duplicates = 0;
  let wrong = 0;
  let kept = 0;
  for (const r of rows) {
    if (!r.kept) continue;
    kept += 1;
    let best = -1;
    let bestIou = 0;
    gts.forEach((g, i) => {
      const v = iou(r.det.box, g);
      if (v >= match && v > bestIou) {
        bestIou = v;
        best = i;
      }
    });
    if (best < 0) wrong += 1;
    else if (covered.has(best)) duplicates += 1;
    else covered.add(best);
  }
  return { kept, found: covered.size, duplicates, wrong };
}
