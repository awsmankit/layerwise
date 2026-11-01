import { useState } from 'react';
import { Root } from './shared';
import { SCENE, distinctLabels, label, unlabelled, type SegKind } from '../../lib/seg-kinds';

const KINDS: { id: SegKind; name: string; blurb: string }[] = [
  { id: 'semantic', name: 'Semantic', blurb: 'Every square gets a class. Both people are just "person", so you cannot tell where one ends and the other starts.' },
  { id: 'instance', name: 'Instance', blurb: 'Each countable thing gets its own mask: person 1, person 2, car 1. Sky and road are not things you count, so they get no mask.' },
  { id: 'panoptic', name: 'Panoptic', blurb: 'Both at once: every square gets a class, and each countable thing also gets its own number.' },
];

const CLASS: Record<string, string> = { sky: 'sky', road: 'road', person: 'person', car: 'car' };

export default function SegmentationKinds() {
  const [kind, setKind] = useState<SegKind>('semantic');
  const k = KINDS.find((x) => x.id === kind)!;
  const labels = distinctLabels(kind);
  const gaps = unlabelled(kind);

  return (
    <Root>
      <div className="viz w5a-seg">
        <p className="viz-title">Three ways to label every pixel of one street scene</p>
        <div className="w5a-row" role="group" aria-label="Kind of segmentation">
          {KINDS.map((x) => (
            <button key={x.id} type="button" className="w5a-chip" aria-pressed={kind === x.id} onClick={() => setKind(x.id)}>
              {x.name}
            </button>
          ))}
        </div>
        <div className="w5a-seg-grid" role="img" aria-label={`A 14 by 7 street scene: sky above, road below, two people standing side by side and a car. Labelled ${k.name.toLowerCase()}: ${labels.join(', ')}.`}>
          {SCENE.flat().map((c, i) => {
            const l = label(c, kind);
            const thing = c.cls === 'person' || c.cls === 'car';
            const cls = l === null ? 'none' : kind === 'semantic' || !thing ? CLASS[c.cls] : `${c.cls}${c.inst}`;
            return (
              <div key={i} className={`w5a-sc w5a-sc-${cls}`}>
                {kind !== 'semantic' && thing ? c.inst : ''}
              </div>
            );
          })}
        </div>
        <ul className="w5a-legend">
          {labels.map((l) => {
            const [c, n] = l.split(' ');
            const cls = kind === 'semantic' || c === 'sky' || c === 'road' ? c : `${c}${n}`;
            return (
              <li key={l}>
                <i className={`w5a-sc-${cls}`} aria-hidden="true" /> {l}
              </li>
            );
          })}
        </ul>
        <p className="w5a-result" aria-live="polite">
          {k.blurb}
        </p>
        <p className="w5a-note">{gaps > 0 ? `${gaps} of 98 squares (the white ones) have no label.` : 'Every square has a label.'}</p>
      </div>
    </Root>
  );
}
