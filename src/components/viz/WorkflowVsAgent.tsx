import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

const FLOW = [
  { name: 'Classify the ticket', model: true },
  { name: 'get_order_status', model: false },
  { name: 'Draft the reply', model: true },
  { name: 'Send it', model: false },
];

const TOOLS = [
  { name: 'get_order_status', x: 396, y: 62, note: '' },
  { name: 'search the docs', x: 566, y: 62, note: '' },
  { name: 'issue a refund', x: 396, y: 214, note: 'needs a person' },
  { name: 'answer the user', x: 566, y: 214, note: '' },
];
const CX = 550;
const CY = 150;

/**
 * The same customer question handled two ways. A workflow runs steps you
 * designed; an agent lets the model pick the next tool on every turn.
 */
export default function WorkflowVsAgent() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">“Where is my order?”, handled two ways</p>
        <svg viewBox="0 0 740 290" className="dx-svg" role="img" aria-label="Left: a workflow with four fixed steps, two of them model calls. Right: an agent where the model chooses among tools each turn, within step limits.">
          {/* workflow */}
          <rect x="20" y="20" width="340" height="250" rx="12" className="dx-frame" />
          <text x="36" y="44" className="dx-name">Workflow</text>
          <text x="36" y="62" className="dx-small">you fix the steps</text>
          {FLOW.map((s, i) => {
            const y = 78 + i * 44;
            return (
              <motion.g key={s.name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.1, ease: EASE }}>
                {i > 0 && (
                  <>
                    <path d={`M 160 ${y - 12} V ${y - 1}`} className="dx-link" />
                    <path d={`M 156 ${y - 7} L 160 ${y - 1} L 164 ${y - 7}`} className="dx-link" />
                  </>
                )}
                <rect x="60" y={y} width="200" height="32" rx="8" className={s.model ? 'dx-core dx-hot' : 'dx-core'} />
                <text x="160" y={y + 21} textAnchor="middle" className="dx-name">{s.name}</text>
              </motion.g>
            );
          })}
          <rect x="60" y="250" width="12" height="10" rx="2" className="dx-core dx-hot" />
          <text x="78" y="259" className="dx-small">model call inside a step</text>

          {/* agent */}
          <rect x="380" y="20" width="340" height="250" rx="12" className="dx-frame" />
          <text x="396" y="44" className="dx-name">Agent</text>
          <text x="470" y="44" className="dx-small">the model picks the next step</text>
          {TOOLS.map((t) => (
            <path key={`l${t.name}`} d={`M ${CX} ${CY} L ${t.x + 70} ${t.y + 16}`} className="dx-residual" />
          ))}
          {TOOLS.map((t, i) => (
            <motion.g key={t.name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: 0.3 + i * 0.1, ease: EASE }}>
              <rect x={t.x} y={t.y} width="140" height="32" rx="8" className="dx-core" />
              <text x={t.x + 70} y={t.y + 21} textAnchor="middle" className="dx-name" style={{ fontSize: 12.5 }}>{t.name}</text>
              {t.note && <text x={t.x + 70} y={t.y + 48} textAnchor="middle" className="dx-small">{t.note}</text>}
            </motion.g>
          ))}
          <rect x={CX - 70} y={CY - 22} width="140" height="44" rx="10" className="dx-core dx-hot" />
          <g className="dx-glyph-hot">
            <Glyph name="loop" size={20} x={CX - 60} y={CY - 10} />
          </g>
          <text x={CX + 10} y={CY + 5} textAnchor="middle" className="dx-name">Model decides</text>
          <text x={CX} y={CY + 40} textAnchor="middle" className="dx-small">cap steps, tokens and time</text>
        </svg>
        <p className="viz-cap">
          Workflows are more predictable, cheaper and easier to test. Reach for an agent when the path genuinely cannot be known in advance, and keep the loop as small as the task allows.
        </p>
      </div>
    </Root>
  );
}
