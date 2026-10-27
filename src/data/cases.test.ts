import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cases, casesChecked, topicLabels, type CaseTopic } from './cases';

const topics = Object.keys(topicLabels) as CaseTopic[];

describe('case studies', () => {
  it('has a spread of entries across companies and topics', () => {
    expect(cases.length).toBeGreaterThanOrEqual(25);
    expect(new Set(cases.map((c) => c.company)).size).toBeGreaterThanOrEqual(6);
    for (const t of topics) expect(cases.filter((c) => c.topic === t).length, t).toBeGreaterThanOrEqual(2);
  });

  it('uses unique https links', () => {
    const urls = cases.map((c) => c.url);
    for (const u of urls) expect(u.startsWith('https://'), u).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('uses valid topics and short factual lines', () => {
    for (const c of cases) {
      expect(topics, c.title).toContain(c.topic);
      expect(c.learn.length, c.title).toBeLessThan(160);
      expect(c.learn.length, c.title).toBeGreaterThan(30);
      expect(c.title.length, c.url).toBeGreaterThan(5);
    }
  });

  it('dates are real, and none is after the day the list was checked', () => {
    for (const c of cases) {
      if (!c.date) continue;
      expect(c.date, c.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.date <= casesChecked, c.title).toBe(true);
    }
  });

  it('points background lessons at lessons that exist', () => {
    for (const c of cases) {
      if (!c.lesson) continue;
      expect(existsSync(join(process.cwd(), 'src/content/lessons', `${c.lesson}.mdx`)), `${c.title} -> ${c.lesson}`).toBe(true);
    }
  });
});
