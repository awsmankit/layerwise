import { useState } from 'react';
import { Root } from './shared';
import { RUNGS, type Rung } from '../../lib/tool-choice';

const MAX = Math.max(...RUNGS.map((r) => r.points));

/** The ladder of options, simplest first. Pick a rung to see when it fits and how it fails. */
export default function ToolLadder() {
  const [open, setOpen] = useState<Rung>('rules');
  const info = RUNGS.find((r) => r.id === open)!;
  return (
    <Root>
      <div className="viz pr-ladder">
        <p className="viz-title">The ladder: choose the lowest rung that meets the bar</p>
        <ol className="pr-rungs" aria-label="Options from simplest to most complex">
          {RUNGS.map((r, i) => (
            <li key={r.id}>
              <button type="button" className="pr-rung" aria-pressed={open === r.id} aria-controls="pr-ladder-detail" onClick={() => setOpen(r.id)}>
                <span className="pr-rung-n" aria-hidden="true">{i + 1}</span>
                <span className="pr-rung-main">
                  <span className="pr-rung-name">{r.label}</span>
                  <span className="pr-rung-gist">{r.gist}</span>
                </span>
                <span className="pr-rung-bar" aria-hidden="true"><i style={{ width: `${Math.max(4, (r.points / MAX) * 100)}%` }} /></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="pr-detail" id="pr-ladder-detail" aria-live="polite">
          <p><b>{info.label}: use it when</b> {info.useWhen.charAt(0).toLowerCase() + info.useWhen.slice(1)}</p>
          <p><b>It fails by:</b> {info.failsBy.charAt(0).toLowerCase() + info.failsBy.slice(1)}</p>
        </div>
        <p className="viz-cap">The bars show relative build, run and upkeep effort on an example scale of 0 to {MAX}. They are not measurements. Rung 2 covers plain code, rules, regex and database queries.</p>
      </div>
    </Root>
  );
}
