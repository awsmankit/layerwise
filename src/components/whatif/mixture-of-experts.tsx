import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { activeParams, billions, example, flopsPerToken, loads, route, sentence, slowdown, totalParams, weightsGB } from '../../lib/whatif/mixture-of-experts';

const X0 = 6;
const COL = 44;
const E = example.experts;
const LAST = sentence.length - 1;
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * One layer of a mixture-of-experts model reading a sentence. For each token a router picks a few experts (green).
 * With the switch off every expert runs for every token. The bars below count the weights a token touches
 * for an example model shape. Router scores are made up for the animation.
 */
export default function MixtureOfExpertsWhatIf() {
  const [routed, setRouted] = useState(true);
  const [k, setK] = useState(2);
  const [cur, setCur] = useState(LAST);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCur((c) => {
        if (c >= LAST) {
          setPlaying(false);
          return LAST;
        }
        return c + 1;
      });
    }, 700);
    return () => clearInterval(id);
  }, [playing]);

  const kk = routed ? k : E;
  const picks = route(cur, E, kk);
  const used = new Set(picks.map((p) => p.expert));
  const tally = loads(E, kk, cur);
  const total = totalParams(example);
  const act = activeParams(example, k);
  const touched = routed ? act : total;
  const slow = slowdown(example, k);

  const verdict = routed ? (
    <>
      Each token goes to {k} of {E} experts, so it uses {billions(act)} of the {billions(total)} weights in the example model: about {Math.round((act / total) * 100)}% (example).
    </>
  ) : (
    <>
      All {E} experts run for every token, so each token uses all {billions(total)} weights: {slow.toFixed(1)} times the work of routing to {k} experts, for the same stored model (example).
    </>
  );

  const tokY = 24;
  const expY = 112;
  const barsY = 252;
  const H = barsY + 150;
  const BAR_X = 8;
  const BAR_W = 348;

  const bars = [
    { name: `Routed to ${k}`, v: act, on: routed, fill: '#1f9d6b' },
    { name: 'All experts run', v: total, on: !routed, fill: '#d6453d' },
  ];

  return (
    <WhatIfFrame
      title="Where does each word of the sentence go?"
      withLabel="Routed to a few experts"
      withoutLabel="Every expert runs"
      on={routed}
      onChange={setRouted}
      verdict={verdict}
      controls={
        <>
          <label className="field wl-field">
            <span>
              Experts chosen per token <b>{k}</b>
            </span>
            <input type="range" min={1} max={4} step={1} value={k} disabled={!routed} onChange={(e) => setK(+e.target.value)} aria-label="Experts chosen per token" aria-valuetext={`${k} experts per token`} />
          </label>
          <div className="wl-btnrow">
            <button
              type="button"
              className="btn quiet wl-btn"
              onClick={() => {
                setCur(0);
                setPlaying(true);
              }}
            >
              {playing ? 'Playing…' : 'Play it'}
            </button>
            <button type="button" className="btn quiet wl-btn" onClick={() => { setPlaying(false); setCur((c) => (c >= LAST ? 0 : c + 1)); }}>
              Next token
            </button>
          </div>
        </>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: a mixture-of-experts model has many small specialist blocks (experts) in each layer. A router looks at each word and sends it to only a few of them, so most of the model rests for that word. Example sentence, made-up router scores.
      </p>
      <svg viewBox={`0 0 364 ${H}`} className="dx-svg wi-svg wl-cap" role="img" aria-label={`One layer with ${E} experts reading the sentence ${sentence.join(' ')}. The word ${sentence[cur]} is sent to ${used.size} experts. A token uses ${billions(touched)} of ${billions(total)} weights in the example model.`}>
        <text x={X0} y={14} style={{ fill: 'var(--ink-2)', fontSize: 12.5 }}>
          Words (the highlighted one is being routed)
        </text>
        {sentence.map((w, i) => (
          <g key={i} opacity={i <= cur ? 1 : 0.4}>
            <rect x={X0 + i * COL + 2} y={tokY} width={COL - 4} height={28} rx={8} fill="var(--surface)" stroke="var(--ink)" strokeWidth={i === cur ? 3 : 1} />
            <text x={X0 + i * COL + COL / 2} y={tokY + 18} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: i === cur ? 700 : 400 }}>
              {w}
            </text>
          </g>
        ))}
        {picks.map((p) => {
          const x1 = X0 + cur * COL + COL / 2;
          const x2 = X0 + p.expert * COL + COL / 2;
          return (
            <motion.line
              key={`${cur}-${kk}-${p.expert}`}
              x1={x1}
              y1={tokY + 28}
              x2={x2}
              y2={expY}
              stroke={routed ? '#1f9d6b' : '#d6453d'}
              strokeWidth={routed ? r4(1.5 + p.gate * 4) : 1.5}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ duration: 0.4, ease: EASE }}
            />
          );
        })}
        {Array.from({ length: E }, (_, e) => {
          const on = used.has(e);
          const gate = picks.find((p) => p.expert === e)?.gate;
          const colour = routed ? '#1f9d6b' : '#d6453d';
          return (
            <g key={e}>
              <motion.rect
                x={X0 + e * COL + 2}
                y={expY}
                width={COL - 4}
                height={44}
                rx={8}
                stroke={on ? colour : 'currentColor'}
                strokeWidth={on ? 2.5 : 1}
                initial={false}
                animate={{ fill: on ? colour : 'rgba(128,128,128,0.08)', fillOpacity: on ? 0.25 : 1 }}
                transition={{ duration: 0.35, ease: EASE }}
              />
              <text x={X0 + e * COL + COL / 2} y={expY + 18} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700, opacity: on ? 1 : 0.55 }}>
                E{e + 1}
              </text>
              <text x={X0 + e * COL + COL / 2} y={expY + 35} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12 }}>
                {on ? (routed ? pct(gate ?? 0) : 'runs') : 'rests'}
              </text>
              <text x={X0 + e * COL + COL / 2} y={expY + 60} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                ×{tally[e]}
              </text>
            </g>
          );
        })}
        <text x={X0} y={expY + 80} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
          One layer, {E} experts. Green = runs for this word.
        </text>
        <text x={X0} y={expY + 96} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
          Percent = share of the answer from that expert.
        </text>
        <text x={X0} y={expY + 112} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
          ×n = words that expert has handled so far.
        </text>
        <text x={BAR_X} y={barsY} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
          Weights one token uses in the whole model (example)
        </text>
        {bars.map((b, i) => {
          const y = barsY + 12 + i * 52;
          return (
            <g key={b.name} opacity={b.on ? 1 : 0.45}>
              <text x={BAR_X} y={y + 12} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: b.on ? 700 : 400 }}>
                {b.on ? '▶ ' : ''}
                {b.name}
              </text>
              <rect x={BAR_X} y={y + 18} width={BAR_W} height={16} rx={5} fill="currentColor" opacity={0.08} />
              <motion.rect x={BAR_X} y={y + 18} height={16} rx={5} fill={b.fill} initial={false} animate={{ width: r4((b.v / total) * BAR_W) }} transition={{ duration: 0.5, ease: EASE }} />
              <text x={BAR_X + BAR_W} y={y + 12} textAnchor="end" style={{ fill: 'var(--ink)', fontSize: 13 }}>
                {billions(b.v)} · about {Math.round(flopsPerToken(b.v) / 1e9)} GFLOP
              </text>
            </g>
          );
        })}
        <text x={BAR_X} y={barsY + 126} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
          Stored either way: {billions(total)} weights, about {Math.round(weightsGB(total))} GB at 16 bits.
        </text>
        <text x={BAR_X} y={barsY + 142} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
          GFLOP = billions of arithmetic steps, about 2 per weight used.
        </text>
      </svg>
      <details className="wl-note">
        <summary>The numbers behind the bars (example model)</summary>
        <p>
          The shape is in the style of Mixtral 8x7B from the Mixtral paper: 4096 numbers per token, 32 layers, 8 experts per layer, each expert a feed-forward block with 14336 hidden units and 3 matrices, 32 attention heads and 8 key-value heads. A 32,000-word vocabulary is assumed for the example. Adding up the weights gives {billions(total)} in all and {billions(activeParams(example, 2))} when 2 experts run, close to the 47B and 13B the paper reports.
        </p>
        <p>
          Router scores here are made up, so which expert gets which word means nothing. The gate numbers are a softmax over the chosen experts’ scores, the form the Mixtral paper describes. Work per token is estimated as 2 operations per weight used, a common rule of thumb that ignores attention over earlier tokens and memory traffic. The Switch Transformer paper states the same idea in general terms: a sparsely activated model can have a very large number of parameters with a constant computational cost per example. This page does not measure answer quality.
        </p>
      </details>
    </WhatIfFrame>
  );
}

