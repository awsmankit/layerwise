import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE, useDone } from './shared';
import { withBase } from '../../lib/url';

type Group = {
  id: string;
  title: string;
  lessons: { slug: string; title: string; level: number }[];
};

/** Sidebar outline: tracks open and close, the current lesson is marked. */
export default function TrackTree({
  groups,
  currentTrack,
  currentSlug,
}: {
  groups: Group[];
  currentTrack: string;
  currentSlug: string;
}) {
  const [openIds, setOpenIds] = useState<string[]>([currentTrack]);
  const { done } = useDone();

  const toggle = (id: string) =>
    setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <Root>
      <nav className="tt" aria-label="All lessons">
        {groups.map((g) => {
          const isOpen = openIds.includes(g.id);
          const finished = g.lessons.filter((l) => done.includes(`${g.id}/${l.slug}`)).length;
          return (
            <div key={g.id} className={`tt-group${isOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="tt-head"
                aria-expanded={isOpen}
                onClick={() => toggle(g.id)}
              >
                <span className="tt-name">{g.title}</span>
                <span className="tt-count num">
                  {finished}/{g.lessons.length}
                </span>
                <span className="sx-plus" aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul
                    className="tt-list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.34, ease: EASE }}
                  >
                    {g.lessons.map((l) => {
                      const isCurrent = g.id === currentTrack && l.slug === currentSlug;
                      const isDone = done.includes(`${g.id}/${l.slug}`);
                      return (
                        <li key={l.slug}>
                          <a
                            href={withBase(`/learn/${g.id}/${l.slug}/`)}
                            aria-current={isCurrent ? 'page' : undefined}
                            className={isDone ? 'is-done' : undefined}
                          >
                            <span className="tt-dot" aria-hidden="true" />
                            {l.title}
                          </a>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </Root>
  );
}
