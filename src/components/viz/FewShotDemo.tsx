import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

type Shots = 0 | 2 | 5;

/** Five labelled support messages. The prompt holds the first 0, 2 or 5 of them. */
const EXAMPLES = [
  { text: 'Charged twice, card blocked', label: 'billing 4' },
  { text: 'Export button does nothing', label: 'bug 2' },
  { text: 'Move my plan to yearly?', label: 'question 1' },
  { text: 'Crash on login, team locked out', label: 'bug 5' },
  { text: 'Where are old invoices?', label: 'question 1' },
];

/** Real counts from the o200k_base tokenizer for the prompt written out in full. */
const TOKENS: Record<Shots, number> = { 0: 52, 2: 129, 5: 233 };

/** Illustrative replies, written by hand to show the pattern. They are not from a real model. */
const REPLIES: Record<Shots, { lines: [string, string]; note: string; tone: string }> = {
  0: { lines: ['Category: Billing issue.', 'Urgency: High.'], note: 'cannot be parsed', tone: 'var(--warn)' },
  2: { lines: ['{"category":"billing",', ' "urgency":3}'], note: 'valid, urgency off', tone: 'var(--cost)' },
  5: { lines: ['{"category":"billing",', ' "urgency":4}'], note: 'matches the labels', tone: 'var(--ok)' },
};

const mono = { fontFamily: 'var(--font-mono)', fontSize: 10.5, fill: 'var(--ink)' } as const;

/**
 * Few-shot prompting as a drawing: the prompt holds zero, two or five worked
 * examples before the new message. Switch between them to see the reply and the
 * prompt size change. Token counts are real; the replies are illustrative.
 */
export default function FewShotDemo() {
  const [shots, setShots] = useState<Shots>(2);
  const reply = REPLIES[shots];
  const tokens = TOKENS[shots];

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Few-shot: examples before the new message</p>
          <div className="dx-steps" role="group" aria-label="Number of examples">
            {([0, 2, 5] as Shots[]).map((n) => (
              <button key={n} type="button" className="btn quiet" aria-pressed={shots === n} onClick={() => setShots(n)}>
                {n === 0 ? 'No examples' : `${n} examples`}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 740 290" className="dx-svg" role="img" aria-label={`A prompt with ${shots} examples is ${tokens} tokens. The reply is ${reply.note}.`}>
          {/* the prompt */}
          <rect x="10" y="22" width="520" height="250" rx="14" className="dx-frame" />
          <text x="22" y="40" className="dx-small">the prompt: instruction + examples + message</text>

          {EXAMPLES.map((e, i) => {
            const on = i < shots;
            const y = 52 + i * 44;
            return (
              <motion.g key={e.text} initial={false} animate={{ opacity: on ? 1 : 0.16 }} transition={{ duration: 0.35, ease: EASE }}>
                <rect x="20" y={y} width="300" height="36" rx="8" className={on ? 'dx-core dx-hot' : 'dx-core'} style={on ? undefined : { strokeDasharray: '3 3' }} />
                <text x="30" y={y + 22} className="dx-small" style={{ fill: 'var(--ink)' }}>{e.text}</text>
                <text x="310" y={y + 22} textAnchor="end" className="dx-small" style={{ fill: 'var(--ink)', fontWeight: 600 }}>{e.label}</text>
              </motion.g>
            );
          })}

          {/* the new message and the size of the whole prompt */}
          <rect x="350" y="52" width="170" height="80" rx="10" className="dx-core dx-hot" />
          <Glyph name="question" size={20} x={360} y={60} className="dx-glyph-hot" />
          <text x="386" y="76" className="dx-name">New message</text>
          <text x="360" y="100" className="dx-small" style={{ fill: 'var(--ink)' }}>March invoice shows two</text>
          <text x="360" y="114" className="dx-small" style={{ fill: 'var(--ink)' }}>charges, card frozen</text>

          <text x="350" y="164" className="dx-small">prompt size</text>
          <rect x="350" y="172" width="170" height="10" rx="5" className="dx-frame" />
          <motion.rect x="350" y="172" height="10" rx="5" className="kv-a" initial={false} animate={{ width: 170 * (tokens / 233) }} transition={{ duration: 0.4, ease: EASE }} />
          <text x="350" y="204" className="dx-name">{tokens} tokens</text>
          <text x="350" y="222" className="dx-small">o200k_base tokenizer</text>

          {/* the reply */}
          <path d="M 534 150 H 548 M 543 145 L 548 150 L 543 155" className="dx-link" />
          <rect x="552" y="52" width="170" height="120" rx="10" className="dx-core" />
          <Glyph name="pen" size={20} x={562} y={60} className="ng-glyph" />
          <text x="588" y="76" className="dx-name">Model’s reply</text>
          <text x="562" y="104" style={mono}>{reply.lines[0]}</text>
          <text x="562" y="120" style={mono}>{reply.lines[1]}</text>
          <text x="562" y="152" className="dx-small" style={{ fill: reply.tone, fontWeight: 700 }}>{reply.note}</text>
          <text x="552" y="196" className="dx-small">illustrative reply,</text>
          <text x="552" y="210" className="dx-small">not from a real run</text>
        </svg>

        <p className="viz-cap">
          The schema fixes the shape of a reply; examples teach the judgement behind it. Each example is paid for in tokens on every call, so add them until the eval scores stop improving, not past it.
        </p>
      </div>
    </Root>
  );
}
