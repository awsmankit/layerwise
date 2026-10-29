import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from '../viz/shared';
import { recordGame } from '../../lib/store';
import { withBase } from '../../lib/url';
import {
  defaultChoice,
  evaluate,
  scenarios,
  slotInfo,
  slots,
  solutions,
  enumerate,
  type Choice,
  type Slot,
} from '../../games/blueprint';
import { Check, GameDock, LessonLinks, LevelTabs, Meter, useRecords, useScrollIntoView } from './shared';

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const labelOf = (slot: Slot, id: string) => slotInfo[slot].options.find((o) => o.id === id)?.label ?? id;

export default function BlueprintGame() {
  const records = useRecords();
  const [sid, setSid] = useState(scenarios[0].id);
  const scenario = scenarios.find((s) => s.id === sid)!;
  const [choice, setChoice] = useState<Choice>(defaultChoice());
  const [submitted, setSubmitted] = useState(false);
  const [reveal, setReveal] = useState(false);

  const result = useMemo(() => evaluate(scenario, choice), [scenario, choice]);
  const strong = useMemo(() => (reveal ? solutions(scenario) : []), [reveal, scenario]);
  const total = useMemo(() => (reveal ? enumerate(scenario).length : 0), [reveal, scenario]);
  const n = scenario.needs;
  const resultRef = useScrollIntoView<HTMLElement>(submitted);
  const revealRef = useScrollIntoView<HTMLElement>(reveal);

  const pick = (slot: Slot, id: string) => {
    setChoice((c) => ({ ...c, [slot]: id }));
    setSubmitted(false);
  };

  const submit = () => {
    setSubmitted(true);
    recordGame(`blueprint:${sid}`, result.score);
  };

  const reset = (id: string) => {
    setSid(id);
    setChoice(defaultChoice());
    setSubmitted(false);
    setReveal(false);
  };

  return (
    <Root>
      <div className="gm">
        <LevelTabs
          items={scenarios.map((s) => ({ id: s.id, title: s.title, level: s.level }))}
          value={sid}
          onChange={reset}
          records={records}
          prefix="blueprint"
        />

        <div className="gm-brief">
          <h2>{scenario.title}</h2>
          <p>{scenario.brief}</p>
          <ul className="gm-facts num">
            <li>{scenario.reqPerDay.toLocaleString('en-US')} requests a day</li>
            <li>
              ~{scenario.questionTok + scenario.answerTok} tokens per exchange
            </li>
            <li>{scenario.knowledgeTok.toLocaleString('en-US')} tokens of knowledge{scenario.changesOften ? ', changing often' : ', rarely changing'}</li>
            <li>about {Math.round(scenario.repeatRate * 100)}% of questions repeat</li>
          </ul>
        </div>

        <div className="gm-main">
          <div className="gm-play">
            {slots.map((slot) => {
              const info = slotInfo[slot];
              return (
                <fieldset key={slot} className="gm-slot">
                  <legend>
                    <b>{info.title}</b> <span>{info.question}</span>
                  </legend>
                  <div className="gm-options" role="radiogroup" aria-label={info.title}>
                    {info.options.map((o) => {
                      const on = choice[slot] === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          className={`gm-opt${on ? ' is-on' : ''}`}
                          onClick={() => pick(slot, o.id)}
                        >
                          <span className="gm-opt-dot" aria-hidden="true" />
                          <span className="gm-opt-text">
                            <b>{o.label}</b>
                            <small>{o.blurb}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
            <GameDock
              items={[
                { label: 'Cost', value: usd(result.monthly), target: `≤ ${usd(n.budget)}`, ok: result.monthly <= n.budget },
                { label: 'Speed', value: `${Math.round(result.ttftMs).toLocaleString('en-US')} ms`, target: `≤ ${n.ttftMs.toLocaleString('en-US')}`, ok: result.ttftMs <= n.ttftMs },
                { label: 'Quality', value: `${Math.round(result.quality)}`, target: `≥ ${n.minQuality}`, ok: result.quality >= n.minQuality },
                { label: 'Uptime', value: `${result.availability}%`, target: `≥ ${n.availability}%`, ok: result.availability >= n.availability },
                { label: 'Parts', value: `${result.complexity}`, target: `≤ ${n.maxComplexity}`, ok: result.complexity <= n.maxComplexity },
              ]}
            />
          </div>

          <aside className="gm-side" aria-label="Live estimates">
            <p className="viz-title">Live estimates</p>
            <Meter label="Monthly cost" value={result.monthly} limit={n.budget} mode="max" display={usd(result.monthly)} limitDisplay={usd(n.budget)} />
            <Meter label="First token (p95)" value={result.ttftMs} limit={n.ttftMs} mode="max" display={`${Math.round(result.ttftMs).toLocaleString('en-US')} ms`} limitDisplay={`${n.ttftMs.toLocaleString('en-US')} ms`} scaleMax={Math.max(n.ttftMs * 2, result.ttftMs * 1.05)} />
            <Meter label="Answer quality" value={result.quality} limit={n.minQuality} mode="min" display={`${Math.round(result.quality)} / 100`} limitDisplay={`${n.minQuality}`} scaleMax={100} />
            <Meter label="Availability" value={result.availability} limit={n.availability} mode="min" display={`${result.availability}%`} limitDisplay={`${n.availability}%`} scaleMax={100} />
            <Meter label="Moving parts" value={result.complexity} limit={n.maxComplexity} mode="max" display={`${result.complexity}`} limitDisplay={`${n.maxComplexity}`} scaleMax={12} />
            <p className="gm-note">
              Cost, speed, quality, uptime and effort update as you choose. Some requirements, such as citations and data access, only show up when you check your design.
            </p>
            <button type="button" className="btn" onClick={submit}>
              Check my design
            </button>
          </aside>
        </div>

        <AnimatePresence>
          {submitted && (
            <motion.section
              ref={resultRef}
              className="gm-result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              aria-live="polite"
            >
              <header className="gm-result-head">
                <div>
                  <h3>{result.allPass ? 'This design meets the brief' : `${result.total - result.passed} requirement${result.total - result.passed === 1 ? '' : 's'} not met`}</h3>
                  <p>
                    {result.passed} of {result.total} met.{' '}
                    {result.allPass ? 'Everything in the brief holds.' : 'Read the unmet ones below for a nudge.'}
                  </p>
                </div>
                <div className="gm-score num" aria-label={`Score ${result.score} out of 100`}>
                  {result.score}
                  <small>/ 100</small>
                </div>
              </header>
              <ul className="gm-checks">
                {result.checks.map((c, i) => (
                  <motion.li
                    key={c.id}
                    className={c.pass ? 'ok' : 'bad'}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <Check pass={c.pass} />
                    <div>
                      <b>{c.label}</b>
                      <p>{c.detail}</p>
                      {!c.pass && (
                        <p className="gm-hint">
                          Hint: {c.hint}
                          {c.lesson && (
                            <>
                              {' '}
                              <a href={withBase(c.lesson.href)}>{c.lesson.label}</a>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ul>
              {result.notes.length > 0 && (
                <ul className="gm-notes">
                  {result.notes.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
              <details className="gm-math">
                <summary>Show the arithmetic</summary>
                <p className="num">
                  Input per request: {result.inputTok.toLocaleString('en-US')} tokens. Cost per request ${result.perRequest.toFixed(4)}. Monthly = per request x {scenario.reqPerDay.toLocaleString('en-US')} requests x 30 days, less cached responses, plus fixed infrastructure. Prices are example per-million-token rates, and the scores are a simplified model, so read the direction of each effect rather than the exact figures.
                </p>
              </details>
              <div className="gm-result-actions">
                {!reveal && (
                  <button type="button" className="btn quiet" onClick={() => setReveal(true)}>
                    Show a strong design
                  </button>
                )}
                <button type="button" className="btn quiet" onClick={() => reset(sid)}>
                  Start this level over
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reveal && strong[0] && (
            <motion.section ref={revealRef} className="gm-reveal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
              <h3>A strong design</h3>
              <p>
                Of {total.toLocaleString('en-US')} possible combinations, {strong.length} meet every requirement. This one scores {strong[0].result.score}.
              </p>
              <dl className="gm-design">
                {slots.map((s) => (
                  <div key={s}>
                    <dt>{slotInfo[s].title}</dt>
                    <dd>{labelOf(s, strong[0].choice[s])}</dd>
                  </div>
                ))}
              </dl>
              <div className="gm-result-actions">
                <button
                  type="button"
                  className="btn quiet"
                  onClick={() => {
                    setChoice(strong[0].choice);
                    setSubmitted(false);
                  }}
                >
                  Load this design
                </button>
              </div>
              <LessonLinks links={result.checks.map((c) => c.lesson).filter((l): l is { label: string; href: string } => !!l)} />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </Root>
  );
}
