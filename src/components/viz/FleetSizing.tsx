import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/* The lesson's worked example. All inputs are invented for illustration. */
const STEPS = [
  { title: 'Peak demand', math: '10 requests/s × 300 output tokens = 3,000 tokens/s', replicas: 0, load: 0, spare: false },
  { title: 'At 100 percent', math: '3,000 ÷ 1,500 tokens/s per replica = 2 replicas', replicas: 2, load: 1, spare: false },
  { title: 'Add headroom', math: '3,000 ÷ (1,500 × 0.7) = 2.86, so 3 replicas', replicas: 3, load: 2 / 3, spare: false },
  { title: 'Survive a failure', math: 'one more for failures and rollouts (N+1): 4 replicas', replicas: 4, load: 2 / 3, spare: true },
];

const BX = (i: number) => 250 + i * 120;

/**
 * Fleet sizing step by step: peak tokens per second, divided by what one
 * replica sustains at the SLO, then headroom, then one spare.
 */
export default function FleetSizing() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Sizing the fleet for the example</p>
          <div className="dx-steps">
            <button type="button" className="btn quiet" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </button>
            <button type="button" className="btn" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>
              Next step
            </button>
          </div>
        </div>
        <svg viewBox="0 0 740 250" className="dx-svg" role="img" aria-label={`Step ${step + 1}: ${s.title}. ${s.math}`}>
          {/* demand */}
          <rect x="20" y="40" width="170" height="120" rx="10" className="dx-core dx-hot" />
          <text x="34" y="64" className="dx-small">peak demand</text>
          <text x="34" y="96" className="dx-word" style={{ fontSize: 22 }}>3,000</text>
          <text x="34" y="118" className="dx-small">output tokens/s</text>
          <text x="34" y="142" className="dx-small">10 req/s × 300 tokens</text>
          <path d="M 190 100 H 236" className="dx-link" />
          <path d="M 230 95 L 236 100 L 230 105" className="dx-link" />

          {[0, 1, 2, 3].map((i) => {
            const shown = i < s.replicas;
            const isSpare = s.spare && i === 3;
            const fill = isSpare ? 0 : s.load;
            return (
              <motion.g key={i} initial={false} animate={{ opacity: shown ? 1 : 0.15 }} transition={{ duration: 0.35, ease: EASE }}>
                <rect x={BX(i)} y="40" width="100" height="120" rx="10" className={isSpare ? 'kv-free' : 'dx-core'} style={isSpare ? { strokeOpacity: 0.9 } : undefined} />
                <text x={BX(i) + 12} y="60" className="dx-small">{isSpare ? 'spare' : `replica ${i + 1}`}</text>
                <rect x={BX(i) + 12} y="72" width="76" height="72" rx="4" className="kv-free" />
                <motion.rect x={BX(i) + 12} width="76" rx="4" className="kv-a" initial={false} animate={{ y: 144 - 72 * (shown ? fill : 0), height: 72 * (shown ? fill : 0) }} transition={{ duration: 0.5, ease: EASE }} />
                <text x={BX(i) + 50} y="178" textAnchor="middle" className="dx-small">{isSpare ? 'N+1' : shown ? `${Math.round(fill * 100)}% busy` : ''}</text>
              </motion.g>
            );
          })}
          <text x="250" y="28" className="dx-small">one replica sustains 1,500 output tokens/s within the SLOs</text>

          <rect x="20" y="198" width="700" height="38" rx="8" className="dx-frame" />
          <text x="34" y="222" className="dx-name" style={{ fontSize: 12.5 }}>{`${step + 1}. ${s.title}:`}</text>
          <text x="200" y="222" className="dx-small" style={{ fill: 'var(--ink)' }}>{s.math}</text>
        </svg>
        <p className="viz-cap">
          The 70 percent target means three replicas carry the peak at about two thirds busy each, which keeps latency flat when a burst arrives. The spare covers a dead replica or a rollout while new ones take minutes to start.
        </p>
      </div>
    </Root>
  );
}
