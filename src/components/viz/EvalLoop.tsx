import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const STEPS: { name: string; lines: string[]; glyph: GlyphName }[] = [
  { name: '1 Collect inputs', lines: ['30 to 50 real requests,', 'including the awkward ones'], glyph: 'doc' },
  { name: '2 Define good', lines: ['reference answer, facts', 'that must appear, or a rule'], glyph: 'target' },
  { name: '3 Choose scoring', lines: ['how each case is', 'scored (see below)'], glyph: 'check' },
  { name: '4 Run and read', lines: ['save results and prompt', 'version; read failures'], glyph: 'chart' },
];

const POS = [
  { x: 30, y: 24 },
  { x: 270, y: 24 },
  { x: 270, y: 150 },
  { x: 30, y: 150 },
];
const W = 210;
const H = 96;

/**
 * The first eval set as a loop: four steps you can do in an afternoon, and
 * a path that turns every production bug into a new test case.
 */
export default function EvalLoop() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Build the first set, then keep it growing</p>
        <svg viewBox="0 0 740 276" className="dx-svg" role="img" aria-label="Four steps in a loop: collect inputs, define good, choose scoring, run and read; production bugs feed back as new test cases">
          {/* loop arrows between the four steps */}
          <path d="M 240 72 H 262 M 256 66 L 262 72 L 256 78" className="dx-link" />
          <path d="M 375 120 V 142 M 369 136 L 375 142 L 381 136" className="dx-link" />
          <path d="M 270 198 H 248 M 254 192 L 248 198 L 254 204" className="dx-link" />
          <path d="M 135 150 V 128 M 129 134 L 135 128 L 141 134" className="dx-link" />

          {STEPS.map((s, i) => (
            <motion.g key={s.name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.12, ease: EASE }}>
              <rect x={POS[i].x} y={POS[i].y} width={W} height={H} rx="10" className="dx-core" />
              <g style={{ color: 'var(--ink-3)' }}>
                <Glyph name={s.glyph} size={20} x={POS[i].x + 12} y={POS[i].y + 12} />
              </g>
              <text x={POS[i].x + 40} y={POS[i].y + 27} className="dx-name">{s.name}</text>
              {s.lines.map((l, k) => (
                <text key={l} x={POS[i].x + 14} y={POS[i].y + 56 + k * 17} className="dx-small">{l}</text>
              ))}
            </motion.g>
          ))}

          {/* production, and the path back into the set */}
          <path d="M 140 246 V 260 H 630 V 250" className="dx-link" />
          <path d="M 624 256 L 630 250 L 636 256" className="dx-link" />
          <text x="300" y="256" className="dx-small" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>ship once the set passes</text>
          <rect x="540" y="150" width="180" height="96" rx="10" className="dx-core dx-hot" />
          <g style={{ color: 'var(--signal)' }}>
            <Glyph name="server" size={20} x={552} y={162} />
          </g>
          <text x="580" y="177" className="dx-name">Production</text>
          <text x="554" y="206" className="dx-small">a bug reported here</text>
          <text x="554" y="223" className="dx-small">becomes a new test</text>
          <path d="M 630 150 V 10 H 135 V 24" className="dx-residual" />
          <text x="640" y="80" className="dx-small">new case,</text>
          <text x="640" y="95" className="dx-small">back to set</text>
        </svg>
        <p className="viz-cap">Include ambiguous, long, off-topic and adversarial inputs. Read the failures by hand: the score tells you that something broke, the transcripts tell you what.</p>
      </div>
    </Root>
  );
}
