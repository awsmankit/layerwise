import { describe, expect, it } from 'vitest';
import { D, TOKENS, cosine, encoderLayer, idx, layerNorm, positionalEncoding, runEncoder, softmax, topFriend, withPosition } from './encoder-walk';

const IT = idx('its');
const CAT = idx('cat');

describe('positional encoding', () => {
  it('position 0 is sin(0)=0 on even slots and cos(0)=1 on odd slots', () => {
    expect(positionalEncoding(0, 4)).toEqual([0, 1, 0, 1]);
  });
  it('matches the paper formula for position 3, slot 0', () => {
    expect(positionalEncoding(3, 6)[0]).toBeCloseTo(Math.sin(3), 10);
  });
  it('every position gets a different vector', () => {
    const a = positionalEncoding(1);
    const b = positionalEncoding(2);
    expect(a).not.toEqual(b);
  });
});

describe('softmax and norm', () => {
  it('softmax rows add to 1', () => {
    expect(softmax([3, 1, 0.2]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it('layer norm gives mean 0 and variance about 1', () => {
    const n = layerNorm([1, 2, 3, 4, 10, -2]);
    expect(n.reduce((a, b) => a + b, 0) / n.length).toBeCloseTo(0, 8);
    expect(n.reduce((a, b) => a + b * b, 0) / n.length).toBeCloseTo(1, 3);
  });
});

describe('one encoder layer', () => {
  const t = encoderLayer(withPosition());

  it('keeps one vector of size D per token', () => {
    expect(t.output).toHaveLength(TOKENS.length);
    expect(t.output.every((r) => r.length === D)).toBe(true);
  });
  it('scores form a square grid, one row per token', () => {
    expect(t.scores).toHaveLength(TOKENS.length);
    expect(t.scores.every((r) => r.length === TOKENS.length)).toBe(true);
  });
  it('scaled scores are scores divided by sqrt(d)', () => {
    expect(t.scaled[IT][CAT]).toBeCloseTo(t.scores[IT][CAT] / Math.sqrt(D), 10);
  });
  it('every attention row adds to 1', () => {
    for (const row of t.weights) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it('"its" attends most to "cat" (the story of the lesson)', () => {
    expect(topFriend(t.weights, IT)).toBe(CAT);
    expect(t.weights[IT][CAT]).toBeGreaterThan(0.5);
  });
  it('"The" looks at nouns, "licked" looks at its doer', () => {
    expect(['cat', 'paw']).toContain(TOKENS[topFriend(t.weights, 0)]);
    expect(topFriend(t.weights, idx('licked'))).toBe(CAT);
  });
  it('skipping the scaling makes the softmax spikier', () => {
    expect(t.weightsUnscaled[IT][CAT]).toBeGreaterThan(t.weights[IT][CAT]);
  });
  it('context is the weighted sum of values', () => {
    const j = 2;
    const manual = t.weights[IT].reduce((s, w, k) => s + w * t.v[k][j], 0);
    expect(t.context[IT][j]).toBeCloseTo(manual, 10);
  });
  it('the feed-forward hidden layer is twice as wide and never negative', () => {
    expect(t.hidden[0]).toHaveLength(D * 2);
    expect(t.hidden.flat().every((x) => x >= 0)).toBe(true);
  });
  it('the output is normalised again', () => {
    const r = t.output[IT];
    expect(r.reduce((a, b) => a + b, 0) / r.length).toBeCloseTo(0, 8);
  });
  it('is deterministic', () => {
    expect(encoderLayer(withPosition()).output).toEqual(t.output);
  });
});

describe('a stack of encoders', () => {
  it('returns one trace per layer', () => {
    expect(runEncoder(4)).toHaveLength(4);
  });
  it('layer 2 reads layer 1\'s output', () => {
    const [a, b] = runEncoder(2);
    expect(b.input).toEqual(a.output);
  });
  it('the blended vector for "its" is more like "cat" than "its" itself is', () => {
    const t = runEncoder(1)[0];
    expect(cosine(t.context[IT], t.input[CAT])).toBeGreaterThan(cosine(t.input[IT], t.input[CAT]));
  });
});
