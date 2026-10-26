import { motion } from 'motion/react';
import { Root, EASE } from './shared';

const BANDS = [
  {
    y: 52,
    h: 150,
    name: 'Managed model API',
    lines: ['call a model someone else', 'trained and hosts', 'you: prompt, retrieve,', 'orchestrate, evaluate', 'billed mostly per token', 'limited model control'],
  },
  {
    y: 214,
    h: 150,
    name: 'ML platform',
    lines: ['bring your data and code', 'you: prepare, train, tune,', 'deploy, monitor', 'billed by instance time', 'and storage', 'full model control'],
  },
];
const COLS = [
  { name: 'AWS', x: 226 },
  { name: 'Microsoft', x: 396 },
  { name: 'Google', x: 566 },
];
const CW = 154;

/**
 * The two families of cloud AI service, drawn as two layers with each cloud's
 * product in its place. Google's one platform spans both layers.
 */
export default function ServiceLayers() {
  const cell = (col: number, band: number, title: string[], notes: string[] = [], span = 1, delay = 0) => {
    const b = BANDS[band];
    const h = span === 2 ? BANDS[1].y + BANDS[1].h - b.y : b.h;
    return (
      <motion.g initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay, ease: EASE }}>
        <rect x={COLS[col].x} y={b.y + 10} width={CW} height={h - 20} rx="10" className="dx-core dx-hot" />
        {title.map((t, k) => (
          <text key={t} x={COLS[col].x + 12} y={b.y + 38 + k * 18} className="dx-name">{t}</text>
        ))}
        {notes.map((n, k) => (
          <text key={n} x={COLS[col].x + 12} y={b.y + 44 + title.length * 18 + k * 15} className="dx-small">{n}</text>
        ))}
      </motion.g>
    );
  };

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Two families of cloud AI service, as of October 2026</p>
        <svg viewBox="0 0 740 380" className="dx-svg" role="img" aria-label="Managed model API: Amazon Bedrock, Microsoft Foundry including Azure OpenAI models, and Google's Gemini Enterprise Agent Platform. ML platform: Amazon SageMaker AI, Azure Machine Learning, and the same Google platform.">
          {COLS.map((c) => (
            <text key={c.name} x={c.x + CW / 2} y="36" textAnchor="middle" className="dx-name">{c.name}</text>
          ))}
          {BANDS.map((b) => (
            <g key={b.name}>
              <rect x="20" y={b.y} width="700" height={b.h} rx="12" className="dx-frame" />
              <text x="34" y={b.y + 28} className="dx-name">{b.name}</text>
              {b.lines.map((l, k) => (
                <text key={l} x="34" y={b.y + 50 + k * 16} className="dx-small">{l}</text>
              ))}
            </g>
          ))}
          {cell(0, 0, ['Amazon Bedrock'], [], 1, 0.05)}
          {cell(1, 0, ['Microsoft Foundry'], ['incl. Azure OpenAI', 'was Azure AI Foundry'], 1, 0.1)}
          {cell(0, 1, ['Amazon', 'SageMaker AI'], [], 1, 0.2)}
          {cell(1, 1, ['Azure Machine', 'Learning'], [], 1, 0.25)}
          {cell(2, 0, ['Gemini Enterprise', 'Agent Platform'], ['(Vertex AI): both', 'names in use', 'one platform covers', 'both layers: Gemini', 'and Model Garden,', 'training, prediction'], 2, 0.15)}
        </svg>
        <p className="viz-cap">Boundaries blur: Foundry and Google’s platform bundle model access with tooling, and every cloud keeps adding agent, evaluation and guardrail features. Treat this as a map of intent, not of product boundaries.</p>
      </div>
    </Root>
  );
}
