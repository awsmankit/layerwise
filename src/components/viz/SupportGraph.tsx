import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

type Id = 'start' | 'lookup' | 'decide' | 'person' | 'reply' | 'end';

type Node = { x: number; y: number; w: number; h: number; label: string; sub?: string; glyph?: GlyphName; model?: boolean; entry: [number, number] };

const NODES: Record<Id, Node> = {
  start: { x: 14, y: 112, w: 56, h: 34, label: 'START', entry: [14, 129] },
  lookup: { x: 92, y: 100, w: 148, h: 58, label: 'Look up order', sub: 'plain code', glyph: 'search', entry: [92, 129] },
  decide: { x: 262, y: 100, w: 126, h: 58, label: 'Decide', sub: 'model call', glyph: 'route', model: true, entry: [262, 129] },
  person: { x: 440, y: 36, w: 150, h: 58, label: 'Ask a person', sub: 'approves a refund', glyph: 'user', entry: [440, 65] },
  reply: { x: 440, y: 164, w: 150, h: 58, label: 'Write reply', sub: 'model call', glyph: 'pen', model: true, entry: [440, 193] },
  end: { x: 654, y: 112, w: 56, h: 34, label: 'END', entry: [682, 112] },
};

/** Edges as drawn paths. `cond` marks the two edges a routing function chooses between. */
const EDGES: { from: Id; to: Id; d: string; head: [number, number, 'r' | 'd' | 'u']; cond?: boolean }[] = [
  { from: 'start', to: 'lookup', d: 'M 70 129 H 88', head: [92, 129, 'r'] },
  { from: 'lookup', to: 'decide', d: 'M 240 129 H 258', head: [262, 129, 'r'] },
  { from: 'decide', to: 'person', d: 'M 388 121 H 414 V 65 H 436', head: [440, 65, 'r'], cond: true },
  { from: 'decide', to: 'reply', d: 'M 388 137 H 414 V 193 H 436', head: [440, 193, 'r'], cond: true },
  { from: 'person', to: 'reply', d: 'M 515 94 V 160', head: [515, 164, 'd'] },
  { from: 'reply', to: 'end', d: 'M 590 193 H 682 V 150', head: [682, 146, 'u'] },
];

const SCENARIOS = {
  question: { name: 'Where is my order?', path: ['start', 'lookup', 'decide', 'reply', 'end'] as Id[] },
  refund: { name: 'I want a refund', path: ['start', 'lookup', 'decide', 'person', 'reply', 'end'] as Id[] },
};
type Key = keyof typeof SCENARIOS;

/** What the shared state holds after the node at `step` has run. */
function stateAt(path: Id[], step: number) {
  const ran = path.slice(0, step + 1);
  const has = (id: Id) => ran.includes(id);
  const here = path[step];
  return {
    messages: has('reply') ? 2 : has('start') ? 1 : 0,
    order: has('lookup') ? '#1042 shipped' : 'empty',
    approved: has('person') ? 'yes' : path.includes('person') ? 'empty' : 'not needed',
    changed: here === 'lookup' ? 'order' : here === 'person' ? 'approved' : here === 'start' || here === 'reply' ? 'messages' : null,
  };
}

const head = (x: number, y: number, dir: string) => {
  if (dir === 'd') return `M ${x - 4} ${y - 6} L ${x} ${y} L ${x + 4} ${y - 6}`;
  if (dir === 'u') return `M ${x - 4} ${y + 6} L ${x} ${y} L ${x + 4} ${y + 6}`;
  return `M ${x - 6} ${y - 4} L ${x} ${y} L ${x - 6} ${y + 4}`;
};

/**
 * The running example as a LangGraph-style graph. Nodes do the work, edges say
 * what comes next, one conditional edge chooses between two, and every node
 * reads and writes the same shared state. Pick a customer message to see which
 * path it takes.
 */
export default function SupportGraph() {
  const reduce = useReducedMotion();
  const [key, setKey] = useState<Key>('refund');
  const path = SCENARIOS[key].path;
  const [step, setStep] = useState(0);
  const last = path.length - 1;
  const shown = reduce ? last : step;

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setStep((s) => (s >= last ? 0 : s + 1)), step >= last ? 2400 : 1050);
    return () => clearTimeout(t);
  }, [step, last, reduce]);

  const pick = (k: Key) => {
    setKey(k);
    setStep(0);
  };

  const st = stateAt(path, shown);
  const visited = (id: Id) => path.indexOf(id) !== -1 && path.indexOf(id) <= shown;
  const onPath = (id: Id) => path.includes(id);
  const edgeLit = (from: Id, to: Id) => {
    const i = path.indexOf(from);
    return i !== -1 && path[i + 1] === to && i + 1 <= shown;
  };
  const edgeOn = (from: Id, to: Id) => {
    const i = path.indexOf(from);
    return i !== -1 && path[i + 1] === to;
  };
  const [px, py] = NODES[path[shown]].entry;

  const chips = [
    { k: 'messages', text: `messages: ${st.messages}` },
    { k: 'order', text: `order: ${st.order}` },
    { k: 'approved', text: `approved: ${st.approved}` },
  ];

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">A support bot as a graph</p>
          <div className="dx-steps" role="group" aria-label="Customer message">
            {(Object.keys(SCENARIOS) as Key[]).map((k) => (
              <button key={k} type="button" className="btn quiet" aria-pressed={key === k} onClick={() => pick(k)}>
                {SCENARIOS[k].name}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 740 300" className="dx-svg" role="img" aria-label={`A graph of five nodes. For the message "${SCENARIOS[key].name}" the run goes ${path.join(', then ')}. A conditional edge after Decide chooses whether to ask a person.`}>
          {EDGES.map((e) => {
            const lit = edgeLit(e.from, e.to);
            const on = edgeOn(e.from, e.to);
            return (
              <g key={`${e.from}-${e.to}`} style={{ opacity: on || !e.cond ? 1 : 0.4 }}>
                <path d={e.d} className="dx-link" style={{ stroke: lit ? 'var(--signal)' : undefined, strokeOpacity: lit ? 1 : undefined, strokeDasharray: e.cond && !lit ? '4 3' : undefined }} />
                <path d={head(e.head[0], e.head[1], e.head[2])} className="dx-link" style={{ stroke: lit ? 'var(--signal)' : undefined, strokeOpacity: lit ? 1 : undefined }} />
              </g>
            );
          })}
          <text x="408" y="88" textAnchor="end" className="dx-small">asks for a refund</text>
          <text x="408" y="178" textAnchor="end" className="dx-small">just a question</text>
          <text x="522" y="130" className="dx-small">approved or not</text>

          {(Object.keys(NODES) as Id[]).map((id) => {
            const n = NODES[id];
            const pill = !n.sub;
            const hot = visited(id);
            return (
              <motion.g key={id} initial={false} animate={{ opacity: onPath(id) ? 1 : 0.35 }} transition={{ duration: 0.3, ease: EASE }}>
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={pill ? 17 : 10} className={hot ? 'dx-core dx-hot' : 'dx-core'} />
                {pill ? (
                  <text x={n.x + n.w / 2} y={n.y + 21} textAnchor="middle" className="dx-small" style={{ fill: 'var(--ink)' }}>
                    {n.label}
                  </text>
                ) : (
                  <>
                    <Glyph name={n.glyph!} size={22} x={n.x + 9} y={n.y + 9} className={n.model ? 'dx-glyph-hot' : 'ng-glyph'} />
                    <text x={n.x + 38} y={n.y + 25} className="dx-name">
                      {n.label}
                    </text>
                    <text x={n.x + 38} y={n.y + 43} className="dx-small">
                      {n.sub}
                    </text>
                  </>
                )}
              </motion.g>
            );
          })}

          <motion.circle r="5.5" className="dx-packet" initial={false} animate={{ cx: px, cy: py }} transition={{ duration: 0.6, ease: EASE }} />

          {/* the shared state every node reads and writes */}
          <rect x="14" y="238" width="712" height="52" rx="10" className="dx-frame" />
          <text x="26" y="261" className="dx-small">shared state</text>
          {chips.map((c, i) => (
            <g key={c.k}>
              <rect x={132 + i * 196} y="248" width="186" height="32" rx="8" className={st.changed === c.k ? 'dx-core dx-hot' : 'dx-core'} />
              <text x={132 + i * 196 + 93} y="269" textAnchor="middle" className="dx-small" style={{ fill: 'var(--ink)' }}>
                {c.text}
              </text>
            </g>
          ))}
        </svg>
        <p className="viz-cap">
          Nodes do the work and edges say what runs next. After Decide, a routing function picks one edge. Each node reads the shared state and returns an update to it.
        </p>
      </div>
    </Root>
  );
}
