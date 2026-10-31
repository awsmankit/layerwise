import { useState } from 'react';
import { Root } from './shared';
import { RULES, TEMPS, WEATHERS, firedRules, type Temp, type Weather } from '../../lib/reasoning';

/** A tiny rule-based helper: three if-then rules written by a person, and a case none of them covers. */
export default function RuleHelper() {
  const [w, setW] = useState<Weather>('sunny');
  const [t, setT] = useState<Temp>('warm');
  const fired = firedRules(w, t);
  const ids = fired.map((r) => r.id);

  const say = fired.length
    ? `${w[0].toUpperCase() + w.slice(1)} and ${t}: ${fired.map((r) => r.then).join(', and ')}.`
    : `${w[0].toUpperCase() + w.slice(1)} and ${t}: no rule matches, so the helper has nothing to say. Nobody wrote a rule for this day.`;

  return (
    <Root>
      <div className="viz ka-rh">
        <p className="viz-title">What should I wear? A helper made of rules</p>
        <div className="ka-rh-pick">
          <div role="group" aria-label="Weather" className="ka-row ka-rh-group">
            <span className="ka-label">Weather</span>
            {WEATHERS.map((x) => (
              <button key={x} type="button" className={`btn quiet ka-btn${w === x ? ' on' : ''}`} aria-pressed={w === x} onClick={() => setW(x)}>
                {x}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Temperature" className="ka-row ka-rh-group">
            <span className="ka-label">Temperature</span>
            {TEMPS.map((x) => (
              <button key={x} type="button" className={`btn quiet ka-btn${t === x ? ' on' : ''}`} aria-pressed={t === x} onClick={() => setT(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
        <ol className="ka-rules-list" aria-label="The three rules">
          {RULES.map((r) => (
            <li key={r.id} className={ids.includes(r.id) ? 'on' : ''}>
              <span>
                {r.text}, <b>{r.then}</b>.
              </span>
              <span className="ka-rule-flag">{ids.includes(r.id) ? 'matches' : 'no match'}</span>
            </li>
          ))}
        </ol>
        <p className="ka-say" aria-live="polite">
          {say}
        </p>
        <p className="viz-cap">Try snowy and warm, or windy and warm. A person had to think of every case in advance, which is why long rule lists never quite finish.</p>
      </div>
    </Root>
  );
}
