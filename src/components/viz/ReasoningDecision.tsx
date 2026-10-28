import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

/** A line with an arrowhead, pointing from (x1, y1) to (x2, y2). */
function arrow(x1: number, y1: number, x2: number, y2: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = (d: number) => `${(x2 - 6 * Math.cos(a + d)).toFixed(1)} ${(y2 - 6 * Math.sin(a + d)).toFixed(1)}`;
  return `M ${x1} ${y1} L ${x2} ${y2} M ${head(0.5)} L ${x2} ${y2} L ${head(-0.5)}`;
}

type NodeProps = { x: number; y: number; w: number; h: number; glyph: GlyphName; lines: [string, string]; hot?: boolean; delay?: number };

function Node({ x, y, w, h, glyph, lines, hot = false, delay = 0 }: NodeProps) {
  return (
    <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay, ease: EASE }}>
      <rect x={x} y={y} width={w} height={h} rx="10" className={hot ? 'dx-core dx-hot' : 'dx-core'} />
      <Glyph name={glyph} size={18} x={x + 10} y={y + 10} className={hot ? 'dx-glyph-hot' : 'ng-glyph'} />
      <text x={x + 36} y={y + 24} className="dx-small" style={{ fill: 'var(--ink)' }}>{lines[0]}</text>
      <text x={x + 36} y={y + 40} className="dx-small" style={{ fill: 'var(--ink)' }}>{lines[1]}</text>
    </motion.g>
  );
}

/**
 * Three questions to ask before paying for thinking, in the order that rules most
 * requests out first. The advice for each answer follows the providers' own guidance:
 * low or no thinking for lookups and classification, more for multi-step planning,
 * coding and maths, and measure either way.
 */
export default function ReasoningDecision() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Do you need a reasoning model?</p>
        <svg viewBox="0 0 740 290" className="dx-svg" role="img" aria-label="Three questions. A lookup, extraction or classification needs no or low thinking. Without several dependent steps, a plain call is enough. With them, start at low effort if time or cost is tight, otherwise try high effort. Always measure on your eval set.">
          {/* question 1 */}
          <Node x={20} y={30} w={210} h={56} glyph="question" lines={['Is it a lookup, extraction', 'or classification?']} />
          <path d={arrow(125, 86, 125, 140)} className="dx-link" />
          <text x={133} y={118} className="dx-small">yes</text>
          <Node x={20} y={142} w={210} h={56} glyph="bolt" lines={['No thinking or low effort:', 'fast and cheap']} hot />

          {/* question 2 */}
          <path d={arrow(230, 58, 268, 58)} className="dx-link" />
          <text x={236} y={50} className="dx-small">no</text>
          <Node x={270} y={30} w={210} h={56} glyph="route" lines={['Does it need several', 'dependent steps?']} delay={0.1} />
          <path d={arrow(375, 86, 375, 140)} className="dx-link" />
          <text x={383} y={118} className="dx-small">no</text>
          <Node x={270} y={142} w={200} h={56} glyph="check" lines={['A plain call is enough;', 'add thinking if evals ask']} delay={0.1} />

          {/* question 3 */}
          <path d={arrow(480, 58, 518, 58)} className="dx-link" />
          <text x={486} y={50} className="dx-small">yes</text>
          <Node x={520} y={30} w={200} h={56} glyph="clock" lines={['Is time or cost', 'tight?']} delay={0.2} />
          <path d={arrow(580, 86, 560, 140)} className="dx-link" />
          <text x={545} y={118} textAnchor="end" className="dx-small">yes</text>
          <path d={arrow(660, 86, 683, 140)} className="dx-link" />
          <text x={680} y={118} className="dx-small">no</text>
          <Node x={482} y={142} w={146} h={56} glyph="chart" lines={['Start low, raise', 'if evals fail']} delay={0.2} />
          <Node x={636} y={142} w={94} h={56} glyph="eye" lines={['Try high', 'effort']} hot delay={0.25} />

          <rect x={20} y={226} width={700} height={42} rx="10" className="dx-frame" style={{ strokeDasharray: '5 4' }} />
          <Glyph name="loop" size={18} x={32} y={238} className="ng-glyph" />
          <text x={62} y={252} className="dx-small" style={{ fill: 'var(--ink)' }}>Either way: run your eval set at two effort levels, and keep the lowest one that passes.</text>
        </svg>
        <p className="viz-cap">
          Providers describe it the same way: little or no thinking for fact retrieval and classification, more for multi-step planning, coding and maths. The cheapest setting that still passes your evals wins.
        </p>
      </div>
    </Root>
  );
}
