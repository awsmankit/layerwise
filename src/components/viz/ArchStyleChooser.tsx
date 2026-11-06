import { useMemo, useState } from 'react';
import { Root } from './shared';
import { withBase } from '../../lib/url';
import { QUESTIONS, STYLES, recommend, toAnswers, type QuestionId } from '../../lib/arch-style';

/**
 * Six short questions end in a recommended style, one line of why, the next step to add only if
 * a named failure calls for it, and a lesson to read. The logic lives in lib/arch-style.ts.
 */
export default function ArchStyleChooser() {
  const [values, setValues] = useState<Partial<Record<QuestionId, string>>>({});
  const answered = QUESTIONS.filter((q) => values[q.id] !== undefined).length;
  const done = answered === QUESTIONS.length;
  const rec = useMemo(() => recommend(toAnswers(values)), [values]);
  const style = STYLES[rec.style];

  const set = (id: QuestionId, v: string) => setValues((p) => ({ ...p, [id]: v }));

  return (
    <Root>
      <div className="viz as-chs">
        <p className="viz-title">Which style fits your task?</p>
        <p className="as-hint">Answer all six. The result updates as you go, and you can change any answer.</p>
        <div className="as-qs">
          {QUESTIONS.map((q, i) => (
            <fieldset key={q.id} className="as-q">
              <legend className="as-q-text">
                <span className="as-q-num" aria-hidden="true">
                  {i + 1}
                </span>
                {q.q}
              </legend>
              <p className="as-q-help">{q.help}</p>
              <div className="as-opts" role="radiogroup" aria-label={q.q}>
                {q.options.map((o) => (
                  <button key={o.value} type="button" role="radio" aria-checked={values[q.id] === o.value} className="as-opt" onClick={() => set(q.id, o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="as-result" aria-live="polite">
          {answered === 0 ? (
            <p className="as-result-empty">Your answer will appear here.</p>
          ) : (
            <>
              <p className="as-result-tag">{done ? 'Start with' : `Best guess so far (${answered} of ${QUESTIONS.length} answered)`}</p>
              <h3 className="as-result-name">{style.name}</h3>
              <p className="as-result-why">{rec.why}</p>
              <p className="as-result-next">
                <b>Add next, only if needed.</b> {rec.next}
              </p>
              {rec.cautions.map((c) => (
                <p key={c} className="as-caution">
                  <b>Watch out.</b> {c}
                </p>
              ))}
              <p className="as-result-link">
                <a href={withBase(rec.link.href)}>Read: {rec.link.label}</a>
              </p>
            </>
          )}
        </div>
        <div className="as-actions">
          <button type="button" className="as-opt as-reset" disabled={answered === 0} onClick={() => setValues({})}>
            Start over
          </button>
        </div>
        <p className="viz-cap">A rule of thumb, not a verdict. It encodes this lesson&rsquo;s reasoning: choose the simplest style, and add structure only for a failure you can name.</p>
      </div>
    </Root>
  );
}
