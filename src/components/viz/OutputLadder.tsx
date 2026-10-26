import { motion } from 'motion/react';
import { Root, EASE } from './shared';

const RUNGS = [
  { name: 'Ask in the prompt', lines: ['"Reply with JSON', 'matching this schema."', 'Works often, not always.'] },
  { name: 'Structured output', lines: ['You supply a JSON schema;', 'the API steers the model', 'to match it. Prefer this.'] },
  { name: 'Validate and retry', lines: ['Parse and check the result.', 'On failure, send the error', 'back. Cap the attempts.'] },
];

const W = 200;
const H = 116;
const x = (i: number) => 30 + i * 236;
const y = (i: number) => 150 - i * 52;

/**
 * Three levels of control over the shape of model output, from weakest to
 * strongest. The last step applies whatever you used upstream.
 */
export default function OutputLadder() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Getting output your code can use</p>
        <svg viewBox="0 0 740 300" className="dx-svg" role="img" aria-label="A three-step staircase: ask in the prompt, use the platform's structured output, then validate and retry with a limit">
          <path d="M 20 284 H 720" className="dx-link" />
          <text x="20" y="276" className="dx-small">weakest</text>
          <text x="720" y="276" textAnchor="end" className="dx-small">strongest</text>

          {RUNGS.map((r, i) => (
            <motion.g key={r.name} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.15, ease: EASE }}>
              <rect x={x(i)} y={y(i)} width={W} height={H} rx="8" className={i === 1 ? 'dx-core dx-hot' : 'dx-core'} />
              <text x={x(i) + 14} y={y(i) + 26} className="dx-name">{r.name}</text>
              {r.lines.map((l, k) => (
                <text key={l} x={x(i) + 14} y={y(i) + 52 + k * 17} className="dx-small">{l}</text>
              ))}
              {i < 2 && <path d={`M ${x(i) + W} ${y(i) + 30} H ${x(i + 1) - 8} M ${x(i + 1) - 14} ${y(i) + 24} L ${x(i + 1) - 8} ${y(i) + 30} L ${x(i + 1) - 14} ${y(i) + 36}`} className="dx-link" />}
            </motion.g>
          ))}

          {/* the retry loop on the last rung */}
          <path d={`M ${x(2) + W} ${y(2) + 80} h 16 V ${y(2) - 14} H ${x(2) + 120} V ${y(2)}`} className="dx-residual" />
          <text x={x(2) + 60} y={y(2) - 20} className="dx-small">retry, up to a limit</text>
        </svg>
        <p className="viz-cap">Use the strongest level your platform offers, and always keep the last one: whatever happens upstream, parse and check the result.</p>
      </div>
    </Root>
  );
}
