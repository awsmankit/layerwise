import { useMemo, useState } from 'react';
import { Root } from './shared';
import { EU_TIERS, euFineCeiling, FACETS, filterJurisdictions, isStale, JURISDICTIONS, oldestChecked, TAGS, type EuTier, type FacetId, type Tag } from '../../data/ai-rules';

/*
 * A comparison of how some jurisdictions regulate AI. The learner filters by approach and chooses which facet
 * to compare. Every entry shows its primary sources and the date they were read. Entries that could not be
 * verified from a primary source are blank on purpose. The data and its rules are in src/data/ai-rules.ts.
 */

type View = FacetId | 'all';

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const eur = (n: number) => `EUR ${Math.round(n).toLocaleString('en-GB')}`;

export default function AiRulesTable() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [view, setView] = useState<View>('penalties');
  const [turnover, setTurnover] = useState('1000000000');
  const [tier, setTier] = useState<EuTier>('operator');
  const [sme, setSme] = useState(false);

  const list = useMemo(() => filterJurisdictions(JURISDICTIONS, tags), [tags]);
  const now = useMemo(() => new Date(), []);
  const shown = view === 'all' ? FACETS : FACETS.filter((f) => f.id === view);
  const viewLabel = view === 'all' ? 'all facets' : (FACETS.find((f) => f.id === view)?.label ?? '');

  const toggle = (t: Tag) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const t = Number(turnover.replace(/[^\d.]/g, ''));
  const turnoverOk = Number.isFinite(t) && t >= 0;
  const ceiling = turnoverOk ? euFineCeiling(tier, t, sme) : NaN;
  const byShare = turnoverOk ? (t * EU_TIERS[tier].percent) / 100 : NaN;

  return (
    <Root>
      <div className="viz wrd wrd-rules">
        <p className="viz-title">Who regulates what: a dated comparison (read on 1 November 2026)</p>

        <div className="wrd-group" role="group" aria-label="Filter by approach">
          <p className="wrd-group-l">Approach (choose any; none shows all)</p>
          <div className="wrd-chips">
            {TAGS.map((tg) => (
              <button key={tg.id} type="button" className="wrd-chip" aria-pressed={tags.includes(tg.id)} onClick={() => toggle(tg.id)}>
                {tg.label}
              </button>
            ))}
            {tags.length > 0 ? (
              <button type="button" className="wrd-chip wrd-quiet" onClick={() => setTags([])}>
                Clear
              </button>
            ) : null}
          </div>
          {tags.length > 0 ? (
            <ul className="wrd-gloss">
              {TAGS.filter((tg) => tags.includes(tg.id)).map((tg) => (
                <li key={tg.id}>
                  <b>{tg.label}:</b> {tg.gloss}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="wrd-group" role="group" aria-label="Choose what to compare">
          <p className="wrd-group-l">Compare</p>
          <div className="wrd-chips">
            {FACETS.map((f) => (
              <button key={f.id} type="button" className="wrd-chip" aria-pressed={view === f.id} onClick={() => setView(f.id)}>
                {f.short}
              </button>
            ))}
            <button type="button" className="wrd-chip" aria-pressed={view === 'all'} onClick={() => setView('all')}>
              Everything
            </button>
          </div>
        </div>

        <p className="wrd-sr" role="status" aria-live="polite">
          Showing {list.length} of {JURISDICTIONS.length} jurisdictions, comparing {viewLabel}.
        </p>
        <p className="wrd-count" aria-hidden="true">
          {list.length} of {JURISDICTIONS.length} shown
        </p>

        <ul className="wrd-cards">
          {list.map((j) => (
            <li key={j.id} className="wrd-card">
              <h4 className="wrd-card-h">{j.name}</h4>
              <p className="wrd-card-tags">
                {j.tags.map((tg) => (
                  <span key={tg} className="wrd-tagpill">
                    {TAGS.find((x) => x.id === tg)?.label}
                  </span>
                ))}
              </p>
              {shown.map((f) => {
                const c = j.cells[f.id];
                return (
                  <div key={f.id} className="wrd-facet">
                    <p className="wrd-facet-l">{f.label}</p>
                    {c ? (
                      <>
                        <p className="wrd-facet-t">{c.text}</p>
                        <p className="wrd-src">
                          Read on {fmtDate(oldestChecked(c))}
                          {isStale(oldestChecked(c), now) ? <b className="wrd-stale"> (more than six months ago: check again)</b> : null}. Source{c.sources.length > 1 ? 's' : ''}:{' '}
                          {c.sources.map((s, i) => (
                            <span key={s.url}>
                              {i > 0 ? '; ' : ''}
                              <a className="wrd-link" href={s.url} target="_blank" rel="noopener noreferrer">
                                {s.label}
                              </a>
                            </span>
                          ))}
                        </p>
                      </>
                    ) : (
                      <p className="wrd-facet-t wrd-none">No verified entry. I could not confirm this from a primary source, so it is left blank rather than filled from a summary.</p>
                    )}
                  </div>
                );
              })}
            </li>
          ))}
        </ul>

        <div className="wrd-calc">
          <p className="wrd-calc-h">Worked example: the ceiling on an EU fine</p>
          <p className="wrd-hint">
            Article 99 sets a ceiling as a fixed amount or a share of worldwide annual turnover, whichever is higher; for small and medium enterprises, the lower of the two. A ceiling is not a prediction of any fine. The turnover below is an example you can change.
          </p>
          <div className="wrd-calc-row">
            <label className="wrd-num">
              <span>Worldwide annual turnover (EUR)</span>
              <input type="text" inputMode="numeric" value={turnover} onChange={(e) => setTurnover(e.target.value)} />
            </label>
            <label className="wrd-sel">
              <span>Kind of breach</span>
              <select value={tier} onChange={(e) => setTier(e.target.value as EuTier)}>
                {(Object.keys(EU_TIERS) as EuTier[]).map((k) => (
                  <option key={k} value={k}>
                    {EU_TIERS[k].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="wrd-check">
              <input type="checkbox" checked={sme} onChange={(e) => setSme(e.target.checked)} />
              <span>Small or medium enterprise</span>
            </label>
          </div>
          <p className="wrd-calc-out" role="status" aria-live="polite">
            {turnoverOk
              ? `${EU_TIERS[tier].percent}% of ${eur(t)} is ${eur(byShare)}. The fixed amount is ${eur(EU_TIERS[tier].fixed)}. The ${sme ? 'lower' : 'higher'} of the two is ${eur(ceiling)}.`
              : 'Enter a turnover as a number.'}
          </p>
        </div>

        <p className="wrd-hint">
          The approach tags are this site’s own simplification for filtering, not legal categories. Not legal advice: read the instrument itself, and check it again, because several of these have changed in the past year.
        </p>
      </div>
    </Root>
  );
}
