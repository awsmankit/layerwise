import { useMemo, useState } from 'react';
import { Root, useNarrow } from '../viz/shared';
import { models } from '../../data/models';
import { scatterLayout, sortModels, type PriceKind } from '../../lib/models';
import { Marker, ModelFacts, Legend, activate } from './shared';

/** Price against context window, both on log axes. Hover, focus or tap a marker for its facts. */
export default function ModelScatter({ today }: { today: string }) {
  const narrow = useNarrow('(max-width: 640px)');
  const [kind, setKind] = useState<PriceKind>('output');
  const [sel, setSel] = useState('claude-sonnet-5-5');
  const width = narrow ? 280 : 760;
  const height = narrow ? 300 : 400;
  const sc = useMemo(
    () => scatterLayout(models, { width, height, padLeft: narrow ? 50 : 58, padRight: 16, padTop: 14, padBottom: 52, kind, today, minDistance: 17 }),
    [width, height, narrow, kind, today],
  );
  const byId = new Map(models.map((m) => [m.id, m]));
  const order = useMemo(() => sortModels(models.filter((m) => sc.points.some((p) => p.id === m.id)), kind === 'input' ? 'input' : 'output'), [sc, kind]);
  const idx = Math.max(0, order.findIndex((m) => m.id === sel));
  const current = byId.get(sel) ?? order[0];
  const left = sc.left.map((id) => byId.get(id)!.name);
  const x0 = narrow ? 50 : 58;
  const plotBottom = height - 52;

  return (
    <Root>
      <div className="viz mr-fig">
        <h3 className="viz-title">Price against context window</h3>
        <div className="mr-ctl" role="radiogroup" aria-label="Which price to plot">
          {(['output', 'input'] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className="mr-chip" onClick={() => setKind(k)}>
              {k === 'output' ? 'Output price' : 'Input price'}
            </button>
          ))}
        </div>
        <Legend />
        <svg className="mr-svg" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Scatter of ${kind} price per million tokens against context window, both on log scales. Each marker is a model.`} style={{ width: '100%', height: 'auto' }}>
          {sc.yTicks.map((t) => (
            <g key={t.label}>
              <line className="mr-grid" x1={x0} x2={width - 16} y1={t.y} y2={t.y} />
              <text className="mr-axis-text" x={x0 - 6} y={t.y + 4} textAnchor="end">
                {t.label}
              </text>
            </g>
          ))}
          {sc.xTicks.map((t) => (
            <g key={t.label}>
              <line className="mr-grid" x1={t.x} x2={t.x} y1={14} y2={plotBottom} />
              <text className="mr-axis-text" x={t.x} y={plotBottom + 17} textAnchor="middle">
                {t.label}
              </text>
            </g>
          ))}
          <text className="mr-axis-title" x={(x0 + width - 16) / 2} y={height - 8} textAnchor="middle">
            Context window, tokens (log scale)
          </text>
          <text className="mr-axis-title" transform={`translate(12 ${(14 + plotBottom) / 2}) rotate(-90)`} textAnchor="middle">
            USD per million tokens (log)
          </text>
          {sc.points.map((p) => {
            const m = byId.get(p.id)!;
            const on = p.id === sel;
            return (
              <g
                key={p.id}
                className="mr-dot"
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${m.name}, ${m.vendor}`}
                onClick={() => setSel(p.id)}
                onFocus={() => setSel(p.id)}
                onPointerEnter={() => setSel(p.id)}
                onKeyDown={activate(() => setSel(p.id))}
              >
                <circle className="mr-hit" cx={p.dx} cy={p.dy} r={13} />
                {on && <circle className="mr-ring" cx={p.dx} cy={p.dy} r={12} />}
                <Marker vendor={m.vendor} x={p.dx} y={p.dy} r={5.5} selected={on} />
              </g>
            );
          })}
        </svg>
        {current && <ModelFacts model={current} today={today} />}
        <div className="mr-step">
          <button type="button" className="mr-btn" disabled={idx <= 0} onClick={() => setSel(order[idx - 1].id)}>
            Cheaper model
          </button>
          <button type="button" className="mr-btn" disabled={idx >= order.length - 1} onClick={() => setSel(order[idx + 1].id)}>
            Dearer model
          </button>
        </div>
        {left.length > 0 && <p className="viz-cap">Not plotted, because the vendor states no list price or no context window: {left.join(', ')}.</p>}
        <p className="viz-cap">Both axes are logarithmic, so each gridline is a step of about two to five times. Markers that would sit on top of each other are nudged apart a little; the text above gives the exact figures. Prices are the list price in force on the day this page was built. Input and output are priced separately and a model that reads and writes different amounts of text is not described by either line alone.</p>
      </div>
    </Root>
  );
}
