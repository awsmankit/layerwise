import { describe, expect, it } from 'vitest';
import { DEFAULTS, WORLDS, bestAction, cellId, greedyPath, kindAt, newLearner, optimalQ, qUpdate, recent, smooth, startOf, step, train, valueOf } from './qgrid';

const world = (id: string) => WORLDS.find((w) => w.id === id)!;
const cliff = world('cliff');
const coin = world('coin');
const fixed = world('coin-fixed');

describe('grid mechanics', () => {
  it('reads the layout', () => {
    expect(startOf(cliff)).toEqual([0, 3]);
    expect(kindAt(cliff, 3, 3)).toBe('cliff');
    expect(kindAt(cliff, 7, 3)).toBe('goal');
    expect(kindAt(coin, 2, 1)).toBe('coin');
    expect(kindAt(coin, 1, 1)).toBe('wall');
  });

  it('walls and edges leave the agent in place and cost a step', () => {
    expect(step(cliff, 0, 0, 0)).toMatchObject({ x: 0, y: 0, reward: -1, done: false });
    expect(step(coin, 0, 1, 1)).toMatchObject({ x: 0, y: 1, reward: -1 }); // wall at (1,1)
  });

  it('stepping on the cliff costs 100 and returns the agent to the start without ending the episode', () => {
    expect(step(cliff, 1, 2, 2)).toMatchObject({ x: 0, y: 3, reward: -100, done: false, fell: true });
  });

  it('the goal ends the episode, and the coin pays every time', () => {
    expect(step(cliff, 7, 2, 2)).toMatchObject({ x: 7, y: 3, reward: -1, done: true });
    expect(step(coin, 5, 1, 2)).toMatchObject({ reward: 10, done: true });
    expect(step(coin, 2, 0, 2)).toMatchObject({ x: 2, y: 1, reward: 3, coin: true });
    expect(step(coin, 2, 2, 0)).toMatchObject({ x: 2, y: 1, reward: 3, coin: true });
  });
});

describe('the Q-learning update', () => {
  it('moves a fraction alpha of the way to the target: the worked example in the lesson', () => {
    // old 0, reward -1, best next value 2, alpha 0.5, gamma 0.9: target = -1 + 0.9 x 2 = 0.8, new = 0.4
    expect(qUpdate(0, -1, 2, 0.5, 0.9)).toBeCloseTo(0.4, 12);
  });
  it('alpha 0 changes nothing and alpha 1 jumps to the target', () => {
    expect(qUpdate(3, -1, 2, 0, 0.9)).toBe(3);
    expect(qUpdate(3, -1, 2, 1, 0.9)).toBeCloseTo(0.8, 12);
  });
  it('gamma 0 ignores the future', () => {
    expect(qUpdate(0, 5, 100, 1, 0)).toBe(5);
  });
});

describe('exact values for reference', () => {
  it('the cliff edge route is worth -9 undiscounted and about -6.13 at gamma 0.9', () => {
    const start = cellId(cliff, 0, 3) * 4;
    expect(valueOf(optimalQ(cliff, 1), start)).toBeCloseTo(-9, 6);
    expect(valueOf(optimalQ(cliff, 0.9), start)).toBeCloseTo(-(1 - 0.9 ** 9) / 0.1, 6);
  });
  it('with the coin worth 3, the best policy loops on the coin instead of finishing', () => {
    const g = greedyPath(coin, optimalQ(coin, 0.9));
    expect(g.reached).toBe(false);
    expect(g.looped).toBe(true);
  });
  it('with the coin worth 0.4 the best policy reaches the goal in 7 moves, through the coin, for 5.4', () => {
    const g = greedyPath(fixed, optimalQ(fixed, 0.9));
    expect(g.reached).toBe(true);
    expect(g.cells.length - 1).toBe(7);
    expect(g.ret).toBeCloseTo(5.4, 10);
  });
});

describe('learning', () => {
  it('is deterministic for a given seed', () => {
    const a = train(cliff, newLearner(cliff, 11), DEFAULTS, 30);
    const b = train(cliff, newLearner(cliff, 11), DEFAULTS, 30);
    expect(a.q).toEqual(b.q);
    expect(a.log).toEqual(b.log);
    // and training in two parts equals training in one
    const c = train(cliff, train(cliff, newLearner(cliff, 11), DEFAULTS, 10), DEFAULTS, 20);
    expect(c.q).toEqual(a.q);
  });

  it('has no opinion before any experience', () => {
    expect(bestAction(newLearner(cliff).q, 0)).toBeNull();
  });

  it('learns the cliff-edge route of 9 moves within 200 episodes at the default settings', () => {
    const l = train(cliff, newLearner(cliff), DEFAULTS, 200);
    const g = greedyPath(cliff, l.q);
    expect(g.reached).toBe(true);
    expect(g.cells.length - 1).toBe(9);
    expect(g.ret).toBe(-9);
  });

  it('exploring costs reward while training: with epsilon 0.1 the agent still falls, with epsilon 0 it does not once it has learned', () => {
    const explore = recent(train(cliff, newLearner(cliff), DEFAULTS, 300), 50);
    const greedy = recent(train(cliff, newLearner(cliff), { ...DEFAULTS, epsilon: 0 }, 300), 50);
    expect(explore.falls).toBeGreaterThan(0);
    expect(greedy.falls).toBe(0);
    expect(explore.meanReturn).toBeLessThan(greedy.meanReturn);
  });

  it('with the generous coin, reward per episode rises while the goal is almost never reached', () => {
    const l = train(coin, newLearner(coin), DEFAULTS, 300);
    const r = recent(l, 50);
    expect(r.meanReturn).toBeGreaterThan(20);
    expect(r.reached).toBeLessThan(10);
    expect(greedyPath(coin, l.q).looped).toBe(true);
  });

  it('with the small coin the agent reaches the goal every time', () => {
    const l = train(fixed, newLearner(fixed), DEFAULTS, 300);
    expect(recent(l, 50).reached).toBe(50);
    expect(greedyPath(fixed, l.q).reached).toBe(true);
  });

  it('smooths a series with a moving average', () => {
    expect(smooth([2, 4, 6, 8], 2)).toEqual([2, 3, 5, 7]);
  });
});
