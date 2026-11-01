import { useMemo, useState } from 'react';
import { Root } from './shared';
import { TOY_K, TOY_Q, frequencies, pairAngles, ropeScore, scoreByDistance } from '../../lib/rope';

const MAX_POS = 120;
const MAX_DIST = 60;
const R = 40;

const hand = (angle: number, len: number) => ({ x: 50 + len * Math.cos(-angle), y: 50 + len * Math.sin(-angle) });

/**
 * RoPE as clock hands. A query and a key each have four pairs of numbers, drawn as hands on four clocks.
 * A token at position p turns every hand by p x (that clock's speed). The fast clock turns a whole
 * radian per position, the slow one a thousandth. The score is the sum of the four hand-to-hand
 * agreements, and it depends only on how far apart the two tokens are: shift both by the same amount
 * and every angle between the hands stays the same.
 */
export default function RopeHands() {
  const [m, setM] = useState(40);
  const [n, setN] = useState(32);
  const [squeeze, setSqueeze] = useState(false);
  const stretch = squeeze ? 0.25 : 1;

  const speeds = useMemo(() => frequencies(TOY_Q.length), []);
  const qa = pairAngles(TOY_Q, m, 10000, stretch);
  const ka = pairAngles(TOY_K, n, 10000, stretch);
  const score = ropeScore(TOY_Q, TOY_K, m, n, 10000, stretch);
  const dist = m - n;
  const curve = useMemo(() => scoreByDistance(TOY_Q, TOY_K, MAX_DIST, 10000, stretch), [stretch]);
  const lo = -4;
  const hi = 4;
  const cw = 300;
  const ch = 90;
  const pt = (d: number, s: number) => [(d / MAX_DIST) * cw, ((hi - s) / (hi - lo)) * ch] as const;
  const path = curve.map((s, d) => `${d === 0 ? 'M' : 'L'}${pt(d, s)[0].toFixed(1)},${pt(d, s)[1].toFixed(1)}`).join(' ');
  const marker = dist >= 0 && dist <= MAX_DIST ? pt(dist, score) : null;

  const shiftBoth = (by: number) => {
    const s = Math.max(Math.min(by, MAX_POS - m, MAX_POS - n), -Math.min(m, n));
    setM(m + s);
    setN(n + s);
  };

  return (
    <Root>
      <div className="viz dla-rope">
        <p className="viz-title">RoPE as clock hands</p>

        <div className="dla-sliders">
          <label className="dla-slide">
            <span>
              Query token at position <b className="num">{m}</b>
            </span>
            <input type="range" min={0} max={MAX_POS} value={m} onChange={(e) => setM(Number(e.target.value))} aria-label="Position of the query token" />
          </label>
          <label className="dla-slide">
            <span>
              Key token at position <b className="num">{n}</b>
            </span>
            <input type="range" min={0} max={MAX_POS} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Position of the key token" />
          </label>
        </div>

        <div className="dla-row">
          <button type="button" className="btn quiet dla-btn" onClick={() => shiftBoth(-10)}>
            Move both back 10
          </button>
          <button type="button" className="btn quiet dla-btn" onClick={() => shiftBoth(10)}>
            Move both forward 10
          </button>
          <label className="dla-check">
            <input type="checkbox" checked={squeeze} onChange={(e) => setSqueeze(e.target.checked)} />
            <span>Squeeze positions 4x (position interpolation)</span>
          </label>
        </div>

        <div className="dla-clocks">
          {speeds.map((sp, i) => (
            <figure key={i} className="dla-clock">
              <svg viewBox="0 0 100 100" role="img" aria-label={`Clock ${i + 1}, turning ${(sp * stretch).toFixed(3)} radians per position. Query hand at ${(((qa[i] % (2 * Math.PI)) * 180) / Math.PI).toFixed(0)} degrees, key hand at ${(((ka[i] % (2 * Math.PI)) * 180) / Math.PI).toFixed(0)} degrees.`}>
                <circle cx="50" cy="50" r={R + 6} className="dla-face" />
                <line x1="50" y1="50" x2={hand(ka[i], R).x} y2={hand(ka[i], R).y} className="dla-hand dla-hand-k" />
                <line x1="50" y1="50" x2={hand(qa[i], R + 2).x} y2={hand(qa[i], R + 2).y} className="dla-hand dla-hand-q" />
                <circle cx="50" cy="50" r="2.5" className="dla-pin" />
              </svg>
              <figcaption>
                {i === 0 ? 'Fast' : i === speeds.length - 1 ? 'Slowest' : i === 1 ? 'Medium' : 'Slow'}
                <span className="dla-dim"> {(sp * stretch).toPrecision(2)} rad per token</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="dla-legend2">
          <span className="dla-key dla-key-q" aria-hidden="true" /> query hands <span className="dla-key dla-key-k" aria-hidden="true" /> key hands
        </p>

        <div role="status" aria-live="polite">
          <p className="dla-status">
            Distance between tokens: <b className="num">{dist}</b>. Attention score q·k: <b className="num">{score.toFixed(2)}</b>.
          </p>
        </div>

        <svg className="dla-curve" viewBox={`-6 -4 ${cw + 12} ${ch + 24}`} role="img" aria-label={`Score against distance for distances 0 to ${MAX_DIST}. The curve starts at ${curve[0].toFixed(2)} and wiggles as the fast clocks go round. The marker shows distance ${dist}.`}>
          <line x1="0" y1={pt(0, 0)[1]} x2={cw} y2={pt(0, 0)[1]} className="dla-axis" />
          <path d={path} className="dla-line" fill="none" />
          {marker ? <circle cx={marker[0]} cy={marker[1]} r="4.5" className="dla-dot" /> : null}
          <text x="0" y={ch + 16} className="dla-axis-t">
            0
          </text>
          <text x={cw / 2} y={ch + 16} textAnchor="middle" className="dla-axis-t">
            distance between the two tokens
          </text>
          <text x={cw} y={ch + 16} textAnchor="end" className="dla-axis-t">
            {MAX_DIST}
          </text>
        </svg>
        <p className="viz-cap">
          Toy numbers: a query and key of 8 values (4 pairs), RoPE base 10,000 as in the RoFormer paper, so the four clocks turn 1, 0.1, 0.01 and 0.001 radians per token. Real heads have 64 to 128 values, so 32 to 64 clocks with speeds spread between those extremes. Move both tokens together and the score does not change; move one and it does. With positions squeezed, a token 120 places away is turned only as far as one 30 places away was before, which is how position interpolation fits a longer context into angles the model already knows.
        </p>
      </div>
    </Root>
  );
}
