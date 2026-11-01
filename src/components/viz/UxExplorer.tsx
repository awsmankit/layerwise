import { useId, useMemo, useState } from 'react';
import { Root } from './shared';
import { CLAIMS, DEFAULT_CONFIG, FLAGGED, TRUST_TEXT, WRONG_ID, generationTime, secs, simulate, visibleClaims, type Cue, type UxConfig, type UxResult } from '../../lib/ai-ux';

/**
 * Before and after explorer for one scripted feature: "summarise this support ticket".
 * Toggles for streaming, citations, uncertainty cues and an editable summary change what a
 * scripted user sees and how long the task takes. Every number is an example (see src/lib/ai-ux.ts).
 */

const CUES: { id: Cue; label: string; hint: string }[] = [
  { id: 'none', label: 'No cue', hint: 'The summary is shown as plain fact.' },
  { id: 'footer', label: 'Footer disclaimer', hint: '"AI can make mistakes" at the bottom.' },
  { id: 'flags', label: 'Flags on shaky claims', hint: 'Two claims are flagged "check this". One of them is the wrong one.' },
  { id: 'flags-off', label: 'Flags, badly calibrated', hint: 'Two other claims are flagged. The wrong one is not.' },
];

const SEGMENTS: { key: keyof Pick<UxResult, 'firstText' | 'readDone' | 'checkTime' | 'fixTime' | 'lateCost'>; label: string; cls: string }[] = [
  { key: 'firstText', label: 'Wait', cls: 'wait' },
  { key: 'readDone', label: 'Read', cls: 'read' },
  { key: 'checkTime', label: 'Check', cls: 'check' },
  { key: 'fixTime', label: 'Fix', cls: 'fix' },
  { key: 'lateCost', label: 'Rework later', cls: 'late' },
];

/** Seconds spent in each phase, in order. */
function phases(r: UxResult): number[] {
  return [r.firstText, r.readDone - r.firstText, r.checkTime, r.fixTime, r.lateCost];
}

const SCALE = 230;

function Bar({ name, r }: { name: string; r: UxResult }) {
  const ph = phases(r);
  return (
    <div className="wld-barrow">
      <span className="wld-barname">{name}</span>
      <div className="wld-bar" role="img" aria-label={`${name}: ${SEGMENTS.map((s, i) => `${s.label} ${secs(ph[i])}`).join(', ')}. Total ${secs(r.total)}.`}>
        {SEGMENTS.map((s, i) => (ph[i] > 0 ? <span key={s.label} className={`wld-seg wld-seg-${s.cls}`} style={{ width: `${(ph[i] / SCALE) * 100}%` }} /> : null))}
      </div>
      <span className="wld-bartotal num">{secs(r.total)}</span>
    </div>
  );
}

export default function UxExplorer() {
  const uid = useId();
  const [cfg, setCfg] = useState<UxConfig>({ ...DEFAULT_CONFIG });
  const [t, setT] = useState(2.4);
  const [open, setOpen] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);

  const base = useMemo(() => simulate(DEFAULT_CONFIG), []);
  const mine = useMemo(() => simulate(cfg), [cfg]);
  const shown = visibleClaims(cfg.streaming, t);
  const flagged = FLAGGED[cfg.cue];
  const gen = generationTime();

  const set = (patch: Partial<UxConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const reset = () => {
    setCfg({ ...DEFAULT_CONFIG });
    setOpen(null);
    setReveal(false);
  };

  const verdict = `${secs(mine.atDesk)} at the desk, first text after ${secs(mine.firstText)}. ${mine.shipped ? 'The wrong claim goes to the customer.' : 'The wrong claim is caught before it ships.'} ${TRUST_TEXT[mine.trust]}`;

  return (
    <Root>
      <div className="viz wld-ux">
        <p className="viz-title">Summarise a ticket: change the design, watch the user</p>
        <p className="wld-lead">
          A support agent presses <b>Summarise</b> on a 400-word ticket. The summary has six claims and <b>one is wrong</b>. A scripted user reads it, checks what the design invites them to check, and moves on.
        </p>

        <div className="wld-controls">
          <fieldset className="wld-fs">
            <legend>Switch on</legend>
            <label className="wld-check">
              <input type="checkbox" checked={cfg.streaming} onChange={(e) => set({ streaming: e.target.checked })} />
              <span>Stream the text</span>
            </label>
            <label className="wld-check">
              <input type="checkbox" checked={cfg.citations} onChange={(e) => set({ citations: e.target.checked })} />
              <span>Cite the ticket line for each claim</span>
            </label>
            <label className="wld-check">
              <input type="checkbox" checked={cfg.editable} onChange={(e) => set({ editable: e.target.checked })} />
              <span>Editable in place, with undo</span>
            </label>
          </fieldset>
          <fieldset className="wld-fs">
            <legend>Uncertainty cue</legend>
            {CUES.map((c) => (
              <label key={c.id} className="wld-check">
                <input type="radio" name={`${uid}-cue`} checked={cfg.cue === c.id} onChange={() => set({ cue: c.id })} />
                <span>
                  {c.label}
                  <small>{c.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <div className="wld-scrub">
          <label htmlFor={`${uid}-t`}>
            What the user sees <b className="num">{t.toFixed(1)} s</b> after pressing Summarise
          </label>
          <input id={`${uid}-t`} type="range" min={0} max={8} step={0.1} value={t} onChange={(e) => setT(Number(e.target.value))} aria-valuetext={`${t.toFixed(1)} seconds`} />
        </div>

        <div className="wld-card" aria-label="Preview of the summary panel">
          <div className="wld-cardhead">
            <b>Ticket summary</b>
            <span className="wld-ai">AI</span>
          </div>
          {shown === 0 ? (
            <p className="wld-wait">
              <span className="wld-spin" aria-hidden="true" />
              {cfg.streaming ? 'Summarising… first words arrive at 1.8 s' : `Summarising… the whole summary appears at ${secs(gen)}`}
            </p>
          ) : (
            <ol className="wld-claims">
              {CLAIMS.slice(0, shown).map((c) => {
                const isFlag = flagged.includes(c.id);
                const isWrongShown = reveal && c.id === WRONG_ID;
                return (
                  <li key={c.id} className={isWrongShown ? 'is-wrong' : undefined}>
                    <span className="wld-claimtext">{c.text}</span>
                    {isFlag && <span className="wld-flag">check this</span>}
                    {cfg.citations && (
                      <button type="button" className="wld-cite" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)} aria-label={`Source for claim ${c.id}`}>
                        [{c.id}]
                      </button>
                    )}
                    {isWrongShown && <span className="wld-wrongtag">wrong</span>}
                    {cfg.citations && open === c.id && <span className="wld-source">{c.source}</span>}
                  </li>
                );
              })}
            </ol>
          )}
          {shown > 0 && shown < CLAIMS.length && <p className="wld-more">More text is still arriving.</p>}
          {shown === CLAIMS.length && (
            <div className="wld-actions">
              {cfg.editable && (
                <>
                  <span className="wld-pill">Edit</span>
                  <span className="wld-pill">Undo</span>
                </>
              )}
              <span className="wld-pill">Regenerate</span>
            </div>
          )}
          {shown === CLAIMS.length && cfg.cue === 'footer' && <p className="wld-foot">AI can make mistakes. Check important information.</p>}
        </div>

        <div className="wld-row">
          <button type="button" className="wld-btn" aria-pressed={reveal} onClick={() => setReveal((r) => !r)}>
            {reveal ? 'Hide the wrong claim' : 'Which claim is wrong?'}
          </button>
          <button type="button" className="wld-btn" onClick={reset}>
            Reset
          </button>
        </div>

        <div className="wld-bars">
          <Bar name="All off" r={base} />
          <Bar name="Your design" r={mine} />
          <ul className="wld-legend" aria-label="Legend">
            {SEGMENTS.map((s) => (
              <li key={s.label}>
                <span className={`wld-swatch wld-seg-${s.cls}`} aria-hidden="true" />
                {s.label}
              </li>
            ))}
          </ul>
        </div>

        <table className="wld-table">
          <caption>Example numbers for one scripted user</caption>
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">All off</th>
              <th scope="col">Your design</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Wait before there is anything to read</th>
              <td className="num">{secs(base.firstText)}</td>
              <td className="num">{secs(mine.firstText)}</td>
            </tr>
            <tr>
              <th scope="row">Time at the desk</th>
              <td className="num">{secs(base.atDesk)}</td>
              <td className="num">{secs(mine.atDesk)}</td>
            </tr>
            <tr>
              <th scope="row">Claims checked</th>
              <td className="num">{base.checked.length}</td>
              <td className="num">{mine.checked.length}</td>
            </tr>
            <tr>
              <th scope="row">Wrong claim</th>
              <td>{base.shipped ? 'ships' : 'caught'}</td>
              <td>{mine.shipped ? 'ships' : 'caught'}</td>
            </tr>
            <tr>
              <th scope="row">Total if a shipped error is found later</th>
              <td className="num">{secs(base.total)}</td>
              <td className="num">{secs(mine.total)}</td>
            </tr>
          </tbody>
        </table>

        <p className="wld-verdict" aria-live="polite">
          <b>Trust, in this script: </b>
          {verdict}
        </p>
        <p className="viz-cap">
          Every number is an example for this one script: a model that takes 1.8 s to start and writes 40 tokens a second, a reader at 240 words a minute, 30 s to find a fact in the ticket, 8 s with a citation. Measure your own users. The shape of the result, not the seconds, is the lesson.
        </p>
      </div>
    </Root>
  );
}
