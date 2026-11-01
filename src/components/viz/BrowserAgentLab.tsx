import { useMemo, useState } from 'react';
import { Root } from './shared';
import { ATTACKS, NO_DEFENCES, STATUS_LABEL, pageView, simulate, type AttackId, type Defences } from '../../lib/browser-agent-sim';

/*
 * Scripted browser-agent lab. A pretend agent buys a book. A review on the product page hides an
 * instruction. The learner steps through the run and switches defences on and off. The agent is
 * ASSUMED to be fooled, and the shop, the attacker and the page filter are all invented.
 */

const DEFENCE_INFO: { key: keyof Defences; name: string; text: string }[] = [
  { key: 'allowList', name: 'Allow-list', text: 'The browser may only visit books.example.' },
  { key: 'confirm', name: 'Confirmation gate', text: 'A person approves anything that sends data out or spends money.' },
  { key: 'sandbox', name: 'Clean sandbox', text: 'A fresh browser with no login and no saved details.' },
  { key: 'filter', name: 'Page filter', text: 'A classifier scans page text for hidden instructions (probabilistic).' },
];

const COMBOS: { label: string; d: Defences }[] = [
  { label: 'Nothing', d: NO_DEFENCES },
  { label: 'Allow-list only', d: { ...NO_DEFENCES, allowList: true } },
  { label: 'Confirmation only', d: { ...NO_DEFENCES, confirm: true } },
  { label: 'Sandbox only', d: { ...NO_DEFENCES, sandbox: true } },
  { label: 'Filter only', d: { ...NO_DEFENCES, filter: true } },
  { label: 'All four', d: { allowList: true, confirm: true, sandbox: true, filter: true } },
];

const TASK_TEXT = { completed: 'Book bought, as asked', 'handed-off': 'Stopped at the basket: the person signs in and pays', incomplete: 'Not finished' } as const;

export default function BrowserAgentLab() {
  const [attack, setAttack] = useState<AttackId>('other-site');
  const [d, setD] = useState<Defences>(NO_DEFENCES);
  const [n, setN] = useState(0);

  const trace = useMemo(() => simulate(attack, d), [attack, d]);
  const total = trace.results.length;
  const shown = trace.results.slice(0, n);
  const last = shown[shown.length - 1];
  const next = n < total ? trace.results[n] : null;
  const view = last ? pageView(last.page, attack) : null;
  const finished = n >= total;

  const matrix = useMemo(
    () => COMBOS.map((c) => ({ label: c.label, a: simulate('other-site', c.d).leaked, b: simulate('same-site', c.d).leaked })),
    [],
  );

  return (
    <Root>
      <div className="viz wlc-agent">
        <p className="viz-title">A browser agent meets a hidden instruction</p>
        <p className="wlc-note">
          Scripted and invented. The task is "buy the paperback of Tidal Maps". We assume the model is fooled by the planted text, to show what each defence does by itself. A real model may or may not be fooled, and a real page filter can miss attacks.
        </p>

        <div className="wlc-row" role="group" aria-label="Which attack">
          {(Object.keys(ATTACKS) as AttackId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`wlc-btn${id === attack ? ' is-on' : ''}`}
              aria-pressed={id === attack}
              onClick={() => {
                setAttack(id);
                setN(0);
              }}
            >
              {ATTACKS[id].name}
            </button>
          ))}
        </div>
        <p className="wlc-attack">{ATTACKS[attack].blurb}</p>

        <fieldset className="wlc-defs">
          <legend>Defences</legend>
          {DEFENCE_INFO.map((x) => (
            <label key={x.key} className={`wlc-def${d[x.key] ? ' is-on' : ''}`}>
              <input type="checkbox" checked={d[x.key]} onChange={(e) => setD({ ...d, [x.key]: e.target.checked })} />
              <span><b>{x.name}</b><small>{x.text}</small></span>
            </label>
          ))}
        </fieldset>

        <div className="wlc-row">
          <button type="button" className="wlc-btn" disabled={finished} onClick={() => setN(n + 1)}>Next step</button>
          <button type="button" className="wlc-btn" disabled={finished} onClick={() => setN(total)}>Run to the end</button>
          <button type="button" className="wlc-btn" disabled={n === 0} onClick={() => setN(0)}>Reset</button>
        </div>
        <p className="wlc-next" aria-live="polite">
          {next ? (
            <>Next: <b>{next.step.label}</b> <span className={`wlc-src is-${next.step.source}`}>{next.step.source === 'task' ? 'asked for by the person' : 'asked for by text in the page'}</span></>
          ) : (
            'The run is finished.'
          )}
        </p>

        <div className="wlc-screens">
          <div className="wlc-browser" role="img" aria-label={view ? `Browser showing ${view.host}${view.path}. ${view.lines.map((l) => l.text).join('. ')}` : 'Blank browser tab'}>
            <div className="wlc-url">{view ? <><b>{view.host}</b>{view.path}</> : 'New tab'}</div>
            <div className="wlc-page">
              {view ? (
                view.lines.map((l, i) => (
                  <p key={i} className={`wlc-l is-${l.kind}`}>
                    {l.kind === 'btn' ? <span>{l.text}</span> : l.kind === 'field' ? <span>{l.text}</span> : l.text}
                  </p>
                ))
              ) : (
                <p className="wlc-l is-p">Task: buy the paperback of Tidal Maps.</p>
              )}
            </div>
          </div>
          <div className="wlc-model">
            <p className="wlc-grid-title">What the model is given for this page</p>
            <pre aria-label="Accessibility tree text of the page">{view ? view.tree.join('\n') : '(nothing yet)'}</pre>
            <p className="wlc-small">A screenshot plus a text outline like this. The pale text in the review is nearly invisible to a person, but it is ordinary text to the model.</p>
          </div>
        </div>

        <ol className="wlc-trace" aria-label="Steps so far">
          {shown.map((r) => (
            <li key={r.step.id} className={`wlc-t is-${r.status}`}>
              <span className="wlc-t-head">
                <b>{r.step.label}</b>
                <span className={`wlc-src is-${r.step.source}`}>{r.step.source === 'task' ? 'task' : 'planted'}</span>
                <span className="wlc-status">{STATUS_LABEL[r.status]}</span>
              </span>
              <span className="wlc-t-why">{r.why}</span>
            </li>
          ))}
        </ol>

        <div className="wlc-outcome" aria-live="polite">
          {finished ? (
            <>
              <p><b>Address leaked:</b> <span className={trace.leaked ? 'wlc-bad' : 'wlc-good'}>{trace.leaked ? 'Yes' : 'No'}</span></p>
              <p><b>Task:</b> {TASK_TEXT[trace.task]}</p>
              <p><b>Times a person was asked:</b> {trace.prompts}</p>
            </>
          ) : (
            <p className="wlc-small">Step through to the end to see the outcome.</p>
          )}
        </div>

        <h4 className="wlc-h">Does the address leak? Each defence alone, in this script</h4>
        <div className="wlc-scroll" tabIndex={0} role="region" aria-label="Table of defences against the two attacks">
          <table>
            <thead>
              <tr><th scope="col">Defences on</th><th scope="col">Attack A</th><th scope="col">Attack B</th></tr>
            </thead>
            <tbody>
              {matrix.map((m) => (
                <tr key={m.label}>
                  <th scope="row">{m.label}</th>
                  <td className={m.a ? 'wlc-bad' : 'wlc-good'}>{m.a ? 'Leaks' : 'Safe'}</td>
                  <td className={m.b ? 'wlc-bad' : 'wlc-good'}>{m.b ? 'Leaks' : 'Safe'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="viz-cap">
          The allow-list stops Attack A and does nothing against Attack B, which uses the shop's own site. The page filter is scripted to catch A's plain wording and miss B's disguise. The controls that do not depend on reading the attacker's mind, the confirmation gate and the clean sandbox, hold in both cases, and each has a cost: a prompt for a person, or a task that ends with a hand-off.
        </p>
      </div>
    </Root>
  );
}
