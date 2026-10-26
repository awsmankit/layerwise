import { useState } from 'react';
import { Root } from './shared';

type Mode = 'model' | 'never';
type Kind = 'tp' | 'fn' | 'fp' | 'tn';

/* The lesson's fraud example: 1,000 transactions, 50 fraud, the model flags 60 of which 40 are fraud. */
const COLS = 50;
const ROWS = 20;
const GAP = 10.6;

function kindOf(i: number, mode: Mode): Kind {
  if (i < 50) return mode === 'model' && i < 40 ? 'tp' : 'fn';
  if (i < 70) return mode === 'model' ? 'fp' : 'tn';
  return 'tn';
}

const STYLE: Record<Kind, { fill: string; stroke: string; opacity: number }> = {
  tp: { fill: 'var(--signal)', stroke: 'var(--signal)', opacity: 1 },
  fn: { fill: 'none', stroke: 'var(--warn)', opacity: 1 },
  fp: { fill: 'var(--cost)', stroke: 'var(--cost)', opacity: 1 },
  tn: { fill: 'var(--ink)', stroke: 'none', opacity: 0.16 },
};

const METRICS: Record<Mode, { label: string; value: string }[]> = {
  model: [
    { label: 'accuracy', value: '0.97' },
    { label: 'precision', value: '0.67' },
    { label: 'recall', value: '0.80' },
  ],
  never: [
    { label: 'accuracy', value: '0.95' },
    { label: 'precision', value: 'none' },
    { label: 'recall', value: '0' },
  ],
};

/**
 * All 1,000 transactions as dots, coloured by what the model did with them.
 * Switch to a model that never flags anything: accuracy barely moves, and
 * every fraud is missed.
 */
export default function ConfusionDots() {
  const [mode, setMode] = useState<Mode>('model');
  const count = (k: Kind) => Array.from({ length: 1000 }, (_, i) => kindOf(i, mode)).filter((x) => x === k).length;
  const legend: { k: Kind; text: string }[] = [
    { k: 'tp', text: `caught fraud (TP) ${count('tp')}` },
    { k: 'fn', text: `missed fraud (FN) ${count('fn')}` },
    { k: 'fp', text: `false alarm (FP) ${count('fp')}` },
    { k: 'tn', text: `fine, left alone (TN) ${count('tn')}` },
  ];

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">1,000 transactions, 50 of them fraud</p>
          <div className="dx-steps" role="group" aria-label="Which model">
            <button type="button" className="btn quiet" aria-pressed={mode === 'model'} onClick={() => setMode('model')}>
              The model
            </button>
            <button type="button" className="btn quiet" aria-pressed={mode === 'never'} onClick={() => setMode('never')}>
              Never flags anything
            </button>
          </div>
        </div>

        <svg viewBox="0 0 740 288" className="dx-svg" role="img" aria-label={legend.map((l) => l.text).join(', ') + '. ' + METRICS[mode].map((m) => `${m.label} ${m.value}`).join(', ')}>
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const s = STYLE[kindOf(i, mode)];
            return (
              <circle
                key={i}
                cx={24 + (i % COLS) * GAP}
                cy={20 + Math.floor(i / COLS) * GAP}
                r="3.6"
                style={{ fill: s.fill, stroke: s.stroke, strokeWidth: 1.2, opacity: s.opacity, transition: 'fill 0.4s ease, stroke 0.4s ease, opacity 0.4s ease' }}
              />
            );
          })}

          {METRICS[mode].map((m, i) => (
            <g key={m.label}>
              <text x="575" y={40 + i * 54} className="dx-small">{m.label}</text>
              <text x="575" y={66 + i * 54} className="dx-word" style={{ fill: m.label === 'recall' && mode === 'never' ? 'var(--warn)' : 'var(--ink)' }}>{m.value}</text>
            </g>
          ))}

          {legend.map((l, i) => {
            const x = 24 + (i % 2) * 270;
            const y = 248 + Math.floor(i / 2) * 22;
            const s = STYLE[l.k];
            return (
              <g key={l.k}>
                <circle cx={x + 4} cy={y - 4} r="4.5" style={{ fill: s.fill, stroke: s.stroke, strokeWidth: 1.2, opacity: l.k === 'tn' ? 0.4 : 1 }} />
                <text x={x + 16} y={y} className="dx-small">{l.text}</text>
              </g>
            );
          })}
        </svg>
        <p className="viz-cap">
          {mode === 'model'
            ? 'Precision: of the 60 flagged, 40 were fraud. Recall: of the 50 frauds, 40 were caught.'
            : 'Flag nothing and accuracy is still 0.95, because 950 of the 1,000 were fine. On imbalanced data, accuracy mostly measures the majority class.'}
        </p>
      </div>
    </Root>
  );
}
