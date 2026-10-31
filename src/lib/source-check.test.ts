import { describe, expect, it } from 'vitest';
import { CLUE_IDS, SCENES, choiceOf, summarise, type Answers } from './source-check';

describe('check it like a detective: scenes', () => {
  it('has five or six scenes covering a picture, a voice, a headline and a chatbot', () => {
    expect(SCENES.length).toBeGreaterThanOrEqual(5);
    expect(SCENES.length).toBeLessThanOrEqual(6);
    const kinds = new Set(SCENES.map((s) => s.kind));
    for (const k of ['picture', 'voice', 'headline', 'chatbot']) expect(kinds.has(k as never)).toBe(true);
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
  });

  it('gives each scene all four clues, each with a question and a finding', () => {
    for (const s of SCENES) {
      expect(s.clues.map((c) => c.id).sort()).toEqual([...CLUE_IDS].sort());
      for (const c of s.clues) {
        expect(c.ask.length).toBeGreaterThan(8);
        expect(c.found.length).toBeGreaterThan(30);
      }
    }
  });

  it('has exactly one best choice per scene, with feedback on every choice', () => {
    for (const s of SCENES) {
      expect(s.choices.length).toBeGreaterThanOrEqual(3);
      expect(s.choices.filter((c) => c.rating === 'best')).toHaveLength(1);
      expect(new Set(s.choices.map((c) => c.id)).size).toBe(s.choices.length);
      for (const c of s.choices) expect(c.feedback.length).toBeGreaterThan(40);
    }
  });

  it('puts the best choice in different positions so it is not always the same one', () => {
    const positions = new Set(SCENES.map((s) => s.choices.findIndex((c) => c.rating === 'best')));
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });

  it('includes scenes that are fine, so the lesson is not "distrust everything"', () => {
    expect(SCENES.filter((s) => s.fine).length).toBeGreaterThanOrEqual(1);
    expect(SCENES.filter((s) => !s.fine).length).toBeGreaterThanOrEqual(3);
  });

  it('is kind and plain: no exclamation marks in the learner-facing words apart from the invented posts', () => {
    for (const s of SCENES) {
      const words = [s.question, s.lesson, ...s.clues.map((c) => c.ask + c.found), ...s.choices.map((c) => c.text + c.feedback)].join(' ');
      expect(words).not.toMatch(/!/);
    }
  });

  it('finds a choice by id', () => {
    expect(choiceOf(SCENES[0], 'check')?.rating).toBe('best');
    expect(choiceOf(SCENES[0], 'nope')).toBeUndefined();
  });
});

describe('summarise', () => {
  it('counts best choices and how many clues were opened', () => {
    const answers: Answers = {
      creature: { choice: 'check', looked: ['who', 'elsewhere', 'feel'] },
      voice: { choice: 'buy', looked: [] },
      headline: { choice: 'check', looked: ['elsewhere'] },
    };
    expect(summarise(answers)).toEqual({ answered: 3, best: 2, cluesPerScene: 1.3, lookedFirst: 1 });
  });

  it('handles no answers', () => {
    expect(summarise({})).toEqual({ answered: 0, best: 0, cluesPerScene: 0, lookedFirst: 0 });
  });
});
