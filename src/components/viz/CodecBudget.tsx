import { useState } from 'react';
import { Root } from './shared';
import { codecBudget } from '../../lib/toy-tts';

/*
 * How many discrete codes does a stretch of speech become in a neural-codec language model? Uses the
 * settings stated in the EnCodec paper (24 kHz audio, 75 frames a second, codebooks of 1,024 entries,
 * which is 10 bits a code) and in the VALL-E paper (8 quantizers, a 3-second prompt). The sums are in
 * src/lib/toy-tts.ts. Other codecs use other frame rates and numbers of codebooks.
 */

const QUANTIZERS = [1, 2, 4, 8, 16, 32];
const PCM_KBPS = (24000 * 16) / 1000; // 16-bit samples at 24 kHz, the uncompressed comparison
const n0 = (n: number) => Math.round(n).toLocaleString('en-GB');

export default function CodecBudget() {
  const [seconds, setSeconds] = useState(10);
  const [qi, setQi] = useState(3);
  const q = QUANTIZERS[qi];
  const b = codecBudget(seconds, q);
  const prompt = codecBudget(3, q);
  const say = `${seconds} seconds of speech is ${n0(b.frames)} frames. With ${q} codes per frame that is ${n0(b.codes)} codes, at ${b.kbps} kilobits a second. A 3 second voice prompt is ${n0(prompt.codes)} codes.`;

  return (
    <Root>
      <div className="viz aub aub-codec">
        <p className="viz-title">How many tokens is a sentence of speech?</p>
        <div className="aub-sliders">
          <label className="field">
            <span>
              Length of speech <b>{seconds} s</b>
            </span>
            <input type="range" min={1} max={30} step={1} value={seconds} onChange={(e) => setSeconds(+e.target.value)} aria-label="Seconds of speech" />
          </label>
          <label className="field">
            <span>
              Codes per frame (quantizers) <b>{q}</b>
            </span>
            <input type="range" min={0} max={QUANTIZERS.length - 1} step={1} value={qi} onChange={(e) => setQi(+e.target.value)} aria-label="Number of quantizers" aria-valuetext={`${q} quantizers`} />
          </label>
        </div>
        <dl className="aub-stats">
          <div>
            <dt>Frames</dt>
            <dd>{n0(b.frames)}</dd>
            <dd className="aub-note">75 a second</dd>
          </div>
          <div>
            <dt>Codes in total</dt>
            <dd>{n0(b.codes)}</dd>
            <dd className="aub-note">frames x {q}</dd>
          </div>
          <div>
            <dt>Bit rate</dt>
            <dd>{b.kbps} kbit/s</dd>
            <dd className="aub-note">{(PCM_KBPS / b.kbps).toFixed(0)} times smaller than 16-bit PCM at 24 kHz</dd>
          </div>
          <div>
            <dt>3 s voice prompt</dt>
            <dd>{n0(prompt.codes)}</dd>
            <dd className="aub-note">codes the model reads as the voice to copy</dd>
          </div>
        </dl>
        <p className="aub-say" role="status" aria-live="polite">
          {say}
        </p>
        <p className="aub-hint">
          In the VALL-E design with 8 quantizers, the model writes the first code of every frame one after another ({n0(b.frames)} steps for this length), then fills in the other{' '}
          {q - 1} codes of all frames in parallel passes. More quantizers mean better audio and more tokens. These figures come from the EnCodec and VALL-E papers; other codecs differ.
        </p>
      </div>
    </Root>
  );
}
