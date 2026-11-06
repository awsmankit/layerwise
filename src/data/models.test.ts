import { describe, expect, it } from 'vitest';
import { models, modelsChecked, vendors } from './models';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const real = (iso: string) => !Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) && new Date(`${iso}T00:00:00Z`).toISOString().startsWith(iso);

/** Pages a vendor publishes itself. A blog, a news site or a leaderboard is never a source here. */
function official(url: string): boolean {
  const u = new URL(url);
  if (u.protocol !== 'https:') return false;
  const host = u.hostname;
  const hosts = [
    'platform.claude.com',
    'www.anthropic.com',
    'developers.openai.com',
    'openai.com',
    'aistudio.google.com',
    'ai.google.dev',
    'blog.google',
    'deepmind.google',
    'mistral.ai',
    'docs.mistral.ai',
    'api-docs.deepseek.com',
    'www.alibabacloud.com',
  ];
  if (hosts.includes(host)) return true;
  // the vendor's own organisation on Hugging Face, for the licence and context of open weights
  if (host === 'huggingface.co') return /^\/(mistralai|deepseek-ai|google|Qwen)\//.test(u.pathname);
  return false;
}

describe('model radar data', () => {
  it('has roughly twelve to twenty models', () => {
    expect(models.length).toBeGreaterThanOrEqual(12);
    expect(models.length).toBeLessThanOrEqual(20);
  });

  it('has unique, url-safe ids and unique names', () => {
    expect(new Set(models.map((m) => m.id)).size).toBe(models.length);
    expect(new Set(models.map((m) => m.name)).size).toBe(models.length);
    for (const m of models) expect(m.id, m.id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  it('uses only listed vendors, and lists every vendor it names', () => {
    for (const m of models) expect(vendors, m.id).toContain(m.vendor);
    for (const v of vendors) expect(models.some((m) => m.vendor === v), `${v} has no model`).toBe(true);
  });

  it('gives every model at least one https source on an official vendor page', () => {
    for (const m of models) {
      expect(m.sources.length, m.id).toBeGreaterThan(0);
      for (const s of m.sources) {
        expect(s.label.length, `${m.id} label`).toBeGreaterThan(5);
        expect(official(s.url), `${m.id}: ${s.url}`).toBe(true);
      }
      expect(new Set(m.sources.map((s) => s.url)).size, `${m.id} repeats a source`).toBe(m.sources.length);
    }
  });

  it('has real ISO dates that are not in the future', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const m of models) {
      for (const [field, d] of [['releasedOn', m.releasedOn], ['checkedOn', m.checkedOn]] as const) {
        expect(d, `${m.id} ${field}`).toMatch(ISO);
        expect(real(d), `${m.id} ${field} is not a real date`).toBe(true);
        expect(d <= today, `${m.id} ${field} is in the future`).toBe(true);
      }
      expect(m.checkedOn >= m.releasedOn, `${m.id} was checked before it was released`).toBe(true);
    }
    expect(modelsChecked).toMatch(ISO);
  });

  it('keeps prices positive, and a price change in the future with a valid date', () => {
    for (const m of models) {
      for (const k of ['inputPerMTok', 'outputPerMTok', 'cachedInputPerMTok'] as const) {
        if (m[k] != null) expect(m[k]! > 0, `${m.id} ${k}`).toBe(true);
      }
      // input and output prices come as a pair
      expect(m.inputPerMTok == null, `${m.id}: input and output price go together`).toBe(m.outputPerMTok == null);
      if (m.cachedInputPerMTok != null) expect(m.inputPerMTok, `${m.id}: a cache price needs a list price`).toBeDefined();
      if (m.cachedInputPerMTok != null && m.inputPerMTok != null) expect(m.cachedInputPerMTok, `${m.id} cache price`).toBeLessThan(m.inputPerMTok);
      if (m.priceChange) {
        expect(m.priceChange.from, m.id).toMatch(ISO);
        expect(real(m.priceChange.from), m.id).toBe(true);
        expect(m.priceChange.from > m.checkedOn, `${m.id}: a price change already in force belongs in the list price`).toBe(true);
        expect(m.priceChange.inputPerMTok).toBeGreaterThan(0);
        expect(m.priceChange.outputPerMTok).toBeGreaterThan(0);
        expect(m.priceNote, `${m.id} says nothing about its price change`).toBeTruthy();
      }
      if (m.longContext) {
        expect(m.inputPerMTok, `${m.id} long-context price without a list price`).toBeDefined();
        expect(m.longContext.aboveTokens).toBeGreaterThan(0);
        expect(m.longContext.inputPerMTok).toBeGreaterThanOrEqual(m.inputPerMTok!);
        expect(m.longContext.outputPerMTok).toBeGreaterThanOrEqual(m.outputPerMTok!);
        expect(m.priceNote, `${m.id} says nothing about its long-context price`).toBeTruthy();
      }
    }
  });

  it('points a price at a source that can show it', () => {
    for (const m of models) {
      if (m.inputPerMTok == null) continue;
      expect(
        m.sources.some((s) => /pric/i.test(s.label) || /pric/i.test(s.url) || /launch post|model info|model page|overview/i.test(s.label)),
        `${m.id}: no source for the price`,
      ).toBe(true);
    }
  });

  it('keeps token counts whole and plausible', () => {
    for (const m of models) {
      for (const k of ['contextTokens', 'maxOutputTokens'] as const) {
        if (m[k] == null) continue;
        expect(Number.isInteger(m[k]), `${m.id} ${k}`).toBe(true);
        expect(m[k]!, `${m.id} ${k}`).toBeGreaterThanOrEqual(1000);
        expect(m[k]!, `${m.id} ${k}`).toBeLessThanOrEqual(10_000_000);
      }
    }
  });

  it('uses the status values and modalities the page knows', () => {
    for (const m of models) {
      expect(['available', 'preview', 'deprecated', 'announced'], m.id).toContain(m.status);
      for (const x of m.modalities) expect(['text', 'image', 'audio', 'video', 'pdf'], `${m.id} ${x}`).toContain(x);
      expect(new Set(m.modalities).size, `${m.id} repeats a modality`).toBe(m.modalities.length);
      if (m.status !== 'announced') expect(m.modalities.length, `${m.id} states no input types`).toBeGreaterThan(0);
    }
  });

  it('only calls open weights open with a licence', () => {
    for (const m of models) {
      if (m.openWeights) expect(m.licence, `${m.id} has open weights but no licence`).toBeTruthy();
      else expect(m.licence, `${m.id} names a licence but is not open`).toBeUndefined();
    }
  });

  it('does not claim a quality ranking or carry a score', () => {
    const text = JSON.stringify(models);
    expect(text).not.toMatch(/\b(best|beats|outperform|state[- ]of[- ]the[- ]art|ranks? #?\d|benchmark|leaderboard|elo)\b/i);
    for (const m of models) expect(Object.keys(m), m.id).not.toContain('score');
  });

  it('keeps notes short and plain', () => {
    for (const m of models) {
      if (m.note) expect(m.note.length, `${m.id} note`).toBeLessThanOrEqual(260);
      if (m.priceNote) expect(m.priceNote.length, `${m.id} priceNote`).toBeLessThanOrEqual(300);
    }
  });

  it('is sorted by vendor order, then newest release first', () => {
    for (let i = 1; i < models.length; i++) {
      const a = models[i - 1];
      const b = models[i];
      const va = vendors.indexOf(a.vendor);
      const vb = vendors.indexOf(b.vendor);
      expect(va <= vb, `${a.id} should not come before ${b.id}`).toBe(true);
      if (va === vb) expect(a.releasedOn >= b.releasedOn, `${a.id} (${a.releasedOn}) should come after ${b.id} (${b.releasedOn})`).toBe(true);
    }
  });
});
