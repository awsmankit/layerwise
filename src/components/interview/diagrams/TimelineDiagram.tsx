import { motion } from 'motion/react';
import { Root } from '../../viz/shared';
import type { DiagramSpec } from '../../../data/interview/answers/types';
import { diagramAlt } from '../../../data/interview/answers/diagram';
import Frame from './Frame';
import { reveal, useQuiet } from './use-quiet';

type Spec = Extract<DiagramSpec, { kind: 'timeline' }>;

/** Things in the order they happen, down a hairline with a dot for each. */
export default function TimelineDiagram({ spec }: { spec: Spec }) {
  const quiet = useQuiet();
  return (
    <Root>
      <Frame alt={diagramAlt(spec)} caption={spec.caption}>
        <ol className="ivd-timeline">
          {spec.steps.map((s, i) => (
            <motion.li key={s.label} {...reveal(i, quiet)}>
              <span className="ivd-dot" aria-hidden="true" />
              <b>{s.label}</b>
              <span>{s.detail}</span>
            </motion.li>
          ))}
        </ol>
      </Frame>
    </Root>
  );
}
