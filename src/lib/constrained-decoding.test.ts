import { describe, expect, it } from 'vitest';
import { END, MODES, VALID_STRINGS, isJsonComplete, isJsonPrefix, isSchemaComplete, isSchemaPrefix, judge, nextStep, rng, run, slotFor, tally, type Mode } from './constrained-decoding';

const find = (text: string, mode: Mode, token: string) => nextStep(text, mode).candidates.find((c) => c.token === token)!;

describe('grammars', () => {
  it('lists 15 valid strings, all of which the JSON checker and the judge accept', () => {
    expect(VALID_STRINGS).toHaveLength(15);
    for (const v of VALID_STRINGS) {
      expect(isSchemaComplete(v)).toBe(true);
      expect(isJsonComplete(v)).toBe(true);
      expect(judge(v).schemaOk).toBe(true);
    }
  });
  it('knows what a prefix is', () => {
    expect(isSchemaPrefix('{"category": "bill')).toBe(true);
    expect(isSchemaPrefix('{"category": "Bill')).toBe(false);
    expect(isSchemaPrefix('{"type')).toBe(false);
    expect(isJsonPrefix('{"type": "Bill')).toBe(true);
    expect(isJsonPrefix('Sure')).toBe(false);
    expect(isJsonPrefix('{"a": 10')).toBe(true);
    expect(isJsonPrefix('{"a": high')).toBe(false);
    expect(isJsonPrefix('{"a": tru')).toBe(true);
    expect(isJsonPrefix('{"a": trux')).toBe(false);
    expect(isJsonPrefix('{"a": -}')).toBe(false);
    expect(isJsonComplete('{"a": 1}')).toBe(true);
    expect(isJsonComplete('{"a": 1}}')).toBe(false);
  });
});

describe('the scripted model', () => {
  it('has probabilities that add up to 100 per cent in every slot', () => {
    const probes = ['', '{"', '{"category', '{"category": "', '{"category": "bill', '{"category": "bug', '{"category": "bug", "', '{"category": "bug", "urgency', '{"category": "bug", "urgency": ', '{"category": "bug", "urgency": 3', '{"category": "bug", "urgency": 3}', 'Sure'];
    for (const p of probes) {
      const sum = nextStep(p, 'none').candidates.reduce((a, c) => a + c.raw, 0);
      expect(sum).toBeCloseTo(1, 10);
    }
  });
  it('routes texts to the right slot', () => {
    expect(slotFor('')).toBe('START');
    expect(slotFor('{"category": "billing')).toBe('CLOSE');
    expect(slotFor('{"category": "Bill')).toBe('ING');
    expect(slotFor('{"category": "bug", "urgency": ')).toBe('URG');
    expect(slotFor('{"category": "bug", "urgency":')).toBe('SPACE');
    expect(slotFor('{"category": "bug", "urgency": 3}')).toBe('END');
    expect(slotFor('Sure')).toBe('OFF');
  });
});

describe('the mask', () => {
  it('blocks everything except the opening token at the start, and renormalises', () => {
    const s = nextStep('', 'schema');
    expect(s.candidates.filter((c) => c.allowed).map((c) => c.token)).toEqual(['{"']);
    expect(s.blocked).toBeCloseTo(0.3, 10);
    expect(find('', 'schema', '{"').after).toBe(1);
    expect(find('', 'schema', 'Sure').after).toBe(0);
  });
  it('blocks capitalised and unknown labels but keeps the three enum values (worked example in the lesson)', () => {
    const s = nextStep('{"category": "', 'schema');
    expect(s.candidates.filter((c) => c.allowed).map((c) => c.token).sort()).toEqual(['bill', 'bug', 'question']);
    expect(s.blocked).toBeCloseTo(0.36, 10);
    expect(find('{"category": "', 'schema', 'bill').after).toBeCloseTo(30 / 64, 10);
    expect(find('{"category": "', 'schema', 'bug').after).toBeCloseTo(20 / 64, 10);
    expect(find('{"category": "', 'schema', 'question').after).toBeCloseTo(14 / 64, 10);
  });
  it('keeps only digits 1 to 5 under the schema, but allows 6 and 10 in JSON mode', () => {
    const t = '{"category": "bug", "urgency": ';
    expect(nextStep(t, 'schema').candidates.filter((c) => c.allowed).map((c) => c.token).sort()).toEqual(['1', '2', '3', '4', '5']);
    expect(find(t, 'json', '6').allowed).toBe(true);
    expect(find(t, 'json', '10').allowed).toBe(true);
    expect(find(t, 'json', 'high').allowed).toBe(false);
    expect(find(t, 'schema', '3').after).toBeCloseTo(30 / 88, 10);
  });
  it('lets a token through if it can still lead to a valid output, even though the output is not valid yet', () => {
    const t = '{"category": "bug", "urgency';
    expect(find(t, 'schema', '":').allowed).toBe(true);
    expect(find('{"category": "bug", "urgency":', 'schema', ' ').after).toBe(1);
  });
  it('allows the end token only when the output is complete', () => {
    expect(find('{"category": "bug", "urgency": 3}', 'schema', END).allowed).toBe(true);
    expect(find('{"category": "bug"}', 'json', END).allowed).toBe(true);
    expect(find('{"category": "bug"}', 'schema', END).allowed).toBe(false);
  });
  it('never leaves a step with no allowed token (no dead ends) in any mode', () => {
    for (const mode of MODES) {
      const seen = new Set<string>();
      const visit = (text: string, depth: number) => {
        if (depth > 14 || seen.has(text + depth)) return;
        seen.add(text + depth);
        const { candidates } = nextStep(text, mode);
        const ok = candidates.filter((c) => c.allowed);
        const done = mode === 'schema' ? isSchemaComplete(text) : isJsonComplete(text);
        expect(ok.length, `${mode}: "${text}"`).toBeGreaterThan(0);
        expect(ok.reduce((a, c) => a + c.after, 0)).toBeCloseTo(1, 10);
        if (done) return;
        for (const c of ok) if (c.token !== END) visit(text + c.token, depth + 1);
      };
      visit('', 0);
    }
  });
});

describe('judge', () => {
  it('separates valid JSON from valid schema', () => {
    expect(judge('Sure').parses).toBe(false);
    expect(judge('{"category": "Billing", "urgency": 3}')).toMatchObject({ parses: true, schemaOk: false });
    expect(judge('{"category": "bug", "urgency": 6}')).toMatchObject({ parses: true, schemaOk: false });
    expect(judge('{"category": "bug"}').reason).toContain('urgency');
    expect(judge('{"type": "bug", "urgency": 2}').reason).toContain('"type"');
    expect(judge('{"category": "bug", "urgency": 2}').schemaOk).toBe(true);
  });
});

describe('whole runs', () => {
  it('is deterministic for a given seed', () => {
    expect(tally('none', 20, 200, 7)).toEqual(tally('none', 20, 200, 7));
    const a = run('none', 20, rng(3));
    const b = run('none', 20, rng(3));
    expect(a).toEqual(b);
  });
  it('the schema mask gives a valid result every time when the token limit is generous', () => {
    const t = tally('schema', 20, 1000, 11);
    expect(t.schemaOk).toBe(1000);
    expect(t.truncated).toBe(0);
  });
  it('JSON mode always parses (with room), but does not always match the schema', () => {
    const t = tally('json', 20, 2000, 11);
    expect(t.parses).toBe(2000);
    expect(t.schemaOk).toBeLessThan(2000);
    expect(t.schemaOk).toBeGreaterThan(0);
  });
  it('without any mask a good share of outputs is not even JSON', () => {
    const t = tally('none', 20, 2000, 11);
    expect(t.parses).toBeLessThan(2000 * 0.85);
    expect(t.schemaOk).toBeLessThan(t.parses + 1);
  });
  it('a token limit that is too small truncates even with the mask, which is then not valid', () => {
    const t = tally('schema', 6, 300, 5);
    expect(t.truncated).toBe(300);
    expect(t.schemaOk).toBe(0);
  });
  it('the longest valid path is 11 tokens, so a limit of 12 is always enough and 10 is not', () => {
    expect(tally('schema', 12, 800, 9).schemaOk).toBe(800);
    expect(tally('schema', 10, 800, 9).schemaOk).toBeLessThan(800);
  });
});
