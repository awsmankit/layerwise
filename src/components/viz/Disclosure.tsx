import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';

/** Animated open/close block for optional depth inside a lesson. */
export default function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <Root>
      <div className={`dc${open ? ' is-open' : ''}`}>
        <button
          type="button"
          className="dc-head"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{title}</span>
          <span className="sx-plus" aria-hidden="true" />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={id}
              className="dc-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.38, ease: EASE }}
            >
              <div className="dc-inner">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Root>
  );
}
