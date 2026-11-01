import { useMemo, useState } from 'react';
import { Root, fmt, useNarrow } from './shared';
import {
  BAD_DEFAULTS,
  BAD_FIXED,
  CUES,
  GOOD_DEFAULTS,
  TAG_LABEL,
  TASK,
  callText,
  cueMet,
  estimateTokens,
  measure,
  run,
  toolsFor,
  type Metrics,
  type Run,
  type SetId,
  type Tag,
  type ToolDef,
} from '../../lib/tool-lab';

const SET_TITLE: Record<SetId, string> = {
  bad: 'Set A: one thin wrapper per endpoint',
  good: 'Set B: designed for the agent',
};
const SET_TAB: Record<SetId, string> = { bad: 'Set A: thin wrappers', good: 'Set B: designed' };

const GOOD_TAGS: Tag[] = ['ok', 'helpful-error', 'preview', 'approval', 'safe-retry'];

function shorten(text: string, max = 210): { shown: string; more: number } {
  if (text.length <= max) return { shown: text, more: 0 };
  return { shown: text.slice(0, max), more: estimateTokens(text.slice(max)) };
}

function Panel({
  set,
  tools,
  desc,
  onEdit,
  r,
  m,
}: {
  set: SetId;
  tools: ToolDef[];
  desc: Record<string, string>;
  onEdit: (tool: string, value: string) => void;
  r: Run;
  m: Metrics;
}) {
  const defaults = set === 'bad' ? BAD_DEFAULTS : GOOD_DEFAULTS;
  return (
    <section className="aa-panel" aria-label={SET_TITLE[set]}>
      <h4 className="aa-ph">{SET_TITLE[set]}</h4>
      <p className="aa-sub">
        {tools.length} tools, about {fmt.int(m.definitionTokens)} tokens of definitions sent with every request.
      </p>

      <div className="aa-tools">
        {tools.map((t) => {
          const cues = CUES.filter((c) => c.set === set && c.tool === t.name);
          if (!t.editable) {
            return (
              <p key={t.name} className="aa-tool">
                <code>{t.name}</code>
                <span className="aa-tool-d">{t.description}</span>
              </p>
            );
          }
          const id = `aa-${set}-${t.name}`;
          return (
            <div key={t.name} className="aa-tool aa-edit">
              <label htmlFor={id}>
                <code>{t.name}</code> description <span className="aa-tag-edit">editable</span>
              </label>
              <textarea id={id} rows={3} value={desc[t.name] ?? defaults[t.name]} onChange={(e) => onEdit(t.name, e.target.value)} spellCheck={false} />
              <ul className="aa-cues">
                {cues.map((c) => {
                  const ok = cueMet(c.id, desc[t.name] ?? defaults[t.name]);
                  return (
                    <li key={c.id} className={ok ? 'is-met' : 'is-open'}>
                      <span className="aa-cue-state">{ok ? 'Said it' : 'Not said'}</span> {c.hint}
                      <span className="aa-words"> The toy reader looks for: {c.words}.</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <h5 className="aa-th">Scripted transcript</h5>
      <ol className="aa-log">
        {r.turns.map((t, i) => {
          const { shown, more } = shorten(t.result);
          const good = GOOD_TAGS.includes(t.tag);
          return (
            <li key={i} className={`aa-turn ${t.kind === 'host' ? 'is-host' : ''}`}>
              <div className="aa-turn-top">
                <span className={`aa-chip ${good ? 'is-good' : 'is-bad'}`}>{TAG_LABEL[t.tag]}</span>
                <code className="aa-call">{callText(t)}</code>
              </div>
              <pre className="aa-result">
                {shown}
                {more > 0 ? <span className="aa-more">{` ... [${fmt.int(more)} more tokens]`}</span> : null}
              </pre>
              <p className="aa-note">{t.note}</p>
            </li>
          );
        })}
        <li className="aa-turn is-final">
          <div className="aa-turn-top">
            <span className="aa-chip is-plain">The agent tells the user</span>
          </div>
          <p className="aa-final">{r.answer}</p>
        </li>
      </ol>
      <p className={`aa-outcome ${m.correct ? 'is-right' : 'is-wrong'}`}>
        <b>What actually happened:</b> {m.outcome}
      </p>
    </section>
  );
}

/**
 * Same task, two tool sets. Everything is scripted: the learner edits tool
 * descriptions and the script checks them for a few cues, then plays the
 * branch a careless or careful reader would take. No model runs.
 */
export default function ToolLab() {
  const narrow = useNarrow();
  const [badDesc, setBadDesc] = useState<Record<string, string>>({ ...BAD_DEFAULTS });
  const [goodDesc, setGoodDesc] = useState<Record<string, string>>({ ...GOOD_DEFAULTS });
  const [timeout, setTimeoutOn] = useState(false);
  const [tab, setTab] = useState<SetId>('bad');

  const data = useMemo(() => {
    const out = {} as Record<SetId, { tools: ToolDef[]; r: Run; m: Metrics }>;
    (['bad', 'good'] as SetId[]).forEach((s) => {
      const d = s === 'bad' ? badDesc : goodDesc;
      const tools = toolsFor(s, d);
      const r = run(s, d, { timeout });
      out[s] = { tools, r, m: measure(r, tools) };
    });
    return out;
  }, [badDesc, goodDesc, timeout]);

  const rows: { label: string; get: (m: Metrics) => string }[] = [
    { label: 'Tools offered', get: () => '' },
    { label: 'Tool calls', get: (m) => String(m.calls) },
    { label: 'Calls that failed', get: (m) => String(m.failedCalls) },
    { label: 'Tokens in tool results', get: (m) => fmt.int(m.resultTokens) },
    { label: 'Context at the end', get: (m) => fmt.int(m.peakContext) },
    { label: 'Input tokens summed over every turn', get: (m) => fmt.int(m.cumulativeInput) },
  ];

  const show = (s: SetId) => (
    <Panel
      key={s}
      set={s}
      tools={data[s].tools}
      desc={s === 'bad' ? badDesc : goodDesc}
      onEdit={(tool, v) => (s === 'bad' ? setBadDesc((p) => ({ ...p, [tool]: v })) : setGoodDesc((p) => ({ ...p, [tool]: v })))}
      r={data[s].r}
      m={data[s].m}
    />
  );

  return (
    <Root>
      <div className="viz aa-lab">
        <p className="viz-title">Tool lab: one task, two tool sets</p>
        <p className="aa-banner">
          <b>An illustrative simulation, not a real model run.</b> The transcripts are scripted. Your edits change which scripted branch plays, based on a few cue words. A real model is fuzzier. Token counts are estimates at about four characters per token.
        </p>
        <p className="aa-task">
          <b>Task:</b> {TASK} <span className="aa-data">(All names, IDs and amounts are made up.)</span>
        </p>

        <div className="aa-controls">
          <button type="button" className="btn quiet" onClick={() => setBadDesc({ ...BAD_DEFAULTS, ...BAD_FIXED })}>
            Rewrite set A descriptions carefully
          </button>
          <button type="button" className="btn quiet" onClick={() => setBadDesc({ ...BAD_DEFAULTS })}>
            Set A back to vague
          </button>
          <button type="button" className="btn quiet" onClick={() => setGoodDesc({ ...GOOD_DEFAULTS, billing_get_order_charges: 'Shows charges.' })}>
            Make set B's description vague
          </button>
          <button type="button" className="btn quiet" onClick={() => setGoodDesc({ ...GOOD_DEFAULTS })}>
            Set B back
          </button>
          <label className="aa-check">
            <input type="checkbox" checked={timeout} onChange={(e) => setTimeoutOn(e.target.checked)} />
            <span>The refund goes through, but its reply times out</span>
          </label>
        </div>

        <div aria-live="polite">
          <table className="aa-score">
            <caption>Scoreboard (estimates for this scripted run)</caption>
            <thead>
              <tr>
                <th scope="col"><span className="aa-sr">Measure</span></th>
                <th scope="col">Set A</th>
                <th scope="col">Set B</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Tools offered</th>
                <td>{data.bad.tools.length}</td>
                <td>{data.good.tools.length}</td>
              </tr>
              {rows.slice(1).map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.get(data.bad.m)}</td>
                  <td>{row.get(data.good.m)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">Outcome</th>
                <td className={data.bad.m.correct ? 'is-right' : 'is-wrong'}>{data.bad.m.correct ? 'Correct' : 'Wrong'}</td>
                <td className={data.good.m.correct ? 'is-right' : 'is-wrong'}>{data.good.m.correct ? 'Correct' : 'Wrong'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {narrow ? (
          <>
            <div className="aa-tabs" role="group" aria-label="Choose a tool set">
              {(['bad', 'good'] as SetId[]).map((s) => (
                <button key={s} type="button" className="aa-tab" aria-pressed={tab === s} onClick={() => setTab(s)}>
                  {SET_TAB[s]}
                </button>
              ))}
            </div>
            {show(tab)}
          </>
        ) : (
          <div className="aa-cols">
            {show('bad')}
            {show('good')}
          </div>
        )}

        <p className="viz-cap">
          Try this: rewrite set A's descriptions and watch the failures disappear. Then switch on the timeout. Better descriptions fix the guesses, but only a design that makes a retry safe fixes the double refund.
        </p>
      </div>
    </Root>
  );
}
