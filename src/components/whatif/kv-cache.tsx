import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { cacheMiB, positionsComputed, slowdown, totalComputed } from '../../lib/whatif/kv-cache';

const PROMPT = 6;
const REPLY = 10;
const CELL = 20;
const GAP = 3;

/**
 * A strip of token cells grows as the reply is written. Lit cells are the positions the model had to
 * work on at that step. With a cache only the newest cell lights; without one the whole strip does.
 */
export default function KvCacheWhatIf() {
  const [cache, setCache] = useState(true);
  const [step, setStep] = useState(REPLY - 1);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const per = useMemo(() => positionsComputed(PROMPT, REPLY, cache), [cache]);
  const doneSoFar = per.slice(0, step + 1).reduce((a, b) => a + b, 0);
  const contextNow = PROMPT + step + 1;

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= REPLY - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 650);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing]);

  const play = () => {
    setStep(0);
    setPlaying(true);
  };

  const width = (PROMPT + REPLY) * (CELL + GAP);
  return (
    <WhatIfFrame
      title="Writing a reply one token at a time"
      withLabel="With KV cache"
      withoutLabel="Without it"
      on={cache}
      onChange={(v) => setCache(v)}
      verdict={
        cache ? (
          <>After {step + 1} tokens the model has done {doneSoFar} units of work. Each new token adds just one, and the cache holds about {cacheMiB(4000).toFixed(0)} MiB per 4,000 tokens of context (example 8B-class model).</>
        ) : (
          <>After {step + 1} tokens the model has done {doneSoFar} units of work. Every token re-reads the whole context, so the total grows with the square of the length: {slowdown(500, 500).toFixed(0)} times more work for a 500-token prompt and a 500-token reply.</>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Tokens written <b>{step + 1}</b> of {REPLY}
            </span>
            <input type="range" min={0} max={REPLY - 1} value={step} onChange={(e) => { setPlaying(false); setStep(+e.target.value); }} aria-label="Tokens written so far" />
          </label>
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Play it'}
          </button>
        </>
      }
    >
      <svg viewBox={`0 0 ${width} 104`} className="dx-svg wi-svg" role="img" aria-label={`Each cell is one token in the context. Lit cells are the tokens the model works on at step ${step + 1}.`}>
        {Array.from({ length: PROMPT + REPLY }, (_, i) => {
          const inContext = i < contextNow;
          const first = step === 0;
          const lit = !inContext ? false : first ? i < PROMPT : cache ? i === contextNow - 1 : true;
          const isReply = i >= PROMPT;
          return (
            <motion.rect
              key={i}
              x={i * (CELL + GAP)}
              y={26}
              width={CELL}
              height={CELL + 14}
              rx={6}
              fill={cache ? '#1f9d6b' : '#d6453d'}
              initial={false}
              animate={{ opacity: inContext ? 1 : 0.2, fillOpacity: lit ? 0.9 : 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              stroke="currentColor"
              strokeWidth={1.3}
            />
          );
        })}
        <text x={0} y={16} className="dx-small" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>prompt</text>
        <text x={PROMPT * (CELL + GAP)} y={16} className="dx-small" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>reply</text>
        <text x={0} y={96} className="dx-small" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          lit = worked on this step: {per[step]} {per[step] === 1 ? 'token' : 'tokens'}
        </text>
      </svg>
      <p className="wi-note" style={{ margin: '0.6rem 0 0', fontSize: '0.9rem', color: 'var(--ink-2)' }}>
        Total units of work for the 10 tokens: {totalComputed(PROMPT, REPLY, true)} with the cache, {totalComputed(PROMPT, REPLY, false)} without.
      </p>
    </WhatIfFrame>
  );
}
