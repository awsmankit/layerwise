import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';
import { cloudMap, providers, type Provider } from '../../data/cloud-map';

/** A translation table: the same job, named for each cloud. Pick a cloud to spotlight it, open a row for a tip. */
export default function ServiceMap() {
  const [focus, setFocus] = useState<Provider | 'all'>('all');
  const [open, setOpen] = useState<string | null>('models');

  return (
    <Root>
      <div className="viz sm">
        <div className="sm-filters" role="group" aria-label="Spotlight a cloud">
          <button type="button" className={`tc-tab${focus === 'all' ? ' is-active' : ''}`} aria-pressed={focus === 'all'} onClick={() => setFocus('all')}>
            All three
          </button>
          {providers.map((p) => (
            <button key={p.id} type="button" className={`tc-tab${focus === p.id ? ' is-active' : ''}`} aria-pressed={focus === p.id} onClick={() => setFocus(p.id)}>
              <i className="sm-dot" style={{ background: p.color }} />
              {p.name}
            </button>
          ))}
        </div>

        <div className="sm-grid" role="table" aria-label="Cloud AI services by job">
          <div className="sm-head" role="row">
            <span role="columnheader">The job</span>
            {providers.map((p) => (
              <span key={p.id} role="columnheader" className={focus !== 'all' && focus !== p.id ? 'dim' : ''} style={{ '--c': p.color } as React.CSSProperties}>
                <i className="sm-dot" style={{ background: p.color }} />
                {p.name}
              </span>
            ))}
          </div>
          {cloudMap.map((row) => {
            const isOpen = open === row.id;
            return (
              <div key={row.id} className={`sm-row${isOpen ? ' is-open' : ''}`} role="row">
                <button type="button" className="sm-job" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : row.id)} role="rowheader">
                  <span>{row.job}</span>
                  <span className="sx-plus" aria-hidden="true" />
                </button>
                {providers.map((p) => (
                  <span key={p.id} role="cell" data-p={p.name} className={`sm-cell${focus !== 'all' && focus !== p.id ? ' dim' : ''}${focus === p.id ? ' spot' : ''}`} style={{ '--c': p.color } as React.CSSProperties}>
                    {row.names[p.id]}
                  </span>
                ))}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div className="sm-detail" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                      <div>
                        <p>
                          <b>What it is.</b> {row.means}
                        </p>
                        <p>
                          <b>Worth knowing.</b> {row.tip}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        <p className="viz-cap">
          Names checked in October 2026. Cloud product names change often (Azure AI Foundry became Microsoft Foundry, and Vertex AI is being succeeded by the Gemini Enterprise Agent Platform), so confirm in each provider’s current documentation before designing around one.
        </p>
      </div>
    </Root>
  );
}
