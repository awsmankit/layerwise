import { motion } from 'motion/react';
import { Root, useNarrow } from '../../viz/shared';
import type { DiagramSpec } from '../../../data/interview/answers/types';
import { diagramAlt } from '../../../data/interview/answers/diagram';
import Frame from './Frame';
import { reveal, useQuiet } from './use-quiet';

type Spec = Extract<DiagramSpec, { kind: 'compare' }>;

/** Options against criteria. A table on wide screens; on a phone every row becomes a small card. */
export default function CompareDiagram({ spec }: { spec: Spec }) {
  const narrow = useNarrow();
  const quiet = useQuiet();
  return (
    <Root>
      <Frame alt={diagramAlt(spec)} caption={spec.caption}>
        {narrow ? (
          <ul className="ivd-cards">
            {spec.rows.map((r, i) => (
              <motion.li key={r.label} className="ivd-card" {...reveal(i, quiet)}>
                <b className="ivd-card-head">{r.label}</b>
                <dl>
                  {spec.columns.map((c, k) => (
                    <div key={c}>
                      <dt>{c}</dt>
                      <dd>{r.cells[k]}</dd>
                    </div>
                  ))}
                </dl>
              </motion.li>
            ))}
          </ul>
        ) : (
          <table className="ivd-table">
            <thead>
              <tr>
                <td />
                {spec.columns.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.rows.map((r, i) => (
                <motion.tr key={r.label} {...reveal(i, quiet)}>
                  <th scope="row">{r.label}</th>
                  {r.cells.map((c, k) => (
                    <td key={k}>{c}</td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </Frame>
    </Root>
  );
}
