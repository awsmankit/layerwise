/**
 * How the size of the numbers flowing through a deep stack of layers changes with the scale of the
 * starting weights. Used by the "Why scale matters" figure in "Training deep networks". A fixed set
 * of random numbers is built once from a seed; only the scale changes when the learner moves a slider.
 */
import { gauss, rng } from './nn';

export type SignalKind = 'relu' | 'tanh';

export const WIDTH = 96;
export const LAYERS = 20;
const BATCH = 4;

export type SignalSetup = {
  /** weights[layer] is WIDTH x WIDTH of standard normal numbers, to be multiplied by gain / sqrt(WIDTH). */
  weights: Float64Array[];
  inputs: Float64Array[];
};

export function makeSetup(seed = 3): SignalSetup {
  const r = rng(seed);
  const weights = Array.from({ length: LAYERS }, () => Float64Array.from({ length: WIDTH * WIDTH }, () => gauss(r)));
  const inputs = Array.from({ length: BATCH }, () => Float64Array.from({ length: WIDTH }, () => gauss(r)));
  return { weights, inputs };
}

/**
 * The root-mean-square size of the numbers after each of the LAYERS layers (a few random inputs
 * averaged). The weights have variance gain^2 / WIDTH, so gain = 1 is "Xavier-style" scaling and gain = sqrt(2)
 * is "He" scaling. The input itself has size about 1.
 */
export function signalSizes(setup: SignalSetup, gain: number, kind: SignalKind): number[] {
  const std = gain / Math.sqrt(WIDTH);
  const sums = new Array<number>(LAYERS).fill(0);
  for (const input of setup.inputs) {
    let a = input;
    for (let l = 0; l < LAYERS; l++) {
      const w = setup.weights[l];
      const next = new Float64Array(WIDTH);
      let sq = 0;
      for (let j = 0; j < WIDTH; j++) {
        let z = 0;
        for (let i = 0; i < WIDTH; i++) z += w[j * WIDTH + i] * a[i];
        z *= std;
        const v = kind === 'relu' ? (z > 0 ? z : 0) : Math.tanh(z);
        next[j] = v;
        sq += v * v;
      }
      sums[l] += Math.sqrt(sq / WIDTH);
      a = next;
    }
  }
  return sums.map((s) => s / setup.inputs.length);
}
