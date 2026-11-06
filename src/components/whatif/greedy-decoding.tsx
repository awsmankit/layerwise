import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { LENGTH, START, contexts, distinct3, generate, loopLength, repeated, sampler, table, top, uniqueTokens, vocabSize } from '../../lib/whatif/greedy-decoding';

const r4 = (x: number) => Math.round(x * 10000) / 10000; // exp, sin and pow differ in the last digits between server and browser
const pct = (x: number) => `${Math.round(x * 100)}%`;
const BAR_X = 62;
const BAR_W = 190;

/**
 * A toy language model with invented next-word odds writes 24 tokens. Picking the top word every time falls into a
 * loop; sampling with temperature and top-p wanders. Underlined red words are inside a 3-word group that already appeared.
 */
export default function GreedyDecodingWhatIf() {
  const [sampling, setSampling] = useState(true);
  const [temperature, setTemperature] = useState(1);
  const [topP, setTopP] = useState(0.9);
  const [seed, setSeed] = useState(1);
  const [step, setStep] = useState(1);

  const mode = sampling ? 'sample' : 'greedy';
  const tokens = useMemo(() => generate(mode, { temperature, topP, seed }), [mode, temperature, topP, seed]);
  const flags = useMemo(() => repeated(tokens), [tokens]);
  const d3 = distinct3(tokens);
  const uniq = uniqueTokens(tokens);
  const greedyTokens = useMemo(() => generate('greedy'), []);
  const loop = loopLength(tokens);

  const ctxs = contexts(tokens);
  const ctx = ctxs[step - 1];
  const raw = table[ctx];
  const adj = useMemo(() => (sampling ? sampler(raw, temperature, topP) : { [top(raw)]: 1 }), [sampling, raw, temperature, topP]);
  const rowsDist = Object.entries(raw).sort((a, b) => b[1] - a[1]);
  const picked = tokens[step - 1];

  const gG = distinct3(greedyTokens);
  const verdict = sampling ? (
    <>
      With temperature {temperature.toFixed(1)} and top-p {topP.toFixed(2)}, this text uses {uniq} different tokens and {d3.distinct} of its {d3.total} three-token groups are new. Always taking the top token gave {uniqueTokens(greedyTokens)} different tokens and {gG.distinct} new groups.
    </>
  ) : (
    <>
      Always taking the top token, the text{loop ? ` locks into a loop of ${loop} tokens` : ' repeats'}: only {uniq} different tokens out of {vocabSize} are ever used, and just {d3.distinct} of its {d3.total} three-token groups are new. It will write exactly this every time.
    </>
  );

  const distH = 34 + rowsDist.length * 30 + 8;
  return (
    <WhatIfFrame
      title="A toy model writes 24 tokens"
      withLabel="Sampling"
      withoutLabel="Always the likeliest"
      on={sampling}
      onChange={setSampling}
      verdict={verdict}
      controls={
        <>
          <label className="field wl-field">
            <span>
              Temperature <b>{temperature.toFixed(1)}</b>
            </span>
            <input type="range" min={0.2} max={2} step={0.1} value={temperature} disabled={!sampling} onChange={(e) => setTemperature(+e.target.value)} aria-label="Temperature: low is cautious, high is adventurous" />
          </label>
          <label className="field wl-field">
            <span>
              Top-p <b>{topP.toFixed(2)}</b>
            </span>
            <input type="range" min={0.3} max={1} step={0.05} value={topP} disabled={!sampling} onChange={(e) => setTopP(+e.target.value)} aria-label="Top-p: keep the most likely tokens that add up to this share" />
          </label>
          <label className="field wl-field">
            <span>
              Look at step <b>{step} of {LENGTH}</b>
            </span>
            <input type="range" min={1} max={LENGTH} step={1} value={step} onChange={(e) => setStep(+e.target.value)} aria-label="Which step to look at" />
          </label>
          <button type="button" className="btn quiet wl-btn" disabled={!sampling} onClick={() => setSeed((s) => s + 1)}>
            {sampling ? 'Write another version' : 'Greedy never changes'}
          </button>
        </>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: at every step the model gives each possible next word a probability. “Greedy” always takes the top one. Sampling rolls a weighted die instead. This is a toy: the probabilities are invented for teaching, not taken from a real model.
      </p>
      <p className="wl-text" aria-label="The generated text">
        <span className="wl-prompt">{START}</span>{' '}
        {tokens.map((t, i) => (
          <motion.span
            key={`${mode}-${seed}-${i}`}
            className={`wl-tok${flags[i] ? ' is-rep' : ''}${i === step - 1 ? ' is-cur' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: i * 0.02, ease: EASE }}
          >
            {t}
          </motion.span>
        ))}
      </p>
      <p className="wl-legend">
        <span className="wl-tok is-rep">underlined</span> = part of a 3-token group seen before. Boxed = the step you are looking at.
      </p>
      <div className="wl-meters">
        <div>
          <span className="wl-meter-label">Different tokens used: {uniq} of {vocabSize}</span>
          <div className="wl-meter"><motion.i initial={false} animate={{ width: `${(uniq / vocabSize) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} style={{ background: sampling ? '#1f9d6b' : '#d6453d' }} /></div>
        </div>
        <div>
          <span className="wl-meter-label">New 3-token groups: {d3.distinct} of {d3.total}</span>
          <div className="wl-meter"><motion.i initial={false} animate={{ width: `${(d3.distinct / d3.total) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} style={{ background: sampling ? '#1f9d6b' : '#d6453d' }} /></div>
        </div>
      </div>
      <svg viewBox={`0 0 380 ${distH}`} className="dx-svg wi-svg wl-cap" role="img" aria-label={`Odds for the token after ${ctx}: ${rowsDist.map(([k, p]) => `${k} ${pct(p)}`).join(', ')}. The model picked ${picked}.`}>
        <text x={0} y={16} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          Step {step}: odds for the token after “{ctx}”
        </text>
        {rowsDist.map(([k, p], i) => {
          const y = 28 + i * 30;
          const a = adj[k] ?? 0;
          const isPick = k === picked;
          return (
            <g key={k}>
              <text x={0} y={y + 17} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: isPick ? 700 : 400 }}>
                {k}
              </text>
              <rect x={BAR_X} y={y + 2} width={BAR_W} height={22} rx={5} fill="currentColor" opacity={0.07} />
              <rect x={BAR_X} y={y + 2} width={r4(p * BAR_W)} height={9} rx={3} fill="currentColor" opacity={0.4} />
              <motion.rect x={BAR_X} y={y + 13} height={9} rx={3} fill={sampling ? '#1f9d6b' : '#d6453d'} initial={false} animate={{ width: r4(a * BAR_W) }} transition={{ duration: 0.5, ease: EASE }} />
              <text x={BAR_X + BAR_W + 8} y={y + 12} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                model {pct(p)}
              </text>
              <text x={BAR_X + BAR_W + 8} y={y + 25} style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: isPick ? 700 : 400 }}>
                {a > 0 ? `used ${pct(a)}` : 'cut off'}{isPick ? ' ◀' : ''}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="wl-legend">Grey bar = the model’s own odds. Coloured bar = the odds actually used after temperature and top-p. ◀ = the token that was picked.</p>
      <details className="wl-note">
        <summary>The numbers behind the figure (toy table)</summary>
        <p>
          Temperature T turns each probability p into p^(1/T) and renormalises: below 1 it sharpens the odds towards the top token, above 1 it flattens them. Top-p then keeps the smallest group of most likely tokens whose probabilities add up to at least p, and renormalises again. The next token is drawn with a seeded random number generator, so a given seed always writes the same text. Greedy takes the top entry and ignores both settings. The table has {vocabSize} tokens and depends only on the previous token, which makes loops easy to see. Real models look at the whole context.
        </p>
      </details>
    </WhatIfFrame>
  );
}
