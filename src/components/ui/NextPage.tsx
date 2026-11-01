import { useEffect, useMemo, useRef, useState } from 'react';
import { useDone } from '../viz/shared';
import { useStore, KEYS, type GameScores } from '../../lib/store';
import { withBase } from '../../lib/url';
import { paths, pathIds, type PathId } from '../../data/paths';
import { pathFromUrl } from '../../lib/certificate';
import { pathBackground, prereqClosure, planNext, suggestStartedPath, type Alternative, type Catalogue, type LabMeta, type LessonRef, type Plan } from '../../lib/next-up';

type TrackInfo = Record<string, { title: string; color: string; on: string }>;
type Goal = PathId | 'unsure';

const levelLabel = (l: string) => l.charAt(0).toUpperCase() + l.slice(1);
const cssVars = (color: string, on: string) => ({ '--c': color, '--on': on }) as React.CSSProperties;
const typeLabel = { lesson: 'Lesson', lab: 'Lab', game: 'Game' } as const;
const heading = { lighter: 'Or, if you want something lighter', 'hands-on': 'Or, if you want something more hands-on' } as const;

type Props = {
  catalogue: Catalogue;
  tracks: TrackInfo;
  labs: LabMeta[];
  /** Game href to the prefix its score keys start with, so a played game can be told apart. */
  gamePrefix: Record<string, string>;
};

/**
 * "What should I learn next?" The thin part: it reads what this browser has saved, asks
 * `planNext` (src/lib/next-up.ts) for the plan and draws it. The only thing it writes is the
 * learner's chosen path, which the path banner on lesson pages already reads.
 */
export default function NextPage({ catalogue, tracks, labs, gamePrefix }: Props) {
  const [saved, setSaved] = useStore<PathId | null>(KEYS.path, null);
  const { done } = useDone();
  const [labsDone] = useStore<string[]>(KEYS.labs, []);
  const [games] = useStore<GameScores>(KEYS.games, {});
  const [ready, setReady] = useState(false);
  const [urlGoal, setUrlGoal] = useState<PathId | null>(null);
  const [choice, setChoice] = useState<Goal | null>(null);
  const [changing, setChanging] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  // Nothing is drawn from storage until the first client render has read it, so a returning
  // learner never sees the empty state flash by.
  useEffect(() => {
    setUrlGoal(pathFromUrl(window.location.hash, window.location.search));
    setReady(true);
  }, []);

  const savedGoal = saved && paths[saved] ? saved : null;
  const goal: Goal | null = choice ?? urlGoal ?? savedGoal;
  const pathId = goal && goal !== 'unsure' ? goal : null;

  const playedGames = useMemo(
    () => Object.entries(gamePrefix).filter(([, prefix]) => Object.keys(games ?? {}).some((k) => k.startsWith(`${prefix}:`))).map(([href]) => href),
    [gamePrefix, games],
  );
  const doneList = useMemo(() => (Array.isArray(done) ? done : []), [done]);

  const plan: Plan | null = useMemo(
    () => (pathId ? planNext({ pathId, done: doneList, catalogue, labs, labsDone: Array.isArray(labsDone) ? labsDone : [], playedGames, known }) : null),
    [pathId, doneList, catalogue, labs, labsDone, playedGames, known],
  );

  // After a new goal is picked, move focus to the result so a keyboard or screen reader user lands on it.
  useEffect(() => {
    if (moveFocus.current && plan) {
      moveFocus.current = false;
      resultRef.current?.focus();
    }
  }, [plan]);

  const choose = (g: Goal) => {
    setChoice(g);
    setKnown([]);
    setChanging(false);
    if (g !== 'unsure') {
      setSaved(g);
      moveFocus.current = true;
    }
  };

  if (!ready) {
    return (
      <div className="nx" aria-busy="true">
        <p className="nx-loading">Loading what this browser has saved…</p>
      </div>
    );
  }

  const pickerOpen = changing || goal === null || goal === 'unsure';
  const started = suggestStartedPath(doneList);
  const here = pathId ? paths[pathId] : null;

  const status = !plan
    ? ''
    : plan.complete
      ? `You have finished ${here!.title}.`
      : plan.next
        ? `${plan.next.detourFor ? 'Do this first' : 'Next lesson'}: ${plan.next.title}, ${plan.next.minutes} minute read.`
        : '';

  return (
    <div className="nx">
      <section className="nx-goal" aria-labelledby="nx-goal-h">
        <h2 id="nx-goal-h">Your goal</h2>
        {pickerOpen ? (
          <>
            <p className="nx-hint">Pick the one that sounds most like you. Your choice is saved in this browser, and the path bar on lesson pages follows it.</p>
            <div className="nx-opts" role="radiogroup" aria-labelledby="nx-goal-h">
              {pathIds.map((id) => {
                const p = paths[id];
                const on = goal === id;
                return (
                  <label key={id} className={`nx-opt${on ? ' is-on' : ''}`} style={cssVars(p.color, p.on)}>
                    <input type="radio" name="nx-goal" value={id} checked={on} onChange={() => choose(id)} />
                    <span className="nx-opt-dot" aria-hidden="true">{on ? '✓' : ''}</span>
                    <span className="nx-opt-text">
                      <b>{p.title}</b>
                      <small>{p.short}</small>
                    </span>
                    {savedGoal === id && <em className="nx-tag">Chosen before</em>}
                  </label>
                );
              })}
              <label className={`nx-opt nx-opt-unsure${goal === 'unsure' ? ' is-on' : ''}`}>
                <input type="radio" name="nx-goal" value="unsure" checked={goal === 'unsure'} onChange={() => choose('unsure')} />
                <span className="nx-opt-dot" aria-hidden="true">{goal === 'unsure' ? '✓' : '?'}</span>
                <span className="nx-opt-text">
                  <b>I am not sure yet</b>
                  <small>Take a short check instead</small>
                </span>
              </label>
            </div>
          </>
        ) : (
          here && (
            <div className="nx-now" style={cssVars(here.color, here.on)}>
              <span className="nx-opt-dot" aria-hidden="true">✓</span>
              <span className="nx-opt-text">
                <b>{here.title}</b>
                <small>{here.short}</small>
              </span>
              <button type="button" className="btn quiet" onClick={() => setChanging(true)}>
                Change goal
              </button>
            </div>
          )
        )}
      </section>

      <p className="nx-sr" role="status">{status}</p>

      {goal === 'unsure' && (
        <section className="nx-unsure" aria-labelledby="nx-unsure-h">
          <h2 id="nx-unsure-h">Not sure? Take the check.</h2>
          <p>Six short questions, no pressure, and “I don’t know yet” is a fine answer. It suggests a path, and you can come back here for your first lesson.</p>
          <p>
            <a className="btn" href={withBase('/start/#check')}>
              Take the six-question check
            </a>
          </p>
          {started && (
            <p className="nx-started">
              You have already started “{paths[started].title}”.{' '}
              <button type="button" className="nx-textbtn" onClick={() => choose(started)}>
                Use it as my goal
              </button>
            </p>
          )}
        </section>
      )}

      {plan && here && (
        <div ref={resultRef} tabIndex={-1} className="nx-result" style={cssVars(here.color, here.on)} aria-labelledby="nx-result-h">
          <h2 id="nx-result-h" className="nx-result-h">
            {plan.complete ? 'You have finished this path' : plan.next?.detourFor ? 'Do this first' : 'Your next lesson'}
          </h2>

          <div className="nx-progress">
            <p className="nx-progress-text">
              <b className="num">
                {plan.progress.done} of {plan.progress.total} lessons
              </b>{' '}
              on “{here.title}”
            </p>
            <div className="nx-bar" role="progressbar" aria-label={`${here.title}: lessons done`} aria-valuemin={0} aria-valuemax={plan.progress.total} aria-valuenow={plan.progress.done} aria-valuetext={`${plan.progress.done} of ${plan.progress.total} lessons`}>
              <span className="nx-bar-fill" style={{ width: `${plan.progress.total ? (plan.progress.done / plan.progress.total) * 100 : 0}%` }} />
            </div>
          </div>

          {plan.background && (
            <p className="nx-note">
              This path takes “{paths[plan.background.pathId].title}” as known, and you have done {plan.background.done} of {plan.background.total} of it.{' '}
              <a href={withBase(`/start/#${plan.background.pathId}`)}>See that path</a> if any of it is new to you.
            </p>
          )}

          {plan.complete ? (
            <article className="nx-card nx-done">
              <div className="nx-card-body">
                <p className="nx-kicker">Path complete</p>
                <h3>Every lesson on “{here.title}” is done.</h3>
                <p className="nx-why">Your certificate is ready, and the work you have done here is saved only in this browser.</p>
                <div className="nx-actions">
                  <a className="btn" href={withBase(`/certificate/#${here.id}`)}>
                    Get your certificate
                  </a>
                  {plan.followOn && (
                    <button type="button" className="btn quiet" onClick={() => choose(plan.followOn!)}>
                      Next goal: {paths[plan.followOn].title}
                    </button>
                  )}
                </div>
                {!plan.followOn && (
                  <p className="nx-note">
                    There is no path after this one. <a href={withBase('/start/')}>Pick another goal</a> above, or <a href={withBase('/learn/')}>browse every lesson</a>.
                  </p>
                )}
              </div>
            </article>
          ) : (
            plan.next && <NextCard plan={plan} tracks={tracks} known={known} setKnown={setKnown} catalogue={catalogue} pathId={here.id} done={doneList} />
          )}

          {plan.alternatives.length > 0 && (
            <section className="nx-alts" aria-label="Other ways to carry on">
              {plan.alternatives.map((a) => (
                <AltCard key={a.kind} alt={a} />
              ))}
            </section>
          )}

          {plan.recent.length > 0 && (
            <section className="nx-sec" aria-labelledby="nx-recent-h">
              <h3 id="nx-recent-h">Just finished</h3>
              <ul className="nx-recent">
                {plan.recent.map((r) => (
                  <li key={r.key} style={cssVars(tracks[r.track]?.color ?? 'var(--signal)', tracks[r.track]?.on ?? '#fff')}>
                    <span className="nx-tick" aria-hidden="true">✓</span>
                    <a href={withBase(r.href)}>{r.title}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="nx-sec" aria-labelledby="nx-gap-h">
            <h3 id="nx-gap-h">Fill a gap</h3>
            {plan.gaps.length > 0 ? (
              <>
                <p className="nx-hint">Lessons your next steps build on that are not marked done. Skip any you already know.</p>
                <ul className="nx-gaps">
                  {plan.gaps.map((g) => (
                    <GapItem key={g.key} g={g} tracks={tracks} />
                  ))}
                </ul>
              </>
            ) : (
              <p className="nx-hint">No gaps. Everything your next steps build on is marked done.</p>
            )}
          </section>
        </div>
      )}

      {!goal && (
        <p className="nx-hint nx-empty">
          Pick a goal above and this page will suggest one lesson to start with. Lessons you mark as done on the lesson pages shape what it suggests next.
        </p>
      )}
    </div>
  );
}

function NextCard({ plan, tracks, known, setKnown, catalogue, pathId, done }: { plan: Plan; tracks: TrackInfo; known: string[]; setKnown: (k: string[]) => void; catalogue: Catalogue; pathId: PathId; done: string[] }) {
  const n = plan.next!;
  const t = tracks[n.track] ?? { title: n.track, color: 'var(--signal)', on: '#fff' };
  const moreBackground = n.detourFor ? prereqClosure([...(plan.progress.done === 0 ? pathBackground(pathId, catalogue) : []), n.detourFor.key], catalogue).filter((k) => k !== n.detourFor!.key).filter((k) => k !== n.key && !known.includes(k) && !done.includes(k)) : [];
  return (
    <article className="nx-card" style={cssVars(t.color, t.on)}>
      <div className="nx-card-band">
        <span>{t.title}</span>
        <span className="num">
          {levelLabel(n.level)} · {n.minutes} min read
        </span>
      </div>
      <div className="nx-card-body">
        <p className="nx-kicker">{n.detourFor ? 'Do this first' : 'Next lesson'}</p>
        <h3>{n.title}</h3>
        <p className="nx-why">
          <b>Why it is next.</b> {n.reason}
        </p>
        {n.prereqs.length === 0 ? (
          <p className="nx-prereq">
            <b>Prerequisites.</b> None. You can start now.
          </p>
        ) : n.unmet.length === 0 ? (
          <p className="nx-prereq">
            <b>Prerequisites met.</b>{' '}
            {n.prereqs.map((p, i) => (
              <span key={p.key}>
                {i > 0 && ', '}
                <span aria-hidden="true">✓ </span>
                <a href={withBase(p.href)}>{p.title}</a>
              </span>
            ))}
          </p>
        ) : (
          <p className="nx-prereq nx-prereq-warn">
            <b>Not all prerequisites are met.</b> This lesson builds on{' '}
            {n.unmet.map((p, i) => (
              <span key={p.key}>
                {i > 0 && ', '}
                <a href={withBase(p.href)}>{p.title}</a>
              </span>
            ))}
            , so read {n.unmet.length === 1 ? 'that' : 'those'} first, or expect it to be harder.
          </p>
        )}
        <div className="nx-actions">
          <a className="btn" href={withBase(n.href)}>
            {n.detourFor ? 'Start this lesson' : 'Start the lesson'}
          </a>
          {n.detourFor && (
            <button type="button" className="btn quiet" onClick={() => setKnown([...known, n.key])}>
              I already know this
            </button>
          )}
          {n.detourFor && moreBackground.length > 0 && (
            <button type="button" className="btn quiet" onClick={() => setKnown([...known, n.key, ...moreBackground])}>
              I know all of what this builds on
            </button>
          )}
        </div>
        {n.detourFor && <p className="nx-small">The “know” buttons only change this page. They do not mark anything as done.</p>}
        {plan.carryOn && (
          <p className="nx-small">
            Rather skip ahead? <a href={withBase(plan.carryOn.href)}>Carry on with “{plan.carryOn.title}”</a>, which comes after your last finished lesson.
          </p>
        )}
      </div>
    </article>
  );
}

function AltCard({ alt }: { alt: Alternative }) {
  return (
    <article className="nx-alt">
      <p className="nx-kicker">{heading[alt.kind]}</p>
      <h3>
        <a href={withBase(alt.href)}>{alt.title}</a>
      </h3>
      <p className="nx-alt-meta">
        <span className="nx-badge">{typeLabel[alt.type]}</span>
        {alt.minutes !== null && <span className="num">{alt.minutes} min</span>}
      </p>
      <p className="nx-small">{alt.note}</p>
    </article>
  );
}

function GapItem({ g, tracks }: { g: LessonRef & { why: string }; tracks: TrackInfo }) {
  const t = tracks[g.track];
  return (
    <li style={cssVars(t?.color ?? 'var(--signal)', t?.on ?? '#fff')}>
      <span className="nx-gap-dot" aria-hidden="true" />
      <span>
        <a href={withBase(g.href)}>{g.title}</a>
        <small>
          {g.why} {g.minutes} min read.
        </small>
      </span>
    </li>
  );
}
