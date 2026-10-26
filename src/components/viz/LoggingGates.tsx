import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

const GATES = [
  { name: '1 Log at all?', note: 'and for how long' },
  { name: '2 Who reads?', note: 'a small group' },
  { name: '3 Redact?', note: 'personal data' },
  { name: '4 Your key?', note: 'encrypt the logs' },
];
const GX = (i: number) => 178 + i * 124;
const GW = 112;

/**
 * Two kinds of log. The audit trail records who called what and should simply
 * be on. Content logs hold what users typed, so four decisions come first.
 */
export default function LoggingGates() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Two kinds of log</p>
        <svg viewBox="0 0 740 250" className="dx-svg" role="img" aria-label="Audit trail: who called what, always on. Content logs: four decisions before launch: whether to log and for how long, who reads, whether to redact personal data, whether to encrypt with your own key.">
          {/* audit trail */}
          <rect x="20" y="24" width="140" height="58" rx="10" className="dx-core" />
          <g className="ng-glyph">
            <Glyph name="doc" size={20} x={30} y={32} />
          </g>
          <text x="56" y="47" className="dx-name">Audit trail</text>
          <text x="30" y="70" className="dx-small">who called what</text>
          <path d="M 160 53 H 196" className="dx-link" />
          <path d="M 189 49 L 196 53 L 189 57" className="dx-link" />
          <rect x="196" y="34" width="110" height="38" rx="8" className="dx-core dx-hot" />
          <text x="251" y="58" textAnchor="middle" className="dx-name">Turn it on</text>
          <text x="324" y="50" className="dx-small">CloudTrail, Azure Monitor, Cloud Audit Logs</text>
          <text x="324" y="66" className="dx-small">records the call, not the content</text>

          <path d="M 20 108 H 720" className="dx-link" style={{ strokeDasharray: '2 5' }} />

          {/* content logs */}
          <rect x="20" y="140" width="140" height="70" rx="10" className="dx-core" />
          <g className="ng-glyph">
            <Glyph name="pen" size={20} x={30} y={148} />
          </g>
          <text x="56" y="163" className="dx-name">Content logs</text>
          <text x="30" y="184" className="dx-small">what users typed,</text>
          <text x="30" y="199" className="dx-small">and model replies</text>
          <text x="178" y="132" className="dx-small">decide before launch</text>

          {GATES.map((g, i) => (
            <motion.g key={g.name} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: 0.15 + i * 0.15, ease: EASE }}>
              <path d={`M ${GX(i) - 18 + (i ? 6 : 0)} 175 H ${GX(i)}`} className="dx-link" />
              <path d={`M ${GX(i) - 7} 171 L ${GX(i)} 175 L ${GX(i) - 7} 179`} className="dx-link" />
              <rect x={GX(i)} y="146" width={GW} height="58" rx="8" className="dx-core" />
              <text x={GX(i) + 10} y="169" className="dx-name">{g.name}</text>
              <text x={GX(i) + 10} y="190" className="dx-small">{g.note}</text>
            </motion.g>
          ))}
          <path d="M 662 175 H 690" className="dx-link" />
          <path d="M 683 171 L 690 175 L 683 179" className="dx-link" />
          <g className="dx-glyph-hot">
            <Glyph name="flag" size={26} x={692} y={162} />
          </g>
          <text x="705" y="226" textAnchor="middle" className="dx-small">launch</text>
        </svg>
        <p className="viz-cap">
          Content logs hold whatever users typed: personal data, secrets pasted by mistake, retrieved confidential documents. Fewer people should be able to read them than can call the model.
        </p>
      </div>
    </Root>
  );
}
