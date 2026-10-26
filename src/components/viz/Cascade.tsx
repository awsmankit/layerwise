import { useState } from 'react';
import { motion } from 'motion/react';
import { Root } from './shared';
import { Glyph } from './glyphs';

type Mode = 'easy' | 'hard';

const NOTES: Record<Mode, string> = {
  easy: 'Most requests are easy: the check passes and you pay for one small call.',
  hard: 'A failed check pays for both calls and waits for both. If more than a modest share escalates, the cascade costs more than calling the large model directly.',
};

/**
 * A cascade: try a small model, accept its answer if a cheap check passes,
 * otherwise escalate. Switch between an easy and a hard request.
 */
export default function Cascade() {
  const [mode, setMode] = useState<Mode>('easy');
  const lit = (m: Mode) => ({ opacity: mode === m ? 1 : 0.18 });

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">A cascade, small model first</p>
          <div className="dx-steps" role="group" aria-label="Request">
            <button type="button" className="btn quiet" aria-pressed={mode === 'easy'} onClick={() => setMode('easy')}>
              Easy request
            </button>
            <button type="button" className="btn quiet" aria-pressed={mode === 'hard'} onClick={() => setMode('hard')}>
              Hard request
            </button>
          </div>
        </div>

        <svg viewBox="0 0 740 230" className="dx-svg" role="img" aria-label={NOTES[mode]}>
          <rect x="20" y="88" width="110" height="56" rx="10" className="dx-core" />
          <g className="ng-glyph">
            <Glyph name="question" size={20} x={30} y={96} />
          </g>
          <text x="56" y="112" className="dx-name">Request</text>

          <path d="M 130 116 H 166" className="dx-link" />
          <path d="M 159 112 L 166 116 L 159 120" className="dx-link" />
          <rect x="168" y="88" width="130" height="56" rx="10" className="dx-core" />
          <g className="ng-glyph">
            <Glyph name="box" size={20} x={178} y={96} />
          </g>
          <text x="204" y="112" className="dx-name">Small model</text>
          <text x="178" y="132" className="dx-small">cheap, fast</text>

          <path d="M 298 116 H 334" className="dx-link" />
          <path d="M 327 112 L 334 116 L 327 120" className="dx-link" />
          <rect x="336" y="80" width="160" height="72" rx="10" className="dx-core dx-hot" />
          <g className="dx-glyph-hot">
            <Glyph name="check" size={20} x={346} y={88} />
          </g>
          <text x="372" y="104" className="dx-name">Check</text>
          <text x="346" y="125" className="dx-small">schema, confidence,</text>
          <text x="346" y="140" className="dx-small">unit test, cheap judge</text>

          {/* pass */}
          <motion.g initial={false} animate={lit('easy')} transition={{ duration: 0.35 }}>
            <path d="M 496 100 C 520 100, 520 56, 546 56" className="dx-residual" />
            <path d="M 539 52 L 546 56 L 539 60" className="dx-link" style={{ stroke: 'var(--signal)' }} />
            <text x="506" y="74" className="dx-small">pass</text>
            <rect x="548" y="28" width="172" height="56" rx="10" className="dx-core dx-hot" />
            <text x="560" y="52" className="dx-name">Accept the answer</text>
            <text x="560" y="72" className="dx-small">cost: 1 small call</text>
          </motion.g>

          {/* fail */}
          <motion.g initial={false} animate={lit('hard')} transition={{ duration: 0.35 }}>
            <path d="M 496 132 C 520 132, 520 176, 546 176" className="dx-residual" />
            <path d="M 539 172 L 546 176 L 539 180" className="dx-link" style={{ stroke: 'var(--signal)' }} />
            <text x="506" y="166" className="dx-small">fail</text>
            <rect x="548" y="148" width="172" height="56" rx="10" className="dx-core dx-hot" />
            <text x="560" y="172" className="dx-name">Large model</text>
            <text x="560" y="192" className="dx-small">pays twice, waits twice</text>
          </motion.g>
        </svg>
        <p className="viz-cap">{NOTES[mode]} A weak check either sends everything upward or lets bad answers through.</p>
      </div>
    </Root>
  );
}
