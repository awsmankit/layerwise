import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import '../../styles/w6-hero.css';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';
import { withBase } from '../../lib/url';
import { COMFORT_EVENT, isCalm } from '../../lib/comfort';
import { BODY_H, NOTE_CHARS, STAGE_W, cellLayout, loopCentres, loopPath, wrapText, type Stage, type StageScene } from '../../lib/hero-scenes';

/*
 * Draws any stage-based Scene in the same frame as HeroFlow: four stages left to right that ghost in as the loop reaches
 * them, a Pause button, a "How it works" link, and the finished picture with no motion for readers who ask for less.
 * Phones get one stage at a time with four progress dots. Every coordinate that comes from sin, cos or a division is
 * rounded, so the server and the browser print the same markup.
 */

const GHOST = 0.14;
type Phase = 0 | 1 | 2 | 3 | 4;
/** How long each phase lasts: the four stages arrive one by one, then the whole picture rests before it loops. */
const WAIT = [1700, 2700, 2700, 3000, 3200];

const r1 = (n: number): number => Math.round(n * 10) / 10;
const arrow = (x1: number, y: number, x2: number) => `M ${x1} ${y} H ${x2} M ${x2 - 6} ${y - 5} L ${x2} ${y} L ${x2 - 6} ${y + 5}`;

/** True when the reader has asked for less motion in the device settings or with the comfort menu's calm mode. */
function useStill(): boolean {
  const reduce = useReducedMotion();
  const [calm, setCalm] = useState(false);
  // the server cannot know the reader's settings, so the first client render must match it; the settings apply right after
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    const sync = () => setCalm(isCalm());
    sync();
    window.addEventListener(COMFORT_EVENT, sync);
    return () => window.removeEventListener(COMFORT_EVENT, sync);
  }, []);
  return ready && (!!reduce || calm);
}

export default function HeroScenes({ scene }: { scene: StageScene }) {
  const still = useStill();
  const [phase, setPhase] = useState<Phase>(0);
  const [cycle, setCycle] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);

  const shownPhase: Phase = still ? 4 : phase;

  useEffect(() => {
    if (still || !playing) return;
    const t = setTimeout(() => {
      if (phase === 4) {
        setCycle((c) => c + 1);
        setPhase(0);
      } else setPhase((p) => (p + 1) as Phase);
    }, WAIT[phase]);
    return () => clearTimeout(t);
  }, [phase, playing, still]);

  const ox = (i: number) => 4 + i * 290;
  const mid = 14 + 14 + BODY_H / 2;
  const motionOn = !still && playing;

  return (
    <Root>
      <div className="lp-flow">
        <div className="lp-flow-head">
          <p>{scene.title}</p>
          <div className="lp-flow-tools">
            {!still && (
              <button type="button" className="btn quiet lp-mini" aria-pressed={!playing} onClick={() => setPlaying((p) => !p)}>
                {playing ? 'Pause' : 'Play'}
              </button>
            )}
            <a className="btn quiet lp-mini" href={withBase(`/learn/${scene.lesson}/`)}>
              How it works
            </a>
          </div>
        </div>

        {/* wide screens: four stages left to right */}
        <svg viewBox="0 0 1130 200" className="lp-flow-wide" role="img" aria-label={scene.alt}>
          {[0, 1, 2].map((i) => (
            <path key={i} d={arrow(ox(i) + 256, mid, ox(i + 1) - 8)} className={`lp-arrow${shownPhase > i ? ' is-lit' : ''}`} />
          ))}
          {scene.stages.map((st, i) => (
            <g key={i} transform={`translate(${ox(i)} 14)`}>
              <StageView stage={st} visible={shownPhase >= i} motionOn={motionOn} still={still} intro={false} />
            </g>
          ))}
        </svg>

        {/* narrow screens: only the stage in progress, with four progress marks */}
        <svg viewBox="0 0 270 230" className="lp-flow-compact" role="img" aria-label={scene.alt}>
          <g transform="translate(10 18)">
            <StageView
              key={`${cycle}-${Math.min(shownPhase, 3)}`}
              stage={scene.stages[Math.min(shownPhase, 3)]}
              visible
              motionOn={motionOn}
              still={still}
              intro={live && !still}
            />
          </g>
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={103 + i * 22} cy="218" r="4" className={i === Math.min(shownPhase, 3) ? 'dx-packet' : 'dx-core'} />
          ))}
        </svg>

        <p className="lp-flow-cap">{scene.caption}</p>
      </div>
    </Root>
  );
}

/** One stage: its label, the picture for its kind, and a small note under it. */
function StageView({ stage, visible, motionOn, still, intro }: { stage: Stage; visible: boolean; motionOn: boolean; still: boolean; intro: boolean }) {
  const note = wrapText(stage.note, NOTE_CHARS);
  return (
    <motion.g initial={false} animate={{ opacity: visible ? 1 : GHOST }} transition={{ duration: 0.45, ease: EASE }}>
      <text x="0" y="0" className="hs-label">
        {stage.label}
      </text>
      <Body stage={stage} visible={visible} motionOn={motionOn && visible} still={still} intro={intro} />
      {note.map((line, k) => (
        <text key={k} x="0" y={158 + k * 15} className="hs-note">
          {line}
        </text>
      ))}
    </motion.g>
  );
}

function Body({ stage, visible, motionOn, still, intro }: { stage: Stage; visible: boolean; motionOn: boolean; still: boolean; intro: boolean }) {
  const hidden = (extra: object = {}) => (intro ? { opacity: 0, ...extra } : false as const);
  switch (stage.kind) {
    case 'text': {
      const n = stage.lines.length;
      const top = 14;
      const h = 112;
      const cy = top + h / 2;
      return (
        <>
          <rect x="0" y={top} width={STAGE_W} height={h} rx="14" className="dx-core" />
          <Glyph name={stage.glyph} size={26} x={14} y={cy - 13} className="ng-glyph" />
          {stage.lines.map((l, i) => (
            <text key={i} x="52" y={cy - ((n - 1) * 22) / 2 + i * 22 + 5} className="hs-q">
              {l}
            </text>
          ))}
        </>
      );
    }
    case 'chips': {
      const withSub = stage.chips.some((c) => c.sub);
      const h = withSub ? 44 : 34;
      return (
        <>
          {stage.chips.map((c, i) => {
            const x = (i % 4) * 63.4;
            const y = 14 + Math.floor(i / 4) * (h + 10);
            const isHot = stage.hot ? stage.hot.includes(i) : true;
            const shown = visible;
            return (
              <motion.g
                key={i}
                initial={hidden({ y: 6 })}
                animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 6 }}
                transition={{ duration: 0.3, delay: shown && !still ? (stage.reveal ? 0.15 + 0.26 * i : 0.05 * i) : 0, ease: EASE }}
              >
                <rect x={r1(x)} y={y} width="60" height={h} rx="8" className={isHot ? 'dx-core dx-hot' : 'dx-core'} />
                <text x={r1(x + 30)} y={withSub ? y + 18 : y + h / 2 + 4} textAnchor="middle" className="hs-chip">
                  {c.text}
                </text>
                {c.sub && (
                  <text x={r1(x + 30)} y={y + 34} textAnchor="middle" className="hs-sub">
                    {c.sub}
                  </text>
                )}
              </motion.g>
            );
          })}
        </>
      );
    }
    case 'stack': {
      return (
        <>
          {stage.cards.map((c, i) => {
            const y = 14 + i * 32;
            const isHot = stage.hot === i;
            return (
              <motion.g
                key={i}
                initial={hidden({ y: 6 })}
                animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 6 }}
                transition={{ duration: 0.3, delay: visible && !still ? 0.1 * i : 0, ease: EASE }}
              >
                <rect x="0" y={y} width={STAGE_W} height="28" rx="8" className={isHot ? 'dx-core dx-hot' : 'dx-core'} />
                <Glyph name={c.glyph} size={18} x={9} y={y + 5} className={isHot ? 'dx-glyph-hot' : 'ng-glyph'} />
                <text x="36" y={y + 18} className="hs-card-t">
                  {c.title}
                </text>
                {c.sub && (
                  <text x={STAGE_W - 8} y={y + 18} textAnchor="end" className="hs-card-s">
                    {c.sub}
                  </text>
                )}
              </motion.g>
            );
          })}
        </>
      );
    }
    case 'bars': {
      const n = stage.bars.length;
      const pitch = Math.min(24, Math.floor(BODY_H / n));
      const maxW = 124;
      return (
        <>
          {stage.bars.map((b, i) => {
            const cy = 14 + i * pitch + pitch / 2;
            const w = b.value > 0 ? Math.max(2, Math.round(b.value * maxW)) : 0;
            const dim = stage.hot !== undefined && stage.hot !== i;
            return (
              <g key={i}>
                <text x="0" y={cy + 4} className="hs-bar-label">
                  {b.label}
                </text>
                <rect x="70" y={cy - 6} width={maxW} height="12" rx="3" className="hs-track" />
                <motion.rect
                  x="70"
                  y={cy - 6}
                  height="12"
                  rx="3"
                  className={`hs-bar${b.negative ? ' is-neg' : dim ? ' is-dim' : ''}`}
                  initial={intro ? { width: 0 } : false}
                  animate={{ width: visible ? w : 0 }}
                  transition={{ duration: 0.6, delay: visible && !still ? 0.08 * i : 0, ease: EASE }}
                />
                <motion.text
                  x={STAGE_W}
                  y={cy + 4}
                  textAnchor="end"
                  className="hs-bar-text"
                  initial={hidden()}
                  animate={{ opacity: visible ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: visible && !still ? 0.08 * i + 0.3 : 0 }}
                >
                  {b.text}
                </motion.text>
              </g>
            );
          })}
        </>
      );
    }
    case 'cells': {
      const rows = stage.rows.length;
      const cols = Math.max(...stage.rows.map((r) => r.length));
      const { cw, ch, w, h } = cellLayout(rows, cols, !!stage.side, !!stage.square);
      const y0 = 14 + Math.floor((BODY_H - h) / 2);
      return (
        <>
          {stage.rows.map((row, ri) =>
            row.map((c, ci) => {
              const x = ci * cw;
              const y = y0 + ri * ch;
              const isHead = stage.header && ri === 0;
              return (
                <motion.g
                  key={`${ri}-${ci}`}
                  initial={hidden()}
                  animate={{ opacity: visible ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: visible && !still ? 0.02 * (ri * cols + ci) : 0 }}
                >
                  {!isHead && (
                    <rect
                      x={x}
                      y={y}
                      width={cw}
                      height={ch}
                      className={`hs-cell${c.hot ? ' is-hot' : ''}`}
                      style={{ fillOpacity: Math.round((0.05 + 0.5 * (c.heat ?? 0)) * 100) / 100 }}
                    />
                  )}
                  <text x={x + cw / 2} y={y + ch / 2 + 4} textAnchor="middle" className={isHead ? 'hs-head-t' : 'hs-cell-t'}>
                    {c.text}
                  </text>
                </motion.g>
              );
            }),
          )}
          {(stage.side ?? []).map((l, i) => (
            <text key={i} x={w + 14} y={y0 + 12 + i * 17} className="hs-note">
              {l}
            </text>
          ))}
        </>
      );
    }
    case 'loop':
      return <LoopBody stage={stage} visible={visible} motionOn={motionOn} still={still} />;
  }
}

/** A cycle with a dot travelling round it clockwise. Small arrowheads show the direction when nothing moves. */
function LoopBody({ stage, visible, motionOn, still }: { stage: Extract<Stage, { kind: 'loop' }>; visible: boolean; motionOn: boolean; still: boolean }) {
  const centres = loopCentres(stage.nodes.length);
  const path = loopPath();
  const start = path[0];
  const angles = stage.nodes.length === 4 ? [-90, 0, 90, 180] : [-90, 30, 150];
  // an arrowhead halfway between each pair of nodes, pointing the way round
  const heads = angles.map((a, i) => {
    const b = i === angles.length - 1 ? angles[0] + 360 : angles[i + 1];
    const t = (((a + b) / 2) * Math.PI) / 180;
    const px = 125 + 84 * Math.cos(t);
    const py = 76 + 46 * Math.sin(t);
    let dx = -84 * Math.sin(t);
    let dy = 46 * Math.cos(t);
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const back = (k: number, side: number) => `${r1(px - dx * k - dy * side)} ${r1(py - dy * k + dx * side)}`;
    return `M ${back(7, 4.5)} L ${r1(px)} ${r1(py)} L ${back(7, -4.5)}`;
  });
  return (
    <>
      <ellipse cx="125" cy="76" rx="84" ry="46" className="hs-loop-line" />
      {heads.map((d, i) => (
        <path key={i} d={d} className="hs-loop-line" style={{ strokeDasharray: 'none', strokeOpacity: 0.6 }} />
      ))}
      {visible && !still && (
        <motion.circle
          r="5"
          className="dx-packet"
          initial={{ cx: start.x, cy: start.y }}
          animate={motionOn ? { cx: path.map((p) => p.x), cy: path.map((p) => p.y) } : { cx: start.x, cy: start.y }}
          transition={motionOn ? { duration: 5, ease: 'linear', repeat: Infinity } : { duration: 0 }}
        />
      )}
      {stage.nodes.map((n, i) => (
        <g key={i}>
          <rect x={r1(centres[i].x - 42)} y={r1(centres[i].y - 13)} width="84" height="26" rx="13" className="dx-core" />
          <Glyph name={n.glyph} size={15} x={r1(centres[i].x - 35)} y={r1(centres[i].y - 7.5)} className="dx-glyph-hot" />
          <text x={r1(centres[i].x - 15)} y={r1(centres[i].y + 4)} className="hs-node-t">
            {n.label}
          </text>
        </g>
      ))}
      {(stage.center ?? []).map((l, i) => (
        <text key={i} x="125" y={70 + i * 15} textAnchor="middle" className="hs-center">
          {l}
        </text>
      ))}
    </>
  );
}
