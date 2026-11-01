import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  COUNTRIES,
  DAYS,
  DEFAULT_CONFIG,
  FAULTS,
  PRESETS,
  REF,
  RULES,
  dayStats,
  evaluate,
  faultOn,
  generateStream,
  type Config,
  type RuleId,
} from '../../lib/data-validation';

/*
 * Data-validation lab for systems/data-pipelines-and-data-quality. A month of invented order data
 * with six planted faults; the learner switches validation rules on and off, moves their thresholds,
 * and sees which faults each setting catches and how many alarms it raises on clean days. The data
 * and the rules are in lib/data-validation.ts (unit-tested). Everything here is invented.
 */

const ruleName = (id: RuleId) => RULES.find((r) => r.id === id)?.name ?? id;

export default function ValidationLab() {
  const [seed, setSeed] = useState(1);
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [presetId, setPresetId] = useState<string>('sensible');
  const [selected, setSelected] = useState<number | null>(4);

  const batches = useMemo(() => generateStream(seed), [seed]);
  const ev = useMemo(() => evaluate(batches, cfg), [batches, cfg]);
  const preset = PRESETS.find((p) => p.id === presetId);

  const setRule = (id: RuleId, patch: Partial<Config[RuleId]>) => {
    setCfg((c) => ({ ...c, [id]: { ...c[id], ...patch } }));
    setPresetId('');
  };
  const choose = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setCfg(p.config);
    setPresetId(id);
  };

  const batch = selected ? batches[selected - 1] : null;
  const stats = batch ? dayStats(batch, cfg['range-amount'].threshold) : null;
  const dayEval = selected ? ev.perDay[selected - 1] : null;
  const dayFault = selected ? faultOn(selected) : undefined;

  return (
    <Root>
      <div className="viz mo1-val">
        <p className="viz-title">The data-validation lab</p>
        <div className="mo1-val-presets" role="group" aria-label="Rule presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="btn quiet" aria-pressed={presetId === p.id} onClick={() => choose(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <p className="mo1-val-note">{preset ? preset.note : 'Custom settings.'} Made-up data: 30 days of shop orders, six faults planted on known days.</p>

        <div className="mo1-val-rules">
          {RULES.map((r) => {
            const c = cfg[r.id];
            return (
              <div key={r.id} className={`mo1-val-rule${c.enabled ? '' : ' is-off'}`}>
                <label className="mo1-val-check">
                  <input type="checkbox" checked={c.enabled} onChange={(e) => setRule(r.id, { enabled: e.target.checked })} />
                  <span>{r.name}</span>
                </label>
                {r.thresholdLabel && (
                  <label className="mo1-val-slider">
                    {r.thresholdLabel}{' '}
                    <b>
                      {c.threshold} {r.unit}
                    </b>
                    <input
                      type="range"
                      min={r.min}
                      max={r.max}
                      step={r.step}
                      value={c.threshold}
                      disabled={!c.enabled}
                      onChange={(e) => setRule(r.id, { threshold: +e.target.value })}
                      aria-valuetext={`${c.threshold} ${r.unit}`}
                    />
                  </label>
                )}
                <p className="mo1-val-desc">{r.describe(c.threshold)}</p>
              </div>
            );
          })}
        </div>

        <div className="mo1-val-score" role="status" aria-live="polite">
          <span>
            Faults caught: <b>{ev.caught} of {FAULTS.length}</b>
          </span>
          <span>
            False-alarm days: <b>{ev.falseAlarmDays} of {ev.cleanDays}</b> clean days
          </span>
        </div>

        <ul className="mo1-val-days" aria-label="The 30 days. Press a day to inspect its batch.">
          {batches.map((b) => {
            const d = ev.perDay[b.day - 1];
            const alert = d.failed.length > 0;
            const cls = alert ? (d.fault ? 'is-caught' : 'is-false') : d.fault ? 'is-missed' : '';
            const label = alert ? (d.fault ? 'alert on a faulty day' : 'false alarm') : d.fault ? 'faulty day, no alert' : 'clean day, no alert';
            return (
              <li key={b.day}>
                <button type="button" className={`mo1-val-day ${cls}`} aria-pressed={selected === b.day} onClick={() => setSelected(selected === b.day ? null : b.day)} aria-label={`Day ${b.day}: ${label}`}>
                  {b.day}
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="mo1-val-legend">
          <li><i className="is-caught" />Alert on a faulty day</li>
          <li><i className="is-missed" />Faulty day, no alert</li>
          <li><i className="is-false" />False alarm</li>
          <li><i />Clean day, quiet</li>
        </ul>

        <div className="mo1-val-scroll">
          <table className="mo1-fl mo1-val-faults">
            <thead>
              <tr>
                <th scope="col">Planted fault</th>
                <th scope="col">Days</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {ev.perFault.map((f) => (
                <tr key={f.fault.id}>
                  <td>
                    <b>{f.fault.label}</b>
                    <div className="mo1-val-story">{f.fault.story}</div>
                  </td>
                  <td>{f.fault.start === f.fault.end ? f.fault.start : `${f.fault.start} to ${f.fault.end}`}</td>
                  <td className={f.caught ? 'is-ok' : 'is-bad'}>
                    {f.caught ? `Caught on day ${f.firstDay}${f.delay ? ` (${f.delay} ${f.delay === 1 ? 'day' : 'days'} late)` : ''} by ${f.by.map(ruleName).join(', ')}` : 'Missed'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {batch && stats && dayEval && (
          <div className="mo1-val-inspect" role="status" aria-live="polite">
            <h4 className="mo1-val-h">
              Day {batch.day}: {batch.rows.length} rows{dayFault ? `, planted fault: ${dayFault.label.toLowerCase()}` : ', no fault planted'}
            </h4>
            <div className="mo1-val-scroll">
              <table className="mo1-val-rows">
                <thead>
                  <tr>
                    <th scope="col">amount (GBP)</th>
                    <th scope="col">items</th>
                    <th scope="col">country</th>
                    <th scope="col">delivery_days</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td>{r.amount.toFixed(2)}</td>
                      <td>{r.items}</td>
                      <td>{r.country}</td>
                      <td>{r.deliveryDays === null ? 'blank' : r.deliveryDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mo1-val-stats">
              <div className={dayEval.failed.includes('rows') ? 'is-fail' : undefined}>
                <dt>Rows (usual {REF.rows})</dt>
                <dd>{stats.rows}</dd>
              </div>
              <div className={dayEval.failed.includes('range-items') ? 'is-fail' : undefined}>
                <dt>Items outside 1 to 10</dt>
                <dd>{(stats.itemsOutShare * 100).toFixed(1)}%</dd>
              </div>
              <div className={dayEval.failed.includes('range-amount') ? 'is-fail' : undefined}>
                <dt>Amount outside 0 to {cfg['range-amount'].threshold}</dt>
                <dd>{(stats.amountOutShare * 100).toFixed(1)}%</dd>
              </div>
              <div className={dayEval.failed.includes('nulls') ? 'is-fail' : undefined}>
                <dt>delivery_days blank</dt>
                <dd>{(stats.nullRate * 100).toFixed(1)}%</dd>
              </div>
              <div className={dayEval.failed.includes('categories') ? 'is-fail' : undefined}>
                <dt>Country not in {COUNTRIES.join(', ')}</dt>
                <dd>{(stats.unseenShare * 100).toFixed(1)}%</dd>
              </div>
              <div className={dayEval.failed.includes('mean-amount') ? 'is-fail' : undefined}>
                <dt>Mean amount (usual {REF.amountMean})</dt>
                <dd>
                  {stats.meanAmount.toFixed(1)} ({stats.meanZ.toFixed(1)} standard errors away)
                </dd>
              </div>
            </dl>
            <p className="mo1-val-verdict">
              {dayEval.failed.length > 0 ? `Alert: ${dayEval.failed.map(ruleName).join(', ')} failed.` : 'No rule failed on this day.'}
              {dayEval.failed.length > 0 && !dayFault ? ' This is a false alarm: nothing was planted.' : ''}
              {dayEval.failed.length === 0 && dayFault ? ' A planted fault went through unnoticed.' : ''}
            </p>
          </div>
        )}

        <div className="mo1-val-actions">
          <button type="button" className="btn quiet" onClick={() => setSeed(seed >= 30 ? 1 : seed + 1)}>
            Show different random weeks
          </button>
          <span className="mo1-val-seed">
            Random set {seed} of 30. Same faults on the same {DAYS} days; the ordinary wobble in the data changes.
          </span>
        </div>
      </div>
    </Root>
  );
}
