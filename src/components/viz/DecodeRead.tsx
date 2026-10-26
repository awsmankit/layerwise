import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

const OUT = ['Paris', 'is', 'the', 'capital', 'of', 'France'];

/**
 * One decode step reads every weight and the whole KV cache out of memory to
 * make a single token. The arithmetic is quick; the reading sets the pace.
 */
export default function DecodeRead() {
  const [step, setStep] = useState(0);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setStep((s) => (s >= OUT.length ? 0 : s + 1)), 1300);
    return () => clearInterval(id);
  }, [on]);

  const kvW = 40 + step * 18;

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">What one decode step reads</p>
          <button type="button" className="btn quiet" aria-pressed={on} onClick={() => setOn((v) => !v)}>
            {on ? 'Stop' : 'Run'}
          </button>
        </div>
        <svg viewBox="0 0 740 230" className="dx-svg" role="img" aria-label="GPU memory holding weights and the KV cache, a wide read path to a small compute block, and one token out per step">
          <rect x="20" y="30" width="330" height="150" rx="10" className="dx-frame" />
          <text x="34" y="52" className="dx-small">GPU memory (HBM)</text>
          <rect x="36" y="64" width="298" height="54" rx="6" className="dx-core" />
          <text x="50" y="96" className="dx-name">weights, read in full</text>
          <motion.rect x="36" y="128" height="38" rx="6" className="kv-cached" initial={false} animate={{ width: kvW }} transition={{ duration: 0.5, ease: EASE }} />
          <text x="46" y="152" className="dx-small" style={{ fill: 'var(--ink)' }}>KV cache</text>

          {/* the read path */}
          <path d="M 350 80 H 470 M 350 150 H 420 Q 450 150 455 110 L 470 105" className="dx-link" />
          <path d="M 462 74 L 470 80 L 462 86" className="dx-link" />
          {on && (
            <motion.rect
              key={step}
              y="72"
              width="40"
              height="16"
              rx="4"
              className="kv-new"
              initial={{ x: 350, opacity: 0 }}
              animate={{ x: 430, opacity: [0, 1, 0] }}
              transition={{ duration: 1, ease: 'easeInOut' }}
            />
          )}
          <text x="410" y="66" textAnchor="middle" className="dx-small">every byte, every step</text>

          <rect x="472" y="56" width="70" height="70" rx="10" className="dx-core dx-hot" />
          <Glyph name="chip" size={34} x={490} y={74} className="dx-glyph-hot" />
          <text x="507" y="146" textAnchor="middle" className="dx-small">compute</text>
          <text x="507" y="160" textAnchor="middle" className="dx-small">mostly waiting</text>

          <path d="M 542 91 H 566" className="dx-link" />
          <path d="M 560 86 L 566 91 L 560 96" className="dx-link" />
          {OUT.slice(0, step).map((w, i) => (
            <motion.g key={w + i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
              <rect x={572 + (i % 2) * 80} y={40 + Math.floor(i / 2) * 36} width="74" height="28" rx="6" className={i === step - 1 ? 'dx-core dx-hot' : 'dx-core'} />
              <text x={609 + (i % 2) * 80} y={59 + Math.floor(i / 2) * 36} textAnchor="middle" className="dx-name" style={{ fontSize: 12 }}>{w}</text>
            </motion.g>
          ))}
          <text x="572" y="200" className="dx-small">{`${step} token${step === 1 ? '' : 's'} out, ${step} full read${step === 1 ? '' : 's'}`}</text>
        </svg>
        <p className="viz-cap">The cache grows with each token, so long contexts mean more to read per step and slower decoding.</p>
      </div>
    </Root>
  );
}
