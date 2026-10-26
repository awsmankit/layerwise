import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/* Illustrative sizes, in tokens. History grows by one exchange per turn. */
const WINDOW = 16000;
const PER_TURN = 600;
const FIXED = [
  { id: 'system', label: 'system and rules', tokens: 1200, cls: 'kv-a' },
  { id: 'tools', label: 'tool definitions', tokens: 800, cls: 'kv-b' },
  { id: 'docs', label: 'retrieved documents', tokens: 3000, cls: 'kv-c' },
];
const QUESTION = 50;
const REPLY = 1000;
const TURNS = [1, 8, 20];

const X0 = 20;
const SCALE = 700 / 20000; // the strip shows 20,000 tokens so an overflow is visible
const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * What fills a context window, turn by turn. The user's question is the
 * thinnest slice; the history resent on every turn is what grows.
 */
export default function ContextWindow() {
  const [turn, setTurn] = useState(8);
  const history = (turn - 1) * PER_TURN;
  const parts = [
    ...FIXED,
    { id: 'history', label: 'conversation history', tokens: history, cls: 'kv-cached' },
    { id: 'question', label: 'the new question', tokens: QUESTION, cls: 'kv-new' },
    { id: 'reply', label: 'room for the reply', tokens: REPLY, cls: 'kv-free' },
  ];
  let x = X0;
  const placed = parts.map((p) => {
    const w = p.tokens === 0 ? 0 : Math.max(3, p.tokens * SCALE);
    const out = { ...p, x, w };
    x += w;
    return out;
  });
  const total = parts.reduce((n, p) => n + p.tokens, 0);
  const input = total - REPLY;
  const over = total - WINDOW;
  const edge = X0 + WINDOW * SCALE;

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">What fills the window</p>
          <div className="dx-steps" role="group" aria-label="Turn of the conversation">
            {TURNS.map((t) => (
              <button key={t} type="button" className="btn quiet" aria-pressed={turn === t} onClick={() => setTurn(t)}>
                Turn {t}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 740 230" className="dx-svg" role="img" aria-label={`Turn ${turn}: ${fmt(input)} input tokens, ${over > 0 ? `${fmt(over)} tokens over a ${fmt(WINDOW)}-token window` : `inside a ${fmt(WINDOW)}-token window`}.`}>
          <rect x={X0} y="60" width={WINDOW * SCALE} height="44" rx="6" className="dx-frame" />
          {placed.map((p) => (
            <motion.rect key={p.id} y="64" height="36" rx="3" className={p.cls} initial={false} animate={{ x: p.x, width: p.w }} transition={{ duration: 0.5, ease: EASE }} />
          ))}
          <line x1={edge} y1="44" x2={edge} y2="120" className="dx-link" strokeDasharray="4 3" />
          <text x={edge} y="38" textAnchor="middle" className="dx-small">{`window: ${fmt(WINDOW)} tokens`}</text>
          <text x={X0} y="38" className="dx-small">start of the prompt</text>

          <text x={X0} y="140" className="dx-name">
            {over > 0 ? `Turn ${turn}: ${fmt(over)} tokens too many. Something has to go.` : `Turn ${turn}: you pay for ${fmt(input)} input tokens`}
          </text>

          {placed.map((p, i) => {
            const lx = X0 + (i % 3) * 240;
            const ly = 172 + Math.floor(i / 3) * 26;
            return (
              <g key={`l${p.id}`}>
                <rect x={lx} y={ly - 11} width="14" height="14" rx="3" className={p.cls} />
                <text x={lx + 22} y={ly} className="dx-small">{`${p.label}, ${fmt(p.tokens)}`}</text>
              </g>
            );
          })}
        </svg>
        <p className="viz-cap">
          Sizes are illustrative. The question is the thinnest slice; the history is resent on every turn, so cost per turn rises with each message and the total for a conversation rises faster than its length.
        </p>
      </div>
    </Root>
  );
}
