import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

const STAGES = ['Text', 'Pieces', 'IDs', 'Vectors'];
/** The real split and IDs from the o200k_base tokenizer (tiktoken), checked October 2026. */
const PIECES = ['un', 'h', 'appiness'];
const IDS = [373, 71, 117779];
/** Bar heights for a sketch of one embedding vector. Illustrative, not real values. */
const SHAPE = [0.4, 0.7, 0.3, 0.9, 0.55, 0.2, 0.75, 0.5];

/**
 * One word taken apart, one step at a time. Pick a stage to see what the
 * tokenizer and the embedding table do with the text. The IDs and vector
 * values are made up to show the shape of the idea, not taken from a model.
 */
export default function TokenDissect() {
  const [stage, setStage] = useState(0);
  const show = (n: number) => stage >= n;
  const slot = (i: number) => 40 + i * 230;

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">From text to numbers</p>
          <div className="dx-steps" role="group" aria-label="Stage">
            {STAGES.map((s, i) => (
              <button key={s} type="button" className="btn quiet" aria-pressed={stage === i} onClick={() => setStage(i)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 760 240" className="dx-svg" role="img" aria-label={`Stage ${stage + 1} of 4: ${STAGES[stage]}`}>
          <motion.rect
            x="40"
            y="40"
            width="680"
            height="60"
            className="dx-frame"
            animate={{ opacity: show(1) ? 0 : 1 }}
            transition={{ duration: 0.4, ease: EASE }}
          />
          <motion.text
            x="380"
            y="78"
            textAnchor="middle"
            className="dx-word"
            animate={{ opacity: show(1) ? 0 : 1 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            unhappiness
          </motion.text>

          {PIECES.map((p, i) => (
            <g key={p}>
              <motion.rect
                x={slot(i)}
                y="40"
                width="200"
                height="60"
                className="dx-core"
                initial={false}
                animate={{ opacity: show(1) ? 1 : 0, x: show(1) ? 0 : 60 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
              />
              <motion.text
                x={slot(i) + 100}
                y="78"
                textAnchor="middle"
                className="dx-word"
                initial={false}
                animate={{ opacity: show(1) ? 1 : 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              >
                {p}
              </motion.text>

              <motion.g initial={false} animate={{ opacity: show(2) ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}>
                <path d={`M ${slot(i) + 100} 100 L ${slot(i) + 100} 124`} className="dx-link" />
                <rect x={slot(i) + 60} y="124" width="80" height="26" className="dx-core" />
                <text x={slot(i) + 100} y="142" textAnchor="middle" className="dx-small">{IDS[i]}</text>
              </motion.g>

              <motion.g initial={false} animate={{ opacity: show(3) ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}>
                <path d={`M ${slot(i) + 100} 150 L ${slot(i) + 100} 168`} className="dx-link" />
                {SHAPE.map((h, k) => (
                  <rect
                    key={k}
                    x={slot(i) + 42 + k * 14}
                    y={220 - h * 50}
                    width="8"
                    height={h * 50}
                    className="dx-bar-v"
                  />
                ))}
              </motion.g>
            </g>
          ))}
        </svg>

        <p className="viz-cap">
          {stage === 0 && 'One word, 11 characters. Common words such as "Hello" or "Paris" are a single token; rarer ones are split.'}
          {stage === 1 && 'A real tokenizer (o200k_base) cuts it into 3 pieces: "un", "h" and "appiness". The pieces follow what was frequent in its training text, not grammar.'}
          {stage === 2 && 'Each piece is an index into a vocabulary of about 200,000 entries. These are the real IDs. Another tokenizer gives different pieces and IDs.'}
          {stage === 3 && 'Each ID selects one row of the embedding table: a vector of a few thousand numbers. The bars sketch the idea; the values here are not real.'}
        </p>
      </div>
    </Root>
  );
}
