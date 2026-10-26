import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph, type GlyphName } from './glyphs';

const STEPS: { name: string; lines: string[]; glyph: GlyphName }[] = [
  { name: 'Timeout', lines: ['set from your', 'latency budget'], glyph: 'clock' },
  { name: 'Retry', lines: ['backoff + jitter,', 'capped; never for', 'invalid input'], glyph: 'loop' },
  { name: 'Circuit breaker', lines: ['stop calling a', 'failing model', 'for a while'], glyph: 'shield' },
  { name: 'Fallback', lines: ['region, model or', 'provider, tested', 'on your evals'], glyph: 'route' },
  { name: 'Graceful floor', lines: ['cached answer,', 'degraded mode or', 'a clear message'], glyph: 'flag' },
];
const X = (i: number) => 20 + i * 142;
const W = 128;

/**
 * The layers of defence when a model call fails, in the order a request meets
 * them. Each one catches what the one before could not.
 */
export default function FallbackChain() {
  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">A provider has an outage at peak: five layers of defence</p>
        <svg viewBox="0 0 740 190" className="dx-svg" role="img" aria-label="Timeout, then retry with backoff and jitter, then a circuit breaker, then a tested fallback, then a graceful floor">
          {STEPS.map((s, i) => (
            <g key={s.name}>
              {i > 0 && (
                <>
                  <path d={`M ${X(i) - 14} 84 H ${X(i) - 1}`} className="dx-link" />
                  <path d={`M ${X(i) - 7} 80 L ${X(i) - 1} 84 L ${X(i) - 7} 88`} className="dx-link" />
                </>
              )}
              <rect x={X(i)} y="30" width={W} height="110" rx="10" className={i === 4 ? 'dx-core dx-hot' : 'dx-core'} />
              <text x={X(i) + 10} y="22" className="dx-small">{`step ${i + 1}`}</text>
              <g className={i === 4 ? 'dx-glyph-hot' : 'ng-glyph'}>
                <Glyph name={s.glyph} size={22} x={X(i) + 10} y={40} />
              </g>
              <text x={X(i) + 10} y="84" className="dx-name">{s.name}</text>
              {s.lines.map((l, k) => (
                <text key={l} x={X(i) + 10} y={102 + k * 14} className="dx-small">{l}</text>
              ))}
            </g>
          ))}
          <text x="20" y="172" className="dx-small">if a step cannot save the request, it passes to the next</text>
          <motion.circle
            r="5"
            cy="150"
            className="dx-packet"
            initial={{ cx: X(0) + W / 2, opacity: 0 }}
            whileInView={{ cx: [X(0) + W / 2, X(4) + W / 2], opacity: [0, 1] }}
            viewport={{ once: true }}
            transition={{ duration: 2.2, ease: EASE }}
          />
        </svg>
        <p className="viz-cap">Choose the fallback before you need it, and log which model answered each request so a fallback running for a day does not go unnoticed.</p>
      </div>
    </Root>
  );
}
