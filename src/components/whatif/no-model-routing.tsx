import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { avoidableSpend, badAnswers, bigCost, cells, costPerGoodAnswer, dayCost, easyShares, example, priceRatio, savingShare, smallCost, split, type Cat } from '../../lib/whatif/no-model-routing';

const COLS = 20;
const CELL = 16.4;
const STEP = 18.4;
const X0 = 6;
const BAR_W = 368;

const legend: { cat: Cat; text: string; glyph: string }[] = [
  { cat: 'small', text: 'Small, fine', glyph: '' },
  { cat: 'big', text: 'Big, needed', glyph: '' },
  { cat: 'waste', text: 'Big, not needed', glyph: '$' },
  { cat: 'bad', text: 'Small, bad answer', glyph: '!' },
];
const glyphOf = (c: Cat) => legend.find((l) => l.cat === c)!.glyph;

/**
 * 100 cells stand for 100 requests. Each is coloured by where it went and whether that was a good choice.
 * Below, two bars: the day's bill, and the answers that are worse than the big model's would have been.
 */
export default function NoModelRoutingWhatIf() {
  const [router, setRouter] = useState(true);
  const [easy, setEasy] = useState(70);
  const [mistake, setMistake] = useState(10);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const e = easy / 100;
  const m = mistake / 100;
  const grid = cells(e, m, router);
  const s = split(e, m, router);
  const cost = dayCost(e, m, router);
  const allBig = dayCost(e, 0, false);
  const bad = badAnswers(e, m, router);
  const saving = savingShare(e, m);

  const rowTop = 24 + 5 * STEP + 8;
  const legTop = rowTop + 8;
  const barTop = legTop + 2 * 22 + 16;
  const H = barTop + 2 * 60 + 14;
  const bars = [
    { label: 'Cost per day (example prices)', value: cost, max: Math.max(allBig, cost), ghost: allBig, text: fmt.usd(cost), good: router && saving >= 0 },
    { label: 'Answers worse than the big model, per day', value: bad, max: 0.25 * example.requestsPerDay, ghost: 0, text: fmt.int(bad), good: bad < 1 },
  ];

  return (
    <WhatIfFrame
      title="A day of requests, easy and hard"
      withLabel="With a router"
      withoutLabel="Everything to the big model"
      on={router}
      onChange={setRouter}
      verdict={
        router ? (
          <>
            With a router that guesses wrong {mistake}% of the time, {fmt.int(example.requestsPerDay)} requests cost {fmt.usd(cost)} a day instead of {fmt.usd(allBig)} ({saving >= 0 ? `${Math.round(saving * 100)}% less` : `${Math.round(-saving * 100)}% more`}), and about {fmt.int(bad)} answers a day are worse than the big model's would be (example prices and rates).
          </>
        ) : (
          <>
            Every request goes to the big model: {fmt.usd(allBig)} a day (example prices). {easy}% of the requests are easy, and {fmt.usd(avoidableSpend(e))} of the bill is for answers a small model could have given.
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Easy requests <b>{easy}%</b>
            </span>
            <input type="range" min={0} max={100} step={10} value={easy} onChange={(ev) => setEasy(+ev.target.value)} aria-label="Share of requests that are easy" aria-valuetext={`${easy} percent easy`} />
          </label>
          <label className="field" style={router ? undefined : { opacity: 0.45 }}>
            <span>
              Router guesses wrong <b>{mistake}%</b>
            </span>
            <input type="range" min={0} max={40} step={5} value={mistake} disabled={!router} onChange={(ev) => setMistake(+ev.target.value)} aria-label="How often the router sends a request to the wrong model" aria-valuetext={`${mistake} percent wrong`} />
          </label>
        </>
      }
    >
      <p className="ws-idea">
        Some requests are easy and some are hard. A router is a cheap first step that decides which model should answer. Without one, you pay the big price for everything.
      </p>
      <svg
        viewBox={`0 0 380 ${H}`}
        className="dx-svg wi-svg ws-svg"
        role="img"
        aria-label={`One hundred requests. ${router ? `A router sends ${Math.round((s.easyToSmall + s.hardToSmall) * 100)} to the small model and the rest to the big model. ${Math.round(s.hardToSmall * 100)} of them are hard requests that get a worse answer.` : 'All of them go to the big model.'} Cost per day ${fmt.usd(cost)}.`}
      >
        <text x={X0} y={16} className="ws-svg-h">
          100 requests, one square each
        </text>
        {grid.map((cat, i) => {
          const x = X0 + (i % COLS) * STEP;
          const y = 24 + Math.floor(i / COLS) * STEP;
          const g = glyphOf(cat);
          return (
            <motion.g key={`${i}-${cat}`} initial={ready ? { opacity: 0.1, scale: 0.5 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: EASE, delay: ready ? Math.min(i * 0.006, 0.45) : 0 }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <rect x={x} y={y} width={CELL} height={CELL} rx={3.5} className={`ws-c-${cat}`} />
              {g && (
                <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" className="ws-cell-t">
                  {g}
                </text>
              )}
            </motion.g>
          );
        })}
        {legend.map((l, k) => {
          const x = X0 + (k % 2) * 160;
          const y = legTop + Math.floor(k / 2) * 22;
          return (
            <g key={l.cat}>
              <rect x={x} y={y} width={16} height={16} rx={3.5} className={`ws-c-${l.cat}`} />
              {l.glyph && (
                <text x={x + 8} y={y + 12} textAnchor="middle" className="ws-cell-t">
                  {l.glyph}
                </text>
              )}
              <text x={x + 22} y={y + 13} className="ws-legend-t">
                {l.text}
              </text>
            </g>
          );
        })}
        {bars.map((b, k) => {
          const y = barTop + k * 60;
          const w = Math.max(0, Math.min(1, b.value / b.max));
          const gx = X0 + Math.min(1, b.ghost / b.max) * BAR_W;
          return (
            <g key={b.label}>
              <text x={X0} y={y} className="ws-svg-t">
                {b.label}
              </text>
              <rect x={X0} y={y + 8} width={BAR_W} height={16} rx={5} className="ws-track" />
              <motion.rect x={X0} y={y + 8} width={BAR_W} height={16} rx={3} className={b.good ? 'ws-good' : 'ws-bad'} initial={false} animate={{ scaleX: Math.max(w, 0.004) }} style={{ originX: 0, transformBox: 'fill-box' }} transition={{ duration: 0.5, ease: EASE }} />
              {b.ghost > 0 && <line x1={gx} x2={gx} y1={y + 4} y2={y + 28} stroke="var(--ink)" strokeWidth={2} strokeDasharray="2 2" />}
              <text x={X0 + BAR_W} y={y + 42} textAnchor="end" className="ws-svg-b">
                {b.text}
              </text>
            </g>
          );
        })}
        <text x={X0} y={H - 4} className="ws-svg-t">
          dashed tick = the bill with no router
        </text>
      </svg>
      <p className="ws-note">
        Example setup, not real prices: {fmt.int(example.requestsPerDay)} requests a day, each with {fmt.int(example.inTokens)} tokens in and {example.outTokens} out. Big model ${example.bigIn} in and ${example.bigOut} out per million tokens, small model ${example.smallIn} and ${example.smallOut} (the big one costs {Math.round(priceRatio())} times as much). In this toy, a small model fails on {Math.round(example.smallFailsHard * 100)}% of hard requests it is handed, and the router reads {example.routerTokens} tokens per request at the small model's price.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <p className="ws-note" style={{ marginTop: 0 }}>
          One request costs {fmt.usd(bigCost())} on the big model and {fmt.usd(smallCost())} on the small one. With easy share E and router mistake rate M: easy to small is E(1-M), hard to big is (1-E)(1-M), easy to big is E x M, hard to small is (1-E) x M. Bad answers = hard to small x {example.smallFailsHard} x {fmt.int(example.requestsPerDay)}. Cost per answer as good as the big model's now: {fmt.usd(costPerGoodAnswer(e, m, router))}.
        </p>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Easy</th>
                <th>Cost/day</th>
                <th>Saved</th>
                <th>Bad/day</th>
              </tr>
            </thead>
            <tbody>
              {easyShares.map((p) => (
                <tr key={p} className={p === easy ? 'is-now' : ''}>
                  <td>{p}%</td>
                  <td>{fmt.usd(dayCost(p / 100, m, true))}</td>
                  <td>{Math.round(savingShare(p / 100, m) * 100)}%</td>
                  <td>{fmt.int(badAnswers(p / 100, m, true))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ws-note">Table: with a router that guesses wrong {mistake}% of the time.</p>
      </details>
    </WhatIfFrame>
  );
}
