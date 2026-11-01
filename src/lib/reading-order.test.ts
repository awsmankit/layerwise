import { describe, expect, it } from 'vitest';
import { LEAFLET, TRUE_ORDER, assemble, columnOrder, judge, naiveOrder, type PageBlock } from './reading-order';

describe('reading order', () => {
  it('naive order interleaves the columns row by row', () => {
    expect(naiveOrder(LEAFLET)).toEqual(['L1', 'R1', 'L2', 'R2', 'L3', 'R3']);
  });
  it('column order reads the left column and then the right', () => {
    expect(columnOrder(LEAFLET)).toEqual(TRUE_ORDER);
  });
  it('full-width blocks split the page into bands', () => {
    const blocks: PageBlock[] = [
      { id: 'T', zone: 'full', y: 0, text: 'Title' },
      { id: 'L1', zone: 'L', y: 1, text: 'a' },
      { id: 'R1', zone: 'R', y: 1, text: 'b' },
      { id: 'W', zone: 'full', y: 2, text: 'Wide figure' },
      { id: 'L2', zone: 'L', y: 3, text: 'c' },
      { id: 'R2', zone: 'R', y: 3, text: 'd' },
    ];
    expect(columnOrder(blocks)).toEqual(['T', 'L1', 'R1', 'W', 'L2', 'R2']);
    expect(columnOrder(blocks.slice().reverse())).toEqual(['T', 'L1', 'R1', 'W', 'L2', 'R2']);
  });
  it('the true order keeps the key sentence whole', () => {
    const v = judge(LEAFLET, TRUE_ORDER);
    expect(v.sentenceIntact).toBe(true);
    expect(v.pairs).toBe(1);
    expect(v.score).toBe(1);
    expect(v.complete).toBe(true);
  });
  it('the naive order breaks it and says so', () => {
    const v = judge(LEAFLET, naiveOrder(LEAFLET));
    expect(v.sentenceIntact).toBe(false);
    expect(v.forkFigureVisible).toBe(true);
    expect(v.score).toBeLessThan(0.7);
    expect(v.message).toContain('broken');
    expect(v.text).toContain('The frame warranty lasts for Claims made without a receipt');
  });
  it('a partial order is not judged yet', () => {
    const v = judge(LEAFLET, ['L1', 'L2']);
    expect(v.complete).toBe(false);
    expect(v.message).toContain('Tap all 6');
  });
  it('an order that keeps the sentence but splits other blocks says so', () => {
    const v = judge(LEAFLET, ['L1', 'L2', 'L3', 'R1', 'R3', 'R2']);
    expect(v.sentenceIntact).toBe(true);
    expect(v.pairs).toBeLessThan(1);
    expect(v.message).toContain('survives');
  });
  it('assembles text in the given order', () => {
    expect(assemble(LEAFLET, ['L3', 'R1'])).toBe('The frame warranty lasts for five years from the purchase date. The fork warranty lasts for two years.');
  });
});
