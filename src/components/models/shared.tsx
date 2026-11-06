import type { KeyboardEvent } from 'react';
import { vendors, type Model, type Vendor } from '../../data/models';
import { ratesFor, formatPrice, formatTokens, statusLabels } from '../../lib/models';
import { shortDay } from '../../lib/dates';

/** The same colour and the same shape for a vendor everywhere on the page, so colour is never the only cue. */
export const vendorKey = (v: Vendor) => vendors.indexOf(v);
export const vendorClass = (v: Vendor) => `mr-v${vendorKey(v)}`;

/** One marker per vendor: circle, square, diamond, triangle, plus-sign cross, hexagon. */
export function Marker({ vendor, x, y, r = 6, selected = false }: { vendor: Vendor; x: number; y: number; r?: number; selected?: boolean }) {
  const k = vendorKey(vendor) % 6;
  const c = `mr-mark ${vendorClass(vendor)}${selected ? ' is-sel' : ''}`;
  if (k === 0) return <circle className={c} cx={x} cy={y} r={r} />;
  if (k === 1) return <rect className={c} x={x - r} y={y - r} width={r * 2} height={r * 2} rx={1.5} />;
  if (k === 2) return <polygon className={c} points={`${x},${y - r * 1.3} ${x + r * 1.3},${y} ${x},${y + r * 1.3} ${x - r * 1.3},${y}`} />;
  if (k === 3) return <polygon className={c} points={`${x},${y - r * 1.25} ${x + r * 1.2},${y + r} ${x - r * 1.2},${y + r}`} />;
  if (k === 4) {
    const a = r * 1.3;
    const b = r * 0.5;
    return <polygon className={c} points={`${x - b},${y - a} ${x + b},${y - a} ${x + b},${y - b} ${x + a},${y - b} ${x + a},${y + b} ${x + b},${y + b} ${x + b},${y + a} ${x - b},${y + a} ${x - b},${y + b} ${x - a},${y + b} ${x - a},${y - b} ${x - b},${y - b}`} />;
  }
  const hx = (i: number) => x + r * 1.2 * Math.cos((Math.PI / 3) * i);
  const hy = (i: number) => y + r * 1.2 * Math.sin((Math.PI / 3) * i);
  return <polygon className={c} points={[0, 1, 2, 3, 4, 5].map((i) => `${hx(i).toFixed(2)},${hy(i).toFixed(2)}`).join(' ')} />;
}

/** Enter and Space activate an SVG shape that acts as a button. */
export function activate(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };
}

export function Legend() {
  return (
    <ul className="mr-legend" aria-label="Vendors">
      {vendors.map((v) => (
        <li key={v}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <Marker vendor={v} x={9} y={9} r={5} />
          </svg>
          {v}
        </li>
      ))}
    </ul>
  );
}

/** The facts for one model, in words. Used under the timeline and the scatter. */
export function ModelFacts({ model, today }: { model: Model; today: string }) {
  const r = ratesFor(model, 0, today);
  return (
    <div className="mr-facts" aria-live="polite">
      <p className="mr-facts-title">
        <b>{model.name}</b> <span>{model.vendor}</span> <em className={`mr-status mr-status-${model.status}`}>{statusLabels[model.status]}</em>
      </p>
      <p className="mr-facts-line">
        Released {shortDay(model.releasedOn)}
        {model.contextTokens != null && <> · context window {formatTokens(model.contextTokens)} tokens</>}
        {model.maxOutputTokens != null && <> · up to {formatTokens(model.maxOutputTokens)} tokens out</>}
        {r ? (
          <>
            {' '}
            · {formatPrice(r.input)} in and {formatPrice(r.output)} out per million tokens
          </>
        ) : (
          <> · no list price stated</>
        )}
      </p>
    </div>
  );
}
