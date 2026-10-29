import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE, useNarrow } from './shared';
import { Glyph, glyphFor } from './glyphs';

type GNode = {
  id: string;
  label: string;
  x: number; // 0-100, percent of width
  y: number; // 0-100, percent of height
  detail: string;
  fails?: string[];
  kind?: 'core' | 'plain';
};

/**
 * Boxes-and-lines diagram. Hairlines draw in when scrolled into view, a node
 * opens a detail panel on click, and "Show flow" sends packets along the
 * edges in their direction.
 */
export default function NodeGraph({
  title,
  nodes,
  edges,
  initial,
  height = 360,
  failuresLabel = 'What goes wrong',
  caption,
}: {
  title?: string;
  nodes: GNode[];
  edges: [string, string][];
  initial?: string;
  height?: number;
  failuresLabel?: string;
  caption?: string;
}) {
  const [sel, setSel] = useState<string>(initial ?? nodes[0].id);
  const [flow, setFlow] = useState(false);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const current = byId[sel];
  const narrow = useNarrow();
  const detailRef = useRef<HTMLDivElement>(null);
  // phones: the boxes become a list in reading order (left to right, then top to bottom),
  // and the lines are spelled out in the detail panel
  const ordered = [...nodes].sort((a, b) => a.x - b.x || a.y - b.y);
  const links = edges.filter(([a, b]) => a === sel || b === sel).map(([a, b]) => byId[a === sel ? b : a].label);
  const pick = (id: string) => {
    setSel(id);
    // keep the text that just changed on screen
    if (narrow) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };

  return (
    <Root>
      <div className="viz ng">
        <div className="pf-top">
          {title && <p className="viz-title">{title}</p>}
          {!narrow && (
            <button type="button" className="btn quiet" aria-pressed={flow} onClick={() => setFlow((f) => !f)}>
              {flow ? 'Hide flow' : 'Show flow'}
            </button>
          )}
        </div>
        {narrow ? (
          <div className="ng-list" role="group" aria-label={title ?? 'Parts of the system'}>
            {ordered.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`ng-node${n.kind === 'core' ? ' core' : ''}${n.id === sel ? ' is-sel' : ''}`}
                aria-pressed={n.id === sel}
                onClick={() => pick(n.id)}
              >
                <Glyph key={n.id === sel ? `on-${sel}` : 'off'} name={glyphFor(n.label, n.detail.slice(0, 80))} draw={n.id === sel} size={20} className="ng-glyph" />
                <span>{n.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="ng-scroll">
            <div className="ng-canvas" style={{ height }}>
              <svg className="ng-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {edges.map(([a, b], i) => {
                  const from = byId[a];
                  const to = byId[b];
                  return (
                    <motion.line
                      key={`${a}-${b}`}
                      x1={from.x}
                      y1={from.y}
                      stroke="var(--ink-3)"
                      strokeWidth={1}
                      strokeDasharray="3 4"
                      vectorEffect="non-scaling-stroke"
                      initial={{ x2: from.x, y2: from.y }}
                      whileInView={{ x2: to.x, y2: to.y }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: EASE }}
                    />
                  );
                })}
              </svg>
              {flow &&
                edges.map(([a, b], i) => {
                  const from = byId[a];
                  const to = byId[b];
                  return (
                    <motion.span
                      key={`p-${a}-${b}`}
                      className="ng-packet"
                      initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0 }}
                      animate={{
                        left: [`${from.x}%`, `${to.x}%`],
                        top: [`${from.y}%`, `${to.y}%`],
                        opacity: [0, 1, 1, 0],
                      }}
                      transition={{ duration: 1.8, delay: (i % 5) * 0.35, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' }}
                      aria-hidden="true"
                    />
                  );
                })}
              {nodes.map((n, i) => (
                <motion.button
                  key={n.id}
                  type="button"
                  className={`ng-node${n.kind === 'core' ? ' core' : ''}${n.id === sel ? ' is-sel' : ''}`}
                  style={{ left: `${n.x}%`, top: `${n.y}%`, x: '-50%', y: '-50%' }}
                  aria-pressed={n.id === sel}
                  onClick={() => setSel(n.id)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
                >
                  <Glyph key={n.id === sel ? `on-${sel}` : 'off'} name={glyphFor(n.label, n.detail.slice(0, 80))} draw={n.id === sel} size={26} className="ng-glyph" />
                  <span>{n.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="ng-detail" aria-live="polite" ref={detailRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={sel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <h3>{current.label}</h3>
              <p>{current.detail}</p>
              {narrow && links.length > 0 && (
                <p className="ng-links">
                  <b>Talks to:</b> {links.join(', ')}
                </p>
              )}
              {current.fails && current.fails.length > 0 && (
                <>
                  <p className="ng-fails-label">{failuresLabel}</p>
                  <ul>
                    {current.fails.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {caption && <p className="viz-cap">{caption}</p>}
      </div>
    </Root>
  );
}
