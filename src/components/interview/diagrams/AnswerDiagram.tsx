import type { DiagramSpec } from '../../../data/interview/answers/types';
import FlowDiagram from './FlowDiagram';
import CompareDiagram from './CompareDiagram';
import BarsDiagram from './BarsDiagram';
import LayersDiagram from './LayersDiagram';
import TimelineDiagram from './TimelineDiagram';
import CurveDiagram from './CurveDiagram';

/**
 * Draws one answer diagram from its spec. An embedded experiment is not handled here: the page
 * mounts the experiment host directly, because it is a different kind of island.
 */
export default function AnswerDiagram({ spec }: { spec: Exclude<DiagramSpec, { kind: 'experiment' }> }) {
  switch (spec.kind) {
    case 'flow':
      return <FlowDiagram spec={spec} />;
    case 'compare':
      return <CompareDiagram spec={spec} />;
    case 'bars':
      return <BarsDiagram spec={spec} />;
    case 'layers':
      return <LayersDiagram spec={spec} />;
    case 'timeline':
      return <TimelineDiagram spec={spec} />;
    case 'curve':
      return <CurveDiagram spec={spec} />;
  }
}
