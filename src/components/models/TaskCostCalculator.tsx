import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from '../viz/shared';
import { models } from '../../data/models';
import { barFraction, fitsContext, formatCost, formatPrice, ratesFor, shortName, taskCost, taskPresets, type BarScale } from '../../lib/models';
import { shortDay } from '../../lib/dates';
import { withBase } from '../../lib/url';
import { Marker, vendorClass } from './shared';

const nonNeg = (v: string) => Math.max(0, Math.min(10_000_000, Math.floor(Number(v) || 0)));

/**
 * The cost of one task on every model that states a price. It multiplies tokens by list prices and nothing else:
 * it cannot know how many tokens a model would really use, or how good the answer would be.
 */
export default function TaskCostCalculator({ today }: { today: string }) {
  const [preset, setPreset] = useState('rag');
  const first = taskPresets.find((p) => p.id === 'rag')!;
  const [inTok, setInTok] = useState(first.inTokens);
  const [outTok, setOutTok] = useState(first.outTokens);
  const [cached, setCached] = useState(0);
  const [scale, setScale] = useState<BarScale>('linear');

  const rows = useMemo(() => {
    const priced = models
      .map((m) => ({ m, c: taskCost(m, inTok, outTok, cached, today) }))
      .filter((r): r is { m: (typeof models)[number]; c: NonNullable<ReturnType<typeof taskCost>> } => r.c !== null)
      .sort((a, b) => a.c.total - b.c.total || a.m.id.localeCompare(b.m.id));
    return priced;
  }, [inTok, outTok, cached, today]);
  const unpriced = models.filter((m) => m.inputPerMTok == null);
  const max = Math.max(...rows.filter((r) => fitsContext(r.m, inTok, outTok) !== false).map((r) => r.c.total), 1e-12);
  const lesson = withBase('/learn/llm/choosing-and-comparing-models/');

  const pick = (id: string) => {
    const p = taskPresets.find((x) => x.id === id)!;
    setPreset(id);
    setInTok(p.inTokens);
    setOutTok(p.outTokens);
  };

  return (
    <Root>
      <div className="viz mr-fig mr-calc">
        <h3 className="viz-title">What one task costs at list price</h3>
        <div className="mr-ctl" role="radiogroup" aria-label="Task size">
          {taskPresets.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={preset === p.id} className="mr-chip" onClick={() => pick(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="mr-hint">{taskPresets.find((p) => p.id === preset)?.hint ?? 'Your own numbers.'}</p>

        <div className="mr-fields">
          <label className="mr-field">
            <span>Input tokens</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={inTok}
              onChange={(e) => {
                setPreset('custom');
                setInTok(nonNeg(e.target.value));
              }}
            />
          </label>
          <label className="mr-field">
            <span>Output tokens</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              value={outTok}
              onChange={(e) => {
                setPreset('custom');
                setOutTok(nonNeg(e.target.value));
              }}
            />
          </label>
          <label className="mr-field">
            <span>
              Input read from the cache <b>{Math.round(cached * 100)}%</b>
            </span>
            <input type="range" min={0} max={0.9} step={0.05} value={cached} onChange={(e) => setCached(Number(e.target.value))} />
          </label>
        </div>

        <div className="mr-ctl" role="radiogroup" aria-label="Bar scale">
          {(['linear', 'log'] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={scale === s} className="mr-chip" onClick={() => setScale(s)}>
              {s === 'linear' ? 'Linear bars' : 'Log bars'}
            </button>
          ))}
        </div>

        <ol className="mr-bars" aria-label="Cost of one task, cheapest first">
          {rows.map(({ m, c }) => {
            const fits = fitsContext(m, inTok, outTok) !== false;
            const frac = fits ? barFraction(c.total, max, scale) : 0;
            const r = ratesFor(m, inTok, today)!;
            const later = m.priceChange && today < m.priceChange.from ? taskCost(m, inTok, outTok, cached, m.priceChange.from) : null;
            return (
              <li key={m.id} className={fits ? '' : 'is-off'}>
                <span className="mr-bar-name">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <Marker vendor={m.vendor} x={8} y={8} r={4.5} />
                  </svg>
                  <span>
                    {shortName(m)}
                    <small>{m.vendor}</small>
                  </span>
                </span>
                <span className="mr-bar-track" aria-hidden="true">
                  <motion.span className={vendorClass(m.vendor)} initial={false} animate={{ scaleX: frac }} transition={{ duration: 0.45, ease: EASE }} />
                </span>
                <span className="mr-bar-val num">
                  {fits ? formatCost(c.total) : 'does not fit'}
                  <small>
                    {fits ? `${formatCost(c.total * 1000)} per 1,000 tasks` : 'prompt and reply exceed the context window'}
                  </small>
                  {c.longContext && <small>long-prompt rate: {formatPrice(r.input)} in, {formatPrice(r.output)} out</small>}
                  {inTok > 0 && cached > 0 && !c.cachedApplied && <small>no cache price stated</small>}
                  {later && <small>price changes {shortDay(m.priceChange!.from)}: {formatCost(later.total)}</small>}
                </span>
              </li>
            );
          })}
        </ol>
        {unpriced.length > 0 && <p className="viz-cap">No list price stated by the vendor, so not shown: {unpriced.map((m) => m.name).join(', ')}.</p>}

        <div className="mr-warn" role="note">
          <p>
            <b>Price per token is not the cost of a task.</b> Two models given the same job do not use the same number of tokens: they tokenise text differently (Anthropic’s pricing page says its newer tokenizer produces about 30% more tokens for the same text than the one before it), they may write longer or shorter answers, and some think for many tokens before answering. Quality differs too, and a model that needs a retry costs twice. This calculator multiplies the tokens you enter by list prices and nothing more; it says nothing about which model does a task better.
          </p>
          <p>
            To compare models for real, run the same task on each and count the tokens and the failures:{' '}
            <a href={lesson}>Choosing and comparing models</a> shows how.
          </p>
        </div>
        <p className="viz-cap">Standard list prices in force on {shortDay(today)}, before batch discounts, and for a whole request in the long-prompt tier when the prompt is above the vendor’s threshold. Cached tokens use the vendor’s cache-read price where one is stated; cache-write fees and storage are left out. Context window checks add the prompt and the reply.</p>
      </div>
    </Root>
  );
}
