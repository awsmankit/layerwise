import { describe, expect, it } from 'vitest';
import { DATASETS, MODELS, USES, check, counts, verdict, type DatasetId, type ModelId, type Pick, type UseId } from './licence-check';

const pick = (dataset: DatasetId, model: ModelId, use: UseId, synthetic = false): Pick => ({ dataset, model, use, synthetic });

describe('every combination', () => {
  it('returns findings with text and a basis, and a verdict', () => {
    for (const d of DATASETS) {
      for (const m of MODELS) {
        for (const u of USES) {
          for (const synthetic of [false, true]) {
            const f = check(pick(d.id, m.id, u.id, synthetic));
            expect(f.length).toBeGreaterThan(0);
            for (const x of f) {
              expect(x.title.length).toBeGreaterThan(5);
              expect(x.detail.length).toBeGreaterThan(30);
              expect(x.basis.length).toBeGreaterThan(3);
            }
            const v = verdict(f);
            expect(['ok', 'check', 'stop']).toContain(v.status);
          }
        }
      }
    }
  });
});

describe('dataset rules', () => {
  it('stops a commercial product on non-commercial data', () => {
    const f = check(pick('cc-by-nc', 'apache', 'product'));
    expect(f.some((x) => x.about === 'dataset' && x.status === 'stop')).toBe(true);
    expect(verdict(f).status).toBe('stop');
  });
  it('allows a learning project on non-commercial data', () => {
    const f = check(pick('cc-by-nc', 'mit', 'learn'));
    expect(f.every((x) => x.status === 'ok')).toBe(true);
    expect(verdict(f).status).toBe('ok');
  });
  it('never calls a model an adaptation either way for CC BY and BY-SA', () => {
    for (const d of ['cc-by', 'cc-by-sa'] as const) {
      const f = check(pick(d, 'apache', 'publish')).filter((x) => x.about === 'dataset');
      expect(f.every((x) => x.status === 'check')).toBe(true);
    }
  });
  it('treats CDLA-Permissive-2.0 results as unrestricted', () => {
    const f = check(pick('cdla-p', 'apache', 'product'));
    expect(f.filter((x) => x.about === 'dataset').every((x) => x.status === 'ok')).toBe(true);
  });
  it('keeps a CC0 caveat about rights of others', () => {
    const f = check(pick('cc0', 'mit', 'learn'));
    expect(f.some((x) => x.status === 'check' && /disclaims/.test(x.detail))).toBe(true);
  });
  it('never gives scraped data an ok', () => {
    for (const u of USES) {
      const f = check(pick('scraped', 'apache', u.id)).filter((x) => x.about === 'dataset');
      expect(f.every((x) => x.status === 'check')).toBe(true);
    }
  });
  it('stops research-only data for a product or release', () => {
    expect(check(pick('research-only', 'mit', 'product')).some((x) => x.status === 'stop')).toBe(true);
    expect(check(pick('research-only', 'mit', 'publish')).some((x) => x.status === 'stop')).toBe(true);
    expect(check(pick('research-only', 'mit', 'learn')).some((x) => x.status === 'stop')).toBe(false);
  });
});

describe('model rules', () => {
  it('stops a non-commercial model in a product', () => {
    expect(verdict(check(pick('cc0', 'nc-model', 'product'))).status).toBe('stop');
  });
  it('stops publishing weights of a hosted model', () => {
    expect(check(pick('cc0', 'api', 'publish')).some((x) => x.status === 'stop')).toBe(true);
  });
  it('flags the Llama naming rule when publishing and when training on outputs', () => {
    expect(check(pick('cc0', 'llama33', 'publish')).some((x) => /Built with Llama/.test(x.detail))).toBe(true);
    expect(check(pick('cc0', 'llama33', 'learn', true)).some((x) => /begin with "Llama"/.test(x.detail))).toBe(true);
  });
  it('makes a model trained on RAIL outputs a derivative', () => {
    expect(check(pick('cc0', 'rail', 'product', true)).some((x) => /Derivative/.test(x.title))).toBe(true);
  });
  it('quotes the competing-model clauses for hosted APIs and says OpenAI was not read', () => {
    const f = check(pick('cc0', 'api', 'product', true)).find((x) => /another model/.test(x.title));
    expect(f?.detail).toMatch(/Anthropic/);
    expect(f?.detail).toMatch(/Google/);
    expect(f?.detail).toMatch(/OpenAI/);
  });
});

describe('combined rules', () => {
  it('flags share-alike data with a restrictive model licence only when publishing', () => {
    expect(check(pick('cc-by-sa', 'llama33', 'publish')).some((x) => x.about === 'both')).toBe(true);
    expect(check(pick('cc-by-sa', 'llama33', 'product')).some((x) => x.about === 'both')).toBe(false);
    expect(check(pick('odbl', 'rail', 'publish')).some((x) => x.about === 'both')).toBe(true);
  });
});

describe('verdict and counts', () => {
  it('ranks stop above check above ok', () => {
    expect(verdict([{ id: '1', about: 'both', status: 'ok', title: 'x', detail: 'y', basis: 'z' }]).status).toBe('ok');
    expect(verdict([
      { id: '1', about: 'both', status: 'ok', title: 'x', detail: 'y', basis: 'z' },
      { id: '2', about: 'both', status: 'check', title: 'x', detail: 'y', basis: 'z' },
    ]).status).toBe('check');
    expect(verdict([
      { id: '2', about: 'both', status: 'check', title: 'x', detail: 'y', basis: 'z' },
      { id: '3', about: 'both', status: 'stop', title: 'x', detail: 'y', basis: 'z' },
    ]).status).toBe('stop');
  });
  it('counts findings', () => {
    const f = check(pick('cc-by-nc', 'api', 'publish'));
    const c = counts(f);
    expect(c.ok + c.check + c.stop).toBe(f.length);
  });
});
