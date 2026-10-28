import { useState, type CSSProperties } from 'react';
import { Root } from '../viz/shared';
import { Glyph, type GlyphName } from '../viz/glyphs';
import { cardStyle } from '../../lib/color';
import { watch, topicLabels } from '../../data/watch';
import { cycleSwatch } from '../../lib/palette';

/** One hairline glyph per topic. Colour comes from the palette cycle, so neighbouring cards always differ. */
const glyphs: Record<string, GlyphName> = {
  transformers: 'eye',
  embeddings: 'vector',
  prompting: 'pen',
  rag: 'search',
  langchain: 'wrench',
  langgraph: 'route',
  cloud: 'cloud',
  evals: 'check',
  security: 'shield',
  mcp: 'network',
};

const kindLabel = { video: 'Video', playlist: 'Playlist', course: 'Course' } as const;

function styleObject(css: string): CSSProperties {
  return Object.fromEntries(css.split(';').map((d) => d.split(':'))) as CSSProperties;
}

const topics = Object.keys(topicLabels).filter((t) => watch.some((w) => w.topic === t));

/**
 * Video courses, grouped by topic. These are other people's work: each card names
 * the creator and says whether it is a single video, a playlist or a course.
 */
export default function WatchList() {
  const [topic, setTopic] = useState<string>('all');
  const shown = topic === 'all' ? watch : watch.filter((w) => w.topic === topic);

  return (
    <Root>
      <div role="group" aria-label="Filter by topic" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
        <button type="button" className="btn quiet" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>
          All ({watch.length})
        </button>
        {topics.map((t) => (
          <button key={t} type="button" className="btn quiet" aria-pressed={topic === t} onClick={() => setTopic(t)}>
            {topicLabels[t]} ({watch.filter((w) => w.topic === t).length})
          </button>
        ))}
      </div>

      <div className="lp-grid lp-grid-3">
        {shown.map((w, i) => {
          const glyph = glyphs[w.topic] ?? 'doc';
          const color = cycleSwatch(i);
          return (
            <article key={w.url} className="lp-card lp-card-col" style={styleObject(cardStyle(color))}>
              <span className="lp-plate">
                <Glyph name={glyph} size={30} />
              </span>
              <span className="lp-body">
                <h3>
                  <a href={w.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                    {w.title}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </h3>
                <p>
                  {w.creator}
                  {w.note ? `, ${w.note}` : ''}
                </p>
              </span>
              <span className="lp-chip">
                {kindLabel[w.kind]}
                {w.lang ? `, ${w.lang}` : ''}
              </span>
            </article>
          );
        })}
      </div>
    </Root>
  );
}
