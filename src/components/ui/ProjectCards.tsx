import { useEffect, useState, type CSSProperties } from 'react';
import { Root } from '../viz/shared';
import { cardStyle } from '../../lib/color';
import { cycleSwatch } from '../../lib/palette';
import { withBase } from '../../lib/url';
import { projects } from '../../data/practice';

/** Lesson titles for the keys the projects point at (from each lesson's frontmatter). */
const titles: Record<string, string> = {
  'rag-agents/rag-from-scratch': 'RAG from scratch',
  'rag-agents/chunking-and-retrieval-quality': 'Chunking and retrieval quality',
  'rag-agents/vector-search-and-retrieval-metrics': 'Vector search internals and retrieval metrics',
  'foundations/tokens-and-embeddings': 'Tokens and embeddings',
  'llm/prompting-and-structured-output': 'Prompting and structured output',
  'llm/prompt-patterns-and-optimisation': 'Prompt patterns and optimisation',
  'evals/evals-101': 'Evals 101',
  'rag-agents/agents-and-tool-use': 'Agents and tool use',
  'rag-agents/langchain-and-langgraph': 'LangChain and LangGraph',
  'rag-agents/mcp-in-depth': 'MCP in depth: hosts, servers, transports and trust',
  'evals/llm-security': 'LLM application security: prompt injection and beyond',
  'evals/llm-as-judge-pitfalls': 'LLM-as-judge and its pitfalls',
  'local/run-models-locally': 'Run a model on your own computer',
  'local/memory-math-for-local-models': 'The memory maths for local models',
  'serving/kv-cache-and-memory': 'The KV cache and GPU memory',
  'serving/quantization': 'Quantization',
  'cost/where-the-tokens-go': 'Where the tokens go',
  'cost/cost-levers': 'Cost levers, ranked',
  'serving/life-of-a-request': 'Life of a request',
  'local/self-hosting-vs-api-economics': 'Self-hosting versus an API: the economics',
};

const levelLabel = { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced' } as const;

function styleObject(css: string): CSSProperties {
  return Object.fromEntries(css.split(';').map((d) => d.split(':'))) as CSSProperties;
}

const storeKey = (id: string) => `layerwise:project:${id}`;

/** Which criteria are ticked, kept in this browser only. */
function useTicks(id: string, count: number) {
  const [ticked, setTicked] = useState<boolean[]>(() => Array(count).fill(false));
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey(id)) ?? 'null');
      if (Array.isArray(raw)) setTicked(Array.from({ length: count }, (_, i) => raw[i] === true));
    } catch {
      /* storage blocked or unreadable: start unticked */
    }
  }, [id, count]);
  const toggle = (i: number) =>
    setTicked((prev) => {
      const next = prev.map((v, k) => (k === i ? !v : v));
      try {
        localStorage.setItem(storeKey(id), JSON.stringify(next));
      } catch {
        /* storage blocked: the ticks last until the page closes */
      }
      return next;
    });
  return [ticked, toggle] as const;
}

function Card({ index }: { index: number }) {
  const p = projects[index];
  const [ticked, toggle] = useTicks(p.id, p.criteria.length);
  const n = ticked.filter(Boolean).length;
  const done = n === p.criteria.length;

  return (
    <article className="lp-card lp-card-col" style={styleObject(cardStyle(cycleSwatch(index * 5 + 2)))} aria-labelledby={`proj-${p.id}`}>
      <span className="lp-body">
        <h3 id={`proj-${p.id}`} style={{ fontSize: '1.2rem' }}>
          {p.title}
        </h3>
        <p style={{ margin: '0.2rem 0 0' }}>
          {levelLabel[p.level]} · {p.hours} hours
        </p>
      </span>
      <p style={{ margin: 0 }}>
        <b>You build:</b> {p.build}
      </p>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ fontFamily: 'var(--font-display)', fontWeight: 700, padding: 0, marginBottom: '0.3rem' }}>
          Done when ({n} of {p.criteria.length})
        </legend>
        {p.criteria.map((c, i) => (
          <label key={c} style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start', margin: '0.3rem 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={ticked[i] ?? false} onChange={() => toggle(i)} style={{ marginTop: '0.3rem', accentColor: 'currentColor' }} />
            <span style={{ textDecoration: ticked[i] ? 'line-through' : 'none', opacity: ticked[i] ? 0.75 : 1 }}>{c}</span>
          </label>
        ))}
        <p role="status" style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', minHeight: '1.2em' }}>
          {done ? 'All ticked. Ticks stay in this browser only.' : 'Ticks stay in this browser only.'}
        </p>
      </fieldset>
      <p style={{ margin: 0 }}>
        <b>Stretch:</b> {p.stretch}
      </p>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>
        <b>You will use:</b> {p.tools.join(', ')}.
      </p>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>
        <b>Learn first:</b>{' '}
        {p.lessons.map((k, i) => (
          <span key={k}>
            {i > 0 && ', '}
            <a href={withBase(`/learn/${k}/`)} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              {titles[k] ?? k}
            </a>
          </span>
        ))}
        .
      </p>
    </article>
  );
}

/**
 * Six projects to build on your own machine. Each has a checklist you can tick as you go;
 * the ticks are saved in this browser and nowhere else.
 */
export default function ProjectCards() {
  return (
    <Root>
      <div className="lp-grid lp-grid-3">
        {projects.map((p, i) => (
          <Card key={p.id} index={i} />
        ))}
      </div>
    </Root>
  );
}
