import { useState } from 'react';
import { Root } from './shared';
import { SPEED_OF_SOUND, frontBackDb, internalDelayUs, nullAngleDeg, onAxisDb, polar } from '../../lib/hearing';

/*
 * Two omnidirectional microphones and one delay: the pattern of a first-order differential directional microphone.
 * The curve is the sensitivity to sound arriving from each direction (front is up). The picture is computed from the
 * plane-wave formula in src/lib/hearing.ts, so it shows the high-frequency behaviour as well as the textbook low-frequency one.
 */

const PRESETS: { id: string; label: string; r: number | null }[] = [
  { id: 'omni', label: 'One microphone', r: null },
  { id: 'eight', label: 'Figure of eight', r: 0 },
  { id: 'hyper', label: 'Hypercardioid', r: 1 / 3 },
  { id: 'super', label: 'Supercardioid', r: 0.577 },
  { id: 'cardioid', label: 'Cardioid', r: 1 },
];

const F_MIN = 100;
const F_MAX = 8000;
const fromPos = (t: number) => Math.round(F_MIN * Math.pow(F_MAX / F_MIN, t));
const toPos = (f: number) => Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN);

const C = 160; // centre of the 320 x 320 picture
const R = 122; // radius for a response of 1

export default function BeamPolar() {
  const [spacing, setSpacing] = useState(10); // mm
  const [r, setR] = useState<number | null>(1);
  const [freq, setFreq] = useState(1000);

  const d = spacing / 1000;
  const omni = r === null;
  const rr = r ?? 1;
  const pts = polar(freq, d, rr, 120);
  const right = pts.map((p) => `${(C + R * p.g * Math.sin(p.theta)).toFixed(1)},${(C - R * p.g * Math.cos(p.theta)).toFixed(1)}`);
  const left = pts.map((p) => `${(C - R * p.g * Math.sin(p.theta)).toFixed(1)},${(C - R * p.g * Math.cos(p.theta)).toFixed(1)}`).reverse();
  const shape = [...right, ...left].join(' ');

  const ahead = omni ? 0 : onAxisDb(freq, d, rr);
  const fb = omni ? 0 : frontBackDb(freq, d, rr);
  const nullDeg = omni ? null : nullAngleDeg(rr);
  const delayUs = omni ? 0 : internalDelayUs(d, rr);
  const peakHz = (SPEED_OF_SOUND / (2 * d * (1 + rr))) | 0;
  const past = !omni && freq > peakHz;
  const lowCut = !omni && ahead < -12;

  const alt = omni
    ? 'Polar plot: one omnidirectional microphone hears every direction equally, a circle.'
    : `Polar plot at ${freq} hertz for microphones ${spacing} millimetres apart with an internal delay of ${delayUs.toFixed(0)} microseconds. ${nullDeg !== null ? `At low frequencies the null is at ${nullDeg.toFixed(0)} degrees from the front.` : 'There is no complete null.'} Front to back ratio at this frequency is ${fb.toFixed(1)} decibels.`;

  return (
    <Root>
      <div className="viz aua aua-beam">
        <p className="viz-title">Two microphones and a delay: a directional pattern</p>
        <div className="aua-chips" role="group" aria-label="Directional pattern presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={`btn quiet aua-pick ${(p.r === null ? omni : !omni && Math.abs(rr - p.r) < 0.004) ? 'on' : ''}`} aria-pressed={p.r === null ? omni : !omni && Math.abs(rr - p.r) < 0.004} onClick={() => setR(p.r)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="aua-beam-body">
          <svg viewBox="0 0 320 320" className="aua-polar" role="img" aria-label={alt}>
            <circle cx={C} cy={C} r={R} className="aua-ring" />
            <circle cx={C} cy={C} r={R / 2} className="aua-ring aua-ring-soft" />
            <line x1={C} y1={C - R - 8} x2={C} y2={C + R + 8} className="aua-ring aua-ring-soft" />
            <line x1={C - R - 8} y1={C} x2={C + R + 8} y2={C} className="aua-ring aua-ring-soft" />
            {omni ? <circle cx={C} cy={C} r={R} className="aua-shape" /> : <polygon points={shape} className="aua-shape" />}
            <text x={C} y={15} textAnchor="middle" className="aua-svgtext">
              front (talker)
            </text>
            <text x={C} y={315} textAnchor="middle" className="aua-svgtext">
              back
            </text>
            <circle cx={C} cy={C} r={4} className="aua-dot" />
          </svg>

          <div className="aua-beam-side">
            <label className="field">
              <span>
                Sound frequency <b>{freq.toLocaleString('en-GB')} Hz</b>
              </span>
              <input type="range" min={0} max={1} step={0.002} value={toPos(freq)} onChange={(e) => setFreq(fromPos(+e.target.value))} aria-label="Sound frequency in hertz" aria-valuetext={`${freq} hertz`} />
            </label>
            <label className="field">
              <span>
                Microphone spacing <b>{spacing} mm</b>
              </span>
              <input type="range" min={5} max={25} step={1} value={spacing} onChange={(e) => setSpacing(+e.target.value)} aria-label="Microphone spacing in millimetres" aria-valuetext={`${spacing} millimetres`} />
            </label>
            <label className="field">
              <span>
                Internal delay <b>{omni ? 'none' : `${(rr * 100).toFixed(0)}% of the gap time`}</b>
              </span>
              <input type="range" min={0} max={1.5} step={0.05} value={rr} onChange={(e) => setR(Math.round(+e.target.value * 100) / 100)} disabled={omni} aria-label="Internal delay as a fraction of the time sound takes to cross the gap" />
            </label>
          </div>
        </div>

        <dl className="aua-stats" aria-live="polite">
          <div>
            <dt>Delay</dt>
            <dd>{omni ? '-' : `${delayUs.toFixed(0)} µs`}</dd>
          </div>
          <div>
            <dt>Null (low freq.)</dt>
            <dd>{omni ? 'none' : nullDeg === null ? 'none' : `${nullDeg.toFixed(0)} deg`}</dd>
          </div>
          <div>
            <dt>Level ahead vs one mic</dt>
            <dd>{omni ? '0.0 dB' : `${ahead.toFixed(1)} dB`}</dd>
          </div>
          <div className="aua-main">
            <dt>Front-to-back</dt>
            <dd>{omni ? '0.0 dB' : fb > 60 ? '>60 dB' : `${fb.toFixed(1)} dB`}</dd>
          </div>
        </dl>
        <p className="aua-say" aria-live="polite">
          {omni
            ? 'One omnidirectional microphone hears all directions alike, so a talker in front and noise behind are mixed in the same proportion.'
            : `${lowCut ? `At ${freq.toLocaleString('en-GB')} Hz the front sound is ${Math.abs(ahead).toFixed(0)} dB quieter than from a single microphone, because subtracting two nearly identical signals leaves little. Each octave lower costs another 6 dB, which is why designs boost the low frequencies back. ` : ''}${past ? `Above about ${peakHz.toLocaleString('en-GB')} Hz this spacing is too wide for the pattern to stay a clean cardioid-like shape: the front level starts to fall and lobes appear. ` : ''}${nullDeg !== null ? `Sound from ${nullDeg.toFixed(0)} degrees off the front cancels at low frequencies.` : 'With this much delay nothing cancels completely.'}`}
        </p>
        <p className="aua-axis-cap">The curve is scaled so its biggest value touches the outer ring, so compare shapes, and read levels from the numbers. A real hearing aid cannot see the talker: the design assumes the talker is in front.</p>
      </div>
    </Root>
  );
}
