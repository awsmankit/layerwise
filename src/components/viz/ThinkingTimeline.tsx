import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE, fmt } from './shared';

/* Illustrative numbers, not measurements of any model: one request with a short prompt and a short answer. */
const INPUT = 400;
const ANSWER = 150;
const SPEED = 80; // output tokens per second
const PRICE_IN = 2; // dollars per million input tokens
const PRICE_OUT = 10; // dollars per million output tokens

const LEVELS = [
  { name: 'No thinking', think: 0 },
  { name: 'Low effort', think: 600 },
  { name: 'High effort', think: 4000 },
] as const;

const X0 = 50;
const W = 640;
const MAX = INPUT + LEVELS[2].think + ANSWER;
const px = (tokens: number) => (tokens / MAX) * W;

const cost = (think: number) => (INPUT * PRICE_IN + (think + ANSWER) * PRICE_OUT) / 1e6;
const seconds = (think: number) => (think + ANSWER) / SPEED;
const money = (d: number) => (d >= 0.01 ? `$${d.toFixed(3)}` : `$${d.toFixed(4)}`);

/**
 * One request drawn to scale: the prompt, the thinking, then the answer. The thinking
 * is billed as output and has to be generated before the answer starts, so raising the
 * effort grows both the bill and the wait. The arithmetic is computed from the numbers above.
 */
export default function ThinkingTimeline() {
  const [i, setI] = useState(1);
  const { think } = LEVELS[i];
  const base = cost(0);

  const inW = px(INPUT);
  const thW = px(think);
  const anW = px(ANSWER);
  const thX = X0 + inW;
  const anX = thX + thW;
  const out = think + ANSWER;

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">One request, drawn to scale</p>
          <div className="dx-steps" role="group" aria-label="Thinking effort">
            {LEVELS.map((l, k) => (
              <button key={l.name} type="button" className="btn quiet" aria-pressed={i === k} onClick={() => setI(k)}>
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 740 240" className="dx-svg" role="img" aria-label={`${LEVELS[i].name}: ${fmt.int(INPUT)} input tokens, ${fmt.int(think)} thinking tokens, ${ANSWER} answer tokens. About ${seconds(think).toFixed(1)} seconds and ${money(cost(think))}.`}>
          <text x={X0} y="96" className="dx-small">input {fmt.int(INPUT)}</text>
          {think > 0 && (
            <motion.text initial={false} animate={{ x: thX + thW / 2, opacity: 1 }} transition={{ duration: 0.4, ease: EASE }} y="26" textAnchor="middle" className="dx-small">
              {`thinking ${fmt.int(think)}`}
            </motion.text>
          )}

          <rect x={X0} y="36" width={inW} height="40" rx="4" className="dx-core" />
          <motion.rect initial={false} animate={{ x: thX, width: thW }} transition={{ duration: 0.45, ease: EASE }} y="36" height="40" className="kv-b" />
          <motion.rect initial={false} animate={{ x: anX, width: anW }} transition={{ duration: 0.45, ease: EASE }} y="36" height="40" className="kv-a" />

          <motion.text initial={false} animate={{ x: anX + anW }} transition={{ duration: 0.45, ease: EASE }} y="96" textAnchor="end" className="dx-small">
            {`answer ${ANSWER}`}
          </motion.text>

          {/* the part you pay for as output */}
          <motion.path initial={false} animate={{ d: `M ${thX} 106 V 112 H ${anX + anW} V 106` }} transition={{ duration: 0.45, ease: EASE }} className="dx-link" />
          <text x={X0} y="128" className="dx-small">billed as output: thinking + answer = {fmt.int(out)} tokens</text>

          {[
            { x: 50, label: 'Output tokens', value: fmt.int(out), note: think === 0 ? 'the answer only' : `${(out / ANSWER).toFixed(1)}× the answer alone` },
            { x: 270, label: 'Time to finish', value: `${seconds(think).toFixed(seconds(think) < 10 ? 1 : 0)} s`, note: `at ${SPEED} tokens a second` },
            { x: 490, label: 'Cost per request', value: money(cost(think)), note: think === 0 ? 'the baseline' : `${(cost(think) / base).toFixed(1)}× the baseline` },
          ].map((b) => (
            <g key={b.label}>
              <rect x={b.x} y="148" width="200" height="74" rx="10" className="dx-core" />
              <text x={b.x + 14} y="170" className="dx-small">{b.label}</text>
              <text x={b.x + 14} y="196" className="dx-word" style={{ fontSize: 22 }}>{b.value}</text>
              <text x={b.x + 14} y="214" className="dx-small">{b.note}</text>
            </g>
          ))}
        </svg>

        <p className="viz-cap">
          Illustrative: a {INPUT}-token prompt, a {ANSWER}-token answer, {SPEED} tokens a second, and example prices of ${PRICE_IN} and ${PRICE_OUT} per million input and output tokens. How long a model thinks varies by model, task and run, so read the real number from your provider's usage fields.
        </p>
      </div>
    </Root>
  );
}
