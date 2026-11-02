import { describe, expect, it } from 'vitest';
import { site } from './site';

describe('site config', () => {
  it('has either no GoatCounter code or a plausible one', () => {
    // the code is the part before .goatcounter.com: lowercase letters, digits and hyphens
    expect(site.goatcounter).toMatch(/^([a-z0-9][a-z0-9-]{0,30}[a-z0-9])?$/);
  });
});
