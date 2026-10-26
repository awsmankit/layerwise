import { useState } from 'react';
import { Root } from './shared';

type Mode = 'time' | 'random';
type Role = 'train' | 'valid' | 'test';

const N = 24; // two years of monthly data
const BY_TIME: Role[] = Array.from({ length: N }, (_, i) => (i < 16 ? 'train' : i < 20 ? 'valid' : 'test'));
/** The same 16 / 4 / 4 counts, shuffled once so the picture stays the same on every visit. */
const RANDOM: Role[] = ['train', 'test', 'train', 'train', 'valid', 'train', 'train', 'test', 'train', 'valid', 'train', 'train', 'test', 'train', 'train', 'valid', 'train', 'train', 'test', 'train', 'valid', 'train', 'train', 'train'];

const CLS: Record<Role, string> = { train: 'kv-a', valid: 'kv-b', test: 'kv-c' };
const ROLES: { role: Role; name: string; does: string }[] = [
  { role: 'train', name: 'Training', does: 'the model learns from it' },
  { role: 'valid', name: 'Validation', does: 'choose features, settings, prompts' },
  { role: 'test', name: 'Test', does: 'touched once, at the very end' },
];
const X0 = 40;
const CELL = 27.5;

/**
 * Two years of monthly data split three ways. Split by time, the model is
 * tested on a future it never saw. Split at random, training rows come from
 * after the test months, so the score includes a peek at the future.
 */
export default function DataSplit() {
  const [mode, setMode] = useState<Mode>('time');
  const roles = mode === 'time' ? BY_TIME : RANDOM;

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Train, validation, test</p>
          <div className="dx-steps" role="group" aria-label="How to split">
            <button type="button" className="btn quiet" aria-pressed={mode === 'time'} onClick={() => setMode('time')}>
              Split by time
            </button>
            <button type="button" className="btn quiet" aria-pressed={mode === 'random'} onClick={() => setMode('random')}>
              Random split
            </button>
          </div>
        </div>

        <svg viewBox="0 0 740 214" className="dx-svg" role="img" aria-label={mode === 'time' ? 'The oldest 16 months train the model, the next 4 validate it, the newest 4 test it.' : 'Training, validation and test months are mixed, so training includes months after the test data.'}>
          <text x={X0} y="22" className="dx-small">older</text>
          <text x={X0 + N * CELL} y="22" textAnchor="end" className="dx-small">newer</text>
          <path d={`M ${X0 + 44} 18 H ${X0 + N * CELL - 52}`} className="dx-link" />
          <path d={`M ${X0 + N * CELL - 58} 13 L ${X0 + N * CELL - 52} 18 L ${X0 + N * CELL - 58} 23`} className="dx-link" />

          {roles.map((r, i) => (
            <rect key={i} x={X0 + i * CELL} y="34" width={CELL - 4} height="42" rx="4" className={CLS[r]} style={{ transition: `fill 0.4s ease ${i * 15}ms, stroke 0.4s ease ${i * 15}ms` }} />
          ))}

          {mode === 'random' ? (
            <g>
              <path d={`M ${X0 + 21 * CELL + 12} 80 V 96 H ${X0 + 12 * CELL + 12} V 80`} className="dx-residual" />
              <text x={X0} y="112" className="dx-small" style={{ fill: 'var(--warn)' }}>trains on month 22, tested on month 13: it has seen the future</text>
            </g>
          ) : (
            <g>
              <path d={`M ${X0} 84 V 92 H ${X0 + 16 * CELL - 4} V 84`} className="dx-link" />
              <path d={`M ${X0 + 16 * CELL} 84 V 92 H ${X0 + 20 * CELL - 4} V 84`} className="dx-link" />
              <path d={`M ${X0 + 20 * CELL} 84 V 92 H ${X0 + 24 * CELL - 4} V 84`} className="dx-link" />
              <text x={X0} y="110" className="dx-small">16 months</text>
              <text x={X0 + 16 * CELL} y="110" className="dx-small">4 months</text>
              <text x={X0 + 20 * CELL} y="110" className="dx-small">4 months</text>
            </g>
          )}

          {ROLES.map((r, i) => {
            const x = X0 + i * 226;
            return (
              <g key={r.role}>
                <rect x={x} y="140" width="16" height="16" rx="3" className={CLS[r.role]} />
                <text x={x + 24} y="153" className="dx-name">{r.name}</text>
                <text x={x} y="178" className="dx-small">{r.does}</text>
              </g>
            );
          })}
          <text x={X0} y="204" className="dx-small">Each time you look at a score and change something, that data stops being an unbiased test.</text>
        </svg>
        <p className="viz-cap">
          {mode === 'time'
            ? 'If the model will predict the future, train on the past and check on later data, the way it will be used.'
            : 'A random split on time-ordered data lets the model learn from months that come after the ones it is tested on, so the score is too good.'}
        </p>
      </div>
    </Root>
  );
}
