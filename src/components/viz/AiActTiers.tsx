import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

/*
 * The four tiers as the European Commission describes them on its AI Act page
 * (digital-strategy.ec.europa.eu), with the examples it gives. Dates are the ones on the
 * Commission's AI Act Service Desk timeline, as of October 2026.
 */
const TIERS: { name: string; rule: string; example: string; when: string; glyph: GlyphName; w: number; hot?: boolean }[] = [
  { name: 'Prohibited', rule: 'Banned outright', example: 'e.g. social scoring; untargeted scraping of faces', when: 'bans since 2 Feb 2025', glyph: 'lock', w: 560, hot: true },
  { name: 'High-risk', rule: 'Strict duties before launch', example: 'e.g. employment, education, law enforcement', when: 'from 2 Dec 2027 (Annex III)', glyph: 'shield', w: 610 },
  { name: 'Transparency', rule: 'People must be told', example: 'e.g. a chatbot, a deepfake', when: 'from 2 Aug 2026', glyph: 'question', w: 660 },
  { name: 'Minimal', rule: 'No specific rules', example: 'e.g. spam filters, AI in video games', when: 'no date', glyph: 'check', w: 710 },
];

const H = 62;
const GAP = 12;

/** Four stacked boxes, narrowest at the top: the stricter the rule, the fewer the systems it covers. */
export default function AiActTiers() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Four tiers of risk in the EU AI Act</p>
        <svg viewBox="0 0 740 300" className="dx-svg" role="img" aria-label="Four stacked tiers: prohibited, high-risk, transparency and minimal, each with an example and the date its rules apply">
          {TIERS.map((t, i) => {
            const x = (740 - t.w) / 2;
            const y = 10 + i * (H + GAP);
            return (
              <motion.g key={t.name} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1, ease: EASE }}>
                <rect x={x} y={y} width={t.w} height={H} rx="12" className={t.hot ? 'dx-core' : 'dx-core dx-hot'} style={t.hot ? { stroke: 'var(--warn)', strokeWidth: 1.5 } : undefined} />
                <g style={{ color: t.hot ? 'var(--warn)' : 'var(--signal)' }}>
                  <Glyph name={t.glyph} size={26} x={x + 14} y={y + 18} />
                </g>
                <text x={x + 54} y={y + 25} className="dx-name">{t.name}</text>
                <text x={x + 54} y={y + 44} className="dx-small">{t.rule}</text>
                <text x={x + t.w - 14} y={y + 25} textAnchor="end" className="dx-small" style={{ fill: 'var(--ink)' }}>{t.when}</text>
                <text x={x + t.w - 14} y={y + 44} textAnchor="end" className="dx-small">{t.example}</text>
              </motion.g>
            );
          })}
        </svg>
        <p className="viz-cap">The examples are the Commission's. Which tier a system falls in depends on what it is used for, not on the model underneath it.</p>
      </div>
    </Root>
  );
}
