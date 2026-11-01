import { describe, expect, it } from 'vitest';
import { HINT_DISMISSED_DAYS, HINT_SHOWN_DAYS, dayKey, hintPage, humanisePath, installHintDue, recordVisit, savedPagePaths, shouldRegister, titleFromHtml } from './pwa';

const DAY = 86400000;
const T0 = Date.UTC(2026, 10, 1, 12);
const ctx = { standalone: false, canPrompt: true, ios: false };

describe('registering the worker', () => {
  const base = { prod: true, devOptIn: false, secure: true, supported: true };
  it('registers in production on a secure page', () => expect(shouldRegister(base)).toBe(true));
  it('does not register on an insecure page or without support', () => {
    expect(shouldRegister({ ...base, secure: false })).toBe(false);
    expect(shouldRegister({ ...base, supported: false })).toBe(false);
  });
  it('stays out of development unless asked, so hot reload is never affected', () => {
    expect(shouldRegister({ ...base, prod: false })).toBe(false);
    expect(shouldRegister({ ...base, prod: false, devOptIn: true })).toBe(true);
  });
});

describe('visits', () => {
  it('counts each day once and keeps the last ten', () => {
    let s = recordVisit({}, T0);
    s = recordVisit(s, T0 + 1000);
    expect(s.days).toEqual([dayKey(T0)]);
    for (let i = 1; i <= 12; i++) s = recordVisit(s, T0 + i * DAY);
    expect(s.days).toHaveLength(10);
    expect(s.days?.[9]).toBe(dayKey(T0 + 12 * DAY));
  });
});

describe('install hint', () => {
  const seen = { days: ['a', 'b', 'c'] };
  it('waits for repeat visits', () => {
    expect(installHintDue({ days: ['a', 'b'] }, T0, ctx)).toBe(false);
    expect(installHintDue(seen, T0, ctx)).toBe(true);
  });
  it('needs a way to install', () => {
    expect(installHintDue(seen, T0, { ...ctx, canPrompt: false })).toBe(false);
    expect(installHintDue(seen, T0, { ...ctx, canPrompt: false, ios: true })).toBe(true);
  });
  it('never shows once installed', () => {
    expect(installHintDue(seen, T0, { ...ctx, standalone: true })).toBe(false);
    expect(installHintDue({ ...seen, installed: true }, T0, ctx)).toBe(false);
  });
  it('stays away for six months after a dismissal and three after being shown', () => {
    expect(installHintDue({ ...seen, dismissedAt: T0 - 10 * DAY }, T0, ctx)).toBe(false);
    expect(installHintDue({ ...seen, dismissedAt: T0 - (HINT_DISMISSED_DAYS + 1) * DAY }, T0, ctx)).toBe(true);
    expect(installHintDue({ ...seen, shownAt: T0 - 10 * DAY }, T0, ctx)).toBe(false);
    expect(installHintDue({ ...seen, shownAt: T0 - (HINT_SHOWN_DAYS + 1) * DAY }, T0, ctx)).toBe(true);
  });
  it('is shown only on front-door pages', () => {
    expect(hintPage('/layerwise/', '/layerwise/')).toBe(true);
    expect(hintPage('/layerwise/learn/', '/layerwise/')).toBe(true);
    expect(hintPage('/layerwise/learn/ai/a/', '/layerwise/')).toBe(false);
    expect(hintPage('/start/', '/')).toBe(true);
    expect(hintPage('/play/', '/')).toBe(false);
  });
});

describe('saved pages', () => {
  it('turns a path into a label', () => {
    expect(humanisePath('/layerwise/learn/ai-basics/what-is-ai/', '/layerwise/')).toBe('Learn, ai basics, what is ai');
    expect(humanisePath('/layerwise/', '/layerwise/')).toBe('Home');
    expect(humanisePath('/start/', '/')).toBe('Start');
  });
  it('reads a title from HTML and drops the site name', () => {
    expect(titleFromHtml('<head><title>What is AI? | Layerwise</title>')).toBe('What is AI?');
    expect(titleFromHtml('<title>Tom &amp; Jerry&#39;s</title>')).toBe("Tom & Jerry's");
    expect(titleFromHtml('<p>none</p>')).toBeNull();
  });
  it('lists newest first without the home and offline pages', () => {
    const urls = ['https://a.test/layerwise/', 'https://a.test/layerwise/offline/', 'https://a.test/layerwise/learn/a/', 'https://a.test/layerwise/start/', 'https://a.test/layerwise/learn/a/'];
    expect(savedPagePaths(urls, '/layerwise/')).toEqual(['/layerwise/learn/a/', '/layerwise/start/']);
  });
});
