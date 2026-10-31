import { useMemo, useState } from 'react';
import { Root } from './shared';
import { hzToMel, melFrequencies } from '../../lib/audio-dsp';

/*
 * Mel bands: the same 0 to 8,000 Hz range cut into overlapping triangular bands, either evenly in Hz
 * or evenly on the mel scale. Models that read "mel spectrograms" use the second kind. The band
 * edges come from the same melFrequencies() the filterbank uses.
 */

const FMAX = 8000;
const X0 = 12;
const X1 = 328;
const BASE = 96;
const TOP = 26;
const xOf = (hz: number) => Math.round((X0 + (hz / FMAX) * (X1 - X0)) * 100) / 100;
const n0 = (n: number) => Math.round(n).toLocaleString('en-GB');

export default function MelBands() {
  const [mode, setMode] = useState<'mel' | 'hz'>('mel');
  const [bands, setBands] = useState(12);

  const edges = useMemo(() => {
    if (mode === 'mel') return Array.from(melFrequencies(bands + 2, 0, FMAX));
    return Array.from({ length: bands + 2 }, (_, i) => (FMAX * i) / (bands + 1));
  }, [mode, bands]);

  const first = edges[2] - edges[0];
  const last = edges[bands + 1] - edges[bands - 1];
  const stepLow = hzToMel(600) - hzToMel(500);
  const stepHigh = hzToMel(7100) - hzToMel(7000);

  const say =
    mode === 'mel'
      ? `Bands are narrow where hearing is fine-grained and wide where it is not: the lowest band is about ${n0(first)} Hz wide and the highest about ${n0(last)} Hz wide, ${(last / first).toFixed(0)} times as wide.`
      : `Every band is the same width, about ${n0(first)} Hz, from the lowest to the highest.`;

  return (
    <Root>
      <div className="viz au au-mel">
        <p className="viz-title">Cutting 0 to 8,000 Hz into bands</p>
        <div className="au-chips" role="group" aria-label="How the bands are spaced">
          <button type="button" className="au-chip" aria-pressed={mode === 'hz'} onClick={() => setMode('hz')}>
            Equal steps in Hz
          </button>
          <button type="button" className="au-chip" aria-pressed={mode === 'mel'} onClick={() => setMode('mel')}>
            Equal steps in mel
          </button>
        </div>
        <label className="field">
          <span>
            Number of bands <b>{bands}</b>
          </span>
          <input type="range" min={5} max={80} step={1} value={bands} onChange={(e) => setBands(+e.target.value)} aria-label="Number of bands" />
        </label>
        <p className="au-hint">Whisper uses 80 bands on its 0 to 8,000 Hz range (the large-v3 model uses 128).</p>

        <svg viewBox="0 0 340 130" className="au-svg" role="img" aria-label={`${bands} triangular bands across 0 to 8000 hertz. ${say}`}>
          <path d={`M ${X0} ${BASE} H ${X1}`} className="au-zero au-solid" />
          {Array.from({ length: bands }, (_, i) => {
            const lo = edges[i];
            const mid = edges[i + 1];
            const hi = edges[i + 2];
            return <path key={i} d={`M ${xOf(lo)} ${BASE} L ${xOf(mid)} ${TOP} L ${xOf(hi)} ${BASE} Z`} className={i % 2 ? 'au-tri au-tri-b' : 'au-tri au-tri-a'} />;
          })}
          {[0, 2000, 4000, 6000, 8000].map((hz) => (
            <g key={hz}>
              <path d={`M ${xOf(hz)} ${BASE} v 5`} className="au-zero au-solid" />
              <text x={Math.min(Math.max(xOf(hz), 14), 326)} y="120" textAnchor="middle" className="au-axis-text">
                {hz === 0 ? '0' : `${hz / 1000}k`}
              </text>
            </g>
          ))}
        </svg>
        <p className="au-axis-cap">Frequency in Hz. Each triangle is one band: a sound adds to a band by how close it sits to the triangle's peak.</p>

        <p className="au-say" aria-live="polite">
          {say}
        </p>
        <p className="viz-cap">
          Why mel? The mel scale is built from listening tests, so equal steps in mel sound like equal steps in pitch. A 100 Hz step from 500 to 600 Hz is {stepLow.toFixed(1)} mel. The same 100 Hz step from 7,000 to 7,100 Hz is only {stepHigh.toFixed(2)} mel, about {(stepLow / stepHigh).toFixed(0)} times smaller. Mel bands follow that, so a model spends its detail where hearing does.
        </p>
      </div>
    </Root>
  );
}
