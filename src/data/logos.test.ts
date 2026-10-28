import { describe, expect, it } from 'vitest';
import { logos } from './logos';
import { cases } from './cases';

describe('company marks', () => {
  it('only exist for companies that have a case study, and are drawn paths', () => {
    const companies = new Set(cases.map((c) => c.company));
    for (const [name, path] of Object.entries(logos)) {
      expect(companies.has(name), name).toBe(true);
      expect(path.startsWith('M')).toBe(true);
    }
  });

  it('cover most of the companies; the rest get a letter badge', () => {
    const companies = new Set(cases.map((c) => c.company));
    const covered = [...companies].filter((c) => logos[c]).length;
    expect(covered / companies.size).toBeGreaterThan(0.7);
  });
});
