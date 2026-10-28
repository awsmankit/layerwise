import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';
import { withBase } from '../../lib/url';
import { Glyph, type GlyphName } from './glyphs';
import { cardColors } from '../../lib/color';
import { swatch, layerSwatch } from '../../lib/palette';

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
    color: swatch[layerSwatch[0]],
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
    color: swatch[layerSwatch[1]],
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
    color: swatch[layerSwatch[2]],
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
    color: swatch[layerSwatch[3]],
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
    color: swatch[layerSwatch[4]],
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
    color: swatch[layerSwatch[5]],
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
    color: swatch[layerSwatch[6]],
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
    color: swatch[layerSwatch[7]],
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
 * touch) to bottom (the hardware). Open a slab and its detail unfolds right
 * under it, between that layer and the next, so it scrolls with the page.
 * Arrow keys move between slabs.
 */
export default function StackExplorer({ initialOpen = 'platforms' }: { initialOpen?: string }) {
  const [open, setOpen] = useState<string | null>(initialOpen);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      tabs.current[(i + (e.key === 'ArrowDown' ? 1 : layers.length - 1)) % layers.length]?.focus();
    }
  };

  return (
    <Root>
      <div className="sx2" role="list" aria-label="The AI stack, from applications down to hardware">
        {layers.map((l, i) => {
          const on = l.id === open;
          return (
            <div key={l.id} role="listitem" className={`sx2-item${on ? ' is-on' : ''}`} style={{ '--c': l.color, '--fill': cardColors(l.color).fill, '--on': cardColors(l.color).on } as React.CSSProperties}>
              <button
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                className="sx2-tab"
                aria-expanded={on}
                aria-controls={`sx2-${l.id}`}
                onClick={() => setOpen(on ? null : l.id)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <span className="sx2-plate">
                  <Glyph key={on ? `on-${l.id}` : 'off'} name={l.glyph} draw={on} size={26} />
                </span>
                <span className="sx2-name">
                  <b>{l.title}</b>
                  <small>{l.line}</small>
                </span>
                <span className="sx-plus" aria-hidden="true" />
              </button>

              <AnimatePresence initial={false}>
                {on && (
                  <motion.div
                    id={`sx2-${l.id}`}
                    role="region"
                    aria-label={l.title}
                    className="sx2-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <div className="sx2-compare">
                      <div className="sx2-before">
                        <small>Before</small>
                        <p>{l.before}</p>
                      </div>
                      <svg className="sx2-arrow" viewBox="0 0 40 24" aria-hidden="true">
                        <path d="M2 12 H34 M27 5 L35 12 L27 19" />
                      </svg>
                      <div className="sx2-now">
                        <small>With LLMs</small>
                        <ul>
                          {l.points.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <p className="sx2-links">
                      {l.links.map((k) => (
                        <a key={k.href} href={withBase(k.href)}>
                          {k.label}
                        </a>
                      ))}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Root>
  );
}
