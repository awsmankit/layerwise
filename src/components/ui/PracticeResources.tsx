import { useState, type CSSProperties } from 'react';
import { Root } from '../viz/shared';
import { Glyph, type GlyphName } from '../viz/glyphs';
import { cardStyle } from '../../lib/color';
import { cycleSwatch } from '../../lib/palette';
import { resources, topicLabels, practiceChecked, type Cost, type PracticeTopic } from '../../data/practice';

const glyphs: Record<PracticeTopic, GlyphName> = {
  models: 'chip',
  rag: 'search',
  agents: 'wrench',
  serving: 'server',
  cloud: 'cloud',
  evals: 'check',
  general: 'box',
};

const costLabel: Record<Cost, string> = { free: 'Free', 'free tier': 'Free tier', 'account needed': 'Account needed', paid: 'Paid' };

/** cardStyle() gives a style attribute string; React wants an object. */
function styleObject(css: string): CSSProperties {
  return Object.fromEntries(css.split(';').map((d) => d.split(':'))) as CSSProperties;
}

const topics = Object.keys(topicLabels).filter((t) => resources.some((r) => r.topic === t)) as PracticeTopic[];

/**
 * Places outside this site where you can practise: courses with exercises, notebooks,
 * and tools to run a model yourself. Costs are only what each provider's own page says.
 */
export default function PracticeResources() {
  const [topic, setTopic] = useState<PracticeTopic | 'all'>('all');
  const shown = topic === 'all' ? resources : resources.filter((r) => r.topic === topic);

  return (
    <Root>
      <div role="group" aria-label="Filter places to practise by topic" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <button type="button" className="btn quiet" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>
          All ({resources.length})
        </button>
        {topics.map((t) => (
          <button key={t} type="button" className="btn quiet" aria-pressed={topic === t} onClick={() => setTopic(t)}>
            {topicLabels[t]} ({resources.filter((r) => r.topic === t).length})
          </button>
        ))}
      </div>

      <p style={{ margin: '0 0 1rem', color: 'var(--ink-3)' }}>Free tiers and limits change. Check the provider&rsquo;s page before you start. Last checked {practiceChecked}.</p>

      <div className="lp-grid lp-grid-3" aria-live="polite">
        {shown.map((r, i) => (
          <article key={r.id} className="lp-card lp-card-col" style={styleObject(cardStyle(cycleSwatch(i)))}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <span className="lp-plate">
                <Glyph name={glyphs[r.topic]} size={30} />
              </span>
              <span className="lp-body">
                <h3 style={{ fontSize: '1.05rem' }}>{r.org}</h3>
                <p style={{ margin: 0 }}>{topicLabels[r.topic]}</p>
              </span>
            </header>
            <span className="lp-body">
              <h3 style={{ fontSize: '1.15rem' }}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  {r.name}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </h3>
              <p>{r.what}</p>
            </span>
            <span className="lp-chip">{costLabel[r.cost]}</span>
          </article>
        ))}
      </div>
    </Root>
  );
}
