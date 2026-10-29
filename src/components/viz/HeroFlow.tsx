import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';
import { withBase } from '../../lib/url';

/*
 * One question travelling through a chatbot, looped, in words a beginner can
 * follow. The token pieces and IDs are the real output of the o200k_base
 * tokenizer; 32 layers is typical of a mid-sized open model.
 */
const Q = ['What', '·is', '·the', '·capital', '·of', '·France', '?'];
const Q_IDS = [4827, 382, 290, 9029, 328, 10128, 30];
const A = ['The', '·capital', '·of', '·France', '·is', '·Paris', '.'];

const LABELS = ['1  You ask', '2  Cut into pieces', '3  The model works it out', '4  It answers, piece by piece'];
const GHOST = 0.14;

type Phase = 0 | 1 | 2 | 3 | 4;

function Stage({ i, visible, children }: { i: number; visible: boolean; children: React.ReactNode }) {
  return (
    <motion.g initial={false} animate={{ opacity: visible ? 1 : GHOST }} transition={{ duration: 0.45, ease: EASE }}>
      <text x="0" y="0" className="dx-small">{LABELS[i]}</text>
      {children}
    </motion.g>
  );
}

function Chips({ words, ids, on, h = 40 }: { words: string[]; ids?: number[]; on: (i: number) => boolean; h?: number }) {
  return (
    <>
      {words.map((w, i) => {
        const x = (i % 4) * 63.4;
        const y = 14 + Math.floor(i / 4) * (h + 8);
        const shown = on(i);
        return (
          <motion.g key={i} initial={false} animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 6 }} transition={{ duration: 0.3, delay: shown ? 0.05 * i : 0, ease: EASE }}>
            <rect x={x} y={y} width="60" height={h} rx="8" className="dx-core dx-hot" />
            <text x={x + 30} y={y + (ids ? 17 : 19)} textAnchor="middle" className="hf-chip">{w}</text>
            {ids && <text x={x + 30} y={y + 32} textAnchor="middle" className="dx-small hf-id">{ids[i]}</text>}
          </motion.g>
        );
      })}
    </>
  );
}

const arrow = (x1: number, y: number, x2: number) => `M ${x1} ${y} H ${x2} M ${x2 - 6} ${y - 5} L ${x2} ${y} L ${x2 - 6} ${y + 5}`;

/**
 * The home page's hero drawing: a question, its tokens, the layers, and the
 * answer arriving one token at a time. It loops on its own, can be paused, and
 * shows the finished picture without motion when the reader asks for less.
 */
export default function HeroFlow() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(0);
  const [count, setCount] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [playing, setPlaying] = useState(true);

  const still = !!reduce;
  const shownPhase: Phase = still ? 4 : phase;
  const shownCount = still ? 7 : count;

  useEffect(() => {
    if (still || !playing) return;
    if (phase === 3) {
      const id = setInterval(() => setCount((c) => Math.min(c + 1, 7)), 340);
      return () => clearInterval(id);
    }
    const wait = [1500, 1900, 1900, 0, 2800][phase];
    const t = setTimeout(() => {
      if (phase === 4) {
        setCount(0);
        setCycle((c) => c + 1);
        setPhase(0);
      } else setPhase((p) => (p + 1) as Phase);
    }, wait);
    return () => clearTimeout(t);
  }, [phase, playing, still]);

  useEffect(() => {
    if (phase === 3 && count >= 7) {
      const t = setTimeout(() => setPhase(4), 500);
      return () => clearTimeout(t);
    }
  }, [phase, count]);

  const ox = (i: number) => 4 + i * 290;
  const label = 'What happens when you ask a chatbot a question: your 6 words are cut into 7 pieces, each one a number, the model works through 32 layers of number crunching, and the answer is written one piece at a time.';

  return (
    <Root>
      <div className="lp-flow">
        <div className="lp-flow-head">
          <p>What happens when you ask a chatbot a question</p>
          <div className="lp-flow-tools">
            {!still && (
              <button type="button" className="btn quiet lp-mini" aria-pressed={!playing} onClick={() => setPlaying((p) => !p)}>
                {playing ? 'Pause' : 'Play'}
              </button>
            )}
            <a className="btn quiet lp-mini" href={withBase('/learn/start/how-a-chatbot-answers/')}>
              How it works
            </a>
          </div>
        </div>

        {/* wide screens: four stages left to right */}
        <svg viewBox="0 0 1130 188" className="lp-flow-wide" role="img" aria-label={label}>
          {[0, 1, 2].map((i) => (
            <path key={i} d={arrow(ox(i) + 256, 62, ox(i + 1) - 8)} className={`lp-arrow${shownPhase > i ? ' is-lit' : ''}`} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${ox(i)} 14)`}>
              <StageView i={i} phase={shownPhase} count={shownCount} cycle={cycle} />
            </g>
          ))}
        </svg>

        {/* narrow screens: only the stage in progress, with four progress marks */}
        <svg viewBox="0 0 270 214" className="lp-flow-compact" role="img" aria-label={label}>
          <g transform="translate(10 18)">
            <StageView i={Math.min(shownPhase, 3)} phase={shownPhase} count={shownCount} cycle={cycle} solo />
          </g>
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={103 + i * 22} cy="204" r="4" className={i === Math.min(shownPhase, 3) ? 'dx-packet' : 'dx-core'} />
          ))}
        </svg>

        <p className="lp-flow-cap">Real pieces and numbers from a real tokenizer. Other chatbots cut text a little differently.</p>
      </div>
    </Root>
  );
}

/** One stage of the drawing. `solo` draws it alone, fully visible, for the narrow layout. */
function StageView({ i, phase, count, cycle, solo = false }: { i: number; phase: Phase; count: number; cycle: number; solo?: boolean }) {
  const visible = solo || phase >= i;
  const written = phase >= 4 ? A.length : phase === 3 ? count : 0;
  switch (i) {
    case 0:
      return (
        <Stage i={0} visible={visible}>
          <rect x="0" y="14" width="250" height="84" rx="14" className="dx-core" />
          <Glyph name="user" size={26} x={14} y={30} className="ng-glyph" />
          <text x="52" y="46" className="hf-q">What is the capital</text>
          <text x="52" y="68" className="hf-q">of France?</text>
          <text x="0" y="122" className="dx-small">6 words</text>
        </Stage>
      );
    case 1:
      return (
        <Stage i={1} visible={visible}>
          <Chips words={Q} ids={Q_IDS} on={() => visible} />
          <text x="0" y="122" className="dx-small">7 pieces, each one a number</text>
        </Stage>
      );
    case 2:
      return (
        <Stage i={2} visible={visible}>
          {[4, 3, 2, 1, 0].map((k) => (
            <rect key={k} x={10 + k * 9} y={44 - k * 9} width="150" height="78" rx="10" className={k === 0 ? 'dx-core dx-hot' : 'dx-core'} />
          ))}
          <Glyph name="layers" size={26} x={24} y={58} className="dx-glyph-hot" />
          <text x="60" y="78" className="dx-name">32 layers</text>
          <text x="22" y="108" className="dx-small">of number crunching</text>
          <motion.circle
            key={`p${cycle}`}
            cy="83"
            r="5"
            className="dx-packet"
            initial={{ cx: -4, opacity: 0 }}
            animate={phase === 2 ? { cx: [-4, 100, 250], opacity: [0, 1, 0] } : { cx: -4, opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
          <text x="0" y="146" className="dx-small">reads all 7 pieces at once</text>
        </Stage>
      );
    default:
      return (
        <Stage i={3} visible={visible}>
          <Chips words={A} on={(k) => k < written} h={28} />
          <text x="0" y="104" className="dx-small">{`written one piece at a time: ${written} of ${A.length}`}</text>
        </Stage>
      );
  }
}
