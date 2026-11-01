import { useState } from 'react';
import { Root } from './shared';
import { fixedGates, holdShares, selectiveGates } from '../../lib/ssm';

const TOKENS = ['The', 'password', 'is', 'tulip', '.', 'The', 'bus', 'was', 'late', 'again', '.'];
const START_MARKED = [false, false, false, true, false, false, false, false, false, false, false];
const HIGH = 0.9;
const LOW = 0.03;

const pct = (v: number) => (v >= 0.9995 ? '100%' : v < 0.0005 ? '0%' : `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`);

export default function SelectiveGate() {
  const [marked, setMarked] = useState<boolean[]>(START_MARKED);
  const [g, setG] = useState(0.3);
  const [t, setT] = useState(TOKENS.length); // tokens read so far

  const gates = selectiveGates(marked, HIGH, LOW);
  const fixed = holdShares(fixedGates(TOKENS.length, g), t - 1);
  const sel = holdShares(gates, t - 1);
  const keptBy = (shares: number[]) => shares.reduce((acc, w, i) => (marked[i] ? acc + w : acc), 0);
  const names = TOKENS.filter((_, i) => marked[i] && i < t).map((w) => `"${w}"`);
  const any = names.length > 0;

  const live = any
    ? `After ${t} tokens, the marked tokens ${names.join(', ')} make up ${pct(keptBy(fixed))} of the state with a fixed gate and ${pct(keptBy(sel))} with a selective gate. An attention cache still holds each of them in full.`
    : 'No token is marked. Tap a word to mark it as important.';

  const toggle = (i: number) => setMarked((m) => m.map((v, j) => (j === i ? !v : v)));

  return (
    <Root>
      <div className="viz wc wc-gate">
        <p className="viz-title">What a one-number state keeps: a fixed gate against a selective one</p>
        <p className="wc-intro">
          The state is a single number that is rewritten at every token: <b>new state = (1 &minus; gate) &times; old state + gate &times; input</b>. The bars show how much of the state each token still accounts for. Tap words to mark them as important.
        </p>

        <div className="wc-controls">
          <label className="field">
            <span>
              Fixed gate (same for every token) <b>{g.toFixed(2)}</b>
            </span>
            <input type="range" min={0.05} max={0.6} step={0.05} value={g} aria-label="Fixed gate value" onChange={(e) => setG(+e.target.value)} />
          </label>
          <label className="field">
            <span>
              Tokens read so far <b>{t} of {TOKENS.length}</b>
            </span>
            <input type="range" min={1} max={TOKENS.length} step={1} value={t} aria-label="Number of tokens read so far" onChange={(e) => setT(+e.target.value)} />
          </label>
        </div>

        <div className="wc-rows" role="group" aria-label="Share of the state held from each token">
          <div className="wc-row wc-head" aria-hidden="true">
            <span>Token</span>
            <span>Fixed gate</span>
            <span>Selective gate</span>
            <span>Attention cache</span>
          </div>
          {TOKENS.map((w, i) => {
            const read = i < t;
            return (
              <div key={i} className={`wc-row${read ? '' : ' wc-unread'}`}>
                <button
                  type="button"
                  className="wc-tok"
                  aria-pressed={marked[i]}
                  aria-label={`${w}, token ${i + 1}: ${marked[i] ? 'marked important, gate ' + HIGH : 'not marked, gate ' + LOW}. Tap to change.`}
                  onClick={() => toggle(i)}
                >
                  <span className="wc-w">{w}</span>
                  <span className="wc-gv">gate {(marked[i] ? HIGH : LOW).toFixed(2)}</span>
                </button>
                {read ? (
                  <>
                    <span className="wc-cell">
                      <span className="wc-bar" aria-hidden="true">
                        <span className="wc-fill wc-f-fixed" style={{ width: `${fixed[i] * 100}%` }} />
                      </span>
                      <span className="wc-pv num">{pct(fixed[i])}</span>
                    </span>
                    <span className="wc-cell">
                      <span className="wc-bar" aria-hidden="true">
                        <span className="wc-fill wc-f-sel" style={{ width: `${sel[i] * 100}%` }} />
                      </span>
                      <span className="wc-pv num">{pct(sel[i])}</span>
                    </span>
                    <span className="wc-cell">
                      <span className="wc-bar" aria-hidden="true">
                        <span className="wc-fill wc-f-cache" style={{ width: '100%' }} />
                      </span>
                      <span className="wc-pv num">kept</span>
                    </span>
                  </>
                ) : (
                  <span className="wc-later">not read yet</span>
                )}
              </div>
            );
          })}
        </div>

        <p className="wc-status" aria-live="polite">
          {live}
        </p>
        <p className="viz-cap">
          A one-channel toy of the recurrence in Gu and Dao (2023), Theorem 1, with hand-set gates ({HIGH} for marked words, {LOW} for the rest). A real model computes the gate from each token and has many channels, each with N state numbers (16 in the paper), so it can hold more than this toy. The shares always add up to at most 100%: the state is a budget that new input draws on. The attention cache keeps every token, at the price of one more cache entry per token.
        </p>
      </div>
    </Root>
  );
}
