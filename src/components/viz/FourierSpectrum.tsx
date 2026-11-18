import { useState } from 'react';
import { Root } from './shared';

const N = 64; // samples in the window; the frequencies below are whole cycles in it

/** Magnitude of the discrete Fourier transform at cycle count k, scaled so a pure sine of amplitude A gives A. */
export function magnitude(signal: number[], k: number) {
  let re = 0;
  let im = 0;
  for (let n = 0; n < signal.length; n++) {
    const angle = (-2 * Math.PI * k * n) / signal.length;
    re += signal[n] * Math.cos(angle);
    im += signal[n] * Math.sin(angle);
  }
  return (2 * Math.sqrt(re * re + im * im)) / signal.length;
}

/**
 * A signal is a sum of waves. The Fourier transform asks how much of each
 * frequency is present. Each sine in the signal shows up as a spike at its
 * frequency, and the spike's height is the sine's amplitude.
 */
export default function FourierSpectrum() {
  const [f1, setF1] = useState(3);
  const [f2, setF2] = useState(8);
  const [a1, setA1] = useState(1);
  const [a2, setA2] = useState(0.5);

  // Round before drawing: sin and cos can differ in the last digit between the server render and the browser.
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  const signal = Array.from({ length: N }, (_, n) => r4(a1 * Math.sin((2 * Math.PI * f1 * n) / N) + a2 * Math.sin((2 * Math.PI * f2 * n) / N)));
  const spectrum = Array.from({ length: 17 }, (_, k) => r4(magnitude(signal, k)));
  const maxS = Math.max(1, ...spectrum);

  const wave = signal.map((v, n) => `${n ? 'L' : 'M'} ${(10 + (n / (N - 1)) * 340).toFixed(1)} ${(55 - v * 40).toFixed(1)}`).join(' ');

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">A signal and its frequencies</p>
        <div className="viz-controls">
          <label htmlFor="ft-f1">Wave 1 frequency <b className="num">{f1}</b></label>
          <input id="ft-f1" type="range" min={1} max={16} step={1} value={f1} onChange={(e) => setF1(Number(e.target.value))} />
          <label htmlFor="ft-a1">Wave 1 amplitude <b className="num">{a1.toFixed(1)}</b></label>
          <input id="ft-a1" type="range" min={0} max={1} step={0.1} value={a1} onChange={(e) => setA1(Number(e.target.value))} />
          <label htmlFor="ft-f2">Wave 2 frequency <b className="num">{f2}</b></label>
          <input id="ft-f2" type="range" min={1} max={16} step={1} value={f2} onChange={(e) => setF2(Number(e.target.value))} />
          <label htmlFor="ft-a2">Wave 2 amplitude <b className="num">{a2.toFixed(1)}</b></label>
          <input id="ft-a2" type="range" min={0} max={1} step={0.1} value={a2} onChange={(e) => setA2(Number(e.target.value))} />
        </div>
        <svg viewBox="0 0 360 60" className="dx-svg" role="img" aria-label="The signal over time">
          <path d={wave} className="dx-curve" fill="none" />
        </svg>
        <svg viewBox="0 0 360 120" className="dx-svg" role="img" aria-label={`Spectrum with peaks at ${f1} and ${f2} cycles`}>
          {spectrum.map((m, k) => (
            <rect key={k} x={12 + k * 20} y={100 - (m / maxS) * 80} width={12} height={(m / maxS) * 80} className={k === f1 || k === f2 ? 'dx-packet' : 'dx-link'} />
          ))}
        </svg>
        <p className="viz-cap" aria-live="polite">
          Spectrum peaks: frequency {f1} has height <b className="num">{spectrum[f1].toFixed(2)}</b> (amplitude {a1.toFixed(1)}), frequency {f2} has height <b className="num">{spectrum[f2].toFixed(2)}</b> (amplitude {a2.toFixed(1)}).
        </p>
      </div>
    </Root>
  );
}
