import { useMemo, useState } from 'react';
import { Root, fmt } from './shared';
import { SEMANTIC, UTTERANCES, endpointAll, type Utterance } from '../../lib/voice-budget';

const TAIL = 1600; // how much of the final silence to draw, ms

/** Total drawn width of an utterance in ms: speech, inner silences and the drawn tail. */
const drawn = (u: Utterance) => u.segments.reduce((a, s, i) => a + s.speechMs + (i === u.segments.length - 1 ? TAIL : s.silenceMs), 0);
const SCALE = Math.max(...UTTERANCES.map(drawn));

/** When, in ms from the start of the utterance, the agent decides, given where it decided and how long it waited. */
function decisionTime(u: Utterance, after: number, waited: number) {
  let t = 0;
  for (let i = 0; i <= after; i++) t += u.segments[i].speechMs + (i < after ? u.segments[i].silenceMs : 0);
  return t + waited;
}

/**
 * Scripted utterances with pauses, and a silence threshold. Shows when a silence-only detector cuts the user
 * off and what a long threshold costs in delay. The "meaning-aware" mode is a toy rule, not a real model.
 */
export default function VoiceEndpoint() {
  const [threshold, setThreshold] = useState(500);
  const [semantic, setSemantic] = useState(false);
  const summary = useMemo(() => endpointAll(threshold, semantic), [threshold, semantic]);

  return (
    <Root>
      <div className="viz wm wm-ep">
        <p className="viz-title">How long should the agent wait?</p>
        <div className="wm-chips" role="group" aria-label="Detector">
          <button type="button" className="wm-chip" aria-pressed={!semantic} onClick={() => setSemantic(false)}>
            Silence only
          </button>
          <button type="button" className="wm-chip" aria-pressed={semantic} onClick={() => setSemantic(true)}>
            Toy meaning-aware rule
          </button>
        </div>
        {semantic ? (
          <p className="wm-note">
            Toy rule: if the words so far look unfinished, wait up to {fmt.ms(SEMANTIC.unfinishedWaitMs)}; if they look finished, answer after {fmt.ms(SEMANTIC.finishedWaitMs)}. The "finished" flags are scripted. A real model judges from the words and the sound, and it makes mistakes.
          </p>
        ) : (
          <div className="viz-controls wm-controls">
            <label className="field">
              <span>
                Silence before the agent answers <b>{fmt.ms(threshold)}</b>
              </span>
              <input type="range" min={200} max={1500} step={50} value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
            </label>
          </div>
        )}

        <ol className="wm-utts">
          {summary.outcomes.map((o) => {
            const u = UTTERANCES.find((x) => x.id === o.id)!;
            const at = decisionTime(u, o.decidedAfter, o.waitedMs);
            return (
              <li key={u.id} className={`wm-utt${o.cutOff ? ' is-cut' : ''}`}>
                <p className="wm-utt-head">
                  <span className="wm-utt-label">{u.label}</span>
                  <span className="wm-utt-state">{o.cutOff ? 'Cut off' : `Answered after ${fmt.ms(o.waitedMs)} of silence`}</span>
                </p>
                <div className="wm-strip" aria-hidden="true">
                  {u.segments.map((s, i) => {
                    const sil = i === u.segments.length - 1 ? TAIL : s.silenceMs;
                    return (
                      <span key={i} className="wm-seg" style={{ width: `${((s.speechMs + sil) / SCALE) * 100}%` }}>
                        <span className="wm-speech" style={{ width: `${(s.speechMs / (s.speechMs + sil)) * 100}%` }} />
                      </span>
                    );
                  })}
                  <i className={`wm-reply${o.cutOff ? ' is-cut' : ''}`} style={{ left: `${(at / SCALE) * 100}%` }} />
                </div>
                <p className="wm-utt-text">
                  {u.segments.map((s, i) => (
                    <span key={i}>
                      {s.text}
                      {i < u.segments.length - 1 ? ` [pause ${s.silenceMs} ms] ` : ''}
                      {o.cutOff && i === o.decidedAfter ? ' | agent starts talking here | ' : ''}
                    </span>
                  ))}
                </p>
              </li>
            );
          })}
        </ol>

        <div className={`wm-status${summary.cutOffs > 0 ? ' is-warn' : ''}`} aria-live="polite">
          {summary.cutOffs === 0 ? 'No one is cut off. ' : `${summary.cutOffs} of ${UTTERANCES.length} people are cut off mid-thought. `}
          Mean wait added to the turns that were not cut off: <b className="num">{fmt.ms(summary.meanDelayMs)}</b>.
        </div>
        <p className="viz-cap">The utterances and pauses are invented. Bars show speech (solid) and silence (light); the line marks where the agent starts to answer.</p>
      </div>
    </Root>
  );
}
