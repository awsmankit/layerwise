import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { analyse, BOILERPLATE, COPIES, N_REPEATED, N_SAMPLES, N_UNIQUE, newLines, topCopied, type Kind } from '../../lib/whatif/no-deduplication';

const COLS = 20;
const PITCH = 17;
const CELL = 15;
const GX = 10;
const GY = 26;
const ROWS = 13;
const FILL: Record<Kind, string> = { plain: '#7f97b2', repeated: '#e0a030', boiler: '#d6453d' };
const pct = (v: number) => Math.round(v * 100);

export default function NoDeduplication() {
  const [dedup, setDedup] = useState(false);
  const [ci, setCi] = useState(4);
  const copies = COPIES[ci];

  const a = useMemo(() => analyse(dedup, copies), [dedup, copies]);
  const trainSet = useMemo(() => new Set(a.split.train), [a]);
  const copied = useMemo(() => topCopied(a), [a]);
  const fresh = useMemo(() => newLines(a), [a]);

  const verdict = dedup ? (
    <>
      With deduplication: {a.removed} repeated lines removed before the split. No validation line is in the training data, the score is {pct(a.valAccuracy)}% and it means what it says. Only {a.copiedCount} of {N_SAMPLES} freely written lines are copies of training text.
    </>
  ) : (
    <>
      Without it: {a.leaked} of {a.valSize} validation lines ({pct(a.leakShare)}%) also sit in the training data, so the score reads {pct(a.valAccuracy)}% but on lines it has never seen it is {pct(a.honestAccuracy)}%. {a.copiedCount} of {N_SAMPLES} lines the model writes on its own are copies of training text.
    </>
  );

  return (
    <WhatIfFrame
      title="A toy web page collection with repeats, and a toy model trained on it"
      withLabel="With deduplication"
      withoutLabel="Without it"
      on={dedup}
      onChange={setDedup}
      verdict={verdict}
      controls={
        <label className="field">
          <span>
            Copies of one licence line in the raw data <b>{copies}</b>
          </span>
          <input type="range" min={0} max={COPIES.length - 1} step={1} value={ci} onChange={(e) => setCi(+e.target.value)} aria-label={`Copies of the repeated licence line, ${copies}`} />
        </label>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 330" className="dx-svg wi-svg" role="img" aria-label={`${a.raw.length} documents as small squares. ${dedup ? `${a.removed} repeats are removed.` : 'Repeats are kept.'} ${a.leaked} validation documents also appear in the training data.`}>
          <text x={GX} y={16} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
            {a.raw.length} documents: {dedup ? `${a.removed} repeats removed, ${a.trainSize + a.valSize} left` : 'nothing removed'}
          </text>
          {a.raw.map((d, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const role = a.split.role[i];
            const x = GX + col * PITCH;
            const y = GY + row * PITCH;
            const leaked = role === 'val' && trainSet.has(d.text);
            return (
              <g key={i}>
                <motion.rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill={FILL[d.kind]}
                  initial={false}
                  animate={{ opacity: role === 'removed' ? 0.14 : 1 }}
                  transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 120) * 0.004 }}
                  stroke={role === 'val' ? 'var(--ink)' : role === 'removed' ? 'currentColor' : 'none'}
                  strokeWidth={role === 'val' ? 2.2 : 1}
                  strokeDasharray={role === 'removed' ? '2 2' : undefined}
                />
                {role === 'removed' && <path d={`M${x + 3} ${y + 3} L${x + CELL - 3} ${y + CELL - 3} M${x + CELL - 3} ${y + 3} L${x + 3} ${y + CELL - 3}`} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.3} />}
                {leaked && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={3} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.2} />}
              </g>
            );
          })}
          {[
            { k: 'plain' as Kind },
            { k: 'repeated' as Kind },
            { k: 'boiler' as Kind },
          ].map((l, i) => (
            <g key={l.k}>
              <rect x={GX + [0, 120, 240][i]} y={GY + ROWS * PITCH + 6} width={11} height={11} rx={2} fill={FILL[l.k]} />
              <text x={GX + [0, 120, 240][i] + 15} y={GY + ROWS * PITCH + 16} style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
                {i === 0 ? 'seen once' : i === 1 ? 'scraped twice' : `licence x${copies}`}
              </text>
            </g>
          ))}
          <rect x={GX} y={GY + ROWS * PITCH + 26} width={11} height={11} rx={2} fill="none" stroke="var(--ink)" strokeWidth={2.2} />
          <text x={GX + 15} y={GY + ROWS * PITCH + 36} style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
            ring = validation line
          </text>
          <rect x={GX + 130} y={GY + ROWS * PITCH + 26} width={11} height={11} rx={2} fill="#7f97b2" />
          <circle cx={GX + 135.5} cy={GY + ROWS * PITCH + 31.5} r={2.6} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.2} />
          <text x={GX + 145} y={GY + ROWS * PITCH + 36} style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
            dot = also in training: leaked
          </text>
          <text x={GX} y={GY + ROWS * PITCH + 54} style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
            crossed and faded = removed as an exact repeat
          </text>
        </svg>
      </div>
      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 112" className="dx-svg wi-svg" role="img" aria-label={`Score on the validation set ${pct(a.valAccuracy)} percent. Score on lines never seen in training ${pct(a.honestAccuracy)} percent.`}>
          {[
            { label: 'score on the validation set', v: a.valAccuracy, y: 18, c: dedup ? '#1f9d6b' : '#d6453d' },
            { label: 'score on lines never seen in training', v: a.honestAccuracy, y: 66, c: '#1f9d6b' },
          ].map((b) => (
            <g key={b.label}>
              <text x={4} y={b.y - 5} style={{ fill: 'var(--ink)', fontSize: 12 }}>
                {b.label}
              </text>
              <rect x={4} y={b.y} width={290} height={20} rx={3} fill="currentColor" fillOpacity={0.09} />
              <motion.rect x={4} y={b.y} height={20} rx={3} initial={false} animate={{ width: Math.round(b.v * 290 * 10) / 10 }} transition={{ duration: 0.5, ease: EASE }} fill={b.c} />
              <text x={300} y={b.y + 15} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
                {pct(b.v)}%
              </text>
            </g>
          ))}
          <text x={4} y={108} style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
            {dedup ? 'equal: nothing in the validation set was in training' : `the gap of ${pct(a.valAccuracy - a.honestAccuracy)} points is memory, not skill`}
          </text>
        </svg>
      </div>
      <div className="wt-writes">
        <p className="wt-cands-title">
          Lines the model writes on its own ({N_SAMPLES} tries, chosen at random by its counts):
        </p>
        <ul className="wt-lines">
          {fresh.map((t) => (
            <li key={t}>
              <span className="wt-tag is-good">new</span> <span>{t}</span>
            </li>
          ))}
          {copied.length === 0 && (
            <li>
              <span className="wt-tag">copies</span> <span>none of the {N_SAMPLES} tries repeated a training line</span>
            </li>
          )}
          {copied.map((c) => (
            <li key={c.text}>
              <span className="wt-tag is-bad">copy x{c.count}</span> <span className={c.boiler ? 'wt-boiler' : undefined}>{c.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="wt-note">
        Numbers: a made-up collection of {N_UNIQUE} one-line documents, {N_REPEATED} of them scraped twice, plus a licence-style line ({BOILERPLATE.split(' . ')[0]} ...) copied {copies} times; shuffled, then the last fifth is held out for validation. The model is a trigram word predictor (next word from the last two) trained on the rest. Score = how often its single likeliest guess is the real next word. A line is {'"'}copied{'"'} if it matches a training line exactly. Share of the licence line in training data: {(a.boilerShareOfTrain * 100).toFixed(1)}%. Real figures differ; see the paper for large datasets.
      </p>
    </WhatIfFrame>
  );
}
