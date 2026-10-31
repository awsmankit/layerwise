import { describe, expect, it } from 'vitest';
import {
  FACE,
  HOUSE,
  PICTURES,
  PRESETS,
  autoDivide,
  convParams,
  convolve,
  denseParams,
  greyFor,
  isDetector,
  maxPool,
  origin,
  outSize,
  patchAt,
  products,
  receptiveField,
  respond,
  show,
  sumOf,
} from './convolution';

const kernel = (id: string) => PRESETS.find((p) => p.id === id)!.kernel;
const same = { pad: 1, stride: 1 };
const valid = { pad: 0, stride: 1 };

describe('built-in pictures', () => {
  it('are 12 by 12 with brightness 0 to 9', () => {
    for (const p of PICTURES) {
      expect(p.pixels).toHaveLength(12);
      for (const row of p.pixels) {
        expect(row).toHaveLength(12);
        for (const v of row) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(9);
        }
      }
    }
  });
});

describe('output size', () => {
  it('shrinks without padding and keeps the size with padding', () => {
    expect(outSize(12, 3, 0, 1)).toBe(10);
    expect(outSize(12, 3, 1, 1)).toBe(12);
  });
  it('halves roughly with stride 2', () => {
    expect(outSize(12, 3, 1, 2)).toBe(6);
    expect(outSize(12, 3, 0, 2)).toBe(5);
  });
  it('matches the size of the feature map', () => {
    expect(convolve(HOUSE, kernel('blur'), same)).toHaveLength(12);
    expect(convolve(HOUSE, kernel('blur'), valid)[0]).toHaveLength(10);
    expect(convolve(HOUSE, kernel('blur'), { pad: 1, stride: 2 })).toHaveLength(6);
  });
  it('is 0 when the filter does not fit', () => {
    expect(outSize(2, 3, 0, 1)).toBe(0);
  });
});

describe('patches', () => {
  it('read zeros outside the picture', () => {
    expect(patchAt(HOUSE, -1, -1)).toEqual([[0, 0, 0], [0, 8, 8], [0, 8, 8]]);
    expect(patchAt(HOUSE, 10, 10)[2]).toEqual([0, 0, 0]);
  });
  it('are found from the output position, padding and stride', () => {
    expect(origin(0, 0, same)).toEqual([-1, -1]);
    expect(origin(3, 4, valid)).toEqual([3, 4]);
    expect(origin(2, 5, { pad: 1, stride: 2 })).toEqual([3, 9]);
  });
});

describe('multiply and add', () => {
  it('shows the nine products and their sum', () => {
    const patch = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const w = [[1, 0, -1], [2, 0, -2], [1, 0, -1]];
    expect(products(patch, w)).toEqual([[1, 0, -3], [8, 0, -12], [7, 0, -9]]);
    expect(respond(patch, { w, divide: 1 })).toBe(-8);
  });
  it('agrees with the feature map at every position', () => {
    for (const opts of [same, valid, { pad: 1, stride: 2 }]) {
      const map = convolve(HOUSE, kernel('sharpen'), opts);
      for (let i = 0; i < map.length; i++)
        for (let j = 0; j < map[0].length; j++) {
          const [t, l] = origin(i, j, opts);
          expect(map[i][j]).toBe(respond(patchAt(HOUSE, t, l), kernel('sharpen')));
        }
    }
  });
});

describe('filters', () => {
  const identity = { w: [[0, 0, 0], [0, 1, 0], [0, 0, 0]], divide: 1 };
  it('an identity filter returns the picture', () => {
    expect(convolve(FACE, identity, same)).toEqual(FACE);
  });
  it('a blur leaves a flat area as it was', () => {
    const map = convolve(HOUSE, kernel('blur'), valid);
    expect(map[0][0]).toBe(8); // flat sky
  });
  it('a blur makes a hard edge softer', () => {
    // row 9 is wall (5), row 10 is lawn (3) in column 2: the blurred value sits between them
    const v = convolve(HOUSE, kernel('blur'), same)[9][2];
    expect(v).toBeGreaterThan(3);
    expect(v).toBeLessThan(5);
  });
  it('edge filters are silent on flat areas and fire on an edge', () => {
    for (const id of ['vertical', 'horizontal', 'outline']) {
      expect(isDetector(kernel(id))).toBe(true);
      expect(convolve(HOUSE, kernel(id), valid)[0][0], id).toBe(0);
    }
    // the left side of the sun (8 then 9 going right): a vertical edge filter responds
    expect(respond(patchAt(HOUSE, 0, 8), kernel('vertical'))).toBeGreaterThan(0);
  });
  it('a vertical edge filter ignores horizontal lines and vice versa', () => {
    const horizontalLine = [[8, 8, 8], [8, 8, 8], [3, 3, 3]];
    const verticalLine = [[8, 8, 3], [8, 8, 3], [8, 8, 3]];
    expect(respond(horizontalLine, kernel('vertical'))).toBe(0);
    expect(respond(horizontalLine, kernel('horizontal'))).toBeLessThan(0);
    expect(respond(verticalLine, kernel('horizontal'))).toBe(0);
    expect(respond(verticalLine, kernel('vertical'))).toBeLessThan(0);
  });
  it('divides a custom filter that adds to more than one', () => {
    expect(autoDivide([[1, 1, 1], [1, 1, 1], [1, 1, 1]])).toBe(9);
    expect(autoDivide([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])).toBe(1);
    expect(autoDivide([[0, 0, 0], [0, 0, 0], [0, 0, 0]])).toBe(1);
  });
  it('presets add to 0 or 1 after dividing, except the blur which is divided', () => {
    expect(sumOf(kernel('sharpen').w)).toBe(1);
    expect(sumOf(kernel('blur').w) / kernel('blur').divide).toBe(1);
  });
});

describe('the worked example in the lesson', () => {
  it('gives 12 for a vertical-edge filter on the right wall of the house, and 0 on flat sky', () => {
    const wall = patchAt(HOUSE, 5, 8);
    expect(wall).toEqual([[5, 8, 8], [5, 8, 8], [5, 8, 8]]);
    expect(respond(wall, kernel('vertical'))).toBe(12);
    expect(respond(patchAt(HOUSE, 0, 0), kernel('vertical'))).toBe(0);
    expect(convolve(HOUSE, kernel('vertical'), valid)[5][8]).toBe(12);
  });
});

describe('pooling', () => {
  it('keeps the biggest value in each 2 by 2 block', () => {
    const m = [[1, 2, 5, 0], [3, 4, 1, 1], [0, 0, 9, 2], [1, 0, 3, 4]];
    expect(maxPool(m)).toEqual([[4, 5], [1, 9]]);
  });
  it('halves the size', () => {
    expect(maxPool(convolve(HOUSE, kernel('outline'), same))).toHaveLength(6);
    expect(maxPool(convolve(HOUSE, kernel('outline'), valid))[0]).toHaveLength(5);
  });
});

describe('counting weights', () => {
  it('a fully connected layer on a 224 by 224 colour picture with 1000 outputs needs 150.5 million weights', () => {
    expect(denseParams(224 * 224 * 3, 1000, false)).toBe(150_528_000);
    expect(denseParams(224 * 224 * 3, 1000)).toBe(150_529_000);
  });
  it('a 3 by 3 convolution with 64 filters on 3 channels needs 1,792 numbers and ignores picture size', () => {
    expect(convParams(3, 3, 64, false)).toBe(1728);
    expect(convParams(3, 3, 64)).toBe(1792);
  });
  it('a plain 3 by 3 on 64 channels to 64 channels needs 36,928', () => {
    expect(convParams(3, 64, 64)).toBe(36_928);
  });
});

describe('receptive field', () => {
  it('grows by 2 for each stacked 3 by 3 layer', () => {
    expect(receptiveField([{ k: 3, stride: 1 }])).toBe(3);
    expect(receptiveField([{ k: 3, stride: 1 }, { k: 3, stride: 1 }])).toBe(5);
    expect(receptiveField(Array(3).fill({ k: 3, stride: 1 }))).toBe(7);
  });
  it('grows faster when pooling is in between', () => {
    const conv = { k: 3, stride: 1 };
    const pool = { k: 2, stride: 2 };
    expect(receptiveField([conv, pool, conv])).toBe(8);
    expect(receptiveField([conv, pool, conv, pool, conv])).toBe(18);
  });
});

describe('display helpers', () => {
  it('maps brightness to grey and clips', () => {
    expect(greyFor(0)).toBe(0);
    expect(greyFor(9)).toBe(255);
    expect(greyFor(30)).toBe(255);
    expect(greyFor(-4)).toBe(0);
  });
  it('formats numbers with a real minus sign and one decimal at most', () => {
    expect(show(-3)).toBe('−3');
    expect(show(2.666)).toBe('2.7');
    expect(show(4)).toBe('4');
  });
});
