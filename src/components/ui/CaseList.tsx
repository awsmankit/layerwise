import { useMemo, useState, type CSSProperties } from 'react';
import { Root } from '../viz/shared';
import { Glyph, type GlyphName } from '../viz/glyphs';
import { cardStyle } from '../../lib/color';
import { withBase } from '../../lib/url';
import { cases, topicLabels, type Case, type CaseTopic } from '../../data/cases';
import { cycleSwatch } from '../../lib/palette';
import { logos } from '../../data/logos';

/** One hairline glyph per topic. Colour comes from the palette cycle, so neighbouring cards always differ. */
const glyphs: Record<CaseTopic, GlyphName> = {
  rag: 'search',
  agents: 'wrench',
  serving: 'bolt',
  evals: 'check',
  platform: 'server',
  cost: 'coin',
  safety: 'shield',
  search: 'vector',
};

/** cardStyle() gives a style attribute string; React wants an object. */
function styleObject(css: string): CSSProperties {
  return Object.fromEntries(css.split(';').map((d) => d.split(':'))) as CSSProperties;
}

function month(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const topics = Object.keys(topicLabels) as CaseTopic[];
const companies = [...new Set(cases.map((c) => c.company))].sort((a, b) => a.localeCompare(b));

type Sort = 'newest' | 'oldest' | 'company';

/** Newest or oldest first, with write-ups that show no date last; or A to Z by company, newest first within each. */
function sorted(list: Case[], by: Sort): Case[] {
  const key = (c: Case) => c.date ?? '';
  return [...list].sort((a, b) => {
    if (by === 'company') return a.company.localeCompare(b.company) || key(b).localeCompare(key(a));
    if (!a.date || !b.date) return a.date ? -1 : b.date ? 1 : a.company.localeCompare(b.company);
    return by === 'newest' ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b));
  });
}

/** A company's mark in one colour, or its first letter where the icon set has none. */
function Mark({ company }: { company: string }) {
  const path = logos[company];
  return path ? (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" role="img" aria-label={`${company} logo`}>
      <path d={path} />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="34" height="34" role="img" aria-label={`${company} (no logo shown)`}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" style={{ fontFamily: 'var(--font-display)' }}>
        {company[0]}
      </text>
    </svg>
  );
}

/**
 * Other organisations' own engineering write-ups. Filter by topic and by company,
 * sort by date, and follow a card out to the post. Each card says what the page
 * itself states and points at the lesson here that teaches the background.
 */
export default function CaseList() {
  const [topic, setTopic] = useState<CaseTopic | 'all'>('all');
  const [company, setCompany] = useState<string>('all');
  const [by, setBy] = useState<Sort>('newest');

  const shown = useMemo(
    () => sorted(cases.filter((c) => (topic === 'all' || c.topic === topic) && (company === 'all' || c.company === company)), by),
    [topic, company, by],
  );
  const filtered = topic !== 'all' || company !== 'all';

  return (
    <Root>
      <div role="group" aria-label="Filter by topic" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <button type="button" className="btn quiet" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>
          All topics
        </button>
        {topics.map((t) => (
          <button key={t} type="button" className="btn quiet" aria-pressed={topic === t} onClick={() => setTopic(t)}>
            {topicLabels[t]} ({cases.filter((c) => c.topic === t).length})
          </button>
        ))}
      </div>

      <div className="viz-controls" style={{ marginBottom: '1.2rem' }}>
        <label className="field">
          <span>Company</span>
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="all">All {companies.length} companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c} ({cases.filter((x) => x.company === c).length})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sort by</span>
          <select value={by} onChange={(e) => setBy(e.target.value as Sort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="company">Company, A to Z</option>
          </select>
        </label>
        {filtered && (
          <button
            type="button"
            className="btn quiet"
            style={{ alignSelf: 'end' }}
            onClick={() => {
              setTopic('all');
              setCompany('all');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <p aria-live="polite" style={{ margin: '0 0 1rem', color: 'var(--ink-3)' }}>
        Showing {shown.length} of {cases.length} write-ups.
      </p>

      {shown.length === 0 && <p>No write-ups match. Clear a filter to see more.</p>}

      <div className="lp-grid lp-grid-3">
        {shown.map((c, i) => (
          <article key={c.url} className="lp-card lp-card-col" style={styleObject(cardStyle(cycleSwatch(i)))}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <span className="lp-plate">
                <Mark company={c.company} />
              </span>
              <span className="lp-body">
                <h3 style={{ fontSize: '1.05rem' }}>{c.company}</h3>
                <p style={{ margin: 0 }}>{c.date ? month(c.date) : 'Date not shown on the page'}</p>
              </span>
            </header>
            <span className="lp-body">
              <h3 style={{ fontSize: '1.15rem' }}>
                <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  {c.title}
                  <span className="sr-only"> (opens {c.company}&rsquo;s site in a new tab)</span>
                </a>
              </h3>
              {c.linkOnly ? (
                <p style={{ fontStyle: 'italic' }}>We could not read this page automatically, so there is no summary. Open it to read the original.</p>
              ) : (
                <p>{c.learn}</p>
              )}
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', alignItems: 'center', marginTop: 'auto' }}>
              <span className="lp-chip" style={{ marginTop: 0 }}>
                <Glyph name={glyphs[c.topic]} size={14} /> {topicLabels[c.topic]}
              </span>
              {c.linkOnly && (
                <span className="lp-chip" style={{ marginTop: 0, borderStyle: 'dashed' }}>
                  Link only
                </span>
              )}
              {c.lesson && (
                <a href={withBase(`/learn/${c.lesson}/`)} style={{ color: 'inherit', fontFamily: 'var(--font-display)', fontWeight: 650, fontSize: '0.9rem' }}>
                  Background lesson
                </a>
              )}
            </span>
          </article>
        ))}
      </div>
    </Root>
  );
}
