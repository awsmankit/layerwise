import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

const DRAW = { initial: { pathLength: 0 }, whileInView: { pathLength: 1 }, viewport: { once: true } };

/**
 * A two-question check before relying on an answer. The first question sets
 * how careful to be; the second is the check itself for anything that matters.
 */
export default function TrustCheck({ simple = false }: { simple?: boolean }) {
  const t = simple
    ? { what: 'a fact for homework', who: ['your teacher, your mark', 'or someone’s safety'], label: 'An AI answer gives a fact for your homework. Ask who finds out if it is wrong. If nothing much, use it as a draft. If your teacher, your mark or someone’s safety, look it up yourself: if you find it in a good source and it says the same, use it; if you cannot find it, treat it as invented.' }
    : { what: 'cites a court case', who: ['a customer, a patient', 'or a court'], label: 'An AI answer cites a court case. Ask who finds out if it is wrong. If nothing much, use it as a draft. If a customer, a patient or a court, look the case up yourself: if you find it and it says the same, use it; if you cannot find it, treat it as invented.' };
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Before you rely on an answer</p>
        <svg viewBox="0 0 740 252" className="dx-svg" role="img" aria-label={t.label}>
          {/* the answer */}
          <rect x="20" y="100" width="140" height="56" rx="10" className="dx-core" />
          <Glyph name="pen" size={20} x={32} y={110} className="ng-glyph" />
          <text x="58" y="125" className="dx-name">AI answer</text>
          <text x="32" y="145" className="dx-small">{t.what}</text>

          <path d="M 160 128 H 190" className="dx-link" />
          <path d="M 184 122 L 190 128 L 184 134" className="dx-link" />

          {/* the stakes question */}
          <rect x="192" y="100" width="150" height="56" rx="10" className="dx-core dx-hot" />
          <text x="206" y="124" className="dx-name">Who finds out</text>
          <text x="206" y="143" className="dx-name">if it is wrong?</text>

          {/* low stakes */}
          <path d="M 342 128 H 370 V 45 H 412" className="dx-link" />
          <path d="M 406 39 L 412 45 L 406 51" className="dx-link" />
          <text x="378" y="80" className="dx-small">nothing much</text>
          <rect x="414" y="20" width="306" height="50" rx="10" className="dx-core" />
          <text x="430" y="42" className="dx-name">Use it as a draft</text>
          <text x="430" y="60" className="dx-small">low stakes: move quickly, edit as you go</text>

          {/* high stakes */}
          <motion.path d="M 370 128 V 190 H 412" className="dx-residual" {...DRAW} transition={{ duration: 0.8, ease: EASE }} />
          <path d="M 406 184 L 412 190 L 406 196" className="dx-link" />
          <text x="200" y="180" className="dx-small">{t.who[0]}</text>
          <text x="200" y="196" className="dx-small">{t.who[1]}</text>
          <path d="M 300 192 H 366" className="dx-link" strokeDasharray="2 3" />
          <circle cx="370" cy="192" r="2.5" className="dx-packet" />
          <rect x="414" y="164" width="140" height="52" rx="10" className="dx-core" />
          <Glyph name="search" size={20} x={426} y={172} className="ng-glyph" />
          <text x="452" y="188" className="dx-name">Look it up</text>
          <text x="426" y="207" className="dx-small">check it exists</text>

          <motion.path d="M 554 190 H 566 V 152 H 578" className="dx-residual" {...DRAW} transition={{ duration: 0.6, delay: 0.6, ease: EASE }} />
          <path d="M 572 146 L 578 152 L 572 158" className="dx-link" />
          <motion.path d="M 566 190 V 222 H 578" className="dx-residual" {...DRAW} transition={{ duration: 0.6, delay: 0.6, ease: EASE }} />
          <path d="M 572 216 L 578 222 L 572 228" className="dx-link" />

          <rect x="580" y="128" width="150" height="46" rx="10" className="dx-core" />
          <text x="592" y="148" className="dx-name">Use it</text>
          <text x="592" y="165" className="dx-small">found, says the same</text>

          <rect x="580" y="198" width="150" height="46" rx="10" className="dx-core" style={{ stroke: 'var(--warn)' }} />
          <text x="592" y="218" className="dx-name" style={{ fill: 'var(--warn)' }}>Treat as invented</text>
          <text x="592" y="235" className="dx-small">cannot find it</text>
        </svg>
        <p className="viz-cap">
          {simple
            ? 'A true story: in 2023 a court in the US fined two lawyers because a chatbot had made up court cases for them. One of them asked the chatbot if the cases were real, and it said yes. Asking a chatbot to check itself is not a real check.'
            : 'A real case: in 2023 a US federal court fined two lawyers who had filed a brief citing court cases that ChatGPT made up (Mata v. Avianca). The lawyer had asked the chatbot whether the cases were real, and it said yes. Asking the tool to check itself is not a check.'}
        </p>
      </div>
    </Root>
  );
}
