import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE, useDone } from '../viz/shared';
import { useStore, KEYS } from '../../lib/store';
import { placement, recommend, score } from '../../data/placement';
import { paths, pathIds, type PathId } from '../../data/paths';
import { withBase } from '../../lib/url';

export type LessonInfo = Record<string, { title: string; href: string; level: string }>;

const levelLabel = (l: string) => l.charAt(0).toUpperCase() + l.slice(1);

export default function PathPlanner({ lessons }: { lessons: LessonInfo }) {
  const [saved, setSaved] = useStore<PathId | null>(KEYS.path, null);
  const [sel, setSel] = useState<PathId>('newcomer');
  const { done } = useDone();
  const stepsRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLElement>(null);

  // quiz state
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => placement.map(() => null));
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const h = window.location.hash.replace('#', '');
    if ((pathIds as string[]).includes(h)) setSel(h as PathId);
    else if (h === 'check') requestAnimationFrame(() => checkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  useEffect(() => {
    if (saved) setSel(saved);
  }, [saved]);

  const path = paths[sel];
  const lessonSteps = path.steps.filter((s) => s.kind === 'lesson') as { kind: 'lesson'; key: string }[];
  const doneCount = lessonSteps.filter((s) => done.includes(s.key)).length;
  const nextStep = lessonSteps.find((s) => !done.includes(s.key));
  const nextHref = nextStep ? lessons[nextStep.key].href : '/learn/';
  const correct = score(answers);
  const rec = recommend(correct);

  const answer = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    setAnswers((a) => a.map((v, k) => (k === i ? idx : v)));
  };
  const next = () => {
    if (i + 1 >= placement.length) setFinished(true);
    else {
      setI(i + 1);
      setPicked(null);
    }
  };
  const restart = () => {
    setI(0);
    setPicked(null);
    setFinished(false);
    setAnswers(placement.map(() => null));
  };
  const showPath = (id: PathId) => {
    setSel(id);
    setSaved(id);
    requestAnimationFrame(() => stepsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const q = placement[i];

  return (
    <Root>
      <div className="pp" style={{ '--track': path.color, '--on-track': path.on } as React.CSSProperties}>
        <div className="pp-tabs" role="tablist" aria-label="Learning paths" data-stagger>
          {pathIds.map((id) => {
            const p = paths[id];
            const on = id === sel;
            return (
              <button
                key={id}
                id={id}
                type="button"
                role="tab"
                aria-selected={on}
                className={`pp-tab${on ? ' is-on' : ''}`}
                style={{ '--c': p.color, '--on': p.on } as React.CSSProperties}
                onClick={() => setSel(id)}
              >
                <b>{p.title}</b>
                <span>{p.who}</span>
                {saved === id && <em>Your path</em>}
              </button>
            );
          })}
        </div>

        <div ref={stepsRef} className="pp-path">
          <header className="pp-path-head">
            <div>
              <h2>{path.title}</h2>
              <p>{path.promise}</p>
            </div>
            <div className="pp-progress" role="img" aria-label={`${doneCount} of ${lessonSteps.length} lessons done`}>
              <span className="num">
                {doneCount} of {lessonSteps.length} lessons done
              </span>
              <span className="tp-bar">
                <motion.span className="tp-fill" initial={false} animate={{ scaleX: lessonSteps.length ? doneCount / lessonSteps.length : 0 }} transition={{ duration: 0.6, ease: EASE }} />
              </span>
            </div>
          </header>

          {(path.after || path.assumes) && (
            <p className="pp-assumes">
              <b>This path assumes you know:</b>{' '}
              {path.after && (
                <a href={`#${path.after}`} onClick={() => setSel(path.after!)}>
                  the “{paths[path.after].title}” path
                </a>
              )}
              {path.after && path.assumes && ', and '}
              {path.assumes?.map((k, n) => (
                <span key={k}>
                  {n > 0 && ', '}
                  <a href={withBase(lessons[k]?.href ?? '/learn/')}>{lessons[k]?.title ?? k}</a>
                </span>
              ))}
              . Skim them first if they are new to you.
            </p>
          )}

          <AnimatePresence mode="wait">
            <motion.ol key={sel} className="pp-steps" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              {path.steps.map((s, n) => {
                if (s.kind === 'game') {
                  return (
                    <li key={s.href + s.label} className="pp-step is-game">
                      <span className="pp-node" aria-hidden="true">★</span>
                      <a href={withBase(s.href)}>
                        <b>{s.label}</b>
                        <small>{s.note}</small>
                      </a>
                      <span className="pp-tag">Game</span>
                    </li>
                  );
                }
                const info = lessons[s.key];
                const isDone = done.includes(s.key);
                return (
                  <li key={s.key} className={`pp-step${isDone ? ' is-done' : ''}`}>
                    <span className="pp-node" aria-hidden="true">{isDone ? '✓' : n + 1}</span>
                    <a href={withBase(info.href)}>
                      <b>{info.title}</b>
                      <small>{levelLabel(info.level)}</small>
                    </a>
                  </li>
                );
              })}
            </motion.ol>
          </AnimatePresence>

          <div className="pp-actions">
            <button type="button" className="btn" onClick={() => setSaved(sel)} disabled={saved === sel}>
              {saved === sel ? 'This is your path' : 'Make this my path'}
            </button>
            <a className="btn quiet" href={withBase(nextHref)}>
              {doneCount === 0 ? 'Start the first lesson' : 'Continue the path'}
            </a>
          </div>
        </div>

        <section ref={checkRef} id="check" className="pp-check" aria-labelledby="check-h">
          <h2 id="check-h">Not sure where you fit? Take the check.</h2>
          <p className="pp-check-lede">Six questions, no pressure, nothing is stored except your path. “I don’t know yet” is a perfectly good answer and helps us point you at the right place.</p>

          <div className="viz pp-quiz">
            <AnimatePresence mode="wait">
              {!finished ? (
                <motion.div key={`q${i}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25, ease: EASE }}>
                  <div className="pp-dots" role="img" aria-label={`Question ${i + 1} of ${placement.length}`}>
                    {placement.map((_, k) => (
                      <i key={k} className={k < i ? 'done' : k === i ? 'now' : ''} />
                    ))}
                  </div>
                  <p className="pp-q">{q.q}</p>
                  <div className="gm-options" role="group" aria-label="Answers">
                    {q.options.map((o, idx) => {
                      const isIdk = idx === q.options.length - 1;
                      const right = picked !== null && idx === q.answer;
                      const wrong = picked === idx && idx !== q.answer;
                      return (
                        <button key={o} type="button" className={`gm-opt${right ? ' is-right' : ''}${wrong ? ' is-wrong' : ''}${isIdk ? ' is-idk' : ''}`} disabled={picked !== null} onClick={() => answer(idx)}>
                          <span className="gm-opt-dot" aria-hidden="true" />
                          <span className="gm-opt-text"><b>{o}</b></span>
                        </button>
                      );
                    })}
                  </div>
                  {picked !== null && (
                    <motion.div className="pp-feedback" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-live="polite">
                      <p>
                        <b>{picked === q.answer ? 'Right. ' : picked === q.options.length - 1 ? 'No problem. ' : 'Not quite. '}</b>
                        {q.why}
                      </p>
                      <button type="button" className="btn" onClick={next}>
                        {i + 1 >= placement.length ? 'See my path' : 'Next question'}
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}>
                  <p className="pp-score num">{correct} / {placement.length}</p>
                  <h3>We suggest: {paths[rec].title}</h3>
                  <p className="pp-result-text">{paths[rec].who} {paths[rec].promise}</p>
                  <p className="pp-result-alt">
                    Studying on a course? The <a href="#student" onClick={() => showPath('student')}>student path</a> goes through the ideas in order. Work on GPUs and cloud platforms? Try the{' '}
                    <a href="#infra" onClick={() => showPath('infra')}>infrastructure path</a>.
                  </p>
                  <div className="pp-actions">
                    <button type="button" className="btn" onClick={() => showPath(rec)}>
                      Show me this path
                    </button>
                    <button type="button" className="btn quiet" onClick={restart}>
                      Retake the check
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </Root>
  );
}
