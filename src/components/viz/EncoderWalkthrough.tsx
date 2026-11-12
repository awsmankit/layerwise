import { useMemo, useState, type ReactNode } from 'react';
import { Root } from './shared';
import { D, EMBEDDINGS, FEATURES, HIDDEN, POSITION_SCALE, TOKENS, positionGrid, positionalEncoding, runEncoder, topFriend, withPosition, type Mat, type Vec } from '../../lib/encoder-walk';

const IT = TOKENS.indexOf('its');
const pct = (x: number) => `${Math.round(x * 100)}%`;
const f1 = (x: number) => (Math.abs(x) < 0.05 ? '0' : x.toFixed(1));
const f2 = (x: number) => x.toFixed(2);

/** Signed colour: blue-violet for positive, amber for negative, strength by size. Returns the fill and whether the number on it needs light text. */
function tint(v: number, max: number) {
  const a = Math.min(1, Math.abs(v) / (max || 1));
  const c = v >= 0 ? 'var(--signal)' : 'var(--cost)';
  return { bg: `color-mix(in srgb, ${c} ${Math.round(a * 88)}%, var(--surface))`, strong: a > 0.6 };
}

function Strip({ v, max = 1.5, nums, label, tag }: { v: Vec; max?: number; nums: boolean; label?: string; tag?: string }) {
  return (
    <div className="ew-strip" role="img" aria-label={`${label ?? 'vector'}: ${v.map(f2).join(', ')}`}>
      {tag && <span className="ew-tag">{tag}</span>}
      <span className="ew-cells">
        {v.map((x, i) => {
          const t = tint(x, max);
          return (
            <span key={i} className={`ew-c${t.strong ? ' is-strong' : ''}`} style={{ background: t.bg }} aria-hidden="true">
              {nums ? f1(x) : ''}
            </span>
          );
        })}
      </span>
    </div>
  );
}

function Grid({ m, max, nums, pick, on, fmt = f2, unit = false }: { m: Mat; max: number; nums: boolean; pick?: (i: number) => void; on: number; fmt?: (x: number) => string; unit?: boolean }) {
  return (
    <div className="ew-gridwrap">
      <div className="ew-grid" style={{ gridTemplateColumns: `4.6rem repeat(${m[0].length}, var(--ew-cell))` }} role="group" aria-label="Grid of numbers, one row per token looking, one column per token looked at">
        <span />
        {TOKENS.map((t) => (
          <span key={t} className="ew-colhead">
            {t}
          </span>
        ))}
        {m.map((row, i) => (
          <GridRow key={i} i={i} row={row} max={max} nums={nums} pick={pick} on={on === i} fmt={fmt} unit={unit} />
        ))}
      </div>
    </div>
  );
}

function GridRow({ i, row, max, nums, pick, on, fmt, unit }: { i: number; row: Vec; max: number; nums: boolean; pick?: (i: number) => void; on: boolean; fmt: (x: number) => string; unit: boolean }) {
  return (
    <>
      <button type="button" className={`ew-rowhead${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => pick?.(i)}>
        {TOKENS[i]}
      </button>
      {row.map((x, j) => {
        const t = unit ? { bg: `color-mix(in srgb, var(--signal) ${Math.round(Math.min(1, x / max) * 88)}%, var(--surface))`, strong: x / max > 0.6 } : tint(x, max);
        return (
          <span key={j} className={`ew-c ew-gc${t.strong ? ' is-strong' : ''}${on ? ' is-row' : ''}`} style={{ background: t.bg }} aria-hidden="true">
            {nums || on ? fmt(x) : ''}
          </span>
        );
      })}
    </>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="ew-pill">{children}</span>;
}

export default function EncoderWalkthrough() {
  const [step, setStep] = useState(0);
  const [who, setWho] = useState(IT);
  const [nums, setNums] = useState(true);
  const [scaled, setScaled] = useState(true);
  const [layers, setLayers] = useState(3);

  const run = useMemo(() => runEncoder(6), []);
  const t = run[0];
  const x0 = useMemo(() => withPosition(), []);

  const attnRow = (scaled ? t.weights : t.weightsUnscaled)[who];
  const friend = topFriend(t.weights, who);
  const friendUnscaled = t.weightsUnscaled[IT][TOKENS.indexOf('cat')];
  const friendScaled = t.weights[IT][TOKENS.indexOf('cat')];
  const maxScore = Math.max(...t.scores.flat().map(Math.abs));
  const maxScaled = maxScore / Math.sqrt(D);

  const picker = (
    <div className="ew-who" role="group" aria-label="Follow one word">
      <span className="ew-whol">Follow:</span>
      {TOKENS.map((w, i) => (
        <button key={w} type="button" className="ew-chip" aria-pressed={who === i} onClick={() => setWho(i)}>
          {w}
        </button>
      ))}
    </div>
  );

  const steps: { title: string; hook: string; why?: string; needsWho?: boolean; body: ReactNode; read: string }[] = [
    {
      title: 'Chop the sentence',
      hook: 'A model cannot read letters. It reads tokens. Our sentence has five, and one little puzzle: when we reach “its”, whose paw is it?',
      why: 'A real tokenizer may split a word into pieces. We keep one token per word so you can follow each one.',
      body: (
        <div className="ew-tokens">
          {TOKENS.map((w, i) => (
            <span key={w} className={`ew-token${i === IT ? ' is-star' : ''}`}>
              <b>{w}</b>
              <small>token {i + 1}</small>
            </span>
          ))}
        </div>
      ),
      read: 'The sentence is split into five tokens: The, cat, licked, its, paw.',
    },
    {
      title: 'Give every word an ID card',
      hook: `Each token becomes a list of numbers, called a vector. The original paper used 512 numbers per word. Ours has ${D}, so you can see them all.`,
      why: `In this toy, each slot means something: ${FEATURES.join(', ')}. In a real model the slots are learned and nobody gave them names.`,
      body: (
        <>
          <p className="ew-legend">Slots: {FEATURES.map((f, i) => <Pill key={f}>{i + 1}. {f}</Pill>)}</p>
          {TOKENS.map((w, i) => (
            <div key={w} className="ew-line">
              <span className="ew-name">{w}</span>
              <Strip v={EMBEDDINGS[i]} max={1} nums={nums} label={`${w} embedding`} />
            </div>
          ))}
        </>
      ),
      read: 'Each token is turned into a vector of six numbers, its embedding.',
    },
    {
      title: 'Whisper where each word stands',
      hook: 'Attention does not know order. Shuffle the words and it would not notice. So we add a position pattern, made of sine and cosine waves, to every word vector.',
      why: `Each position gets its own pattern, so “cat” at position 2 and “cat” at position 9 look different. Here the pattern is scaled by ${POSITION_SCALE} so a word keeps its identity.`,
      body: (
        <>
          <p className="ew-cap">The wave picture: each row is a position (0 to 15), each column is one slot of the pattern. Slots further right wiggle more slowly.</p>
          <PositionWaves />
          <p className="ew-cap">Word + position = what goes into the encoder</p>
          {TOKENS.map((w, i) => (
            <div key={w} className="ew-line ew-sum">
              <span className="ew-name">{w}</span>
              <Strip v={EMBEDDINGS[i]} max={1} nums={nums} label={`${w} word vector`} />
              <span className="ew-op">+</span>
              <Strip v={positionalEncoding(i).map((x) => x * POSITION_SCALE)} max={1} nums={nums} label={`${w} position pattern`} />
              <span className="ew-op">=</span>
              <Strip v={x0[i]} max={1} nums={nums} label={`${w} with position`} />
            </div>
          ))}
        </>
      ),
      read: 'Position patterns from sine and cosine waves are added to each word vector.',
    },
    {
      title: 'Make three copies: Q, K and V',
      hook: 'Same vector, three jobs. The Query is what I am hunting for. The Key is my name tag. The Value is what I hand over if you pick me.',
      why: 'Three learned matrices turn each vector into Q, K and V. Peek at “its”: it hunts for something living (Q slot 2), and “cat” wears exactly that tag (K slot 2).',
      body: (
        <>
          <div className="ew-qkv">
            {[
              ['Q', 'query: what I hunt for', t.q],
              ['K', 'key: my name tag', t.k],
              ['V', 'value: what I hand over', t.v],
            ].map(([k, d, m]) => (
              <div key={k as string} className="ew-qkv-col">
                <p className="ew-cap">
                  <b>{k as string}</b> {d as string}
                </p>
                {(m as Mat).map((row, i) => (
                  <div key={i} className="ew-line">
                    <span className="ew-name">{TOKENS[i]}</span>
                    <Strip v={row} max={3} nums={nums} label={`${TOKENS[i]} ${k}`} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ),
      read: 'Each token gets a query, a key and a value vector.',
    },
    {
      title: 'Everyone rates everyone',
      hook: 'Multiply every Query with every Key (Q × Kᵀ). You get a 5×5 score sheet. Each row is the word that is looking, each column is the word being looked at. Higher means more interesting.',
      why: 'Tap a name on the left. Look at the “its” row: the score for “cat” towers over the rest. That is the model working out who the pronoun means.',
      needsWho: true,
      body: <Grid m={t.scores} max={maxScore} nums={nums} pick={setWho} on={who} fmt={f2} />,
      read: `Raw scores. Row ${TOKENS[who]} gives its highest score to ${TOKENS[friend]}.`,
    },
    {
      title: 'Cool the scores down',
      hook: `Divide every score by √${D} ≈ ${f2(Math.sqrt(D))}. The same grid, just calmer.`,
      why: 'Why bother? A dot product of long vectors can get huge, and a huge number makes softmax over-confident and learning jumpy. The paper divides by √d_k, which is √64 = 8 for each head.',
      needsWho: true,
      body: (
        <>
          <Grid m={t.scaled} max={maxScaled} nums={nums} pick={setWho} on={who} fmt={f2} />
          <p className="ew-cap">Every number is the earlier one divided by {f2(Math.sqrt(D))}. Same ranking, smaller gaps.</p>
        </>
      ),
      read: 'Scores divided by the square root of the vector size.',
    },
    {
      title: 'Turn scores into shares',
      hook: 'Softmax turns each row into percentages that add up to 100%. Big scores get bigger shares, small ones nearly vanish.',
      why: `Try the switch. Without scaling, “its” puts ${pct(friendUnscaled)} of its attention on “cat”. With scaling it is ${pct(friendScaled)}: still a clear winner, but the others keep a say. In a real model with 64 slots the difference is much bigger.`,
      needsWho: true,
      body: (
        <>
          <div className="ew-row">
            <button type="button" className="ew-chip" aria-pressed={scaled} onClick={() => setScaled(true)}>
              With ÷ √d
            </button>
            <button type="button" className="ew-chip" aria-pressed={!scaled} onClick={() => setScaled(false)}>
              Skip the scaling
            </button>
          </div>
          <Grid m={scaled ? t.weights : t.weightsUnscaled} max={1} nums={nums} pick={setWho} on={who} fmt={pct} unit />
          <p className="ew-cap">
            Row <b>{TOKENS[who]}</b> adds up to {pct(attnRow.reduce((a, b) => a + b, 0))}.
          </p>
        </>
      ),
      read: `Attention weights. Each row adds to 100 percent. Without scaling, its gives ${pct(friendUnscaled)} to cat; with scaling, ${pct(friendScaled)}.`,
    },
    {
      title: 'Blend the values',
      hook: `Now every word takes a share of everyone’s Value, using those percentages. “${TOKENS[who]}” becomes a blend.`,
      why: who === IT ? 'Look at the result: “its” now carries a lot of “cat”. That is what context-aware means: the vector for a word now knows about the words around it.' : 'Try “its”: it ends up carrying a lot of “cat”. That is what context-aware means.',
      needsWho: true,
      body: (
        <>
          {TOKENS.map((w, j) => (
            <div key={w} className="ew-line ew-blend">
              <span className="ew-name">{w}</span>
              <span className="ew-bar" aria-hidden="true">
                <i style={{ width: pct(t.weights[who][j]) }} />
              </span>
              <span className="ew-pc">{pct(t.weights[who][j])}</span>
              <span className="ew-op">×</span>
              <Strip v={t.v[j]} max={1.5} nums={nums} label={`${w} value`} />
            </div>
          ))}
          <div className="ew-line ew-result">
            <span className="ew-name">= blend</span>
            <Strip v={t.context[who]} max={1.5} nums={nums} label={`blend for ${TOKENS[who]}`} />
          </div>
        </>
      ),
      read: `${TOKENS[who]} becomes a weighted blend of all the value vectors.`,
    },
    {
      title: 'Add and Norm',
      hook: 'Add the original vector back in (the residual link), then rescale so the numbers stay tidy (LayerNorm).',
      why: 'The add means attention only has to learn a correction, and training signals can run straight through a deep stack. The norm keeps numbers from growing or shrinking layer after layer.',
      needsWho: true,
      body: (
        <>
          <div className="ew-line ew-sum">
            <span className="ew-name">{TOKENS[who]}</span>
            <Strip v={t.input[who]} max={1.5} nums={nums} label="original" tag="before" />
            <span className="ew-op">+</span>
            <Strip v={t.context[who]} max={1.5} nums={nums} label="blend" tag="blend" />
          </div>
          <div className="ew-line ew-sum">
            <span className="ew-name">sum</span>
            <Strip v={t.added1[who]} max={1.5} nums={nums} label="sum" />
            <span className="ew-op">→</span>
            <Strip v={t.normed1[who]} max={1.5} nums={nums} label="normalised" tag="norm" />
          </div>
        </>
      ),
      read: 'The attention result is added to the original vector, then normalised.',
    },
    {
      title: 'Each word thinks alone',
      hook: `Now the feed-forward network. Stretch the vector from ${D} to ${HIDDEN} numbers, switch off every negative one (ReLU), squeeze back to ${D}.`,
      why: 'Attention moves information between words. This part works on each word on its own, like a private thinking moment after the group chat.',
      needsWho: true,
      body: (
        <>
          <div className="ew-line">
            <span className="ew-name">in</span>
            <Strip v={t.normed1[who]} max={1.5} nums={nums} label="feed-forward input" />
          </div>
          <div className="ew-line">
            <span className="ew-name">wide</span>
            <Strip v={t.hidden[who]} max={1.5} nums={nums} label="wide layer after ReLU" />
          </div>
          <p className="ew-cap">
            {t.hidden[who].filter((x) => x === 0).length} of {HIDDEN} slots were switched off by ReLU (shown empty).
          </p>
          <div className="ew-line">
            <span className="ew-name">out</span>
            <Strip v={t.ffn[who]} max={1.5} nums={nums} label="feed-forward output" />
          </div>
        </>
      ),
      read: 'The feed-forward network widens the vector, applies ReLU, and shrinks it back.',
    },
    {
      title: 'Add and Norm again: one layer done',
      hook: 'Another residual add and another norm. The result: one vector per word, the same size as what went in, but now every one of them knows its neighbours.',
      why: 'These are the “context-aware representations” from the diagram. The next encoder layer takes them as its input.',
      body: (
        <>
          {TOKENS.map((w, i) => (
            <div key={w} className="ew-line ew-sum">
              <span className="ew-name">{w}</span>
              <Strip v={x0[i]} max={1.5} nums={nums} label={`${w} in`} tag="in" />
              <span className="ew-op">→</span>
              <Strip v={t.output[i]} max={1.5} nums={nums} label={`${w} out`} tag="out" />
            </div>
          ))}
        </>
      ),
      read: 'Each token leaves the layer as a new vector of the same size, now aware of the other tokens.',
    },
    {
      title: 'Stack it',
      hook: 'The original paper stacked 6 of these encoder layers. Each one reads the previous layer’s output and refines it again.',
      why: 'In this toy every layer reuses the same weights; in a real model each layer has its own. A common finding is that early layers pick up simple patterns and later ones more abstract ones, but that is a tendency, not a rule.',
      needsWho: true,
      body: (
        <>
          <label className="ew-slide">
            <span>
              Layers stacked: <b>{layers}</b>
            </span>
            <input type="range" min={1} max={6} step={1} value={layers} aria-label="Number of encoder layers" onChange={(e) => setLayers(+e.target.value)} />
          </label>
          <p className="ew-cap">
            Who does <b>{TOKENS[who]}</b> look at in each layer?
          </p>
          {run.slice(0, layers).map((l, li) => (
            <div key={li} className="ew-line ew-layer">
              <span className="ew-name">layer {li + 1}</span>
              <span className="ew-mini">
                {l.weights[who].map((w, j) => (
                  <span key={j} className="ew-minicol" title={`${TOKENS[j]} ${pct(w)}`}>
                    <i style={{ height: `${Math.max(4, Math.round(w * 44))}px` }} />
                    <small>{TOKENS[j]}</small>
                  </span>
                ))}
              </span>
            </div>
          ))}
          <p className="ew-cap">Output after layer {layers}:</p>
          {TOKENS.map((w, i) => (
            <div key={w} className="ew-line">
              <span className="ew-name">{w}</span>
              <Strip v={run[layers - 1].output[i]} max={1.5} nums={nums} label={`${w} after ${layers} layers`} />
            </div>
          ))}
        </>
      ),
      read: `${layers} encoder layers stacked, each reading the output of the one before.`,
    },
  ];

  const s = steps[step];
  const last = steps.length - 1;

  return (
    <Root>
      <div className="viz ew">
        <p className="viz-title">The encoder, step by step: “The cat licked its paw”</p>

        <ol className="ew-dots" aria-label="Steps">
          {steps.map((st, i) => (
            <li key={i}>
              <button type="button" className={`ew-dot${i === step ? ' is-on' : ''}${i < step ? ' is-done' : ''}`} aria-label={`Step ${i + 1}: ${st.title}`} aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}>
                {i + 1}
              </button>
            </li>
          ))}
        </ol>

        <div className="ew-card">
          <p className="ew-kicker">
            Step {step + 1} of {steps.length}
          </p>
          <h3 className="ew-title">{s.title}</h3>
          <p className="ew-hook">{s.hook}</p>
          {s.needsWho && picker}
          <div className="ew-stage">{s.body}</div>
          {s.why && (
            <p className="ew-why">
              <b>{step === 5 || step === 6 ? 'Why?' : 'Good to know'}</b> {s.why}
            </p>
          )}
          <span className="sr-only" aria-live="polite">
            {s.read}
          </span>
        </div>

        <div className="ew-nav">
          <button type="button" className="btn quiet" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </button>
          <button type="button" className="ew-chip ew-nums" aria-pressed={nums} onClick={() => setNums((n) => !n)}>
            Numbers {nums ? 'on' : 'off'}
          </button>
          <button type="button" className="btn" disabled={step === last} onClick={() => setStep(step + 1)}>
            {step === last ? 'The end' : 'Next'}
          </button>
        </div>

        <p className="viz-cap">
          A toy: six numbers per word instead of 512, one attention head instead of eight, and weights written by hand so the story is visible. Every operation is the real one. Violet is positive, amber is negative; stronger colour means a bigger number.
        </p>
      </div>
    </Root>
  );
}

/** The sine/cosine picture: 16 positions down, 24 pattern slots across. */
function PositionWaves() {
  const g = useMemo(() => positionGrid(16, 24), []);
  return (
    <div className="ew-waves" role="img" aria-label="Heat map of sine and cosine position patterns: slots at the left change quickly from one position to the next, slots at the right change slowly">
      {g.map((row, p) => (
        <div key={p} className="ew-wrow">
          {row.map((x, i) => {
            const t = tint(x, 1);
            return <span key={i} style={{ background: t.bg }} />;
          })}
        </div>
      ))}
    </div>
  );
}
