import { describe, expect, it } from 'vitest';
import { QUESTIONS, answer, fromMemory, matchScore, mostCommon, search, tally } from './no-rag';

const q = (id: string) => QUESTIONS.find((x) => x.id === id)!;

describe('no retrieval what-if (toy)', () => {
  it('guesses the most common answer it saw for a private question', () => {
    expect(mostCommon(['20 days', '25 days', '25 days'])).toBe('25 days');
    const a = answer(q('leave'), false);
    expect(a.text).toBe('25 days');
    expect(a.source).toBe('guess');
    expect(a.correct).toBe(false);
  });
  it('is stuck at its training cutoff for a recent fact', () => {
    const a = answer(q('acme'), false);
    expect(a.text).toBe('version 3.9'); // 4.0 was published in June, after the March cutoff
    expect(a.source).toBe('memory');
    expect(a.correct).toBe(false);
  });
  it('knows stable public facts without retrieval', () => {
    expect(answer(q('capital'), false)).toMatchObject({ text: 'Paris', source: 'memory', correct: true });
  });
  it('matches by the share of question words found in the passage (hand-checked)', () => {
    // "Where is order 88213?" -> order, 88213 (where and is are skipped); the order passage has both
    expect(matchScore('Where is order 88213?', 'Order 88213 is out for delivery and arrives tomorrow.')).toBe(1);
    expect(matchScore('What is the capital of France?', 'Order 88213 is out for delivery.')).toBe(0);
  });
  it('retrieval finds the private and the recent passages and answers correctly', () => {
    for (const id of ['leave', 'acme', 'order']) {
      const a = answer(q(id), true);
      expect(a.source, id).toBe('passage');
      expect(a.correct, id).toBe(true);
    }
    expect(search(q('leave').text)!.passage.id).toBe('leave');
  });
  it('falls back to memory when nothing in the store matches', () => {
    expect(search(q('capital').text)).toBeNull();
    expect(answer(q('capital'), true)).toMatchObject({ text: 'Paris', source: 'memory', correct: true });
  });
  it('the tally is 1 of 4 without retrieval and 4 of 4 with it', () => {
    expect(tally(false)).toBe(1);
    expect(tally(true)).toBe(4);
    expect(fromMemory(q('order')).source).toBe('guess');
  });
});
