import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/** Each row is a need, the kind of library that meets it, and a few names from the verified libraries map. */
export const DECISION_ROWS: { need: string; kind: string; names: string[] }[] = [
  { need: 'Answers from my documents', kind: 'RAG and vector search', names: ['LlamaIndex', 'Haystack', 'pgvector', 'Qdrant'] },
  { need: 'A model that calls tools', kind: 'Agent frameworks', names: ['LangGraph', 'OpenAI Agents SDK', 'Pydantic AI'] },
  { need: 'Output my code can parse', kind: 'Structured output', names: ['Instructor', 'Outlines'] },
  { need: 'Better prompts, measured', kind: 'Prompt optimisation', names: ['DSPy', 'promptfoo'] },
  { need: 'Proof that it works', kind: 'Evaluation', names: ['RAGAS', 'DeepEval', 'promptfoo'] },
  { need: 'Stop bad input or output', kind: 'Guardrails and privacy', names: ['Guardrails AI', 'NeMo Guardrails', 'Presidio'] },
  { need: 'See what runs in production', kind: 'Observability', names: ['Langfuse', 'Arize Phoenix', 'MLflow'] },
  { need: 'One API, many providers', kind: 'Gateways', names: ['LiteLLM'] },
  { need: 'Run a model myself', kind: 'Serving and local', names: ['vLLM', 'Ollama', 'llama.cpp'] },
  { need: 'Adapt a model to my task', kind: 'Fine-tuning', names: ['PEFT', 'TRL', 'Unsloth'] },
];

const Y0 = 20;
const STEP = 46;
const H = 38;

/**
 * Start at what you are building and follow the line to the kind of library and a
 * few names to look at first. Every name is on the libraries map, with its status.
 */
export default function LibraryDecision() {
  const total = Y0 + DECISION_ROWS.length * STEP;
  const mid = total / 2 - 8;
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">What are you building?</p>
        <svg viewBox={`0 0 740 ${total + 6}`} className="dx-svg" role="img" aria-label="A tree from what you are building to the kind of library and some names to look at first">
          <rect x="10" y={mid - 20} width="118" height="52" rx="10" className="dx-core dx-hot" />
          <text x="69" y={mid + 4} textAnchor="middle" className="dx-name">I need to…</text>
          <path d={`M 128 ${mid + 6} H 148`} className="dx-link" />
          <path d={`M 148 ${Y0 + H / 2} V ${Y0 + (DECISION_ROWS.length - 1) * STEP + H / 2}`} className="dx-link" />

          {DECISION_ROWS.map((r, i) => {
            const y = Y0 + i * STEP;
            return (
              <motion.g key={r.need} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.06 * i, ease: EASE }}>
                <path d={`M 148 ${y + H / 2} H 166`} className="dx-link" />
                <rect x="166" y={y} width="220" height={H} rx="8" className="dx-core" />
                <text x="178" y={y + 24} className="dx-name" style={{ fontSize: 12.5 }}>{r.need}</text>
                <path d={`M 386 ${y + H / 2} H 410 M 404 ${y + H / 2 - 5} L 410 ${y + H / 2} L 404 ${y + H / 2 + 5}`} className="dx-link" />
                <rect x="410" y={y} width="320" height={H} rx="8" className="dx-core dx-hot" />
                <text x="422" y={y + 15} className="dx-small">{r.kind}</text>
                <text x="422" y={y + 31} className="dx-small" style={{ fill: 'var(--ink)', fontSize: 11.5, fontWeight: 600 }}>{r.names.join(', ')}</text>
              </motion.g>
            );
          })}
        </svg>
        <p className="viz-cap">These are starting points to read about, not verdicts. Most apps use two or three of them; some use none. Every name is on the libraries map with its licence, status and last release.</p>
      </div>
    </Root>
  );
}
