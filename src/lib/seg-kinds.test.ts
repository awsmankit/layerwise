import { describe, expect, it } from 'vitest';
import { SCENE, SCENE_ROWS, distinctLabels, label, unlabelled } from './seg-kinds';

describe('segmentation scene', () => {
  it('is a 14 by 7 grid', () => {
    expect(SCENE).toHaveLength(7);
    for (const r of SCENE_ROWS) expect(r).toHaveLength(14);
  });

  it('semantic: one label per class, so both people share "person"', () => {
    expect(distinctLabels('semantic')).toEqual(['car', 'person', 'road', 'sky']);
    expect(unlabelled('semantic')).toBe(0);
  });

  it('instance: the two people are separate and sky and road get no label', () => {
    expect(distinctLabels('instance')).toEqual(['car 1', 'person 1', 'person 2']);
    expect(unlabelled('instance')).toBe(SCENE.flat().filter((c) => c.cls === 'sky' || c.cls === 'road').length);
  });

  it('panoptic: every square labelled, and the people are still separate', () => {
    expect(distinctLabels('panoptic')).toEqual(['car 1', 'person 1', 'person 2', 'road', 'sky']);
    expect(unlabelled('panoptic')).toBe(0);
  });

  it('the people touch: squares of person 1 and person 2 are neighbours', () => {
    expect(label(SCENE[2][4], 'instance')).toBe('person 1');
    expect(label(SCENE[2][5], 'instance')).toBe('person 2');
  });
});
