import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { LINES, PATTERNS, READERS, RETENTION_DAYS, itemRanges, scenarios, segments, tally, type Kind } from '../../lib/whatif/no-pii-filter';

const kindName: Record<Kind, string> = { name: 'names', email: 'emails', phone: 'phone numbers', id: 'customer IDs', address: 'addresses' };
const kindOrder: Kind[] = ['name', 'email', 'phone', 'id', 'address'];
const fmtDays = (d: number) => (d >= 365 ? `${Math.round((d / 365) * 10) / 10} year${d === 365 ? '' : 's'}` : `${d} days`);
const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Twelve MADE-UP chat log lines (fake names, example.com emails, 555-01xx numbers, invented IDs). A deliberately simple three-pattern filter
 * is run on them. What it catches, misses and hides by mistake is counted from the real matches. A toy score shows how retention and readers add up.
 */
export default function NoPiiFilterWhatIf() {
  const [filtered, setFiltered] = useState(true);
  const [dayIdx, setDayIdx] = useState(3);
  const [readers, setReaders] = useState<string[]>(['Support team', 'Engineers on call', 'Model training job']);

  const t = useMemo(() => tally(), []);
  const days = RETENTION_DAYS[dayIdx];
  const n = readers.length;
  const sc = useMemo(() => scenarios(days, Math.max(1, n), t), [days, n, t]);
  const max = Math.max(...sc.map((s) => s.score), 1);
  const itemsLeft = filtered ? t.missed : t.items;
  const toggle = (r: string) => setReaders((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const verdict = filtered ? (
    <>
      The simple filter catches {t.caught} of {t.items} personal items ({pct(t.caught / t.items)}), misses {t.missed} and hides {t.falseAlarms} harmless part number. {t.dirtyLines} of {t.lines} lines still hold personal data, kept {fmtDays(days)} for {n} reader group{n === 1 ? '' : 's'}.
    </>
  ) : (
    <>
      All {t.items} personal items sit in the log as typed, for {fmtDays(days)}, readable by {n} group{n === 1 ? '' : 's'}. Every line shown in red holds personal data.
    </>
  );

  return (
    <WhatIfFrame
      title="12 made-up chat log lines, all data fake"
      withLabel="Filter before logging"
      withoutLabel="Log as typed"
      on={filtered}
      onChange={setFiltered}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Logs are kept for <b>{fmtDays(days)}</b>
            </span>
            <input type="range" min={0} max={RETENTION_DAYS.length - 1} step={1} value={dayIdx} onChange={(e) => setDayIdx(+e.target.value)} aria-label="How long the logs are kept" aria-valuetext={fmtDays(days)} />
          </label>
          <fieldset className="wx-fieldset">
            <legend>Who can read the logs (tap to switch on or off)</legend>
            <ul className="wx-chips">
              {READERS.map((r) => (
                <li key={r}>
                  <button type="button" className={`wx-chip${readers.includes(r) ? ' is-on' : ''}`} aria-pressed={readers.includes(r)} onClick={() => toggle(r)}>
                    {readers.includes(r) ? '✓ ' : ''}{r}
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
        </>
      }
    >
      <ol className="wx-log" aria-label="Twelve made-up chat log lines as they would be stored">
        {LINES.map((line, i) => {
          const segs = segments(line, filtered);
          const left = filtered ? itemRanges(line).some((r) => !r.caught) : line.items.length > 0;
          return (
            <li key={i} className={`wx-line ${left ? 'is-dirty' : 'is-clean'}`}>
              <span>
                {segs.map((s, j) => {
                  if (s.type === 'plain') return <span key={j}>{s.text}</span>;
                  if (s.type === 'caught') return <span key={j} className="wx-seg is-caught" aria-label={`removed ${s.tag}`}>{s.tag}</span>;
                  if (s.type === 'false') return <span key={j} className="wx-seg is-false">{s.tag}<small>(wrongly hidden)</small></span>;
                  return (
                    <span key={j} className={`wx-seg is-${s.type}`}>
                      {s.text}
                      <small>{s.type === 'missed' ? `missed ${s.kind}` : s.kind}</small>
                    </span>
                  );
                })}
                <span className="sr-only">{left ? ' Still holds personal data.' : ' No personal data left.'}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <ul className="wx-legend" aria-label="Key">
        <li><span className="wx-sw" style={{ background: '#d6453d', opacity: 0.55 }} /> personal data still in the log (wavy underline)</li>
        <li><span className="wx-sw" style={{ background: '#1f9d6b', opacity: 0.55 }} /> caught and replaced by a tag</li>
        <li><span className="wx-sw" style={{ background: '#e0a21e', opacity: 0.6 }} /> harmless text hidden by mistake</li>
      </ul>

      <div className="wx-bars">
        <h4>
          What the filter caught <small>by kind of item</small>
        </h4>
        {kindOrder.map((k) => (
          <div className="wx-bar" key={k}>
            <span>{kindName[k]}</span>
            <div className="wx-track">
              <motion.div className={`wx-fill${t.byKind[k].caught < t.byKind[k].total ? ' is-bad' : ''}`} initial={false} animate={{ width: filtered ? `${(t.byKind[k].caught / t.byKind[k].total) * 100}%` : '0%' }} transition={{ duration: 0.45, ease: EASE }} />
            </div>
            <b>{filtered ? `${t.byKind[k].caught} of ${t.byKind[k].total}` : `0 of ${t.byKind[k].total}`}</b>
          </div>
        ))}
        <p className="wx-note" style={{ marginTop: '0.3rem' }}>
          The filter has three patterns: {PATTERNS.map((p) => p.label).join(', ')}. It has no list of names and does not read addresses or numbers spelled out in words.
        </p>
      </div>

      <div className="wx-bars">
        <h4>
          Toy exposure score <small>items left x days kept x reader groups</small>
        </h4>
        {sc.map((s, i) => (
          <div className="wx-bar" key={s.label}>
            <span>{s.label}</span>
            <div className="wx-track">
              <motion.div className={`wx-fill${i === 0 ? ' is-bad' : i === 1 ? ' is-mid' : ''}`} initial={false} animate={{ width: `${Math.max(2, (s.score / max) * 100)}%` }} transition={{ duration: 0.45, ease: EASE }} />
            </div>
            <b>
              {s.score.toLocaleString('en-US')}
              <small>{s.items} x {s.days}d x {s.readers}</small>
            </b>
          </div>
        ))}
        <p className="wx-note" style={{ marginTop: '0.3rem' }}>
          Now: {itemsLeft} item{itemsLeft === 1 ? '' : 's'} x {days} days x {Math.max(1, n)} group{n === 1 ? '' : 's'} = {(itemsLeft * days * Math.max(1, n)).toLocaleString('en-US')}. The score is a toy, not a measure of real harm: it only shows that fewer items, fewer days and fewer readers each shrink the exposure.
        </p>
      </div>
      <p className="wx-example">
        <b>All data here is fake:</b> names are invented, emails end in example.com, phone numbers are in the 555-01xx block used for fiction, and customer IDs are made up. This is a defensive illustration of engineering practice, not legal advice.
      </p>
    </WhatIfFrame>
  );
}
