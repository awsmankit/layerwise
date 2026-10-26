import { motion } from 'motion/react';
import { Root, EASE } from './shared';

const SCOPES = [
  { x: 20, y: 20, w: 520, h: 230, name: 'Global or cross-region', note: 'AWS cross-region profiles, Azure Global, Google global endpoints', hot: false },
  { x: 50, y: 82, w: 460, h: 160, name: 'Data Zone', note: 'Azure Data Zone: processed within the zone', hot: false },
  { x: 80, y: 144, w: 400, h: 90, name: 'Regional', note: 'one region: AWS Region, Azure or Google regional', hot: true },
];

/**
 * Where a prompt may be processed, as nested scopes. The wider the scope, the
 * more capacity can serve it; the narrower, the stricter the residency.
 */
export default function ResidencyScopes() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Where your prompt may be processed</p>
        <svg viewBox="0 0 740 270" className="dx-svg" role="img" aria-label="Nested scopes: regional inside Data Zone inside global or cross-region. Wider scope gives more capacity; narrower scope gives stricter residency.">
          {SCOPES.map((s, i) => (
            <motion.g key={s.name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.15, ease: EASE }}>
              <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="12" className={s.hot ? 'dx-core dx-hot' : 'dx-core'} />
              <text x={s.x + 16} y={s.y + 26} className="dx-name">{s.name}</text>
              <text x={s.x + 16} y={s.y + 46} className="dx-small">{s.note}</text>
            </motion.g>
          ))}

          {/* the trade-off: wider scope out, stricter residency in */}
          <path d="M 572 46 V 226" className="dx-link" />
          <path d="M 568 53 L 572 46 L 576 53" className="dx-link" />
          <path d="M 568 219 L 572 226 L 576 219" className="dx-link" />
          <text x="584" y="56" className="dx-name">wider scope</text>
          <text x="584" y="74" className="dx-small">more capacity,</text>
          <text x="584" y="89" className="dx-small">fewer throttles</text>
          <text x="584" y="196" className="dx-name">narrower scope</text>
          <text x="584" y="214" className="dx-small">stricter residency</text>
        </svg>
        <p className="viz-cap">Quota and capacity are set per region, and quota in one region does not carry to another. A legal residency requirement decides the scope; without one, prefer the broader scope.</p>
      </div>
    </Root>
  );
}
