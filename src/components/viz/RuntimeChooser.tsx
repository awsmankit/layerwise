import { useState } from 'react';
import { Root } from './shared';
import { SOURCES, TARGETS, recommend, type Source, type Target } from '../../lib/runtime-chooser';

/** Pick where the model comes from and where it must run; see the routes the vendors' documents describe. */
export default function RuntimeChooser() {
  const [source, setSource] = useState<Source>('pytorch');
  const [target, setTarget] = useState<Target>('android');
  const recs = recommend(source, target);
  const srcLabel = SOURCES.find((s) => s.id === source)!.label;
  const tgtLabel = TARGETS.find((t) => t.id === target)!.label;

  return (
    <Root>
      <div className="viz ea-rc">
        <p className="viz-title">Which runtime for my chip?</p>
        <p className="ea-label" id="ea-rc-src">My model comes from</p>
        <div className="ea-chips" role="group" aria-labelledby="ea-rc-src">
          {SOURCES.map((s) => (
            <button key={s.id} type="button" className="ea-chip" aria-pressed={s.id === source} onClick={() => setSource(s.id)}>
              <span className="ea-chip-name">{s.label}</span>
            </button>
          ))}
        </div>
        <p className="ea-label" id="ea-rc-tgt">and has to run on</p>
        <div className="ea-chips" role="group" aria-labelledby="ea-rc-tgt">
          {TARGETS.map((t) => (
            <button key={t.id} type="button" className="ea-chip" aria-pressed={t.id === target} onClick={() => setTarget(t.id)}>
              <span className="ea-chip-name">{t.label}</span>
            </button>
          ))}
        </div>

        <div aria-live="polite">
          <p className="ea-rc-head">
            {srcLabel} to {tgtLabel}: {recs.length === 0 ? 'no documented direct route found' : recs.length === 1 ? '1 route' : `${recs.length} routes`}
          </p>
          {recs.length === 0 ? (
            <p className="ea-fit-note">
              The documents this lesson read describe no direct route for this pair. Common workarounds are to serve the model with the framework it was trained in, or to export it to ONNX and check whether a runtime for your target can read it. Check each converter's current operator support first.
            </p>
          ) : (
            <ul className="ea-rc-list">
              {recs.map((r, i) => (
                <li key={r.runtime + i} className="ea-rc-card">
                  <h4>
                    {r.runtime} <span className="ea-rc-art">{r.artefact}</span>
                  </h4>
                  <p>
                    <b>Accelerators:</b> {r.accel}.
                  </p>
                  <p>{r.why}</p>
                  <p className="ea-fit-note">
                    <b>Check:</b> {r.check}{' '}
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      Documentation
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="viz-cap">Routes are taken from each project&apos;s own documentation as read on 1 November 2026. Support changes with every release: treat this as a starting list, not a guarantee.</p>
      </div>
    </Root>
  );
}
