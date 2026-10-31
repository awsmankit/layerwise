import { useMemo, useState } from 'react';
import { Root } from './shared';
import { LAYERS, WIDTH, makeSetup, signalSizes, type SignalKind } from '../../lib/signal';

const W = 340;
const H = 210;
const LEFT = 66;
const DEC = 6; // decades shown above and below 1
const MID = 98;
const PER = 15; // pixels per decade
const y = (v: number) => MID - Math.max(-DEC, Math.min(DEC, Math.log10(Math.max(v, 1e-12)))) * PER;

const TICKS: [number, string][] = [
  [1e-6, '0.000001'],
  [1e-3, '0.001'],
  [1, '1'],
  [1e3, '1,000'],
  [1e6, '1,000,000'],
];

function sci(v: number) {
  if (v >= 0.01 && v < 1000) return v.toPrecision(2);
  return v.toExponential(1).replace('e+', ' × 10^').replace('e-', ' × 10^-');
}

/**
 * Twenty layers, one slider. The weights start with a spread set by the gain (the figure's "scale") and
 * the bars show how big the numbers are after each layer, on a log scale with 1 in the middle. The same
 * random numbers are used every time, so only the gain changes what you see.
 */
export default function InitDepth() {
  const setup = useMemo(() => makeSetup(3), []);
  const [kind, setKind] = useState<SignalKind>('relu');
  const [gain, setGain] = useState(Math.SQRT2);
  const sizes = useMemo(() => signalSizes(setup, gain, kind), [setup, gain, kind]);
  const last = sizes[LAYERS - 1];
  const bw = (W - LEFT - 6) / LAYERS;

  const verdict =
    last < 0.1
      ? 'The signal is dying out. By the last layer almost nothing is left, and the gradients going back the other way shrink the same way, so the early layers barely learn.'
      : last > 10
        ? kind === 'relu'
          ? 'The signal is blowing up. Large numbers make the output and the loss wild, and the gradients too.'
          : 'The signal is large and stuck near the ends of the tanh curve, where it is almost flat. Those units are saturated, and gradients through flat parts are close to zero.'
        : 'The signal keeps a steady size from the first layer to the last. This is what a good starting scale does.';

  return (
    <Root>
      <div className="viz da-depth">
        <p className="viz-title">Twenty layers: how big are the numbers?</p>
        <div className="da-row" role="group" aria-label="Activation function">
          <span className="da-lab">Activation</span>
          {(['relu', 'tanh'] as SignalKind[]).map((k) => (
            <button key={k} type="button" className="da-chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === 'relu' ? 'ReLU' : 'Tanh'}
            </button>
          ))}
          <span className="da-lab da-gap">Presets</span>
          <button type="button" className="da-chip" aria-pressed={Math.abs(gain - 1) < 0.001} onClick={() => setGain(1)}>
            Xavier (1.0)
          </button>
          <button type="button" className="da-chip" aria-pressed={Math.abs(gain - Math.SQRT2) < 0.001} onClick={() => setGain(Math.SQRT2)}>
            He (1.41)
          </button>
        </div>

        <label className="da-rate">
          <span>
            Starting scale of the weights <b className="num">{gain.toFixed(2)}</b>
          </span>
          <input type="range" min={0.3} max={3} step={0.05} value={Math.round(gain * 20) / 20} onChange={(e) => setGain(Number(e.target.value))} aria-label="Starting scale of the weights" aria-valuetext={gain.toFixed(2)} />
        </label>

        <svg className="da-svg da-dsvg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Bars for the size of the numbers after each of ${LAYERS} layers, on a log scale. After the last layer the size is about ${sci(last)}.`}>
          {TICKS.map(([v, label]) => (
            <g key={label}>
              <path d={`M${LEFT} ${y(v)} H${W - 6}`} className={v === 1 ? 'da-axis da-axis-1' : 'da-axis da-faint'} />
              <text x={LEFT - 6} y={y(v) + 4} textAnchor="end" className="da-t">
                {label}
              </text>
            </g>
          ))}
          {sizes.map((s, i) => {
            const top = y(s);
            const bad = s < 0.1 || s > 10;
            return <rect key={i} x={LEFT + i * bw + 1} y={Math.min(top, MID)} width={bw - 2} height={Math.max(1.5, Math.abs(top - MID))} className={bad ? 'da-bar da-bar-bad' : 'da-bar'} />;
          })}
          <text x={LEFT} y={H - 6} className="da-t">
            layer 1
          </text>
          <text x={W - 6} y={H - 6} textAnchor="end" className="da-t">
            layer {LAYERS}
          </text>
        </svg>

        <p className="da-verdict" aria-live="polite">
          <b>After layer {LAYERS}: about {sci(last)}.</b> {verdict}
        </p>
        <p className="viz-cap">
          Each layer has {WIDTH} neurons. The starting weights are random with a spread of scale divided by the square root of {WIDTH}. The input has size 1, so a bar above the middle line means the signal grew and one below means it shrank. The random numbers are the same every time; only the scale changes.
        </p>
      </div>
    </Root>
  );
}
