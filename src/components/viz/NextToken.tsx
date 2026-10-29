import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';

type Dist = [string, number][];

/**
 * A toy language model: for each possible previous token, a hand-written
 * probability distribution over what comes next. Temperature reshapes the
 * distribution with the same maths real models use: p' is proportional to
 * p^(1/T).
 */
const demos = {
  fact: {
    label: 'A factual question',
    start: 'The capital of France is',
    next: {
      '': [[' Paris', 0.93], [' a', 0.02], [' the', 0.02], [' located', 0.015], [' Lyon', 0.015]],
      ' Paris': [['.', 0.55], [',', 0.3], [' and', 0.1], ['!', 0.05]],
      ' a': [[' city', 0.6], [' large', 0.25], [' famous', 0.15]],
      ' the': [[' city', 0.6], [' French', 0.4]],
      ' located': [[' in', 0.9], [' on', 0.1]],
      ' Lyon': [['.', 0.7], [',', 0.3]],
    } as Record<string, Dist>,
  },
  open: {
    label: 'An open-ended prompt',
    start: 'The weather today is',
    next: {
      '': [[' sunny', 0.3], [' cloudy', 0.22], [' rainy', 0.2], [' cold', 0.12], [' hot', 0.1], [' strange', 0.06]],
      ' sunny': [[',', 0.45], ['.', 0.35], [' and', 0.2]],
      ' cloudy': [[',', 0.45], ['.', 0.35], [' and', 0.2]],
      ' rainy': [[',', 0.45], ['.', 0.35], [' and', 0.2]],
      ' cold': [[',', 0.4], ['.', 0.4], [' and', 0.2]],
      ' hot': [[',', 0.4], ['.', 0.4], [' and', 0.2]],
      ' strange': [[',', 0.3], ['.', 0.3], [' and', 0.4]],
      ',': [[' with', 0.3], [' but', 0.3], [' so', 0.25], [' and', 0.15]],
      ' and': [[' warm', 0.25], [' windy', 0.25], [' dry', 0.25], [' calm', 0.25]],
      ' with': [[' a', 0.6], [' some', 0.4]],
      ' but': [[' it', 0.6], [' tomorrow', 0.4]],
      ' so': [[' take', 0.5], [' wear', 0.5]],
    } as Record<string, Dist>,
  },
} as const;

type DemoId = keyof typeof demos;

function reshape(dist: Dist, temperature: number): Dist {
  // p' proportional to exp(log p / T), computed stably
  const logs = dist.map(([, p]) => Math.log(p) / temperature);
  const max = Math.max(...logs);
  const exps = logs.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return dist.map(([t], i) => [t, exps[i] / sum]);
}

function sample(dist: Dist): string {
  let r = Math.random();
  for (const [t, p] of dist) {
    r -= p;
    if (r <= 0) return t;
  }
  return dist[dist.length - 1][0];
}

export default function NextToken() {
  const [demoId, setDemoId] = useState<DemoId>('fact');
  const demo = demos[demoId];
  const [out, setOut] = useState<string[]>([]);
  const [temp, setTemp] = useState(1);

  const last = out.length ? out[out.length - 1] : '';
  const raw = demo.next[last] as Dist | undefined;
  const dist = useMemo(() => (raw ? reshape(raw, temp).sort((a, b) => b[1] - a[1]) : null), [raw, temp]);

  const choose = (t: string) => setOut((o) => [...o, t]);
  const reset = (id?: DemoId) => {
    if (id) setDemoId(id);
    setOut([]);
  };

  return (
    <Root>
      <div className="viz nt">
        <div className="tc-tabs" role="tablist" aria-label="Example">
          {(Object.keys(demos) as DemoId[]).map((id) => (
            <button key={id} type="button" role="tab" aria-selected={id === demoId} className={`tc-tab${id === demoId ? ' is-active' : ''}`} onClick={() => reset(id)}>
              {demos[id].label}
            </button>
          ))}
        </div>

        <p className="nt-text" aria-live="polite">
          <span className="nt-prompt">{demo.start}</span>
          {out.map((t, i) => (
            <motion.span key={i} className="nt-new" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {t}
            </motion.span>
          ))}
          <span className="rl-caret" aria-hidden="true" />
        </p>

        <label className="field nt-temp">
          <span>
            Temperature <b className="num">{temp.toFixed(2)}</b>
          </span>
          <input type="range" min={0.1} max={2} step={0.05} value={temp} onChange={(e) => setTemp(+e.target.value)} />
          <small>
            {temp < 0.4 ? 'Cautious: almost always the top choice.' : temp <= 1.1 ? 'Balanced: the model’s own probabilities.' : 'Adventurous: unlikely words get a real chance.'}
          </small>
        </label>

        {dist ? (
          <>
            <p className="viz-title">What could come next? Tap a word, or let chance pick.</p>
            <ul className="nt-bars">
              <AnimatePresence initial={false}>
                {dist.map(([t, p]) => (
                  <li key={last + t}>
                    <button type="button" className="nt-bar" onClick={() => choose(t)} aria-label={`${t.trim() || 'blank'}, ${Math.round(p * 100)} percent`}>
                      <span className="nt-word">{t.replace(/ /g, '·') || '·'}</span>
                      <span className="nt-track">
                        <motion.span initial={false} animate={{ scaleX: p }} transition={{ duration: 0.35, ease: EASE }} />
                      </span>
                      <span className="nt-pct num">{(p * 100).toFixed(p < 0.1 ? 1 : 0)}%</span>
                    </button>
                  </li>
                ))}
              </AnimatePresence>
            </ul>
            <div className="rl-buttons">
              <button type="button" className="btn quiet" onClick={() => choose(sample(dist))}>
                Let chance pick
              </button>
              <button type="button" className="btn quiet" onClick={() => choose(dist[0][0])}>
                Always take the top word
              </button>
              <button type="button" className="btn quiet" onClick={() => reset()} disabled={out.length === 0}>
                Start over
              </button>
            </div>
          </>
        ) : (
          <div>
            <p className="nt-done">That is the end of this toy model’s vocabulary. A real model keeps going until it decides to stop.</p>
            <div className="rl-buttons">
              <button type="button" className="btn quiet" onClick={() => reset()}>
                Start over
              </button>
            </div>
          </div>
        )}
        <p className="viz-cap">
          A toy with a few hand-written probabilities, to show the idea. A real model chooses among tens of thousands of possible tokens at every step, using probabilities it computed from your whole prompt. Dots mark spaces.
        </p>
      </div>
    </Root>
  );
}
