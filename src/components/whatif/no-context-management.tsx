import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  INSTRUCTIONS,
  STEPS,
  WINDOW,
  firstClearStep,
  firstFullStep,
  fmtTokens,
  peakUsed,
  simulate,
} from '../../lib/whatif/no-context-management';

const RED = '#d6453d';
const GREEN = '#1f9d6b';
const BX = 8;
const BW = 324;
const COLORS = {
  instructions: '#5b3dff',
  summary: '#0f8fa3',
  stubs: '#8d8aa8',
  results: '#e08a1e',
  model: '#6b7280',
};
const PARTS = [
  ['instructions', 'Instructions and rules'],
  ['summary', 'Summary of old steps'],
  ['stubs', 'Cleared results (stubs)'],
  ['results', 'Tool results in full'],
  ['model', 'Agent messages'],
] as const;

const CX0 = 8;
const CW = 324;
const CY0 = 150;
const CH = 70;
const xs = (step: number) => CX0 + (CW * (step - 1)) / (STEPS - 1);
const ys = (tokens: number) => CY0 + CH - (CH * tokens) / WINDOW;

/**
 * The context window as a bar that fills over 30 steps. Without management tool results pile up until the
 * window overflows and the oldest text, the instructions, falls off the front. With management old results are
 * cleared and summarised and the instructions stay pinned.
 */
export default function NoContextManagementWhatIf() {
  const [managed, setManaged] = useState(false);
  const [step, setStep] = useState(24);
  const [playing, setPlaying] = useState(false);

  const snaps = useMemo(() => simulate(managed), [managed]);
  const s = snaps[step - 1];
  const full = firstFullStep();
  const clear = firstClearStep();

  useEffect(() => {
    if (!playing) return;
    if (step >= STEPS) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((v) => v + 1), 260);
    return () => clearTimeout(t);
  }, [playing, step]);

  const play = () => {
    setStep(1);
    setPlaying(true);
  };

  // segments of the bar, left to right
  let acc = 0;
  const segs = PARTS.map(([key, label]) => {
    const tokens = s[key];
    const x = BX + (BW * acc) / WINDOW;
    const w = (BW * tokens) / WINDOW;
    acc += tokens;
    return { key, label, tokens, x, w };
  });
  const lost = !managed && s.instructions < INSTRUCTIONS;
  const pctUsed = Math.round((s.used / WINDOW) * 100);

  const verdict = managed ? (
    <>
      Step {step}: {fmtTokens(s.used)} of {fmtTokens(WINDOW)} tokens used ({pctUsed}%). Old results were cleared from step {clear} on, the summary keeps what mattered, and the {fmtTokens(INSTRUCTIONS)} tokens of instructions are still there. Over all 30 steps the peak is {fmtTokens(peakUsed(true))}.
    </>
  ) : lost ? (
    <>
      Step {step}: the window is full and {fmtTokens(s.cut)} tokens of the oldest text have been cut off. The oldest text is the instructions, so the agent no longer sees its own rules.
    </>
  ) : (
    <>
      Step {step}: {fmtTokens(s.used)} of {fmtTokens(WINDOW)} tokens used ({pctUsed}%). Nothing is ever removed, so the window overflows at step {full} and the instructions are the first thing to fall off.
    </>
  );

  return (
    <WhatIfFrame
      title="A 30-step agent run, and what its context window holds"
      withLabel="With context management"
      withoutLabel="None"
      on={managed}
      onChange={(v) => {
        setPlaying(false);
        setManaged(v);
      }}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Step <b>{step}</b> of {STEPS}
            </span>
            <input type="range" min={1} max={STEPS} value={step} onChange={(e) => { setPlaying(false); setStep(+e.target.value); }} aria-label="Step of the agent run" />
          </label>
          <button type="button" className="btn quiet" onClick={play} style={{ minHeight: 44 }}>
            {playing ? 'Playing…' : 'Play it'}
          </button>
        </>
      }
    >
      <p className="wa-tag">Example sizes: window {fmtTokens(WINDOW)} tokens, instructions {fmtTokens(INSTRUCTIONS)}, agent message 150 and tool results 800 to 3,000 tokens per step.</p>
      <svg
        viewBox="0 0 340 236"
        className="dx-svg wi-svg wa-svg"
        role="img"
        aria-label={`The context window at step ${step} of ${STEPS}: ${fmtTokens(s.used)} of ${fmtTokens(WINDOW)} tokens used. ${lost ? 'The instructions have been cut off.' : 'The instructions are still in the window.'}`}
      >
        <text x={BX} y={18} className="wa-tb">Context window at step {step}</text>
        <text x={BX + BW} y={18} textAnchor="end" className="wa-tb" fill={lost ? RED : undefined}>
          {fmtTokens(s.used)} / {fmtTokens(WINDOW)}
        </text>
        <rect x={BX} y={28} width={BW} height={40} rx={8} fill="none" stroke={s.used >= WINDOW * 0.99 ? RED : 'currentColor'} strokeWidth={s.used >= WINDOW * 0.99 ? 2.6 : 1.6} />
        {segs.map((g) => (
          <motion.rect
            key={g.key}
            y={30}
            height={36}
            fill={COLORS[g.key]}
            initial={false}
            animate={{ x: g.x, width: Math.max(0, g.w) }}
            transition={{ duration: 0.35, ease: EASE }}
          />
        ))}
        {/* the instructions' place, drawn dashed red when they have been cut off */}
        {lost && (
          <g>
            <rect x={BX} y={30} width={(BW * INSTRUCTIONS) / WINDOW} height={36} fill="none" stroke={RED} strokeWidth={2} strokeDasharray="4 3" />
            <text x={BX} y={88} className="wa-tb" fill={RED}>✗ instructions cut off</text>
          </g>
        )}
        {!lost && (
          <text x={BX} y={88} className="wa-t2">
            {managed ? '✓ instructions pinned' : '✓ instructions still here'}
          </text>
        )}
        {s.cut > 0 && (
          <text x={BX + BW} y={88} textAnchor="end" className="wa-t" fill={RED}>
            {fmtTokens(s.cut)} tokens cut
          </text>
        )}
        {/* usage over the run */}
        <text x={CX0} y={122} className="wa-tb">Tokens in the window, step by step</text>
        <line x1={CX0} x2={CX0 + CW} y1={ys(WINDOW)} y2={ys(WINDOW)} stroke={RED} strokeWidth={1.4} strokeDasharray="5 4" />
        <text x={CX0 + CW} y={ys(WINDOW) - 5} textAnchor="end" className="wa-t2">window limit</text>
        <line x1={CX0} x2={CX0 + CW} y1={ys(0)} y2={ys(0)} stroke="var(--line)" strokeWidth={1} />
        <polyline
          points={snaps.map((x) => `${xs(x.step)},${ys(x.used)}`).join(' ')}
          fill="none"
          stroke={managed ? GREEN : RED}
          strokeWidth={2.5}
          strokeLinejoin="round"
          opacity={0.35}
        />
        <polyline
          points={snaps.slice(0, step).map((x) => `${xs(x.step)},${ys(x.used)}`).join(' ')}
          fill="none"
          stroke={managed ? GREEN : RED}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <circle cx={xs(step)} cy={ys(s.used)} r={5} fill="var(--surface)" stroke={managed ? GREEN : RED} strokeWidth={2.5} />
        {!managed && full && (
          <text x={xs(full)} y={ys(0) + 16} textAnchor="middle" className="wa-t" fill={RED}>full at {full}</text>
        )}
        {managed && clear && (
          <text x={xs(clear)} y={ys(0) + 16} textAnchor="middle" className="wa-t" fill={GREEN}>cleared at {clear}</text>
        )}
        <text x={CX0} y={ys(0) + 16} className="wa-t2">1</text>
        <text x={CX0 + CW} y={ys(0) + 16} textAnchor="end" className="wa-t2">{STEPS}</text>
      </svg>
      <ul className="wa-parts" aria-label="What the window holds at this step, in tokens">
        {segs.map((g) => (
          <li key={g.key}>
            <i style={{ background: COLORS[g.key] }} aria-hidden="true" />
            <span>{g.label}</span>
            <b>{fmtTokens(g.tokens)}</b>
          </li>
        ))}
      </ul>
    </WhatIfFrame>
  );
}

