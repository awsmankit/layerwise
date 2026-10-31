import { useState } from 'react';
import { Root } from './shared';
import { LOOP_CODE, loopSteps } from '../../lib/loop-walk';

const VALUES = [72, 85, 90, 64];
const STEPS = loopSteps(VALUES);

/** A list as a shelf of numbered boxes, and a loop as walking along it, one line of Python at a time. */
export default function LoopWalk() {
  const [i, setI] = useState(-1);
  const step = i >= 0 ? STEPS[i] : null;
  const last = i === STEPS.length - 1;
  const vars = step?.vars ?? {};

  return (
    <Root>
      <div className="viz sk-walk">
        <p className="viz-title">Walk along the shelf: averaging a list</p>

        <pre className="sk-lines" aria-label="The program, one line per row">
          {LOOP_CODE.map((l, n) => (
            <span key={n} className={'sk-line' + (step && step.line === n ? ' is-on' : '')} aria-current={step && step.line === n ? 'step' : undefined}>
              {l}
              {'\n'}
            </span>
          ))}
        </pre>

        <ol className="sk-shelf" aria-label="The list scores, boxes numbered from 0">
          {VALUES.map((v, n) => (
            <li key={n} className={'sk-box' + (step && step.box === n ? ' is-on' : '')}>
              <span className="sk-idx">box {n}</span>
              <b>{v}</b>
            </li>
          ))}
        </ol>

        <dl className="sk-vars" aria-label="Variables now">
          {(['score', 'total', 'average'] as const).map((k) => (
            <div key={k} className={vars[k] !== undefined ? 'has' : ''}>
              <dt>{k}</dt>
              <dd>{vars[k] !== undefined ? vars[k] : 'not made yet'}</dd>
            </div>
          ))}
        </dl>

        <p className="sk-say" aria-live="polite">
          {step ? step.note : 'Press Next step. Python runs one line at a time, top to bottom, and the loop repeats its indented line for every box.'}
          {step?.printed && (
            <span className="sk-printed">
              {' '}Printed: <code>{step.printed}</code>
            </span>
          )}
        </p>

        <div className="sk-actions">
          <button type="button" className="btn" onClick={() => setI((x) => Math.min(STEPS.length - 1, x + 1))} disabled={last}>
            {i < 0 ? 'Start' : 'Next step'}
          </button>
          <button type="button" className="btn quiet" onClick={() => setI((x) => Math.max(-1, x - 1))} disabled={i < 0}>
            Back
          </button>
          <button type="button" className="btn quiet" onClick={() => setI(-1)} disabled={i < 0}>
            Restart
          </button>
        </div>
      </div>
    </Root>
  );
}
