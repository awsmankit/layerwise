import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE, useDone } from '../viz/shared';
import { useStore, KEYS, readStore, type GameScores } from '../../lib/store';
import { withBase } from '../../lib/url';
import { shuffle } from '../../lib/interview';
import { decodeSnapshot, encodeSnapshot, mergeSnapshots, perItemKeys, type Snapshot } from '../../lib/transfer';
import type { QuizItem } from '../../data/lesson-extras';
import { paths, type PathId } from '../../data/paths';
import { labs } from '../../data/labs';

export type TrackInfo = { id: string; title: string; color: string; lessons: { key: string; title: string; href: string; level: string }[] };
type QuizBest = Record<string, { score: number; total: number }>;

const ALL_KEYS = Object.values(KEYS);

/**
 * Everything this browser knows about your learning, in one place:
 * lessons done, quiz scores, what to revise, games, and an export so you can
 * move it to another device or show a teacher.
 */
export default function ProgressPage({ tracks, quizzes }: { tracks: TrackInfo[]; quizzes: Record<string, QuizItem[]> }) {
  const { done } = useDone();
  const [quiz] = useStore<QuizBest>(KEYS.quiz, {});
  const [games] = useStore<GameScores>(KEYS.games, {});
  const [path] = useStore<PathId | null>(KEYS.path, null);
  const [labIds] = useStore<string[]>(KEYS.labs, []);
  const labsDone = labs.filter((l) => labIds.includes(l.id)).length;
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<Snapshot | null>(null);
  const [kept, setKept] = useState<boolean | null>(null);

  // a link made on another device carries its progress after the #; offer to add it, never apply it silently
  useEffect(() => {
    const m = window.location.hash.match(/^#restore=(.+)$/);
    if (m) decodeSnapshot(m[1]).then(setIncoming, () => setMsg('That restore link could not be read. Make a new one on the other device.'));
    navigator.storage?.persisted?.().then(setKept, () => setKept(null));
  }, []);

  const allLessons = tracks.flatMap((t) => t.lessons);
  const total = allLessons.length;
  const doneCount = allLessons.filter((l) => done.includes(l.key)).length;

  const revise = useMemo(
    () =>
      allLessons
        .filter((l) => quiz[l.key] && quiz[l.key].score < quiz[l.key].total)
        .map((l) => ({ ...l, ...quiz[l.key] }))
        .sort((a, b) => a.score / a.total - b.score / b.total),
    [allLessons, quiz],
  );
  const doneNoQuiz = allLessons.filter((l) => done.includes(l.key) && !quiz[l.key]);

  /* ---------- mixed review ---------- */
  const reviewPool = useMemo(() => {
    const keys = allLessons.filter((l) => done.includes(l.key) || quiz[l.key]).map((l) => l.key);
    return keys.flatMap((k) => (quizzes[k] ?? []).map((item, i) => ({ k, i, item })));
  }, [allLessons, done, quiz, quizzes]);
  const [round, setRound] = useState(0);
  const set = useMemo(() => shuffle(reviewPool, `review-${round}-${reviewPool.length}`).slice(0, 8), [reviewPool, round]);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const reviewScore = set.filter((x) => picked[`${x.k}:${x.i}`] === x.item.answer).length;
  const reviewDone = set.length > 0 && set.every((x) => picked[`${x.k}:${x.i}`] !== undefined);
  const titleOf = (k: string) => allLessons.find((l) => l.key === k);

  /* ---------- export and import ---------- */
  const exportData = () => {
    const data: Record<string, unknown> = { exportedAt: new Date().toISOString(), site: 'Layerwise' };
    for (const k of ALL_KEYS) data[k] = readStore(k, null);
    data['layerwise:interview'] = readStore('layerwise:interview', null);
    for (const k of perItemKeys(localStorage, true)) data[k] = readStore(k, null);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layerwise-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (data?.site !== 'Layerwise') throw new Error('not a Layerwise file');
      for (const [k, v] of Object.entries(data)) {
        if (k.startsWith('layerwise:') && v !== null) localStorage.setItem(k, JSON.stringify(v));
      }
      setMsg('Imported. Reloading…');
      window.setTimeout(() => window.location.reload(), 600);
    } catch {
      setMsg('That file could not be read. Choose a file exported from this page.');
    }
  };

  const snapshot = (): Snapshot => {
    const data: Snapshot = { exportedAt: new Date().toISOString(), site: 'Layerwise' };
    for (const k of ALL_KEYS) data[k] = readStore(k, null);
    data['layerwise:interview'] = readStore('layerwise:interview', null);
    for (const k of perItemKeys(localStorage, false)) data[k] = readStore(k, null);
    return data;
  };
  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#restore=${await encodeSnapshot(snapshot())}`;
    try {
      await navigator.clipboard.writeText(url);
      setMsg('Link copied. Open it on your other device and choose “Add it to this browser”. The link contains your progress, so share it only with yourself or a teacher.');
    } catch {
      setMsg('Your browser blocked copying. Use “Download my progress” instead.');
    }
  };
  const applyIncoming = () => {
    if (!incoming) return;
    const merged = mergeSnapshots(snapshot(), incoming);
    for (const [k, v] of Object.entries(merged)) if (k.startsWith('layerwise:') && v !== null) localStorage.setItem(k, JSON.stringify(v));
    window.history.replaceState(null, '', window.location.pathname);
    setMsg('Added. Reloading…');
    window.setTimeout(() => window.location.reload(), 500);
  };
  const dismissIncoming = () => {
    window.history.replaceState(null, '', window.location.pathname);
    setIncoming(null);
  };
  const keepData = async () => {
    try {
      const ok = (await navigator.storage?.persist?.()) ?? false;
      setKept(ok);
      setMsg(ok ? 'Your browser has agreed to keep your progress.' : 'Your browser declined. Download a backup now and then.');
    } catch {
      setMsg('This browser cannot do that. Download a backup now and then.');
    }
  };

  const gameRows = Object.entries(games).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Root>
      <div className="pg">
        <section className="pg-summary viz" aria-label="Summary">
          <div className="pg-big">
            <b className="num">{doneCount}</b>
            <span>of {total} lessons done</span>
          </div>
          <div className="pg-big">
            <b className="num">{Object.keys(quiz).length}</b>
            <span>quizzes taken</span>
          </div>
          <div className="pg-big">
            <b className="num">{gameRows.length}</b>
            <span>game levels played</span>
          </div>
          <div className="pg-big">
            <b className="num">{labsDone}</b>
            <span>of {labs.length} practice labs done</span>
          </div>
          <div className="pg-path">
            {path && paths[path] ? (
              <>
                <span>Your path</span>
                <a href={withBase(`/start/#${path}`)}>{paths[path].title}</a>
              </>
            ) : (
              <>
                <span>No path chosen yet</span>
                <a href={withBase('/start/')}>Choose one</a>
              </>
            )}
          </div>
        </section>

        <section aria-labelledby="pg-tracks">
          <h2 id="pg-tracks">By topic</h2>
          <ul className="pg-tracks">
            {tracks.map((t) => {
              const n = t.lessons.filter((l) => done.includes(l.key)).length;
              return (
                <li key={t.id} style={{ '--c': t.color } as React.CSSProperties}>
                  <a href={withBase(`/learn/${t.id}/`)}>{t.title}</a>
                  <span className="pg-bar">
                    <motion.span initial={false} animate={{ scaleX: t.lessons.length ? n / t.lessons.length : 0 }} transition={{ duration: 0.6, ease: EASE }} />
                  </span>
                  <span className="num">
                    {n}/{t.lessons.length}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="pg-revise">
          <h2 id="pg-revise">Worth revising</h2>
          {revise.length === 0 && doneNoQuiz.length === 0 ? (
            <p className="gm-note">Nothing yet. Lessons where your best quiz score was below full marks appear here, weakest first.</p>
          ) : (
            <ul className="rows">
              {revise.map((l) => (
                <li key={l.key}>
                  <a className="row pg-row" href={withBase(l.href)}>
                    <h3>{l.title}</h3>
                    <span className="meta num">
                      best {l.score}/{l.total}
                    </span>
                  </a>
                </li>
              ))}
              {doneNoQuiz.slice(0, 6).map((l) => (
                <li key={l.key}>
                  <a className="row pg-row" href={withBase(l.href)}>
                    <h3>{l.title}</h3>
                    <span className="meta">marked done, quiz not taken</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="pg-labs" className="viz">
          <h2 id="pg-labs">Practice labs</h2>
          <ul className="rows">
            {labs.map((l) => (
              <li key={l.id}>
                <a className="row pg-row" href={withBase(`/practice/${l.id}/`)}>
                  <h3>{labIds.includes(l.id) ? '✓ ' : ''}{l.title}</h3>
                  <span className="meta">{labIds.includes(l.id) ? 'done' : `about ${l.minutes} min`}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="pg-review" className="viz pg-review">
          <h2 id="pg-review">Mixed review</h2>
          {reviewPool.length === 0 ? (
            <p className="gm-note">Finish a lesson or take its quiz, and its questions join a mixed review here. Mixing topics helps memory more than repeating one lesson.</p>
          ) : (
            <>
              <p className="gm-note num">Eight questions drawn from {reviewPool.length} across the lessons you have done.</p>
              <ol className="qz-list">
                {set.map((x) => {
                  const id = `${x.k}:${x.i}`;
                  const p = picked[id];
                  const order = shuffle(
                    x.item.options.map((_, n) => n),
                    `${id}-${round}`,
                  );
                  return (
                    <li key={id}>
                      <p className="qz-q">{x.item.q}</p>
                      <div className="gm-options">
                        {order.map((o) => (
                          <button key={o} type="button" className={`gm-opt${p !== undefined && o === x.item.answer ? ' is-right' : ''}${p === o && o !== x.item.answer ? ' is-wrong' : ''}`} disabled={p !== undefined} onClick={() => setPicked((s) => ({ ...s, [id]: o }))}>
                            <span className="gm-opt-dot" aria-hidden="true" />
                            <span className="gm-opt-text">
                              <b>{x.item.options[o]}</b>
                            </span>
                          </button>
                        ))}
                      </div>
                      {p !== undefined && (
                        <p className={`qz-why${p === x.item.answer ? ' good' : ''}`}>
                          <b>{p === x.item.answer ? 'Right. ' : 'Not quite. '}</b>
                          {x.item.why}{' '}
                          {titleOf(x.k) && (
                            <a href={withBase(titleOf(x.k)!.href)}>From: {titleOf(x.k)!.title}</a>
                          )}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
              {reviewDone && (
                <div className="qz-foot">
                  <p>
                    <b className="num">
                      {reviewScore} of {set.length}
                    </b>{' '}
                    {reviewScore === set.length ? 'All correct.' : 'Follow the links on the ones you missed.'}
                  </p>
                  <button type="button" className="btn quiet" onClick={() => { setPicked({}); setRound((r) => r + 1); }}>
                    New set
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {gameRows.length > 0 && (
          <section aria-labelledby="pg-games">
            <h2 id="pg-games">Games</h2>
            <ul className="pg-games num">
              {gameRows.map(([k, r]) => (
                <li key={k}>
                  <span>{k.replace(':', ' · ').replace(/-/g, ' ')}</span>
                  <span>
                    best {r.best}
                    {r.stars ? ` · ${'★'.repeat(r.stars)}` : ''} · played {r.plays}×
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="pg-move" className="viz">
          <h2 id="pg-move">Move or share your progress</h2>
          <p className="gm-note">Progress lives only in this browser. Copy a link or download a file to move it to another device, keep a backup, or send it to a teacher. The file also carries the code you wrote in the labs. Nothing is uploaded anywhere.</p>
          {incoming && (
            <div className="gm-note" role="alert" style={{ border: '2px solid var(--signal)', borderRadius: 14, padding: '0.8rem 1rem', margin: '0.8rem 0' }}>
              <p style={{ margin: 0 }}>
                <b>This link carries progress from another browser</b>: {Array.isArray(incoming['layerwise:done']) ? (incoming['layerwise:done'] as unknown[]).length : 0} lessons done. Adding it keeps everything you have here and takes the best score for each quiz and game.
              </p>
              <div className="gm-result-actions" style={{ marginTop: '0.6rem' }}>
                <button type="button" className="btn" onClick={applyIncoming}>
                  Add it to this browser
                </button>
                <button type="button" className="btn quiet" onClick={dismissIncoming}>
                  Ignore it
                </button>
              </div>
            </div>
          )}
          <div className="gm-result-actions">
            <button type="button" className="btn" onClick={copyLink}>
              Copy a link to my progress
            </button>
            <button type="button" className="btn quiet" onClick={exportData}>
              Download my progress
            </button>
            <button type="button" className="btn quiet" onClick={() => fileRef.current?.click()}>
              Import a progress file
            </button>
            <button type="button" className="btn quiet" onClick={() => window.print()}>
              Print a summary
            </button>
            {kept === false && (
              <button type="button" className="btn quiet" onClick={keepData}>
                Ask my browser to keep it
              </button>
            )}
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          </div>
          {kept === true && <p className="gm-note">Your browser has agreed to keep this data, so it will not be cleared when storage runs low. Clearing site data by hand still removes it.</p>}
          {msg && (
            <p className="gm-note" role="status">
              {msg}
            </p>
          )}
        </section>
      </div>
    </Root>
  );
}
