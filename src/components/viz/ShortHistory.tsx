import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';
import { ERA_LABEL, HISTORY, type Era } from '../../lib/ai-history';

const ERAS: Era[] = ['rules', 'winter', 'learning', 'chat'];

/**
 * A vertical timeline of AI history as plain accessible HTML: each event is a
 * button that opens a two-sentence card and a "what changed" note. Not a wide
 * SVG, so it reads the same on a phone.
 */
export default function ShortHistory() {
  const [open, setOpen] = useState<Set<string>>(() => new Set([HISTORY[0].id]));
  const allOpen = open.size === HISTORY.length;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Root>
      <div className="viz wsa-tl">
        <p className="viz-title">AI, from 1950 to now: tap an event</p>

        <ul className="wsa-legend" aria-label="Colour key">
          {ERAS.map((e) => (
            <li key={e} className={`wsa-key wsa-era-${e}`}>
              <span className="wsa-swatch" aria-hidden="true" />
              {ERA_LABEL[e]}
            </li>
          ))}
        </ul>

        <button type="button" className="wsa-all" onClick={() => setOpen(allOpen ? new Set() : new Set(HISTORY.map((h) => h.id)))}>
          {allOpen ? 'Close all' : 'Open all'}
        </button>

        <ol className="wsa-rail">
          {HISTORY.map((h) => {
            const isOpen = open.has(h.id);
            return (
              <li key={h.id} className={`wsa-ev wsa-era-${h.era}${isOpen ? ' is-open' : ''}`}>
                <span className="wsa-dot" aria-hidden="true" />
                <button type="button" className="wsa-head" aria-expanded={isOpen} aria-controls={`wsa-p-${h.id}`} onClick={() => toggle(h.id)}>
                  <span className="wsa-when">{h.when}</span>
                  <span className="wsa-title">{h.title}</span>
                  <span className="wsa-tag">{ERA_LABEL[h.era]}</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="panel"
                      id={`wsa-p-${h.id}`}
                      className="wsa-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                    >
                      <p className="wsa-card">{h.card}</p>
                      <p className="wsa-changed">
                        <b>What changed:</b> {h.changed}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>

        <p className="viz-cap">The dates are the years when each thing was published or happened. The winters are rough periods, and historians do not agree on exact start and end years.</p>
      </div>
    </Root>
  );
}
