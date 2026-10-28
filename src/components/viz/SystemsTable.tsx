import { useState, type CSSProperties } from 'react';
import { Root } from './shared';
import { Glyph, type GlyphName } from './glyphs';
import { cardStyle } from '../../lib/color';
import { cycleSwatch } from '../../lib/palette';
import { systems, type SystemKind } from '../../data/systems';

const kinds: Record<SystemKind, { label: string; glyph: GlyphName; where: string }> = {
  desktop: { label: 'Desktop', glyph: 'screen', where: 'A box for one desk: development and small models, not serving many users.' },
  server: { label: 'Server', glyph: 'server', where: 'A server you rent by the hour in a cloud, or buy for a data centre.' },
  rack: { label: 'Rack', glyph: 'layers', where: 'A whole rack that works as one machine, built for the biggest models.' },
};

/** cardStyle() gives a style attribute string; React wants an object. */
const styleObject = (css: string): CSSProperties => Object.fromEntries(css.split(';').map((d) => d.split(':'))) as CSSProperties;

const memory = (gb: number) => (gb >= 1000 ? `${(gb / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} TB` : `${gb.toLocaleString('en-GB')} GB`);

/**
 * NVIDIA's whole machines as cards. Each card states only what NVIDIA's own page states,
 * says which kind of memory a figure is, and links to the page. Where the data holds no figure,
 * the card says to read NVIDIA's page.
 */
export default function SystemsTable() {
  const [kind, setKind] = useState<SystemKind | 'all'>('all');
  const shown = kind === 'all' ? systems : systems.filter((s) => s.kind === kind);

  return (
    <Root>
      <div role="group" aria-label="Filter by kind of machine" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
        <button type="button" className="btn quiet" aria-pressed={kind === 'all'} onClick={() => setKind('all')}>
          All ({systems.length})
        </button>
        {(Object.keys(kinds) as SystemKind[]).map((k) => (
          <button key={k} type="button" className="btn quiet" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {kinds[k].label} ({systems.filter((s) => s.kind === k).length})
          </button>
        ))}
      </div>

      <div className="lp-grid lp-grid-3">
        {shown.map((s, i) => (
          <article key={s.name} className="lp-card lp-card-col" style={styleObject(cardStyle(cycleSwatch(i + 3)))}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <span className="lp-plate">
                <Glyph name={kinds[s.kind].glyph} size={32} />
              </span>
              <span className="lp-body">
                <h3 style={{ fontSize: '1.15rem' }}>{s.name}</h3>
                <p style={{ margin: 0 }}>{kinds[s.kind].label}</p>
              </span>
            </header>

            <span className="lp-body">
              <p style={{ margin: 0 }}>{kinds[s.kind].where}</p>
              {s.gpus && (
                <p>
                  <b>Inside:</b> {s.gpus}.
                </p>
              )}
              {s.totalMemoryGB !== undefined && (
                <p>
                  <b>GPU memory:</b> {memory(s.totalMemoryGB)}. {s.memoryNote}
                </p>
              )}
              {s.totalMemoryGB === undefined && s.memoryNote && (
                <p>
                  <b>Memory:</b> {s.memoryNote}
                </p>
              )}
              {s.interconnect && (
                <p>
                  <b>Links:</b> {s.interconnect}
                </p>
              )}
              {s.totalMemoryGB === undefined && !s.memoryNote && <p>See NVIDIA’s page for the figures.</p>}
              {s.note && <p style={{ fontStyle: 'italic' }}>{s.note}</p>}
            </span>

            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', alignItems: 'center', marginTop: 'auto' }}>
              <a href={s.official} target="_blank" rel="noopener noreferrer" className="lp-chip" style={{ marginTop: 0, color: 'inherit', textDecoration: 'none' }}>
                NVIDIA’s page
                <span className="sr-only"> for {s.name} (opens in a new tab)</span>
              </a>
              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Read {s.checked}</span>
            </span>
          </article>
        ))}
      </div>
    </Root>
  );
}
