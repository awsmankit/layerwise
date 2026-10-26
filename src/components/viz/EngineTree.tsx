import { motion } from 'motion/react';
import { Root, EASE } from './shared';

const ROWS = [
  { when: 'My laptop, for myself', engine: 'Ollama, LM Studio or MLX' },
  { when: 'One server GPU, many users', engine: 'vLLM or SGLang' },
  { when: 'NVIDIA fleet, cost matters', engine: 'TensorRT-LLM (test vs vLLM)' },
  { when: 'Edge device or no GPU', engine: 'llama.cpp' },
];
const ROW_Y = [40, 110, 180, 250];

/**
 * Start at the question on the left and follow the line to an engine. Each
 * branch is a starting point to measure, not a verdict: check the benchmark
 * on your own workload before committing.
 */
export default function EngineTree() {
  const trunk = 'M 200 150 H 220';
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Which engine to start with</p>
        <svg viewBox="0 0 760 290" className="dx-svg" role="img" aria-label="A tree from where the model will run to a suggested engine">
          <rect x="20" y="126" width="180" height="48" className="dx-core dx-hot" />
          <text x="110" y="155" textAnchor="middle" className="dx-name">Where will it run?</text>

          <path d={trunk} className="dx-link" />
          <path d={`M 220 ${ROW_Y[0] + 23} V ${ROW_Y[3] + 23}`} className="dx-link" />

          {ROWS.map((r, i) => {
            const y = ROW_Y[i];
            return (
              <motion.g key={r.when} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 * i, ease: EASE }}>
                <path d={`M 220 ${y + 23} H 250`} className="dx-link" />
                <rect x="250" y={y} width="220" height="46" className="dx-core" />
                <text x="260" y={y + 28} className="dx-small">{r.when}</text>
                <path d={`M 470 ${y + 23} H 500`} className="dx-link" />
                <rect x="500" y={y} width="240" height="46" className="dx-core dx-hot" />
                <text x="512" y={y + 28} className="dx-name">{r.engine}</text>
              </motion.g>
            );
          })}
        </svg>
        <p className="viz-cap">
          TGI is in maintenance mode, so do not start a new deployment on it. Use the OpenAI-compatible API on whichever engine you choose, so you can switch later.
        </p>
      </div>
    </Root>
  );
}
