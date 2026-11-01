import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  MAX_GAP,
  RNN_INPUT_WEIGHT,
  STRIP_LEN,
  gradientStrip,
  sigmoid,
  summarise,
  type Kind,
  type Verdict,
} from '../../lib/recurrent';

const W = 290;
const H = 190;
const L = 52;
const R = 8;
const T0 = 14;
const B0 = 34;
const mid = (T0 + H - B0) / 2;
const half = (H - B0 - T0) / 2;

const n2 = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
const f2 = (v: number) => v.toFixed(2);

/** "1 in 1,018" style for small shares, two decimals for big ones. */
function share(x: number): string {
  if (x >= 0.1) return x.toFixed(2);
  if (x >= 1e-8) return `1 in ${Math.round(1 / x).toLocaleString('en-GB')}`;
  return 'less than 1 in 100 million';
}

const VERDICT: Record<Verdict, string> = {
  right: 'leans the right way',
  wrong: 'leans the WRONG way',
  unsure: 'cannot tell',
};

/**
 * A one-number RNN and a one-cell LSTM read the same sentence. The chart shows what each carries from the
 * subject to the verb; the inspector shows one step in detail; the strip shows how much learning signal
 * gets back to each earlier step of a 50-word sentence. All weights are hand-set, nothing is trained.
 */
export default function RnnLstmLab() {
  const [kind, setKind] = useState<Kind>('plural');
  const [odd, setOdd] = useState(false);
  const [gap, setGap] = useState(20);
  const [rnnW, setRnnW] = useState(0.9);
  const [fb, setFb] = useState(4);
  const [step, setStep] = useState(1);

  const run = useMemo(() => summarise(kind, gap, rnnW, fb, odd), [kind, gap, rnnW, fb, odd]);
  const strip = useMemo(() => gradientStrip(rnnW, fb), [rnnW, fb]);
  const { words, rnn, lstm, sign } = run;
  const n = words.length;
  const t = Math.min(step, n - 1);
  const word = words[t];
  const st = lstm[t];
  const prevH = t > 0 ? rnn[t - 1] : 0;
  const prevC = t > 0 ? lstm[t - 1].c : 0;
  const pre = rnnW * prevH + RNN_INPUT_WEIGHT * word.value;

  const x = (i: number) => Math.round((L + (n === 1 ? 0 : (i / (n - 1)) * (W - L - R))) * 10) / 10;
  const y = (v: number) => Math.round((mid - Math.max(-1.05, Math.min(1.05, v * sign)) * half) * 10) / 10;
  const rnnPts = rnn.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const cellPts = lstm.map((s, i) => `${x(i).toFixed(1)},${y(s.c).toFixed(1)}`).join(' ');

  const lstmNote =
    word.write === 1
      ? `The forget gate drops to ${f2(st.f)}, so the old cell is almost wiped, and the input gate opens to ${f2(st.i)}, so the new fact goes in.`
      : word.value !== 0
        ? `This word carries the opposite fact, but the input gate stays at ${f2(st.i)}, so almost none of it reaches the cell.`
        : `The forget gate holds at ${f2(st.f)}, so the cell keeps ${Math.round(st.f * 100)}% of what it had, and the input gate lets in only ${f2(st.i)}.`;
  const rnnNote =
    word.value !== 0
      ? `This word adds ${n2(RNN_INPUT_WEIGHT * word.value)} to the total. The RNN has no gate to refuse it, so it moves the state straight away.`
      : `No new fact. The old state, times the weight ${f2(rnnW)}, is squeezed through tanh, so the state is just a copy that fades or holds.`;

  const outcome = (name: string, signal: number, verdict: Verdict) => (
    <p className={`wa-out wa-${verdict}`}>
      <b>{name}</b> at the verb: state {n2(signal * sign)}, {VERDICT[verdict]}.
    </p>
  );

  const cellW = (W - 48 - 4) / STRIP_LEN;
  const heat = (g: number) => Math.round(Math.max(0.05, Math.min(1, (Math.log10(Math.max(g, 1e-300)) + 8) / 8)) * 100) / 100; // two decimals: the server and the browser then print the same value

  return (
    <Root>
      <div className="viz wa-lab">
        <p className="viz-title">Remember the subject until the verb</p>

        <div className="wa-row" role="group" aria-label="Subject">
          <span className="wa-lab-t">Subject</span>
          {(['plural', 'singular'] as Kind[]).map((k) => (
            <button key={k} type="button" className="wa-chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === 'plural' ? 'keys (plural)' : 'key (singular)'}
            </button>
          ))}
          <label className="wa-check">
            <input type="checkbox" checked={odd} onChange={(e) => setOdd(e.target.checked)} />
            <span>Add a distractor noun</span>
          </label>
        </div>

        <p className="wa-sentence" aria-label={`Sentence: ${words.map((w) => w.text).join(' ')}`}>
          {words.map((w, i) => (
            <span key={i} className={i === t ? 'wa-w wa-cur' : w.write ? 'wa-w wa-subj' : w.value !== 0 ? 'wa-w wa-odd' : 'wa-w'}>
              {w.text}{' '}
            </span>
          ))}
        </p>

        <div className="wa-sliders">
          <label className="wa-slide">
            <span>
              Words between subject and verb <b>{gap}</b>
            </span>
            <input type="range" min={0} max={MAX_GAP} step={1} value={gap} onChange={(e) => setGap(Number(e.target.value))} aria-label="Words between the subject and the verb" />
          </label>
          <label className="wa-slide">
            <span>
              RNN recurrent weight <b>{f2(rnnW)}</b>
            </span>
            <input type="range" min={0.3} max={1.3} step={0.05} value={rnnW} onChange={(e) => setRnnW(Number(e.target.value))} aria-label="RNN recurrent weight" aria-valuetext={f2(rnnW)} />
          </label>
          <label className="wa-slide">
            <span>
              LSTM forget gate rests at <b>{f2(sigmoid(fb))}</b>
            </span>
            <input type="range" min={0} max={6} step={0.25} value={fb} onChange={(e) => setFb(Number(e.target.value))} aria-label="Resting value of the LSTM forget gate, as a bias" aria-valuetext={`${f2(sigmoid(fb))} (bias ${fb})`} />
          </label>
        </div>

        <ul className="wa-legend" aria-hidden="true">
          <li>
            <i className="wa-sw wa-sw-rnn" /> RNN state h
          </li>
          <li>
            <i className="wa-sw wa-sw-lstm" /> LSTM memory cell c
          </li>
        </ul>
        <svg className="wa-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Line chart over ${n} steps. Up means the state points to the right answer. The RNN ends at ${n2(run.rnnSignal)} and the LSTM cell at ${n2(lstm[n - 1].c * sign)}.`}>
          <path d={`M${L} ${mid} H${W - R}`} className="wa-axis" />
          <path d={`M${L} ${T0} V${H - B0}`} className="wa-axis" />
          <text x={L - 6} y={T0 + 10} textAnchor="end" className="wa-t">
            right
          </text>
          <text x={L - 6} y={mid + 4} textAnchor="end" className="wa-t">
            0
          </text>
          <text x={L - 6} y={H - B0} textAnchor="end" className="wa-t">
            wrong
          </text>
          <path d={`M${x(t)} ${T0} V${H - B0}`} className="wa-cursor" />
          <polyline points={rnnPts} className="wa-line wa-line-rnn" />
          <polyline points={cellPts} className="wa-line wa-line-lstm" />
          <circle cx={x(t)} cy={y(rnn[t])} r={4.5} className="wa-dot wa-dot-rnn" />
          <circle cx={x(t)} cy={y(st.c)} r={4.5} className="wa-dot wa-dot-lstm" />
          <text x={x(1)} y={H - 12} textAnchor="start" className="wa-t">
            subject
          </text>
          <text x={W - R} y={H - 12} textAnchor="end" className="wa-t">
            verb
          </text>
        </svg>

        <div aria-live="polite">
          {outcome('RNN', run.rnnSignal, run.rnnVerdict)}
          {outcome('LSTM', run.lstmSignal, run.lstmVerdict)}
        </div>

        <label className="wa-slide wa-step">
          <span>
            Look inside step <b>{t + 1}</b> of {n}: <q>{word.text}</q>
          </span>
          <input type="range" min={1} max={n} step={1} value={t + 1} onChange={(e) => setStep(Number(e.target.value) - 1)} aria-label="Step to inspect" aria-valuetext={`Step ${t + 1}, ${word.text}`} />
        </label>

        <div className="wa-panels">
          <section className="wa-panel" aria-label="Inside the RNN at this step">
            <h4 className="wa-h">RNN</h4>
            <dl className="wa-nums">
              <dt>old state</dt>
              <dd>{n2(prevH)}</dd>
              <dt>weight × old state</dt>
              <dd>{n2(rnnW * prevH)}</dd>
              <dt>this word's input</dt>
              <dd>{n2(RNN_INPUT_WEIGHT * word.value)}</dd>
              <dt>new state = tanh({n2(pre)})</dt>
              <dd>
                <b>{n2(rnn[t])}</b>
              </dd>
            </dl>
            <p className="wa-note">{rnnNote}</p>
          </section>
          <section className="wa-panel" aria-label="Inside the LSTM at this step">
            <h4 className="wa-h">LSTM</h4>
            {(
              [
                ['forget gate', st.f],
                ['input gate', st.i],
                ['output gate', st.o],
              ] as [string, number][]
            ).map(([label, v]) => (
              <div className="wa-gate" key={label}>
                <span>{label}</span>
                <span className="wa-bar" aria-hidden="true">
                  <i style={{ width: `${v * 100}%` }} />
                </span>
                <b>{f2(v)}</b>
              </div>
            ))}
            <dl className="wa-nums">
              <dt>candidate to write</dt>
              <dd>{n2(st.g)}</dd>
              <dt>cell: old {n2(prevC)} → new</dt>
              <dd>
                <b>{n2(st.c)}</b>
              </dd>
              <dt>output h</dt>
              <dd>{n2(st.h)}</dd>
            </dl>
            <p className="wa-note">{lstmNote}</p>
          </section>
        </div>

        <p className="viz-title wa-sub">How much learning signal gets back? (a fixed 50-word sentence)</p>
        <svg className="wa-svg" viewBox={`0 0 ${W} 76`} role="img" aria-label={`Two rows of ${STRIP_LEN} cells, one per word, showing how much of the learning signal from the last word reaches each earlier word. Dark means a lot. At the subject, word 2, the RNN gets ${share(strip.rnnFirst)} and the LSTM gets ${share(strip.lstmFirst)}.`}>
          {(
            [
              ['RNN', strip.rnn, 8, 'wa-cell-rnn'],
              ['LSTM', strip.lstm, 42, 'wa-cell-lstm'],
            ] as [string, number[], number, string][]
          ).map(([label, vals, top, cls]) => (
            <g key={label}>
              <text x={0} y={top + 17} className="wa-t">
                {label}
              </text>
              {vals.map((g, i) => (
                <rect key={i} x={48 + i * cellW} y={top} width={cellW - 0.6} height={26} className={cls} style={{ opacity: heat(g) }} />
              ))}
            </g>
          ))}
          <rect x={48 + 1 * cellW - 0.6} y={4} width={cellW + 0.6} height={68} className="wa-mark" />
        </svg>
        <p className="wa-scale" aria-hidden="true">
          <span>word 1</span>
          <span>subject is word 2 (outlined)</span>
          <span>word 50 (the verb)</span>
        </p>
        <p className="wa-status" aria-live="polite">
          Share of the verb's learning signal that reaches the subject: <b>RNN {share(strip.rnnFirst)}</b>, <b>LSTM {share(strip.lstmFirst)}</b>.
        </p>
        <p className="viz-cap">
          Hand-set weights, not trained. The RNN is h = tanh(w × h + 1.5 × input). The LSTM has the forget, input and output gates and the candidate from the lesson, but each gate here reads only the current word, so every number can be checked by hand. The
          signal strip multiplies, step by step, w × (1 − h²) for the RNN and the forget gate for the LSTM's cell, on the sentence with no distractor. A state counts as an answer when it is more than 0.1 from zero (a threshold chosen for this demo).
        </p>
      </div>
    </Root>
  );
}
