import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { MAX_GAMMA, SIM_ROUNDS, expectedTokens, passesFor, rounds, simulatedMean, speedup } from '../../lib/whatif/speculative-decoding';

const ROWS = 6;
const X0 = 6;
const CW = 33;
const STEP = 37;
const PITCH = 46;
const REPLY = 100;
const GREEN = '#1f9d6b';
const RED = '#d6453d';
const BLUE = '#2b7fd6';

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const f2 = (x: number) => x.toFixed(2);
const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Each row is one pass of the big model. With drafting, a small model first proposes gamma tokens; the big model checks them
 * all at once. Green drafts are kept up to the first red one, everything after a red one is thrown away,
 * and the big model always adds one token of its own (blue). Without drafting, a pass writes exactly one token.
 */
export default function SpeculativeDecodingWhatIf() {
  const [spec, setSpec] = useState(true);
  const [alpha, setAlpha] = useState(0.7);
  const [gamma, setGamma] = useState(4);
  const [cost, setCost] = useState(0.05);
  const [shown, setShown] = useState(ROWS);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setShown((s) => {
        if (s >= ROWS) {
          setPlaying(false);
          return ROWS;
        }
        return s + 1;
      });
    }, 650);
    return () => clearInterval(id);
  }, [playing]);

  const strip = useMemo(() => rounds(alpha, gamma, ROWS), [alpha, gamma]);
  const E = expectedTokens(alpha, gamma);
  const sim = useMemo(() => simulatedMean(alpha, gamma), [alpha, gamma]);
  const sp = speedup(alpha, gamma, cost);
  const specTotal = strip.slice(0, shown).reduce((s, r) => s + r.tokens, 0);
  const aloneTotal = shown;
  const need = passesFor(REPLY, alpha, gamma, true);

  const verdict = spec ? (
    <>
      With drafting, one big-model pass writes about {f2(E)} tokens at a {pct(alpha)} acceptance rate with {gamma} drafts, so a {REPLY}-token reply needs about {Math.round(need)} big-model passes instead of {REPLY}. {sp >= 1 ? `That is roughly ${f2(sp)} times faster` : `But the drafting itself costs time, so overall it is slower, at ${f2(sp)} times the speed`} when a draft run costs {pct(cost)} of a big run (example).
    </>
  ) : (
    <>
      The big model alone writes exactly 1 token per pass, so a {REPLY}-token reply needs {REPLY} passes. Drafting {gamma} tokens at {pct(alpha)} acceptance would need about {Math.round(need)} (example).
    </>
  );

  const labelY = (r: number) => 4 + r * PITCH + 12;
  const cellY = (r: number) => 4 + r * PITCH + 18;
  const legendY = 4 + ROWS * PITCH + 4;
  const barsY = legendY + 52;
  const H = barsY + 108;
  const BAR_X = 8;
  const BAR_W = 348;

  const cellFor = (r: number, i: number): { fill: string; text: string; dashed?: boolean; label: string } => {
    const row = strip[r];
    if (i === gamma) return { fill: BLUE, text: '+1', label: 'the big model’s own token' };
    if (i < row.accepted) return { fill: GREEN, text: '✓', label: 'draft accepted' };
    if (i === row.accepted) return { fill: RED, text: '✗', label: 'draft rejected' };
    return { fill: 'none', text: '·', dashed: true, label: 'draft thrown away' };
  };

  const bars = [
    { name: 'Big model alone', v: 1, fill: BLUE, on: !spec },
    { name: `Draft and verify (the paper’s formula)`, v: E, fill: GREEN, on: spec },
  ];

  return (
    <WhatIfFrame
      title="Six passes of the big model, token by token"
      withLabel="Draft, then verify"
      withoutLabel="Big model alone"
      on={spec}
      onChange={setSpec}
      verdict={verdict}
      controls={
        <>
          <label className="field wl-field">
            <span>
              How often the big model agrees with a draft token <b>{pct(alpha)}</b>
            </span>
            <input type="range" min={0.1} max={0.95} step={0.05} value={alpha} disabled={!spec} onChange={(e) => setAlpha(Math.round(+e.target.value * 100) / 100)} aria-label="Acceptance rate" aria-valuetext={pct(alpha)} />
          </label>
          <label className="field wl-field">
            <span>
              Tokens drafted per pass <b>{gamma}</b>
            </span>
            <input type="range" min={1} max={MAX_GAMMA} step={1} value={gamma} disabled={!spec} onChange={(e) => setGamma(+e.target.value)} aria-label="Tokens drafted per pass" />
          </label>
          <label className="field wl-field">
            <span>
              Cost of one draft run, against one big run <b>{pct(cost)}</b>
            </span>
            <input type="range" min={0.01} max={0.3} step={0.01} value={cost} disabled={!spec} onChange={(e) => setCost(Math.round(+e.target.value * 100) / 100)} aria-label="Cost of one draft run compared with one big-model run" aria-valuetext={pct(cost)} />
          </label>
          <div className="wl-btnrow">
            <button
              type="button"
              className="btn quiet wl-btn"
              onClick={() => {
                setShown(0);
                setPlaying(true);
              }}
            >
              {playing ? 'Playing…' : 'Play it'}
            </button>
          </div>
        </>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: a big model checks one token per pass, which is slow. A small, fast draft model guesses the next few tokens. The big model then checks all the guesses in one pass, keeps the good ones and fixes the first bad one. The text is the same text the big model would have written alone. Example numbers.
      </p>
      <svg viewBox={`0 0 364 ${H}`} className="dx-svg wi-svg wl-cap" role="img" aria-label={`Six passes of the big model. ${spec ? `With drafting they write ${specTotal} tokens` : `Alone they write ${aloneTotal} tokens`}.`}>
        {Array.from({ length: ROWS }, (_, r) => {
          const row = strip[r];
          const n = spec ? row.tokens : 1;
          const visible = r < shown;
          return (
            <motion.g key={r} initial={false} animate={{ opacity: visible ? 1 : 0.1 }} transition={{ duration: 0.4, ease: EASE }}>
              <text x={X0} y={labelY(r)} style={{ fill: 'var(--ink)', fontSize: 13 }}>
                <tspan style={{ fontWeight: 700 }}>Pass {r + 1}:</tspan> {n} {n === 1 ? 'token' : 'tokens'} written
              </text>
              {spec ? (
                Array.from({ length: gamma + 1 }, (_, i) => {
                  const c = cellFor(r, i);
                  return (
                    <g key={i}>
                      <rect x={X0 + i * STEP} y={cellY(r)} width={CW} height={24} rx={6} fill={c.fill} fillOpacity={c.dashed ? 0 : 0.9} stroke={c.dashed ? 'var(--ink-2)' : c.fill} strokeDasharray={c.dashed ? '3 3' : undefined} strokeWidth={1.5}>
                        <title>{c.label}</title>
                      </rect>
                      <text x={X0 + i * STEP + CW / 2} y={cellY(r) + 17} textAnchor="middle" style={{ fill: c.dashed ? 'var(--ink-2)' : '#fff', fontSize: 13, fontWeight: 700 }}>
                        {c.text}
                      </text>
                    </g>
                  );
                })
              ) : (
                <g>
                  <rect x={X0} y={cellY(r)} width={CW} height={24} rx={6} fill={BLUE} fillOpacity={0.9} stroke={BLUE} strokeWidth={1.5} />
                  <text x={X0 + CW / 2} y={cellY(r) + 17} textAnchor="middle" style={{ fill: '#fff', fontSize: 13, fontWeight: 700 }}>
                    +1
                  </text>
                </g>
              )}
            </motion.g>
          );
        })}
        {[
          { c: GREEN, t: '✓ draft kept', x: X0, y: 0 },
          { c: RED, t: '✗ draft rejected', x: X0 + 104, y: 0 },
          { c: BLUE, t: '+1 the big model’s own token', x: X0, y: 20 },
        ].map((l) => (
          <g key={l.t}>
            <rect x={l.x} y={legendY + l.y} width={12} height={12} rx={3} fill={l.c} />
            <text x={l.x + 18} y={legendY + 11 + l.y} style={{ fill: 'var(--ink)', fontSize: 12 }}>
              {l.t}
            </text>
          </g>
        ))}
        <rect x={X0 + 236} y={legendY} width={12} height={12} rx={3} fill="none" stroke="var(--ink-2)" strokeDasharray="3 3" />
        <text x={X0 + 254} y={legendY + 11} style={{ fill: 'var(--ink)', fontSize: 12 }}>
          · thrown away
        </text>
        <text x={X0 + 352} y={legendY + 31} textAnchor="end" style={{ fill: 'var(--ink)', fontSize: 12.5, fontWeight: 700 }}>
          {shown} passes: {spec ? specTotal : aloneTotal} tokens
        </text>
        <text x={BAR_X} y={barsY} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
          Tokens written per big-model pass (average)
        </text>
        {bars.map((b, i) => {
          const y = barsY + 10 + i * 40;
          return (
            <g key={b.name} opacity={b.on ? 1 : 0.45}>
              <text x={BAR_X} y={y + 12} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: b.on ? 700 : 400 }}>
                {b.on ? '▶ ' : ''}
                {b.name}
              </text>
              <rect x={BAR_X} y={y + 17} width={BAR_W} height={14} rx={5} fill="currentColor" opacity={0.08} />
              <motion.rect x={BAR_X} y={y + 17} height={14} rx={5} fill={b.fill} initial={false} animate={{ width: r4((b.v / (MAX_GAMMA + 1)) * BAR_W) }} transition={{ duration: 0.5, ease: EASE }} />
              <text x={BAR_X + BAR_W} y={y + 12} textAnchor="end" style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
                {f2(b.v)}
              </text>
            </g>
          );
        })}
        <text x={BAR_X} y={barsY + 102} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
          Scale runs from 0 to {MAX_GAMMA + 1}, the most one pass can write with {MAX_GAMMA} drafts.
        </text>
      </svg>
      <details className="wl-note">
        <summary>The numbers behind the strip</summary>
        <p>
          The paper’s simplifying assumption is that every draft token is accepted with the same chance alpha, independently of the others. Then one big-model pass writes 1 + alpha + alpha² + … + alpha^gamma tokens on average, which is (1 − alpha^(gamma+1)) / (1 − alpha). Here that is {f2(E)}. A simulated average over {SIM_ROUNDS.toLocaleString('en-US')} made-up passes gives {f2(sim)}, which agrees. Real acceptance rates vary with the text and the draft model; the strip draws a fixed, seeded set of random draws, not real model output.
        </p>
        <p>
          Wall-time speed-up (Theorem 3.8 of the paper) is that expected number divided by (gamma × c + 1), where c is the cost of one draft run compared with one big-model run. Here: {f2(E)} / ({gamma} × {cost.toFixed(2)} + 1) = {f2(sp)}. If acceptance is low and drafts are costly, the result can fall below 1 and drafting makes things slower. The cost c is an example value; the paper reports a 2X to 3X speed-up for T5-XXL, with identical outputs.
        </p>
      </details>
    </WhatIfFrame>
  );
}

