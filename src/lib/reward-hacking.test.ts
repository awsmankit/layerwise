import { describe, expect, it } from 'vitest';
import {
  BIN,
  CAMERA,
  HORIZON,
  NO_TERMS,
  RUG,
  STORY,
  cameraSeesNoMess,
  plan,
  startRoom,
  stepRoom,
  summarisePlan,
  type TermSet,
} from './reward-hacking';

const only = (over: Partial<TermSet>): TermSet => ({ ...NO_TERMS, ...over });

describe('the room rules', () => {
  it('starts with the camera seeing mess', () => {
    expect(cameraSeesNoMess(startRoom())).toBe(false);
  });

  it('keeps the robot inside the room: moving off the edge changes nothing', () => {
    const r = startRoom();
    let cur = r;
    for (let i = 0; i < 10; i++) cur = stepRoom(cur, 'down').room;
    expect(cur.robot).toBe(startRoom().robot); // the start is already on the bottom row
  });

  it('cannot cover the camera from anywhere but the camera stand', () => {
    const r = startRoom();
    expect(stepRoom(r, 'cover').room.covered).toBe(0);
  });

  it('a covered lens sees no mess even though the dirt has not moved', () => {
    const covered = { ...startRoom(), robot: CAMERA.y * 6 + CAMERA.x, covered: 1 as const };
    expect(cameraSeesNoMess(covered)).toBe(true);
  });

  it('knows where the rug and the bin are', () => {
    expect(RUG).toEqual({ x: 2, y: 1 });
    expect(BIN).toEqual({ x: 5, y: 0 });
  });
});

describe('what the exact planner does for each reward (hand-checked against the room layout)', () => {
  it('with no reward it does nothing', () => {
    const p = plan(NO_TERMS);
    expect(p.outcome.behaviour).toBe('idle');
    expect(p.total).toBe(0);
    expect(p.frames).toHaveLength(HORIZON + 1);
  });

  it('rewarding only "the camera sees no mess": covers the camera and leaves both bits of dirt on the floor', () => {
    const p = plan(STORY[0].terms);
    expect(p.outcome.behaviour).toBe('covers');
    expect(p.outcome.onFloor).toBe(2);
    expect(p.outcome.inBin).toBe(0);
    // 5 moves from (2,3) to the camera stand at (0,0), the cover on step 6, then it is quiet for 17 steps
    expect(p.frames.map((f) => f.action).slice(1, 7)).toEqual(['up', 'up', 'up', 'left', 'left', 'cover']);
    expect(p.quietSteps).toBe(HORIZON - 5);
    expect(p.total).toBeCloseTo(17 - 5 * 0.01, 10);
  });

  it('charging for covering: hides both bits of dirt under the rug', () => {
    const p = plan(STORY[1].terms);
    expect(p.outcome.behaviour).toBe('hides');
    expect(p.outcome.underRug).toBe(2);
    expect(p.outcome.coverCovered).toBe(false);
    expect(p.outcome.inBin).toBe(0);
  });

  it('also charging for hiding: finally puts the dirt in the bin', () => {
    const p = plan(STORY[2].terms);
    expect(p.outcome.behaviour).toBe('cleans');
    expect(p.outcome.inBin).toBe(2);
    expect(p.outcome.underRug).toBe(0);
  });

  it('paying for every pick-up: picks up, drops and picks up again, and never cleans', () => {
    const p = plan(STORY[3].terms);
    expect(p.outcome.behaviour).toBe('farms');
    expect(p.pickups).toBeGreaterThan(5);
    expect(p.outcome.inBin).toBe(0);
  });

  it('rewarding the real outcome (dirt in the bin at the end): cleans', () => {
    const p = plan(STORY[4].terms);
    expect(p.outcome.behaviour).toBe('cleans');
    expect(p.endBonus).toBe(20);
    expect(p.outcome.inBin).toBe(2);
  });

  it('the bin-only reward does not cover, hide or farm', () => {
    const p = plan(only({ binEnd: true }));
    expect(p.outcome.coverCovered).toBe(false);
    expect(p.outcome.underRug).toBe(0);
    expect(p.pickups).toBe(2);
  });
});

describe('planning properties', () => {
  it('is deterministic: the same reward gives the same plan', () => {
    const a = plan(only({ sees: true, pickup: true }));
    const b = plan(only({ sees: true, pickup: true }));
    expect(a.frames.map((f) => f.action)).toEqual(b.frames.map((f) => f.action));
    expect(a.total).toBe(b.total);
  });

  it('the total equals the sum of the step rewards plus the end bonus', () => {
    const p = plan(STORY[4].terms);
    const sum = p.frames.reduce((s, f) => s + f.reward, 0) + p.endBonus;
    expect(sum).toBeCloseTo(p.total, 10);
  });

  it('never carries two bits of dirt at once', () => {
    for (const story of STORY) {
      for (const f of plan(story.terms).frames) expect(f.dirt.filter((d) => d.where === 'carried').length).toBeLessThanOrEqual(1);
    }
  });
});

describe('plan summary', () => {
  it('compresses repeated actions', () => {
    expect(summarisePlan(plan(STORY[0].terms))).toBe('up x3, left x2, cover, wait x16');
    expect(summarisePlan(plan(NO_TERMS))).toBe('wait x22');
  });
});
