import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const ERAS: { name: string; when: string; how: string; example: string; glyph: GlyphName }[] = [
  { name: 'Rules', when: 'roughly 1950s to 1980s', how: 'hand-written grammar', example: 'keyword chatbots', glyph: 'doc' },
  { name: 'Statistics', when: 'roughly 1990s to 2010s', how: 'learned word counts', example: 'spam filters', glyph: 'chart' },
  { name: 'Neural networks', when: 'roughly 2013 onwards', how: 'learned word vectors', example: 'translation', glyph: 'network' },
  { name: 'Transformers', when: '2017 onwards', how: 'attention over tokens', example: 'chat assistants', glyph: 'eye' },
];

/**
 * Natural language processing is the area of AI about human language. It is
 * not one technique: the way it is done has changed several times.
 */
export default function NlpEras() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Natural language processing, four ways of doing it</p>
        <svg viewBox="0 0 740 210" className="dx-svg" role="img" aria-label="Four eras of NLP from left to right: rules, statistics, neural networks, transformers">
          <path d="M 20 40 H 720" className="dx-link" />
          <path d="M 712 34 L 720 40 L 712 46" className="dx-link" />
          <text x="20" y="26" className="dx-small">time</text>
          {ERAS.map((e, i) => {
            const x = 20 + i * 178;
            return (
              <motion.g key={e.name} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.12, ease: EASE }}>
                <circle cx={x + 80} cy="40" r="4" className={i === 3 ? 'dx-packet' : 'dx-core'} />
                <rect x={x} y="58" width="160" height="136" rx="10" className={i === 3 ? 'dx-core dx-hot' : 'dx-core'} />
                <Glyph name={e.glyph} size={28} x={x + 14} y={70} className={i === 3 ? 'dx-glyph-hot' : 'ng-glyph'} />
                <text x={x + 14} y="122" className="dx-name">{e.name}</text>
                <text x={x + 14} y="140" className="dx-small">{e.when}</text>
                <text x={x + 14} y="160" className="dx-small">{e.how}</text>
                <text x={x + 14} y="180" className="dx-small">{`e.g. ${e.example}`}</text>
              </motion.g>
            );
          })}
        </svg>
        <p className="viz-cap">Dates are approximate, and the eras overlap: spam filters still use statistics, and many products mix rules with models.</p>
      </div>
    </Root>
  );
}
