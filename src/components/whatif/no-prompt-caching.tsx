import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { breakEvenHitRate, example, hitPattern, hits, inputCost, tokensFresh, tokensFromCache, tokensSent } from '../../lib/whatif/no-prompt-caching';

const COLS = 20;
const CELL = 15;
const GAP = 3;
const X = 6;
const W = 368;

const mtok = (n: number) => `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`;

/**
 * 100 squares, each standing for 10 calls. Without a cache every square pays for the whole prefix (red).
 * With one, a hit square reads it at a discount (green) and a miss square pays to write it (amber).
 */
export default function NoPromptCachingWhatIf() {
  const [cache, setCache] = useState(true);
  const [hitPct, setHitPct] = useState(90);
  const [prefix, setPrefix] = useState(20000);
  const rate = hitPct / 100;
  const pattern = useMemo(() => hitPattern(rate), [rate]);

  const costNow = inputCost(prefix, rate, cache);
  const costWith = inputCost(prefix, rate, true);
  const costWithout = inputCost(prefix, rate, false);
  const freshNow = tokensFresh(prefix, rate, cache);
  const freshOther = tokensFresh(prefix, rate, !cache);
  const maxCost = Math.max(costWith, costWithout);
  const maxFresh = tokensSent(prefix);
  const be = breakEvenHitRate();
  const lossy = cache && rate < be;
  const rowsTop = 28;
  const gridH = 5 * (CELL - 1 + GAP);
  const barsTop = rowsTop + gridH + 62;
  const H = barsTop + 2 * 46 + 4;

  const bars = [
    { label: 'Input cost over 1,000 calls (example)', value: costNow, other: cache ? costWithout : costWith, max: maxCost, text: fmt.usd(costNow) },
    { label: 'Tokens read from scratch', value: freshNow, other: freshOther, max: maxFresh, text: mtok(freshNow) },
  ];

  return (
    <WhatIfFrame
      title="The same long prefix, 1,000 calls in a row"
      withLabel="With caching"
      withoutLabel="No caching"
      on={cache}
      onChange={setCache}
      verdict={
        cache ? (
          <>
            At {hitPct}% hits the input bill is {fmt.usd(costWith)} instead of {fmt.usd(costWithout)} ({mtok(tokensFromCache(prefix, rate, true))} tokens read from the cache at a discount, example prices).
            {lossy && <> Below about {Math.round(be * 100)}% hits caching costs more than not caching, because misses pay to write the cache.</>}
          </>
        ) : (
          <>
            With no cache, 1,000 calls resend the {fmt.int(prefix)}-token prefix and cost {fmt.usd(costWithout)} in input, all read from scratch ({mtok(tokensSent(prefix))} tokens, example price).
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Calls that hit the cache <b>{cache ? `${hitPct}%` : 'none'}</b>
            </span>
            <input type="range" min={0} max={100} step={1} value={hitPct} disabled={!cache} onChange={(e) => setHitPct(+e.target.value)} aria-label="Share of calls that hit the cache" />
          </label>
          <label className="field">
            <span>
              Shared prefix <b>{fmt.int(prefix)} tokens</b>
            </span>
            <input type="range" min={2000} max={50000} step={1000} value={prefix} onChange={(e) => setPrefix(+e.target.value)} aria-label="Length of the shared prefix in tokens" />
          </label>
        </>
      }
    >
      <p className="ws-idea">
        The model forgets everything between calls, so the same instructions are sent again every time. A cache lets the provider skip re-reading them.
      </p>
      <svg viewBox={`0 0 380 ${H}`} className="dx-svg wi-svg ws-svg" role="img" aria-label={`100 squares, each ten calls. ${cache ? `${hits(100, rate)} of 100 read the prefix from the cache.` : 'Every one reads the whole prefix again.'}`}>
        <text x={X} y={16} className="ws-svg-h">
          Each square is 10 calls
        </text>
        {pattern.map((hit, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const cls = !cache ? 'ws-bad' : hit ? 'ws-good' : 'ws-warn';
          return (
            <motion.rect
              key={i}
              x={X + col * (CELL + GAP)}
              y={rowsTop + row * (CELL - 1 + GAP)}
              width={CELL}
              height={CELL - 1}
              rx={3}
              className={cls}
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE, delay: (i % COLS) * 0.01 }}
            />
          );
        })}
        <text x={X} y={rowsTop + gridH + 16} className="ws-svg-t">
          {cache ? `green = read from cache (${hits(100, rate) * 10} calls)` : 'red = whole prefix read and billed'}
        </text>
        <text x={X} y={rowsTop + gridH + 33} className="ws-svg-t">
          {cache ? `amber = paid to write the cache (${(100 - hits(100, rate)) * 10} calls)` : 'again on every call'}
        </text>
        {bars.map((b, k) => {
          const y = barsTop + k * 46;
          const frac = Math.max(3 / W, Math.min(1, b.value / b.max));
          const ox = X + Math.min(1, b.other / b.max) * W;
          return (
            <g key={b.label}>
              <text x={X} y={y} className="ws-svg-t">
                {b.label}
              </text>
              <text x={X + W} y={y} textAnchor="end" className="ws-svg-b">
                {b.text}
              </text>
              <rect x={X} y={y + 7} width={W} height={16} rx={5} className="ws-track" />
              <motion.rect x={X} y={y + 7} width={W} height={16} rx={3} className={cache ? 'ws-good' : 'ws-bad'} initial={false} animate={{ scaleX: frac }} style={{ originX: 0, transformBox: 'fill-box' }} transition={{ duration: 0.5, ease: EASE }} />
              <line x1={ox} x2={ox} y1={y + 3} y2={y + 27} stroke="var(--ink)" strokeWidth={2} strokeDasharray="2 2" />
            </g>
          );
        })}
      </svg>
      <p className="ws-note">
        Example prices, not a quote: ${example.pricePerMTok} per million input tokens, a cache read at {example.readMultiplier} times that price, a cache write at {example.writeMultiplier} times, {example.uniqueTokens} new tokens in each call. Dashed tick = the other way. Break-even hit rate: {(be * 100).toFixed(1)}%.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <p className="ws-note" style={{ marginTop: 0 }}>
          Cost per call = (new tokens + prefix x [hit rate x read + (1 - hit rate) x write]) x price. Break-even: h x {example.readMultiplier} + (1 - h) x {example.writeMultiplier} = 1, so h = ({example.writeMultiplier} - 1) / ({example.writeMultiplier} - {example.readMultiplier}). Without caching the cost is (new + prefix) x price.
        </p>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Hit rate</th>
                <th>Cost</th>
                <th>vs none</th>
              </tr>
            </thead>
            <tbody>
              {[0, 0.25, 0.5, 0.75, 0.9, 1].map((h) => (
                <tr key={h} className={cache && Math.abs(h - rate) < 0.005 ? 'is-now' : ''}>
                  <td>{Math.round(h * 100)}%</td>
                  <td>{fmt.usd(inputCost(prefix, h, true))}</td>
                  <td>{Math.round((inputCost(prefix, h, true) / costWithout) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </WhatIfFrame>
  );
}
