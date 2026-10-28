import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

/** The layers of an LLM app, top to bottom, with the kind of library that sits at each. Names are on the libraries map. */
export const LAYERS: { label: string; names: string; glyph: GlyphName; hot?: boolean }[] = [
  { label: 'Your app and its users', names: 'no library needed', glyph: 'user' },
  { label: 'Agent logic', names: 'LangGraph, OpenAI Agents SDK, MCP Python SDK', glyph: 'wrench' },
  { label: 'Prompts and output shape', names: 'Instructor, Outlines, DSPy', glyph: 'pen' },
  { label: 'Your data', names: 'LlamaIndex, Haystack, pgvector, Qdrant', glyph: 'database' },
  { label: 'One door to models', names: 'LiteLLM', glyph: 'route' },
  { label: 'The model', names: 'vLLM, Ollama, llama.cpp; adapt with PEFT, TRL', glyph: 'chip', hot: true },
];

const CROSS: { label: string; names: string; glyph: GlyphName }[] = [
  { label: 'Evaluation', names: 'RAGAS, DeepEval, promptfoo', glyph: 'check' },
  { label: 'Guardrails and privacy', names: 'Guardrails AI, NeMo Guardrails, Presidio', glyph: 'shield' },
  { label: 'Observability', names: 'Langfuse, Arize Phoenix, MLflow', glyph: 'chart' },
];

/** Split a comma list into lines of at most `max` characters, so names never run past their box. */
const wrap = (list: string, max = 30) =>
  list.split(', ').reduce<string[]>((lines, name) => {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last}, ${name}`.length <= max) lines[lines.length - 1] = `${last}, ${name}`;
    else lines.push(lines.length ? name : name);
    return lines;
  }, []);

const Y0 = 14;
const STEP = 54;
const H = 42;

/**
 * An LLM app drawn as layers. Libraries sit at one layer each, except three jobs
 * that cut across all of them: evaluating, guarding and observing.
 */
export default function LlmAppStack() {
  const bottom = Y0 + LAYERS.length * STEP - (STEP - H);
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Where each kind of library sits</p>
        <svg viewBox={`0 0 740 ${bottom + 14}`} className="dx-svg" role="img" aria-label="Six layers of an LLM app from your app down to the model, with evaluation, guardrails and observability cutting across all of them">
          {LAYERS.map((l, i) => {
            const y = Y0 + i * STEP;
            return (
              <motion.g key={l.label} initial={{ opacity: 0, y: -8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.09 * i, ease: EASE }}>
                <rect x="14" y={y} width="450" height={H} rx="10" className={l.hot ? 'dx-core dx-hot' : 'dx-core'} />
                <Glyph name={l.glyph} size={24} x={26} y={y + 9} className={l.hot ? 'dx-glyph-hot' : 'ng-glyph'} />
                <text x="62" y={y + 18} className="dx-name" style={{ fontSize: 13 }}>{l.label}</text>
                <text x="62" y={y + 34} className="dx-small">{l.names}</text>
                {i < LAYERS.length - 1 && <path d={`M 239 ${y + H} V ${y + STEP} M 234 ${y + STEP - 6} L 239 ${y + STEP} L 244 ${y + STEP - 6}`} className="dx-link" />}
              </motion.g>
            );
          })}

          {/* the three jobs that cut across every layer */}
          <path d={`M 476 ${Y0} V ${bottom} M 470 ${Y0} H 476 M 470 ${bottom} H 476`} className="dx-link" />
          <text x="490" y={Y0 + 6} className="dx-small">cuts across every layer</text>
          {CROSS.map((c, i) => {
            const y = Y0 + 20 + i * 90;
            return (
              <motion.g key={c.label} initial={{ opacity: 0, x: 8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.4 + i * 0.1, ease: EASE }}>
                <path d={`M 476 ${y + 36} H 490`} className="dx-link" />
                <rect x="490" y={y} width="240" height="74" rx="10" className="dx-core" />
                <Glyph name={c.glyph} size={22} x={502} y={y + 10} className="ng-glyph" />
                <text x="532" y={y + 26} className="dx-name" style={{ fontSize: 13 }}>{c.label}</text>
                {wrap(c.names).map((line, k) => (
                  <text key={line} x="502" y={y + 48 + k * 15} className="dx-small">
                    {line}
                  </text>
                ))}
              </motion.g>
            );
          })}
        </svg>
        <p className="viz-cap">Pick libraries per layer, not per brand. The cross-cutting three are worth adding early: you cannot improve what you cannot measure or see.</p>
      </div>
    </Root>
  );
}
