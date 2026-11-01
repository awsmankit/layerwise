import { describe, expect, it } from 'vitest';
import {
  AP_DETS,
  AP_GTS,
  COCO_THRESHOLDS,
  NMS_SCENE,
  PERSON_A,
  PERSON_B,
  apAllPoint,
  apCoco101,
  apCocoMean,
  area,
  envelope,
  iou,
  iouParts,
  matchDetections,
  nms,
  summariseKept,
  type Box,
  type Detection,
} from './detection';

const b = (x1: number, y1: number, x2: number, y2: number): Box => ({ x1, y1, x2, y2 });

describe('iou, worked by hand', () => {
  it('is 1 for identical boxes and 0 for boxes that do not touch', () => {
    expect(iou(b(0, 0, 10, 10), b(0, 0, 10, 10))).toBe(1);
    expect(iou(b(0, 0, 10, 10), b(20, 20, 30, 30))).toBe(0);
  });

  it('touching edges share no area', () => {
    expect(iou(b(0, 0, 10, 10), b(10, 0, 20, 10))).toBe(0);
  });

  it('two 10 by 10 boxes sharing a 5 by 10 strip: 50 / 150 = one third', () => {
    const p = iouParts(b(0, 0, 10, 10), b(5, 0, 15, 10));
    expect(p.inter).toBe(50);
    expect(p.union).toBe(150);
    expect(p.iou).toBeCloseTo(1 / 3, 10);
  });

  it('the lesson example: 12 shared, 42 together, about 0.286', () => {
    const p = iouParts(b(2, 2, 8, 6), b(4, 3, 10, 8));
    expect(p.interW).toBe(4);
    expect(p.interH).toBe(3);
    expect(p.inter).toBe(12);
    expect(p.areaA).toBe(24);
    expect(p.areaB).toBe(30);
    expect(p.union).toBe(42);
    expect(p.iou).toBeCloseTo(12 / 42, 10);
  });

  it('a small box inside a big one: IoU is the area ratio', () => {
    expect(iou(b(0, 0, 10, 10), b(2, 2, 6, 6))).toBeCloseTo(16 / 100, 10);
  });

  it('is symmetric, and an empty box gives 0 instead of dividing by zero', () => {
    const p = b(1, 2, 9, 7);
    const q = b(4, 0, 12, 5);
    expect(iou(p, q)).toBe(iou(q, p));
    expect(iou(b(3, 3, 3, 3), b(3, 3, 3, 3))).toBe(0);
    expect(area(b(5, 5, 2, 2))).toBe(0);
  });

  it('matches torchvision.ops.box_iou on six random pairs (reference run offline)', () => {
    const pairs: [Box, Box, number][] = [
      [b(10, 30, 34, 62), b(20, 1, 42, 38), 0.07619],
      [b(3, 11, 41, 32), b(29, 16, 55, 37), 0.166667],
      [b(2, 13, 35, 35), b(7, 2, 44, 35), 0.46281],
      [b(1, 26, 39, 49), b(30, 7, 70, 47), 0.082713],
      [b(18, 30, 39, 68), b(18, 12, 39, 39), 0.160714],
      [b(1, 17, 25, 46), b(13, 4, 50, 27), 0.084093],
    ];
    for (const [p, q, want] of pairs) expect(iou(p, q)).toBeCloseTo(want, 5);
  });
});

/* A random scene of 25 boxes made offline with Python's random.seed(7); the expected indices of the kept
   boxes come from torchvision.ops.nms. */
const RAND_BOXES: Box[] = [
  [10, 30, 34, 62], [20, 1, 42, 38], [3, 11, 41, 32], [29, 16, 55, 37], [2, 13, 35, 35], [7, 2, 44, 35], [1, 26, 39, 49],
  [30, 7, 70, 47], [18, 30, 39, 68], [18, 12, 39, 39], [1, 17, 25, 46], [13, 4, 50, 27], [18, 9, 55, 50], [5, 3, 43, 41],
  [20, 6, 51, 29], [17, 22, 39, 60], [1, 19, 27, 54], [21, 17, 54, 61], [10, 14, 48, 48], [11, 9, 38, 54], [5, 22, 49, 49],
  [2, 18, 31, 54], [15, 28, 45, 71], [14, 9, 53, 31], [3, 16, 36, 41],
].map(([x1, y1, x2, y2]) => b(x1, y1, x2, y2));
const RAND_SCORES = [
  0.7571, 0.152, 0.489, 0.0392, 0.6682, 0.7646, 0.573, 0.8755, 0.3137, 0.6953, 0.5944, 0.5799, 0.4562, 0.84, 0.9447, 0.4741,
  0.6642, 0.0607, 0.7015, 0.6471, 0.9931, 0.8219, 0.2846, 0.3858, 0.6687,
];
const RAND_DETS: Detection[] = RAND_BOXES.map((box, i) => ({ id: String(i), box, score: RAND_SCORES[i] }));
const kept = (dets: Detection[], t: number) =>
  nms(dets, t)
    .filter((r) => r.kept)
    .map((r) => Number(r.det.id))
    .sort((p, q) => p - q);

describe('non-maximum suppression', () => {
  it('matches torchvision.ops.nms on 25 random boxes at three thresholds', () => {
    expect(kept(RAND_DETS, 0.3)).toEqual([4, 7, 8, 14, 20]);
    expect(kept(RAND_DETS, 0.5)).toEqual([0, 3, 4, 7, 9, 12, 13, 14, 15, 19, 20, 21, 22]);
    expect(kept(RAND_DETS, 0.7)).toEqual([0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24]);
  });

  it('matches torchvision on the eight scripted detections at every threshold', () => {
    const want: Record<number, string[]> = {
      0.1: ['A1', 'X1'],
      0.2: ['A1', 'X1'],
      0.3: ['A1', 'B1', 'X1'],
      0.4: ['A1', 'B1', 'X1'],
      0.5: ['A1', 'B1', 'X1'],
      0.6: ['A1', 'B1', 'X1'],
      0.7: ['A1', 'B1', 'X1'],
      0.8: ['A1', 'B1', 'A3', 'A4', 'X1'],
      0.9: ['A1', 'B1', 'A2', 'B2', 'A3', 'B3', 'A4', 'X1'],
    };
    for (const [t, ids] of Object.entries(want)) {
      const got = nms(NMS_SCENE, Number(t))
        .filter((r) => r.kept)
        .map((r) => r.det.id)
        .sort();
      expect(got, `threshold ${t}`).toEqual([...ids].sort());
    }
  });

  it('the two true people overlap by about 0.28, so a threshold below that removes a real object', () => {
    expect(iou(PERSON_A, PERSON_B)).toBeCloseTo(0.2811, 3);
    expect(iou(NMS_SCENE[0].box, NMS_SCENE[4].box)).toBeCloseTo(0.265, 3);
  });

  it('reports which kept box removed each one, and by how much', () => {
    const rows = nms(NMS_SCENE, 0.5);
    const a2 = rows.find((r) => r.det.id === 'A2')!;
    expect(a2.kept).toBe(false);
    expect(a2.by?.id).toBe('A1');
    expect(a2.iou).toBeCloseTo(0.869, 3);
    const a3 = rows.find((r) => r.det.id === 'A3')!;
    expect(a3.iou).toBeCloseTo(0.773, 3);
    expect(rows.find((r) => r.det.id === 'A4')!.iou).toBeCloseTo(0.714, 3);
  });

  it('a box that overlaps only a removed box is not itself removed by it', () => {
    // C overlaps B heavily and B overlaps A heavily, but C does not overlap A. B is removed, so C survives.
    const dets: Detection[] = [
      { id: 'A', box: b(0, 0, 10, 10), score: 0.9 },
      { id: 'B', box: b(3, 0, 13, 10), score: 0.8 },
      { id: 'C', box: b(6, 0, 16, 10), score: 0.7 },
    ];
    expect(kept(dets, 0.5).length).toBe(2);
    expect(nms(dets, 0.5).map((r) => [r.det.id, r.kept])).toEqual([['A', true], ['B', false], ['C', true]]);
  });

  it('returns rows in score order, keeps ties in input order, and does not change the input', () => {
    const dets: Detection[] = [
      { id: 'low', box: b(0, 0, 5, 5), score: 0.2 },
      { id: 'tie1', box: b(20, 0, 25, 5), score: 0.5 },
      { id: 'tie2', box: b(40, 0, 45, 5), score: 0.5 },
    ];
    expect(nms(dets, 0.5).map((r) => r.det.id)).toEqual(['tie1', 'tie2', 'low']);
    expect(dets[0].id).toBe('low');
  });
});

describe('average precision', () => {
  it('envelope makes precision never rise as recall rises', () => {
    expect(envelope([1, 0.5, 0.67, 0.5, 0.6])).toEqual([1, 0.67, 0.67, 0.6, 0.6]);
  });

  it('threshold 0.5: five true positives out of six objects, worked by hand', () => {
    const rows = matchDetections(AP_DETS, AP_GTS, 0.5);
    expect(rows.map((r) => (r.tp ? 1 : 0))).toEqual([1, 1, 0, 1, 0, 1, 0, 0, 1, 0]);
    expect(rows[2].gt).toBe(-1); // the second box on object 1 is a false positive
    expect(rows[2].bestIou).toBeCloseTo(0.702, 3);
    expect(rows[6].bestIou).toBeCloseTo(0.448, 3); // the sloppy box
    const last = rows[rows.length - 1];
    expect(last.tpCount).toBe(5);
    expect(last.fpCount).toBe(5);
    expect(last.recall).toBeCloseTo(5 / 6, 10);
    // precision at each true positive: 1/1, 2/2, 3/4, 4/6, 5/9
    const atTp = rows.filter((r) => r.tp).map((r) => r.precision);
    expect(atTp[0]).toBe(1);
    expect(atTp[1]).toBe(1);
    expect(atTp[2]).toBeCloseTo(0.75, 10);
    expect(atTp[3]).toBeCloseTo(4 / 6, 10);
    expect(atTp[4]).toBeCloseTo(5 / 9, 10);
    const { ap, steps } = apAllPoint(rows);
    expect(steps).toHaveLength(5);
    // each step is one sixth of recall: (1 + 1 + 3/4 + 4/6 + 5/9) / 6
    expect(ap).toBeCloseTo((1 + 1 + 0.75 + 4 / 6 + 5 / 9) / 6, 10);
    expect(ap).toBeCloseTo(0.662037, 5);
  });

  it('threshold 0.75 loses the loose boxes: three true positives', () => {
    const rows = matchDetections(AP_DETS, AP_GTS, 0.75);
    expect(rows.map((r) => (r.tp ? 1 : 0))).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 1, 0]);
    expect(apAllPoint(rows).ap).toBeCloseTo(0.388889, 5);
  });

  it('threshold 0.9 leaves one true positive, found late', () => {
    const rows = matchDetections(AP_DETS, AP_GTS, 0.9);
    expect(rows.filter((r) => r.tp)).toHaveLength(1);
    expect(apAllPoint(rows).ap).toBeCloseTo(0.018519, 5);
  });

  it('threshold 0.3 also finds the sloppy box: all-point AP 0.80754', () => {
    const rows = matchDetections(AP_DETS, AP_GTS, 0.3);
    expect(rows.map((r) => (r.tp ? 1 : 0))).toEqual([1, 1, 0, 1, 0, 1, 1, 0, 1, 0]);
    expect(apAllPoint(rows).ap).toBeCloseTo(0.80754, 4);
  });

  it('matches pycocotools: 101-point AP at each threshold and the ten-threshold mean', () => {
    // Reference: COCOeval on the same boxes, run offline. AP50 0.661991, AP75 0.392739, mean 0.360616.
    const want = [0.661991, 0.661991, 0.533278, 0.533278, 0.392739, 0.392739, 0.205721, 0.205721, 0.018702, 0];
    COCO_THRESHOLDS.forEach((t, i) => {
      expect(apCoco101(matchDetections(AP_DETS, AP_GTS, t)), `threshold ${t}`).toBeCloseTo(want[i], 5);
    });
    expect(apCocoMean(AP_DETS, AP_GTS)).toBeCloseTo(0.360616, 5);
  });

  it('a perfect detector scores 1 and no detections score 0', () => {
    const perfect = AP_GTS.map((g, i) => ({ score: 1 - i / 10, box: g }));
    expect(apAllPoint(matchDetections(perfect, AP_GTS, 0.5)).ap).toBeCloseTo(1, 10);
    expect(apCoco101(matchDetections(perfect, AP_GTS, 0.5))).toBeCloseTo(1, 10);
    expect(apAllPoint(matchDetections([], AP_GTS, 0.5)).ap).toBe(0);
    expect(apCoco101(matchDetections([], AP_GTS, 0.5))).toBe(0);
  });

  it('ranking matters: the same boxes with the scores reversed give a lower AP', () => {
    const good = AP_DETS;
    const reversed = AP_DETS.map((d, i) => ({ ...d, score: 0.1 + 0.05 * i }));
    const a = apAllPoint(matchDetections(good, AP_GTS, 0.5)).ap;
    const c = apAllPoint(matchDetections(reversed, AP_GTS, 0.5)).ap;
    expect(c).toBeLessThan(a);
  });
});

describe('summary of what NMS left', () => {
  const gts = [PERSON_A, PERSON_B];
  const sum = (t: number) => summariseKept(nms(NMS_SCENE, t), gts);

  it('0.5 keeps one box per person and the wrong box on empty ground', () => {
    expect(sum(0.5)).toEqual({ kept: 3, found: 2, duplicates: 0, wrong: 1 });
  });

  it('too low (0.2) removes the real second person', () => {
    expect(sum(0.2)).toEqual({ kept: 2, found: 1, duplicates: 0, wrong: 1 });
  });

  it('too high (0.9) leaves every duplicate behind', () => {
    expect(sum(0.9)).toEqual({ kept: 8, found: 2, duplicates: 5, wrong: 1 });
  });

  it('0.8 leaves two duplicates of person A', () => {
    expect(sum(0.8)).toEqual({ kept: 5, found: 2, duplicates: 2, wrong: 1 });
  });
});
