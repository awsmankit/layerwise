import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { N, a, b, tasks, taskIds, mixed, withFfn, withoutFfn, mse, rightFlags, conflictForAloneFfn, type TaskId } from '../../lib/whatif/no-feed-forward';

const X0 = 6;
const COL = 44;
const CELL = 36;
const PITCH = 64;

const num = (x: number) => String(Math.round(x * 100) / 100 + 0); // 0.5, 1, 0.43 (the + 0 turns -0 into 0)
const r4 = (x: number) => Math.round(x * 10000) / 10000;

const mixText: Record<TaskId, string> = {
  copy: 'each token takes its left neighbour’s bit',
  'xor-token': 'tokens keep their own bits (nothing to fetch)',
  'xor-neighbour': 'each token averages itself and its left neighbour',
};

/**
 * A block has two parts. Attention mixes information between tokens. The feed-forward layer then works on each token
 * on its own. The figure follows eight toy tokens through both and checks the answer. Press Play it to see the steps one by one.
 */
export default function NoFeedForwardWhatIf() {
  const [ffn, setFfn] = useState(true);
  const [taskId, setTaskId] = useState<TaskId>('xor-neighbour');
  const [stage, setStage] = useState(3);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStage((s) => {
        if (s >= 3) {
          setPlaying(false);
          return 3;
        }
        return s + 1;
      });
    }, 750);
    return () => clearInterval(id);
  }, [playing]);

  const t = tasks[taskId];
    const s = useMemo(() => mixed(t), [t]);
  const out = useMemo(() => (ffn ? withFfn(t) : withoutFfn(t)), [t, ffn]);
  const flags = rightFlags(out, t.target);
  const right = flags.filter(Boolean).length;
  const err = mse(out, t.target);
  const conflict = conflictForAloneFfn(t);
  const twoBits = t.channels.length === 2;
  const allRight = right === N;

  const verdict = ffn ? (
    <>
      With both parts, {right} of {N} tokens are right and the error is {num(err)}: attention mixed the tokens, then the feed-forward layer applied the rule to each one (toy).
    </>
  ) : allRight ? (
    <>
      Without the feed-forward layer, {right} of {N} tokens are still right: this task only needs mixing, and attention does that (toy).
    </>
  ) : (
    <>
      Without the feed-forward layer only {right} of {N} tokens are right and the error is {num(err)}, even with the best straight-line readout. Mixing alone cannot apply the rule (toy).
    </>
  );

  const rows = ['1. Tokens go in', '2. Attention mixes the tokens', ffn ? '3. Feed-forward, token by token' : '3. No feed-forward: best straight line', '4. The right answer'];
  const rowY = (r: number) => 4 + r * PITCH;
  const H = rowY(4) + 38;
  const show = (r: number) => stage >= r;

  const cell = (r: number, i: number, text: string, extra?: { stroke?: string; mark?: string; sub?: string }) => {
    const x = X0 + i * COL + 2;
    const y = rowY(r) + 20;
    return (
      <g key={`${r}-${i}`}>
        <rect x={x} y={y} width={COL - 4} height={CELL} rx={7} fill="var(--surface)" stroke={extra?.stroke ?? 'currentColor'} strokeWidth={extra?.stroke ? 2 : 1} opacity={extra?.stroke ? 1 : 0.9} />
        <text x={x + (COL - 4) / 2} y={y + (extra?.mark || extra?.sub ? 15 : 23)} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
          {text}
        </text>
        {(extra?.mark || extra?.sub) && (
          <text x={x + (COL - 4) / 2} y={y + 30} textAnchor="middle" style={{ fill: extra?.stroke ?? 'var(--ink-2)', fontSize: 12, fontWeight: extra?.mark ? 700 : 400 }}>
            {extra?.mark ?? extra?.sub}
          </text>
        )}
      </g>
    );
  };

  return (
    <WhatIfFrame
      title="Follow eight tokens through one block"
      withLabel="With feed-forward"
      withoutLabel="Without it"
      on={ffn}
      onChange={setFfn}
      verdict={verdict}
      controls={
        <>
          <label className="field wl-field">
            <span>The job the block must do</span>
            <select className="wl-select" value={taskId} onChange={(e) => setTaskId(e.target.value as TaskId)} aria-label="Which job the block must do">
              {taskIds.map((id) => (
                <option key={id} value={id}>
                  {tasks[id].name}
                </option>
              ))}
            </select>
          </label>
          <div className="wl-btnrow">
            <button
              type="button"
              className="btn quiet wl-btn"
              onClick={() => {
                setStage(0);
                setPlaying(true);
              }}
            >
              {playing ? 'Playing…' : 'Play it'}
            </button>
            <button type="button" className="btn quiet wl-btn" onClick={() => { setPlaying(false); setStage((x) => (x >= 3 ? 0 : x + 1)); }}>
              Next step
            </button>
          </div>
        </>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: attention is the group chat, where tokens pass information to each other. The feed-forward layer is each token thinking on its own. {t.plain} The attention step here: {mixText[taskId]}.
      </p>
      <svg viewBox={`0 0 364 ${H}`} className="dx-svg wi-svg wl-cap" role="img" aria-label={`Eight toy tokens pass through attention and then ${ffn ? 'a feed-forward layer' : 'a straight-line readout'}. ${right} of ${N} answers are right.`}>
        {rows.map((title, r) => (
          <motion.g key={r} initial={false} animate={{ opacity: show(r) ? 1 : 0.12 }} transition={{ duration: 0.45, ease: EASE }}>
            <text x={X0} y={rowY(r) + 13} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
              {title}
            </text>
            {r === 0 &&
              Array.from({ length: N }, (_, i) => cell(0, i, twoBits ? `${a[i]}  ${b[i]}` : String(a[i]), { sub: twoBits ? 'a  b' : 'a' }))}
            {r === 1 && Array.from({ length: N }, (_, i) => cell(1, i, num(s[i]), { sub: twoBits ? 'a + b' : 'mix' }))}
            {r === 2 &&
              Array.from({ length: N }, (_, i) =>
                cell(2, i, num(out[i]), { stroke: show(3) ? (flags[i] ? '#1f9d6b' : '#d6453d') : undefined, mark: show(3) ? (flags[i] ? '✓' : '✗') : undefined }),
              )}
            {r === 3 && Array.from({ length: N }, (_, i) => cell(3, i, String(t.target[i])))}
          </motion.g>
        ))}
        <motion.g initial={false} animate={{ opacity: show(3) ? 1 : 0.12 }} transition={{ duration: 0.45, ease: EASE }}>
          <rect x={X0} y={rowY(4) + 2} width={352} height={30} rx={15} fill={allRight ? '#1f9d6b' : '#d6453d'} opacity={0.16} stroke={allRight ? '#1f9d6b' : '#d6453d'} strokeWidth={1.5} />
          <text x={182} y={r4(rowY(4) + 22)} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
            {allRight ? '✓' : '✗'} {right} of {N} right · error {num(err)}
          </text>
        </motion.g>
      </svg>
      {conflict && (
        <p className="wl-note">
          A feed-forward layer on its own would also fail here: tokens {conflict[0] + 1} and {conflict[1] + 1} carry the same bits (a = {a[conflict[0]]}, b = {b[conflict[0]]}) but need different answers ({t.target[conflict[0]]} and {t.target[conflict[1]]}). Only mixing can tell them apart.
        </p>
      )}
      <details className="wl-note">
        <summary>The numbers behind the rows (toy model)</summary>
        <p>
          Each token carries two bits, a = {a.join(' ')} and b = {b.join(' ')}. Attention is modelled as a fixed, hand-set weighted sum of the tokens’ values, the way the Transformer paper describes attention outputs. The feed-forward layer follows the paper’s form, a ReLU (a function that keeps positive numbers and turns negatives into 0) between two linear steps, applied to each token separately. Here its weights are hand-set so that two ReLU units compute XOR from a sum: relu(s) minus 2 times relu(s minus 1) gives 0, 1, 0 for s = 0, 1, 2.
        </p>
        <p>
          Without the feed-forward layer the toy can only hand its mixed numbers to a straight-line readout. The error shown is that of the best possible one (least squares over the eight tokens), so it is a fair best case. The attention pattern is held fixed in this toy, which makes the mix a straight-line function of the bits. Real attention weights also depend on the input, and real models stack many blocks, so this toy shows the split of jobs, not a proof about full transformers. In the base model of the paper the feed-forward layer has 2048 inner units for a 512-number token, a large part of each block.
        </p>
      </details>
    </WhatIfFrame>
  );
}

