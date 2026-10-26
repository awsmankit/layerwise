import { motion } from 'motion/react';
import { Root, EASE, useDone } from './shared';

/** "Mark as done" toggle with a hairline check that draws itself. */
export function DoneButton({ id }: { id: string }) {
  const { done, toggle } = useDone();
  const isDone = done.includes(id);

  return (
    <Root>
      <button
        type="button"
        className={`btn quiet done-btn${isDone ? ' is-done' : ''}`}
        aria-pressed={isDone}
        onClick={() => toggle(id)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="9" cy="9" r="7.5" />
          <motion.path
            d="M5.2 9.3l2.6 2.6 5-5.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: isDone ? 1 : 0, opacity: isDone ? 1 : 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          />
        </svg>
        {isDone ? 'Completed' : 'Mark as done'}
      </button>
    </Root>
  );
}

/** "3 of 5 lessons done" with a thin progress line. */
export function TrackProgress({ ids }: { ids: string[] }) {
  const { done } = useDone();
  const n = ids.filter((id) => done.includes(id)).length;
  const pct = ids.length ? n / ids.length : 0;

  return (
    <Root>
      <div className="tp" role="img" aria-label={`${n} of ${ids.length} lessons completed`}>
        <span className="tp-text num">
          {n} of {ids.length} done
        </span>
        <span className="tp-bar">
          <motion.span
            className="tp-fill"
            initial={false}
            animate={{ scaleX: pct }}
            transition={{ duration: 0.6, ease: EASE }}
          />
        </span>
      </div>
    </Root>
  );
}
