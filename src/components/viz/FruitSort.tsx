import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

type Fruit = { id: string; kind: 'apple' | 'banana'; cm: number };

/*
 * A one-dial model for children: "longer than the cut-off means banana".
 * Learning nudges the dial 1 cm towards fixing the mistakes, which is what
 * training does to billions of dials at once. Fruit lengths are rough examples.
 */
const EXAMPLES: Fruit[] = [
  { id: 'a1', kind: 'apple', cm: 6 },
  { id: 'a2', kind: 'apple', cm: 7 },
  { id: 'a3', kind: 'apple', cm: 8 },
  { id: 'a4', kind: 'apple', cm: 9 },
  { id: 'b1', kind: 'banana', cm: 14 },
  { id: 'b2', kind: 'banana', cm: 16 },
  { id: 'b3', kind: 'banana', cm: 19 },
  { id: 'b4', kind: 'banana', cm: 21 },
];
const NEW: Fruit[] = [
  { id: 'n1', kind: 'apple', cm: 7.5 },
  { id: 'n2', kind: 'banana', cm: 10 },
  { id: 'n3', kind: 'banana', cm: 17 },
];
const BABY = NEW[1];
const START = 19;

const X0 = 30;
const PX = 28;
const xOf = (cm: number) => X0 + cm * PX;
const guess = (f: Fruit, dial: number): Fruit['kind'] => (f.cm > dial ? 'banana' : 'apple');
const wrong = (set: Fruit[], dial: number) => set.filter((f) => guess(f, dial) !== f.kind);

/** One step of learning: move the dial 1 cm in the direction that fixes a mistake. */
function nudge(set: Fruit[], dial: number): number {
  const bad = wrong(set, dial);
  if (!bad.length) return dial;
  return bad[0].kind === 'banana' ? dial - 1 : dial + 1;
}

type Stage = 'train' | 'test' | 'retrain';

export default function FruitSort() {
  const [dial, setDial] = useState(START);
  const [stage, setStage] = useState<Stage>('train');
  const [auto, setAuto] = useState(false);

  const examples = stage === 'retrain' ? [...EXAMPLES, BABY] : EXAMPLES;
  const mistakes = wrong(examples, dial);
  const done = mistakes.length === 0;

  useEffect(() => {
    if (!auto) return;
    if (done) {
      setAuto(false);
      return;
    }
    const t = setTimeout(() => setDial((d) => nudge(examples, d)), 380);
    return () => clearTimeout(t);
  }, [auto, done, dial, examples]);

  const reset = () => {
    setAuto(false);
    setStage('train');
    setDial(START);
  };

  const showNew = stage === 'test';
  const newWrong = wrong(NEW, dial);

  let say: string;
  if (stage === 'test') {
    if (!newWrong.length) say = 'It got every new fruit right.';
    else if (newWrong.length === 1 && newWrong[0] === BABY)
      say = 'It got one new fruit wrong: a small banana, only 10 cm long. It never saw a banana that short, so its rule did not cover it.';
    else say = `It got ${newWrong.length} new fruit wrong.`;
  } else if (done) {
    say = stage === 'retrain' ? 'Fixed. Now it knows small bananas exist too. More varied examples made a better rule.' : 'No mistakes on the examples. The computer found a rule that works, and nobody told it the answer.';
  } else {
    say = `${mistakes.length} ${mistakes.length === 1 ? 'mistake' : 'mistakes'}. Press “Learn” to let it nudge its dial and try again.`;
  }

  return (
    <Root>
      <div className="viz fs">
        <p className="viz-title">Teach the computer: apple or banana?</p>
        <p className="fs-rule">
          The computer’s rule: <b>longer than <span className="num">{dial}</span> cm means banana</b>.
        </p>

        <svg viewBox="0 0 760 200" className="dx-svg" role="img" aria-label={`Fruit placed along a ruler by length. The cut-off is at ${dial} centimetres. ${say}`}>
          {/* the two sides of the dial */}
          <text x={xOf(dial) - 10} y="22" textAnchor="end" className="dx-small">← apple side</text>
          <text x={xOf(dial) + 10} y="22" className="dx-small">banana side →</text>

          {/* rows */}
          <text x="0" y="60" className="dx-small">{showNew ? 'new' : ''}</text>
          <text x="0" y="112" className="dx-small">examples</text>

          {/* ruler */}
          <path d={`M ${xOf(0)} 160 H ${xOf(25)}`} className="dx-link" />
          {Array.from({ length: 13 }, (_, i) => i * 2).map((cm) => (
            <g key={cm}>
              <path d={`M ${xOf(cm)} 156 V 164`} className="dx-link" />
              <text x={xOf(cm)} y="180" textAnchor="middle" className="dx-small">{cm}</text>
            </g>
          ))}
          <text x={xOf(25)} y="180" textAnchor="end" className="dx-small">cm</text>

          {/* the dial */}
          <motion.g initial={false} animate={{ x: xOf(dial) }} transition={{ duration: 0.35, ease: EASE }}>
            <path d="M 0 32 V 166" className="dx-residual fs-cut" />
            <circle cx="0" cy="166" r="5" className="dx-packet" />
          </motion.g>

          {examples.map((f) => (
            <FruitMark key={f.id} f={f} y={108} ok={guess(f, dial) === f.kind} added={f === BABY} />
          ))}
          {showNew && NEW.map((f) => <FruitMark key={f.id} f={f} y={56} ok={guess(f, dial) === f.kind} fresh />)}
        </svg>

        <p className="fs-say" aria-live="polite">{say}</p>

        <label className="field fs-dial">
          <span>
            Or turn the dial yourself: <b className="num">{dial} cm</b>
          </span>
          <input type="range" min={2} max={22} step={1} value={dial} onChange={(e) => { setAuto(false); setDial(+e.target.value); }} />
        </label>

        <div className="rl-buttons">
          {stage !== 'test' && !done && (
            <>
              <button type="button" className="btn" onClick={() => setDial((d) => nudge(examples, d))}>
                Learn one step
              </button>
              <button type="button" className="btn quiet" onClick={() => setAuto(true)} disabled={auto}>
                Keep learning
              </button>
            </>
          )}
          {stage === 'train' && done && (
            <button type="button" className="btn" onClick={() => setStage('test')}>
              Try it on new fruit
            </button>
          )}
          {stage === 'test' && newWrong.length > 0 && (
            <button type="button" className="btn" onClick={() => setStage('retrain')}>
              Add the small banana to the examples
            </button>
          )}
          <button type="button" className="btn quiet" onClick={reset} disabled={stage === 'train' && dial === START}>
            Start over
          </button>
        </div>
        <p className="viz-cap">
          A green outline is a right guess. A red outline with a ✗ is a mistake. The lengths are rough examples. A real model has billions of dials instead of one, but it learns the same way: guess, count the mistakes, nudge, repeat.
        </p>
      </div>
    </Root>
  );
}

function FruitMark({ f, y, ok, fresh = false, added = false }: { f: Fruit; y: number; ok: boolean; fresh?: boolean; added?: boolean }) {
  const x = xOf(f.cm);
  const cls = `fs-fruit fs-${f.kind} ${ok ? 'fs-ok' : 'fs-bad'}${fresh ? ' fs-fresh' : ''}`;
  return (
    <motion.g initial={added || fresh ? { opacity: 0, y: -8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <title>{`${f.kind}, ${f.cm} cm: ${ok ? 'right' : 'wrong'}`}</title>
      {f.kind === 'apple' ? (
        <g className={cls}>
          <circle cx={x} cy={y} r="11" />
          <path d={`M ${x} ${y - 11} Q ${x + 1} ${y - 16} ${x + 3} ${y - 18}`} />
          <path d={`M ${x + 1} ${y - 14} Q ${x + 7} ${y - 19} ${x + 10} ${y - 14} Q ${x + 5} ${y - 11} ${x + 1} ${y - 14} Z`} />
        </g>
      ) : (
        <g className={cls}>
          <path d={`M ${x - 15} ${y - 8} Q ${x} ${y + 16} ${x + 15} ${y - 8} Q ${x} ${y - 4} ${x - 15} ${y - 8} Z`} transform={`rotate(-12 ${x} ${y})`} />
          <path d={`M ${x + 15} ${y - 8} l 3 -4`} transform={`rotate(-12 ${x} ${y})`} />
        </g>
      )}
      {!ok && (
        <text x={x} y={y - 20} textAnchor="middle" className="fs-x">✗</text>
      )}
    </motion.g>
  );
}
