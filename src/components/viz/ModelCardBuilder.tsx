import { useState } from 'react';
import { Root } from './shared';
import { FACT_SHEET, SECTIONS, cardText, reportCard, type SectionStatus } from '../../lib/model-card';

/*
 * "Model card builder": an invented wake-word model and a fact sheet of what its team really
 * knows. The learner fills nine sections by ticking statements, then checks the card. The check
 * reports which sections are complete, which still miss something a reader needs, and which lines
 * are red flags (vague or unsupported). Everything is invented; nothing is sent anywhere.
 */

const STATUS_TEXT: Record<SectionStatus, string> = {
  missing: 'Empty',
  weak: 'Nothing useful yet',
  partial: 'Incomplete',
  complete: 'Complete',
};

export default function ModelCardBuilder() {
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);
  const [preview, setPreview] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChosen(next);
    setChecked(false);
  };
  const report = reportCard(chosen);
  const status = checked
    ? report.ready
      ? `All ${report.total} sections are complete and the card has no red flags.`
      : `${report.complete} of ${report.total} sections complete. ${report.flagCount} red ${report.flagCount === 1 ? 'flag' : 'flags'}.`
    : `${chosen.size} statements chosen. Press "Check the card" when you are ready.`;

  return (
    <Root>
      <div className="viz wra-card">
        <p className="viz-title">Model card builder</p>
        <p className="wra-note">
          An invented model, HeySunny-S, and a fact sheet of everything its team really knows. Fill each section by ticking the statements you would publish. Some are specific and checkable; some are the kind of line that makes a card look finished without telling anyone anything.
        </p>

        <details className="wra-facts">
          <summary>The team's fact sheet (invented)</summary>
          <ul>
            {FACT_SHEET.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </details>

        {SECTIONS.map((s) => {
          const rep = report.sections.find((r) => r.id === s.id)!;
          return (
            <fieldset key={s.id} className={`wra-sec${checked ? ' wra-' + rep.status : ''}`}>
              <legend>
                {s.title}
                {checked && <span className={`wra-badge wra-b-${rep.status}`}>{STATUS_TEXT[rep.status]}</span>}
              </legend>
              <p className="wra-small">A reader asks: {s.asks}</p>
              {s.statements.map((st) => {
                const on = chosen.has(st.id);
                const flagged = checked && on && st.kind !== 'solid';
                return (
                  <div key={st.id} className="wra-stmt">
                    <label className="wra-check">
                      <input type="checkbox" checked={on} onChange={() => toggle(st.id)} />
                      <span>{st.text}</span>
                    </label>
                    {checked && on && (
                      <p className={flagged ? 'wra-why wra-flag' : 'wra-why'}>
                        {flagged ? (st.kind === 'unsupported' ? 'Red flag, not supported by the facts. ' : 'Red flag, vague. ') : ''}
                        {st.why}
                      </p>
                    )}
                  </div>
                );
              })}
              {checked && rep.missing.length > 0 && (
                <p className="wra-why wra-miss">
                  Still missing: {rep.missing.map((m) => m.short ?? m.id).join('; ')}.
                </p>
              )}
            </fieldset>
          );
        })}

        <div className="wra-row wra-actions">
          <button type="button" className="btn" onClick={() => setChecked(true)}>
            Check the card
          </button>
          <button type="button" className="btn quiet" onClick={() => { setChosen(new Set()); setChecked(false); }} disabled={chosen.size === 0}>
            Clear
          </button>
          <button type="button" className="btn quiet" aria-pressed={preview} onClick={() => setPreview((p) => !p)}>
            {preview ? 'Hide the text version' : 'Show the text version'}
          </button>
        </div>

        <div className="wra-result" role="status" aria-live="polite">
          <p>{status}</p>
          {checked && report.ready && <p>A reader could use this card: it says what the model is for, what it was tested on, where it is weaker and what is untested.</p>}
        </div>
        {preview && (
          <pre className="wra-pre" tabIndex={0} aria-label="Your card as plain text">{cardText(chosen)}</pre>
        )}
      </div>
    </Root>
  );
}
