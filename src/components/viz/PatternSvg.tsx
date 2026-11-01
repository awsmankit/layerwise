import { useMemo } from 'react';
import { PATTERN_BY_ID, type Run } from '../../lib/agent-patterns';
import { edgesOf, geometry, layoutFor, NODE_H, W, type NodeBox } from './agent-pattern-layout';

type NodeState = 'idle' | 'llm' | 'tool' | 'check' | 'done';

/** The boxes-and-arrows picture of one pattern. With a time `t` it lights the box that is working and sends dots along the arrows. */
export default function PatternSvg({ run, t = Infinity }: { run: Run; t?: number }) {
  const checker = run.options.checker;
  const lay = useMemo(() => layoutFor(run.pattern, checker), [run.pattern, checker]);
  const edges = useMemo(() => edgesOf(run, lay.nodes), [run, lay]);
  const info = PATTERN_BY_ID[run.pattern];

  const stateOf = (id: string): { state: NodeState; wrong: boolean } => {
    let state: NodeState = 'idle';
    let wrong = false;
    let any = false;
    let all = true;
    for (const s of run.steps) {
      if (s.actor !== id) continue;
      any = true;
      if (t >= s.start && t < s.end) state = s.kind === 'tool' ? 'tool' : s.kind === 'check' ? 'check' : 'llm';
      if (t < s.end) all = false;
      if (s.wrong && t >= s.end) wrong = true;
    }
    if (state === 'idle' && any && all) state = 'done';
    return { state, wrong };
  };

  const label = `${info.name}. Boxes: ${Object.values(lay.nodes).map((n) => n.label).join(', ')}.${edges.length ? ' Arrows: ' + edges.map((e) => `${lay.nodes[e.from].label} to ${lay.nodes[e.to].label}`).join('; ') + '.' : ''}`;
  const reversed = new Set(edges.filter((e) => edges.some((o) => o.from === e.to && o.to === e.from)).map((e) => e.key));

  return (
    <svg className="ab-svg" viewBox={`0 0 ${W} ${lay.height}`} role="img" aria-label={label}>
      {lay.ghostEdges.map(([from, gi], i) => {
        const g = geometry(lay.nodes[from], lay.ghosts[gi]);
        return <line key={i} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} className="ab-edge is-ghost" />;
      })}
      {lay.ghosts.map((g, i) => (
        <g key={i} className="ab-node is-ghost">
          <rect x={g.x} y={g.y} width={g.w} height={NODE_H} rx={6} />
          <text x={g.x + g.w / 2} y={g.y + NODE_H / 2 + 4.5} textAnchor="middle">{g.label}</text>
        </g>
      ))}

      {lay.selfLoop && <SelfLoop box={lay.nodes[lay.selfLoop]} live={stateOf(lay.selfLoop).state === 'llm' || stateOf(lay.selfLoop).state === 'tool'} />}

      {edges.map((e) => {
        const g = geometry(lay.nodes[e.from], lay.nodes[e.to], reversed.has(e.key) ? 5 : 0);
        const live = e.windows.find(([a, b]) => t >= a && t < b);
        const used = Number.isFinite(t) ? e.windows.some(([a]) => t >= a) : true;
        const p = live ? (t - live[0]) / (live[1] - live[0]) : 0;
        return (
          <g key={e.key}>
            <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} className={'ab-edge' + (used ? ' is-used' : '') + (live ? ' is-live' : '')} />
            <path d={g.head} className={'ab-head' + (used ? ' is-used' : '') + (live ? ' is-live' : '')} />
            {live && <circle cx={g.x1 + (g.x2 - g.x1) * p} cy={g.y1 + (g.y2 - g.y1) * p} r={4.5} className="ab-dot" />}
          </g>
        );
      })}

      {Object.entries(lay.nodes).map(([id, n]) => {
        const { state, wrong } = stateOf(id);
        return <Node key={id} box={n} state={state} wrong={wrong} />;
      })}
    </svg>
  );
}

function Node({ box, state, wrong }: { box: NodeBox; state: NodeState; wrong: boolean }) {
  return (
    <g className={`ab-node is-${state}` + (box.code ? ' is-code' : '') + (wrong ? ' is-wrong' : '')}>
      <rect x={box.x} y={box.y} width={box.w} height={NODE_H} rx={6} />
      <text x={box.x + box.w / 2} y={box.y + NODE_H / 2 + 4.5} textAnchor="middle">{box.label}</text>
      {wrong && (
        <g className="ab-flag">
          <circle cx={box.x + box.w - 2} cy={box.y + 2} r={8} />
          <text x={box.x + box.w - 2} y={box.y + 6.5} textAnchor="middle">!</text>
        </g>
      )}
    </g>
  );
}

function SelfLoop({ box, live }: { box: NodeBox; live: boolean }) {
  const cx = box.x + box.w / 2;
  const y = box.y;
  return (
    <g className={'ab-loop' + (live ? ' is-live' : '')}>
      <path d={`M ${cx - 22} ${y} C ${cx - 30} ${y - 26}, ${cx + 30} ${y - 26}, ${cx + 22} ${y - 3}`} fill="none" />
      <path d={`M ${cx + 17} ${y - 8} L ${cx + 22} ${y - 2} L ${cx + 27} ${y - 9}`} fill="none" />
      <text x={cx} y={y - 31} textAnchor="middle">calls tools in a loop</text>
    </g>
  );
}
