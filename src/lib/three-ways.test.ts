import { describe, expect, it } from 'vitest';
import { GRID, PILE, greedyPath, groupMakeup, isGoal, move, nearest, newLearner, runGroups, shortestRoute, startGroups, stepGroups, train, vote } from './three-ways';

describe('learning from labels', () => {
  it('calls a long yellow fruit a banana and a small red one a cherry', () => {
    expect(vote(nearest(PILE, 17, 1.5)).kind).toBe('banana');
    expect(vote(nearest(PILE, 2.5, 9)).kind).toBe('cherry');
  });
  it('returns the 3 nearest, closest first', () => {
    const n = nearest(PILE, 7, 6);
    expect(n).toHaveLength(3);
    expect(n[0].id).toBe('a1');
  });
  it('can be split on an in-between fruit', () => {
    const v = vote(nearest(PILE, 11.5, 3));
    expect(v.unanimous).toBe(false);
  });
});

describe('finding groups without labels', () => {
  it('starts from spread-out centres and finishes', () => {
    const g = runGroups(PILE, startGroups(PILE, 3));
    expect(g.done).toBe(true);
    expect(g.round).toBeLessThanOrEqual(6);
  });
  it('three groups match the three kinds on this pile', () => {
    const g = runGroups(PILE, startGroups(PILE, 3));
    const makeup = groupMakeup(PILE, g.assign as number[], 3);
    makeup.forEach((m) => expect(Object.values(m).filter((n) => n > 0)).toHaveLength(1));
    expect(makeup.map((m) => m.cherry + m.apple + m.banana).sort()).toEqual([4, 4, 4]);
  });
  it('two groups merge two of the kinds, four groups split one', () => {
    const two = groupMakeup(PILE, runGroups(PILE, startGroups(PILE, 2)).assign as number[], 2);
    expect(two.some((m) => Object.values(m).filter((n) => n > 0).length > 1)).toBe(true);
    const four = runGroups(PILE, startGroups(PILE, 4));
    expect(new Set(four.assign).size).toBe(4);
  });
  it('is deterministic and one step does not change a finished result', () => {
    const a = runGroups(PILE, startGroups(PILE, 3));
    const b = runGroups(PILE, startGroups(PILE, 3));
    expect(a).toEqual(b);
    expect(stepGroups(PILE, a)).toBe(a);
  });
});

describe('learning from rewards', () => {
  it('has a route to the star that avoids the pits', () => {
    expect(shortestRoute()).toBe(7);
  });
  it('blocks moves into walls and edges', () => {
    expect(move(0, 0, 3)).toMatchObject({ x: 0, y: 0, reward: -1 });
    expect(move(0, 1, 1)).toMatchObject({ x: 0, y: 1 });
    expect(isGoal(...GRID.goal)).toBe(true);
  });
  it('knows nothing at first and wanders', () => {
    const l = newLearner();
    expect(greedyPath(l.q).reached).toBe(false);
    const one = train(l, 1);
    expect(one.tries).toBe(1);
    expect(one.history).toHaveLength(1);
  });
  it('is the same every time', () => {
    expect(train(newLearner(), 30)).toEqual(train(newLearner(), 30));
  });
  it('after 100 tries it takes the shortest safe route', () => {
    const l = train(newLearner(), 100);
    const p = greedyPath(l.q);
    expect(p.reached).toBe(true);
    expect(p.cells.length - 1).toBe(shortestRoute());
  });
  it('is already on its way after 30 tries', () => {
    const l = train(newLearner(), 30);
    const early = newLearner();
    const avg = (h: { steps: number }[]) => h.reduce((s, x) => s + x.steps, 0) / h.length;
    const wander = avg(train(early, 5).history);
    expect(avg(l.history.slice(-10))).toBeLessThan(wander);
  });
});
