import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/**
 * Three kinds of numbers, nested by when they are set. Parameters are learned
 * during training and stored in the model. Training hyperparameters are chosen
 * before training starts. Sampling settings are chosen for each request.
 */
const LAYERS = [
  { label: 'Sampling settings', sub: 'per request', x: 20, y: 20, w: 720, h: 230, cls: 'dx-core' },
  { label: 'Training hyperparameters', sub: 'before training', x: 60, y: 74, w: 640, h: 166, cls: 'dx-core' },
  { label: 'Parameters', sub: 'learned, stored in the model', x: 110, y: 136, w: 540, h: 70, cls: 'dx-core dx-hot' },
];

export default function KnobMap() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">What each number is set by</p>
        <svg viewBox="0 0 760 270" className="dx-svg" role="img" aria-label="Nested boxes: parameters inside training hyperparameters inside sampling settings">
          {LAYERS.map((l, i) => (
            <motion.g key={l.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: i * 0.25, ease: EASE }}>
              <rect x={l.x} y={l.y} width={l.w} height={l.h} rx="6" className={l.cls} />
              <text x={l.x + 14} y={l.y + 24} className="dx-name">{l.label}</text>
              <text x={l.x + 14} y={l.y + 42} className="dx-small">{l.sub}</text>
            </motion.g>
          ))}
        </svg>
        <p className="viz-cap">Changing a sampling setting changes one answer. Changing a training hyperparameter means training again. Changing a parameter means you have a different model.</p>
      </div>
    </Root>
  );
}
