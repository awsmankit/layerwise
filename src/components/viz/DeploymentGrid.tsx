import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/* Deployment types and scopes in Microsoft Foundry, as described in the lesson (October 2026). */
const TYPES = [
  { name: 'Standard', lines: ['pay per token', 'shared capacity,', 'no latency SLA'], says: 'pay per token on shared capacity with no latency SLA; for development and production with variable traffic' },
  { name: 'Provisioned', lines: ['pay per PTU per hour', 'capacity held for you', 'steady, high volume'], says: 'pay per PTU per hour, used or not, with capacity held for you; for steady, high-volume, latency-sensitive production' },
  { name: 'Batch', lines: ['per token, discounted', 'results come later,', '24-hour target'], says: 'pay per token at a discount; results come back asynchronously with a 24-hour target, for bulk work that can wait' },
];
const SCOPES = [
  { name: 'Global', lines: ['any region running', 'the model'], says: 'requests may be processed in any region where the model runs, which usually gives the most capacity' },
  { name: 'Data Zone', lines: ['stays inside a zone,', 'such as the US or EU'], says: 'processing stays inside a data zone, such as the US or the EU' },
  { name: 'Regional', lines: ['stays in the one', 'region you picked'], says: 'processing stays in the one region you picked' },
];

const CX = (c: number) => 200 + c * 172;
const CW = 160;
const RY = (r: number) => 132 + r * 54;
const RH = 46;

/**
 * Every Foundry deployment is two choices: how it is billed and held, and
 * where requests may be processed. Pick one cell to read the combination.
 */
export default function DeploymentGrid() {
  const [cell, setCell] = useState<[number, number]>([1, 1]);
  const [c, r] = cell;

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">A deployment is a type and a scope</p>
        <svg viewBox="0 0 740 300" className="dx-svg" role="group" aria-label="Three deployment types across the top, three scopes down the side; choose one cell">
          <text x="20" y="40" className="dx-small">type: how you pay</text>
          <text x="20" y="54" className="dx-small">and what is held</text>
          <text x="20" y="116" className="dx-small">scope: where it runs</text>

          {TYPES.map((t, i) => (
            <g key={t.name}>
              <rect x={CX(i)} y="14" width={CW} height="96" rx="10" className={i === c ? 'dx-core dx-hot' : 'dx-core'} />
              <text x={CX(i) + 12} y="36" className="dx-name">{t.name}</text>
              {t.lines.map((l, k) => (
                <text key={l} x={CX(i) + 12} y={58 + k * 15} className="dx-small">{l}</text>
              ))}
            </g>
          ))}

          {SCOPES.map((s, j) => (
            <g key={s.name}>
              <rect x="20" y={RY(j)} width="168" height={RH} rx="8" className={j === r ? 'dx-core dx-hot' : 'dx-core'} />
              <text x="32" y={RY(j) + 17} className="dx-name" style={{ fontSize: 12.5 }}>{s.name}</text>
              <text x="32" y={RY(j) + 31} className="dx-small">{s.lines[0]}</text>
              <text x="32" y={RY(j) + 42} className="dx-small">{s.lines[1]}</text>
              {TYPES.map((t, i) => {
                const on = i === c && j === r;
                return (
                  <g
                    key={t.name}
                    role="button"
                    tabIndex={0}
                    aria-pressed={on}
                    aria-label={`${t.name}, ${s.name}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setCell([i, j])}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setCell([i, j]);
                      }
                    }}
                  >
                    <rect x={CX(i)} y={RY(j)} width={CW} height={RH} rx="8" className={on ? 'kv-cached' : 'kv-free'} />
                    {on ? (
                      <motion.text key={`${i}${j}`} x={CX(i) + CW / 2} y={RY(j) + 28} textAnchor="middle" className="dx-name" style={{ fontSize: 11.5 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: EASE }}>
                        {`${t.name} + ${s.name}`}
                      </motion.text>
                    ) : (
                      <circle cx={CX(i) + CW / 2} cy={RY(j) + RH / 2} r="3" className="dx-core" />
                    )}
                  </g>
                );
              })}
            </g>
          ))}

          {/* capacity tends to be largest at the widest scope */}
          <path d={`M 732 ${RY(2) + RH} V ${RY(0) + 4}`} className="dx-link" />
          <path d={`M 727 ${RY(0) + 10} L 732 ${RY(0) + 4} L 737 ${RY(0) + 10}`} className="dx-link" />
          <text x="724" y={RY(1) + RH / 2} textAnchor="middle" className="dx-small" transform={`rotate(-90 724 ${RY(1) + RH / 2})`}>more capacity</text>
        </svg>
        <p className="viz-cap" aria-live="polite">
          <b>{`${TYPES[c].name}, ${SCOPES[r].name}:`}</b> {`${TYPES[c].says[0].toUpperCase()}${TYPES[c].says.slice(1)}. Scope: ${SCOPES[r].says}.`} Not every model supports every type and scope, so check the current availability tables.
        </p>
      </div>
    </Root>
  );
}
