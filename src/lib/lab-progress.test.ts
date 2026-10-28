import { describe, expect, it } from 'vitest';
import { clipOutput, labCodeKey, nextLab, prevLab, summarise, tracebackTail, withLabDone } from './lab-progress';

describe('lab progress helpers', () => {
  it('builds a key for each lab’s saved code', () => {
    expect(labCodeKey('cosine-search')).toBe('layerwise:lab-code:cosine-search');
  });

  it('adds a finished lab once', () => {
    const done = ['a'];
    expect(withLabDone(done, 'b')).toEqual(['a', 'b']);
    expect(withLabDone(done, 'a')).toBe(done);
  });

  it('finds the next and previous lab', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(nextLab(list, 'a')?.id).toBe('b');
    expect(nextLab(list, 'c')).toBeNull();
    expect(nextLab(list, 'zzz')).toBeNull();
    expect(prevLab(list, 'c')?.id).toBe('b');
    expect(prevLab(list, 'a')).toBeNull();
  });

  it('summarises checks', () => {
    const r = (ok: boolean) => ({ name: 'x', ok, why: '' });
    expect(summarise([r(true), r(false), r(true)])).toBe('2 of 3 checks pass');
    expect(summarise([r(true), r(true)])).toBe('All 2 checks pass');
    expect(summarise([r(false)])).toBe('0 of 1 check passes');
    expect(summarise([])).toBe('0 of 0 checks pass');
  });

  it('cuts long output and keeps the end of a traceback', () => {
    expect(clipOutput('a\nb', 5)).toBe('a\nb');
    expect(clipOutput('1\n2\n3\n4', 2)).toBe('1\n2\n… 2 more lines');
    expect(tracebackTail('l1\nl2\nl3\nl4', 2)).toBe('l3\nl4');
  });
});
