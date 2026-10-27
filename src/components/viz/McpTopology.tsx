import { motion, useReducedMotion } from 'motion/react';
import { Root } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const PRIMS: { name: string; by: string; glyph: GlyphName }[] = [
  { name: 'Tools', by: 'by model', glyph: 'wrench' },
  { name: 'Resources', by: 'by app', glyph: 'doc' },
  { name: 'Prompts', by: 'by user', glyph: 'pen' },
];

const SX = 466;
const SW = 262;

function Server({ y, title, sub }: { y: number; title: string; sub: string }) {
  return (
    <g>
      <rect x={SX} y={y} width={SW} height="124" rx="12" className="dx-core dx-hot" />
      <text x={SX + 14} y={y + 22} className="dx-name">{title}</text>
      <text x={SX + 14} y={y + 38} className="dx-small">{sub}</text>
      {PRIMS.map((p, i) => {
        const x = SX + 10 + i * 84;
        return (
          <g key={p.name}>
            <rect x={x} y={y + 50} width="78" height="62" rx="8" className="dx-core" />
            <Glyph name={p.glyph} size={20} x={x + 29} y={y + 55} className="ng-glyph" />
            <text x={x + 39} y={y + 92} textAnchor="middle" className="dx-small" style={{ fill: 'var(--ink)' }}>{p.name}</text>
            <text x={x + 39} y={y + 105} textAnchor="middle" className="dx-small">{p.by}</text>
          </g>
        );
      })}
    </g>
  );
}

function Link({ y, label }: { y: number; label: string }) {
  return (
    <g>
      <path d={`M 360 ${y} H 466 M 366 ${y - 5} L 360 ${y} L 366 ${y + 5} M 460 ${y - 5} L 466 ${y} L 460 ${y + 5}`} className="dx-link" />
      <text x="413" y={y - 10} textAnchor="middle" className="dx-small">{label}</text>
    </g>
  );
}

/**
 * One host, two clients, two servers. Each client talks to exactly one server.
 * Every server can offer tools, resources and prompts, and each is used by a
 * different party.
 */
export default function McpTopology() {
  const reduce = useReducedMotion();
  const packet = (y: number, delay: number) =>
    reduce ? null : (
      <motion.circle
        cy={y}
        r="4"
        className="dx-packet"
        initial={{ cx: 368 }}
        animate={{ cx: [368, 458] }}
        transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse', delay }}
      />
    );

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">One host, one client per server</p>
        <svg viewBox="0 0 740 330" className="dx-svg" role="img" aria-label="A host app with a model and two clients. Client 1 talks over HTTP to an issue tracker server. Client 2 talks over stdio to a notes folder server. Each server offers tools, resources and prompts.">
          {/* host */}
          <rect x="14" y="28" width="362" height="294" rx="14" className="dx-frame" />
          <text x="28" y="48" className="dx-small">Host: the assistant app</text>

          <rect x="30" y="130" width="118" height="92" rx="10" className="dx-core" />
          <Glyph name="box" size={26} x={46} y={140} className="ng-glyph" />
          <text x="44" y="190" className="dx-name">Model</text>
          <text x="44" y="206" className="dx-small">asks, you allow</text>

          <path d="M 148 176 H 178 M 178 96 V 248 M 178 96 H 208 M 178 248 H 208 M 202 91 L 208 96 L 202 101 M 202 243 L 208 248 L 202 253" className="dx-link" />

          <rect x="210" y="72" width="150" height="48" rx="10" className="dx-core" />
          <Glyph name="network" size={20} x={220} y={80} className="ng-glyph" />
          <text x="246" y="93" className="dx-name">Client 1</text>
          <text x="222" y="110" className="dx-small">talks to server A</text>

          <rect x="210" y="224" width="150" height="48" rx="10" className="dx-core" />
          <Glyph name="network" size={20} x={220} y={232} className="ng-glyph" />
          <text x="246" y="245" className="dx-name">Client 2</text>
          <text x="222" y="262" className="dx-small">talks to server B</text>

          {/* the two connections */}
          <Link y={96} label="HTTP" />
          <Link y={248} label="stdio" />
          {packet(96, 0)}
          {packet(248, 0.4)}

          <Server y={34} title="Issue tracker" sub="server A, a remote service" />
          <Server y={186} title="Notes folder" sub="server B, on your laptop" />
        </svg>
        <p className="viz-cap">
          Each client talks to exactly one server, and the host keeps the conversation: a server cannot read the chat or see the other server. Under each kind of thing a server offers, who decides to use it.
        </p>
      </div>
    </Root>
  );
}
