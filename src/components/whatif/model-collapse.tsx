import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  DEFAULT_FRESH, DEFAULT_N, FRESH_STEPS, GENERATIONS, K, REAL, RUNS, SAMPLE_SIZES, WORDS,
  alive, averageAlive, entropyBits, freshPct, simulate,
} from '../../lib/whatif/model-collapse';

const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (v: number) => `${Math.round(v * 100)}%`;

// bars
const TX0 = 70;
const TW = 206;
const PMAX = 0.6;
const RH = 19;
const RY0 = 30;
const bw = (p: number) => r1((Math.min(p, PMAX) / PMAX) * TW);

// alive chart
const X0 = 40;
const X1 = 352;
const CY0 = 12;
const CY1 = 112;
const gx = (g: number) => r1(X0 + (g / GENERATIONS) * (X1 - X0));
const gy = (a: number) => r1(CY1 - (a / K) * (CY1 - CY0));

export default function ModelCollapse() {
  const [fresh, setFresh] = useState(true);
  const [ni, setNi] = useState(SAMPLE_SIZES.indexOf(DEFAULT_N));
  const [fi, setFi] = useState(FRESH_STEPS.indexOf(DEFAULT_FRESH));
  const [gen, setGen] = useState(GENERATIONS);
  const [playing, setPlaying] = useState(false);
  const [replay, setReplay] = useState(0);

  const n = SAMPLE_SIZES[ni];
  const share = fresh ? FRESH_STEPS[fi] : 0;
  const run = useMemo(() => simulate(n, share), [n, share]);
  const avg = useMemo(() => averageAlive(n, share), [n, share]);
  const p = run[gen];
  const a = alive(p);
  const lost = WORDS.filter((_, i) => p[i] === 0);
  const colour = a >= 10 ? '#1f9d6b' : a >= 6 ? '#c28a00' : '#d6453d';

  useEffect(() => {
    if (!playing) return;
    if (gen >= GENERATIONS) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setGen((g) => Math.min(GENERATIONS, g + 1)), 170);
    return () => clearTimeout(id);
  }, [playing, gen]);

  const alivePath = run.slice(0, gen + 1).map((q, g) => `${g === 0 ? 'M' : 'L'}${gx(g)} ${gy(alive(q))}`).join(' ');
  const avgPath = avg.map((v, g) => `${g === 0 ? 'M' : 'L'}${gx(g)} ${gy(v)}`).join(' ');
  const key = `${fresh}-${n}-${share}-${replay}`;

  const who = fresh && share > 0 ? `${freshPct(share)} fresh real data in every round` : 'trained only on its own output';
  const verdict =
    gen === 0
      ? `Generation 0 is the real data: all ${K} words, from "the" at ${pct(REAL[0])} down to "zither" at ${pct(REAL[K - 1])}. Press Play it to train each new generation on what the last one wrote.`
      : `Generation ${gen}, ${who}, ${n} samples each round: ${a} of ${K} words left${lost.length > 0 ? ` (gone: ${lost.slice(0, 5).join(', ')}${lost.length > 5 ? ' and more' : ''})` : ''}. Averaged over ${RUNS} runs, ${avg[gen].toFixed(1)} of ${K} words are left at this generation.`;

  return (
    <WhatIfFrame
      title="Twelve words, each generation learns from the last one's output"
      withLabel="Fresh real data mixed in"
      withoutLabel="Only its own output"
      on={fresh}
      onChange={(v) => {
        setFresh(v);
        setGen(GENERATIONS);
        setPlaying(false);
        setReplay((x) => x + 1);
      }}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Samples per generation <b>{n}</b>
            </span>
            <input
              type="range"
              min={0}
              max={SAMPLE_SIZES.length - 1}
              step={1}
              value={ni}
              onChange={(e) => setNi(+e.target.value)}
              aria-label={`Samples per generation, one of ${SAMPLE_SIZES.join(', ')}`}
            />
          </label>
          <label className="field">
            <span>
              Fresh real data in each round <b>{fresh ? freshPct(FRESH_STEPS[fi]) : '0% (off)'}</b>
            </span>
            <input
              type="range"
              min={0}
              max={FRESH_STEPS.length - 1}
              step={1}
              value={fi}
              onChange={(e) => {
                setFi(+e.target.value);
                setFresh(true);
              }}
              aria-label="Share of fresh real data in each round, from 0 to 50 percent"
            />
          </label>
          <label className="field">
            <span>
              Generation <b>{gen}</b> of {GENERATIONS}
            </span>
            <input
              type="range"
              min={0}
              max={GENERATIONS}
              step={1}
              value={gen}
              onChange={(e) => {
                setPlaying(false);
                setGen(+e.target.value);
              }}
              aria-label={`Generation, from 0 to ${GENERATIONS}`}
            />
          </label>
          <div className="wt-btnrow">
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (playing) setPlaying(false);
                else {
                  if (gen >= GENERATIONS) setGen(0);
                  setPlaying(true);
                }
              }}
            >
              {playing ? 'Pause' : gen >= GENERATIONS ? 'Play it' : 'Keep playing'}
            </button>
          </div>
        </>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox={`0 0 360 ${RY0 + K * RH + 8}`} className="dx-svg wi-svg" role="img" aria-label={`How likely the model is to write each of ${K} words at generation ${gen}. ${a} words are still possible and ${K - a} have vanished.`}>
          <text x={4} y={16} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
            Generation {gen}: {a} of {K} words left
          </text>
          <line x1={TX0 + TW - 62} x2={TX0 + TW - 62} y1={6} y2={18} stroke="var(--ink)" strokeWidth={2} />
          <text x={TX0 + TW - 56} y={16} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            real data
          </text>
          {WORDS.map((w, i) => {
            const y = RY0 + i * RH;
            const gone = p[i] === 0;
            return (
              <g key={w}>
                <text x={4} y={y + 13} style={{ fill: gone ? 'var(--ink-2)' : 'var(--ink)', fontSize: 13, textDecoration: gone ? 'line-through' : 'none' }}>
                  {w}
                </text>
                <rect x={TX0} y={y + 1} width={TW} height={14} rx={3} fill="currentColor" fillOpacity={0.08} />
                <rect className="wt-hbar" x={TX0} y={y + 1} width={bw(p[i])} height={14} rx={3} fill={gone ? 'none' : colour} />
                <line x1={r1(TX0 + bw(REAL[i]))} x2={r1(TX0 + bw(REAL[i]))} y1={y - 1} y2={y + 17} stroke="var(--ink)" strokeWidth={2} />
                {gone ? (
                  <g>
                    <path d={`M${TX0 + 6} ${y + 4} l8 8 m0 -8 l-8 8`} stroke="#d6453d" strokeWidth={2.2} />
                    <text x={TX0 + 20} y={y + 13} className="wt-t-bad" style={{ fontSize: 12, fontWeight: 700 }}>
                      gone
                    </text>
                  </g>
                ) : null}
                <text x={TX0 + TW + 8} y={y + 13} style={{ fill: 'var(--ink)', fontSize: 13 }}>
                  {(p[i] * 100).toFixed(p[i] < 0.1 ? 1 : 0)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 172" className="dx-svg wi-svg" role="img" aria-label={`Number of words still possible after each generation. ${fresh && share > 0 ? 'With fresh real data it levels off well above zero.' : 'With only its own output it keeps falling.'}`}>
          {[0, 4, 8, 12].map((v) => (
            <g key={v}>
              <line x1={X0} x2={X1} y1={gy(v)} y2={gy(v)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
              <text x={X0 - 5} y={gy(v) + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                {v}
              </text>
            </g>
          ))}
          <path d={avgPath} fill="none" stroke="var(--ink)" strokeWidth={1.8} strokeDasharray="2 4" strokeLinecap="round" />
          <motion.path key={'a' + key} d={alivePath} fill="none" stroke={colour} strokeWidth={2.6} strokeLinejoin="round" initial={{ pathLength: gen === GENERATIONS ? 0.1 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: EASE }} />
          <circle cx={gx(gen)} cy={gy(a)} r={4.5} fill={colour} stroke="var(--surface)" strokeWidth={1.5} />
          <text x={X0} y={CY1 + 16} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            gen 0
          </text>
          <text x={(X0 + X1) / 2} y={CY1 + 16} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
            words still possible
          </text>
          <text x={X1} y={CY1 + 16} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            gen {GENERATIONS}
          </text>
          <line x1={X0} x2={X0 + 22} y1={CY1 + 34} y2={CY1 + 34} stroke={colour} strokeWidth={2.6} />
          <text x={X0 + 28} y={CY1 + 38} style={{ fill: 'var(--ink)', fontSize: 12 }}>
            this run
          </text>
          <line x1={X0 + 110} x2={X0 + 132} y1={CY1 + 34} y2={CY1 + 34} stroke="var(--ink)" strokeWidth={1.8} strokeDasharray="2 4" strokeLinecap="round" />
          <text x={X0 + 138} y={CY1 + 38} style={{ fill: 'var(--ink)', fontSize: 12 }}>
            average of {RUNS} runs
          </text>
        </svg>
      </div>

      <p className="wt-note">
        A toy, not a model of any real system. The "language" is 12 words with real probabilities proportional to 1 / rank^1.1 (so "the" is {pct(REAL[0])} and "zither" {pct(REAL[K - 1])}). Each generation draws {n} words from the previous generation, {share > 0 ? `swaps ${freshPct(share)} of them for draws from the real distribution, ` : ''}and fits itself by counting: a word's new probability is its count divided by {n}. A word that is never drawn gets probability 0 and cannot return unless fresh real data brings it back. Entropy, a measure of how varied the output is, is {entropyBits(REAL).toFixed(2)} bits for the real data and {entropyBits(p).toFixed(2)} bits at generation {gen}. The black tick on each bar is the real probability.
      </p>
    </WhatIfFrame>
  );
}

