import { useState } from 'react';
import { Root, fmt } from './shared';
import { cheapest, compare, breakEvenMistakeCost } from '../../lib/ticket-routing';

const VOLUMES = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
const MISTAKES = [0.02, 0.05, 0.1, 0.2, 0.5, 0.8, 1, 2, 5];

const money = (n: number) => (n >= 100 ? fmt.usd(n) : '$' + n.toFixed(2));

/** The same routing job done three ways, priced from invented example numbers. */
export default function TicketCompare() {
  const [vi, setVi] = useState(6);
  const [mi, setMi] = useState(5);
  const tickets = VOLUMES[vi];
  const mistake = MISTAKES[mi];
  const rows = compare(tickets, mistake);
  const best = cheapest(rows);
  const top = Math.max(...rows.map((r) => r.totalMonth));
  const be = breakEvenMistakeCost(tickets, 'classifier', 'llm');

  return (
    <Root>
      <div className="viz pr-cmp">
        <p className="viz-title">Routing support tickets three ways (example numbers)</p>
        <div className="viz-controls">
          <label className="field">
            <span>Tickets a month <b>{fmt.int(tickets)}</b></span>
            <input type="range" min={0} max={VOLUMES.length - 1} step={1} value={vi} onChange={(e) => setVi(+e.target.value)} aria-valuetext={`${fmt.int(tickets)} tickets a month`} />
          </label>
          <label className="field">
            <span>Cost of one misrouted ticket <b>{money(mistake)}</b></span>
            <input type="range" min={0} max={MISTAKES.length - 1} step={1} value={mi} onChange={(e) => setMi(+e.target.value)} aria-valuetext={`${money(mistake)} per misrouted ticket`} />
          </label>
        </div>
        <div className="pr-cards" role="status" aria-live="polite">
          {rows.map((r) => (
            <div key={r.id} className={'pr-card' + (r.id === best.id ? ' pr-win' : '')}>
              <p className="pr-card-head">
                <span className="pr-card-name">{r.label}</span>
                {r.id === best.id && <span className="pr-tag">cheapest</span>}
              </p>
              <p className="pr-total">{fmt.usd(r.totalMonth)}<small> a month in total</small></p>
              <div className="pr-stack" aria-hidden="true" style={{ width: `${Math.max(6, (r.totalMonth / top) * 100)}%` }}>
                <i className="pr-s-run" style={{ flexGrow: r.runMonth }} />
                <i className="pr-s-err" style={{ flexGrow: r.mistakesMonth }} />
                <i className="pr-s-up" style={{ flexGrow: r.upkeepMonth }} />
              </div>
              <dl className="pr-facts">
                <div><dt>Correct</dt><dd>{Math.round(r.accuracy * 100)}%</dd></div>
                <div><dt>Time per ticket</dt><dd>{fmt.ms(r.latencyMs)}</dd></div>
                <div><dt>Running, per 1,000</dt><dd>{money(r.runPer1000)}</dd></div>
                <div><dt>Mistakes, per 1,000</dt><dd>{money(r.mistakesPer1000)}</dd></div>
                <div><dt>Upkeep, a month</dt><dd>{fmt.usd(r.upkeepMonth)}</dd></div>
              </dl>
            </div>
          ))}
        </div>
        <p className="pr-legend" aria-hidden="true">
          <span><i className="pr-s-run" /> running cost</span>
          <span><i className="pr-s-err" /> cost of mistakes</span>
          <span><i className="pr-s-up" /> upkeep</span>
        </p>
        <p className="pr-note">
          At these settings the {best.id === 'llm' ? best.label : best.label.toLowerCase()} is cheapest overall.
          {be !== null && ` The LLM beats the small classifier once a misrouted ticket costs more than about ${money(be)} at this volume.`}
        </p>
        <p className="viz-cap">Every number is an invented example: accuracy, time, upkeep, and token prices of $3 and $15 per million input and output tokens (400 tokens in and 10 out per ticket). Replace them with measurements from your own tickets before you decide anything.</p>
      </div>
    </Root>
  );
}
