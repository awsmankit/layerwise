import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const PARTS: { name: string; sub: string; x: number; glyph: GlyphName }[] = [
  { name: 'Model', sub: 'proposes calls', x: 80, glyph: 'box' },
  { name: 'Host', sub: 'and its client', x: 270, glyph: 'network' },
  { name: 'You', sub: 'can say no', x: 440, glyph: 'user' },
  { name: 'Server', sub: 'runs the tool', x: 640, glyph: 'server' },
];

/** A halo so a label stays readable where a dashed lifeline passes behind it. */
const HALO = { paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 } as const;

const head = (x: number, y: number, dir: 1 | -1) => `M ${x - 6 * dir} ${y - 5} L ${x} ${y} L ${x - 6 * dir} ${y + 5}`;

/**
 * One tool call from start to finish, as a sequence. The model only proposes;
 * the host asks the person; the client sends; the server runs the tool; the
 * result comes back as data for the model to read, not as orders.
 */
export default function McpToolCall() {
  const step = (i: number) => ({
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.4, delay: i * 0.3, ease: EASE },
  });

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">One tool call, step by step</p>
        <svg viewBox="0 0 740 312" className="dx-svg" role="img" aria-label="The model proposes a call, the host asks you to allow it, the client sends tools/call to the server, the server runs the tool, and the result goes back through the host to the model as data.">
          {PARTS.map((p) => (
            <g key={p.name}>
              <rect x={p.x - 65} y="12" width="130" height="40" rx="9" className="dx-core" />
              <Glyph name={p.glyph} size={18} x={p.x - 57} y={23} className="ng-glyph" />
              <text x={p.x - 33} y="29" className="dx-name">{p.name}</text>
              <text x={p.x - 33} y="44" className="dx-small">{p.sub}</text>
              <path d={`M ${p.x} 56 V 300`} className="dx-link" style={{ strokeDasharray: '3 4', strokeOpacity: 0.35 }} />
            </g>
          ))}

          <motion.g {...step(0)}>
            <path d={`M 80 88 H 264 ${head(270, 88, 1)}`} className="dx-link" />
            <text x="175" y="80" textAnchor="middle" className="dx-small" style={HALO}>1  propose a call</text>
          </motion.g>

          <motion.g {...step(1)}>
            <path d={`M 270 128 H 434 ${head(440, 128, 1)}`} className="dx-link" />
            <text x="355" y="120" textAnchor="middle" className="dx-small" style={HALO}>2  ask: allow this call?</text>
            <path d={`M 440 152 H 276 ${head(270, 152, -1)}`} className="dx-residual" />
            <text x="355" y="144" textAnchor="middle" className="dx-small" style={HALO}>yes, or you can refuse</text>
          </motion.g>

          <motion.g {...step(2)}>
            <path d={`M 270 196 H 634 ${head(640, 196, 1)}`} className="dx-link" />
            <text x="455" y="188" textAnchor="middle" className="dx-small" style={HALO}>3  client sends tools/call</text>
          </motion.g>

          <motion.g {...step(3)}>
            <rect x="600" y="210" width="80" height="28" rx="7" className="dx-core dx-hot" />
            <text x="640" y="228" textAnchor="middle" className="dx-name" style={{ fontSize: 12.5 }}>4  runs it</text>
          </motion.g>

          <motion.g {...step(4)}>
            <path d={`M 640 262 H 276 ${head(270, 262, -1)}`} className="dx-residual" />
            <text x="458" y="254" textAnchor="middle" className="dx-small" style={HALO}>5  result</text>
          </motion.g>

          <motion.g {...step(5)}>
            <path d={`M 270 292 H 86 ${head(80, 292, -1)}`} className="dx-residual" />
            <text x="175" y="284" textAnchor="middle" className="dx-small" style={HALO}>6  result, as data</text>
          </motion.g>
        </svg>
        <p className="viz-cap">
          The spec says there should always be a human in the loop who can deny a call, and that clients should show the inputs first and validate the result before it reaches the model. Treat the result as data, not as instructions.
        </p>
      </div>
    </Root>
  );
}
