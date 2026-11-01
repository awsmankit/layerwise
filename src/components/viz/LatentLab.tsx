import { useEffect, useMemo, useState } from 'react';
import { Root } from './shared';
import {
  DATA_KINDS,
  NEAR,
  decode,
  makeData,
  priorSamples,
  summarise,
  train,
  type DataKind,
  type Mode,
} from '../../lib/autoencoder';

const KL_WEIGHTS = [0.01, 0.05, 0.2, 1];
const W = 280;
const HT = 240;
const SC = 50; // pixels per unit in the data plot
const px = (x: number) => W / 2 + x * SC;
const py = (y: number) => HT / 2 - y * SC;
const ZR = 6; // the latent strip shows -6 to 6
const ZW = W / (2 * ZR);
const zx = (z: number) => W / 2 + Math.max(-ZR, Math.min(ZR, z)) * ZW;
const z1 = (v: number, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const bell = (z: number) => Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);

export default function LatentLab() {
  const [kind, setKind] = useState<DataKind>('clumps');
  const [mode, setMode] = useState<Mode>('ae');
  const [wIx, setWIx] = useState(1);
  const [seed, setSeed] = useState(1);
  const [z, setZ] = useState(0);
  const [showPrior, setShowPrior] = useState(false);
  // trained in the browser after mounting, so server and browser never disagree in the last digit
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const klWeight = mode === 'vae' ? KL_WEIGHTS[wIx] : 0;
  const data = useMemo(() => makeData(kind, 160, 1), [kind]);
  const trained = useMemo(() => (ready ? train(data, mode, klWeight, seed) : null), [ready, data, mode, klWeight, seed]);
  const sum = useMemo(() => (trained ? summarise(trained, data) : null), [trained, data]);
  const samples = useMemo(() => (trained && showPrior ? priorSamples(trained.params, 120, 5) : []), [trained, showPrior]);
  const curve = useMemo(() => {
    if (!trained) return '';
    const pts: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const zz = -ZR + (i * 2 * ZR) / 120;
      const [x, y] = decode(trained.params, zz);
      pts.push(`${i ? 'L' : 'M'}${px(x).toFixed(1)} ${py(y).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [trained]);
  const bellPath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const zz = -ZR + (i * 2 * ZR) / 120;
      pts.push(`${i ? 'L' : 'M'}${zx(zz).toFixed(1)} ${(52 - bell(zz) * 110).toFixed(1)}`);
    }
    return `${pts.join(' ')} L${W} 52 L0 52 Z`;
  }, []);

  const here = trained ? decode(trained.params, z) : null;
  const group = (i: number) => (kind === 'clumps' ? i % 2 : 0);

  let hint = '';
  if (sum) {
    if (mode === 'ae' && kind === 'clumps')
      hint = `The code scale is whatever training happened to settle on (spread ${sum.codeStd.toFixed(1)}). Draw 200 codes from the bell curve and ${pct(sum.priorOnData)} decode to a point within ${NEAR} of a real one. Try New run: the number changes, because nothing ties the codes to the bell curve.`;
    else if (mode === 'vae' && kind === 'clumps')
      hint = `The KL term pulls the codes towards the bell curve (spread ${sum.codeStd.toFixed(1)}, mean ${z1(sum.codeMean)}). ${pct(sum.priorOnData)} of 200 codes drawn from it decode to a point near real data. The price is a higher reconstruction error. Raise the KL weight to see the trade-off.`;
    else if (mode === 'ae')
      hint = 'One smooth curve of data is easy: the code is just the position along the arc. Nothing goes wrong here. The trouble starts when the data has gaps, so try Two clumps.';
    else
      hint = `On one smooth curve a VAE rebuilds the arc well at a low KL weight and blurs it at a high one (error ${sum.recon.toFixed(2)}). The blur is the price of a tidier code.`;
  }

  const summary = sum
    ? `${mode === 'ae' ? 'Plain autoencoder' : `VAE with KL weight ${klWeight}`} on ${kind === 'clumps' ? 'two clumps' : 'an arc'}. Reconstruction error ${sum.recon.toFixed(3)}. ${mode === 'vae' ? `Average KL ${sum.kl.toFixed(2)}. ` : ''}Codes have mean ${z1(sum.codeMean, 2)} and spread ${sum.codeStd.toFixed(2)}. ${pct(sum.priorOnData)} of codes drawn from the bell curve decode near real data.`
    : 'Training the small networks.';

  return (
    <Root>
      <div className="viz wb wb-latent">
        <p className="viz-title">One-number codes: autoencoder against VAE</p>

        <div className="wb-row" role="group" aria-label="Data">
          <span className="wb-label">Data</span>
          {DATA_KINDS.map((d) => (
            <button key={d.id} type="button" className="wb-chip" aria-pressed={kind === d.id} onClick={() => setKind(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="wb-row" role="group" aria-label="Model">
          <span className="wb-label">Model</span>
          <button type="button" className="wb-chip" aria-pressed={mode === 'ae'} onClick={() => setMode('ae')}>
            Autoencoder
          </button>
          <button type="button" className="wb-chip" aria-pressed={mode === 'vae'} onClick={() => setMode('vae')}>
            VAE
          </button>
          <button type="button" className="wb-chip wb-chip-quiet" onClick={() => setSeed((s) => s + 1)}>
            New run (seed {seed})
          </button>
        </div>
        {mode === 'vae' && (
          <div className="wb-row" role="group" aria-label="KL weight">
            <span className="wb-label">KL weight</span>
            {KL_WEIGHTS.map((w, i) => (
              <button key={w} type="button" className="wb-chip" aria-pressed={wIx === i} onClick={() => setWIx(i)}>
                {w}
              </button>
            ))}
          </div>
        )}

        <div className="wb-plots">
          <figure className="wb-fig">
            <svg viewBox={`0 0 ${W} ${HT}`} className="wb-svg" role="img" aria-label={`Plot of the data and what the decoder draws. ${summary}`}>
              <rect x="0.5" y="0.5" width={W - 1} height={HT - 1} className="wb-frame" />
              <line x1={W / 2} y1="0" x2={W / 2} y2={HT} className="wb-axis" />
              <line x1="0" y1={HT / 2} x2={W} y2={HT / 2} className="wb-axis" />
              {data.map((d, i) => (
                <circle key={i} cx={px(d[0]).toFixed(1)} cy={py(d[1]).toFixed(1)} r="3" className={`wb-pt wb-g${group(i)}`} />
              ))}
              {curve && <path d={curve} className="wb-curve" />}
              {samples.map((s, i) => (
                <rect key={i} x={px(s.point[0]) - 2.6} y={py(s.point[1]) - 2.6} width="5.2" height="5.2" className="wb-sample" transform={`rotate(45 ${px(s.point[0])} ${py(s.point[1])})`} />
              ))}
              {here && <circle cx={px(here[0]).toFixed(1)} cy={py(here[1]).toFixed(1)} r="7" className="wb-here" />}
            </svg>
            <figcaption>
              Data space. Dots are real points, the line is everything the decoder can draw, the ring is the decoder's output for the code chosen below
              {showPrior ? ', diamonds are decodes of random draws from the bell curve' : ''}.
            </figcaption>
          </figure>

          <figure className="wb-fig">
            <svg viewBox={`0 0 ${W} 92`} className="wb-svg wb-svg-strip" role="img" aria-label="The code line: where each real point is encoded, against the standard bell curve.">
              <path d={bellPath} className="wb-bell" />
              <line x1="0" y1="52" x2={W} y2="52" className="wb-axis" />
              {sum &&
                sum.codes.map((c, i) => (
                  <line key={i} x1={zx(c)} y1="56" x2={zx(c)} y2="70" className={`wb-tick wb-g${group(i)}`} />
                ))}
              <line x1={zx(z)} y1="6" x2={zx(z)} y2="74" className="wb-zline" />
              {[-6, -3, 0, 3, 6].map((t) => (
                <text key={t} x={Math.max(9, Math.min(W - 9, zx(t)))} y="88" textAnchor="middle" className="wb-tl">
                  {t}
                </text>
              ))}
            </svg>
            <figcaption>The code line. Ticks are where the encoder puts each real point. The shaded hill is the standard bell curve a VAE aims for and the one we draw new codes from.</figcaption>
          </figure>
        </div>

        <label className="field wb-slide">
          <span>
            Code <b>{z.toFixed(1)}</b>
          </span>
          <input
            type="range"
            min={-4}
            max={4}
            step={0.1}
            value={z}
            aria-label="Code number to decode"
            aria-valuetext={here ? `code ${z.toFixed(1)}, decodes to ${here[0].toFixed(2)}, ${here[1].toFixed(2)}` : undefined}
            onChange={(e) => setZ(+e.target.value)}
          />
        </label>
        <div className="wb-row">
          <button type="button" className="wb-chip" aria-pressed={showPrior} onClick={() => setShowPrior((s) => !s)}>
            Draw 120 random codes from the bell curve
          </button>
        </div>

        <p className="wb-read" aria-live="polite">
          <span className="sr-only">{summary}</span>
          {sum && (
            <span aria-hidden="true">
              Rebuild error <b>{sum.recon.toFixed(3)}</b>
              {mode === 'vae' && (
                <>
                  {' '}
                  &middot; KL <b>{sum.kl.toFixed(2)}</b>
                </>
              )}{' '}
              &middot; codes: mean <b>{z1(sum.codeMean)}</b>, spread <b>{sum.codeStd.toFixed(1)}</b> &middot; random codes near real data <b>{pct(sum.priorOnData)}</b>
            </span>
          )}
        </p>
        {hint && <p className="wb-hint">{hint}</p>}

        <p className="viz-cap">
          Both networks are real and tiny: 2 numbers in, 8 hidden units, a one-number code, 8 hidden units, 2 numbers out, trained here in your browser (a few hundred steps, no server). Squared error is the reconstruction loss. The VAE adds the KL weight times its KL term and draws its code with a little noise. "Near real data" means within {NEAR} of one of the 160 training points, measured on 200 fixed random draws. This is a toy: other seeds and datasets change the numbers.
        </p>
      </div>
    </Root>
  );
}
