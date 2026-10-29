import { useEffect, useRef, useState } from 'react';
import { Root, useDone } from '../viz/shared';
import { useStore, KEYS } from '../../lib/store';
import { paths, type PathId } from '../../data/paths';
import { averageQuizScore, cleanName, formatDay, isoDay, pathCompletion, pathFromUrl, pathLessons, stampCompletions, type CertDates, type QuizBest } from '../../lib/certificate';
import { withBase } from '../../lib/url';
import CertificateArt, { useMeasure } from './CertificateArt';
import PathCertificates from './PathCertificates';

export type CertLessonInfo = Record<string, { title: string; href: string }>;

/**
 * /certificate/#<path>: the certificate for a finished learning path, with the learner's
 * name (typed here and kept in this browser only), a PNG download and a print view.
 * For a path that is not finished yet, the lessons still to do.
 */
export default function CertificatePage({ lessons }: { lessons: CertLessonInfo }) {
  const [pathId, setPathId] = useState<PathId | null>(null);
  const [ready, setReady] = useState(false);
  const { done } = useDone();
  const [loaded, setLoaded] = useState(false);
  const [quiz] = useStore<QuizBest>(KEYS.quiz, {});
  const [dates] = useStore<CertDates>(KEYS.certs, {});
  const [name, setName] = useStore<string>(KEYS.name, '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const measure = useMeasure();

  useEffect(() => {
    const read = () => setPathId(pathFromUrl(window.location.hash, window.location.search));
    read();
    setReady(true);
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  // useDone starts empty and fills in after mount; wait a frame so an unfinished state does not flash
  useEffect(() => {
    const t = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    if (done.length) stampCompletions(done);
  }, [done]);

  if (!ready || !loaded) return <Root><p className="gm-note cert-noprint">Loading your progress…</p></Root>;

  if (!pathId) {
    return (
      <Root>
        <div className="cert-page cert-noprint">
          <PathCertificates headingId="cert-choose" heading="Choose a path" />
        </div>
      </Root>
    );
  }

  const path = paths[pathId];
  const c = pathCompletion(pathId, done);
  const style = { '--c': path.color, '--on': path.on, '--track': path.color, '--on-track': path.on } as React.CSSProperties;

  if (!c.complete) {
    return (
      <Root>
        <div className="cert-page cert-noprint" style={style}>
          <section className="cert-left viz" aria-labelledby="cert-left-h">
            <h2 id="cert-left-h">
              Almost there: {c.total - c.done} {c.total - c.done === 1 ? 'lesson' : 'lessons'} to go
            </h2>
            <p>
              The certificate for <b>{path.title}</b> unlocks when every lesson in the path is done. Pass a lesson’s quiz (at least half right) or press its done button.
            </p>
            <div className="cert-left-progress">
              <span className="num">
                {c.done} of {c.total} lessons done
              </span>
              <span className="pg-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${c.total ? c.done / c.total : 0})` }} />
              </span>
            </div>
            <ol className="cert-left-list">
              {c.remaining.map((k) => (
                <li key={k}>
                  <a href={withBase(lessons[k]?.href ?? '/learn/')}>{lessons[k]?.title ?? k}</a>
                </li>
              ))}
            </ol>
            <div className="gm-result-actions">
              <a className="btn" href={withBase(lessons[c.remaining[0]]?.href ?? '/learn/')}>
                Do the next lesson
              </a>
              <a className="btn quiet" href={withBase(`/start/#${pathId}`)}>
                See the whole path
              </a>
            </div>
          </section>
        </div>
      </Root>
    );
  }

  const day = dates[pathId] ?? isoDay(new Date());
  const data = {
    name: cleanName(name),
    pathTitle: path.title,
    pathShort: path.short,
    promise: path.promise,
    color: path.color,
    on: path.on,
    lessons: c.total,
    date: formatDay(day),
    quiz: averageQuizScore(pathLessons(pathId), quiz),
    site: `${window.location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, ''),
  };
  const hasName = data.name.trim().length > 0;

  const download = async () => {
    if (!svgRef.current) return;
    setBusy(true);
    setMsg('');
    try {
      const { certificatePng, saveBlob } = await import('../../lib/cert-image');
      const png = await certificatePng(svgRef.current, 2);
      const slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      saveBlob(png, `layerwise-certificate-${pathId}${slug ? `-${slug}` : ''}.png`);
      setMsg('Saved. Look in your downloads.');
    } catch {
      setMsg('The image could not be made in this browser. Use “Print / save as PDF” instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Root>
      <div className="cert-page" style={style}>
        <div className="cert-controls cert-noprint">
          <label className="cert-name">
            <span>Your name, as it should appear</span>
            <input type="text" value={name} maxLength={60} autoComplete="name" placeholder="Type your name" onChange={(e) => setName(cleanName(e.target.value))} />
          </label>
          <p className="gm-note">Kept only in this browser. It is never sent anywhere.</p>
        </div>

        <figure className="cert-sheet">
          <CertificateArt ref={svgRef} {...data} measure={measure} className="cert-svg" />
        </figure>

        <div className="cert-controls cert-noprint">
          <div className="gm-result-actions">
            <button type="button" className="btn" onClick={download} disabled={!hasName || busy}>
              {busy ? 'Making the image…' : 'Download as image'}
            </button>
            <button type="button" className="btn quiet" onClick={() => window.print()} disabled={!hasName}>
              Print / save as PDF
            </button>
          </div>
          {!hasName && <p className="gm-note">Type your name above to download or print it.</p>}
          {msg && (
            <p className="gm-note" role="status">
              {msg}
            </p>
          )}
          <p className="gm-note cert-fine">
            Completed on Layerwise in this browser. Progress is self-reported and this is not an accredited qualification. Teachers: ask to see the student’s{' '}
            <a href={withBase('/progress/')}>progress page</a> or its downloaded file for the quiz scores behind it.
          </p>
          {path.next && (
            <p className="gm-note">
              Next: <a href={withBase(`/start/#${path.next}`)}>{paths[path.next].title}</a>
            </p>
          )}
        </div>
      </div>
    </Root>
  );
}
