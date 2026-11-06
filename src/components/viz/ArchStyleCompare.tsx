import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { DIMENSIONS, STYLES, STYLE_ORDER, type DimensionId } from '../../lib/arch-style';

/**
 * Six agent architecture styles side by side. Pick a question and every card answers it.
 * Cards wrap to one column on a phone, so nothing scrolls sideways.
 */
export default function ArchStyleCompare() {
  const [dim, setDim] = useState<DimensionId>('control');
  const current = DIMENSIONS.find((d) => d.id === dim)!;

  return (
    <Root>
      <div className="viz as-cmp">
        <p className="viz-title">Six styles, one question at a time</p>
        <div className="as-chips" role="group" aria-label="What to compare">
          {DIMENSIONS.map((d) => (
            <button key={d.id} type="button" className="as-chip" aria-pressed={dim === d.id} onClick={() => setDim(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
        <p className="as-question" aria-live="polite">
          {current.question}
        </p>
        <ol className="as-cards">
          {STYLE_ORDER.map((id, i) => {
            const s = STYLES[id];
            return (
              <motion.li key={id} className="as-card" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.05, ease: EASE }}>
                <div className="as-card-head">
                  <span className="as-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="as-name">{s.name}</h3>
                </div>
                <p className="as-what">{s.what}</p>
                {dim === 'control' && (
                  <p className="as-meter" role="img" aria-label={`Model steers the flow: ${s.modelSteers} out of 4`}>
                    <span className="as-meter-label">Model steers</span>
                    <span className="as-dots" aria-hidden="true">
                      {[1, 2, 3, 4].map((n) => (
                        <span key={n} className={n <= s.modelSteers ? 'as-dot is-on' : 'as-dot'} />
                      ))}
                    </span>
                  </p>
                )}
                <p className="as-answer">
                  <span className="as-answer-tag">{current.label}</span>
                  {s.cells[dim]}
                </p>
              </motion.li>
            );
          })}
        </ol>
        <p className="viz-cap">The model does the same job in all six. What changes is who controls the flow, where state lives and what you can test. The dots are a rough guide, not a measurement.</p>
      </div>
    </Root>
  );
}
