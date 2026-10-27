import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const CARDS: { x: number; name: string; glyph: GlyphName; lines: string[]; hot?: boolean }[] = [
  { x: 20, name: 'Plain code', glyph: 'pen', lines: ['a few model calls in a row', 'or one tool-calling loop', 'you want no extra layer'] },
  { x: 260, name: 'LangChain agent', glyph: 'layers', lines: ['the standard tool loop', 'many model providers', 'middleware: approval, PII'] },
  { x: 500, name: 'LangGraph', glyph: 'route', lines: ['explicit steps and branches', 'pause, resume, long runs', 'state you can inspect'], hot: true },
];

/**
 * Three levels of structure, from least to most. Each step up gives you more
 * control and more to learn, so start with the lowest one that does the job.
 * LangChain's agents run on LangGraph, so moving up later is not a rewrite.
 */
export default function FrameworkChoice() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">How much framework do you need?</p>
        <svg viewBox="0 0 740 250" className="dx-svg" role="img" aria-label="Three options from least to most structure: plain code, a LangChain agent, and LangGraph. LangChain agents are built on LangGraph.">
          {/* LangChain agents sit on LangGraph */}
          <path d="M 370 44 V 28 H 610 V 44" className="dx-residual" />
          <text x="490" y="20" textAnchor="middle" className="dx-small">built on</text>

          {CARDS.map((c, i) => (
            <motion.g key={c.name} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.12, ease: EASE }}>
              <rect x={c.x} y="44" width="220" height="150" rx="12" className={c.hot ? 'dx-core dx-hot' : 'dx-core'} />
              <Glyph name={c.glyph} size={26} x={c.x + 14} y={58} className={c.hot ? 'dx-glyph-hot' : 'ng-glyph'} />
              <text x={c.x + 50} y="77" className="dx-name">{c.name}</text>
              <text x={c.x + 14} y="108" className="dx-small">pick it when</text>
              {c.lines.map((l, k) => (
                <text key={l} x={c.x + 14} y={130 + k * 20} className="dx-small" style={{ fill: 'var(--ink)' }}>
                  {l}
                </text>
              ))}
            </motion.g>
          ))}
          <path d="M 240 119 H 254 M 248 114 L 254 119 L 248 124" className="dx-link" />
          <path d="M 480 119 H 494 M 488 114 L 494 119 L 488 124" className="dx-link" />

          <path d="M 20 222 H 718 M 710 217 L 718 222 L 710 227" className="dx-link" />
          <text x="20" y="242" className="dx-small">least structure</text>
          <text x="720" y="242" textAnchor="end" className="dx-small">more control, more to learn</text>
        </svg>
        <p className="viz-cap">Start with the lowest one that does the job. If you outgrow it, LangChain agents already run on LangGraph, so moving up is not a rewrite.</p>
      </div>
    </Root>
  );
}
