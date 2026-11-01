import { useMemo, useState } from 'react';
import { Root } from './shared';
import { analyse, CLIP_REFERENCE, pct, SYSTEMS, systemRows } from '../../lib/caption-lab';
import type { Op } from '../../lib/wer';

/*
 * Captions lab: one spoken sentence, five invented caption outputs. The learner picks one (or types their
 * own) and sees which words were wrong, the word error rate, and which facts a reader can still get.
 * The table underneath puts the five side by side so the rate and the usefulness can be compared.
 */

const TAG: Record<Op, string> = { ok: 'match', sub: 'swapped', del: 'missing', ins: 'extra' };
const SHORT: Record<Op, string> = { ok: '', sub: 'S', del: 'D', ins: 'I' };

export default function CaptionLab() {
  const [pick, setPick] = useState<string>('b');
  const [own, setOwn] = useState('Please bring your coats. The trip is cancelled if it rains, and the bus leaves at half past nine from gate four.');

  const rows = useMemo(() => systemRows(), []);
  const chosen = SYSTEMS.find((s) => s.id === pick);
  const caption = chosen ? chosen.text : own.slice(0, 400);
  const a = useMemo(() => analyse(caption), [caption]);

  const wer = a.score.wer;
  const headline = `${chosen ? chosen.name : 'Your caption'}: word error rate ${pct(wer)} (${a.score.edits} edit${a.score.edits === 1 ? '' : 's'} in ${a.score.refLen} words). A reader can still get ${a.keptCount} of ${a.facts.length} facts.`;

  return (
    <Root>
      <div className="viz wrd wrd-cap">
        <p className="viz-title">Captions lab: same sentence, different captions (all invented)</p>

        <p className="wrd-said">
          <span className="wrd-said-l">What was said</span>
          {CLIP_REFERENCE}
        </p>

        <div className="wrd-chips" role="group" aria-label="Choose a caption">
          {SYSTEMS.map((s) => (
            <button key={s.id} type="button" className="wrd-chip" aria-pressed={pick === s.id} onClick={() => setPick(s.id)}>
              {s.name}
            </button>
          ))}
          <button type="button" className="wrd-chip" aria-pressed={pick === 'own'} onClick={() => setPick('own')}>
            Your own
          </button>
        </div>

        {chosen ? (
          <p className="wrd-blurb">{chosen.blurb}</p>
        ) : (
          <label className="wrd-field">
            <span>Type or edit a caption</span>
            <textarea value={own} rows={3} maxLength={400} spellCheck={false} onChange={(e) => setOwn(e.target.value)} />
          </label>
        )}

        <ol className="wrd-align" aria-label="Word by word: what was said above, what the caption shows below">
          {a.score.items.map((it, i) => (
            <li key={i} className={`wrd-col wrd-${it.op}`}>
              <span className="wrd-w" aria-label={`said: ${it.ref ?? 'nothing'}`}>
                {it.ref ?? '–'}
              </span>
              <span className="wrd-w" aria-label={`caption: ${it.hyp ?? 'nothing'}`}>
                {it.hyp ?? '–'}
              </span>
              <span className="wrd-tag" aria-label={TAG[it.op]}>
                {SHORT[it.op] || ' '}
              </span>
            </li>
          ))}
        </ol>
        <p className="wrd-key">Top row: what was said. Bottom row: what the caption shows. S swapped, D missing, I extra. Case and punctuation are ignored.</p>

        <div className="wrd-result">
          <div className="wrd-big" aria-hidden="true">
            <span className="wrd-big-n">{pct(wer)}</span>
            <span className="wrd-big-l">word error rate</span>
          </div>
          <ul className="wrd-facts" aria-label="Facts a reader can still get from this caption">
            {a.facts.map((f) => (
              <li key={f.fact.id} className={f.kept ? 'wrd-kept' : 'wrd-lost'}>
                <span className="wrd-mark" aria-hidden="true">
                  {f.kept ? '✓' : '✗'}
                </span>
                <span>
                  <b>{f.fact.question}:</b> {f.fact.answer}.{' '}
                  <span className="wrd-state">{f.kept ? 'Still readable.' : 'Lost or wrong.'}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="wrd-sr" role="status" aria-live="polite">
          {headline}
        </p>

        <table className="wrd-table">
          <caption>All five side by side</caption>
          <thead>
            <tr>
              <th scope="col">Caption</th>
              <th scope="col">Errors</th>
              <th scope="col">Word error rate</th>
              <th scope="col">Facts kept</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.system.id} className={pick === r.system.id ? 'is-on' : ''}>
                <th scope="row">{r.system.name}</th>
                <td>{r.errors}</td>
                <td>{pct(r.wer)}</td>
                <td>
                  {r.keptCount} of {a.facts.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="wrd-look">
          Caption E has the lowest rate and still loses the gate. Captions A and B have the same rate, yet A is fine and B gets the rain rule backwards. Caption C has more than twice the rate of A and keeps as many facts. A single percentage does not tell a reader which of these they can act on.
        </p>
        <p className="wrd-hint">
          The sentence, the captions and the list of facts are invented. “Facts kept” is a simple word check made for this lab, not a tested measure. Kafle and Huenerfauth (2017) tested a measure that weighs errors by how much they hurt understanding with 30 deaf and hard-of-hearing readers.
        </p>
      </div>
    </Root>
  );
}
