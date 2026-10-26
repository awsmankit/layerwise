import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';
import { withBase } from '../../lib/url';

type Layer = {
  id: string;
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

export default function StackExplorer({ initialOpen = 'platforms' }: { initialOpen?: string }) {
  const [open, setOpen] = useState<string | null>(initialOpen);

  return (
    <Root>
      <div className="sx" role="list" aria-label="The AI stack, from applications down to hardware">
        <motion.span
          className="sx-spine"
          aria-hidden="true"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.6, ease: EASE }}
        />
        {layers.map((layer, i) => {
          const isOpen = open === layer.id;
          return (
            <motion.div
              key={layer.id}
              role="listitem"
              className={`sx-layer${isOpen ? ' is-open' : ''}`}
              style={{ '--c': layer.color } as React.CSSProperties}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.11, duration: 0.55, ease: EASE }}
            >
              <button
                type="button"
                className="sx-head"
                aria-expanded={isOpen}
                aria-controls={`sx-${layer.id}`}
                onClick={() => setOpen(isOpen ? null : layer.id)}
              >
                <span className="sx-node" aria-hidden="true">
                  <motion.span
                    className="sx-node-fill"
                    initial={false}
                    animate={{ scale: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                  />
                </span>
                <span className="sx-title">{layer.title}</span>
                <span className="sx-line">{layer.line}</span>
                <span className="sx-plus" aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`sx-${layer.id}`}
                    className="sx-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.42, ease: EASE }}
                  >
                    <div className="sx-inner">
                      <motion.span
                        className="sx-branch"
                        aria-hidden="true"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.5, ease: EASE }}
                      />
                      <p className="sx-before">
                        <b>Before:</b> {layer.before}
                      </p>
                      <ul>
                        {layer.points.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                      <p className="sx-links">
                        {layer.links.map((l) => (
                          <a key={l.href} href={withBase(l.href)}>
                            {l.label}
                          </a>
                        ))}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </Root>
  );
}
