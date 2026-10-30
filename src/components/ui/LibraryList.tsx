import { useMemo, useState, type CSSProperties } from 'react';
import { Root } from '../viz/shared';
import { Glyph, type GlyphName } from '../viz/glyphs';
import { cardStyle } from '../../lib/color';
import { cycleSwatch } from '../../lib/palette';
import { withBase } from '../../lib/url';
import { monthYear } from '../../lib/dates';
import { libraries, categoryLabels, type LibCategory, type Library } from '../../data/libraries';

/** One hairline glyph per category. Colour comes from the palette cycle, so neighbouring cards always differ. */
const glyphs: Record<LibCategory, GlyphName> = {
  agents: 'wrench',
  protocol: 'network',
  rag: 'doc',
  vector: 'vector',
  structured: 'table',
  eval: 'check',
  guardrails: 'shield',
  observability: 'chart',
  finetune: 'bolt',
  serving: 'server',
  gateway: 'route',
};

const statusLabel = { active: 'Active', maintenance: 'Maintenance mode', archived: 'Archived' } as const;

/** cardStyle() gives a style attribute string; React wants an object. */
function styleObject(css: string): CSSProperties {
  return Object.fromEntries(css.split(';').map((d) => d.split(':'))) as CSSProperties;
}

const categories = Object.keys(categoryLabels) as LibCategory[];
const piped = (cmd: string) => /\|\s*(sh|bash)\b/.test(cmd);

function Install({ command }: { command: string }) {
  const [done, setDone] = useState(false);
  return (
    <span style={{ display: 'block' }}>
      <pre className="cs-result eco-cmd" style={{ margin: 0, overflowX: 'auto' }}>
        {command}
      </pre>
      <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem' }}>
        <button
          type="button"
          className="btn quiet lp-mini"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(command);
              setDone(true);
              window.setTimeout(() => setDone(false), 1500);
            } catch {
              /* clipboard blocked: the command is on screen to copy by hand */
            }
          }}
        >
          {done ? 'Copied' : 'Copy command'}
        </button>
        {piped(command) && <small>Read the script before you run it.</small>}
      </span>
    </span>
  );
}

function Card({ lib, index }: { lib: Library; index: number }) {
  return (
    <article className="lp-card lp-card-col" style={styleObject(cardStyle(cycleSwatch(index)))}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <span className="lp-plate">
          <Glyph name={glyphs[lib.category]} size={30} />
        </span>
        <span className="lp-body">
          <h3 style={{ fontSize: '1.15rem' }}>{lib.name}</h3>
          <p style={{ margin: 0 }}>{categoryLabels[lib.category]}</p>
        </span>
      </header>

      <span className="lp-body">
        <p style={{ margin: 0 }}>{lib.what}</p>
        <p style={{ margin: '0.5rem 0 0' }}>
          <b>Best for:</b> {lib.bestFor}
        </p>
      </span>

      {lib.install && <Install command={lib.install} />}

      {lib.note && (
        <p style={{ margin: 0, fontSize: '0.88rem', fontStyle: 'italic' }}>
          {lib.note}
        </p>
      )}

      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: 'auto' }}>
        <span className="lp-chip" style={{ marginTop: 0 }}>
          {statusLabel[lib.status]}
        </span>
        {lib.licence && (
          <span className="lp-chip" style={{ marginTop: 0 }}>
            {lib.licence}
          </span>
        )}
        {lib.lastRelease && (
          <span className="lp-chip" style={{ marginTop: 0 }}>
            Release {monthYear(lib.lastRelease)}
          </span>
        )}
      </span>

      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1.1rem', fontFamily: 'var(--font-display)', fontWeight: 650, fontSize: '0.9rem' }}>
        <a href={lib.docs} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
          Docs<span className="sr-only"> for {lib.name} (opens in a new tab)</span>
        </a>
        {lib.repo && lib.repo !== lib.docs && (
          <a href={lib.repo} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
            Repository<span className="sr-only"> for {lib.name} (opens in a new tab)</span>
          </a>
        )}
        {lib.lesson && (
          <a href={withBase(`/learn/${lib.lesson}/`)} style={{ color: 'inherit' }}>
            Learn the idea
          </a>
        )}
      </span>
    </article>
  );
}

/**
 * The libraries map: filter by category, search by word, and open a card for what it
 * is, what it suits, how to install it, and where the docs and code are. Every entry
 * was checked against the project's own repository and docs on the date shown on the page.
 */
export default function LibraryList() {
  const [category, setCategory] = useState<LibCategory | 'all'>('all');
  const [text, setText] = useState('');

  const shown = useMemo(() => {
    const q = text.trim().toLowerCase();
    return libraries.filter((l) => (category === 'all' || l.category === category) && (!q || `${l.name} ${l.what} ${l.bestFor} ${categoryLabels[l.category]}`.toLowerCase().includes(q)));
  }, [category, text]);

  return (
    <Root>
      <div role="group" aria-label="Filter by category" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <button type="button" className="btn quiet" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
          All ({libraries.length})
        </button>
        {categories.map((c) => (
          <button key={c} type="button" className="btn quiet" aria-pressed={category === c} onClick={() => setCategory(c)}>
            {categoryLabels[c]} ({libraries.filter((l) => l.category === c).length})
          </button>
        ))}
      </div>

      <div className="viz-controls" style={{ marginBottom: '1.2rem' }}>
        <label className="field">
          <span>Search by name or job</span>
          <input type="search" className="iv-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="for example: pgvector, evals, structured" />
        </label>
        {(category !== 'all' || text) && (
          <button
            type="button"
            className="btn quiet"
            style={{ alignSelf: 'end' }}
            onClick={() => {
              setCategory('all');
              setText('');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <p aria-live="polite" style={{ margin: '0 0 1rem', color: 'var(--ink-3)' }}>
        Showing {shown.length} of {libraries.length} libraries.
      </p>

      {shown.length === 0 && <p>Nothing matches. Clear a filter to see more.</p>}

      <div className="lp-grid lp-grid-3">
        {shown.map((lib, i) => (
          <Card key={lib.name} lib={lib} index={i} />
        ))}
      </div>
    </Root>
  );
}
