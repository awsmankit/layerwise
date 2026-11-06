import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

type Kind = 'model' | 'code' | 'person';
interface N {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: Kind;
  /** The step (0 to 7) at which this node lights up when the run is played. */
  at: number;
}
interface E {
  d: string;
  dashed?: boolean;
}

/** A line with an arrowhead, from (x1, y1) to (x2, y2). */
function arrow(x1: number, y1: number, x2: number, y2: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = (d: number) => `${(x2 - 5 * Math.cos(a + d)).toFixed(1)} ${(y2 - 5 * Math.sin(a + d)).toFixed(1)}`;
  return `M ${x1} ${y1} L ${x2} ${y2} M ${head(0.5)} L ${x2} ${y2} L ${head(-0.5)}`;
}

const row = (y: number, labels: [string, Kind][], w = 50, gap = 12.5): N[] =>
  labels.map(([label, kind], i) => ({ id: label, x: i * (w + gap), y, w, h: 28, label, kind, at: i }));
const rowEdges = (nodes: N[]): E[] => nodes.slice(0, -1).map((n, i) => ({ d: arrow(n.x + n.w, n.y + n.h / 2, nodes[i + 1].x, nodes[i + 1].y + n.h / 2) }));

interface Flow {
  id: string;
  title: string;
  label: string;
  nodes: N[];
  edges: E[];
  extra?: React.ReactNode;
  frame?: boolean;
  meta: string;
}

const W = 300;

function buildFlows(): Flow[] {
  const single: N[] = [
    { id: 'order', x: 0, y: 40, w: 84, h: 28, label: 'Order data', kind: 'code', at: 0 },
    { id: 'call', x: 108, y: 40, w: 84, h: 28, label: '1 model call', kind: 'model', at: 1 },
    { id: 'draft', x: 216, y: 40, w: 84, h: 28, label: 'Draft reply', kind: 'code', at: 2 },
  ];
  const workflow = row(40, [['Classify', 'model'], ['Look up', 'code'], ['Draft', 'model'], ['Person', 'person'], ['Send', 'code']]);
  const loop: N[] = [
    { id: 'model', x: 0, y: 40, w: 74, h: 40, label: 'Model', kind: 'model', at: 0 },
    { id: 'lookup', x: 160, y: 4, w: 140, h: 24, label: 'look_up_order', kind: 'code', at: 1 },
    { id: 'policy', x: 160, y: 34, w: 140, h: 24, label: 'check_policy', kind: 'code', at: 3 },
    { id: 'ask', x: 160, y: 64, w: 140, h: 24, label: 'ask_person', kind: 'person', at: 5 },
    { id: 'refund', x: 160, y: 94, w: 140, h: 24, label: 'issue_refund', kind: 'code', at: 7 },
  ];
  const graph = row(18, [['Classify', 'model'], ['Look up', 'code'], ['Decide', 'model'], ['Approve', 'person'], ['Reply', 'model']]);
  const multi: N[] = [
    { id: 'lead', x: 100, y: 0, w: 100, h: 26, label: 'Lead agent', kind: 'model', at: 0 },
    { id: 'orders', x: 0, y: 54, w: 88, h: 26, label: 'Orders', kind: 'model', at: 1 },
    { id: 'policy', x: 106, y: 54, w: 88, h: 26, label: 'Policy', kind: 'model', at: 1 },
    { id: 'refunds', x: 212, y: 54, w: 88, h: 26, label: 'Refunds', kind: 'model', at: 3 },
    { id: 'person', x: 212, y: 98, w: 88, h: 26, label: 'Person', kind: 'person', at: 5 },
  ];
  const harness: N[] = [
    { id: 'model', x: 110, y: 54, w: 80, h: 28, label: 'Model', kind: 'model', at: 0 },
    { id: 'loop', x: 10, y: 24, w: 84, h: 22, label: 'Loop', kind: 'code', at: 0 },
    { id: 'tools', x: 108, y: 24, w: 84, h: 22, label: 'Tools', kind: 'code', at: 1 },
    { id: 'context', x: 206, y: 24, w: 84, h: 22, label: 'Context', kind: 'code', at: 2 },
    { id: 'approvals', x: 10, y: 90, w: 84, h: 22, label: 'Approvals', kind: 'person', at: 3 },
    { id: 'sandbox', x: 108, y: 90, w: 84, h: 22, label: 'Sandbox', kind: 'code', at: 4 },
    { id: 'limits', x: 206, y: 90, w: 84, h: 22, label: 'Limits', kind: 'code', at: 5 },
  ];

  const loopEdges: E[] = loop.slice(1).map((t) => ({ d: arrow(74, 60, 158, t.y + 12) }));
  const cx = (n: N) => n.x + n.w / 2;

  return [
    {
      id: 'single',
      title: '1. Single call',
      label: 'Order data goes into the prompt, one model call writes a draft reply, a person reads it in your app',
      nodes: single,
      edges: rowEdges(single),
      extra: <text x="0" y="100" className="dx-small">a person reads the draft in your app</text>,
      meta: '1 model call. Next step: your code. Saved state: none.',
    },
    {
      id: 'workflow',
      title: '2. Fixed workflow',
      label: 'Classify, look up the order, draft a reply and a refund proposal, a person approves, send',
      nodes: workflow,
      edges: rowEdges(workflow),
      extra: <text x="0" y="100" className="dx-small">same steps in the same order every time</text>,
      meta: '2 model calls, always. Next step: your code. Saved state: what your code keeps.',
    },
    {
      id: 'loop',
      title: '3. Agent loop',
      label: 'The model chooses among four tools in turn, repeating until it answers',
      nodes: loop,
      edges: loopEdges,
      extra: <text x="0" y="108" className="dx-small">loops until done</text>,
      meta: '5 model calls this time, and it varies. Next step: the model. Saved state: the message history.',
    },
    {
      id: 'graph',
      title: '4. Graph runtime',
      label: 'Classify, look up, decide, approve, reply as nodes. State is saved after each step, so the approval can wait days',
      nodes: graph,
      edges: rowEdges(graph),
      extra: (
        <g>
          {graph.map((n) => (
            <path key={n.id} d={`M ${cx(n)} ${n.y + n.h} V 78`} className="dx-residual" />
          ))}
          <rect x="0" y="78" width={W} height="22" rx="6" className="dx-frame" />
          <text x={W / 2} y="93" textAnchor="middle" className="dx-small">saved state, one checkpoint per step</text>
          <text x={W} y="120" textAnchor="end" className="dx-small">Approve can wait for days</text>
        </g>
      ),
      meta: '3 model calls, on paths you drew. Next step: your edges, or the model at a branch. Saved state: checkpoints.',
    },
    {
      id: 'multi',
      title: '5. Multi-agent',
      label: 'A lead agent hands the order check and the policy check to two workers and the refund to a third, then a person approves',
      nodes: multi,
      edges: [
        { d: arrow(130, 26, 60, 54) },
        { d: arrow(150, 26, 150, 54) },
        { d: arrow(170, 26, 256, 54) },
        { d: arrow(256, 80, 256, 98) },
      ],
      extra: <text x="0" y="104" className="dx-small">each agent has its own context</text>,
      meta: 'Many calls, and the count varies. Next step: the lead model. Saved state: one context per agent.',
    },
    {
      id: 'harness',
      title: '6. Agent harness',
      label: 'A scaffold around the model with a loop, tools, context management, approvals, a sandbox and limits',
      nodes: harness,
      edges: [],
      frame: true,
      extra: (
        <g>
          <text x="10" y="14" className="dx-small" style={{ fill: 'var(--ink)' }}>harness</text>
          <path d="M 52 46 L 130 54 M 150 46 V 54 M 248 46 L 170 54 M 52 90 L 130 82 M 150 90 V 82 M 248 90 L 170 82" className="dx-residual" />
        </g>
      ),
      meta: 'The loop and its parts. Next step: the model, inside rules the harness enforces. Saved state: managed sessions and notes.',
    },
  ];
}

const FLOWS = buildFlows();
const LAST = 7;

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * One example task, a support bot that looks up an order and asks a person to approve a refund,
 * drawn in each architecture style. "Play" lights the steps in order. Without Play the whole run is shown.
 */
export default function ArchStyleFlows() {
  const [step, setStep] = useState(LAST);
  const [playing, setPlaying] = useState(false);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      const next = stepRef.current + 1;
      if (next >= LAST) {
        setStep(LAST);
        setPlaying(false);
      } else setStep(next);
    }, 750);
    return () => window.clearInterval(t);
  }, [playing]);

  const play = useCallback(() => {
    if (reducedMotion()) {
      setPlaying(false);
      setStep(LAST);
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    setStep(0);
    setPlaying(true);
  }, [playing]);

  const advance = () => {
    setPlaying(false);
    setStep((s) => (s >= LAST ? 0 : s + 1));
  };

  return (
    <Root>
      <div className="viz as-flows">
        <p className="viz-title">The same support task in six styles</p>
        <p className="as-hint">
          Task: a customer asks for a refund on one order. The bot looks the order up and a person approves the refund. Outlines: model call = purple, your code or a tool = plain, a person = yellow.
        </p>
        <div className="as-ctl">
          <button type="button" className="as-opt" onClick={play}>
            {playing ? 'Pause' : 'Play the run'}
          </button>
          <button type="button" className="as-opt" onClick={advance}>
            {step >= LAST ? 'Start stepping' : 'Next step'}
          </button>
          <span className="as-step" aria-live="polite">
            {step >= LAST ? 'Showing the whole run' : `Step ${step + 1} of ${LAST + 1}`}
          </span>
        </div>
        <ul className="as-flowgrid">
          {FLOWS.map((f, i) => (
            <motion.li key={f.id} className="as-flow" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}>
              <h3 className="as-flow-title">{f.title}</h3>
              <svg viewBox={`-2 -2 ${W + 4} 132`} className="as-svg" role="img" aria-label={f.label}>
                {f.frame && <rect x="0" y="0" width={W} height="126" rx="10" className="dx-frame" style={{ strokeDasharray: '5 4' }} />}
                {f.edges.map((e, k) => (
                  <path key={k} d={e.d} className={e.dashed ? 'dx-residual' : 'dx-link'} />
                ))}
                {f.extra}
                {f.nodes.map((n) => {
                  const lit = n.at <= step;
                  const cls = ['as-node', `is-${n.kind}`, lit ? 'is-lit' : ''].join(' ');
                  return (
                    <g key={n.id} className={cls}>
                      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="7" />
                      <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 3.5} textAnchor="middle">
                        {n.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <p className="as-meta">{f.meta}</p>
            </motion.li>
          ))}
        </ul>
        <p className="viz-cap">Example drawings of one task, not a benchmark. Real systems vary: a graph can contain a loop, and a harness can run a workflow.</p>
      </div>
    </Root>
  );
}
