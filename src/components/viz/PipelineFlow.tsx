import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE, useNarrow } from './shared';
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
  const narrow = useNarrow();

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
  // six or more stages wrap onto two rows so the text stays readable
  const perRow = n > 5 ? Math.ceil(n / 2) : n;
  const rows = Math.ceil(n / perRow);
  const ROW_H = CARD_H + 46;
  const W = perRow * STEP;
  const H = TOP + rows * ROW_H - 46 + (loop ? 60 : 24);
  const col = (i: number) => i % perRow;
  const row = (i: number) => Math.floor(i / perRow);
  const cx = (i: number) => col(i) * STEP + STEP / 2;
  const top = (i: number) => TOP + row(i) * ROW_H;
  const mid = (i: number) => top(i) + CARD_H / 2;
  const bottom = TOP + (rows - 1) * ROW_H + CARD_H;

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

        {narrow ? (
          /* phones: the stages stack top to bottom and a tapped stage opens its text right under it */
          <ol className="pf-steps" aria-label={title ?? 'Pipeline'}>
            {stages.map((s, i) => {
              const state = i === active ? 'is-active' : i < active ? 'is-past' : '';
              const glyph = s.glyph ?? glyphFor(s.title, s.detail.slice(0, 80));
              return (
                <li key={s.title} className={`pf-step ${state}`}>
                  <button
                    type="button"
                    aria-expanded={i === active}
                    onClick={() => {
                      setActive(i);
                      setRunning(false);
                    }}
                  >
                    <span className="pf-num">{i + 1}</span>
                    <Glyph key={i === active ? `on-${active}` : 'off'} name={glyph} draw={i === active} size={24} className="pf-step-glyph" />
                    <span className="pf-name">{s.title}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {i === active && (
                      <motion.p
                        className="pf-step-detail"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: EASE }}
                      >
                        {s.detail}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
            {loop && (
              <li className="pf-step-loop" aria-hidden="true">
                ↻ {loopLabel}
              </li>
            )}
          </ol>
        ) : (
          <>
            <div className="pf-scroll">
              <svg viewBox={`0 0 ${W} ${H}`} className="pf-svg" style={{ minWidth: `${perRow * 112}px`, maxWidth: `${W}px`, marginInline: 'auto' }} role="group" aria-label={title ?? 'Pipeline'}>
                {/* connectors between cards, with a small chevron for direction */}
                {stages.slice(1).map((_, k) => {
                  const lit = k < active;
                  if (row(k) === row(k + 1)) {
                    const x1 = cx(k) + CARD_W / 2;
                    const x2 = cx(k + 1) - CARD_W / 2;
                    const y = mid(k);
                    return (
                      <g key={`c${k}`} className={`pf-conn${lit ? ' is-lit' : ''}`}>
                        <line x1={x1} y1={y} x2={x2 - 2} y2={y} />
                        <path d={`M ${x2 - 7} ${y - 4} L ${x2 - 2} ${y} L ${x2 - 7} ${y + 4}`} />
                      </g>
                    );
                  }
                  // wrap to the next row: down from this card, back along the gap, down into the next
                  const yGap = top(k) + CARD_H + 23;
                  const yTo = top(k + 1) - 2;
                  return (
                    <g key={`c${k}`} className={`pf-conn${lit ? ' is-lit' : ''}`}>
                      <path d={`M ${cx(k)} ${top(k) + CARD_H} V ${yGap} H ${cx(k + 1)} V ${yTo}`} style={{ strokeDasharray: lit ? 'none' : '3 4' }} />
                      <path d={`M ${cx(k + 1) - 4} ${yTo - 5} L ${cx(k + 1)} ${yTo} L ${cx(k + 1) + 4} ${yTo - 5}`} />
                    </g>
                  );
                })}

                {loop && (
                  <g className="pf-loopline">
                    {rows === 1 ? (
                      <>
                        <path d={`M ${cx(n - 1)} ${bottom} V ${H - 26} H ${cx(0)} V ${TOP + CARD_H + 6}`} />
                        <path d={`M ${cx(0) - 4} ${TOP + CARD_H + 12} L ${cx(0)} ${TOP + CARD_H + 5} L ${cx(0) + 4} ${TOP + CARD_H + 12}`} />
                      </>
                    ) : (
                      <>
                        <path d={`M ${cx(n - 1)} ${bottom} V ${H - 26} H 8 V ${mid(0)} H ${cx(0) - CARD_W / 2 - 2}`} />
                        <path d={`M ${cx(0) - CARD_W / 2 - 8} ${mid(0) - 4} L ${cx(0) - CARD_W / 2 - 2} ${mid(0)} L ${cx(0) - CARD_W / 2 - 8} ${mid(0) + 4}`} />
                      </>
                    )}
                    <text x={W / 2} y={H - 10} textAnchor="middle" className="dx-small">
                      {loopLabel}
                    </text>
                  </g>
                )}

                {stages.map((s, i) => {
                  const x = cx(i) - CARD_W / 2;
                  const y = top(i);
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
                      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx="10" />
                      <text x={x + 10} y={y + 17} className="pf-n">
                        {String(i + 1).padStart(2, '0')}
                      </text>
                      <Glyph key={i === active ? `on-${active}` : 'off'} name={glyph} draw={i === active} size={34} x={cx(i) - 17} y={y + 20} className="pf-glyph" />
                      {ls.map((l, k) => (
                        <text key={l} x={cx(i)} y={y + 76 + k * 16 - (ls.length - 1) * 4} textAnchor="middle" className="pf-label">
                          {l}
                        </text>
                      ))}
                    </g>
                  );
                })}

                <motion.circle
                  r="4.5"
                  className="dx-packet"
                  initial={false}
                  animate={{ cx: cx(active), cy: top(active) + CARD_H }}
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
          </>
        )}
        {caption && <p className="viz-cap">{caption}</p>}
      </div>
    </Root>
  );
}
