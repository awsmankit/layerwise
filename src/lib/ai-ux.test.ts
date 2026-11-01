import { describe, expect, it } from 'vitest';
import { CLAIMS, DEFAULT_CONFIG, EX, WRONG_ID, generationTime, readTime, secs, simulate, visibleClaims, type UxConfig } from './ai-ux';

const cfg = (o: Partial<UxConfig>): UxConfig => ({ ...DEFAULT_CONFIG, ...o });
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('constants', () => {
  it('has one wrong claim, the plan claim', () => {
    expect(CLAIMS.filter((c) => c.wrong).map((c) => c.id)).toEqual([WRONG_ID]);
  });
  it('generates in 5.8 s and takes 30 s to read', () => {
    close(generationTime(), 5.8);
    close(readTime(), 30);
  });
});

describe('streaming', () => {
  it('cuts the perceived wait from 5.8 s to 1.8 s', () => {
    close(simulate(cfg({ streaming: false })).firstText, 5.8);
    close(simulate(cfg({ streaming: true })).firstText, 1.8);
  });
  it('saves exactly the generation time when reading is the slower step', () => {
    const off = simulate(cfg({ streaming: false })).readDone;
    const on = simulate(cfg({ streaming: true })).readDone;
    close(off, 35.8);
    close(on, 31.8);
    close(off - on, EX.tokens / EX.tps);
  });
  it('reveals claims as they are generated', () => {
    expect(visibleClaims(true, 1)).toBe(0);
    expect(visibleClaims(true, 1.8)).toBe(0);
    expect(visibleClaims(true, 2.5)).toBe(1);
    expect(visibleClaims(true, 5.8)).toBe(6);
    expect(visibleClaims(false, 5.7)).toBe(0);
    expect(visibleClaims(false, 5.8)).toBe(6);
  });
});

describe('checking and errors', () => {
  it('baseline: spot check of claim 1, wrong claim ships, late rework adds time', () => {
    const r = simulate(DEFAULT_CONFIG);
    expect(r.checked).toEqual([1]);
    expect(r.caught).toBe(false);
    expect(r.shipped).toBe(true);
    expect(r.trust).toBe('blind');
    close(r.atDesk, 35.8 + 30);
    close(r.lateCost, 35.8 + 90);
    close(r.total, 65.8 + 125.8);
  });
  it('a footer disclaimer changes nothing about what the user checks', () => {
    expect(simulate(cfg({ cue: 'footer' })).checked).toEqual([1]);
    expect(simulate(cfg({ cue: 'footer' })).atDesk).toBe(simulate(DEFAULT_CONFIG).atDesk);
  });
  it('citations make each check cheaper', () => {
    close(simulate(cfg({ citations: true })).checkTime, 8);
    close(simulate(DEFAULT_CONFIG).checkTime, 30);
  });
  it('calibrated flags catch the wrong claim', () => {
    const r = simulate(cfg({ cue: 'flags' }));
    expect(r.checked).toEqual([3, 5]);
    expect(r.caught).toBe(true);
    expect(r.trust).toBe('caught');
    expect(r.lateCost).toBe(0);
  });
  it('flags that miss the error give false reassurance', () => {
    const r = simulate(cfg({ cue: 'flags-off' }));
    expect(r.caught).toBe(false);
    expect(r.trust).toBe('false-reassurance');
  });
  it('an editable summary makes the fix cheaper than regenerating', () => {
    const edit = simulate(cfg({ cue: 'flags', editable: true }));
    const regen = simulate(cfg({ cue: 'flags', editable: false }));
    close(edit.fixTime, EX.editFix);
    close(regen.fixTime, 5.8 + 30);
    expect(edit.atDesk).toBeLessThan(regen.atDesk);
  });
  it('everything on: fastest total and no shipped error', () => {
    const best = simulate({ streaming: true, citations: true, cue: 'flags', editable: true });
    close(best.atDesk, 31.8 + 16 + 10);
    expect(best.shipped).toBe(false);
    for (const cue of ['none', 'footer', 'flags-off'] as const) {
      expect(best.total).toBeLessThan(simulate({ streaming: false, citations: false, cue, editable: false }).total);
    }
  });
});

describe('secs', () => {
  it('formats to one decimal', () => {
    expect(secs(5.8)).toBe('5.8 s');
    expect(secs(125.84)).toBe('125.8 s');
  });
});
