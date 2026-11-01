import { describe, expect, it } from 'vitest';
import { METHODS, PAGES, outcomes, readAcross, stats, statusOf, hasEvidence, type MethodId, type PageId, type Status } from './parsing-lab';

/** Hand-written expectations, kept separate from the data so a change to either shows up here. */
const EXPECT: Record<PageId, Record<MethodId, Status[]>> = {
  columns: {
    'text-raw': ['risky', 'right'],
    'text-layout': ['right', 'right'],
    'ocr-lines': ['risky', 'right'],
    'ocr-layout': ['right', 'right'],
    vlm: ['right', 'right'],
  },
  table: {
    'text-raw': ['risky', 'risky'],
    'text-layout': ['right', 'right'],
    'ocr-lines': ['right', 'risky'],
    'ocr-layout': ['right', 'right'],
    vlm: ['right', 'right'],
  },
  scan: {
    'text-raw': ['missing', 'missing'],
    'text-layout': ['missing', 'missing'],
    'ocr-lines': ['risky', 'right'],
    'ocr-layout': ['right', 'right'],
    vlm: ['right', 'risky'],
  },
};

describe('parsing lab data', () => {
  it('has three pages and five methods, each page having an output for each method', () => {
    expect(PAGES).toHaveLength(3);
    expect(METHODS).toHaveLength(5);
    for (const p of PAGES) for (const m of METHODS) expect(p.outputs[m.id]).toBeDefined();
  });
  it('computed outcomes match the hand-written expectations', () => {
    for (const p of PAGES) {
      for (const m of METHODS) {
        const got = outcomes(p, m.id).map((o) => o.status);
        expect(got, `${p.id} / ${m.id}`).toEqual(EXPECT[p.id][m.id]);
      }
    }
  });
  it('every outcome that is not right has an explanation', () => {
    for (const p of PAGES) {
      for (const m of METHODS) {
        for (const o of outcomes(p, m.id)) {
          if (o.status !== 'right') expect(p.outputs[m.id].why[o.question.id], `${p.id}/${m.id}/${o.question.id}`).toBeTruthy();
        }
      }
    }
  });
  it('every question is answerable from at least one method, so the evidence strings are reachable', () => {
    for (const p of PAGES) for (const q of p.questions) expect(METHODS.some((m) => hasEvidence(p.outputs[m.id].text, q))).toBe(true);
  });
  it('each page teaches something: no page is answered right by every method', () => {
    for (const p of PAGES) {
      const all = METHODS.flatMap((m) => outcomes(p, m.id).map((o) => o.status));
      expect(all.some((s) => s !== 'right')).toBe(true);
      expect(all.some((s) => s === 'right')).toBe(true);
    }
  });
});

describe('page 1: columns', () => {
  const page = PAGES[0];
  it('line-by-line reading interleaves the columns', () => {
    expect(readAcross(['a1', 'a2'], ['b1', 'b2', 'b3'])).toEqual(['a1', 'b1', 'a2', 'b2', 'b3']);
  });
  it('the raw output keeps header and footer, the layout output drops them', () => {
    expect(stats(page, 'text-raw').boilerplateKept).toBe(true);
    expect(stats(page, 'text-layout').boilerplateKept).toBe(false);
    expect(stats(page, 'vlm').boilerplateKept).toBe(true);
  });
  it('the second question survives interleaving because its sentence is on the last lines', () => {
    expect(statusOf(page.outputs['text-raw'].text, page.questions[1])).toBe('right');
  });
});

describe('page 2: table', () => {
  const page = PAGES[1];
  it('has no boilerplate to report', () => {
    expect(stats(page, 'text-raw').boilerplateKept).toBeNull();
  });
  it('row-wise reading puts the merged label next to the wrong row', () => {
    expect(page.outputs['ocr-lines'].text).toContain('Business Enterprise');
    expect(page.outputs['ocr-lines'].text).toContain('Basic £4 50 GB Personal Plus');
  });
});

describe('page 3: scan', () => {
  const page = PAGES[2];
  it('a scan has an empty text layer, so zero characters', () => {
    expect(stats(page, 'text-raw').chars).toBe(0);
    expect(stats(page, 'text-layout').chars).toBe(0);
    expect(stats(page, 'vlm').chars).toBeGreaterThan(0);
  });
  it('the OCR output contains look-alike characters instead of digits', () => {
    expect(page.outputs['ocr-lines'].text).toContain('£1,2B4.5O');
  });
});
