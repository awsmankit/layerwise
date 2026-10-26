import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

/*
 * Real data, checked October 2026:
 * - Token splits and IDs come from the o200k_base tokenizer (tiktoken).
 * - Model shapes are those of an 8B Llama-style model: 32 layers, width 4,096,
 *   8 KV heads of size 128, so the KV cache costs 2 x 32 x 8 x 128 x 2 bytes
 *   = 131,072 bytes (128 KiB) per token at 16-bit precision.
 * A real pairing would use the model's own tokenizer, and chat models add a few
 * special tokens around each message, so true counts are a little higher.
 * The next-token probabilities are illustrative.
 */
const Q = ['What', ' is', ' the', ' capital', ' of', ' France', '?'];
const Q_IDS = [4827, 382, 290, 9029, 328, 10128, 30];
const A = ['The', ' capital', ' of', ' France', ' is', ' Paris', '.'];
const A_IDS = [976, 9029, 328, 10128, 382, 12650, 13];
const KV_KIB = 128;
const WIDTH = 4096;
const LAYERS = 32;
const CANDIDATES: [string, number][] = [
  ['The', 0.46],
  ['Paris', 0.31],
  ['France', 0.09],
  ['It', 0.06],
  ['other', 0.08],
];

const STEPS = [
  { name: 'Text', note: 'You type 30 characters, 6 words. The model never sees letters; first they become tokens.' },
  { name: 'Tokens', note: 'The tokenizer cuts the text into 7 tokens. Most words are one token, with the space in front of them included (shown as a dot). The question mark is its own token.' },
  { name: 'IDs', note: 'Each token is a row number in a vocabulary of about 200,000 entries. These are the real IDs from one widely used tokenizer.' },
  { name: 'Vectors', note: 'Each ID picks one row of the embedding table. In an 8B-class model a row has 4,096 numbers, so the question enters the model as 7 × 4,096 = 28,672 numbers.' },
  { name: 'Layers', note: 'All 7 vectors go through 32 layers together. This first pass is called prefill. In every layer, each token leaves a key and a value behind: the KV cache.' },
  { name: 'Next token', note: 'The last layer gives a score for every one of the ~200,000 tokens. Sampling picks one. Low temperature makes the top choice win more often. These probabilities are illustrative.' },
  { name: 'One at a time', note: 'The chosen token is fed back in. Each step adds one token to the cache and reads the whole cache. Watch the answer and the cache grow.' },
  { name: 'Back to text', note: 'The 7 answer IDs are turned back into text. A special end token tells the app to stop. In total the cache now holds 14 tokens.' },
];

const show = (t: string) => t.replace(/^ /, '·');

export default function OneQuestion() {
  const [step, setStep] = useState(0);
  const [gen, setGen] = useState(0);

  const go = (i: number) => setStep(i);

  // step 7 plays the answer out one token at a time; step 8 shows it whole
  useEffect(() => {
    if (step !== 6) {
      setGen(step === 7 ? A.length : 0);
      return;
    }
    setGen(0);
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setGen(n);
      if (n >= A.length) clearInterval(id);
    }, 650);
    return () => clearInterval(id);
  }, [step]);

  const cacheTokens = step < 4 ? 0 : step === 4 || step === 5 ? Q.length : Q.length + (step === 6 ? gen : A.length);
  const chipX = (i: number) => 24 + i * 102;

  return (
    <Root>
      <div className="viz dx oq">
        <div className="dx-top">
          <p className="viz-title">One question, all the way through</p>
          <div className="dx-steps">
            <button type="button" className="btn quiet" disabled={step === 0} onClick={() => go(step - 1)}>
              Back
            </button>
            <button type="button" className="btn" disabled={step === STEPS.length - 1} onClick={() => go(step + 1)}>
              Next step
            </button>
          </div>
        </div>

        <ol className="oq-steps" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s.name}>
              <button type="button" aria-current={i === step ? 'step' : undefined} className={i === step ? 'is-on' : i < step ? 'is-past' : ''} onClick={() => go(i)}>
                <span className="num">{i + 1}</span> {s.name}
              </button>
            </li>
          ))}
        </ol>

        <svg viewBox="0 0 740 250" className="dx-svg" role="img" aria-label={`Step ${step + 1}: ${STEPS[step].name}. ${STEPS[step].note}`}>
          <AnimatePresence mode="wait">
            <motion.g key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }}>
              {step === 0 && (
                <g>
                  <Glyph name="user" size={40} x={24} y={86} className="dx-glyph-hot" />
                  <rect x="80" y="80" width="560" height="56" rx="12" className="dx-core" />
                  <text x="104" y="115" className="dx-word">What is the capital of France?</text>
                  <text x="80" y="164" className="dx-small">30 characters · 6 words · 0 tokens so far</text>
                </g>
              )}

              {(step === 1 || step === 2) &&
                Q.map((t, i) => (
                  <motion.g key={t + i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3, ease: EASE }}>
                    <rect x={chipX(i)} y="70" width="92" height="40" rx="8" className="dx-core dx-hot" />
                    <text x={chipX(i) + 46} y="96" textAnchor="middle" className="dx-name">{show(t)}</text>
                    {step === 2 && (
                      <>
                        <path d={`M ${chipX(i) + 46} 110 V 138`} className="dx-link" />
                        <rect x={chipX(i) + 6} y="138" width="80" height="30" rx="6" className="dx-core" />
                        <text x={chipX(i) + 46} y="158" textAnchor="middle" className="dx-name" style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{Q_IDS[i]}</text>
                      </>
                    )}
                  </motion.g>
                ))}
              {step === 1 && <text x="24" y="150" className="dx-small">7 tokens. A rare word would split into pieces: "unhappiness" becomes un · h · appiness.</text>}
              {step === 2 && <text x="24" y="210" className="dx-small">7 numbers, each between 0 and about 200,000.</text>}

              {step === 3 && (
                <g>
                  {Q.map((t, i) => (
                    <g key={t + i}>
                      <text x="24" y={40 + i * 26} className="dx-small">{`${Q_IDS[i]}`.padStart(5, ' ')}</text>
                      <path d={`M 70 ${36 + i * 26} H 92`} className="dx-link" />
                      {Array.from({ length: 34 }, (_, k) => {
                        const v = Math.sin((Q_IDS[i] % 97) * 0.7 + k * 1.3) * 0.5 + 0.5;
                        return (
                          <motion.rect
                            key={k}
                            x={98 + k * 17}
                            y={28 + i * 26}
                            width="13"
                            height="16"
                            rx="2"
                            className="kv-a"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.12 + v * 0.75 }}
                            transition={{ delay: i * 0.05 + k * 0.006, duration: 0.25 }}
                          />
                        );
                      })}
                      <text x="682" y={40 + i * 26} className="dx-small">{show(t)}</text>
                    </g>
                  ))}
                  <text x="98" y="226" className="dx-small">{`7 rows × ${WIDTH.toLocaleString('en-US')} numbers (34 drawn per row). Shades sketch the idea; values are not real.`}</text>
                </g>
              )}

              {step === 4 && (
                <g>
                  {Q.map((t, i) => (
                    <g key={`in${i}`}>
                      <rect x="20" y={22 + i * 28} width="96" height="22" rx="5" className="dx-core dx-hot" />
                      <text x="68" y={37 + i * 28} textAnchor="middle" className="dx-small" style={{ fill: 'var(--ink)' }}>{show(t)}</text>
                    </g>
                  ))}
                  {Array.from({ length: 8 }, (_, l) => (
                    <rect key={l} x={200 + l * 6} y={30 + l * 6} width="300" height="130" rx="10" className="dx-core" style={{ fillOpacity: 0.92 }} />
                  ))}
                  <text x="264" y="112" className="dx-name">{`${LAYERS} layers`}</text>
                  <text x="264" y="130" className="dx-small">attention + MLP in each</text>
                  <path d="M 116 110 H 196" className="dx-link" />
                  <path d="M 188 104 L 196 110 L 188 116" className="dx-link" />
                  <path d="M 548 110 H 590" className="dx-link" />
                  <path d="M 582 104 L 590 110 L 582 116" className="dx-link" />
                  {Q.map((_, i) => (
                    <motion.circle key={i} r="4.5" className="dx-packet" initial={{ cx: 116, cy: 33 + i * 28, opacity: 1 }} animate={{ cx: [116, 350, 600], cy: [33 + i * 28, 110, 33 + i * 28], opacity: [1, 1, 0] }} transition={{ duration: 1.4, delay: i * 0.05, ease: 'easeInOut' }} />
                  ))}
                  {Q.map((t, i) => (
                    <motion.g key={`kv${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 + i * 0.05 }}>
                      <rect x="600" y={22 + i * 28} width="22" height="22" rx="4" className="kv-cached" />
                      <text x="611" y={37 + i * 28} textAnchor="middle" className="dx-small">K</text>
                      <rect x="626" y={22 + i * 28} width="22" height="22" rx="4" className="kv-cached" />
                      <text x="637" y={37 + i * 28} textAnchor="middle" className="dx-small">V</text>
                      <text x="656" y={37 + i * 28} className="dx-small">{show(t)}</text>
                    </motion.g>
                  ))}
                  <text x="20" y="232" className="dx-small">7 tokens in, all at once</text>
                  <text x="736" y="232" textAnchor="end" className="dx-small">kept in all 32 layers</text>
                </g>
              )}

              {step === 5 && (
                <g>
                  {CANDIDATES.map(([w, p], i) => (
                    <g key={w}>
                      <text x="24" y={54 + i * 36} className="dx-name">{w}</text>
                      <motion.rect x="110" y={38 + i * 36} height="22" rx="5" className={i === 0 ? 'kv-a' : 'dx-core'} initial={{ width: 0 }} animate={{ width: p * 900 }} transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }} />
                      <text x={120 + p * 900} y={54 + i * 36} className="dx-small">{p.toFixed(2)}</text>
                    </g>
                  ))}
                  <text x="110" y="232" className="dx-small">Illustrative scores after the question. Sampling picks "The".</text>
                </g>
              )}

              {(step === 6 || step === 7) &&
                A.map((t, i) => {
                  const shown = i < gen;
                  return (
                    <motion.g key={t + i} initial={false} animate={{ opacity: shown ? 1 : 0.15 }}>
                      <rect x={chipX(i)} y="56" width="92" height="40" rx="8" className={shown && i === gen - 1 && step === 6 ? 'dx-core dx-hot' : 'dx-core'} />
                      <text x={chipX(i) + 46} y="82" textAnchor="middle" className="dx-name">{show(t)}</text>
                      {step === 7 && <text x={chipX(i) + 46} y="114" textAnchor="middle" className="dx-small">{A_IDS[i]}</text>}
                    </motion.g>
                  );
                })}
              {step === 7 && (
                <g>
                  <rect x="24" y="140" width="610" height="44" rx="10" className="dx-core dx-hot" />
                  <text x="44" y="168" className="dx-word" style={{ fontSize: 20 }}>The capital of France is Paris.</text>
                  <text x="652" y="167" className="dx-small">+ end token</text>
                </g>
              )}
            </motion.g>
          </AnimatePresence>
        </svg>

        <div className="oq-meter" aria-label="KV cache size">
          <span>KV cache</span>
          <span className="oq-bar">
            <motion.i initial={false} animate={{ width: `${(cacheTokens / 14) * 100}%` }} transition={{ duration: 0.4, ease: EASE }} />
          </span>
          <b className="num">
            {cacheTokens} tokens × {KV_KIB} KiB = {cacheTokens * KV_KIB >= 1024 ? `${((cacheTokens * KV_KIB) / 1024).toFixed(2)} MiB` : `${cacheTokens * KV_KIB} KiB`}
          </b>
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={step} className="oq-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <b>{STEPS[step].name}.</b> {STEPS[step].note}
          </motion.p>
        </AnimatePresence>
      </div>
    </Root>
  );
}
