import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from '../viz/shared';
import { recordGame } from '../../lib/store';
import { COST_PER_EVIDENCE, COST_PER_WRONG_CAUSE, COST_PER_WRONG_FIX, incidents, rating, scoreIncident } from '../../games/incidents';
import { LessonLinks, LevelTabs, useRecords, useScrollIntoView } from './shared';

type Session = { opened: string[]; wrongCauses: string[]; solved: boolean; wrongFixes: string[]; done: boolean };
const fresh = (): Session => ({ opened: [], wrongCauses: [], solved: false, wrongFixes: [], done: false });

export default function IncidentRoom() {
  const records = useRecords();
  const [iid, setIid] = useState(incidents[0].id);
  const incident = incidents.find((i) => i.id === iid)!;
  const [s, setS] = useState<Session>(fresh());
  const [interviewer, setInterviewer] = useState(false);

  useEffect(() => setS(fresh()), [iid]);

  const resultRef = useScrollIntoView<HTMLElement>(s.done);
  const score = useMemo(() => scoreIncident(s.opened.length, s.wrongCauses.length, s.wrongFixes.length), [s]);
  const nextIncident = incidents[(incidents.findIndex((i) => i.id === iid) + 1) % incidents.length];

  const open = (id: string) => setS((x) => (x.opened.includes(id) ? x : { ...x, opened: [...x.opened, id] }));

  const diagnose = (id: string) => {
    if (s.solved || s.wrongCauses.includes(id)) return;
    if (id === incident.cause) setS((x) => ({ ...x, solved: true }));
    else setS((x) => ({ ...x, wrongCauses: [...x.wrongCauses, id] }));
  };

  const choose = (id: string) => {
    if (s.done || s.wrongFixes.includes(id)) return;
    if (id === incident.fix) {
      const final = scoreIncident(s.opened.length, s.wrongCauses.length, s.wrongFixes.length);
      recordGame(`incident:${incident.id}`, final);
      setS((x) => ({ ...x, done: true }));
    } else {
      setS((x) => ({ ...x, wrongFixes: [...x.wrongFixes, id] }));
    }
  };

  return (
    <Root>
      <div className="gm">
        <LevelTabs
          items={incidents.map((i) => ({ id: i.id, title: i.title, level: i.level }))}
          value={iid}
          onChange={setIid}
          records={records}
          prefix="incident"
        />

        <div className="gm-brief">
          <h2>{incident.title}</h2>
          <blockquote className="gm-report">{incident.report}</blockquote>
          <p className="gm-note num">
            You start with 100 points. Each piece of evidence costs {COST_PER_EVIDENCE}, a wrong diagnosis {COST_PER_WRONG_CAUSE}, a wrong fix {COST_PER_WRONG_FIX}. Read what you need, not everything.
            {' '}Current score: <b>{score}</b>
          </p>
        </div>

        <label className="inc-mode">
          <input type="checkbox" checked={interviewer} onChange={(e) => setInterviewer(e.target.checked)} />
          <span>
            <b>Interviewer view.</b> Show the answer key so you can run this as a debugging interview: read the report aloud, hand over evidence only when asked, and note the order they ask for it.
          </span>
        </label>
        {interviewer && (
          <aside className="inc-key" aria-label="Answer key">
            <p>
              <b>Root cause:</b> {incident.causes.find((c) => c.id === incident.cause)?.label}
            </p>
            <p>
              <b>Best fix:</b> {incident.fixes.find((f) => f.id === incident.fix)?.label}
            </p>
            <p>
              <b>Evidence that decides it:</b> {incident.evidence.map((e) => e.label).join(', ')}. A strong candidate asks for the most telling piece early and says what they expect to see before they read it.
            </p>
            <p>
              <b>If they suggest a wrong cause, probe with the reason it is wrong:</b>
            </p>
            <ul>
              {incident.causes
                .filter((c) => c.id !== incident.cause)
                .map((c) => (
                  <li key={c.id}>
                    <i>{c.label}:</i> {c.ruledOut}
                  </li>
                ))}
            </ul>
            <p>
              <b>Why the other fixes fall short:</b>
            </p>
            <ul>
              {incident.fixes
                .filter((f) => f.id !== incident.fix)
                .map((f) => (
                  <li key={f.id}>
                    <i>{f.label}:</i> {f.why}
                  </li>
                ))}
            </ul>
          </aside>
        )}

        <div className="gm-main inc">
          <section className="gm-play" aria-label="Evidence">
            <p className="viz-title">1. Gather evidence</p>
            <div className="gm-evidence">
              {incident.evidence.map((e) => {
                const isOpen = s.opened.includes(e.id);
                return (
                  <div key={e.id} className={`gm-ev${isOpen ? ' is-open' : ''}`}>
                    <button type="button" className="gm-ev-head" aria-expanded={isOpen} onClick={() => open(e.id)} disabled={isOpen}>
                      <span>{e.label}</span>
                      <span className="gm-ev-cost num">{isOpen ? 'opened' : `-${COST_PER_EVIDENCE}`}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.pre
                          className="gm-ev-body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          transition={{ duration: 0.35, ease: EASE }}
                        >
                          {e.lines.join('\n')}
                        </motion.pre>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="gm-side gm-diag" aria-label="Diagnosis">
            <p className="viz-title">2. What is the root cause?</p>
            <div className="gm-options" role="group" aria-label="Possible causes">
              {incident.causes.map((c) => {
                const wrong = s.wrongCauses.includes(c.id);
                const right = s.solved && c.id === incident.cause;
                return (
                  <div key={c.id}>
                    <button
                      type="button"
                      className={`gm-opt${right ? ' is-right' : ''}${wrong ? ' is-wrong' : ''}`}
                      onClick={() => diagnose(c.id)}
                      disabled={s.solved || wrong}
                      aria-pressed={right}
                    >
                      <span className="gm-opt-dot" aria-hidden="true" />
                      <span className="gm-opt-text">
                        <b>{c.label}</b>
                      </span>
                    </button>
                    <AnimatePresence>
                      {wrong && (
                        <motion.p className="gm-ruled" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
                          Not this. {c.ruledOut}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <AnimatePresence>
              {s.solved && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                  <p className="viz-title gm-step">3. What do you do about it?</p>
                  <div className="gm-options" role="group" aria-label="Possible fixes">
                    {incident.fixes.map((f) => {
                      const wrong = s.wrongFixes.includes(f.id);
                      const right = s.done && f.id === incident.fix;
                      return (
                        <div key={f.id}>
                          <button
                            type="button"
                            className={`gm-opt${right ? ' is-right' : ''}${wrong ? ' is-wrong' : ''}`}
                            onClick={() => choose(f.id)}
                            disabled={s.done || wrong}
                          >
                            <span className="gm-opt-dot" aria-hidden="true" />
                            <span className="gm-opt-text">
                              <b>{f.label}</b>
                            </span>
                          </button>
                          <AnimatePresence>
                            {(wrong || right) && (
                              <motion.p className={right ? 'gm-ruled good' : 'gm-ruled'} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
                                {right ? 'Yes. ' : 'Not the best move. '}
                                {f.why}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        <AnimatePresence>
          {s.done && (
            <motion.section ref={resultRef} className="gm-result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} aria-live="polite">
              <header className="gm-result-head">
                <div>
                  <h3>{rating(score)}</h3>
                  <p>
                    {s.opened.length} piece{s.opened.length === 1 ? '' : 's'} of evidence, {s.wrongCauses.length} wrong diagnos{s.wrongCauses.length === 1 ? 'is' : 'es'}, {s.wrongFixes.length} wrong fix{s.wrongFixes.length === 1 ? '' : 'es'}.
                  </p>
                </div>
                <div className="gm-score num" aria-label={`Score ${score} out of 100`}>
                  {score}
                  <small>/ 100</small>
                </div>
              </header>
              <h4 className="gm-debrief">What happened</h4>
              <p>{incident.explanation}</p>
              {incident.evidence.some((e) => !s.opened.includes(e.id)) && (
                <p className="gm-note">
                  Evidence you did not open: {incident.evidence.filter((e) => !s.opened.includes(e.id)).map((e) => e.label).join(', ')}. Opening it was optional here, but it is worth reading afterwards.
                </p>
              )}
              <LessonLinks links={incident.lessons} />
              <div className="gm-result-actions">
                <button type="button" className="btn" onClick={() => setIid(nextIncident.id)}>
                  Next incident
                </button>
                <button type="button" className="btn quiet" onClick={() => setS(fresh())}>
                  Try this one again
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </Root>
  );
}
