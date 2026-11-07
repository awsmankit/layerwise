import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { THRESHOLD, activeRows, captured, capturedCount, facts, heads, singleHead, strength, words, QUERY, type Choice } from '../../lib/whatif/no-multi-head-attention';

const X0 = 8;
const COL = 50;
const PITCH = 70;
const ZONE = 46; // height of the bar zone in each panel
const SCALE = 56;
const FACT_COLOURS = ['#2b7fd6', '#c28a00', '#1f9d6b', '#8a4fd6'];

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const pct = (x: number) => `${Math.round(x * 100)}%`;

const factOfWord = (w: number) => facts.findIndex((f) => f.word === w);

/**
 * The word "ate" decides where to look. Each panel is one attention head and each bar is how much that head
 * listens to a word. Four heads can each take a different pattern; one head has only one set of bars.
 * Toy: the patterns are hand-set, not trained.
 */
export default function NoMultiHeadAttentionWhatIf() {
  const [multi, setMulti] = useState(true);
  const [choice, setChoice] = useState<Choice>('syntax');

  const rows = useMemo(() => activeRows(multi, choice), [multi, choice]);
  const n = capturedCount(rows);
  const best = Math.max(...facts.map((f) => strength(f, rows)));
  const missing = facts.filter((f) => !captured(f, rows));
  const oneName = choice === 'blend' ? 'tries to do everything (an average of all four)' : `keeps only the ${heads.find((h) => h.id === choice)!.name.toLowerCase()} pattern`;

  const verdict = multi ? (
    <>
      Four heads look at four different things at once, so all {n} of 4 facts about “ate” stand out (toy).
    </>
  ) : choice === 'blend' ? (
    <>
      One head that tries to do everything spreads its attention thin: the best any word gets is {pct(best)}, under the {pct(THRESHOLD)} bar, so {n} of 4 facts stand out (toy).
    </>
  ) : (
    <>
      One head that {oneName} catches {n} of 4 facts. Missing: {missing.map((f) => f.label).join('; ')} (toy).
    </>
  );

  const labelsY = 4 + 4 * PITCH + 14;
  const factsY = labelsY + 26;
  const H = factsY + 12 + 2 * 46 + 4;

  return (
    <WhatIfFrame
      title="How does “ate” decide what to look at?"
      withLabel="Four heads"
      withoutLabel="One head"
      on={multi}
      onChange={setMulti}
      verdict={verdict}
      controls={
        <label className="field wl-field">
          <span>What the one head looks at</span>
          <select className="wl-select" value={choice} onChange={(e) => setChoice(e.target.value as Choice)} disabled={multi} aria-label="Which pattern the single head keeps">
            {heads.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}: {h.plain}
              </option>
            ))}
            <option value="blend">Everything at once (an average)</option>
          </select>
        </label>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: to understand “ate” you need several things at once: who ate, what was eaten, how, and what state the eater is in. An attention head is one way of looking. Each bar shows how much the head listens to a word. This is a toy with hand-set bars.
      </p>
      <svg viewBox={`0 0 364 ${H}`} className="dx-svg wi-svg wl-cap" role="img" aria-label={`Bars show where the word ate listens in the sentence the tired cat quickly ate the fish, for ${multi ? 'four heads' : 'one head'}. ${n} of 4 facts are picked up.`}>
        {/* shaded columns for the words that carry a fact */}
        {words.map((_, i) => {
          const f = factOfWord(i);
          if (f < 0) return null;
          return <rect key={i} x={X0 + i * COL + 2} y={2} width={COL - 4} height={4 * PITCH + 2} rx={6} fill={FACT_COLOURS[f]} opacity={0.1} />;
        })}
        {[0, 1, 2, 3].map((p) => {
          const y0 = 4 + p * PITCH;
          const active = multi || p === 0;
          const w = active ? (multi ? heads[p].weights : singleHead(choice)) : words.map(() => 0);
          const title = multi
            ? `Head ${p + 1}: ${heads[p].plain}`
            : p === 0
              ? choice === 'blend'
                ? 'The one head: everything at once'
                : `The one head: ${heads.find((h) => h.id === choice)!.plain}`
              : 'No second head';
          return (
            <g key={p}>
              <text x={X0} y={y0 + 14} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700, opacity: active ? 1 : 0.4 }}>
                {title}
              </text>
              <line x1={X0} x2={X0 + 7 * COL} y1={y0 + 20 + ZONE} y2={y0 + 20 + ZONE} stroke="currentColor" opacity={0.25} />
              {w.map((v, i) => {
                const f = factOfWord(i);
                const h = Math.min(v * SCALE, ZONE - 2);
                const fill = f >= 0 ? FACT_COLOURS[f] : 'currentColor';
                return (
                  <g key={i}>
                    <motion.rect
                      x={X0 + i * COL + 11}
                      width={COL - 22}
                      rx={3}
                      fill={fill}
                      opacity={f >= 0 ? 1 : 0.35}
                      initial={false}
                      animate={{ height: r4(h), y: r4(y0 + 20 + ZONE - h) }}
                      transition={{ duration: 0.5, ease: EASE }}
                    />
                    {v > 0 && (
                      <text x={X0 + i * COL + COL / 2} y={r4(y0 + 20 + ZONE - h - 3)} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: v >= THRESHOLD ? 700 : 400 }}>
                        {pct(v)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
        {words.map((word, i) => (
          <text key={i} x={X0 + i * COL + COL / 2} y={labelsY} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12.5, fontWeight: i === QUERY ? 700 : 400 }}>
            {word}
          </text>
        ))}
        <text x={X0 + QUERY * COL + COL / 2} y={labelsY + 12} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
          (asks)
        </text>
        {facts.map((f, k) => {
          const ok = captured(f, rows);
          const x = X0 + (k % 2) * 178;
          const y = factsY + 12 + Math.floor(k / 2) * 46;
          const colour = ok ? '#1f9d6b' : '#d6453d';
          return (
            <g key={f.id}>
              <rect x={x} y={y} width={174} height={40} rx={10} fill={colour} opacity={0.13} stroke={colour} strokeWidth={1.5} />
              <circle cx={x + 11} cy={y + 12} r={4.5} fill={FACT_COLOURS[k]} />
              <text x={x + 21} y={y + 16} style={{ fill: 'var(--ink)', fontSize: 12.5, fontWeight: 700 }}>
                {ok ? '✓' : '✗'} {f.label}
              </text>
              <text x={x + 21} y={y + 32} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                “{words[f.word]}”: {pct(strength(f, rows))}
              </text>
            </g>
          );
        })}
        <text x={X0} y={factsY + 4} style={{ fill: 'var(--ink-2)', fontSize: 12.5 }}>
          Facts picked up (a word needs {pct(THRESHOLD)} or more from some head)
        </text>
      </svg>
      <details className="wl-note">
        <summary>The numbers behind the bars (toy model)</summary>
        <p>
          Each head is a row of seven weights that add up to 100%. The four patterns are made up for teaching: grammar (the doer and the thing done to), nearby words, words about eating, and describing words. The “everything at once” head is the plain average of the four, which is why it is flat. A fact counts as picked up when some head gives its word at least {pct(THRESHOLD)}, a bar chosen for this toy. Heads keep separate outputs that are joined afterwards, so the best head for each fact counts.
        </p>
        <p>
          In the Transformer paper the base model uses h = 8 heads with 64 numbers per head (512 divided by 8). The paper says that with a single attention head, averaging inhibits looking at different positions in different ways. It also reports that some heads appear to behave in ways related to the grammar and meaning of sentences.
        </p>
      </details>
    </WhatIfFrame>
  );
}

