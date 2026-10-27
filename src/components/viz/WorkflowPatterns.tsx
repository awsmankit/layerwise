import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

/** A line with an arrowhead, pointing from (x1, y1) to (x2, y2). */
function arrow(x1: number, y1: number, x2: number, y2: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = (d: number) => `${(x2 - 5 * Math.cos(a + d)).toFixed(1)} ${(y2 - 5 * Math.sin(a + d)).toFixed(1)}`;
  return `M ${x1} ${y1} L ${x2} ${y2} M ${head(0.5)} L ${x2} ${y2} L ${head(-0.5)}`;
}

function Box({ x, y, w, h = 24, label, hot = false }: { x: number; y: number; w: number; h?: number; label: string; hot?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" className={hot ? 'dx-core dx-hot' : 'dx-core'} />
      <text x={x + w / 2} y={y + h / 2 + 3.5} textAnchor="middle" className="dx-small" style={{ fill: 'var(--ink)' }}>{label}</text>
    </g>
  );
}

const Link = ({ d, dashed = false }: { d: string; dashed?: boolean }) => <path d={d} className={dashed ? 'dx-residual' : 'dx-link'} />;

/* Each flow is drawn in a 208 by 90 area. The running example is a support email. */
const FLOWS: Record<string, () => React.ReactNode> = {
  chain: () => (
    <>
      <Link d={arrow(58, 43, 75, 43)} />
      <Link d={arrow(133, 43, 150, 43)} />
      <Box x={0} y={30} w={58} h={26} label="Extract" />
      <Box x={75} y={30} w={58} h={26} label="Classify" />
      <Box x={150} y={30} w={58} h={26} label="Reply" hot />
    </>
  ),
  route: () => (
    <>
      <Link d={arrow(46, 44, 66, 44)} />
      {[10, 38, 66].map((y) => (
        <Link key={y} d={arrow(116, 44, 140, y)} />
      ))}
      <Box x={0} y={32} w={46} label="Email" />
      <Box x={66} y={32} w={50} label="Router" hot />
      <Box x={140} y={0} w={68} h={20} label="Billing" />
      <Box x={140} y={28} w={68} h={20} label="Bug" />
      <Box x={140} y={56} w={68} h={20} label="Question" />
    </>
  ),
  parallel: () => (
    <>
      {[10, 38, 66].map((y) => (
        <g key={y}>
          <Link d={arrow(44, 44, 64, y)} />
          <Link d={arrow(126, y, 150, 44)} />
          <Box x={64} y={y - 10} w={62} h={20} label={`Run ${[10, 38, 66].indexOf(y) + 1}`} />
        </g>
      ))}
      <Box x={0} y={32} w={44} label="Input" />
      <Box x={150} y={32} w={58} label="Combine" hot />
    </>
  ),
  orchestrate: () => (
    <>
      {[29, 104, 179].map((x) => (
        <Link key={x} d={arrow(104, 24, x, 60)} />
      ))}
      <Box x={60} y={0} w={88} label="Orchestrator" hot />
      {[0, 75, 150].map((x) => (
        <Box key={x} x={x} y={62} w={58} h={22} label="Worker" />
      ))}
    </>
  ),
  evaluate: () => (
    <>
      <Link d={arrow(58, 43, 84, 43)} />
      <Link d={arrow(142, 43, 170, 43)} />
      <Box x={0} y={30} w={58} h={26} label="Generate" />
      <Box x={84} y={30} w={58} h={26} label="Evaluate" hot />
      <Box x={170} y={30} w={38} h={26} label="Done" />
      <Link d="M 113 56 V 72 H 29 V 60" dashed />
      <path d="M 25 65 L 29 59 L 33 65" className="dx-link" />
      <text x="71" y="86" textAnchor="middle" className="dx-small">feedback</text>
    </>
  ),
};

const PANELS: { id: string; title: string; glyph: GlyphName; use: [string, string] }[] = [
  { id: 'chain', title: 'Prompt chaining', glyph: 'arrow', use: ['use when steps are fixed and in', 'order; trades speed for accuracy'] },
  { id: 'route', title: 'Routing', glyph: 'route', use: ['use when inputs fall in clear', 'categories you can sort reliably'] },
  { id: 'parallel', title: 'Parallelization', glyph: 'queue', use: ['use when parts are independent,', 'or voting adds confidence'] },
  { id: 'orchestrate', title: 'Orchestrator-workers', glyph: 'network', use: ['use when subtasks can’t be known', 'up front, e.g. edits to N files'] },
  { id: 'evaluate', title: 'Evaluator-optimizer', glyph: 'check', use: ['use when criteria are clear and', 'a second pass measurably helps'] },
];

const px = (i: number) => 8 + (i % 3) * 246;
const py = (i: number) => 8 + Math.floor(i / 3) * 188;

/**
 * The five workflow patterns from Anthropic's "Building effective agents",
 * each as a small flow with one line on when to use it. In all five the code,
 * not the model, decides the shape of the flow; in an agent the model does.
 */
export default function WorkflowPatterns() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Five ways to wire model calls together</p>
        <svg viewBox="0 0 740 384" className="dx-svg" role="img" aria-label="Five small flows: prompt chaining, routing, parallelization, orchestrator-workers and evaluator-optimizer, each with when to use it">
          {PANELS.map((p, i) => (
            <motion.g key={p.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.1, ease: EASE }}>
              <rect x={px(i)} y={py(i)} width="232" height="176" rx="12" className="dx-frame" />
              <Glyph name={p.glyph} size={18} x={px(i) + 10} y={py(i) + 8} className="ng-glyph" />
              <text x={px(i) + 34} y={py(i) + 22} className="dx-name">{p.title}</text>
              <g transform={`translate(${px(i) + 12} ${py(i) + 44})`}>{FLOWS[p.id]()}</g>
              <text x={px(i) + 12} y={py(i) + 150} className="dx-small" style={{ fill: 'var(--ink)' }}>{p.use[0]}</text>
              <text x={px(i) + 12} y={py(i) + 164} className="dx-small" style={{ fill: 'var(--ink)' }}>{p.use[1]}</text>
            </motion.g>
          ))}

          {/* the sixth cell: where agents fit */}
          <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.5 }}>
            <rect x={px(5)} y={py(5)} width="232" height="176" rx="12" className="dx-frame" style={{ strokeDasharray: '5 4' }} />
            <Glyph name="flag" size={18} x={px(5) + 10} y={py(5) + 8} className="ng-glyph" />
            <text x={px(5) + 34} y={py(5) + 22} className="dx-name">Before an agent</text>
            {['Each pattern above has fixed', 'roles. In an agent the model', 'chooses the next step itself.', '', 'Start with the simplest one', 'that passes your evals.'].map((l, k) => (
              <text key={k} x={px(5) + 12} y={py(5) + 58 + k * 17} className="dx-small" style={{ fill: 'var(--ink)' }}>{l}</text>
            ))}
          </motion.g>
        </svg>
        <p className="viz-cap">
          Names as used in Anthropic’s “Building effective agents” (December 2024). The running example is a support email: extract, classify, then reply; or route it by category.
        </p>
      </div>
    </Root>
  );
}
