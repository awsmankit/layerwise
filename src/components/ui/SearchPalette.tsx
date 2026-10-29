import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MotionConfig } from 'motion/react';
import { search, type SearchItem } from '../../lib/search';
import { withBase } from '../../lib/url';

const OPEN_EVENT = 'layerwise:search-open';
const SUGGESTIONS = ['kv cache', 'rag', 'cost', 'agents', 'quantization', 'evals'];

/**
 * Command palette. Opens with Cmd/Ctrl+K, "/" or the header button. The index
 * is fetched once, the first time it opens.
 */
export default function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const results = useMemo(() => (items ? search(items, q, 8) : []), [items, q]);

  const close = useCallback(() => {
    setOpen(false);
    returnFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const show = () => {
      returnFocus.current = document.activeElement as HTMLElement;
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(input|textarea|select)$/i.test((e.target as HTMLElement)?.tagName ?? '') || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        show();
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener(OPEN_EVENT, show);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, show);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    if (items || failed) return;
    fetch(withBase('/search.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setItems)
      .catch(() => setFailed(true));
  }, [open, items, failed]);

  useEffect(() => setActive(0), [q]);

  const go = (item: SearchItem) => {
    window.location.href = item.u;
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && results[active]) go(results[active]);
  };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <motion.div
            className="sp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => e.target === e.currentTarget && close()}
          >
            <motion.div
              className="sp"
              role="dialog"
              aria-modal="true"
              aria-label="Search the site"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 520, damping: 32 }}
            >
              <div className="sp-field">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <circle cx="8.5" cy="8.5" r="6" />
                  <path d="M13 13l5 5" />
                </svg>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onInputKey}
                  placeholder="Search lessons, terms, games, calculators and interview questions"
                  aria-label="Search"
                  role="combobox"
                  aria-expanded={results.length > 0}
                  aria-controls="sp-list"
                  aria-activedescendant={results[active] ? `sp-${active}` : undefined}
                  autoComplete="off"
                  spellCheck={false}
                />
                <kbd className="sp-esc">Esc</kbd>
                <button type="button" className="sp-close" onClick={close}>
                  Close
                </button>
              </div>

              {failed && <p className="sp-empty">Search could not load. You can still browse from the menu.</p>}
              {!failed && !q && (
                <div className="sp-empty">
                  <p>Try one of these:</p>
                  <div className="sp-chips">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => setQ(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!failed && q && items && results.length === 0 && <p className="sp-empty">Nothing matches “{q}”. Try a shorter word.</p>}

              {results.length > 0 && (
                <ul id="sp-list" role="listbox" className="sp-list">
                  {results.map((r, i) => (
                    <li key={r.u + r.k} id={`sp-${i}`} role="option" aria-selected={i === active} className={i === active ? 'is-active' : ''} onMouseEnter={() => setActive(i)} onClick={() => go(r)}>
                      <span className={`sp-kind k-${r.k.toLowerCase()}`}>{r.k}</span>
                      <span className="sp-text">
                        <b>{r.t}</b>
                        <small>{r.s}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="sp-foot">
                <kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
