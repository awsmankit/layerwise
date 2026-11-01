import { useMemo, useState } from 'react';
import { Root } from '../viz/shared';
import { withBase } from '../../lib/url';
import { INTERVALS, MAX_BOX, SESSION_SIZE, addDays, boxCounts, counts, daysBetween, lastDays, nextDueDay, parseId, pickAhead, pickSession, streak, type ReviewState } from '../../lib/review';
import ReviewQuestion from './ReviewQuestion';
import { useReview } from './useReview';

type Run = { ids: string[]; pos: number; results: { id: string; correct: boolean }[]; nonce: number; ahead: boolean };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function when(today: string, day: string): string {
  const n = daysBetween(today, day);
  return n <= 1 ? 'tomorrow' : `in ${n} days`;
}

const dayName = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

/** The daily review page: counts, a session of up to five questions, a calm summary, and a forgiving streak. */
export default function ReviewPage({ titles }: { titles: Record<string, string> }) {
  const r = useReview(titles);
  const [run, setRun] = useState<Run | null>(null);
  const [finished, setFinished] = useState<Run | null>(null);
  const [nonce, setNonce] = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);

  const c = useMemo(() => counts(r.pool, r.state, r.today), [r.pool, r.state, r.today]);
  const boxes = useMemo(() => boxCounts(r.pool, r.state), [r.pool, r.state]);
  const next = useMemo(() => nextDueDay(r.pool, r.state, r.today), [r.pool, r.state, r.today]);

  const begin = (ahead: boolean) => {
    const ids = ahead ? pickAhead(r.pool, r.state, r.today) : pickSession(r.pool, r.state, r.today);
    if (ids.length === 0) return;
    setFinished(null);
    setRun({ ids, pos: 0, results: [], nonce: nonce, ahead });
    setNonce((n) => n + 1);
  };

  const record = (id: string, correct: boolean) => {
    r.answer(id, correct);
    setRun((cur) => (cur ? { ...cur, results: [...cur.results, { id, correct }] } : cur));
  };

  const advance = () => {
    if (!run) return;
    if (run.pos + 1 >= run.ids.length) {
      setFinished(run);
      setRun(null);
    } else setRun({ ...run, pos: run.pos + 1 });
  };

  const titleOf = (id: string) => {
    const p = parseId(id);
    return p ? titles[p.key] : undefined;
  };

  return (
    <Root>
      <div className="rv">
        {!r.ready || (r.hasLessons && !r.loaded && !r.failed) ? (
          <p className="rv-note" role="status">
            Loading your questions…
          </p>
        ) : r.failed ? (
          <p className="rv-note" role="status">
            The questions could not be loaded. Reload the page to try again.
          </p>
        ) : r.pool.length === 0 ? (
          <Empty />
        ) : run ? (
          <Session run={run} r={r} titleOf={titleOf} onAnswer={record} onNext={advance} />
        ) : finished ? (
          <Summary
            run={finished}
            state={r.state}
            today={r.today}
            titleOf={titleOf}
            more={pickSession(r.pool, r.state, r.today).length}
            onMore={() => begin(false)}
            onBack={() => setFinished(null)}
          />
        ) : (
          <>
            <Overview c={c} next={next} today={r.today} onStart={() => begin(false)} onAhead={() => begin(true)} canAhead={pickAhead(r.pool, r.state, r.today).length > 0} />
            <Boxes boxes={boxes} />
          </>
        )}

        {r.ready && r.pool.length > 0 && !run && <StreakPanel state={r.state} today={r.today} onToggle={r.setHideStreak} />}

        {r.ready && r.state.days.length + Object.keys(r.state.items).length > 0 && !run && (
          <section className="rv-section" aria-labelledby="rv-clear-h">
            <h2 id="rv-clear-h">Your review history</h2>
            <p className="rv-note">Saved only in this browser. It is included when you download or copy your progress from the progress page.</p>
            {confirmClear ? (
              <div className="rv-actions" role="group" aria-label="Confirm clearing the history">
                <button type="button" className="btn" onClick={() => { r.clear(); setConfirmClear(false); setFinished(null); }}>
                  Yes, clear it
                </button>
                <button type="button" className="btn quiet" onClick={() => setConfirmClear(false)}>
                  Keep it
                </button>
              </div>
            ) : (
              <button type="button" className="btn quiet" onClick={() => setConfirmClear(true)}>
                Clear my review history
              </button>
            )}
          </section>
        )}
      </div>
    </Root>
  );
}

function Empty() {
  return (
    <section className="rv-card rv-empty" aria-labelledby="rv-empty-h">
      <h2 id="rv-empty-h">Nothing to review yet</h2>
      <p>
        Daily review asks short questions from lessons you have finished, and brings each one back a little later so it sticks. When you mark a lesson as done, or pass its quiz, its questions join your review.
      </p>
      <p>Five questions a day is plenty. There are no scores and nothing is sent anywhere.</p>
      <div className="rv-actions">
        <a className="btn" href={withBase('/start/')}>
          Find your starting point
        </a>
        <a className="btn quiet" href={withBase('/learn/')}>
          Browse lessons
        </a>
      </div>
    </section>
  );
}

function Overview({ c, next, today, onStart, onAhead, canAhead }: { c: ReturnType<typeof counts>; next: string | null; today: string; onStart: () => void; onAhead: () => void; canAhead: boolean }) {
  const n = Math.min(SESSION_SIZE, c.due + c.fresh);
  return (
    <section className="rv-card" aria-labelledby="rv-today-h">
      <h2 id="rv-today-h">Today</h2>
      <ul className="rv-stats">
        <li>
          <b className="num">{c.due}</b>
          <span>due today</span>
        </li>
        <li>
          <b className="num">{c.fresh}</b>
          <span>new</span>
        </li>
        <li>
          <b className="num">{c.seen}</b>
          <span>of {c.total} started</span>
        </li>
      </ul>
      {n > 0 ? (
        <>
          <p className="rv-note">Questions that are due come first, then new ones from lessons you finished recently.</p>
          <div className="rv-actions">
            <button type="button" className="btn rv-go" onClick={onStart}>
              Start {n === 1 ? 'one question' : `${n} questions`}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="rv-lead">You are all caught up for today.{next ? ` The next question is due ${when(today, next)}.` : ''}</p>
          {canAhead && (
            <div className="rv-actions">
              <button type="button" className="btn quiet" onClick={onAhead}>
                Review ahead
              </button>
              <span className="rv-note">Five of the questions due soonest. A right answer still moves a question up.</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Boxes({ boxes }: { boxes: number[] }) {
  const max = Math.max(1, ...boxes);
  return (
    <section className="rv-section" aria-labelledby="rv-boxes-h">
      <h2 id="rv-boxes-h">How your questions are spaced</h2>
      <p className="rv-note">
        A question you get right comes back after {INTERVALS.slice(0, -1).join(', ')} and then {INTERVALS[MAX_BOX - 1]} days. One you miss comes back tomorrow. That is all there is to it.
      </p>
      <ol className="rv-boxes">
        {boxes.map((n, i) => (
          <li key={i}>
            <span className="rv-box-bar" aria-hidden="true">
              <span style={{ height: `${Math.round((n / max) * 100)}%` }} />
            </span>
            <b className="num">{n}</b>
            <span className="rv-box-label">
              Box {i + 1}
              <small>every {INTERVALS[i]} {INTERVALS[i] === 1 ? 'day' : 'days'}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Session({ run, r, titleOf, onAnswer, onNext }: { run: Run; r: ReturnType<typeof useReview>; titleOf: (id: string) => string | undefined; onAnswer: (id: string, correct: boolean) => void; onNext: () => void }) {
  const id = run.ids[run.pos];
  const item = r.item(id);
  const p = parseId(id);
  const answered = run.results.some((x) => x.id === id);
  if (!item || !p) return null;
  const last = run.pos + 1 >= run.ids.length;
  return (
    <section className="rv-card" aria-labelledby="rv-run-h">
      <div className="rv-run-head">
        <h2 id="rv-run-h">
          Question {run.pos + 1} of {run.ids.length}
        </h2>
        <ol className="rv-steps" aria-hidden="true">
          {run.ids.map((x, i) => (
            <li key={x} className={i < run.pos || (i === run.pos && answered) ? 'is-done' : i === run.pos ? 'is-now' : ''} />
          ))}
        </ol>
      </div>
      <ReviewQuestion key={`${id}:${run.nonce}`} item={item} seed={`${id}:${run.nonce}`} lessonKey={p.key} lessonTitle={titleOf(id)} onAnswer={(ok) => onAnswer(id, ok)}>
        <div className="rv-actions">
          <button type="button" className="btn" autoFocus onClick={onNext}>
            {last ? 'Finish' : 'Next question'}
          </button>
        </div>
      </ReviewQuestion>
    </section>
  );
}

function Summary({ run, state, today, titleOf, more, onMore, onBack }: { run: Run; state: ReviewState; today: string; titleOf: (id: string) => string | undefined; more: number; onMore: () => void; onBack: () => void }) {
  const right = run.results.filter((x) => x.correct).length;
  const missed = run.results.filter((x) => !x.correct);
  const s = streak(state.days, today);
  return (
    <section className="rv-card" aria-labelledby="rv-sum-h">
      <h2 id="rv-sum-h">That is today’s review done</h2>
      <p className="rv-lead" role="status">
        You answered {plural(run.results.length, 'question')}. {right === run.results.length ? 'Every one was right, so each moves up a box.' : `${right} moved up a box. ${plural(missed.length, 'other')} will come back tomorrow, which is how they stick.`}
      </p>
      {missed.length > 0 && (
        <>
          <h3 className="rv-sub">Coming back tomorrow</h3>
          <ul className="rv-missed">
            {missed.map((m) => {
              const p = parseId(m.id)!;
              return (
                <li key={m.id}>
                  <a href={withBase(`/learn/${p.key}/`)}>{titleOf(m.id) ?? p.key}</a>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {!state.hideStreak && s.count > 0 && <p className="rv-note">Your run is {plural(s.count, 'day')}.</p>}
      <div className="rv-actions">
        {more > 0 ? (
          <button type="button" className="btn rv-go" onClick={onMore}>
            Do {more >= SESSION_SIZE ? SESSION_SIZE : more} more
          </button>
        ) : (
          <span className="rv-note">Nothing else is due today. Come back tomorrow, or whenever you like.</span>
        )}
        <button type="button" className="btn quiet" onClick={onBack}>
          Back to the overview
        </button>
      </div>
    </section>
  );
}

function StreakPanel({ state, today, onToggle }: { state: ReviewState; today: string; onToggle: (hide: boolean) => void }) {
  const hidden = !!state.hideStreak;
  const s = streak(state.days, today);
  const dots = lastDays(state.days, today);
  return (
    <section className="rv-section" aria-labelledby="rv-streak-h">
      <div className="rv-streak-head">
        <h2 id="rv-streak-h">Your run</h2>
        <label className="rv-switch">
          <input type="checkbox" role="switch" checked={!hidden} onChange={(e) => onToggle(!e.target.checked)} />
          <span className="rv-switch-track" aria-hidden="true" />
          <span>Show my streak</span>
        </label>
      </div>
      {hidden ? (
        <p className="rv-note">The streak is hidden. Your answers are still saved and spaced as usual.</p>
      ) : (
        <>
          <p className="rv-lead">
            {s.count === 0 ? 'Answer a question whenever you like and a run starts.' : `${plural(s.count, 'day')} so far.`}{' '}
            <span className="rv-note">One rest day each week does not break it.{s.restUsed ? ' This week’s rest day is already counted.' : ''}</span>
          </p>
          <ol className="rv-dots" aria-label="The last 14 days">
            {dots.map((d) => (
              <li key={d.day} className={`rv-dot${d.active ? ' is-on' : ''}${d.isToday ? ' is-today' : ''}`}>
                <span className="rv-dot-mark" aria-hidden="true" />
                <span className="sr-only">
                  {dayName(d.day)}: {d.active ? 'answered a question' : 'no questions'}
                  {d.isToday ? ' (today)' : ''}
                </span>
              </li>
            ))}
          </ol>
          <p className="rv-legend" aria-hidden="true">
            <span className="rv-dot is-on"><span className="rv-dot-mark" /></span> answered
            <span className="rv-dot"><span className="rv-dot-mark" /></span> no questions
            <span className="rv-legend-end">{dayName(addDays(today, -13)).split(' ').slice(1).join(' ')} to today</span>
          </p>
        </>
      )}
    </section>
  );
}
