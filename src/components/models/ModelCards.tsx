import { useMemo, useState } from 'react';
import { Root } from '../viz/shared';
import { models, vendors, type Modality, type Vendor } from '../../data/models';
import { ageLabel, filterModels, formatPrice, formatTokens, freshnessLabel, ratesFor, sortLabels, sortModels, staleness, statusLabels, type SortKey } from '../../lib/models';
import { shortDay } from '../../lib/dates';
import { Marker, vendorClass } from './shared';

const inputTypes: Modality[] = ['text', 'image', 'audio', 'video', 'pdf'];

/** A filterable list of every model with its checked date, freshness and sources. */
export default function ModelCards({ today }: { today: string }) {
  const [picked, setPicked] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const [modality, setModality] = useState<Modality | ''>('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [text, setText] = useState('');

  const shown = useMemo(() => sortModels(filterModels(models, { vendors: picked, openWeights: open, modality: modality || undefined, text }), sort), [picked, open, modality, sort, text]);
  const toggle = (v: Vendor) => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  return (
    <Root>
      <div className="viz mr-fig mr-list">
        <h3 className="viz-title">Every model, with its sources</h3>
        <div className="mr-ctl" role="group" aria-label="Filter by vendor">
          {vendors.map((v) => (
            <button key={v} type="button" className="mr-chip" aria-pressed={picked.includes(v)} onClick={() => toggle(v)}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                <Marker vendor={v} x={7} y={7} r={4} />
              </svg>
              {v}
            </button>
          ))}
          <button type="button" className="mr-chip" aria-pressed={open} onClick={() => setOpen((o) => !o)}>
            Open weights only
          </button>
        </div>
        <div className="mr-fields">
          <label className="mr-field">
            <span>Search</span>
            <input type="search" value={text} placeholder="Name or API id" onChange={(e) => setText(e.target.value)} />
          </label>
          <label className="mr-field">
            <span>Takes in</span>
            <select value={modality} onChange={(e) => setModality(e.target.value as Modality | '')}>
              <option value="">Anything</option>
              {inputTypes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="mr-field">
            <span>Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {sortLabels[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mr-count" role="status">
          Showing {shown.length} of {models.length} models
        </p>

        <ul className="mr-cards">
          {shown.map((m) => {
            const fresh = staleness(m.checkedOn, today);
            const r = ratesFor(m, 0, today);
            const later = m.priceChange && today < m.priceChange.from ? m.priceChange : null;
            return (
              <li key={m.id} className={`mr-card ${vendorClass(m.vendor)}`}>
                <header>
                  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
                    <Marker vendor={m.vendor} x={11} y={11} r={6.5} />
                  </svg>
                  <div>
                    <h4>{m.name}</h4>
                    <p>
                      {m.vendor} · {m.family}
                    </p>
                  </div>
                </header>
                <p className="mr-badges">
                  <span className={`mr-status mr-status-${m.status}`}>{statusLabels[m.status]}</span>
                  <span className={`mr-fresh mr-fresh-${fresh}`} title={`Every figure on this card was checked on ${shortDay(m.checkedOn)}`}>
                    {freshnessLabel(fresh)}: {ageLabel(m.checkedOn, today)}
                  </span>
                  <span className="mr-status">{m.openWeights ? 'Open weights' : 'Closed weights'}</span>
                </p>
                <dl>
                  <div>
                    <dt>Released</dt>
                    <dd>{shortDay(m.releasedOn)}</dd>
                  </div>
                  <div>
                    <dt>Context window</dt>
                    <dd>{m.contextTokens != null ? `${formatTokens(m.contextTokens)} tokens` : 'not stated'}</dd>
                  </div>
                  <div>
                    <dt>Longest reply</dt>
                    <dd>{m.maxOutputTokens != null ? `${formatTokens(m.maxOutputTokens)} tokens` : 'not stated'}</dd>
                  </div>
                  <div>
                    <dt>Input price</dt>
                    <dd>{r ? `${formatPrice(r.input)} per million` : 'not stated'}</dd>
                  </div>
                  <div>
                    <dt>Output price</dt>
                    <dd>{r ? `${formatPrice(r.output)} per million` : 'not stated'}</dd>
                  </div>
                  {r?.cached != null && (
                    <div>
                      <dt>Cached input</dt>
                      <dd>{formatPrice(r.cached)} per million</dd>
                    </div>
                  )}
                  <div>
                    <dt>Takes in</dt>
                    <dd>{m.modalities.length ? m.modalities.join(', ') : 'not stated'}</dd>
                  </div>
                  {m.licence && (
                    <div>
                      <dt>Licence</dt>
                      <dd>{m.licence}</dd>
                    </div>
                  )}
                </dl>
                {later && (
                  <p className="mr-change">
                    Price changes on {shortDay(later.from)}: {formatPrice(later.inputPerMTok)} in, {formatPrice(later.outputPerMTok)} out.
                  </p>
                )}
                {m.priceNote && <p className="mr-note">{m.priceNote}</p>}
                {m.note && <p className="mr-note">{m.note}</p>}
                <p className="mr-src-title">Sources</p>
                <ul className="mr-src">
                  {m.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        {shown.length === 0 && <p className="viz-cap">No model matches those filters. Clear one to see more.</p>}
      </div>
    </Root>
  );
}
