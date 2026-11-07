import { useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { GOLD_RANKS, PRICE_PER_MILLION, TOKENS_PER_PASSAGE, TOTAL, bestK, cost, costPerCorrect, curve, facts, isGold, recall, success, tokens } from '../../lib/whatif/too-many-passages';

const GREEN = '#1f9d6b';
const RED = '#d6453d';
const BEST = bestK();
const DATA = curve();

// chart geometry (viewBox 360 x 190)
const X0 = 38;
const X1 = 346;
const Y0 = 20; // top (100%)
const Y1 = 150; // bottom (0%)
const sx = (k: number) => Math.round((X0 + ((X1 - X0) * (k - 1)) / (TOTAL - 1)) * 10) / 10;
const sy = (p: number) => Math.round((Y1 - (Y1 - Y0) * p) * 10) / 10;
const pct = (p: number) => Math.round(p * 100);
const successPath = DATA.map((d, i) => `${i ? 'L' : 'M'}${sx(d.k)} ${sy(d.success)}`).join(' ');
// recall is a staircase: it jumps at the rank of each fact
const recallPath = DATA.map((d, i) => (i ? `L${sx(d.k)} ${sy(DATA[i - 1].recall)} L${sx(d.k)} ${sy(d.recall)}` : `M${sx(d.k)} ${sy(d.recall)}`)).join(' ');

/**
 * 30 passages come back best first. Three are the facts the answer needs, the rest are distractors. A slider sets how many go
 * to the model. The chart shows recall (are the facts in there?) and the toy chance of a right answer, which peaks and then falls.
 */
export default function TooManyPassagesWhatIf() {
  const [k, setK] = useState(TOTAL);
  const on = k <= BEST + 3;
  const f = facts(k);
  const s = success(k);
  const sBest = success(BEST);
  const per = costPerCorrect(k);
  const perBest = costPerCorrect(BEST);

  const verdict =
    k < BEST ? (
      <>
        With only {k} {k === 1 ? 'passage' : 'passages'} the model is missing {f.filter((x) => !x.inContext).length} of the 3 facts, so it has to guess: about {pct(s)}% chance of a right answer. The best choice here is {BEST} passages ({pct(sBest)}%).
      </>
    ) : k <= BEST + 3 ? (
      <>
        With {k} passages all 3 facts are in the prompt and little else is: about {pct(s)}% chance of a right answer for {fmt.usd(cost(k))} per question (example price).
      </>
    ) : (
      <>
        With {k} passages all 3 facts are in there, but buried under {k - 3} distractors: the chance of a right answer drops to about {pct(s)}%, and each right answer costs {(per / perBest).toFixed(1)} times what it costs at {BEST} passages.
      </>
    );

  return (
    <WhatIfFrame
      title="One question, 30 passages found, how many do we send?"
      withLabel={`A sensible number (${BEST})`}
      withoutLabel={`Far too many (${TOTAL})`}
      on={on}
      onChange={(v) => setK(v ? BEST : TOTAL)}
      verdict={verdict}
      controls={
        <label className="field">
          <span>
            Passages sent to the model: <b>{k}</b>
          </span>
          <input type="range" min={1} max={TOTAL} value={k} onChange={(e) => setK(+e.target.value)} aria-label="How many passages are sent to the model" />
        </label>
      }
    >
      <p className="wr-lead">
        The answer needs three facts. Searching returns 30 passages, best first, and the three facts are among them (green). Sending more passages makes sure no fact is missed, but every extra passage is also a distraction and costs money.
      </p>

      <svg
        viewBox="0 0 360 190"
        className="dx-svg wi-svg wr-chart"
        role="img"
        aria-label={`Chart over the number of passages sent. Recall of the facts rises to 100% at ${GOLD_RANKS[2]} passages. The chance of a right answer is ${pct(sBest)}% at best, at ${BEST} passages, then falls to ${pct(success(TOTAL))}% at ${TOTAL}. You are looking at ${k} passages: ${pct(s)}%.`}
      >
        {[0, 0.5, 1].map((p) => (
          <g key={p}>
            <line x1={X0} x2={X1} y1={sy(p)} y2={sy(p)} stroke="currentColor" opacity={0.15} />
            <text x={X0 - 6} y={sy(p) + 4} textAnchor="end" className="wr-st2">{pct(p)}%</text>
          </g>
        ))}
        <path d={recallPath} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="5 4" opacity={0.6} />
        <path d={successPath} fill="none" stroke={GREEN} strokeWidth={3.5} strokeLinejoin="round" />
        <circle cx={sx(BEST)} cy={sy(sBest)} r={5} fill="none" stroke={GREEN} strokeWidth={2} />
        <text x={sx(BEST) + 8} y={sy(sBest) - 8} className="wr-stb" style={{ fill: GREEN }}>best: {BEST}</text>
        <motion.g initial={false} animate={{ x: sx(k) }} transition={{ duration: 0.6, ease: EASE }}>
          <line x1={0} x2={0} y1={Y0 - 6} y2={Y1} stroke={on ? GREEN : RED} strokeWidth={2} />
          <circle cx={0} cy={sy(s)} r={6} fill={on ? GREEN : RED} stroke="var(--surface)" strokeWidth={2} />
        </motion.g>
        {[1, 10, 20, 30].map((t) => (
          <text key={t} x={sx(t)} y={Y1 + 16} textAnchor="middle" className="wr-st2">{t}</text>
        ))}
        <text x={(X0 + X1) / 2} y={Y1 + 34} textAnchor="middle" className="wr-st2">passages sent to the model (k)</text>
        <line x1={X0} x2={X0 + 20} y1={9} y2={9} stroke="currentColor" strokeWidth={2} strokeDasharray="5 4" opacity={0.6} />
        <text x={X0 + 26} y={13} className="wr-st2">facts found (recall)</text>
        <line x1={X0 + 156} x2={X0 + 176} y1={9} y2={9} stroke={GREEN} strokeWidth={3.5} />
        <text x={X0 + 182} y={13} className="wr-st2">answer right</text>
      </svg>

      <p className="wr-card-h">The 30 passages, best first. The model reads the solid ones.</p>
      <ol className="wr-tp-grid" aria-label={`Passages 1 to ${TOTAL}; the first ${k} are sent to the model`}>
        {Array.from({ length: TOTAL }, (_, i) => {
          const rank = i + 1;
          const sent = rank <= k;
          const gold = isGold(rank);
          const fi = GOLD_RANKS.indexOf(rank as (typeof GOLD_RANKS)[number]);
          return (
            <li key={rank} className={'wr-tp-cell' + (sent ? ' is-sent' : ' is-out') + (gold ? ' is-gold' : '')} title={gold ? `Passage ${rank}: fact ${fi + 1}` : `Passage ${rank}: distractor`}>
              {gold ? <b>F{fi + 1}</b> : rank}
            </li>
          );
        })}
      </ol>
      <p className="wr-meta wr-mf-key">F1, F2, F3 are the facts. Other numbers are distractors (right topic, wrong detail). Faded dashed cells are not sent.</p>

      <ul className="wr-score" aria-label="Numbers for this choice">
        <li className="wr-score-i"><span className="wr-meta">facts found</span><b className="wr-big">{f.filter((x) => x.inContext).length} of 3</b></li>
        <li className={'wr-score-i ' + (on ? 'is-good' : 'is-bad')}><span className="wr-meta">right answer</span><b className="wr-big">{pct(s)}%</b></li>
        <li className="wr-score-i"><span className="wr-meta">tokens sent</span><b className="wr-big">{fmt.int(tokens(k))}</b></li>
        <li className="wr-score-i"><span className="wr-meta">per question</span><b className="wr-big">{fmt.usd(cost(k))}</b></li>
      </ul>
      <p className="wr-note"><b>Cost of one right answer: {fmt.usd(per)}</b> at {k} passages{k === BEST ? ' (the lowest of any choice)' : <>, against {fmt.usd(perBest)} at the best choice ({BEST})</>}. Example price: ${PRICE_PER_MILLION} per million tokens.</p>

      <details className="wr-details">
        <summary>How each fact is read</summary>
        <div className="wr-scroll">
          <table className="wr-table">
            <caption>Toy reading chance for the {k} passages sent. A missing fact is guessed at 20%.</caption>
            <thead>
              <tr><th scope="col">Fact</th><th scope="col">Passage</th><th scope="col">In prompt</th><th scope="col">Read right</th></tr>
            </thead>
            <tbody>
              {f.map((x, i) => (
                <tr key={x.rank}>
                  <th scope="row">F{i + 1}</th>
                  <td>{x.rank}</td>
                  <td>{x.inContext ? 'yes' : 'no'}</td>
                  <td>{pct(x.reliability)}%</td>
                </tr>
              ))}
              <tr><th scope="row">All three</th><td></td><td>recall {pct(recall(k))}%</td><td>{pct(s)}%</td></tr>
            </tbody>
          </table>
        </div>
      </details>
      <p className="wr-note">
        Toy model, not a measurement. A fact is read with reliability 0.6 + 0.4 x (2x - 1)^2, where x is its relative position in the prompt, so the middle is worse than the ends (the shape the Lost in the Middle abstract describes). Each extra passage also multiplies reliability by 0.988 per passage. Each passage is {TOKENS_PER_PASSAGE} tokens. The answer needs all three facts.
      </p>
    </WhatIfFrame>
  );
}
