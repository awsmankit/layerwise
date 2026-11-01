import { describe, expect, it } from 'vitest';
import {
  FITS,
  breakEvenServedTokens,
  fixedSize,
  fitPowerLaw,
  flopsFromGpuDays,
  gpuPlan,
  human,
  inferFlops,
  lifetimeFlops,
  loss,
  matchedAlternative,
  optimalAllocation,
  sci,
  tokensForLoss,
  trainFlops,
} from './scaling-laws';

const epoch = FITS.epoch;
const hoffmann = FITS.hoffmann;

describe('compute estimate 6 N D', () => {
  it('is 5.88e23 for 70B parameters on 1.4T tokens (the Chinchilla model)', () => {
    expect(trainFlops(70e9, 1.4e12)).toBeCloseTo(5.88e23, -10);
    expect(trainFlops(70e9, 1.4e12) / 5.88e23).toBeCloseTo(1, 10);
  });
  it('is about 3.8e25 for Llama 3 405B on 15.6T tokens, as its paper reports', () => {
    expect(trainFlops(405e9, 15.6e12) / 3.8e25).toBeGreaterThan(0.99);
    expect(trainFlops(405e9, 15.6e12) / 3.8e25).toBeLessThan(1.01);
  });
  it('serving is 2 N per token', () => {
    expect(inferFlops(70e9, 1)).toBe(140e9);
  });
});

describe('loss law', () => {
  it('reproduces E + A/N^alpha + B/D^beta by hand for N = 1e9, D = 2e10 (Epoch fit)', () => {
    const byHand = 1.8172 + 482.01 / Math.pow(1e9, 0.3478) + 2085.43 / Math.pow(2e10, 0.3658);
    expect(loss(epoch, 1e9, 2e10)).toBeCloseTo(byHand, 12);
    expect(loss(epoch, 1e9, 2e10)).toBeCloseTo(2.5, 1);
  });
  it('falls as either N or D grows', () => {
    expect(loss(epoch, 2e9, 2e10)).toBeLessThan(loss(epoch, 1e9, 2e10));
    expect(loss(epoch, 1e9, 4e10)).toBeLessThan(loss(epoch, 1e9, 2e10));
  });
  it('never drops below the irreducible term E', () => {
    expect(loss(epoch, 1e15, 1e18)).toBeGreaterThan(epoch.E);
  });
});

describe('compute-optimal allocation', () => {
  it('uses the whole budget: 6 N D = C', () => {
    for (const fit of [epoch, hoffmann]) {
      for (const c of [1e20, 5.76e23, 3.8e25]) {
        const a = optimalAllocation(fit, c);
        expect(trainFlops(a.n, a.d) / c).toBeCloseTo(1, 10);
      }
    }
  });
  it('lands near Chinchilla (70B on 1.4T) at the Chinchilla budget under the Epoch fit', () => {
    const a = optimalAllocation(epoch, 5.76e23);
    expect(a.n / 1e9).toBeGreaterThan(65);
    expect(a.n / 1e9).toBeLessThan(80);
    expect(a.ratio).toBeGreaterThan(17);
    expect(a.ratio).toBeLessThan(21);
  });
  it('gives about 20 tokens per parameter around 1e22 FLOPs under the Epoch fit', () => {
    expect(optimalAllocation(epoch, 1e22).ratio).toBeGreaterThan(19);
    expect(optimalAllocation(epoch, 1e22).ratio).toBeLessThan(22);
  });
  it('shows the printed Hoffmann coefficients imply far more tokens per parameter than 20', () => {
    // The Epoch AI paper explains why: rounding and an optimiser that stopped early.
    expect(optimalAllocation(hoffmann, 5.76e23).ratio).toBeGreaterThan(60);
  });
  it('really is a minimum: nudging N either way (D adjusted to keep C) raises the loss', () => {
    for (const fit of [epoch, hoffmann]) {
      const c = 1e23;
      const a = optimalAllocation(fit, c);
      for (const k of [0.9, 1.1]) {
        expect(fixedSize(fit, a.n * k, c).loss).toBeGreaterThan(a.loss);
      }
    }
  });
  it('grows N and D about equally with compute: x100 compute gives about x10 each (Epoch fit)', () => {
    const a = optimalAllocation(epoch, 1e22);
    const b = optimalAllocation(epoch, 1e24);
    expect(b.n / a.n).toBeGreaterThan(9);
    expect(b.n / a.n).toBeLessThan(13);
    expect(b.d / a.d).toBeGreaterThan(8);
    expect(b.d / a.d).toBeLessThan(11);
  });
});

describe('over-training', () => {
  it('a smaller model at the same budget has higher loss', () => {
    const c = 1e24;
    expect(fixedSize(epoch, optimalAllocation(epoch, c).n / 4, c).loss).toBeGreaterThan(optimalAllocation(epoch, c).loss);
  });
  it('tokensForLoss inverts the loss law', () => {
    const d = tokensForLoss(epoch, 5e9, 2.3);
    expect(d).not.toBeNull();
    expect(loss(epoch, 5e9, d as number)).toBeCloseTo(2.3, 10);
  });
  it('returns null when the target is below what that size can reach', () => {
    expect(tokensForLoss(epoch, 1e6, 2.0)).toBeNull();
  });
  it('a model half the size needs about 1.26x the training FLOPs to match loss, whatever the budget', () => {
    const a = matchedAlternative(epoch, 1e22, 0.5);
    const b = matchedAlternative(epoch, 1e25, 0.5);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.trainMultiple).toBeCloseTo(1.259, 2);
    expect(b!.trainMultiple).toBeCloseTo(a!.trainMultiple, 6);
  });
  it('the matched model reaches the same loss', () => {
    const c = 1e24;
    const alt = matchedAlternative(epoch, c, 0.5)!;
    expect(loss(epoch, alt.n, alt.d)).toBeCloseTo(optimalAllocation(epoch, c).loss, 10);
  });
  it('breaks even when serving is large enough: the smaller model wins after that many tokens', () => {
    const c = 1e24;
    const opt = optimalAllocation(epoch, c);
    const alt = matchedAlternative(epoch, c, 0.5)!;
    const t = breakEvenServedTokens(opt, alt);
    expect(t).toBeGreaterThan(0);
    expect(lifetimeFlops(alt.n, alt.d, t) / lifetimeFlops(opt.n, opt.d, t)).toBeCloseTo(1, 10);
    expect(lifetimeFlops(alt.n, alt.d, t * 10)).toBeLessThan(lifetimeFlops(opt.n, opt.d, t * 10));
    expect(lifetimeFlops(alt.n, alt.d, t / 10)).toBeGreaterThan(lifetimeFlops(opt.n, opt.d, t / 10));
  });
});

describe('from FLOPs to GPUs and money', () => {
  it('3.8e25 FLOPs on H100s (989 TFLOPS) at 40% utilisation is about 26.7 million GPU-hours', () => {
    const p = gpuPlan(3.8e25, 989e12, 0.4, 16384, 2);
    expect(p.gpuHours / 1e6).toBeGreaterThan(26.6);
    expect(p.gpuHours / 1e6).toBeLessThan(26.8);
    expect(p.wallDays).toBeCloseTo(p.gpuHours / 16384 / 24, 6);
    expect(p.cost).toBeCloseTo(p.gpuHours * 2, 3);
  });
  it('a simple hand check: 1e18 FLOPs at 1e15 FLOP/s and 50% is 2000 s', () => {
    expect(gpuPlan(1e18, 1e15, 0.5, 1, 1).gpuSeconds).toBeCloseTo(2000, 6);
  });
  it('flopsFromGpuDays is the inverse of gpuPlan', () => {
    const c = flopsFromGpuDays(100, 312e12, 0.35);
    expect(gpuPlan(c, 312e12, 0.35, 1, 1).gpuDays).toBeCloseTo(100, 8);
  });
});

describe('fitPowerLaw', () => {
  it('recovers a clean power law', () => {
    const xs = [1, 10, 100, 1000];
    const ys = xs.map((x) => 3 * Math.pow(x, -0.25));
    const f = fitPowerLaw(xs, ys);
    expect(f.exponent).toBeCloseTo(-0.25, 10);
    expect(f.coef).toBeCloseTo(3, 10);
  });
});

describe('display helpers', () => {
  it('formats big numbers', () => {
    expect(human(7.2e10)).toBe('72.0B');
    expect(human(1.33e12)).toBe('1.33T');
    expect(sci(5.88e23)).toBe('5.88e23');
    expect(sci(250)).toBe('250');
  });
});
