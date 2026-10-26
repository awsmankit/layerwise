import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from '../viz/shared';
import { useStore, KEYS } from '../../lib/store';
import type { QuizItem } from '../../data/lesson-extras';
import Confetti from './Confetti';

/** Small deterministic PRNG so option order is stable for a given lesson and question. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

export function shuffled(item: QuizItem, id: string, n: number) {
  const rnd = mulberry32(hash(`${id}:${n}`));
  const order = item.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order; // order[k] = original index shown at position k
}

type Result = { score: number; total: number };

export default function Quiz({ id, items }: { id: string; items: QuizItem[] }) {
  const [saved, setSaved] = useStore<Record<string, Result>>(KEYS.quiz, {});
  const orders = useMemo(() => items.map((it, n) => shuffled(it, id, n)), [items, id]);
  const [picked, setPicked] = useState<(number | null)[]>(() => items.map(() => null));
  const [burst, setBurst] = useState(0);
  const [shakeKey, setShakeKey] = useState<string | null>(null);

  const answered = picked.filter((p) => p !== null).length;
  const score = picked.reduce<number>((n, p, i) => n + (p === items[i].answer ? 1 : 0), 0);
  const complete = answered === items.length;
  const best = saved[id];

  const choose = (qi: number, original: number) => {
    if (picked[qi] !== null) return;
    const next = picked.map((p, i) => (i === qi ? original : p));
    setPicked(next);
    if (original !== items[qi].answer) {
      setShakeKey(`${qi}-${original}`);
      window.setTimeout(() => setShakeKey(null), 450);
    }
    if (next.every((p) => p !== null)) {
      const s = next.reduce<number>((n, p, i) => n + (p === items[i].answer ? 1 : 0), 0);
      if (s === items.length) setBurst((b) => b + 1);
      if (!best || s > best.score) setSaved({ ...saved, [id]: { score: s, total: items.length } });
    }
  };

  const reset = () => setPicked(items.map(() => null));

  return (
    <Root>
      <section className="qz viz" aria-labelledby={`qz-${id}`}>
        <Confetti burst={burst} />
        <header className="qz-head">
          <h2 id={`qz-${id}`}>Check yourself</h2>
          {best && (
            <span className="qz-best num" title="Your best score on this lesson">
              Best {best.score}/{best.total}
            </span>
          )}
        </header>
        <ol className="qz-list">
          {items.map((it, qi) => {
            const p = picked[qi];
            return (
              <li key={it.q}>
                <p className="qz-q">{it.q}</p>
                <div className="gm-options" role="group" aria-label="Answers">
                  {orders[qi].map((original) => {
                    const isPicked = p === original;
                    const right = p !== null && original === it.answer;
                    const wrong = isPicked && original !== it.answer;
                    return (
                      <button
                        key={original}
                        type="button"
                        className={`gm-opt${right ? ' is-right' : ''}${wrong ? ' is-wrong' : ''}${shakeKey === `${qi}-${original}` ? ' shake' : ''}`}
                        disabled={p !== null}
                        onClick={() => choose(qi, original)}
                      >
                        <span className="gm-opt-dot" aria-hidden="true" />
                        <span className="gm-opt-text">
                          <b>{it.options[original]}</b>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {p !== null && (
                    <motion.p className={`qz-why${p === it.answer ? ' good' : ''}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3, ease: EASE }} aria-live="polite">
                      <b>{p === it.answer ? 'Right. ' : 'Not quite. '}</b>
                      {it.why}
                    </motion.p>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>
        <AnimatePresence>
          {complete && (
            <motion.footer className="qz-foot" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}>
              <p>
                <b className="num">
                  {score} of {items.length}
                </b>{' '}
                {score === items.length ? 'Perfect. On to the next lesson.' : 'Reread the explanations above, then try again.'}
              </p>
              <button type="button" className="btn quiet" onClick={reset}>
                Try again
              </button>
            </motion.footer>
          )}
        </AnimatePresence>
      </section>
    </Root>
  );
}
