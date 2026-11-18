import { useState } from 'react';
import { Root } from './shared';

/**
 * Given the chance someone has the condition (prevalence), how often the test
 * catches it (sensitivity), and how often it stays quiet for people without it
 * (specificity), return the chance a positive result is real.
 */
export function positivePredictiveValue(prevalence: number, sensitivity: number, specificity: number) {
  const truePositive = prevalence * sensitivity;
  const falsePositive = (1 - prevalence) * (1 - specificity);
  const positive = truePositive + falsePositive;
  return positive === 0 ? 0 : truePositive / positive;
}

const GRID = 1000; // 1,000 people, so the rounded counts stay close to the exact answer

/**
 * Bayes' rule with a grid of 1,000 people. Each square is one person. Coloured
 * squares are those who test positive; the share of coloured squares that are
 * also dark (sick) is the answer.
 */
export default function BayesTest() {
  const [prev, setPrev] = useState(0.01);
  const [sens, setSens] = useState(0.9);
  const [spec, setSpec] = useState(0.91);

  const sick = Math.round(prev * GRID);
  const truePos = Math.round(sens * sick);
  const healthy = GRID - sick;
  const falsePos = Math.round((1 - spec) * healthy);
  const positives = truePos + falsePos;
  const answer = positivePredictiveValue(prev, sens, spec);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">If a test is positive, how likely is it real?</p>
        <div className="viz-controls">
          <label htmlFor="bt-prev">
            Have the condition <b className="num">{Math.round(prev * 100)}%</b>
          </label>
          <input id="bt-prev" type="range" min={0.001} max={0.5} step={0.001} value={prev} onChange={(e) => setPrev(Number(e.target.value))} />
          <label htmlFor="bt-sens">
            Test catches it (sensitivity) <b className="num">{Math.round(sens * 100)}%</b>
          </label>
          <input id="bt-sens" type="range" min={0.5} max={1} step={0.01} value={sens} onChange={(e) => setSens(Number(e.target.value))} />
          <label htmlFor="bt-spec">
            Test is quiet for healthy people (specificity) <b className="num">{Math.round(spec * 100)}%</b>
          </label>
          <input id="bt-spec" type="range" min={0.5} max={1} step={0.01} value={spec} onChange={(e) => setSpec(Number(e.target.value))} />
        </div>
        <div role="img" aria-label={`Grid of 1,000 people: ${sick} have the condition, ${truePos} of them test positive, ${falsePos} healthy people also test positive.`} style={{ display: 'grid', gridTemplateColumns: 'repeat(50, 1fr)', gap: 1, maxWidth: 360, margin: '0.75rem 0' }}>
          {Array.from({ length: GRID }, (_, i) => {
            const isSick = i < sick;
            const isPositive = isSick ? i < truePos : i - sick < falsePos;
            const style = {
              aspectRatio: '1',
              borderRadius: 1,
              background: isSick ? 'var(--ink, #222)' : 'transparent',
              border: isSick ? 'none' : '1px solid var(--ink-3, #888)',
              outline: isPositive ? '2px solid var(--accent, #d33)' : 'none',
            } as const;
            return <div key={i} style={style} />;
          })}
        </div>
        <p className="viz-cap" aria-live="polite">
          Of 1,000 people, <b className="num">{sick}</b> are sick and <b className="num">{truePos}</b> of them test positive. <b className="num">{falsePos}</b> healthy people also test positive. So <b className="num">{positives}</b> test positive in all, and <b className="num">{truePos}</b> of those are sick: <b className="num">{Math.round(answer * 100)}%</b>.
        </p>
      </div>
    </Root>
  );
}
