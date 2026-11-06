import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { ANIMAL, IT, STREET, blend, endings, resolve, weights, words, type Ending, type Mode } from '../../lib/whatif/no-attention';

const BAR_X = 84;
const BAR_W = 220;
const ROW = 24;
const TOP = 26;

const r4 = (x: number) => Math.round(x * 10000) / 10000; // exp, sin and pow differ in the last digits between server and browser
const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * One word, "it", looks at the other words to decide what it means. Each bar is how much it listens to that word.
 * With attention the listening is focused on the right noun; without it, "it" hears only itself or a flat average.
 */
export default function NoAttentionWhatIf() {
  const [attn, setAttn] = useState(true);
  const [ending, setEnding] = useState<Ending>('tired');
  const [mode, setMode] = useState<Mode>('self');

  const active: Mode = attn ? 'attention' : mode;
  const w = useMemo(() => weights(ending, active), [ending, active]);
  const mix = useMemo(() => blend(w), [w]);
  const answer = resolve(w);
  const correct = ending === 'tired' ? 'animal' : 'street';
  const ok = answer === correct;
  const colour = attn ? '#1f9d6b' : '#d6453d';

  const verdict = attn ? (
    <>
      “it” gives {pct(w[ending === 'tired' ? ANIMAL : STREET])} of its attention to “{ending === 'tired' ? 'animal' : 'street'}”, so it can tell that “it” means the {correct}.
    </>
  ) : mode === 'self' ? (
    <>
      Each word sees only itself, so “it” hears nothing from the other 10 words: {pct(w[IT])} on itself, {pct(w[ANIMAL])} on “animal”. It cannot tell whether “it” is the animal or the street.
    </>
  ) : (
    <>
      “it” hears every other word equally: {pct(w[ANIMAL])} on “animal” and {pct(w[STREET])} on “street”. That is a tie, so it cannot tell which one is {endings[ending].word}. Changing the last word to “{ending === 'tired' ? 'wide' : 'tired'}” gives exactly the same blur.
    </>
  );

  const H = TOP + words.length * ROW + 100;
  const blendY = TOP + words.length * ROW + 24;

  return (
    <WhatIfFrame
      title="How does “it” find out who it is?"
      withLabel="With attention"
      withoutLabel="Without it"
      on={attn}
      onChange={setAttn}
      verdict={verdict}
      controls={
        <>
          <label className="field wl-field">
            <span>Last word of the sentence</span>
            <select className="wl-select" value={ending} onChange={(e) => setEnding(e.target.value as Ending)} aria-label="Last word of the sentence">
              <option value="tired">… because it was too tired</option>
              <option value="wide">… because it was too wide</option>
            </select>
          </label>
          <label className="field wl-field">
            <span>Without attention each word hears</span>
            <select className="wl-select" value={mode} onChange={(e) => setMode(e.target.value as Mode)} disabled={attn} aria-label="What each word hears when attention is removed">
              <option value="self">only itself</option>
              <option value="average">a plain average of the others</option>
            </select>
          </label>
        </>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: to read “it” you glance back over the sentence and decide who “it” is. Attention is that glance. Below, each bar shows how much “it” listens to one word.
      </p>
      <svg viewBox={`0 0 380 ${H}`} className="dx-svg wi-svg wl-cap" role="img" aria-label={`Bars show how much the word it listens to each word of the sentence the animal didn't cross the street because it was too ${endings[ending].word}. ${answer ? `It resolves to the ${answer}.` : 'It cannot tell whether it means the animal or the street.'}`}>
        <text x={0} y={16} className="dx-small" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          word
        </text>
        <text x={BAR_X} y={16} className="dx-small" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          how much “it” listens to it
        </text>
        {words.map((word, i) => {
          const y = TOP + i * ROW;
          const isIt = i === IT;
          const key = i === ANIMAL || i === STREET;
          const label = i === words.length - 1 ? endings[ending].word : word;
          return (
            <g key={i}>
              {isIt && <rect x={-4} y={y - 1} width={BAR_X - 6} height={ROW - 2} rx={6} fill="none" stroke="currentColor" strokeWidth={1.3} strokeDasharray="3 3" />}
              <text x={0} y={y + 15} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: key || isIt ? 700 : 400 }}>
                {label}
                {isIt ? ' (asks)' : ''}
              </text>
              <rect x={BAR_X} y={y + 3} width={BAR_W} height={ROW - 8} rx={4} fill="currentColor" opacity={0.07} />
              <motion.rect
                x={BAR_X}
                y={y + 3}
                height={ROW - 8}
                rx={4}
                fill={colour}
                initial={false}
                animate={{ width: r4(Math.max(w[i] * BAR_W, w[i] > 0 ? 2 : 0)) }}
                transition={{ duration: 0.5, ease: EASE }}
              />
              <text x={r4(BAR_X + Math.max(w[i] * BAR_W, 0) + 5)} y={y + 15} style={{ fill: 'var(--ink)', fontSize: 12.5, fontWeight: key ? 700 : 400 }}>
                {w[i] > 0 ? pct(w[i]) : ''}
              </text>
            </g>
          );
        })}
        <text x={0} y={blendY} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          What “it” now carries (a toy mix of the words it heard)
        </text>
        {[
          { name: 'alive', v: mix[1], fill: '#2b7fd6' },
          { name: 'a place', v: mix[2], fill: '#c28a00' },
        ].map((b, i) => (
          <g key={b.name}>
            <text x={0} y={blendY + 26 + i * 22} style={{ fill: 'var(--ink)', fontSize: 13 }}>
              {b.name}
            </text>
            <rect x={BAR_X} y={blendY + 14 + i * 22} width={BAR_W} height={14} rx={4} fill="currentColor" opacity={0.07} />
            <motion.rect x={BAR_X} y={blendY + 14 + i * 22} height={14} rx={4} fill={b.fill} initial={false} animate={{ width: r4(Math.max(b.v * BAR_W, 0)) }} transition={{ duration: 0.5, ease: EASE }} />
            <text x={r4(BAR_X + b.v * BAR_W + 5)} y={blendY + 26 + i * 22} style={{ fill: 'var(--ink)', fontSize: 12.5 }}>
              {b.v.toFixed(2)}
            </text>
          </g>
        ))}
        <rect x={0} y={blendY + 62} width={380} height={30} rx={15} fill={ok ? '#1f9d6b' : '#d6453d'} opacity={0.16} stroke={ok ? '#1f9d6b' : '#d6453d'} strokeWidth={1.5} />
        <text x={190} y={blendY + 82} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 13.5, fontWeight: 700 }}>
          {answer ? `✓ “it” = the ${answer}` : '✗ “it” = ? (cannot tell)'}
        </text>
      </svg>
      <details className="wl-note">
        <summary>The numbers behind the bars (toy model)</summary>
        <p>
          Each word has four hand-set numbers (noun, alive, place, small function word). The word “it” asks for {endings[ending].ask}. Attention scores every word by multiplying its question with that word’s numbers, then turns the scores into shares that add up to 100% (a softmax). Without attention, “it” keeps only its own numbers or the flat average of the other ten words. These are not trained weights: real models learn them, with many heads in many layers.
        </p>
      </details>
    </WhatIfFrame>
  );
}
