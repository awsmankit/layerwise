import { describe, expect, it } from 'vitest';
import { allConfigs, fit, fitScenarios, score, solutions, type Config } from './fitmodel';

const sc = (id: string) => fitScenarios.find((s) => s.id === id)!;
const cfg = (model: Config['model'], weights: Config['weights'], kv: Config['kv']): Config => ({ model, weights, kv });

describe('fit the model: arithmetic', () => {
  it('weights are parameters times bytes', () => {
    const r = fit(sc('team'), cfg('8B', 'fp16', 'fp16'));
    expect(r.weightsGB).toBeCloseTo(16, 6);
    expect(fit(sc('team'), cfg('8B', 'int8', 'fp16')).weightsGB).toBeCloseTo(8, 6);
    expect(fit(sc('team'), cfg('8B', 'int4', 'fp16')).weightsGB).toBeCloseTo(4, 6);
  });

  it('KV cache is 2 x layers x heads x head dim x bytes, per token per user', () => {
    const r = fit(sc('team'), cfg('8B', 'int8', 'fp16'));
    expect(r.kvBytesPerToken).toBe(2 * 32 * 8 * 128 * 2); // 131,072 bytes
    expect(r.kvGB).toBeCloseTo((131072 * 8192 * 16) / 1e9, 6);
    expect(fit(sc('team'), cfg('8B', 'int8', 'fp8')).kvGB).toBeCloseTo(r.kvGB / 2, 6);
  });

  it('capacity reserves a tenth of memory plus runtime per device', () => {
    const r = fit(sc('analyst'), cfg('70B', 'int8', 'fp8'));
    expect(r.capacityGB).toBeCloseTo(160 - (16 + 3), 6);
  });
});

describe('fit the model: scenarios', () => {
  it('every scenario is solvable', () => {
    fitScenarios.forEach((s) => expect(solutions(s).length, s.id).toBeGreaterThan(0));
  });

  it('the team scenario has exactly one answer: 8B, INT8 weights, 8-bit KV', () => {
    const sols = solutions(sc('team'));
    expect(sols).toHaveLength(1);
    expect(sols[0].config).toEqual(cfg('8B', 'int8', 'fp8'));
  });

  it('keeping full precision everywhere does not fit the team scenario', () => {
    const r = fit(sc('team'), cfg('8B', 'fp16', 'fp16'));
    expect(r.fits).toBe(false);
  });

  it('4-bit weights fit but miss the quality bar in the team scenario', () => {
    const r = fit(sc('team'), cfg('8B', 'int4', 'fp8'));
    expect(r.fits).toBe(true);
    expect(r.meetsQuality).toBe(false);
  });

  it('the frontier scenario needs the big model quantized to 8 bits with an 8-bit cache', () => {
    const sols = solutions(sc('frontier'));
    expect(sols).toHaveLength(1);
    expect(sols[0].config).toEqual(cfg('400B', 'int8', 'fp8'));
  });

  it('a bigger-than-needed model that does not fit scores zero', () => {
    expect(score(sc('analyst'), cfg('400B', 'int4', 'fp8'))).toBe(0);
  });

  it('the best achievable answer scores 100 and any other working answer less', () => {
    for (const s of fitScenarios) {
      const sols = solutions(s);
      expect(score(s, sols[0].config)).toBe(100);
      for (const x of sols.slice(1)) {
        if (x.result.quality < sols[0].result.quality) expect(score(s, x.config)).toBeLessThan(100);
      }
    }
  });

  it('a config that works always scores at least 70', () => {
    for (const s of fitScenarios) {
      for (const c of allConfigs()) {
        if (fit(s, c).ok) expect(score(s, c)).toBeGreaterThanOrEqual(70);
      }
    }
  });
});
