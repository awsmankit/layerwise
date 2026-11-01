/*
 * A tiny made-up street scene for the "kinds of segmentation" picture in the detection lesson.
 * Each square of the scene belongs to one class (sky, road, person, car). Two people stand side by side
 * and touch, so the difference between "a person" and "this person" shows up.
 *
 *  - Semantic segmentation: one class label per pixel. Both people get the label "person".
 *  - Instance segmentation: a separate mask for each countable object (people, car). Sky and road get none.
 *  - Panoptic segmentation: every pixel gets a class, and countable things also get an instance number.
 */

export type SegClass = 'sky' | 'road' | 'person' | 'car';

export interface SegCell {
  cls: SegClass;
  /** Instance number for countable things (person 1, person 2, car 1); 0 for sky and road. */
  inst: number;
}

/** s sky, r road, a first person, b second person, c car. */
export const SCENE_ROWS = [
  'ssssssssssssss',
  'ssssssssssssss',
  'sssaabbsssssss',
  'sssaabbsssssss',
  'rrraabbrrcccrr',
  'rrraabbrrcccrr',
  'rrrrrrrrrrrrrr',
];

const parse = (ch: string): SegCell => {
  switch (ch) {
    case 'a':
      return { cls: 'person', inst: 1 };
    case 'b':
      return { cls: 'person', inst: 2 };
    case 'c':
      return { cls: 'car', inst: 1 };
    case 'r':
      return { cls: 'road', inst: 0 };
    default:
      return { cls: 'sky', inst: 0 };
  }
};

export const SCENE: SegCell[][] = SCENE_ROWS.map((r) => r.split('').map(parse));

export type SegKind = 'semantic' | 'instance' | 'panoptic';

export const THINGS: SegClass[] = ['person', 'car'];

/** The label each kind of segmentation gives a square, or null when it gives none. */
export function label(cell: SegCell, kind: SegKind): string | null {
  const thing = THINGS.includes(cell.cls);
  if (kind === 'semantic') return cell.cls;
  if (kind === 'instance') return thing ? `${cell.cls} ${cell.inst}` : null;
  return thing ? `${cell.cls} ${cell.inst}` : cell.cls;
}

/** How many different labels a kind uses on the scene. */
export function distinctLabels(kind: SegKind): string[] {
  const set = new Set<string>();
  for (const row of SCENE) for (const c of row) {
    const l = label(c, kind);
    if (l) set.add(l);
  }
  return [...set].sort();
}

export function unlabelled(kind: SegKind): number {
  let n = 0;
  for (const row of SCENE) for (const c of row) if (label(c, kind) === null) n += 1;
  return n;
}
