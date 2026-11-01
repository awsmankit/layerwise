import { useEffect, useState } from 'react';
import { withBase } from '../../lib/url';
import { counts, nextDueDay, daysBetween, parseId, pickSession, streak } from '../../lib/review';
import ReviewQuestion from './ReviewQuestion';
import { useReview } from './useReview';

type Mode = { kind: 'question'; id: string } | { kind: 'underway' } | { kind: 'caught-up' };

/** "Today's question" for the home page: one question, with a link to the daily five. Shows nothing until a lesson is finished. */
export default function DailyCard() {
  const r = useReview();
  const [mode, setMode] = useState<Mode | null>(null);
  const [answered, setAnswered] = useState(false);

  // decided once, when the questions have loaded, so the card does not change under the reader's finger
  useEffect(() => {
    if (mode || !r.ready || !r.loaded || r.pool.length === 0) return;
    if (r.state.days.includes(r.today)) return setMode({ kind: 'underway' });
    const [id] = pickSession(r.pool, r.state, r.today, 1);
    setMode(id ? { kind: 'question', id } : { kind: 'caught-up' });
  }, [mode, r.ready, r.loaded, r.pool, r.state, r.today]);

  if (!mode || r.pool.length === 0) return <></>;

  const c = counts(r.pool, r.state, r.today);
  const s = streak(r.state.days, r.today);
  const next = nextDueDay(r.pool, r.state, r.today);
  const item = mode.kind === 'question' ? r.item(mode.id) : null;
  const p = mode.kind === 'question' ? parseId(mode.id) : null;

  return (
    <section className="rv-daily wrap" aria-labelledby="rv-daily-h">
      <div className="rv-daily-card">
        <div className="rv-daily-head">
          <h2 id="rv-daily-h">Today’s question</h2>
          <p className="rv-daily-meta">
            <span>{c.due} due</span>
            <span>{c.fresh} new</span>
            {!r.state.hideStreak && s.count > 0 && <span>{s.count} {s.count === 1 ? 'day' : 'days'} in a row</span>}
          </p>
        </div>
        {mode.kind === 'question' && item && p ? (
          <ReviewQuestion item={item} seed={`${mode.id}:home:${r.today}`} lessonKey={p.key} onAnswer={(ok) => { r.answer(mode.id, ok); setAnswered(true); }}>
            <p className="rv-from">
              <a href={withBase('/review/')}>{answered ? 'Keep going with today’s five' : 'Do today’s five'}</a>
            </p>
          </ReviewQuestion>
        ) : mode.kind === 'underway' ? (
          <p className="rv-lead">
            You have answered a question today. {c.due > 0 ? `${c.due} more ${c.due === 1 ? 'is' : 'are'} due.` : c.fresh > 0 ? 'Nothing else is due, and new questions are waiting if you want them.' : 'Nothing else is due.'} <a href={withBase('/review/')}>Open daily review</a>
          </p>
        ) : (
          <p className="rv-lead">
            You are all caught up.{next ? ` The next question is due ${daysBetween(r.today, next) <= 1 ? 'tomorrow' : `in ${daysBetween(r.today, next)} days`}.` : ''} <a href={withBase('/review/')}>Open daily review</a>
          </p>
        )}
      </div>
    </section>
  );
}
