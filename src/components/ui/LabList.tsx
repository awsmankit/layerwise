import type { CSSProperties } from 'react';
import { Root } from '../viz/shared';
import { Glyph } from '../viz/glyphs';
import { cardStyle } from '../../lib/color';
import { cycleSwatch } from '../../lib/palette';
import { withBase } from '../../lib/url';
import { KEYS, useStore } from '../../lib/store';

export type LabSummary = { id: string; title: string; level: string; minutes: number; goal: string; lessonTitle?: string };

const levelLabel: Record<string, string> = { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced' };

/** cardStyle() gives a style attribute string; React wants an object. */
const styleObject = (css: string): CSSProperties => Object.fromEntries(css.split(';').map((d) => d.split(':'))) as CSSProperties;

/** The labs as cards, with a tick on the ones this browser has finished. */
export default function LabList({ labs }: { labs: LabSummary[] }) {
  const [done] = useStore<string[]>(KEYS.labs, []);
  const count = labs.filter((l) => done.includes(l.id)).length;

  return (
    <Root>
      <p aria-live="polite" style={{ margin: '0 0 1rem', color: 'var(--ink-3)' }}>
        <b className="num" style={{ color: 'var(--ink)' }}>
          {count} of {labs.length}
        </b>{' '}
        labs done
        {count === 0 ? '. Start with the first one: it takes about ten minutes.' : '.'}
      </p>
      <div className="lp-grid lp-grid-3">
        {labs.map((l, i) => {
          const finished = done.includes(l.id);
          return (
            <a key={l.id} className="lp-card lp-card-col" href={withBase(`/practice/${l.id}/`)} style={styleObject(cardStyle(cycleSwatch(i)))}>
              <span className="lp-plate">
                <Glyph name={finished ? 'check' : 'pen'} size={30} />
              </span>
              <span className="lp-body">
                <h3>{l.title}</h3>
                <p>{l.goal.split(/(?<=\.)\s/)[0]}</p>
              </span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: 'auto' }}>
                <span className="lp-chip" style={{ marginTop: 0 }}>
                  {levelLabel[l.level] ?? l.level}
                </span>
                <span className="lp-chip" style={{ marginTop: 0 }}>
                  {l.minutes} min
                </span>
                {finished && (
                  <span className="lp-chip" style={{ marginTop: 0 }}>
                    ✓ Done
                  </span>
                )}
              </span>
            </a>
          );
        })}
      </div>
    </Root>
  );
}
