import { describe, expect, it } from 'vitest';
import { GROUPS, INTERESTS, ROLES, SKILLS, matchRoles, roleById, sharedSkills } from './ai-jobs';

describe('role deck', () => {
  it('has 8 to 10 roles with unique ids', () => {
    expect(ROLES.length).toBeGreaterThanOrEqual(8);
    expect(ROLES.length).toBeLessThanOrEqual(10);
    expect(new Set(ROLES.map((r) => r.id)).size).toBe(ROLES.length);
  });
  it('gives every role the fields a card needs, and a real https source', () => {
    for (const r of ROLES) {
      expect(r.name.length).toBeGreaterThan(3);
      expect(r.day.length).toBeGreaterThan(40);
      expect(r.start.length).toBeGreaterThan(40);
      expect(r.checked.length).toBeGreaterThan(60);
      expect(r.skills.length).toBeGreaterThanOrEqual(2);
      expect(r.interests.length).toBeGreaterThanOrEqual(1);
      expect(r.sources.length).toBeGreaterThanOrEqual(1);
      for (const s of r.sources) {
        expect(s.url.startsWith('https://')).toBe(true);
        expect(s.label.length).toBeGreaterThan(10);
      }
      expect(r.group in GROUPS).toBe(true);
      for (const i of r.interests) expect(i in INTERESTS).toBe(true);
      for (const s of r.skills) expect(s in SKILLS).toBe(true);
    }
  });
  it('covers all four kinds of work', () => {
    expect(new Set(ROLES.map((r) => r.group))).toEqual(new Set(['build', 'check', 'teach', 'use']));
  });
  it('contains no exclamation marks or hype words', () => {
    const all = ROLES.map((r) => [r.day, r.start, r.checked].join(' ')).join(' ');
    expect(all).not.toMatch(/!/);
    expect(all.toLowerCase()).not.toMatch(/revolution|boom|dream job|safe from/);
  });
});

describe('matchRoles', () => {
  it('returns every role when nothing is chosen', () => {
    expect(matchRoles([]).length).toBe(ROLES.length);
  });
  it('keeps only roles that share an interest, best match first', () => {
    const m = matchRoles(['outdoors']);
    expect(m.map((x) => x.role.id)).toEqual(['farmer']);
    const two = matchRoles(['people', 'words']);
    // product-designer, teacher and support-agent carry both interests, so they lead, in deck order
    expect(two.slice(0, 3).map((x) => x.role.id)).toEqual(['product-designer', 'teacher', 'support-agent']);
    expect(two.slice(0, 3).every((x) => x.hits === 2)).toBe(true);
    expect(two.every((x) => x.hits >= 1)).toBe(true);
  });
});

describe('sharedSkills', () => {
  it('is empty for fewer than two roles', () => {
    expect(sharedSkills([])).toEqual([]);
    expect(sharedSkills(['farmer'])).toEqual([]);
  });
  it('counts a skill only when two or more saved roles share it', () => {
    // nurse: people, careful, field, thinking; farmer: field, careful, numbers
    expect(sharedSkills(['nurse', 'farmer'])).toEqual([
      { skill: 'field', count: 2 },
      { skill: 'careful', count: 2 },
    ]);
  });
  it('orders by count, then by the order skills are listed', () => {
    const s = sharedSkills(['nurse', 'farmer', 'teacher']);
    // careful: nurse, farmer, teacher = 3; field = 3; people: nurse, teacher = 2
    expect(s[0]).toEqual({ skill: 'field', count: 3 });
    expect(s[1]).toEqual({ skill: 'careful', count: 3 });
    expect(s.find((x) => x.skill === 'people')?.count).toBe(2);
  });
  it('ignores unknown ids', () => {
    expect(roleById('nope')).toBeUndefined();
    expect(sharedSkills(['nope', 'farmer'])).toEqual([]);
  });
});
