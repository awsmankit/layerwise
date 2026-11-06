import type { ReactNode } from 'react';
import { Root } from '../viz/shared';

/**
 * The shared shell for every "What if?" demo: a heading, a clear two-way switch between the
 * normal system and the changed one, the figure, and a one-line verdict that updates with the switch.
 * Demos keep their own state and pass `on` (true means the part is present) and `onChange`.
 */
export default function WhatIfFrame({
  title,
  withLabel,
  withoutLabel,
  on,
  onChange,
  verdict,
  controls,
  children,
}: {
  title: string;
  /** Label for the normal system, e.g. "With KV cache". */
  withLabel: string;
  /** Label for the changed system, e.g. "Without it". */
  withoutLabel: string;
  on: boolean;
  onChange: (on: boolean) => void;
  /** One short sentence that says what the viewer is looking at right now, with the key number. */
  verdict: ReactNode;
  /** Optional sliders or pickers that sit under the switch. */
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Root>
      <div className="viz wi">
        <p className="viz-title">{title}</p>
        <div className="wi-switch" role="group" aria-label="Choose which system to look at">
          <button type="button" className={on ? 'is-on' : ''} aria-pressed={on} onClick={() => onChange(true)}>
            {withLabel}
          </button>
          <button type="button" className={!on ? 'is-on is-off' : ''} aria-pressed={!on} onClick={() => onChange(false)}>
            {withoutLabel}
          </button>
        </div>
        {controls && <div className="viz-controls wi-controls">{controls}</div>}
        <div className="wi-stage">{children}</div>
        <p className="wi-verdict" aria-live="polite">
          {verdict}
        </p>
      </div>
    </Root>
  );
}
