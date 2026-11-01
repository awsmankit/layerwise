import { useId, useMemo, useState } from 'react';
import { Root } from './shared';
import {
  alignmentCount,
  argmaxPath,
  collapseSteps,
  editDistance,
  greedyDecode,
  pathProbability,
  prefixBeamSearch,
  temper,
  textProbability,
  topAlignments,
} from '../../lib/ctc';
import { SCENARIOS } from '../../lib/ctc-scenarios';

/*
 * CTC decoding toy. A made-up model has produced a probability for every symbol in every frame (the grid).
 * The learner picks one symbol per frame by tapping cells (a "path"), watches the CTC rule turn it into text
 * (merge repeats, drop blanks), sees how many different paths give the same text, and compares greedy
 * decoding with CTC prefix beam search. All numbers are invented examples; the maths is the real algorithm.
 */

const pct = (p: number) => (p >= 0.1 ? `${Math.round(p * 100)}%` : p >= 0.0001 ? `${(p * 100).toFixed(p >= 0.01 ? 1 : 2)}%` : '<0.01%');
const show = (symbols: string[], text: number[]) => (text.length ? text.map((i) => symbols[i]).join('') : '(nothing)');
const plain = (symbols: string[], text: number[]) => text.map((i) => symbols[i]).join('');

const TEMPS = [1, 1.5, 2, 3];
const CONF_LABEL = ['sure of itself', 'fairly sure', 'unsure', 'very unsure'];

export default function CtcDecoder() {
  const uid = useId();
  const [si, setSi] = useState(0);
  const [temp, setTemp] = useState(0);
  const [width, setWidth] = useState(1);
  const [step, setStep] = useState(3);
  const [altIdx, setAltIdx] = useState(0);
  const sc = SCENARIOS[si];

  const probs = useMemo(() => temper(sc.probs, TEMPS[temp]), [sc, temp]);
  const greedyPath = useMemo(() => argmaxPath(probs), [probs]);
  const [edit, setEdit] = useState<{ key: string; path: number[] } | null>(null);
  const key = `${si}-${temp}`;
  const path = edit && edit.key === key ? edit.path : greedyPath;

  const T = probs.length;
  const K = sc.symbols.length;
  const [pathRow, mergedRow, textRow] = collapseSteps(path);
  const pathP = pathProbability(probs, path);
  const total = useMemo(() => textProbability(probs, textRow), [probs, textRow.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = useMemo(() => alignmentCount(T, textRow, K), [T, K, textRow.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const alts = useMemo(() => topAlignments(probs, textRow, 40), [probs, textRow.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const refSyms = useMemo(() => [...sc.reference].map((c) => sc.symbols.indexOf(c)), [sc]);
  const greedy = useMemo(() => greedyDecode(probs), [probs]);
  const beams = useMemo(() => prefixBeamSearch(probs, width), [probs, width]);
  const best = beams[0];
  const greedyErr = editDistance(greedy, refSyms);
  const bestErr = editDistance(best.text, refSyms);

  const setCell = (t: number, k: number) => setEdit({ key, path: path.map((v, i) => (i === t ? k : v)) });
  const resetPath = () => {
    setEdit(null);
    setAltIdx(0);
  };
  const nextAlt = () => {
    if (alts.length === 0) return;
    const i = (altIdx + 1) % alts.length;
    setAltIdx(i);
    setEdit({ key, path: alts[i].path });
  };
  const choose = (i: number) => {
    setSi(i);
    setTemp(0);
    setEdit(null);
    setAltIdx(0);
    setStep(3);
  };

  const status =
    textRow.length === 0
      ? 'Your path collapses to nothing.'
      : `Your path collapses to "${plain(sc.symbols, textRow)}"${plain(sc.symbols, textRow) === sc.reference ? ', which is what was said.' : `, but the speaker said "${sc.reference}".`}`;

  const chip = (s: number, i: number, cls = '') => (
    <span key={i} className={`aua-chip ${s === 0 ? 'aua-blank' : ''} ${cls}`} aria-hidden="true">
      {sc.symbols[s]}
    </span>
  );

  return (
    <Root>
      <div className="viz aua aua-ctc">
        <p className="viz-title">CTC toy: from frame-by-frame guesses to text</p>

        <div className="aua-chips" role="group" aria-label="Example outputs from an imaginary speech model">
          {SCENARIOS.map((s, i) => (
            <button key={s.id} type="button" className={`btn quiet aua-pick ${i === si ? 'on' : ''}`} aria-pressed={i === si} onClick={() => choose(i)}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="aua-hint">{sc.blurb}</p>

        <p className="aua-label" id={`${uid}-grid`}>
          1. What the model says about each frame (each frame is about 20 ms; invented numbers). Tap a cell to put that symbol on your path.
        </p>
        <div className="aua-scroll" role="group" aria-labelledby={`${uid}-grid`}>
          <div className="aua-grid" style={{ gridTemplateColumns: `2.4rem repeat(${T}, minmax(40px, 1fr))` }}>
            <span className="aua-corner" aria-hidden="true" />
            {Array.from({ length: T }, (_, t) => (
              <span key={t} className="aua-colhead" aria-hidden="true">
                {t + 1}
              </span>
            ))}
            {sc.symbols.map((sym, k) => (
              <div key={k} className="aua-rowgroup">
                <span className="aua-rowhead" aria-hidden="true">
                  {sym === '_' ? 'blank' : sym}
                </span>
                {Array.from({ length: T }, (_, t) => {
                  const p = probs[t][k];
                  const on = path[t] === k;
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`aua-cell ${on ? 'on' : ''}`}
                      style={{ background: `color-mix(in srgb, var(--signal) ${Math.round(p * 55)}%, transparent)` }}
                      aria-pressed={on}
                      aria-label={`Frame ${t + 1}, ${sym === '_' ? 'blank' : sym}, ${pct(p)}`}
                      onClick={() => setCell(t, k)}
                    >
                      {p >= 0.995 ? '100' : p < 0.01 ? '0' : Math.round(p * 100)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="aua-axis-cap">Numbers are percentages. A ringed cell is on your path. Underscore means blank: "nothing new in this frame". On a narrow screen, scroll the grid sideways.</p>

        <div className="aua-buttons">
          <button type="button" className="btn quiet" onClick={resetPath}>
            Best symbol in every frame
          </button>
          <button type="button" className="btn quiet" onClick={nextAlt} disabled={alts.length < 2}>
            Another path, same text
          </button>
        </div>

        <p className="aua-label">2. The CTC rule, step by step</p>
        <div className="aua-steps">
          <div className="aua-line">
            <span className="aua-step">Your path</span>
            <span className="aua-row">{pathRow.map((s, i) => chip(s, i))}</span>
          </div>
          <div className={`aua-line ${step < 2 ? 'aua-dim' : ''}`}>
            <span className="aua-step">Merge repeats</span>
            <span className="aua-row">{step >= 2 ? mergedRow.map((s, i) => chip(s, i)) : <span className="aua-ph">hidden until step 2</span>}</span>
          </div>
          <div className={`aua-line ${step < 3 ? 'aua-dim' : ''}`}>
            <span className="aua-step">Drop blanks</span>
            <span className="aua-row">{step >= 3 ? (textRow.length ? textRow.map((s, i) => chip(s, i, 'aua-out')) : <span className="aua-ph">nothing is left</span>) : <span className="aua-ph">hidden until step 3</span>}</span>
          </div>
        </div>
        <div className="aua-buttons">
          <button type="button" className="btn quiet" onClick={() => setStep(step >= 3 ? 1 : step + 1)}>
            {step >= 3 ? 'Replay the steps' : 'Next step'}
          </button>
        </div>
        <p className="aua-say" aria-live="polite">
          {status} This exact path has probability {pct(pathP)}. {count.toLocaleString('en-GB')} different paths of {T} frames collapse to {textRow.length ? `"${plain(sc.symbols, textRow)}"` : 'nothing'}; added together they give the text a probability of {pct(total)}.
        </p>

        <p className="aua-label">3. Decoding: pick the text, not the path</p>
        <div className="aua-controls">
          <label className="field">
            <span>
              Model confidence <b>{CONF_LABEL[temp]}</b>
            </span>
            <input type="range" min={0} max={TEMPS.length - 1} step={1} value={temp} onChange={(e) => { setTemp(+e.target.value); setEdit(null); setAltIdx(0); }} aria-label="Model confidence" aria-valuetext={CONF_LABEL[temp]} />
          </label>
          <label className="field">
            <span>
              Beam width <b>{width}</b>
            </span>
            <input type="range" min={1} max={6} step={1} value={width} onChange={(e) => setWidth(+e.target.value)} aria-label="Beam width" aria-valuetext={`${width}`} />
          </label>
        </div>
        <div className="aua-table-wrap">
          <table className="aua-table">
            <thead>
              <tr>
                <th scope="col">Method</th>
                <th scope="col">Text</th>
                <th scope="col">Probability</th>
                <th scope="col">Errors</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Greedy</th>
                <td className="aua-text">{show(sc.symbols, greedy)}</td>
                <td className="num">{pct(textProbability(probs, greedy))}</td>
                <td className="num">{greedyErr}</td>
              </tr>
              <tr>
                <th scope="row">Beam, width {width}</th>
                <td className="aua-text">{show(sc.symbols, best.text)}</td>
                <td className="num">{pct(textProbability(probs, best.text))}</td>
                <td className="num">{bestErr}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="aua-say" aria-live="polite">
          Greedy takes the best symbol in each frame and reads out {show(sc.symbols, greedy)}.{' '}
          {plain(sc.symbols, greedy) === plain(sc.symbols, best.text)
            ? `A beam of ${width} agrees.`
            : `A beam of ${width} keeps ${width} candidate texts alive, adds up the paths that give the same text, and prefers ${show(sc.symbols, best.text)}.`}{' '}
          {plain(sc.symbols, best.text) === sc.reference ? 'That matches what was said.' : `The speaker said "${sc.reference}".`}
        </p>
        <p className="aua-axis-cap">
          Probability is that of the whole text, all its paths added together. Errors count the letters that differ from what was said. Candidates the beam is holding: {beams.map((b) => `${show(sc.symbols, b.text)} (${pct(textProbability(probs, b.text))})`).join(', ')}.
        </p>
      </div>
    </Root>
  );
}
