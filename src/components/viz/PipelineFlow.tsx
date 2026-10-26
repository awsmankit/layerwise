import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, glyphFor, type GlyphName } from './glyphs';

type Stage = { title: string; detail: string; glyph?: GlyphName };

const STEP = 150;
const CARD_W = 124;
const CARD_H = 112;
const TOP = 16;

/** Split a title into at most two lines of roughly equal length. */
function lines(title: string): string[] {
  if (title.length <= 15) return [title];
  const words = title.split(' ');
  let best = [title];
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const gap = Math.abs(a.length - b.length);
    if (gap < bestGap) {
      bestGap = gap;
      best = [a, b];
    }
  }
  return best;
}

/**
 * A left-to-right sequence drawn as outlined cards, each with a hairline glyph
 * for what happens there. "Run" sends a packet along the line, lighting each
 * stage in turn; clicking a card reads it. `loop` draws the return path used
 * by agent and training loops.
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

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setActive((a) => {
        if (a >= stages.length - 1) {
          if (loop) return 0;
          setRunning(false);
          return a;
        }
        return a + 1;
      });
    }, 1500);
    return () => clearInterval(t);
  }, [running, loop, stages.length]);

  const n = stages.length;
  const W = n * STEP;
  const H = loop ? 196 : 160;
  const cx = (i: number) => i * STEP + STEP / 2;
  const mid = TOP + CARD_H / 2;

  return (
    <Root>
      <div className="viz pf dx">
        <div className="dx-top">
          {title && <p className="viz-title">{title}</p>}
          <button
            type="button"
            className="btn quiet"
            aria-pressed={running}
            onClick={() => {
              if (!running) setActive(0);
              setRunning((r) => !r);
            }}
          >
            {running ? 'Stop' : 'Run'}
          </button>
        </div>

        <div className="pf-scroll">
          <svg viewBox={`0 0 ${W} ${H}`} className="pf-svg" style={{ minWidth: `${n * 118}px` }} role="group" aria-label={title ?? 'Pipeline'}>
            {/* connectors between cards, with a small chevron for direction */}
            {stages.slice(1).map((_, k) => {
              const x1 = cx(k) + CARD_W / 2;
              const x2 = cx(k + 1) - CARD_W / 2;
              const lit = k < active;
              return (
                <g key={`c${k}`} className={`pf-conn${lit ? ' is-lit' : ''}`}>
                  <line x1={x1} y1={mid} x2={x2 - 2} y2={mid} />
                  <path d={`M ${x2 - 7} ${mid - 4} L ${x2 - 2} ${mid} L ${x2 - 7} ${mid + 4}`} />
                </g>
              );
            })}

            {loop && (
              <g className="pf-loopline">
                <path d={`M ${cx(n - 1)} ${TOP + CARD_H} V ${H - 26} H ${cx(0)} V ${TOP + CARD_H + 6}`} />
                <path d={`M ${cx(0) - 4} ${TOP + CARD_H + 12} L ${cx(0)} ${TOP + CARD_H + 5} L ${cx(0) + 4} ${TOP + CARD_H + 12}`} />
                <text x={W / 2} y={H - 10} textAnchor="middle" className="dx-small">
                  {loopLabel}
                </text>
              </g>
            )}

            {stages.map((s, i) => {
              const x = cx(i) - CARD_W / 2;
              const state = i === active ? 'is-active' : i < active ? 'is-past' : '';
              const glyph = s.glyph ?? glyphFor(s.title, s.detail.slice(0, 80));
              const ls = lines(s.title);
              return (
                <g
                  key={s.title}
                  className={`pf-card ${state}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={i === active}
                  aria-label={`${i + 1}. ${s.title}`}
                  onClick={() => {
                    setActive(i);
                    setRunning(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActive(i);
                      setRunning(false);
                    }
                  }}
                >
                  <rect x={x} y={TOP} width={CARD_W} height={CARD_H} rx="10" />
                  <text x={x + 10} y={TOP + 17} className="pf-n">
                    {String(i + 1).padStart(2, '0')}
                  </text>
                  <Glyph key={i === active ? `on-${active}` : 'off'} name={glyph} draw={i === active} size={34} x={cx(i) - 17} y={TOP + 20} className="pf-glyph" />
                  {ls.map((l, k) => (
                    <text key={l} x={cx(i)} y={TOP + 76 + k * 16 - (ls.length - 1) * 4} textAnchor="middle" className="pf-label">
                      {l}
                    </text>
                  ))}
                </g>
              );
            })}

            <motion.circle
              r="4.5"
              cy={TOP + CARD_H}
              className="dx-packet"
              initial={false}
              animate={{ cx: cx(active) }}
              transition={{ duration: 0.7, ease: EASE }}
            />
          </svg>
        </div>

        <div className="pf-detail" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <b>{stages[active].title}.</b> {stages[active].detail}
            </motion.p>
          </AnimatePresence>
        </div>
        {caption && <p className="viz-cap">{caption}</p>}
      </div>
    </Root>
  );
}
