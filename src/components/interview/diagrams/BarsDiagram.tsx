import { motion } from 'motion/react';
import { Root } from '../../viz/shared';
import type { DiagramSpec } from '../../../data/interview/answers/types';
import { diagramAlt } from '../../../data/interview/answers/diagram';
import Frame from './Frame';
import { useQuiet } from './use-quiet';

type Spec = Extract<DiagramSpec, { kind: 'bars' }>;

const show = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-US') : String(Math.round(n * 100) / 100));

/** Horizontal bars that grow when they scroll into view. Every bar is on one scale, starting from zero. */
export default function BarsDiagram({ spec }: { spec: Spec }) {
  const quiet = useQuiet();
  const max = Math.max(...spec.items.map((i) => i.value)) || 1;
  return (
    <Root>
      <Frame alt={diagramAlt(spec)} caption={spec.caption}>
        <ul className="ivd-bars">
          {spec.items.map((it, i) => (
            <li key={it.label} className={it.hot ? 'is-hot' : ''}>
              <span className="ivd-bar-label">{it.label}</span>
              <span className="ivd-bar-track">
                <motion.span
                  className="ivd-bar-fill"
                  initial={{ width: quiet ? `${(it.value / max) * 100}%` : '0%' }}
                  whileInView={{ width: `${(it.value / max) * 100}%` }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.7, delay: quiet ? 0 : i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span className="ivd-bar-value">
                <b>{show(it.value)}</b> {spec.unit}
              </span>
              {it.note && <span className="ivd-bar-note">{it.note}</span>}
            </li>
          ))}
        </ul>
      </Frame>
    </Root>
  );
}
