import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const STEPS: { name: string; lines: [string, string]; glyph: GlyphName; hot?: boolean }[] = [
  { name: 'Task', lines: ['a goal and what', 'counts as done'], glyph: 'doc' },
  { name: 'Fresh setup', lines: ['clean state for', 'every trial'], glyph: 'server' },
  { name: 'Agent run', lines: ['tools and steps,', 'kept as a log'], glyph: 'wrench' },
  { name: 'Graders', lines: ['code, model or', 'a person'], glyph: 'check', hot: true },
  { name: 'Score', lines: ['per task, across', 'several trials'], glyph: 'chart' },
];

const W = 120;
const STEP = 148;
const X = (i: number) => 20 + i * STEP;

/** A short arrow head. */
const Head = ({ x, y, dir }: { x: number; y: number; dir: 'right' | 'up' | 'down' }) => {
  const d = dir === 'right' ? `M ${x - 6} ${y - 5} L ${x} ${y} L ${x - 6} ${y + 5}` : dir === 'up' ? `M ${x - 5} ${y + 6} L ${x} ${y} L ${x + 5} ${y + 6}` : `M ${x - 5} ${y - 6} L ${x} ${y} L ${x + 5} ${y - 6}`;
  return <path d={d} className="dx-link" />;
};

/**
 * How one agent task is evaluated: a clean environment for each trial, the agent runs
 * and leaves a transcript, graders score what it produced, and scores are read across
 * several trials. People read the transcripts to check the grades are fair, and failures
 * from real use turn into new tasks.
 */
export default function AgentEvalLoop() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">How one agent task is evaluated</p>
        <svg viewBox="0 0 740 300" className="dx-svg" role="img" aria-label="A task runs in a fresh environment. The agent's run is recorded as a transcript. Graders score the outcome. Scores are read across several trials. People read transcripts to check the grades are fair, and failures from real use become new tasks.">
          {STEPS.slice(1).map((_, i) => (
            <g key={i}>
              <path d={`M ${X(i) + W} 72 H ${X(i + 1) - 2}`} className="dx-link" />
              <Head x={X(i + 1) - 2} y={72} dir="right" />
            </g>
          ))}

          {STEPS.map((s, i) => (
            <motion.g key={s.name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1, ease: EASE }}>
              <rect x={X(i)} y="30" width={W} height="84" rx="10" className={s.hot ? 'dx-core dx-hot' : 'dx-core'} />
              <Glyph name={s.glyph} size={20} x={X(i) + 10} y={40} className={s.hot ? 'dx-glyph-hot' : 'ng-glyph'} />
              <text x={X(i) + 36} y="55" className="dx-name" style={{ fontSize: 13 }}>{s.name}</text>
              <text x={X(i) + 12} y="84" className="dx-small" style={{ fill: 'var(--ink)' }}>{s.lines[0]}</text>
              <text x={X(i) + 12} y="100" className="dx-small" style={{ fill: 'var(--ink)' }}>{s.lines[1]}</text>
            </motion.g>
          ))}

          {/* the transcript is read by people */}
          <path d={`M ${X(2) + W / 2} 114 V 168`} className="dx-link" />
          <Head x={X(2) + W / 2} y={168} dir="down" />
          <text x={X(2) + W / 2 + 8} y="146" className="dx-small">transcript</text>
          <rect x={X(2) - 20} y="170" width={W + 40} height="62" rx="10" className="dx-core" />
          <Glyph name="eye" size={20} x={X(2) - 10} y={176} className="ng-glyph" />
          <text x={X(2) + 16} y="190" className="dx-name" style={{ fontSize: 13 }}>Read the logs</text>
          <text x={X(2) - 8} y="208" className="dx-small" style={{ fill: 'var(--ink)' }}>are the grades fair?</text>
          <text x={X(2) - 8} y="222" className="dx-small" style={{ fill: 'var(--ink)' }}>is a task broken?</text>

          {/* what is graded: the end state, not the route */}
          <rect x={X(3) - 4} y="170" width={W + 8} height="62" rx="10" className="dx-frame" style={{ strokeDasharray: '5 4' }} />
          <text x={X(3) + 4} y="192" className="dx-small" style={{ fill: 'var(--ink)' }}>grade the end state,</text>
          <text x={X(3) + 4} y="208" className="dx-small" style={{ fill: 'var(--ink)' }}>not the exact route</text>

          {/* failures from real use come back as new tasks */}
          <motion.path d={`M ${X(4) + W / 2} 114 V 262 H ${X(0) + W / 2} V 120`} className="dx-residual" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
          <Head x={X(0) + W / 2} y={116} dir="up" />
          <text x={X(2) + W / 2} y="280" textAnchor="middle" className="dx-small">failures from real use become new tasks</text>
        </svg>
        <p className="viz-cap">
          Evaluating an agent means evaluating the harness and the model together. Run each trial from a clean state, grade what the agent produced, and read the transcripts of many trials before you trust a score.
        </p>
      </div>
    </Root>
  );
}
