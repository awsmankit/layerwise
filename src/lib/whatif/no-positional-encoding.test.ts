import { describe, expect, it } from 'vitest';
import { DIM, attention, bag, byWord, embed, inputs, outputShift, outputs, pairs, positionVector, sameBag, softmax, tableGap } from './no-positional-encoding';

const A = ['dog', 'bites', 'man'];
const B = ['man', 'bites', 'dog'];

describe('no positional encoding what-if', () => {
  it('embeddings are deterministic and in range', () => {
    expect(embed('dog')).toEqual(embed('dog'));
    expect(embed('dog')).not.toEqual(embed('man'));
    expect(embed('dog')).toHaveLength(DIM);
    for (const x of embed('bites')) expect(Math.abs(x)).toBeLessThanOrEqual(1);
  });
  it('position vector at 0 is [0,1,0,1,...] and at 1 starts [sin 1, cos 1]', () => {
    expect(positionVector(0)).toEqual([0, 1, 0, 1, 0, 1, 0, 1]);
    const p = positionVector(1);
    expect(p[0]).toBeCloseTo(Math.sin(1), 12);
    expect(p[1]).toBeCloseTo(Math.cos(1), 12);
    // slot 2 has frequency 1 / 10000^(2/8)
    expect(p[2]).toBeCloseTo(Math.sin(1 / Math.pow(10000, 0.25)), 12);
  });
  it('softmax rows add up to 1', () => {
    expect(softmax([0, 0]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(softmax([0, 0])).toEqual([0.5, 0.5]);
    for (const row of attention(A, true)) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it('attention weights match a hand computation for the first row', () => {
    const x = inputs(A, false);
    const s = x.map((k) => x[0].reduce((t, v, d) => t + v * k[d], 0) / Math.sqrt(DIM));
    const e = s.map(Math.exp);
    const total = e.reduce((a, b) => a + b, 0);
    expect(attention(A, false)[0][0]).toBeCloseTo(e[0] / total, 12);
  });
  it('the two sentences have the same bag of words', () => {
    expect(bag(A)).toEqual(['bites', 'dog', 'man']);
    expect(sameBag(A, B)).toBe(true);
    expect(sameBag(A, ['dog', 'bites', 'dog'])).toBe(false);
  });
  it('without position the attention table by word is identical for both orders', () => {
    expect(tableGap(A, B, false)).toBeLessThan(1e-12);
    const ta = byWord(A, false, A);
    const tb = byWord(B, false, A);
    ta.forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(tb[i][j], 12)));
  });
  it('without position every word gets exactly the same output in both orders', () => {
    for (const s of outputShift(A, B, false)) expect(s).toBeLessThan(1e-12);
  });
  it('with position the table and the outputs differ for every example pair', () => {
    for (const p of pairs) {
      expect(sameBag(p.a, p.b)).toBe(true);
      expect(tableGap(p.a, p.b, false)).toBeLessThan(1e-12);
      expect(tableGap(p.a, p.b, true)).toBeGreaterThan(0.01);
      for (const s of outputShift(p.a, p.b, true)) expect(s).toBeGreaterThan(0.05);
    }
  });
  it('outputs have one vector per word', () => {
    expect(outputs(A, true)).toHaveLength(3);
    expect(outputs(A, true)[0]).toHaveLength(DIM);
  });
});
