import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { RULES, SCENARIOS, VERDICT_LABEL, isCorrect, score, verdictFor, type Rule, type Verdict } from '../../lib/school-rules';

const ORDER: Verdict[] = ['ok', 'ask', 'not'];

/**
 * "Okay or not okay?": eight school scenarios. The right answer depends on the
 * teacher's rule, which the learner can switch at any time. Their picks stay,
 * so changing the rule shows the same pick turning right or wrong.
 */
export default function OkOrNot() {
  const [rule, setRule] = useState<Rule>('buddy');
  const [picks, setPicks] = useState<Record<string, Verdict>>({});
  const current = RULES.find((r) => r.id === rule)!;
  const { answered, correct } = score(picks, rule);

  return (
    <Root>
      <div className="viz rb-rules">
        <p className="viz-title">Okay or not okay? It depends on the rule</p>

        <p className="rb-label" id="rb-rule-label">
          Your teacher’s rule:
        </p>
        <div className="rb-rulebar" role="radiogroup" aria-labelledby="rb-rule-label">
          {RULES.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={rule === r.id} className={`rb-rulebtn${rule === r.id ? ' is-on' : ''}`} onClick={() => setRule(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <p className="rb-ruletext" aria-live="polite">
          {current.text}
        </p>

        <ol className="rb-scenarios">
          {SCENARIOS.map((s, i) => {
            const pick = picks[s.id];
            const truth = verdictFor(s, rule);
            const right = pick ? isCorrect(s, rule, pick) : false;
            return (
              <li key={s.id} className="rb-scenario">
                <p className="rb-scn-text">
                  <span className="rb-scn-n">{i + 1}</span>
                  {s.text}
                </p>
                <div className="rb-choices rb-choices-sm" role="group" aria-label={`Scenario ${i + 1}`}>
                  {ORDER.map((v) => (
                    <button key={v} type="button" className={`rb-choice rb-v-${v}${pick === v ? ' is-picked' : ''}`} aria-pressed={pick === v} onClick={() => setPicks((p) => ({ ...p, [s.id]: v }))}>
                      {VERDICT_LABEL[v]}
                    </button>
                  ))}
                </div>
                <div className="rb-feedback" aria-live="polite">
                  {pick && (
                    <motion.p key={`${rule}-${pick}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: EASE }} className={right ? 'is-right' : 'is-miss'}>
                      <b>{right ? 'Yes.' : `Under this rule the answer is ${VERDICT_LABEL[truth.verdict]}.`}</b> {truth.why}
                    </motion.p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="rb-total" aria-live="polite">
          Under “{current.label}”: <b className="num">{correct}</b> right out of <b className="num">{answered}</b> answered. Now change the rule above and watch your answers change.
        </p>
        <p className="viz-cap">These rules and scenarios are examples. Your own school may have different ones, and the only way to know is to ask your teacher.</p>
      </div>
    </Root>
  );
}
