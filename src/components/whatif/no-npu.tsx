import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  BLOCKS,
  EXAMPLE_CPU_MMACS_PER_S,
  EXAMPLE_NPU_HANDOFF_MS,
  EXAMPLE_NPU_MMACS_PER_S,
  RATE,
  deadlineMs,
  largestModelThatFits,
  run,
} from '../../lib/whatif/no-npu';

const W = 340;
const TOP = 30;
const BOT = 160;
const BW = W / BLOCKS;

const ms = (v: number) => (v < 10 ? v.toFixed(2) : v.toFixed(1)) + ' ms';

/**
 * Forty audio blocks, one after another. Each bar is the time the example chip needs for that block and the dashed
 * line is the deadline. A block that takes longer than its deadline is a dropout. All hardware numbers are examples.
 */
export default function NoNpuWhatIf() {
  const [npu, setNpu] = useState(true);
  const [mmacs, setMmacs] = useState(1.6);
  const [block, setBlock] = useState(128);
  const [upTo, setUpTo] = useState(BLOCKS);
  const [playing, setPlaying] = useState(false);

  const cpu = useMemo(() => run('cpu', mmacs, block), [mmacs, block]);
  const acc = useMemo(() => run('npu', mmacs, block), [mmacs, block]);
  const cur = npu ? acc : cpu;
  const other = npu ? cpu : acc;
  const dl = cur.deadlineMs;

  const scale = Math.max(dl * 1.6, cpu.worstMs * 1.06);
  const yOf = (v: number) => BOT - (v / scale) * (BOT - TOP);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setUpTo((u) => {
        if (u >= BLOCKS) {
          setPlaying(false);
          return BLOCKS;
        }
        return u + 1;
      });
    }, 70);
    return () => clearInterval(id);
  }, [playing]);

  const play = () => {
    setUpTo(0);
    setPlaying(true);
  };

  const shownMissed = cur.missed.slice(0, upTo).filter(Boolean).length;
  const fitsCpu = largestModelThatFits('cpu', block);

  return (
    <WhatIfFrame
      title="Forty audio blocks against a deadline (example hardware)"
      withLabel="With an accelerator"
      withoutLabel="CPU only"
      on={npu}
      onChange={setNpu}
      verdict={
        npu ? (
          cur.missCount === 0 ? (
            <>On the example accelerator the model needs about {ms(cur.meanMs)} per block against a {ms(dl)} deadline: 0 of {BLOCKS} blocks missed.</>
          ) : (
            <>Even the example accelerator misses {cur.missCount} of {BLOCKS} blocks here: the model takes about {ms(cur.meanMs)} per block against a {ms(dl)} deadline.</>
          )
        ) : cur.missCount === 0 ? (
          <>On the example CPU this model fits: about {ms(cur.meanMs)} per block against a {ms(dl)} deadline, 0 of {BLOCKS} blocks missed. Make the model bigger to see it break.</>
        ) : (
          <>
            On the example CPU the model needs about {ms(cur.meanMs)} per block against a {ms(dl)} deadline: {cur.missCount} of {BLOCKS} blocks are missed, and each one is an audible click.
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Model size <b>{mmacs.toFixed(1)} M multiply-adds</b>
            </span>
            <input type="range" min={0.2} max={3} step={0.1} value={mmacs} onChange={(e) => { setPlaying(false); setUpTo(BLOCKS); setMmacs(+e.target.value); }} aria-label="Model size in millions of multiply-adds per audio block" />
          </label>
          <label className="field">
            <span>
              Block <b>{block} samples = {ms(deadlineMs(block))}</b>
            </span>
            <input type="range" min={64} max={256} step={32} value={block} onChange={(e) => { setPlaying(false); setUpTo(BLOCKS); setBlock(+e.target.value); }} aria-label={`Audio block size in samples at ${RATE} hertz`} />
          </label>
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Play it'}
          </button>
        </>
      }
    >
      <svg viewBox={`0 0 ${W} 214`} className="dx-svg wi-svg we-svg" role="img" aria-label={`${BLOCKS} audio blocks. ${cur.missCount} of them take longer than the ${dl.toFixed(1)} millisecond deadline on the ${npu ? 'accelerator' : 'CPU'}.`}>
        <text x={0} y={14} className="we-t-b">Time to process each block</text>
        <line x1={0} x2={W} y1={BOT} y2={BOT} className="we-axis" />
        {cur.latencies.map((l, i) => {
          const visible = i < upTo;
          const bad = cur.missed[i];
          const top = yOf(l);
          return (
            <g key={i}>
              <motion.rect
                x={i * BW + 1}
                width={BW - 2}
                rx={2}
                fill={bad ? '#d6453d' : '#1f9d6b'}
                initial={false}
                animate={{ y: top, height: BOT - top, opacity: visible ? 1 : 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              />
              {bad && visible && (
                <text x={i * BW + BW / 2} y={Math.max(TOP - 14, top - 3)} textAnchor="middle" className="we-t-bad">×</text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={yOf(dl)} y2={yOf(dl)} stroke="var(--ink)" strokeWidth={1.6} strokeDasharray="6 4" />
        <text x={W} y={yOf(dl) - 5} textAnchor="end" className="we-t-b" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>deadline {ms(dl)}</text>
        <text x={0} y={BOT + 15} className="we-t">block 1</text>
        <text x={W} y={BOT + 15} textAnchor="end" className="we-t">block {BLOCKS}</text>

        <text x={0} y={BOT + 38} className="we-t-b">What you hear</text>
        {cur.missed.map((bad, i) => (
          <motion.rect
            key={i}
            x={i * BW + 1}
            y={BOT + 46}
            width={BW - 2}
            height={22}
            rx={2}
            fill={bad ? '#d6453d' : '#1f9d6b'}
            initial={false}
            animate={{ opacity: i < upTo ? (bad ? 1 : 0.35) : 0.08 }}
            transition={{ duration: 0.35, ease: EASE }}
          />
        ))}
        {cur.missed.map((bad, i) => bad && i < upTo && <text key={`x${i}`} x={i * BW + BW / 2} y={BOT + 62} textAnchor="middle" fill="#fff" style={{ fontSize: 12, fontWeight: 700 }}>×</text>)}
        <text x={W} y={BOT + 38} textAnchor="end" className="we-t">red × = click or dropout</text>
      </svg>
      <ul className="we-stats">
        <li>
          Deadline per block<b>{ms(dl)}</b>
        </li>
        <li>
          Average time<b>{ms(cur.meanMs)}</b>
        </li>
        <li className={cur.worstMs > dl ? 'is-bad' : 'is-good'}>
          Slowest block<b>{ms(cur.worstMs)}</b>
        </li>
        <li className={shownMissed > 0 ? 'is-bad' : 'is-good'}>
          Blocks missed<b>{shownMissed} of {upTo}</b>
        </li>
        <li className={cur.load > 1 ? 'is-bad' : ''}>
          Average load<b>{Math.round(cur.load * 100)}% of the deadline</b>
        </li>
      </ul>
      <p className="we-note">
        {npu ? 'The same model on the CPU' : 'The same model on the accelerator'} would average {ms(other.meanMs)} per block and miss {other.missCount} of {BLOCKS}. On the example CPU, the largest model that fits an average block in a {ms(dl)} deadline is about {fitsCpu.toFixed(1)} million multiply-adds.
      </p>
      <p className="we-example">
        <b>All hardware numbers are generic examples for this demo, not a claim about any product.</b> Example CPU-class core: about {EXAMPLE_CPU_MMACS_PER_S} million multiply-adds per second. Example accelerator-class engine: about {EXAMPLE_NPU_MMACS_PER_S.toLocaleString('en-US')} million per second plus {EXAMPLE_NPU_HANDOFF_MS} ms to hand each block over. Audio at {RATE.toLocaleString('en-US')} samples a second. About 1 block in 10 runs 1.6 times slower than usual (an interrupt or a cache miss), the same blocks on both. A block is missed if it takes longer than the time it lasts.
      </p>
    </WhatIfFrame>
  );
}
