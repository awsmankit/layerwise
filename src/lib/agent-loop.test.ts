import { describe, expect, it } from 'vitest';
import { checkpointIndex, commonSlots, endingSteps, fullScript, loopsDone, openingSteps, revealedFriends } from './agent-loop';

describe('agent loop script', () => {
  it('finds two shared slots, so the person can change the plan', () => {
    expect(commonSlots()).toEqual(['Sat 14:00', 'Sun 14:00']);
  });

  it('ends the opening at a checkpoint where the learner decides', () => {
    const o = openingSteps();
    expect(checkpointIndex()).toBe(o.length - 1);
    expect(o.filter((s) => s.checkpoint).length).toBe(1);
  });

  it('reads each friend once, then reveals their calendar', () => {
    const o = openingSteps();
    expect(revealedFriends(o, o.length)).toEqual(['Asha', 'Ben', 'Chloe']);
    expect(revealedFriends(o, 0)).toEqual([]);
  });

  it('asking first avoids the Saturday clash; sending first causes it', () => {
    const asked = endingSteps('ask').map((s) => s.text).join(' ');
    const sent = endingSteps('send').map((s) => s.text).join(' ');
    expect(asked).toMatch(/Sun 14:00/);
    expect(asked).toMatch(/football/);
    expect(sent).toMatch(/Sat 14:00/);
    expect(sent).toMatch(/cannot take the first message back/);
  });

  it('every step has text, no exclamation marks, and loops are counted', () => {
    for (const c of ['ask', 'send'] as const) {
      const s = fullScript(c);
      for (const step of s) {
        expect(step.text.length).toBeGreaterThan(10);
        expect(step.text).not.toMatch(/!/);
      }
      expect(loopsDone(s, s.length)).toBeGreaterThanOrEqual(3);
    }
  });
});
