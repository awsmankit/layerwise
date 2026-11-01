import { useMemo } from 'react';
import { Root } from './shared';
import PatternSvg from './PatternSvg';
import { buildRun, DEFAULT_LOOKUPS, PATTERNS } from '../../lib/agent-patterns';

/** Six multi-agent patterns, one small diagram each, with what each is for. Static; the explorer below animates them. */
export default function PatternGallery() {
  const runs = useMemo(() => PATTERNS.filter((p) => p.id !== 'single').map((p) => ({ p, run: buildRun(p.id, { lookups: DEFAULT_LOOKUPS, batch: false, fail: false, checker: false }) })), []);
  return (
    <Root>
      <div className="viz ab-pg">
        <p className="viz-title">The six patterns</p>
        <ul className="ab-grid">
          {runs.map(({ p, run }) => (
            <li key={p.id} className="ab-card">
              <h3 className="ab-cardname">{p.name}</h3>
              <PatternSvg run={run} />
              <p className="ab-cardtext">{p.summary}</p>
              <p className="ab-cardtext"><b>Control flow:</b> {p.control === 'code' ? 'your code (a workflow)' : 'a model decides'}</p>
            </li>
          ))}
        </ul>
        <p className="viz-cap">Dashed boxes are ordinary code, not a model. Faint boxes are specialists this request did not need.</p>
      </div>
    </Root>
  );
}
