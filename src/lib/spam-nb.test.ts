import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { EXTRA, TEST, TRAIN, pyList } from './spam-data';
import { accuracy, logScore, predict, startingLean, tokenize, train, votes } from './spam-nb';
import { PY_ACCURACY, PY_DATA, PY_LOG_SCORE, PY_PREDICT, PY_TOKENIZE, PY_TRAIN } from './spam-code';

describe('spam data', () => {
  it('has 30 training, 12 test and 4 extra messages, each labelled', () => {
    expect([TRAIN.length, TEST.length, EXTRA.length]).toEqual([30, 12, 4]);
    for (const [t, l] of [...TRAIN, ...TEST, ...EXTRA]) {
      expect(t.length).toBeGreaterThan(5);
      expect(['spam', 'ham']).toContain(l);
    }
  });
  it('never repeats a message between the sets', () => {
    const all = [...TRAIN, ...TEST, ...EXTRA].map(([t]) => t.toLowerCase());
    expect(new Set(all).size).toBe(all.length);
  });
  it('writes Python lists with the right quoting', () => {
    expect(pyList('x', [["don't", 'ham']])).toBe('x = [\n    ("don\'t", "ham"),\n]\n');
  });
});

describe('tokenize', () => {
  it('lowercases, splits and trims punctuation', () => {
    expect(tokenize('WIN a FREE prize now, click here!')).toEqual(['win', 'a', 'free', 'prize', 'now', 'click', 'here']);
    expect(tokenize("URGENT: don't be late ...")).toEqual(['urgent', "don't", 'be', 'late']);
    expect(tokenize('  ?!  ')).toEqual([]);
  });
});

describe('counting classifier', () => {
  const m = train(TRAIN);
  it('counts messages and words per label', () => {
    expect(m.messages).toEqual({ spam: 14, ham: 16 });
    expect(m.words.spam.get('free')).toBe(6);
    expect(m.words.ham.get('free')).toBeUndefined();
    expect(m.words.ham.get('you')).toBe(10);
  });
  it('gets 10 of the 12 test messages right, and misses the two the lesson discusses', () => {
    expect(accuracy(m, TEST)).toBeCloseTo(10 / 12);
    const wrong = TEST.filter(([t, l]) => predict(m, t) !== l).map(([t]) => t);
    expect(wrong).toEqual(['Earn money from home, no experience needed', 'Are you free to play games now?']);
    expect(accuracy(m, TRAIN)).toBe(1);
  });
  it('gets all 12 right after the four extra examples', () => {
    expect(accuracy(train([...TRAIN, ...EXTRA]), TEST)).toBe(1);
  });
  it('votes add up to the difference between the two scores', () => {
    for (const [text] of TEST) {
      const sum = votes(m, text).reduce((a, v) => a + v.lean, 0) + startingLean(m);
      expect(sum).toBeCloseTo(logScore(m, text, 'spam') - logScore(m, text, 'ham'), 9);
    }
  });
  it('ignores words it has never seen', () => {
    const v = votes(m, 'zebra free');
    expect(v[0]).toMatchObject({ word: 'zebra', known: false, lean: 0 });
    expect(v[1].lean).toBeGreaterThan(0);
  });
});

describe('the Python version agrees with the TypeScript one', () => {
  it('gives the same scores for every test message', () => {
    const py = [
      PY_DATA,
      PY_TOKENIZE,
      PY_TRAIN,
      PY_LOG_SCORE,
      PY_PREDICT,
      PY_ACCURACY,
      'import json',
      'model = train(train_set)',
      'out = [[log_score(model, t, "spam"), log_score(model, t, "ham"), predict(model, t)] for t, _ in test_set]',
      'print(json.dumps([out, accuracy(model, test_set), accuracy(train(train_set + extra_set), test_set)]))',
    ].join('\n');
    const r = spawnSync('python3', ['-I', '-c', py], { encoding: 'utf8', timeout: 20000 });
    expect(r.stderr).toBe('');
    const [out, acc, acc2] = JSON.parse(r.stdout) as [[number, number, string][], number, number];
    const m = train(TRAIN);
    TEST.forEach(([text], i) => {
      expect(out[i][0]).toBeCloseTo(logScore(m, text, 'spam'), 9);
      expect(out[i][1]).toBeCloseTo(logScore(m, text, 'ham'), 9);
      expect(out[i][2]).toBe(predict(m, text));
    });
    expect(acc).toBeCloseTo(10 / 12);
    expect(acc2).toBe(1);
  });
});
