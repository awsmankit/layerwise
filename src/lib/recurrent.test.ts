import { describe, expect, it } from 'vitest';
import { STRIP_LEN, gradientStrip, lstmGradient, makeSentence, rnnGradient, runLstm, runRnn, sigmoid, summarise, MAX_GAP } from './recurrent';

const quiet = (n: number) => Array.from({ length: n }, () => ({ text: 'x', value: 0, write: 0 }));

describe('sentences', () => {
  it('builds subject, gap and verb', () => {
    const w = makeSentence('plural', 3);
    expect(w.map((x) => x.text)).toEqual(['The', 'keys', 'to', 'the', 'old', 'are']);
    expect(w[1]).toMatchObject({ value: 1, write: 1 });
    expect(makeSentence('singular', 0).map((x) => x.text)).toEqual(['The', 'key', 'is']);
    expect(makeSentence('plural', 999)).toHaveLength(MAX_GAP + 3);
  });
  it('adds a distractor of the opposite number only when asked', () => {
    const plain = makeSentence('plural', 5);
    expect(plain.every((x) => x.value === 0 || x.write === 1)).toBe(true);
    const odd = makeSentence('plural', 5, true).find((x) => x.text === 'cabinet');
    expect(odd).toMatchObject({ value: -1, write: 0 });
    expect(makeSentence('singular', 5, true).find((x) => x.text === 'cabinets')).toMatchObject({ value: 1, write: 0 });
  });
});

describe('plain RNN', () => {
  it('matches hand arithmetic', () => {
    const h = runRnn(makeSentence('plural', 2), 0.9);
    expect(h[0]).toBe(0);
    expect(h[1]).toBeCloseTo(Math.tanh(1.5), 10); // 0.9051
    expect(h[2]).toBeCloseTo(Math.tanh(0.9 * Math.tanh(1.5)), 10); // 0.6721
    expect(h[1]).toBeCloseTo(0.9051, 4);
    expect(h[2]).toBeCloseTo(0.6721, 4);
  });
  it('fades the fact over a long gap and flips sign for singular', () => {
    const plural = runRnn(makeSentence('plural', 30), 0.9);
    const singular = runRnn(makeSentence('singular', 30), 0.9);
    expect(Math.abs(plural[plural.length - 1])).toBeLessThan(0.05);
    expect(singular[1]).toBeCloseTo(-plural[1], 10);
  });
});

describe('LSTM', () => {
  it('writes on the subject and keeps the cell afterwards', () => {
    const steps = runLstm(makeSentence('plural', 4), 4);
    expect(steps[1].f).toBeCloseTo(sigmoid(-4), 10);
    expect(steps[1].i).toBeCloseTo(sigmoid(5), 10);
    expect(steps[1].c).toBeCloseTo(sigmoid(5) * Math.tanh(3), 10);
    expect(steps[2].c).toBeCloseTo(steps[1].c * sigmoid(4), 10);
    expect(steps[0].i).toBeCloseTo(sigmoid(-5), 10);
  });
  it('forgets less with a larger forget bias', () => {
    const lo = summarise('plural', 30, 0.9, 1);
    const hi = summarise('plural', 30, 0.9, 5);
    expect(hi.lstmSignal).toBeGreaterThan(lo.lstmSignal);
  });
  it('ignores a distractor that fools the RNN', () => {
    const s = summarise('plural', 7, 0.9, 4, true);
    expect(s.rnnVerdict).toBe('wrong');
    expect(s.lstmVerdict).toBe('right');
    expect(summarise('plural', 7, 0.9, 4, false).rnnVerdict).toBe('right');
  });
  it('reads a singular subject with the sign flipped', () => {
    const s = summarise('singular', 3, 0.9, 4);
    expect(s.sign).toBe(-1);
    expect(s.rnn[s.rnn.length - 1]).toBeLessThan(0);
    expect(s.rnnVerdict).toBe('right');
  });
});

describe('gradients', () => {
  it('RNN with a quiet state is w to the power of the distance', () => {
    const g = rnnGradient(quiet(4), 0.5);
    expect(g).toEqual([0.125, 0.25, 0.5, 1]);
  });
  it('LSTM is the product of forget gates', () => {
    const steps = runLstm(quiet(4), 2);
    const g = lstmGradient(steps);
    expect(g[0]).toBeCloseTo(sigmoid(2) ** 3, 10);
    expect(g[3]).toBe(1);
  });
  it('the 50-step strip shows the RNN vanishing and the LSTM holding up', () => {
    const s = gradientStrip(0.9, 4);
    expect(s.rnn).toHaveLength(STRIP_LEN);
    expect(s.lstm).toHaveLength(STRIP_LEN);
    expect(s.rnnFirst).toBeLessThan(0.01);
    expect(s.lstmFirst).toBeGreaterThan(0.3);
    expect(s.lstmFirst).toBeLessThan(0.5);
    for (let t = 0; t < STRIP_LEN - 1; t++) expect(s.rnn[t]).toBeLessThanOrEqual(s.rnn[t + 1] + 1e-12);
  });
  it('an RNN weight below 0.5 makes the gradient collapse', () => {
    expect(gradientStrip(0.5, 4).rnnFirst).toBeLessThan(1e-12);
  });
  it('an RNN weight above 1 makes the gradient grow where the state stays near zero', () => {
    expect(rnnGradient(quiet(10), 1.5)[0]).toBeCloseTo(1.5 ** 9, 6);
  });
});
