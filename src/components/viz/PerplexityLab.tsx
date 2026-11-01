import { useState } from 'react';
import { Root } from './shared';
import { MODEL_PRESETS, P_STEPS, SENTENCE_TEXT, SENTENCE_TOKENS, bitsPerByte, bits, perplexity, sum, utf8Bytes } from '../../lib/lm-loss';

const frac = (i: number) => (i === 0 ? '1' : `1/${2 ** i}`);
const BYTES = utf8Bytes(SENTENCE_TEXT);

export default function PerplexityLab() {
  const [steps, setSteps] = useState<number[]>(MODEL_PRESETS[0].steps);
  const [preset, setPreset] = useState<string | null>(MODEL_PRESETS[0].id);
  const [cut, setCut] = useState<'words' | 'chars'>('words');

  const probs = steps.map((i) => P_STEPS[i]);
  const total = sum(probs.map(bits));
  const n = SENTENCE_TOKENS.length;
  const meanBits = total / n;
  const ppl = perplexity(probs);
  const count = cut === 'words' ? n : SENTENCE_TEXT.length;
  const pplCut = Math.pow(2, total / count);
  const bpb = bitsPerByte(total, BYTES);

  const pick = (id: string) => {
    setPreset(id);
    setSteps(MODEL_PRESETS.find((m) => m.id === id)!.steps);
  };
  const set = (i: number, v: number) => {
    setPreset(null);
    setSteps((s) => s.map((x, k) => (k === i ? v : x)));
  };

  const summary = `Total surprise ${total} bits over ${n} tokens, an average of ${meanBits.toFixed(2)} bits per token. Perplexity ${ppl.toFixed(2)}. Counted as ${count} ${cut === 'words' ? 'word tokens' : 'characters'} the perplexity is ${pplCut.toFixed(2)}. Bits per byte ${bpb.toFixed(2)} either way.`;

  return (
    <Root>
      <div className="viz wb wb-ppl">
        <p className="viz-title">How surprised was the model by the real text?</p>
        <div className="wb-row" role="group" aria-label="Example models">
          <span className="wb-label">Model</span>
          {MODEL_PRESETS.map((m) => (
            <button key={m.id} type="button" className="wb-chip" aria-pressed={preset === m.id} onClick={() => pick(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="wb-note">For each real word, slide to the probability the model had given it before seeing it. These are made-up example models.</p>

        <ul className="wb-ptable">
          {SENTENCE_TOKENS.map((t, i) => (
            <li key={i} className="wb-prow">
              <span className="wb-ptok">{t}</span>
              <input
                type="range"
                min={0}
                max={P_STEPS.length - 1}
                step={1}
                value={steps[i]}
                aria-label={`Probability the model gave to the word ${t} at position ${i + 1}`}
                aria-valuetext={`probability ${frac(steps[i])}, ${steps[i]} bits of surprise`}
                onChange={(e) => set(i, +e.target.value)}
              />
              <span className="wb-pval num">
                p = {frac(steps[i])} &rarr; <b>{steps[i]}</b> {steps[i] === 1 ? 'bit' : 'bits'}
              </span>
            </li>
          ))}
        </ul>

        <div className="wb-calc">
          <p>
            Total surprise: <b>{total}</b> bits. Average: {total} / {n} = <b>{meanBits.toFixed(2)}</b> bits per token, the cross-entropy ({(meanBits * Math.LN2).toFixed(2)} in nats, the unit most libraries print).
          </p>
          <p>
            Perplexity = 2<sup>{meanBits.toFixed(2)}</sup> = <b>{ppl.toFixed(2)}</b>: on average the model was as unsure as if it were choosing between about {ppl.toFixed(1)} equally likely words.
          </p>
        </div>

        <div className="wb-row" role="group" aria-label="How the text is cut up">
          <span className="wb-label">Count as</span>
          <button type="button" className="wb-chip" aria-pressed={cut === 'words'} onClick={() => setCut('words')}>
            {n} word tokens
          </button>
          <button type="button" className="wb-chip" aria-pressed={cut === 'chars'} onClick={() => setCut('chars')}>
            {SENTENCE_TEXT.length} characters
          </button>
        </div>
        <div className="wb-calc" aria-live="polite">
          <span className="sr-only">{summary}</span>
          <p aria-hidden="true">
            Perplexity per {cut === 'words' ? 'word token' : 'character'}: 2<sup>{total} / {count}</sup> = <b>{pplCut.toFixed(2)}</b>
          </p>
          <p aria-hidden="true">
            Bits per byte: {total} bits / {BYTES} bytes = <b>{bpb.toFixed(2)}</b>, the same whichever way you cut the text.
          </p>
        </div>

        <p className="viz-cap">
          "the cat sat on the mat" is {BYTES} bytes in UTF-8. The character view assumes a second model that assigns the whole sentence the same total probability but reads it one character at a time: an assumption made for this demonstration, not something every pair of real models satisfies. The point is only that per-token perplexity depends on how the text was cut, and bits per byte does not.
        </p>
      </div>
    </Root>
  );
}
