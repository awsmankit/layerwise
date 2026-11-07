import { useState } from 'react';
import { Root } from '../viz/shared';
import type { Prediction } from '../../data/whatif/types';

/**
 * Asks for a guess before the experiment is touched. Guessing first, then seeing the result, is what makes
 * the result stick. Nothing is saved or sent anywhere.
 */
export default function PredictFirst({ prediction }: { prediction: Prediction }) {
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === prediction.answer;
  return (
    <Root>
      <section className="wi-predict" aria-labelledby="wi-predict-q">
        <p className="wi-predict-tag">Guess first</p>
        <p id="wi-predict-q" className="wi-predict-q">
          {prediction.question}
        </p>
        <div className="wi-predict-opts" role="group" aria-labelledby="wi-predict-q">
          {prediction.options.map((o, i) => {
            const state = picked === null ? '' : i === prediction.answer ? ' is-right' : picked === i ? ' is-wrong' : '';
            return (
              <button key={o} type="button" className={`wi-predict-opt${state}`} disabled={picked !== null} aria-pressed={picked === i} onClick={() => setPicked(i)}>
                <span className="wi-predict-mark" aria-hidden="true">
                  {picked === null ? '' : i === prediction.answer ? '✓' : picked === i ? '✗' : ''}
                </span>
                <span>{o}</span>
              </button>
            );
          })}
        </div>
        <div aria-live="polite">
          {picked !== null && (
            <p className="wi-predict-why">
              <b>{right ? 'Right. ' : 'Not quite. '}</b>
              {prediction.why} Now try it yourself with the switch below.
            </p>
          )}
        </div>
        {picked !== null && (
          <button type="button" className="btn quiet" onClick={() => setPicked(null)}>
            Guess again
          </button>
        )}
      </section>
    </Root>
  );
}
