import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

type Piece = { name: string; lines: string[]; glyph: GlyphName; idle?: boolean };

/* Facts from the lesson, as of October 2026. */
const ROWS: { label: string; pieces: Piece[] }[] = [
  {
    label: 'Models',
    pieces: [
      { name: 'Model Garden', lines: ['200+ models: Gemini,', 'Claude, Gemma, Llama', 'and others'], glyph: 'box' },
      { name: 'Gemini API', lines: ["Google's own models", 'billed per token,', 'shared capacity'], glyph: 'gateway' },
      { name: 'Provisioned Throughput', lines: ['fixed-cost, fixed-term', 'subscription for Gemini', 'throughput, with an SLA'], glyph: 'lock', idle: true },
    ],
  },
  {
    label: 'Your data',
    pieces: [
      { name: 'Vector Search', lines: ['managed vector index,', 'nodes billed per hour'], glyph: 'database', idle: true },
      { name: 'RAG Engine', lines: ['managed RAG: connects', 'your data to a model'], glyph: 'search' },
    ],
  },
  {
    label: 'Agents',
    pieces: [
      { name: 'Agent Dev Kit (ADK)', lines: ['open source: Python,', 'Go, Java, TypeScript,', 'Kotlin'], glyph: 'pen' },
      { name: 'Agent Runtime', lines: ['hosts agents; Memory', 'Bank and Sessions;', 'was Agent Engine'], glyph: 'server' },
      { name: 'Agent Studio', lines: ['low-code agent', 'builder'], glyph: 'layers' },
    ],
  },
];

const X0 = 120;
const CW = 196;
const GAP = 10;
const CH = 88;
const RY = (r: number) => 26 + r * 104;

/**
 * Google's AI platform as three rows of pieces. Dashed orange outlines mark
 * the two pieces that keep billing while nothing uses them.
 */
export default function VertexMap() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">The pieces of Google's AI platform</p>
        <svg viewBox="0 0 740 360" className="dx-svg" role="img" aria-label="Models: Model Garden, Gemini API, Provisioned Throughput. Your data: Vector Search, RAG Engine. Agents: ADK, Agent Runtime, Agent Studio. Provisioned Throughput and Vector Search bill while idle.">
          {ROWS.map((row, r) => (
            <g key={row.label}>
              <text x="20" y={RY(r) + CH / 2 + 5} className="dx-name">{row.label}</text>
              {row.pieces.map((p, i) => {
                const x = X0 + i * (CW + GAP);
                const y = RY(r);
                return (
                  <motion.g key={p.name} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: r * 0.15 + i * 0.06, ease: EASE }}>
                    <rect
                      x={x}
                      y={y}
                      width={CW}
                      height={CH}
                      rx="10"
                      className="dx-core"
                      style={p.idle ? { stroke: 'var(--cost)', strokeDasharray: '5 4', strokeWidth: 1.5, strokeOpacity: 1 } : undefined}
                    />
                    <g style={{ color: p.idle ? 'var(--cost)' : 'var(--ink-3)' }}>
                      <Glyph name={p.glyph} size={18} x={x + 12} y={y + 11} />
                    </g>
                    <text x={x + 36} y={y + 25} className="dx-name" style={{ fontSize: 12.5 }}>{p.name}</text>
                    {p.lines.map((l, k) => (
                      <text key={l} x={x + 12} y={y + 46 + k * 15} className="dx-small">{l}</text>
                    ))}
                  </motion.g>
                );
              })}
            </g>
          ))}
          {/* ADK is the code you write; Agent Runtime runs it */}
          <path d={`M ${X0 + CW} ${RY(2) + CH / 2} H ${X0 + CW + GAP}`} className="dx-link" />
          <path d={`M ${X0 + CW + GAP - 5} ${RY(2) + CH / 2 - 4} L ${X0 + CW + GAP} ${RY(2) + CH / 2} L ${X0 + CW + GAP - 5} ${RY(2) + CH / 2 + 4}`} className="dx-link" />
          <rect x="120" y="340" width="22" height="12" rx="3" className="dx-core" style={{ stroke: 'var(--cost)', strokeDasharray: '4 3', strokeWidth: 1.5 }} />
          <text x="150" y="350" className="dx-small">bills by the hour even with no traffic</text>
        </svg>
        <p className="viz-cap">
          Model count as of October 2026. Some models are Google-hosted APIs; others in Model Garden you deploy to your own endpoint. You can write an agent in ADK and run it elsewhere, and Agent Runtime can host agents built with other frameworks. Delete idle experiments: a Vector Search index and Provisioned Throughput keep billing.
        </p>
      </div>
    </Root>
  );
}
