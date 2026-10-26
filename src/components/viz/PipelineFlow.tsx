import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';

type Stage = { title: string; detail: string };

/**
 * A left-to-right sequence. "Run" sends a packet along the line, lighting each
 * stage in turn. Click any stage to read what happens there. `loop` draws the
 * return path used by agent loops.
 */
export default function PipelineFlow({
  title,
  stages,
  loop = false,
  loopLabel = 'repeat until done',
  caption,
}: {
  title?: string;
  stages: Stage[];
  loop?: boolean;
  loopLabel?: string;
  caption?: string;
}) {
  const [active, setActive] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      setActive((a) => {
        if (a >= stages.length - 1) {
          if (loop) return 0;
          setRunning(false);
          return a;
        }
        return a + 1;
      });
    }, 1500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, loop, stages.length]);

  const n = stages.length;
  const pos = ((active + 0.5) / n) * 100;

  return (
    <Root>
      <div className="viz pf">
        <div className="pf-top">
          {title && <p className="viz-title">{title}</p>}
          <button
            type="button"
            className="btn quiet"
            onClick={() => {
              if (!running) setActive(0);
              setRunning((r) => !r);
            }}
          >
            {running ? 'Stop' : 'Run'}
          </button>
        </div>

        <div className="pf-scroll">
          <div className="pf-row" style={{ minWidth: `${n * 132}px` }}>
            <div className="pf-stages" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {stages.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  className={`pf-stage${i === active ? ' is-active' : ''}${i < active ? ' is-past' : ''}`}
                  aria-pressed={i === active}
                  onClick={() => {
                    setActive(i);
                    setRunning(false);
                  }}
                >
                  <span className="pf-num num">{i + 1}</span>
                  <span className="pf-name">{s.title}</span>
                </button>
              ))}
            </div>
            <div className="pf-track" aria-hidden="true">
              <span className="pf-line" />
              <motion.span
                className="pf-packet"
                initial={false}
                animate={{ left: `${pos}%` }}
                transition={{ duration: 0.7, ease: EASE }}
              />
            </div>
            {loop && (
              <div className="pf-loop" aria-hidden="true" style={{ left: `${50 / n}%`, right: `${50 / n}%` }}>
                <span>{loopLabel}</span>
              </div>
            )}
          </div>
        </div>

        <div className="pf-detail" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <b>{stages[active].title}.</b> {stages[active].detail}
            </motion.p>
          </AnimatePresence>
        </div>
        {caption && <p className="viz-cap">{caption}</p>}
      </div>
    </Root>
  );
}
