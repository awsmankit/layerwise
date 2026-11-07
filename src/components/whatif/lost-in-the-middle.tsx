import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { MIDDLE, PASSAGES, QUOTES, band, bandWords, centre, curvePoints, side, strengthAt } from '../../lib/whatif/lost-in-the-middle';

const CELL = 17.5;
const SX = 6;
const CX0 = 48;
const CX1 = 372;
const CY0 = 150;
const CY1 = 262;
const GOOD = '#1f9d6b';
const BAD = '#d6453d';
const AMBER = '#c28a00';
const colourOf = { favoured: GOOD, weaker: AMBER, weakest: BAD } as const;
const shortWord = { favoured: 'favoured', weaker: 'weaker', weakest: 'the dip' } as const;

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const xOf = (p: number) => r4(CX0 + p * (CX1 - CX0));
const yOf = (s: number) => r4(CY1 - ((s - 0.1) / 0.9) * (CY1 - CY0));

/**
 * A strip of 21 passages and a needle you move. The curve is a SCHEMATIC drawing of the U-shape reported in the
 * abstract of Liu et al. (2023). It is not data and has no accuracy numbers.
 */
export default function LostInTheMiddleWhatIf() {
  const [pos, setPos] = useState(MIDDLE);
  const [playing, setPlaying] = useState(false);

  const s = strengthAt(pos);
  const b = band(s);
  const edge = b === 'favoured';
  const p = centre(pos);
  const colour = colourOf[b];
  const path = useMemo(() => curvePoints(40).map((q, i) => `${i === 0 ? 'M' : 'L'}${xOf(q.p)} ${yOf(q.s)}`).join(' '), []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setPos((x) => {
        if (x >= PASSAGES - 1) {
          setPlaying(false);
          return x;
        }
        return x + 1;
      });
    }, 260);
    return () => clearInterval(id);
  }, [playing]);

  const sideWord = side(pos);
  const verdict =
    b === 'favoured' ? (
      <>
        The answer is in passage {pos + 1} of {PASSAGES}, near the {sideWord}. The paper&rsquo;s abstract says performance is often highest at the beginning or end. This curve is a schematic drawing, not data.
      </>
    ) : b === 'weaker' ? (
      <>
        The answer is in passage {pos + 1} of {PASSAGES}, away from both ends: on the way down into the dip of the published U-shape. The curve is schematic, not data, and real models differ.
      </>
    ) : (
      <>
        The answer is in passage {pos + 1} of {PASSAGES}, in the middle third. The abstract says performance significantly degrades when relevant information is in the middle of long contexts. The curve is schematic, not data.
      </>
    );

  return (
    <WhatIfFrame
      title="Where in a long prompt does the answer sit?"
      withLabel="Near the start or end"
      withoutLabel="Away from the ends"
      on={edge}
      onChange={(v) => {
        setPlaying(false);
        if (v && !edge) setPos(0);
        if (!v && edge) setPos(MIDDLE);
      }}
      verdict={verdict}
      controls={
        <>
          <label className="field wl-field">
            <span>
              Answer is in passage <b>{pos + 1}</b> of {PASSAGES}
            </span>
            <input type="range" min={0} max={PASSAGES - 1} step={1} value={pos} onChange={(e) => { setPlaying(false); setPos(+e.target.value); }} aria-label="Which of the 21 passages holds the answer" aria-valuetext={`passage ${pos + 1} of ${PASSAGES}`} />
          </label>
          <button type="button" className="btn quiet wl-btn" onClick={() => { setPos(0); setPlaying(true); }}>
            {playing ? 'Moving…' : 'Slide it along'}
          </button>
        </>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: you give a model a long prompt made of many passages, and only one of them holds the answer. You might expect the position not to matter. Move the answer along the strip and watch the drawing. This is an illustration of a published finding, not a measurement, and no scores are shown.
      </p>
      <svg viewBox="0 0 380 300" className="dx-svg wi-svg wl-cap" role="img" aria-label={`Schematic, not data. A strip of ${PASSAGES} passages with the answer in passage ${pos + 1}, and a U-shaped curve that is highest at the start and end and lowest in the middle. The answer is ${bandWords[b]}.`}>
        <rect x={0} y={0} width={380} height={21} rx={6} fill={AMBER} fillOpacity={0.18} stroke={AMBER} strokeDasharray="4 3" />
        <text x={190} y={15} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
          SCHEMATIC ILLUSTRATION, NOT DATA
        </text>
        {Array.from({ length: PASSAGES }, (_, i) => (
          <rect key={i} x={r4(SX + i * CELL + 0.8)} y={38} width={r4(CELL - 1.6)} height={34} rx={3.5} fill="#2b7fd6" fillOpacity={r4(0.1 + 0.7 * strengthAt(i))} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} />
        ))}
        <motion.g initial={false} animate={{ x: r4(pos * CELL) }} transition={{ duration: 0.3, ease: EASE }}>
          <rect x={SX + 0.2} y={37} width={CELL - 0.4} height={36} rx={4} fill="none" stroke="currentColor" strokeWidth={2.6} />
          <polygon points={`${SX + CELL / 2 - 6},26 ${SX + CELL / 2 + 6},26 ${SX + CELL / 2},35`} fill={colour} stroke="currentColor" strokeWidth={1.2} />
        </motion.g>
        <text x={SX} y={90} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          start of prompt
        </text>
        <text x={374} y={90} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          end of prompt
        </text>
        <text x={SX} y={110} style={{ fill: 'var(--ink)', fontSize: 13 }}>
          ▼ marks the passage with the answer
        </text>
        <text x={SX} y={128} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          darker cell = where models tend to do better (schematic)
        </text>

        <rect x={xOf(7 / PASSAGES)} y={CY0 - 6} width={r4(((CX1 - CX0) * 7) / PASSAGES)} height={CY1 - CY0 + 12} rx={4} fill={BAD} fillOpacity={0.08} />
        <text x={r4((xOf(7 / PASSAGES) + xOf(14 / PASSAGES)) / 2)} y={CY0 + 8} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 12.5 }}>
          middle third
        </text>
        <line x1={CX0} y1={CY1 + 6} x2={CX1} y2={CY1 + 6} stroke="currentColor" strokeOpacity={0.5} />
        <line x1={CX0} y1={CY0 - 6} x2={CX0} y2={CY1 + 6} stroke="currentColor" strokeOpacity={0.5} />
        <text x={0} y={CY0 + 6} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          higher
        </text>
        <text x={0} y={CY1 + 2} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          lower
        </text>
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2.4} strokeOpacity={0.75} strokeDasharray="6 3" />
        <motion.line initial={false} animate={{ x1: xOf(p), x2: xOf(p), y2: yOf(s) }} y1={CY1 + 6} stroke={colour} strokeWidth={1.6} strokeDasharray="3 3" transition={{ duration: 0.3, ease: EASE }} />
        <motion.circle initial={false} animate={{ cx: xOf(p), cy: yOf(s) }} r={8} fill={colour} stroke="currentColor" strokeWidth={2} transition={{ duration: 0.3, ease: EASE }} />
        <motion.text initial={false} animate={{ x: b === 'weakest' ? xOf(p) : p > 0.6 ? xOf(p) - 14 : xOf(p) + 14, y: yOf(s) + (b === 'weakest' ? -16 : 5) }} textAnchor={b === 'weakest' ? 'middle' : p > 0.6 ? 'end' : 'start'} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }} transition={{ duration: 0.3, ease: EASE }}>
          {shortWord[b]}
        </motion.text>
        <text x={CX0} y={CY1 + 26} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          start
        </text>
        <text x={CX1} y={CY1 + 26} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          end
        </text>
        <text x={190} y={CY1 + 26} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          where the answer sits
        </text>
      </svg>
      <blockquote className="wl-quote">
        <p>
          &ldquo;{QUOTES[0]}&rdquo;
        </p>
        <p>
          &ldquo;&hellip; {QUOTES[1]}&rdquo;
        </p>
        <footer>Liu et al., &ldquo;Lost in the Middle: How Language Models Use Long Contexts&rdquo;, abstract</footer>
      </blockquote>
      <details className="wl-note">
        <summary>What this drawing is, and is not</summary>
        <p>
          The curve is a plain parabola, highest at both ends and lowest at the middle passage ({MIDDLE + 1} of {PASSAGES}), drawn only to give the finding a shape. It has no units and does not come from any experiment. Real curves come from testing particular models, can be lopsided, and differ between models and tasks. The paper tested models that existed in 2023; this page makes no claim about any model you use today. The shading of the cells uses the same schematic curve.
        </p>
      </details>
    </WhatIfFrame>
  );
}
