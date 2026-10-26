import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const LAYERS: { name: string; note: string; glyph: GlyphName }[] = [
  { name: 'Role and task', note: 'what the model does, and for whom', glyph: 'user' },
  { name: 'Context', note: 'the facts it needs: documents, user data', glyph: 'doc' },
  { name: 'Rules', note: 'missing information, never-do, tone', glyph: 'shield' },
  { name: 'Examples', note: '3 to 10 worked input and output pairs', glyph: 'layers' },
  { name: 'Output format', note: 'the exact shape of the answer', glyph: 'table' },
  { name: 'The input', note: "the user's request, kept separate", glyph: 'question' },
];

const X = 40;
const W = 520;
const H = 38;
const GAP = 8;
const y = (i: number) => 18 + i * (H + GAP) + (i === 5 ? 18 : 0);

/**
 * A prompt read top to bottom as six layers. The first five are instructions;
 * a delimiter separates them from the input, which is data, not instructions.
 */
export default function PromptLayers() {
  const instrBottom = y(4) + H;
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">The parts of a prompt, top to bottom</p>
        <svg viewBox="0 0 740 330" className="dx-svg" role="img" aria-label="Six stacked layers: role and task, context, rules, examples, output format, then the input, separated by a delimiter">
          {LAYERS.map((l, i) => (
            <motion.g key={l.name} initial={{ opacity: 0, y: -6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}>
              <rect x={X} y={y(i)} width={W} height={H} rx="6" className={i === 5 ? 'dx-core dx-hot' : 'dx-core'} />
              <g style={{ color: i === 5 ? 'var(--signal)' : 'var(--ink-3)' }}>
                <Glyph name={l.glyph} size={20} x={X + 12} y={y(i) + 9} />
              </g>
              <text x={X + 44} y={y(i) + 24} className="dx-name">{l.name}</text>
              <text x={X + 200} y={y(i) + 23} className="dx-small">{l.note}</text>
            </motion.g>
          ))}

          {/* delimiter between instructions and data */}
          <line x1={X} x2={X + W} y1={instrBottom + 13} y2={instrBottom + 13} className="dx-residual" />
          <rect x={X + W - 196} y={instrBottom + 6} width="186" height="14" style={{ fill: 'var(--surface)' }} />
          <text x={X + W - 14} y={instrBottom + 17} textAnchor="end" className="dx-small">delimiter, e.g. &lt;input&gt; tags</text>

          {/* brackets: what is instruction, what is data */}
          <path d={`M ${X + W + 10} ${y(0)} h 8 V ${instrBottom} h -8`} className="dx-link" />
          <text x={X + W + 26} y={(y(0) + instrBottom) / 2 + 4} className="dx-name">instructions</text>
          <path d={`M ${X + W + 10} ${y(5)} h 8 V ${y(5) + H} h -8`} className="dx-link" />
          <text x={X + W + 26} y={y(5) + 24} className="dx-name">data</text>
        </svg>
        <p className="viz-cap">
          Examples often fix more problems than another paragraph of instructions. The delimiter keeps text inside a document from being read as an instruction.
        </p>
      </div>
    </Root>
  );
}
