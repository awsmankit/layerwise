import { motion } from 'motion/react';
import { Root } from '../../viz/shared';
import type { DiagramSpec } from '../../../data/interview/answers/types';
import { diagramAlt } from '../../../data/interview/answers/diagram';
import Frame from './Frame';
import { reveal, useQuiet } from './use-quiet';

type Spec = Extract<DiagramSpec, { kind: 'layers' }>;

/** A stack of boxes, top layer first, each resting on the next. */
export default function LayersDiagram({ spec }: { spec: Spec }) {
  const quiet = useQuiet();
  return (
    <Root>
      <Frame alt={diagramAlt(spec)} caption={spec.caption}>
        <ol className="ivd-layers">
          {spec.layers.map((l, i) => (
            <motion.li key={l.label} className="ivd-layer" {...reveal(i, quiet)}>
              <b>{l.label}</b>
              {l.sub && <span>{l.sub}</span>}
            </motion.li>
          ))}
        </ol>
      </Frame>
    </Root>
  );
}
