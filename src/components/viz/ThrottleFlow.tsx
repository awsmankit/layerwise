import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

/** An arrow head pointing right at (x, y). */
const right = (x: number, y: number) => `M ${x - 7} ${y - 4} L ${x} ${y} L ${x - 7} ${y + 4}`;
/** An arrow head pointing down at (x, y). */
const down = (x: number, y: number) => `M ${x - 4} ${y - 7} L ${x} ${y} L ${x + 4} ${y - 7}`;

/**
 * What to do when a model API says "too many requests". A support chatbot at
 * peak hours is the example: retry first, then queue what can wait, then fall
 * back, and only cross clouds when the fallback has been tested.
 */
export default function ThrottleFlow() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">A support chatbot gets a 429 at peak hours</p>
        <svg viewBox="0 0 740 296" className="dx-svg" role="img" aria-label="Peak traffic leads to a 429 error, then a capped retry. If still refused, work that can wait goes to a batch API; other work falls back to a second deployment, region or model, and only then to another cloud. Alert on the throttle rate.">
          {/* main path */}
          <rect x="20" y="40" width="150" height="60" rx="10" className="dx-core" />
          <g className="ng-glyph">
            <Glyph name="user" size={22} x={32} y={48} />
          </g>
          <text x="62" y="65" className="dx-name">Peak traffic</text>
          <text x="32" y="88" className="dx-small">support chatbot</text>

          <rect x="200" y="40" width="150" height="60" rx="10" className="dx-core dx-hot" />
          <text x="214" y="65" className="dx-name">429 error</text>
          <text x="214" y="88" className="dx-small">normal: plan for it</text>

          <rect x="380" y="40" width="170" height="60" rx="10" className="dx-core" />
          <g className="ng-glyph">
            <Glyph name="loop" size={22} x={392} y={48} />
          </g>
          <text x="422" y="65" className="dx-name">Retry</text>
          <text x="392" y="88" className="dx-small">backoff + jitter, capped</text>

          <rect x="580" y="40" width="140" height="60" rx="10" className="dx-core" />
          <text x="594" y="65" className="dx-name">Still refused?</text>
          <text x="594" y="88" className="dx-small">choose a route</text>

          <path d="M 170 70 H 198" className="dx-link" />
          <path d={right(198, 70)} className="dx-link" />
          <path d="M 350 70 H 378" className="dx-link" />
          <path d={right(378, 70)} className="dx-link" />
          <path d="M 550 70 H 578" className="dx-link" />
          <path d={right(578, 70)} className="dx-link" />

          {/* branches */}
          <path d="M 650 100 V 124 H 130 V 148" className="dx-link" />
          <path d={down(130, 148)} className="dx-link" />
          <path d="M 370 124 V 148" className="dx-link" />
          <path d={down(370, 148)} className="dx-link" />
          <text x="138" y="141" className="dx-small">can wait</text>
          <text x="378" y="141" className="dx-small">needs an answer now</text>

          <rect x="20" y="150" width="220" height="74" rx="10" className="dx-core" />
          <g className="ng-glyph">
            <Glyph name="queue" size={20} x={32} y={160} />
          </g>
          <text x="60" y="175" className="dx-name">Queue it</text>
          <text x="32" y="198" className="dx-small">batch APIs have separate,</text>
          <text x="32" y="214" className="dx-small">often larger limits</text>

          <rect x="260" y="150" width="220" height="74" rx="10" className="dx-core" />
          <g className="ng-glyph">
            <Glyph name="route" size={20} x={272} y={160} />
          </g>
          <text x="300" y="175" className="dx-name">Fall back nearby</text>
          <text x="272" y="198" className="dx-small">second deployment, region</text>
          <text x="272" y="214" className="dx-small">or model (Azure: spillover)</text>

          <rect x="500" y="150" width="220" height="74" rx="10" className="dx-core" />
          <g className="ng-glyph">
            <Glyph name="cloud" size={20} x={512} y={160} />
          </g>
          <text x="540" y="175" className="dx-name">Another cloud</text>
          <text x="512" y="198" className="dx-small">only if prompts, parsing</text>
          <text x="512" y="214" className="dx-small">and evals work on both</text>

          <path d="M 480 187 H 498" className="dx-link" />
          <path d={right(498, 187)} className="dx-link" />

          {/* the watcher */}
          <rect x="20" y="246" width="700" height="34" rx="8" className="dx-frame" style={{ strokeDasharray: '4 4' }} />
          <g className="ng-glyph">
            <Glyph name="chart" size={18} x={32} y={254} />
          </g>
          <text x="58" y="267" className="dx-small" style={{ fill: 'var(--ink)' }}>Alert on the throttle rate, not only on errors</text>

          <motion.circle
            r="5"
            cy="70"
            className="dx-packet"
            initial={{ cx: 95, opacity: 0 }}
            whileInView={{ cx: [95, 275, 465, 650], opacity: [0, 1, 1, 1] }}
            viewport={{ once: true }}
            transition={{ duration: 2.4, ease: EASE }}
          />
        </svg>
        <p className="viz-cap">Azure spillover moves traffic from provisioned to standard inside Azure. Test any fallback model on your own cases first: the same prompt behaves differently on different models.</p>
      </div>
    </Root>
  );
}
