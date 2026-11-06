import { describe, expect, it } from 'vitest';
import { analyse, bitOptions, devices, kvPerUserGB, models, usableGB, weightsGB, widestThatFits } from './no-quantization';

const m = (id: string) => models.find((x) => x.id === id)!;
const d = (id: string) => devices.find((x) => x.id === id)!;

describe('no quantisation what-if', () => {
  it('weights memory is parameters x bits / 8', () => {
    expect(weightsGB(8, 16)).toBe(16);
    expect(weightsGB(8, 8)).toBe(8);
    expect(weightsGB(8, 4)).toBe(4);
    expect(weightsGB(70, 4)).toBe(35);
    expect(weightsGB(70, 16)).toBe(140);
  });
  it('the cache of the 8B example is 0.524288 GB for 4,000 tokens, and the 70B one is 1.31072 GB', () => {
    expect(kvPerUserGB(m('8b'))).toBeCloseTo(0.524288, 9);
    expect(kvPerUserGB(m('70b'))).toBeCloseTo(1.31072, 9);
  });
  it('usable memory takes off 10 percent and 0.5 GB', () => {
    expect(usableGB(d('phone'))).toBeCloseTo(6.7, 9);
    expect(usableGB(d('server'))).toBeCloseTo(71.5, 9);
  });
  it('the 8B model in 16-bit does not fit a phone, in 4-bit it serves 5 people', () => {
    expect(analyse(m('8b'), d('phone'), 16).fits).toBe(false);
    expect(analyse(m('8b'), d('phone'), 16).users).toBe(0);
    expect(analyse(m('8b'), d('phone'), 16).tokS).toBe(0);
    const q = analyse(m('8b'), d('phone'), 4);
    expect(q.fits).toBe(true);
    expect(q.users).toBe(Math.floor((6.7 - 4) / 0.524288));
    expect(q.users).toBe(5);
  });
  it('on the server GPU the 8B model serves 105 people in 16-bit at about 78.7 tokens per second each', () => {
    const r = analyse(m('8b'), d('server'), 16);
    expect(r.users).toBe(105);
    expect(r.tokS).toBeCloseTo(1300 / 16.524288, 6);
    expect(r.tokS).toBeGreaterThan(78.6);
    expect(r.tokS).toBeLessThan(78.8);
  });
  it('fewer bits mean more people and faster tokens, never fewer', () => {
    for (const mod of models)
      for (const dev of devices) {
        const [a, b, c] = bitOptions.map((bits) => analyse(mod, dev, bits));
        expect(b.users).toBeGreaterThanOrEqual(a.users);
        expect(c.users).toBeGreaterThanOrEqual(b.users);
        if (a.fits) {
          expect(b.tokS).toBeGreaterThan(a.tokS);
          expect(c.tokS).toBeGreaterThan(b.tokS);
        }
      }
  });
  it('4-bit speed is close to 4 times 16-bit speed when the cache is small next to the weights', () => {
    const a = analyse(m('70b'), d('server'), 16); // 140 GB: does not fit one 80 GB GPU
    expect(a.fits).toBe(false);
    expect(a.shortByGB).toBeCloseTo(140 + 1.31072 - 71.5, 6);
    const x = analyse(m('32b'), d('server'), 16);
    const y = analyse(m('32b'), d('server'), 4);
    expect(y.tokS / x.tokS).toBeGreaterThan(3.5);
    expect(y.tokS / x.tokS).toBeLessThan(4);
  });
  it('reports the widest format that fits, or null', () => {
    expect(widestThatFits(m('8b'), d('server'))).toBe(16);
    expect(widestThatFits(m('8b'), d('laptop'))).toBe(8);
    expect(widestThatFits(m('8b'), d('phone'))).toBe(4);
    expect(widestThatFits(m('70b'), d('phone'))).toBeNull();
  });
});
