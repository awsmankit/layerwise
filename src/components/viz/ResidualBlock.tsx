import { useState } from 'react';
import { Root } from './shared';

/*
 * One residual block drawn as a plain block with or without the skip connection.
 * A vertical layout keeps every label readable on a phone without sideways scrolling.
 */
export default function ResidualBlock() {
  const [skip, setSkip] = useState(true);
  const [signal, setSignal] = useState(false);

  const say = skip
    ? 'Residual block: the output is the input x plus whatever the two layers add, F of x. The layers only have to learn a correction. If the best correction is nothing, the block simply passes x through.'
    : 'Plain block: the output is F of x. The layers have to rebuild x themselves, even when the best thing to do is leave it alone.';
  const learn = skip
    ? 'The learning signal flowing backwards has two routes: through both layers, and straight down the skip. The straight route never fades, so early layers keep learning even in a very deep stack.'
    : 'The learning signal flowing backwards must pass through every layer’s weights, being multiplied at each one. Across many layers it can shrink until the early layers barely learn.';

  return (
    <Root>
      <div className="viz db">
        <p className="viz-title">One residual block</p>
        <div className="db-row" role="group" aria-label="Block type">
          <button type="button" className="db-chip" aria-pressed={!skip} onClick={() => setSkip(false)}>
            Plain block
          </button>
          <button type="button" className="db-chip" aria-pressed={skip} onClick={() => setSkip(true)}>
            Residual block
          </button>
          <button type="button" className="db-chip" aria-pressed={signal} onClick={() => setSignal(!signal)}>
            Show learning signal: {signal ? 'on' : 'off'}
          </button>
        </div>

        <svg viewBox="0 0 300 330" className="db-res" role="img" aria-label={say}>
          <defs>
            <marker id="db-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" className="db-arrowhead" />
            </marker>
            <marker id="db-arrow-s" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" className="db-arrowhead-s" />
            </marker>
          </defs>

          <text x="110" y="18" textAnchor="middle" className="db-t db-t-b">input x</text>
          <path d="M 110 26 V 58" className="db-line" markerEnd="url(#db-arrow)" />

          <rect x="45" y="60" width="130" height="46" rx="8" className="db-box" />
          <text x="110" y="88" textAnchor="middle" className="db-t">3×3 conv, ReLU</text>
          <path d="M 110 106 V 138" className="db-line" markerEnd="url(#db-arrow)" />

          <rect x="45" y="140" width="130" height="46" rx="8" className="db-box" />
          <text x="110" y="168" textAnchor="middle" className="db-t">3×3 conv</text>
          <text x="186" y="168" className="db-t db-t-s">F(x)</text>
          <path d="M 110 186 V 214" className="db-line" markerEnd="url(#db-arrow)" />

          <circle cx="110" cy="230" r="16" className={`db-box${skip ? ' db-hot' : ''}`} />
          <text x="110" y="237" textAnchor="middle" className="db-t db-t-b">{skip ? '+' : 'F'}</text>
          <path d="M 110 246 V 268" className="db-line" markerEnd="url(#db-arrow)" />
          <rect x="70" y="270" width="80" height="30" rx="8" className="db-box" />
          <text x="110" y="291" textAnchor="middle" className="db-t">ReLU</text>
          <path d="M 110 300 V 314" className="db-line" />
          <text x="110" y="326" textAnchor="middle" className="db-t db-t-b">output</text>

          {skip && (
            <>
              <path d="M 110 36 H 240 V 230 H 128" className="db-skip" markerEnd="url(#db-arrow)" />
              <text transform="translate(262 133) rotate(90)" textAnchor="middle" className="db-t db-t-s">skip: a copy of x</text>
            </>
          )}

          {signal && (
            <>
              <path d="M 30 240 V 76" className="db-back" markerEnd="url(#db-arrow-s)" />
              <text transform="translate(14 158) rotate(-90)" textAnchor="middle" className="db-t db-t-s">learning signal</text>
              {skip && <path d="M 226 222 V 60" className="db-back" markerEnd="url(#db-arrow-s)" />}
            </>
          )}
        </svg>

        <p className="db-equation" aria-live="polite">
          <b>{skip ? 'output = x + F(x)' : 'output = F(x)'}</b>
        </p>
        <p className="db-blurb" aria-live="polite">
          {say}
          {signal && <> {learn}</>}
        </p>
        <p className="viz-cap">
          Real ResNet blocks add batch normalisation between the layers, and use a small extra layer on the skip when the size changes. This keeps only the idea.
        </p>
      </div>
    </Root>
  );
}
