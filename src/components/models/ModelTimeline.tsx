import { useMemo, useState } from 'react';
import { Root, useNarrow } from '../viz/shared';
import { models, vendors } from '../../data/models';
import { shortName, timelineLayout } from '../../lib/models';
import { Marker, ModelFacts, Legend, activate, vendorClass } from './shared';

/** Release timeline: one row per vendor, one marker per model, newer to the right. */
export default function ModelTimeline({ today }: { today: string }) {
  const narrow = useNarrow('(max-width: 640px)');
  const chrono = useMemo(() => [...models].sort((a, b) => a.releasedOn.localeCompare(b.releasedOn) || a.id.localeCompare(b.id)), []);
  const [sel, setSel] = useState(chrono[chrono.length - 1].id);
  const width = narrow ? 280 : 760;
  const tl = useMemo(
    () => timelineLayout(models, vendors, { width, today, labels: !narrow, dotGap: 22, laneHeight: narrow ? 28 : 26, titleHeight: 24, padX: 16, padRight: narrow ? 16 : 112 }),
    [width, today, narrow],
  );
  const byId = new Map(models.map((m) => [m.id, m]));
  const idx = chrono.findIndex((m) => m.id === sel);
  const current = chrono[idx];

  return (
    <Root>
      <div className="viz mr-fig">
        <h3 className="viz-title">When each model was released</h3>
        <Legend />
        <svg className="mr-svg" viewBox={`0 0 ${tl.width} ${tl.height}`} role="group" aria-label="Release timeline by vendor. Each marker is a model; use Tab to move between them." style={{ width: '100%', height: 'auto' }}>
          {tl.ticks.map((t) => (
            <g key={t.label + t.x}>
              <line className="mr-grid" x1={t.x} x2={t.x} y1={0} y2={tl.axisY} />
              <text className="mr-axis-text" x={t.x} y={tl.axisY + 18} textAnchor="start">
                {t.label}
              </text>
            </g>
          ))}
          <line className="mr-today" x1={tl.todayX} x2={tl.todayX} y1={0} y2={tl.axisY} />
          {tl.rows.map((row) => (
            <g key={row.vendor}>
              <text className="mr-row-title" x={16} y={row.y + 15}>
                {row.vendor}
              </text>
              <line className="mr-row-line" x1={0} x2={tl.width} y1={row.y + row.height} y2={row.y + row.height} />
              {row.dots.map((d) => {
                const m = byId.get(d.id)!;
                const on = d.id === sel;
                return (
                  <g
                    key={d.id}
                    className={`mr-dot ${vendorClass(m.vendor)}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={on}
                    aria-label={`${m.name}, ${m.vendor}, released ${m.releasedOn}`}
                    onClick={() => setSel(d.id)}
                    onFocus={() => setSel(d.id)}
                    onKeyDown={activate(() => setSel(d.id))}
                  >
                    <circle className="mr-hit" cx={d.x} cy={d.y} r={14} />
                    {on && <circle className="mr-ring" cx={d.x} cy={d.y} r={11} />}
                    <Marker vendor={m.vendor} x={d.x} y={d.y} r={6} selected={on} />
                    {!narrow && (
                      <text className="mr-dot-label" x={d.x + 11} y={d.y + 4}>
                        {shortName(m)}
                      </text>
                    )}
                    {narrow && on && (
                      <text className="mr-dot-label" x={Math.min(d.x, tl.width - 120)} y={d.y - 12}>
                        {shortName(m)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
          <text className="mr-axis-text mr-today-label" x={Math.min(tl.todayX + 4, tl.width - 40)} y={11}>
            today
          </text>
        </svg>
        <ModelFacts model={current} today={today} />
        <div className="mr-step">
          <button type="button" className="mr-btn" disabled={idx <= 0} onClick={() => setSel(chrono[idx - 1].id)}>
            Earlier release
          </button>
          <button type="button" className="mr-btn" disabled={idx >= chrono.length - 1} onClick={() => setSel(chrono[idx + 1].id)}>
            Later release
          </button>
        </div>
        <p className="viz-cap">Dates are the ones each vendor gives on its own release note, model page or launch post. A model announced but not yet released to everyone shows its announcement date.</p>
      </div>
    </Root>
  );
}
