import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

const ANSWERS = {
  A: { name: 'Answer A', note: 'short, cites the source' },
  B: { name: 'Answer B', note: 'longer, no source' },
};
const SLOT_Y = [36, 120];

/**
 * Position bias, shown by asking the same judge the same question twice with
 * the answers swapped. Here the judge prefers whichever answer comes first,
 * so the two runs disagree and the comparison should be discarded.
 * The verdicts are illustrative.
 */
export default function PositionSwap() {
  const [run, setRun] = useState<1 | 2>(1);
  const order: ('A' | 'B')[] = run === 1 ? ['A', 'B'] : ['B', 'A'];
  const winner = order[0];

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Same judge, answers swapped</p>
          <div className="dx-steps" role="group" aria-label="Run">
            <button type="button" className="btn quiet" aria-pressed={run === 1} onClick={() => setRun(1)}>
              Run 1: A first
            </button>
            <button type="button" className="btn quiet" aria-pressed={run === 2} onClick={() => setRun(2)}>
              Run 2: B first
            </button>
          </div>
        </div>

        <svg viewBox="0 0 740 236" className="dx-svg" role="img" aria-label={`Run ${run}: ${order[0]} is shown first and the judge picks the first answer, ${winner}. Run 1 picks A, run 2 picks B, so the verdict followed the position.`}>
          <text x="20" y="28" className="dx-small">shown first</text>
          <text x="20" y="112" className="dx-small">shown second</text>

          {(['A', 'B'] as const).map((k) => {
            const slot = order.indexOf(k);
            return (
              <motion.g key={k} initial={false} animate={{ y: SLOT_Y[slot] }} transition={{ duration: 0.6, ease: EASE }}>
                <rect x="20" y="0" width="220" height="58" rx="10" className={k === 'A' ? 'kv-cached' : 'dx-core'} />
                <text x="36" y="25" className="dx-name">{ANSWERS[k].name}</text>
                <text x="36" y="44" className="dx-small">{ANSWERS[k].note}</text>
              </motion.g>
            );
          })}

          <path d="M 240 65 H 280 V 106 H 316 M 240 149 H 280 V 106" className="dx-link" />
          <path d="M 310 100 L 316 106 L 310 112" className="dx-link" />

          <rect x="318" y="72" width="150" height="68" rx="10" className="dx-core dx-hot" />
          <Glyph name="check" size={22} x={332} y={84} className="dx-glyph-hot" />
          <text x="362" y="100" className="dx-name">Judge</text>
          <text x="332" y="126" className="dx-small">which one is better?</text>

          <path d="M 468 106 H 506" className="dx-link" />
          <path d="M 500 100 L 506 106 L 500 112" className="dx-link" />

          <rect x="508" y="72" width="212" height="68" rx="10" className="dx-core" />
          <text x="522" y="98" className="dx-name">"The first one"</text>
          <motion.text key={run} x="522" y="124" className="dx-small" style={{ fill: 'var(--signal)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.4 }}>
            {`so this run picks ${ANSWERS[winner].name}`}
          </motion.text>

          <line x1="20" y1="196" x2="720" y2="196" className="dx-frame" />
          <text x="20" y="220" className="dx-small">Run 1 picks A. Run 2 picks B. The position decided, not the answer, so drop this comparison.</text>
        </svg>
        <p className="viz-cap">
          Illustrative verdicts. Run both orders and keep only results that agree, or randomise the order across many comparisons so the bias averages out instead of tilting the score.
        </p>
      </div>
    </Root>
  );
}
