import { describe, expect, it } from 'vitest';
import {
  ANIMALS,
  RULES,
  autoFill,
  bestPossible,
  bestQuestion,
  buildTree,
  computerMove,
  countLeaves,
  countNodes,
  depths,
  firedRules,
  layout,
  newTree,
  setQuestion,
  splits,
  treeDepth,
  treeStats,
} from './reasoning';

describe('rules', () => {
  it('fires every matching rule', () => {
    expect(firedRules('rainy', 'cold').map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(firedRules('sunny', 'warm').map((r) => r.id)).toEqual(['r3']);
  });
  it('has cases nobody thought of', () => {
    expect(firedRules('snowy', 'warm')).toHaveLength(0);
    expect(firedRules('windy', 'warm')).toHaveLength(0);
    expect(RULES).toHaveLength(3);
  });
});

describe('animal tree', () => {
  it('tells which questions are worth asking', () => {
    const all = newTree().animals;
    expect(splits(all, 'water')).toBe(true);
    expect(splits(['dog', 'cat'], 'water')).toBe(false);
    expect(splits(['dog', 'cat'], 'bark')).toBe(true);
  });
  it('ignores a question that does not split', () => {
    const t = newTree();
    const withWater = setQuestion(t, [], 'water');
    expect(setQuestion(withWater, ['y'], 'fur')).toEqual(withWater); // water animals have no fur
    expect(setQuestion(withWater, ['y'], 'big').yes?.q).toBe('big');
  });
  it('the even-split rule finds every animal', () => {
    const full = autoFill(newTree());
    const s = treeStats(full);
    expect(s.complete).toBe(true);
    expect(Object.keys(depths(full)).sort()).toEqual(ANIMALS.map((a) => a.name).sort());
  });
  it('the best tree is no worse than the even-split rule, and some orders are worse', () => {
    const best = bestPossible();
    const auto = treeStats(autoFill(newTree()));
    expect(best).toEqual({ longest: 4, average: 3 });
    expect(best.longest).toBeLessThanOrEqual(auto.longest);
    expect(best.average).toBeLessThanOrEqual(auto.average + 1e-9);
    // asking "does it bark?" first wastes a question on six of the seven animals
    let bad = setQuestion(newTree(), [], 'bark');
    bad = autoFill(bad, ['bark']);
    expect(treeStats(bad).average).toBeGreaterThan(best.average);
  });
  it('picks a first question that splits seven animals 4 and 3', () => {
    expect(bestQuestion(newTree().animals, [])).toBe('fur');
  });
});

describe('take-away game', () => {
  it('from 5 sticks the tree has 8 endings and 20 spots', () => {
    const t = buildTree(5, 'computer');
    expect(countLeaves(t)).toBe(8);
    expect(countNodes(t)).toBe(20);
    expect(treeDepth(t)).toBe(5);
  });
  it('the player to move wins unless the pile is a multiple of 3', () => {
    for (let n = 1; n <= 7; n++) {
      expect(buildTree(n, 'computer').winner).toBe(n % 3 === 0 ? 'you' : 'computer');
    }
  });
  it('the computer picks the move that leaves a multiple of 3', () => {
    expect(computerMove(5)).toEqual({ take: 2, winning: true });
    expect(computerMove(4)).toEqual({ take: 1, winning: true });
    expect(computerMove(3).winning).toBe(false);
  });
  it('lays out leaves in order with parents in the middle', () => {
    const t = layout(buildTree(5, 'computer'), 40, 46, 20, 20);
    const xs: number[] = [];
    const walk = (n: typeof t) => (n.children.length ? n.children.forEach(walk) : xs.push(n.x));
    walk(t);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(Math.max(...xs)).toBe(20 + 7 * 40);
  });
});
