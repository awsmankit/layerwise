import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

type P = { w: string; x: number; y: number; g: 'animal' | 'fruit' | 'vehicle' };

// Hand-placed 2D positions to show how related words cluster. Real embeddings
// have hundreds or thousands of dimensions; this is a flattened picture.
const points: P[] = [
  { w: 'cat', x: 18, y: 22, g: 'animal' },
  { w: 'dog', x: 25, y: 30, g: 'animal' },
  { w: 'horse', x: 14, y: 38, g: 'animal' },
  { w: 'wolf', x: 28, y: 18, g: 'animal' },
  { w: 'apple', x: 70, y: 20, g: 'fruit' },
  { w: 'banana', x: 80, y: 28, g: 'fruit' },
  { w: 'mango', x: 74, y: 36, g: 'fruit' },
  { w: 'pear', x: 62, y: 30, g: 'fruit' },
  { w: 'car', x: 44, y: 76, g: 'vehicle' },
  { w: 'truck', x: 54, y: 70, g: 'vehicle' },
  { w: 'bus', x: 36, y: 68, g: 'vehicle' },
  { w: 'train', x: 50, y: 86, g: 'vehicle' },
];

export default function EmbeddingSpace() {
  const [sel, setSel] = useState(1);
  const near = useMemo(() => {
    const s = points[sel];
    return points
      .map((p, i) => ({ i, d: Math.hypot(p.x - s.x, p.y - s.y) }))
      .filter((o) => o.i !== sel)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
  }, [sel]);

  return (
    <Root>
      <div className="viz es">
        <p className="viz-title">Meaning as distance</p>
        <svg viewBox="0 0 100 100" className="es-svg" role="group" aria-label="Words plotted in two dimensions">
          {near.map(({ i }, k) => (
            <motion.line
              key={`${sel}-${i}`}
              x1={points[sel].x}
              y1={points[sel].y}
              x2={points[i].x}
              y2={points[i].y}
              stroke="var(--signal)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              initial={{ x2: points[sel].x, y2: points[sel].y }}
              animate={{ x2: points[i].x, y2: points[i].y }}
              transition={{ duration: 0.5, delay: k * 0.08, ease: EASE }}
            />
          ))}
          {points.map((p, i) => (
            <g key={p.w} className={`es-pt${i === sel ? ' is-sel' : ''}`} onClick={() => setSel(i)} onMouseEnter={() => setSel(i)} tabIndex={0} role="button" aria-label={p.w} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSel(i)}>
              <circle cx={p.x} cy={p.y} r={i === sel ? 2.2 : 1.4} />
              <text x={p.x} y={p.y - 3.4} textAnchor="middle">
                {p.w}
              </text>
            </g>
          ))}
        </svg>
        <p className="av-read">
          Closest to “<b>{points[sel].w}</b>”: {near.map((o) => points[o.i].w).join(', ')}.
        </p>
        <p className="viz-cap">
          Hand-placed positions to show clustering. Real embedding spaces have hundreds or thousands of dimensions, and retrieval systems search them by nearest distance.
        </p>
      </div>
    </Root>
  );
}
