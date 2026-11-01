import { describe, expect, it } from 'vitest';
import { ERA_LABEL, HISTORY, isInOrder, sentences } from './ai-history';

describe('short history of AI timeline', () => {
  it('has 10 to 12 events in date order with unique ids', () => {
    expect(HISTORY.length).toBeGreaterThanOrEqual(10);
    expect(HISTORY.length).toBeLessThanOrEqual(12);
    expect(isInOrder(HISTORY)).toBe(true);
    expect(new Set(HISTORY.map((e) => e.id)).size).toBe(HISTORY.length);
  });

  it('gives every event a two-sentence card and a one-sentence "what changed" note', () => {
    for (const e of HISTORY) {
      expect(sentences(e.card).length, e.id).toBe(2);
      expect(sentences(e.changed).length, e.id).toBe(1);
    }
  });

  it('keeps the house style: no exclamation marks, known eras', () => {
    for (const e of HISTORY) {
      expect(e.card + e.changed + e.title, e.id).not.toMatch(/!/);
      expect(Object.keys(ERA_LABEL)).toContain(e.era);
    }
  });

  it('keeps the checked dates and figures', () => {
    const by = Object.fromEntries(HISTORY.map((e) => [e.id, e]));
    expect(by.turing.year).toBe(1950);
    expect(by.dartmouth.card).toContain('1955');
    expect(by.dartmouth.card).toContain('1956');
    expect(by.eliza.year).toBe(1966);
    expect(by.deepblue.card).toContain('3½ to 2½');
    expect(by.alexnet.card).toContain('15.3');
    expect(by.alexnet.card).toContain('26.2');
    expect(by.alphago.card).toContain('four games to one');
    expect(by.transformer.year).toBe(2017);
    expect(by.chatgpt.when).toBe('30 November 2022');
  });

  it('shows both winters as winters, and keeps hype and money out of the cards as predictions', () => {
    expect(HISTORY.filter((e) => e.era === 'winter').length).toBe(2);
    for (const e of HISTORY) expect(e.card + e.changed, e.id).not.toMatch(/\bwill (soon|one day|replace|take)\b/i);
  });
});
