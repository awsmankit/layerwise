import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';
import { withBase } from '../../lib/url';
import { Glyph, type GlyphName } from './glyphs';

type Layer = {
  id: string;
  glyph: GlyphName;
  color: string;
  title: string;
  line: string;
  before: string;
  points: string[];
  links: { label: string; href: string }[];
};

const layers: Layer[] = [
  {
    id: 'agents',
    glyph: 'wrench',
    color: '#F25F5C',
    title: 'Agents and applications',
    line: 'Where users meet the model',
    before: 'A classical ML model sat behind one endpoint and returned a label or a score.',
    points: [
      'The model decides which tool to call, reads the result and decides again, in a loop.',
      'Memory, planning and permissions become your design problem, not the model’s.',
      'Most production failures live here: bad tool descriptions, runaway loops, unsafe actions.',
    ],
    links: [{ label: 'Agents and tool use', href: '/learn/rag-agents/agents-and-tool-use/' }],
  },
  {
    id: 'retrieval',
    glyph: 'search',
    color: '#12C2A4',
    title: 'Retrieval (RAG)',
    line: 'Giving the model facts it was not trained on',
    before: 'Features came from a feature store; the model never read documents at request time.',
    points: [
      'Documents are chunked, embedded and indexed ahead of time.',
      'At request time, the closest chunks are fetched and placed in the prompt.',
      'Answer quality is capped by retrieval quality, so measure retrieval on its own.',
    ],
    links: [
      { label: 'RAG from scratch', href: '/learn/rag-agents/rag-from-scratch/' },
      { label: 'Chunking and retrieval quality', href: '/learn/rag-agents/chunking-and-retrieval-quality/' },
    ],
  },
  {
    id: 'evals',
    glyph: 'check',
    color: '#FF4F8B',
    title: 'Evals and observability',
    line: 'How you know it works',
    before: 'A held-out test set and one accuracy number were usually enough.',
    points: [
      'Outputs are free text, so you score them with rubrics, reference answers or a judge model.',
      'Vendors update models; your eval suite is what catches silent regressions.',
      'Tracing every request is how you debug a non-deterministic system.',
    ],
    links: [{ label: 'Evals 101', href: '/learn/evals/evals-101/' }],
  },
  {
    id: 'platforms',
    glyph: 'cloud',
    color: '#5BC0FF',
    title: 'Model platforms',
    line: 'AWS, Azure and Google Cloud',
    before: 'You trained, packaged and hosted your own model on your own instances.',
    points: [
      'A managed API gives you many models behind one authenticated endpoint.',
      'Security, quotas, logging and regional availability come from the cloud account.',
      'You rent the model, so the vendor controls its versions and deprecations.',
    ],
    links: [
      { label: 'The cloud AI map', href: '/learn/cloud/cloud-ai-service-map/' },
      { label: 'Choosing a platform', href: '/learn/cloud/bedrock-sagemaker-foundry-vertex/' },
      { label: 'Quotas and capacity', href: '/learn/cloud/quotas-capacity-and-regions/' },
    ],
  },
  {
    id: 'inference',
    glyph: 'bolt',
    color: '#FF9F1C',
    title: 'Inference engineering',
    line: 'Tokens, KV cache, batching',
    before: 'Inference was one forward pass: fixed input size, fixed latency.',
    points: [
      'Prompt processing (prefill) and token generation (decode) have different bottlenecks.',
      'The KV cache trades memory for speed and often decides how many users fit on a GPU.',
      'Batching many users together is what makes per-token prices low.',
    ],
    links: [
      { label: 'Life of a request', href: '/learn/serving/life-of-a-request/' },
      { label: 'KV cache and memory', href: '/learn/serving/kv-cache-and-memory/' },
      { label: 'Inference engines compared', href: '/learn/local/inference-engines-compared/' },
    ],
  },
  {
    id: 'posttraining',
    glyph: 'thumb',
    color: '#9C8CFF',
    title: 'Post-training',
    line: 'From text predictor to assistant',
    before: 'Supervised learning on labelled data was the whole training story.',
    points: [
      'Instruction tuning teaches the model to follow requests.',
      'Preference tuning (RLHF, DPO and relatives) shapes tone, safety and helpfulness.',
      'Reasoning-focused training teaches models to spend tokens thinking before answering.',
    ],
    links: [{ label: 'The training pipeline', href: '/learn/foundations/training-pipeline/' }],
  },
  {
    id: 'pretraining',
    glyph: 'layers',
    color: '#B6E43A',
    title: 'Pretraining and architecture',
    line: 'Transformers learn language from text',
    before: 'Small task-specific models, trained from scratch on labelled data.',
    points: [
      'Next-token prediction on huge corpora produces a general-purpose model.',
      'Attention lets every token look at every other token in parallel.',
      'Scale (data, parameters, compute) improved capability more predictably than expected.',
    ],
    links: [
      { label: 'Attention intuition', href: '/learn/foundations/attention-intuition/' },
      { label: 'From ML to AI timeline', href: '/learn/foundations/ml-to-ai-timeline/' },
    ],
  },
  {
    id: 'hardware',
    glyph: 'chip',
    color: '#FFC233',
    title: 'Hardware and infrastructure',
    line: 'GPUs, instances, clusters, networking',
    before: 'CPUs were often enough; GPUs were for training deep nets.',
    points: [
      'Generating text is mostly limited by how fast weights move from memory, not by arithmetic.',
      'Big models are split across GPUs, and the links between them decide whether that helps.',
      'On a device with a milliwatt budget, the same memory limits decide what can run at all.',
    ],
    links: [
      { label: 'What a GPU is', href: '/learn/infra/gpu-basics/' },
      { label: 'Reading a GPU spec sheet', href: '/learn/infra/reading-a-gpu-spec-sheet/' },
      { label: 'Run models locally', href: '/learn/local/run-models-locally/' },
      { label: 'Edge vs cloud inference', href: '/learn/edge/edge-vs-cloud-inference/' },
    ],
  },
];

/**
 * The layers of an AI product as a stack of outlined slabs, top (what users
 * touch) to bottom (the hardware). Pick a slab to read what changed at that
 * layer and where to learn it. Arrow keys move between slabs.
 */
export default function StackExplorer({ initialOpen = 'platforms' }: { initialOpen?: string }) {
  const [sel, setSel] = useState<string>(initialOpen);
  const panel = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const layer = layers.find((l) => l.id === sel) ?? layers[0];

  const pick = (i: number, focus = false) => {
    setSel(layers[i].id);
    if (focus) tabs.current[i]?.focus();
    // on narrow screens the panel sits below the list, so bring it into view
    if (window.matchMedia('(max-width: 860px)').matches) {
      window.setTimeout(() => panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
    }
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      pick((i + (e.key === 'ArrowDown' ? 1 : layers.length - 1)) % layers.length, true);
    }
  };

  return (
    <Root>
      <div className="sx2" style={{ '--c': layer.color } as React.CSSProperties}>
        <div className="sx2-tabs" role="tablist" aria-orientation="vertical" aria-label="The AI stack, from applications down to hardware">
          {layers.map((l, i) => {
            const on = l.id === sel;
            return (
              <button
                key={l.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`sx2-tab-${l.id}`}
                aria-selected={on}
                aria-controls="sx2-panel"
                tabIndex={on ? 0 : -1}
                className={`sx2-tab${on ? ' is-on' : ''}`}
                style={{ '--c': l.color } as React.CSSProperties}
                onClick={() => pick(i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                {on && <motion.span layoutId="sx2-ring" className="sx2-ring" transition={{ duration: 0.4, ease: EASE }} />}
                <span className="sx2-plate">
                  <Glyph key={on ? `on-${l.id}` : 'off'} name={l.glyph} draw={on} size={24} />
                </span>
                <span className="sx2-name">
                  <b>{l.title}</b>
                  <small>{l.line}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className="sx2-panel" id="sx2-panel" role="tabpanel" aria-labelledby={`sx2-tab-${layer.id}`} ref={panel}>
          <AnimatePresence mode="wait">
            <motion.div key={layer.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
              <h3 className="sx2-title">
                <span className="sx2-plate sx2-plate-lg">
                  <Glyph name={layer.glyph} draw size={32} />
                </span>
                {layer.title}
              </h3>
              <div className="sx2-compare">
                <div className="sx2-before">
                  <small>Before</small>
                  <p>{layer.before}</p>
                </div>
                <svg className="sx2-arrow" viewBox="0 0 40 24" aria-hidden="true">
                  <path d="M2 12 H34 M27 5 L35 12 L27 19" />
                </svg>
                <div className="sx2-now">
                  <small>With LLMs</small>
                  <ul>
                    {layer.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="sx2-links">
                {layer.links.map((l) => (
                  <a key={l.href} href={withBase(l.href)}>
                    {l.label}
                  </a>
                ))}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Root>
  );
}
