import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const STEPS: { name: string; lines: [string, string]; glyph: GlyphName; x: number; w: number; hot?: boolean }[] = [
  { name: '1 Edit', lines: ['change ONE thing:', 'a rule or example'], glyph: 'pen', x: 20, w: 150 },
  { name: '2 Run', lines: ['same cases, every', 'time; save scores'], glyph: 'chart', x: 200, w: 150 },
  { name: '3 Compare', lines: ['against the best', 'version so far'], glyph: 'check', x: 380, w: 150 },
  { name: '4 Keep?', lines: ['keep if higher,', 'else revert'], glyph: 'thumb', x: 560, w: 160, hot: true },
];

const Head = ({ x, y, dir }: { x: number; y: number; dir: 'right' | 'up' | 'down' }) => {
  const d = dir === 'right' ? `M ${x - 6} ${y - 5} L ${x} ${y} L ${x - 6} ${y + 5}` : dir === 'up' ? `M ${x - 5} ${y + 6} L ${x} ${y} L ${x + 5} ${y + 6}` : `M ${x - 5} ${y - 6} L ${x} ${y} L ${x + 5} ${y - 6}`;
  return <path d={d} className="dx-link" />;
};

/**
 * Improving a prompt as a loop you can trust: one change at a time, scored on
 * the same cases, kept only if it helps. A separate held-out set is checked
 * once at the end, because a prompt tuned on a few cases can memorise them.
 */
export default function PromptLoop() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Improve a prompt without fooling yourself</p>
        <svg viewBox="0 0 740 300" className="dx-svg" role="img" aria-label="Edit one thing, run the eval set, compare, keep or revert, then repeat. When scores stop rising, check once on a held-out set before shipping.">
          {/* the loop */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path d={`M ${STEPS[i].x + STEPS[i].w} 80 H ${STEPS[i + 1].x - 2}`} className="dx-link" />
              <Head x={STEPS[i + 1].x - 2} y={80} dir="right" />
            </g>
          ))}
          <motion.path d="M 640 122 V 156 H 95 V 124" className="dx-residual" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: EASE }} />
          <Head x={95} y={122} dir="up" />
          <text x="102" y="174" className="dx-small">next round starts from the best version</text>

          {STEPS.map((s, i) => (
            <motion.g key={s.name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1, ease: EASE }}>
              <rect x={s.x} y="40" width={s.w} height="80" rx="10" className={s.hot ? 'dx-core dx-hot' : 'dx-core'} />
              <Glyph name={s.glyph} size={20} x={s.x + 12} y={50} className={s.hot ? 'dx-glyph-hot' : 'ng-glyph'} />
              <text x={s.x + 40} y="65" className="dx-name">{s.name}</text>
              <text x={s.x + 14} y="90" className="dx-small" style={{ fill: 'var(--ink)' }}>{s.lines[0]}</text>
              <text x={s.x + 14} y="106" className="dx-small" style={{ fill: 'var(--ink)' }}>{s.lines[1]}</text>
            </motion.g>
          ))}

          {/* held-out check, once, at the end */}
          <path d="M 465 156 V 202" className="dx-link" />
          <Head x={465} y={202} dir="down" />
          <text x="455" y="192" textAnchor="end" className="dx-small">when scores stop rising</text>

          <rect x="380" y="204" width="170" height="80" rx="10" className="dx-core dx-hot" />
          <Glyph name="shield" size={20} x={392} y={214} className="dx-glyph-hot" />
          <text x="420" y="229" className="dx-name">Held-out set</text>
          <text x="394" y="254" className="dx-small" style={{ fill: 'var(--ink)' }}>cases never used to</text>
          <text x="394" y="270" className="dx-small" style={{ fill: 'var(--ink)' }}>tune; checked once</text>

          <path d="M 550 244 H 588" className="dx-link" />
          <Head x={588} y={244} dir="right" />
          <rect x="590" y="204" width="130" height="80" rx="10" className="dx-core" />
          <Glyph name="flag" size={20} x={602} y={214} className="ng-glyph" />
          <text x="630" y="229" className="dx-name">Ship</text>
          <text x="604" y="254" className="dx-small" style={{ fill: 'var(--ink)' }}>if it holds up</text>

          <rect x="20" y="204" width="340" height="80" rx="10" className="dx-frame" style={{ strokeDasharray: '5 4' }} />
          <text x="34" y="228" className="dx-small" style={{ fill: 'var(--ink)' }}>A prompt tuned on a handful of cases can</text>
          <text x="34" y="244" className="dx-small" style={{ fill: 'var(--ink)' }}>memorise them. If the held-out score is</text>
          <text x="34" y="260" className="dx-small" style={{ fill: 'var(--ink)' }}>worse, it overfit: revert and widen the set.</text>
        </svg>
        <p className="viz-cap">
          Changing two things at once hides which one helped. Keep every prompt version and its scores, so a regression can be traced to the edit that caused it.
        </p>
      </div>
    </Root>
  );
}
