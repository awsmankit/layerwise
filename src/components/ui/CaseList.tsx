import { useState, type CSSProperties } from 'react';
import { Root } from '../viz/shared';
import { Glyph, type GlyphName } from '../viz/glyphs';
import { cardStyle } from '../../lib/color';
import { withBase } from '../../lib/url';
import { cases, topicLabels, type CaseTopic } from '../../data/cases';
import { cycleSwatch } from '../../lib/palette';

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

/**
 * Other organisations' own engineering write-ups, filtered by topic. Each card
 * says what the page itself states, links out to it, and points at the lesson
 * here that teaches the background.
 */
export default function CaseList() {
  const [topic, setTopic] = useState<CaseTopic | 'all'>('all');
  const shown = topic === 'all' ? cases : cases.filter((c) => c.topic === topic);

  return (
    <Root>
      <div className="cs-filters" role="group" aria-label="Filter by topic" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
        <button type="button" className="btn quiet" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>
          All ({cases.length})
        </button>
        {topics.map((t) => (
          <button key={t} type="button" className="btn quiet" aria-pressed={topic === t} onClick={() => setTopic(t)}>
            {topicLabels[t]} ({cases.filter((c) => c.topic === t).length})
          </button>
        ))}
      </div>

      <p aria-live="polite" style={{ margin: '0 0 1rem', color: 'var(--ink-3)' }}>
        Showing {shown.length} {shown.length === 1 ? 'write-up' : 'write-ups'}
        {topic === 'all' ? '' : ` on ${topicLabels[topic].toLowerCase()}`}.
      </p>

      <div className="lp-grid lp-grid-3">
        {shown.map((c, i) => {
          const glyph = glyphs[c.topic];
          const color = cycleSwatch(i);
          return (
            <article key={c.url} className="lp-card lp-card-col" style={styleObject(cardStyle(color))}>
              <span className="lp-plate">
                <Glyph name={glyph} size={30} />
              </span>
              <span className="lp-body">
                <h3>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                    {c.title}
                    <span className="sr-only"> (opens {c.company}&rsquo;s site in a new tab)</span>
                  </a>
                </h3>
                <p>{c.learn}</p>
              </span>
              <span className="lp-chip">
                {c.company}
                {c.date ? `, ${month(c.date)}` : ''}
              </span>
              {c.lesson && (
                <a href={withBase(`/learn/${c.lesson}/`)} style={{ color: 'inherit', fontFamily: 'var(--font-display)', fontWeight: 650, fontSize: '0.9rem' }}>
                  Background lesson
                </a>
              )}
            </article>
          );
        })}
      </div>
    </Root>
  );
}
