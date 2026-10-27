import { describe, expect, it } from 'vitest';
import { topicLabels, watch, watchChecked } from './watch';

describe('further watching', () => {
  it('has https links, each one only once', () => {
    for (const w of watch) expect(w.url, w.title).toMatch(/^https:\/\//);
    expect(new Set(watch.map((w) => w.url)).size).toBe(watch.length);
  });

  it('puts every entry under a known topic, with a creator and a title', () => {
    for (const w of watch) {
      expect(topicLabels[w.topic], `${w.title}: ${w.topic}`).toBeDefined();
      expect(w.creator.length, w.title).toBeGreaterThan(1);
      expect(w.title.length).toBeGreaterThan(5);
    }
  });

  it('records when the links were checked', () => {
    expect(watchChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
