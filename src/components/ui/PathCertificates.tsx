import { useEffect } from 'react';
import { motion } from 'motion/react';
import { EASE, useDone } from '../viz/shared';
import { paths, pathIds } from '../../data/paths';
import { pathCompletion, stampCompletions } from '../../lib/certificate';
import { withBase } from '../../lib/url';

/**
 * One card per learning path: unlocked with a link to its certificate once every lesson
 * in it is done, otherwise how far along it is. Used on /progress/ and on /certificate/
 * when no path is named.
 */
export default function PathCertificates({ headingId = 'pg-certs', heading = 'Certificates' }: { headingId?: string; heading?: string }) {
  const { done } = useDone();
  // paths finished before certificates existed get their date the first time they are seen
  useEffect(() => {
    if (done.length) stampCompletions(done);
  }, [done]);

  return (
    <section aria-labelledby={headingId} className="cert-list-wrap">
      <h2 id={headingId}>{heading}</h2>
      <p className="gm-note">Finish every lesson in a path to unlock its certificate. Games are optional. Your name and progress stay in this browser.</p>
      <ul className="cert-list">
        {pathIds.map((id) => {
          const p = paths[id];
          const c = pathCompletion(id, done);
          return (
            <li key={id} className={`cert-card${c.complete ? ' is-unlocked' : ''}`} style={{ '--c': p.color, '--on': p.on } as React.CSSProperties}>
              <span className="cert-card-seal" aria-hidden="true">
                {c.complete ? '✓' : `${c.done}/${c.total}`}
              </span>
              <div className="cert-card-body">
                <b>{p.title}</b>
                {c.complete ? (
                  <span className="cert-card-meta">All {c.total} lessons done. Certificate unlocked.</span>
                ) : (
                  <>
                    <span className="cert-card-meta num">
                      {c.done} of {c.total} lessons done
                    </span>
                    <span className="pg-bar" aria-hidden="true">
                      <motion.span initial={false} animate={{ scaleX: c.total ? c.done / c.total : 0 }} transition={{ duration: 0.6, ease: EASE }} />
                    </span>
                  </>
                )}
              </div>
              {c.complete ? (
                <a className="btn" href={withBase(`/certificate/#${id}`)}>
                  Get your certificate
                </a>
              ) : (
                <a className="btn quiet" href={withBase(c.done ? `/certificate/#${id}` : `/start/#${id}`)}>
                  {c.done ? 'See what is left' : 'Start this path'}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
