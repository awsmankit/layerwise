import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

const tokens = ['The', 'animal', 'didn’t', 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'tired'];

// Hand-authored emphasis for a few tokens; everything else falls back to a
// proximity pattern. These are illustrative, not read from a real model.
const boosts: Record<number, Record<number, number>> = {
  7: { 1: 3.2, 5: 0.9 }, // it -> animal, street
  10: { 1: 1.6, 7: 1.2 }, // tired -> animal, it
  3: { 1: 1.6, 5: 1.8 }, // cross -> animal, street
  6: { 3: 1.4, 10: 0.9 }, // because -> cross, tired
};

/** With the causal mask, a token gets no weight on anything after it, as in every chat model. */
function weightsFor(i: number, causal: boolean): number[] {
  const raw = tokens.map((_, j) => (causal && j > i ? 0 : Math.exp(-Math.abs(i - j) / 2.2) * (j === i ? 0.6 : 1) + (boosts[i]?.[j] ?? 0)));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

export default function AttentionViz() {
  const [sel, setSel] = useState(7);
  const [causal, setCausal] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [centers, setCenters] = useState<{ x: number; y: number }[]>([]);
  const [width, setWidth] = useState(0);
  const weights = useMemo(() => weightsFor(sel, causal), [sel, causal]);

  useLayoutEffect(() => {
    const measure = () => {
      const box = wrap.current?.getBoundingClientRect();
      if (!box) return;
      setWidth(box.width);
      setCenters(
        refs.current.map((el) => {
          const r = el?.getBoundingClientRect();
          return r ? { x: r.left - box.left + r.width / 2, y: r.top - box.top } : { x: 0, y: 0 };
        }),
      );
    };
    measure();
    // a phone shows part of the sentence: say so, and start with the chosen word in view
    const sc = scroller.current;
    if (sc && sc.scrollWidth > sc.clientWidth + 1) {
      setOverflows(true);
      const el = refs.current[sel];
      if (el) sc.scrollLeft = el.offsetLeft + el.offsetWidth / 2 - sc.clientWidth / 2;
    }
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const top = [...weights.keys()]
    .filter((j) => j !== sel && weights[j] > 0)
    .sort((a, b) => weights[b] - weights[a])
    .slice(0, 3);

  return (
    <Root>
      <div className="viz av">
        <div className="dx-top">
          <p className="viz-title">Choose a word, see what it attends to</p>
          <div className="dx-steps" role="group" aria-label="Which words can be seen">
            <button type="button" className="btn quiet" aria-pressed={causal} onClick={() => setCausal(true)}>
              Only earlier words
            </button>
            <button type="button" className="btn quiet" aria-pressed={!causal} onClick={() => setCausal(false)}>
              Both directions
            </button>
          </div>
        </div>
        {overflows && <p className="av-hint">Swipe sideways to see the whole sentence →</p>}
        <div className="av-scroll" ref={scroller}>
          <div className="av-wrap" ref={wrap}>
            <svg className="av-arcs" width={width} height={120} aria-hidden="true">
              {centers.length === tokens.length &&
                tokens.map((_, j) => {
                  if (j === sel || weights[j] === 0) return null;
                  const w = weights[j];
                  const a = centers[sel];
                  const b = centers[j];
                  const lift = 24 + Math.abs(a.x - b.x) * 0.22;
                  const d = `M ${a.x} 118 Q ${(a.x + b.x) / 2} ${118 - lift * 2} ${b.x} 118`;
                  return (
                    <motion.path
                      key={`${sel}-${j}-${causal}`}
                      d={d}
                      fill="none"
                      stroke="var(--signal)"
                      strokeLinecap="round"
                      strokeWidth={0.6 + w * 9}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.25 + Math.min(w * 2.2, 0.75) }}
                      transition={{ duration: 0.6, delay: 0.03 * j, ease: EASE }}
                    />
                  );
                })}
            </svg>
            <div className="av-tokens">
              {tokens.map((t, i) => (
                <button
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="button"
                  className={`av-token${i === sel ? ' is-sel' : ''}${causal && i > sel ? ' is-masked' : ''}`}
                  aria-pressed={i === sel}
                  onClick={() => setSel(i)}
                  onMouseEnter={() => setSel(i)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="av-read">
          {top.length === 0 ? (
            <>
              “<b>{tokens[sel]}</b>” is the first word, so with the mask it can only look at itself.
            </>
          ) : (
            <>
          “<b>{tokens[sel]}</b>” looks mostly at{' '}
          {top.map((j, k) => (
            <span key={j}>
              {k > 0 && (k === top.length - 1 ? ' and ' : ', ')}
              <b>{tokens[j]}</b> <span className="num">({Math.round(weights[j] * 100)}%)</span>
            </span>
          ))}
          .
            </>
          )}
        </p>
        <p className="viz-cap">
          {causal
            ? 'Chat models use a causal mask: each word sees only the words before it, which is why text is generated left to right. '
            : 'Encoder models such as BERT, used for search and classification, let every word see the whole sentence. '}
          Illustrative weights written by hand to show the idea. A real model has many attention heads in many layers, each with its own pattern.
        </p>
      </div>
    </Root>
  );
}
