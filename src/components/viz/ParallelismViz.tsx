import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';

type Mode = 'data' | 'tensor' | 'pipeline' | 'expert';

const modes: { id: Mode; label: string; split: string; talks: string; use: string; cost: string }[] = [
  {
    id: 'data',
    label: 'Data parallel',
    split: 'Nothing about the model is split. Every GPU holds a full copy and works on a different slice of the batch.',
    talks: 'In training, gradients are averaged across GPUs once per step. In serving, nothing needs to be exchanged: copies just share the traffic.',
    use: 'The model fits on one GPU and you want more throughput. The simplest and most scalable choice.',
    cost: 'Memory: every copy pays for the full weights.',
  },
  {
    id: 'tensor',
    label: 'Tensor parallel',
    split: 'Each layer’s big matrices are cut into slices, one per GPU, so every GPU does part of every layer.',
    talks: 'Partial results are combined after each layer, often twice per layer. That is a lot of traffic, every step.',
    use: 'The model does not fit on one GPU, or you need lower latency. Keep it inside one server with NVLink-class links.',
    cost: 'Needs very fast GPU-to-GPU bandwidth. Over a slow link it can be slower than one GPU.',
  },
  {
    id: 'pipeline',
    label: 'Pipeline parallel',
    split: 'Layers are grouped into stages, one stage per GPU. A batch flows through the stages in order.',
    talks: 'Only the activations at stage boundaries move, once per stage. Far less traffic than tensor parallel.',
    use: 'Very large models across several servers, where links between servers are slower.',
    cost: '“Bubbles”: GPUs sit idle while the pipeline fills and drains. Micro-batches reduce them.',
  },
  {
    id: 'expert',
    label: 'Expert parallel',
    split: 'In a mixture-of-experts model, different experts live on different GPUs. A router sends each token to a few of them.',
    talks: 'Tokens are shuffled to their experts and back. Traffic depends on how evenly the router spreads tokens.',
    use: 'Mixture-of-experts models, where only a few experts are active per token but all must be stored.',
    cost: 'Load imbalance: a popular expert becomes the bottleneck while others idle.',
  },
];

const GPU_X = [40, 190, 340, 490];
const GW = 110;

function Gpu({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <g transform={`translate(${GPU_X[i]} 30)`}>
      <rect width={GW} height={170} rx={10} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
      <text x={GW / 2} y={-8} textAnchor="middle" className="pv-label">
        GPU {i + 1}
      </text>
      {children}
    </g>
  );
}

const COLORS = ['#F25F5C', '#12C2A4', '#FF9F1C', '#5BC0FF'];

function Packet({ from, to, y, delay, color = 'var(--signal)' }: { from: number; to: number; y: number; delay: number; color?: string }) {
  return (
    <motion.circle
      r={5}
      fill={color}
      stroke="var(--ink)"
      strokeWidth={1.5}
      initial={{ cx: from, cy: y, opacity: 0 }}
      animate={{ cx: [from, to], cy: [y, y], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.6, delay, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' }}
    />
  );
}

function Diagram({ mode }: { mode: Mode }) {
  return (
    <svg viewBox="0 0 640 230" className="pv-svg" role="img" aria-label={`Four GPUs arranged for ${mode} parallelism`}>
      {mode === 'data' &&
        [0, 1, 2, 3].map((i) => (
          <Gpu key={i} i={i}>
            {[0, 1, 2, 3].map((l) => (
              <rect key={l} x={12} y={14 + l * 28} width={GW - 24} height={20} rx={4} fill="var(--tint-lilac)" stroke="var(--ink)" strokeWidth={1.5} />
            ))}
            <text x={GW / 2} y={140} textAnchor="middle" className="pv-note">
              full copy
            </text>
            <rect x={22} y={150} width={GW - 44} height={10} rx={3} fill={COLORS[i]} stroke="var(--ink)" strokeWidth={1.2} />
          </Gpu>
        ))}
      {mode === 'tensor' &&
        [0, 1, 2, 3].map((i) => (
          <Gpu key={i} i={i}>
            {[0, 1, 2, 3].map((l) => (
              <rect key={l} x={12} y={14 + l * 28} width={GW - 24} height={20} rx={4} fill={COLORS[i]} opacity={0.85} stroke="var(--ink)" strokeWidth={1.5} />
            ))}
            <text x={GW / 2} y={140} textAnchor="middle" className="pv-note">
              slice {i + 1} of every layer
            </text>
          </Gpu>
        ))}
      {mode === 'pipeline' &&
        [0, 1, 2, 3].map((i) => (
          <Gpu key={i} i={i}>
            {[0, 1].map((l) => (
              <rect key={l} x={12} y={20 + l * 34} width={GW - 24} height={26} rx={4} fill={COLORS[i]} opacity={0.85} stroke="var(--ink)" strokeWidth={1.5} />
            ))}
            <text x={GW / 2} y={140} textAnchor="middle" className="pv-note">
              layers {i * 2 + 1} and {i * 2 + 2}
            </text>
          </Gpu>
        ))}
      {mode === 'expert' &&
        [0, 1, 2, 3].map((i) => (
          <Gpu key={i} i={i}>
            {[0, 1].map((l) => (
              <rect key={l} x={12 + l * 46} y={34} width={38} height={56} rx={6} fill={COLORS[i]} opacity={0.85} stroke="var(--ink)" strokeWidth={1.5} />
            ))}
            <text x={GW / 2} y={140} textAnchor="middle" className="pv-note">
              experts {i * 2 + 1} and {i * 2 + 2}
            </text>
          </Gpu>
        ))}

      {/* what travels between them */}
      {mode === 'data' && <text x={320} y={222} textAnchor="middle" className="pv-note">different slices of the batch in, copies stay independent</text>}
      {mode === 'tensor' && (
        <g>
          {[0, 1, 2].map((k) => (
            <Packet key={k} from={GPU_X[k] + GW} to={GPU_X[k + 1]} y={96} delay={k * 0.15} />
          ))}
          {[0, 1, 2].map((k) => (
            <Packet key={`b${k}`} from={GPU_X[k + 1]} to={GPU_X[k] + GW} y={120} delay={0.3 + k * 0.15} color="#FF4F8B" />
          ))}
          <text x={320} y={222} textAnchor="middle" className="pv-note">partial results exchanged after every layer</text>
        </g>
      )}
      {mode === 'pipeline' && (
        <g>
          {[0, 1, 2].map((k) => (
            <Packet key={k} from={GPU_X[k] + GW} to={GPU_X[k + 1]} y={108} delay={k * 0.55} />
          ))}
          <text x={320} y={222} textAnchor="middle" className="pv-note">activations move forward once per stage</text>
        </g>
      )}
      {mode === 'expert' && (
        <g>
          <Packet from={GPU_X[0] + GW} to={GPU_X[2]} y={104} delay={0} />
          <Packet from={GPU_X[1] + GW} to={GPU_X[3]} y={118} delay={0.4} color="#FF4F8B" />
          <Packet from={GPU_X[3]} to={GPU_X[0] + GW} y={132} delay={0.8} color="#12C2A4" />
          <text x={320} y={222} textAnchor="middle" className="pv-note">tokens routed to their experts and back</text>
        </g>
      )}
    </svg>
  );
}

export default function ParallelismViz() {
  const [mode, setMode] = useState<Mode>('tensor');
  const m = modes.find((x) => x.id === mode)!;

  return (
    <Root>
      <div className="viz pv">
        <div className="tc-tabs" role="tablist" aria-label="Parallelism strategies">
          {modes.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={x.id === mode} className={`tc-tab${x.id === mode ? ' is-active' : ''}`} onClick={() => setMode(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
            <Diagram mode={mode} />
            <dl className="pv-facts">
              <div>
                <dt>What is split</dt>
                <dd>{m.split}</dd>
              </div>
              <div>
                <dt>What travels between GPUs</dt>
                <dd>{m.talks}</dd>
              </div>
              <div>
                <dt>Use it when</dt>
                <dd>{m.use}</dd>
              </div>
              <div>
                <dt>The catch</dt>
                <dd>{m.cost}</dd>
              </div>
            </dl>
          </motion.div>
        </AnimatePresence>
        <p className="viz-cap">A schematic. Real systems combine these: for example tensor parallel inside a server, pipeline parallel across servers, and data parallel copies of the whole arrangement.</p>
      </div>
    </Root>
  );
}
