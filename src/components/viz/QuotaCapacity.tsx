import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const STEPS: { name: string; lines: string[]; glyph: GlyphName }[] = [
  { name: 'Ask for quota', lines: ['early: requests', 'can take days'], glyph: 'doc' },
  { name: 'Check capacity', lines: ['in the portal or the', 'model capacities API'], glyph: 'search' },
  { name: 'Create deployment', lines: ['the real test: does', 'the region have PTUs?'], glyph: 'server' },
];
const X = (i: number) => 20 + i * 178;
const W = 160;

/**
 * Quota is a permission; capacity is hardware. The order that avoids paying
 * for a reservation you cannot use: quota, check, create, and only then buy.
 */
export default function QuotaCapacity() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Quota is permission, capacity is hardware</p>
        <svg viewBox="0 0 740 260" className="dx-svg" role="img" aria-label="Ask for quota early, check capacity, create the deployment. If it succeeds, buy a reservation for the discount. If the region lacks capacity, the deployment fails.">
          {STEPS.map((s, i) => (
            <motion.g key={s.name} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.15, ease: EASE }}>
              <rect x={X(i)} y="30" width={W} height="96" rx="10" className={i === 2 ? 'dx-core dx-hot' : 'dx-core'} />
              <g style={{ color: i === 2 ? 'var(--signal)' : 'var(--ink-3)' }}>
                <Glyph name={s.glyph} size={20} x={X(i) + 12} y={42} />
              </g>
              <text x={X(i) + 12} y="84" className="dx-name" style={{ fontSize: 12.5 }}>{`${i + 1}. ${s.name}`}</text>
              <text x={X(i) + 12} y="102" className="dx-small">{s.lines[0]}</text>
              <text x={X(i) + 12} y="116" className="dx-small">{s.lines[1]}</text>
              {i < 2 && (
                <>
                  <path d={`M ${X(i) + W} 78 H ${X(i + 1) - 2}`} className="dx-link" />
                  <path d={`M ${X(i + 1) - 7} 73 L ${X(i + 1) - 2} 78 L ${X(i + 1) - 7} 83`} className="dx-link" />
                </>
              )}
            </motion.g>
          ))}

          {/* the outcome of step 3 */}
          <path d={`M ${X(2) + W} 60 H 575 V 46 H 578`} className="dx-link" />
          <path d="M 573 41 L 578 46 L 573 51" className="dx-link" />
          <text x={X(2) + W + 4} y="54" className="dx-small">works</text>
          <rect x="580" y="16" width="150" height="70" rx="10" className="dx-core" style={{ stroke: 'var(--ok)', strokeWidth: 1.5 }} />
          <text x="592" y="38" className="dx-name" style={{ fontSize: 12.5 }}>4. Buy reservation</text>
          <text x="592" y="58" className="dx-small">a discount only, not</text>
          <text x="592" y="72" className="dx-small">a capacity guarantee</text>

          <path d={`M ${X(2) + W} 100 H 575 V 128 H 578`} className="dx-link" />
          <path d="M 573 123 L 578 128 L 573 133" className="dx-link" />
          <text x={X(2) + W + 4} y="94" className="dx-small">fails</text>
          <rect x="580" y="98" width="150" height="62" rx="10" className="dx-core" style={{ stroke: 'var(--warn)', strokeWidth: 1.5, strokeDasharray: '5 4' }} />
          <text x="592" y="120" className="dx-name" style={{ fontSize: 12.5, fill: 'var(--warn)' }}>Deployment fails</text>
          <text x="592" y="140" className="dx-small">region short of PTUs,</text>
          <text x="592" y="153" className="dx-small">even with quota</text>

          {/* do not give capacity back */}
          <rect x="20" y="170" width="710" height="70" rx="10" className="dx-frame" style={{ strokeDasharray: '4 4' }} />
          <g style={{ color: 'var(--cost)' }}>
            <Glyph name="loop" size={20} x={34} y={184} />
          </g>
          <text x="64" y="199" className="dx-name" style={{ fontSize: 12.5 }}>Do not scale provisioned deployments up and down with traffic</text>
          <text x="64" y="218" className="dx-small">Capacity changes through the day. Delete or shrink a deployment</text>
          <text x="64" y="232" className="dx-small">and there is no promise you get the same capacity back.</text>
        </svg>
        <p className="viz-cap">A reservation discounts a deployment that already exists. It never creates capacity, so buy it last.</p>
      </div>
    </Root>
  );
}
