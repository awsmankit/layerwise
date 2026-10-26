import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from '../viz/shared';
import { useStore } from '../../lib/store';
import { withBase } from '../../lib/url';
import { suggestScore, suitable } from '../../lib/interview';
import { questions, roles, ilevels, kinds, rubric, type Question, type Role, type ILevel, type Kind } from '../../data/interview';
import Timer from './Timer';

type Attempt = { score: number; at: number };
type History = Record<string, Attempt[]>;
const HISTORY = 'layerwise:interview';

export type LessonIndex = Record<string, { title: string; href: string }>;

function pickNext(pool: Question[], history: History, avoid?: string): Question | undefined {
  if (pool.length === 0) return undefined;
  // never practised first, then the weakest, then the least recent
  const rank = (q: Question) => {
    const h = history[q.id];
    if (!h || h.length === 0) return -1;
    const last = h[h.length - 1];
    return last.score * 1e13 + last.at;
  };
  const sorted = [...pool].filter((q) => q.id !== avoid).sort((a, b) => rank(a) - rank(b));
  const head = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
  return head[Math.floor(Math.random() * head.length)] ?? pool[0];
}

export default function Practice({ lessons, initialId }: { lessons: LessonIndex; initialId?: string }) {
  const [history, setHistory] = useStore<History>(HISTORY, {});
  const [role, setRole] = useState<Role | 'any'>('any');
  const [level, setLevel] = useState<ILevel | 'any'>('any');
  const [kind, setKind] = useState<Kind | 'any'>('any');
  const [q, setQ] = useState<Question | null>(null);
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState<'answer' | 'check' | 'done'>('answer');
  const [ticked, setTicked] = useState<boolean[]>([]);
  const [shownFollow, setShownFollow] = useState(0);
  const [followGood, setFollowGood] = useState<boolean[]>([]);
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const pool = useMemo(() => questions.filter((x) => suitable(x, role, level) && (kind === 'any' || x.kind === kind)), [role, level, kind]);

  const start = (next: Question | undefined) => {
    if (!next) return;
    setQ(next);
    setNotes('');
    setStage('answer');
    setTicked(next.strong.map(() => false));
    setShownFollow(0);
    setFollowGood(next.followUps.map(() => false));
    setFlagged(next.redFlags.map(() => false));
    setScore(null);
  };

  useEffect(() => {
    const id = initialId ?? new URLSearchParams(window.location.search).get('q');
    const found = id ? questions.find((x) => x.id === id) : undefined;
    if (found) start(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const covered = ticked.filter(Boolean).length;
  const suggested = q ? suggestScore(covered, q.strong.length, followGood.filter(Boolean).length, flagged.some(Boolean)) : 1;

  const save = (s: number) => {
    if (!q) return;
    setScore(s);
    setHistory((h) => ({ ...h, [q.id]: [...(h[q.id] ?? []), { score: s, at: Date.now() }] }));
    setStage('done');
  };

  const practised = Object.keys(history).length;
  const weak = Object.entries(history).filter(([, a]) => a[a.length - 1]?.score <= 2).map(([id]) => id);

  return (
    <Root>
      <div className="iv">
        <section className="iv-setup viz" aria-label="Choose questions">
          <div className="viz-controls">
            <label className="field">
              <span>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role | 'any')}>
                <option value="any">Any role</option>
                {Object.entries(roles).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Level</span>
              <select value={level} onChange={(e) => setLevel(e.target.value as ILevel | 'any')}>
                <option value="any">Any level</option>
                {Object.entries(ilevels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Kind of question</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as Kind | 'any')}>
                <option value="any">Any kind</option>
                {Object.entries(kinds).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="iv-setup-foot">
            <p className="gm-note num">
              {pool.length} matching question{pool.length === 1 ? '' : 's'}. Practised so far: {practised}
              {weak.length > 0 && <>, {weak.length} marked for another go</>}. Unpractised and weak questions come up first.
            </p>
            <button type="button" className="btn" onClick={() => start(pickNext(pool, history, q?.id))} disabled={pool.length === 0}>
              {q ? 'Next question' : 'Give me a question'}
            </button>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {q && (
            <motion.article key={q.id} className="iv-q" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <p className="iv-meta">
                <span className={`iv-chip k-${q.kind}`}>{kinds[q.kind]}</span>
                <span className="iv-chip">{ilevels[q.level]}</span>
                <span className="iv-chip num">{q.minutes} min</span>
                {q.topics.map((t) => (
                  <span key={t} className="iv-tag">
                    {t}
                  </span>
                ))}
              </p>
              <h2 className="iv-prompt">{q.prompt}</h2>

              {stage === 'answer' && (
                <div className="iv-answer">
                  <Timer minutes={q.minutes} />
                  <label className="iv-notes">
                    <span>Your answer or notes (kept only on this page; not sent anywhere)</span>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} placeholder="Answer out loud, or jot the points you would make. Then check yourself." />
                  </label>
                  <button type="button" className="btn" onClick={() => setStage('check')}>
                    Check my answer
                  </button>
                </div>
              )}

              {stage !== 'answer' && (
                <div className="iv-check">
                  <h3>What a strong answer covers</h3>
                  <p className="gm-note">Tick the points you made, honestly.</p>
                  <ul className="iv-list">
                    {q.strong.map((p, i) => (
                      <li key={p}>
                        <label className={ticked[i] ? 'on' : ''}>
                          <input type="checkbox" checked={ticked[i] ?? false} disabled={stage === 'done'} onChange={(e) => setTicked((t) => t.map((v, k) => (k === i ? e.target.checked : v)))} />
                          <span>{p}</span>
                        </label>
                      </li>
                    ))}
                  </ul>

                  <h3>Follow-ups an interviewer would ask</h3>
                  <ol className="iv-follow">
                    {q.followUps.slice(0, shownFollow).map((f, i) => (
                      <motion.li key={f.q} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                        <b>{f.q}</b>
                        <p>
                          <span>Look for:</span> {f.lookFor}
                        </p>
                        <label className={followGood[i] ? 'on' : ''}>
                          <input type="checkbox" checked={followGood[i] ?? false} disabled={stage === 'done'} onChange={(e) => setFollowGood((t) => t.map((v, k) => (k === i ? e.target.checked : v)))} />
                          <span>I could answer this</span>
                        </label>
                      </motion.li>
                    ))}
                  </ol>
                  {shownFollow < q.followUps.length && (
                    <button type="button" className="btn quiet" onClick={() => setShownFollow((n) => n + 1)}>
                      {shownFollow === 0 ? 'Show the first follow-up' : 'Show the next follow-up'}
                    </button>
                  )}

                  <h3>Red flags</h3>
                  <p className="gm-note">Did your answer include any of these?</p>
                  <ul className="iv-list flags">
                    {q.redFlags.map((f, i) => (
                      <li key={f}>
                        <label className={flagged[i] ? 'on' : ''}>
                          <input type="checkbox" checked={flagged[i] ?? false} disabled={stage === 'done'} onChange={(e) => setFlagged((t) => t.map((v, k) => (k === i ? e.target.checked : v)))} />
                          <span>{f}</span>
                        </label>
                      </li>
                    ))}
                  </ul>

                  <h3>Score yourself</h3>
                  <p className="gm-note num">
                    You covered {covered} of {q.strong.length} points. Suggested: {suggested} ({rubric[suggested - 1].label}).
                  </p>
                  <div className="iv-rubric" role="radiogroup" aria-label="Score">
                    {rubric.map((r) => (
                      <button key={r.score} type="button" role="radio" aria-checked={score === r.score} className={`iv-score${score === r.score ? ' is-on' : ''}${suggested === r.score ? ' is-suggested' : ''}`} onClick={() => save(r.score)}>
                        <b className="num">{r.score}</b>
                        <span>{r.label}</span>
                        <small>{r.meaning}</small>
                      </button>
                    ))}
                  </div>

                  {stage === 'done' && (
                    <motion.div className="iv-done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <p>
                        <b>Saved.</b> {score !== null && score <= 2 ? 'This one will come back sooner. Study the lessons below first.' : 'Nice. It will come back later for a refresher.'}
                      </p>
                      {q.lessons.length > 0 && (
                        <p className="gm-lessons">
                          <b>Study:</b>{' '}
                          {q.lessons.map((k) => (
                            <a key={k} href={withBase(lessons[k]?.href ?? '/learn/')}>
                              {lessons[k]?.title ?? k}
                            </a>
                          ))}
                          {q.game && <a href={withBase(q.game.href)}>{q.game.label}</a>}
                        </p>
                      )}
                      <button type="button" className="btn" onClick={() => start(pickNext(pool, history, q.id))}>
                        Next question
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.article>
          )}
        </AnimatePresence>
      </div>
    </Root>
  );
}
