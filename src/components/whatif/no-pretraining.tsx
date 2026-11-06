import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { DIM, EPOCHS, finalAccuracy, FACTORS, NUISANCE, PRETRAIN_EXAMPLES, runAll, SIZES, TRIALS } from '../../lib/whatif/no-pretraining';

const PX = 44;
const PW = 298;
const Y0 = 14;
const PH = 170;
const LO = 0.4;
const HI = 1;
const r1 = (n: number) => Math.round(n * 10) / 10;
const ax = (e: number) => r1(PX + (e / EPOCHS) * PW);
const ay = (a: number) => r1(Y0 + ((HI - Math.max(LO, Math.min(HI, a))) / (HI - LO)) * PH);
const GREEN = '#1f9d6b';
const RED = '#d6453d';
const pct = (a: number) => `${Math.round(a * 100)}%`;
const path = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

/**
 * A TOY transfer-learning world. Learning curves for a small network started from random weights
 * and one that starts from features learned on a bigger, related task, on a new task with few labels.
 */
export default function NoPretraining() {
  const [pre, setPre] = useState(true);
  const [si, setSi] = useState(1); // index into SIZES
  const [run, setRun] = useState<ReturnType<typeof runAll> | null>(null);
  const [reach, setReach] = useState(EPOCHS); // epochs revealed so far
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRun(runAll()), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setReach((r) => {
        if (r >= EPOCHS) {
          setPlaying(false);
          return r;
        }
        return r + 5;
      });
    }, 55);
    return () => clearInterval(id);
  }, [playing]);

  const title = 'A toy world: learning a new task from a few labelled examples';

  if (!run) {
    return (
      <WhatIfFrame title={title} withLabel="Start from pretrained" withoutLabel="Start from scratch" on={pre} onChange={setPre} verdict="Training the toy networks…">
        <div style={{ minHeight: 360 }} />
      </WhatIfFrame>
    );
  }

  const n = SIZES[si];
  const curve = run.curves[si];
  const fin = finalAccuracy(curve);
  const shown = curve.epochs.map((e, i) => ({ e, i })).filter(({ e }) => e <= reach);
  const line = (vals: number[]) => path(shown.map(({ e, i }) => [ax(e), ay(vals[i])]));
  const mainVals = pre ? curve.pretrained : curve.scratch;
  const otherVals = pre ? curve.scratch : curve.pretrained;
  const mainColor = pre ? GREEN : RED;
  const last = shown[shown.length - 1];
  const gap = fin.pretrained - fin.scratch;

  // the second chart: final accuracy for every labelled-set size
  const gw = PW / SIZES.length;

  return (
    <WhatIfFrame
      title={title}
      withLabel="Start from pretrained"
      withoutLabel="Start from scratch"
      on={pre}
      onChange={(v) => {
        setPlaying(false);
        setReach(EPOCHS);
        setPre(v);
      }}
      verdict={
        pre ? (
          <>
            Toy result: starting from features learned on a bigger related task, {n} labelled examples reach {pct(fin.pretrained)} on unseen examples. A network started from scratch reaches {pct(fin.scratch)}.
          </>
        ) : (
          <>
            Toy result: starting from scratch, {n} labelled examples reach only {pct(fin.scratch)} on unseen examples. Starting from pretrained features gets {pct(fin.pretrained)}{gap > 0.03 ? `, ${Math.round(gap * 100)} points more` : ', so with this much data the gap is small'}.
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Labelled examples for the new task <b>{n}</b>
            </span>
            <input type="range" min={0} max={SIZES.length - 1} value={si} onChange={(e) => { setPlaying(false); setReach(EPOCHS); setSi(+e.target.value); }} aria-label="Number of labelled examples for the new task" />
          </label>
          <button
            type="button"
            className="btn quiet"
            onClick={() => {
              setReach(0);
              setPlaying(true);
            }}
          >
            {playing ? 'Training…' : 'Play the training'}
          </button>
        </>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox="0 0 350 252" className="dx-svg wi-svg" role="img" aria-label={`Accuracy on unseen examples while training with ${n} labelled examples. ${pre ? 'Starting from pretrained features' : 'Starting from scratch'} ends at ${pct(pre ? fin.pretrained : fin.scratch)}.`}>
          {[0.5, 0.7, 0.9].map((a) => (
            <g key={a}>
              <line x1={PX} x2={PX + PW} y1={ay(a)} y2={ay(a)} stroke="currentColor" strokeOpacity={a === 0.5 ? 0.45 : 0.15} strokeDasharray={a === 0.5 ? '2 3' : '3 4'} />
              <text x={PX - 5} y={ay(a) + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
                {pct(a)}
              </text>
            </g>
          ))}
          <text x={PX + PW} y={ay(0.5) - 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
            coin flip
          </text>
          <rect x={PX} y={Y0} width={PW} height={PH} fill="none" stroke="currentColor" strokeOpacity={0.5} />
          <path d={line(otherVals)} fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.8} strokeDasharray="5 4" />
          <path d={line(mainVals)} fill="none" stroke={mainColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {last && <circle cx={ax(last.e)} cy={ay(mainVals[last.i])} r={5.5} fill={mainColor} stroke="var(--surface)" strokeWidth={1.5} />}
          <text x={PX} y={Y0 + PH + 18} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            0
          </text>
          <text x={PX + PW} y={Y0 + PH + 18} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            {EPOCHS} training steps
          </text>
          <text x={PX} y={Y0 + PH + 36} style={{ fill: mainColor, fontSize: 12, fontWeight: 700 }}>
            {pre ? '━ solid = pretrained features' : '━ solid = from scratch'}
          </text>
          <text x={PX} y={Y0 + PH + 52} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            ╌ dashed = {pre ? 'from scratch' : 'pretrained'}, for comparison
          </text>
        </svg>

        <svg viewBox="0 0 350 196" className="dx-svg wi-svg" role="img" aria-label="Final accuracy for each number of labelled examples, from scratch and pretrained. The gap closes as labels grow.">
          <text x={4} y={12} style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
            Final accuracy by number of labels
          </text>
          {SIZES.map((s, k) => {
            const f = finalAccuracy(run.curves[k]);
            const gx = PX + k * gw;
            const bw = gw / 2 - 5;
            const H = 110;
            const base = 24 + H;
            const hh = (a: number) => Math.max(1, ((a - 0.4) / 0.6) * H);
            return (
              <g key={s} opacity={k === si ? 1 : 0.55}>
                <motion.rect x={gx + 3} width={bw} rx={2} initial={false} animate={{ y: base - hh(f.scratch), height: hh(f.scratch) }} transition={{ duration: 0.4, ease: EASE }} fill={RED} />
                <motion.rect x={gx + 3 + bw + 2} width={bw} rx={2} initial={false} animate={{ y: base - hh(f.pretrained), height: hh(f.pretrained) }} transition={{ duration: 0.4, ease: EASE }} fill={GREEN} />
                <text x={gx + 3 + bw / 2} y={base - hh(f.scratch) - 3} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
                  {Math.round(f.scratch * 100)}
                </text>
                <text x={gx + 5 + bw * 1.5} y={base - hh(f.pretrained) - 3} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
                  {Math.round(f.pretrained * 100)}
                </text>
                <text x={gx + gw / 2} y={base + 14} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: k === si ? 700 : 400 }}>
                  {s}
                </text>
                {k === si && <rect x={gx} y={20} width={gw} height={H + 24} fill="none" stroke="currentColor" strokeWidth={1.2} rx={4} />}
              </g>
            );
          })}
          <text x={4} y={188} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            <tspan fill={RED}>■</tspan> scratch  <tspan fill={GREEN}>■</tspan> pretrained  (accuracy %, bars start at 40%)
          </text>
        </svg>
      </div>
      <p className="wt-note">
        This is a toy, not a real language or vision model. Each example is {DIM} numbers; only {FACTORS} hidden factors decide the label, while {NUISANCE} other factors swing the numbers about and mean nothing. The pretrained features come from a small network that first learned to predict 6 related quantities from {PRETRAIN_EXAMPLES} examples; the new task is a different labelling of the same world. Pretrained keeps those features and trains only a new output; scratch trains every weight from random start. Accuracy is on 300 unseen examples, averaged over {TRIALS} different new tasks.
      </p>
    </WhatIfFrame>
  );
}
