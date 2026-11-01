import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Root } from './shared';
import {
  DIRECTIONS,
  EXAMPLES,
  SIZE,
  cloneGrid,
  detect,
  emptyGrid,
  partCells,
  pct,
  type Cells,
  type Direction,
} from '../../lib/pixel-detective';

/*
 * The pixel detective: shade squares, and a simple rule-based detector reports the small patterns it
 * found, which whole shape they add up to, how sure it is, and a kind reason when it is wrong or unsure.
 */

const DIR_LABEL: Record<Direction, string> = {
  across: 'across (—)',
  down: 'down (|)',
  slash: 'slanting (/)',
  backslash: 'slanting (\\)',
};

export default function PixelDetective() {
  const [grid, setGrid] = useState<Cells>(() => cloneGrid(EXAMPLES[0].grid));
  const [nums, setNums] = useState(false);
  const [lines, setLines] = useState(true);
  const [focus, setFocus] = useState<[number, number]>([0, 0]);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const report = useMemo(() => detect(grid), [grid]);

  const toggle = (r: number, c: number) =>
    setGrid((g) => {
      const n = cloneGrid(g);
      n[r][c] = n[r][c] ? 0 : 1;
      return n;
    });

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    const nr = Math.max(0, Math.min(SIZE - 1, r + m[0]));
    const nc = Math.max(0, Math.min(SIZE - 1, c + m[1]));
    setFocus([nr, nc]);
    refs.current[`${nr}-${nc}`]?.focus();
  };

  const showBox = report.best && (report.verdict === 'sure' || report.verdict === 'maybe' || report.verdict === 'torn');
  const bestShape = report.best?.shape.id;

  return (
    <Root>
      <div className="viz w5a-pd">
        <p className="viz-title">Pixel detective: shade the squares and see what it finds</p>

        <div className="w5a-row" role="group" aria-label="Start from a picture">
          <span className="w5a-lab">Try</span>
          {EXAMPLES.map((e) => (
            <button key={e.id} type="button" className="w5a-chip" onClick={() => setGrid(cloneGrid(e.grid))}>
              {e.label}
            </button>
          ))}
          <button type="button" className="w5a-chip" onClick={() => setGrid(emptyGrid())}>
            Clear
          </button>
        </div>

        <div className="w5a-pd-stage">
          <div className="w5a-pd-board">
            <div className="w5a-pd-grid" role="group" aria-label="Seven by seven grid. Tap a square to shade it or clear it. Use the arrow keys to move.">
              {grid.map((row, r) =>
                row.map((v, c) => (
                  <button
                    key={`${r}-${c}`}
                    ref={(el) => {
                      refs.current[`${r}-${c}`] = el;
                    }}
                    type="button"
                    className={`w5a-px${v ? ' is-on' : ''}`}
                    aria-pressed={v === 1}
                    aria-label={`Row ${r + 1}, column ${c + 1}, ${v ? 'shaded' : 'blank'}`}
                    tabIndex={focus[0] === r && focus[1] === c ? 0 : -1}
                    onFocus={() => setFocus([r, c])}
                    onClick={() => toggle(r, c)}
                    onKeyDown={(e) => onKey(e, r, c)}
                  >
                    {nums ? v : ''}
                  </button>
                )),
              )}
            </div>
            <svg className="w5a-pd-over" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" focusable="false">
              {lines &&
                report.parts.map((p, i) => {
                  const cells = partCells(p);
                  const a = cells[0];
                  const b = cells[cells.length - 1];
                  return (
                    <g key={i} className={`w5a-line w5a-d-${p.dir}`}>
                      <line x1={a[1] + 0.5} y1={a[0] + 0.5} x2={b[1] + 0.5} y2={b[0] + 0.5} className="w5a-halo" />
                      <line x1={a[1] + 0.5} y1={a[0] + 0.5} x2={b[1] + 0.5} y2={b[0] + 0.5} className="w5a-stroke" />
                    </g>
                  );
                })}
              {showBox && report.best && (
                <rect
                  x={report.best.left + 0.04}
                  y={report.best.top + 0.04}
                  width={report.best.width - 0.08}
                  height={report.best.height - 0.08}
                  rx="0.12"
                  className={`w5a-found w5a-found-${report.verdict}`}
                />
              )}
            </svg>
          </div>

          <div className="w5a-pd-report">
            <p className="w5a-pd-head" aria-live="polite">
              {report.headline}
            </p>
            <p className="w5a-pd-detail" aria-live="polite">
              {report.detail}
            </p>

            <p className="w5a-sub">Step 1: small patterns I found</p>
            <ul className="w5a-counts">
              {DIRECTIONS.map((d) => (
                <li key={d} className={`w5a-d-${d}`}>
                  <i className="w5a-swatch" aria-hidden="true" />
                  {DIR_LABEL[d]}: <b>{report.counts[d]}</b>
                </li>
              ))}
            </ul>

            <p className="w5a-sub">Step 2: how well each shape fits</p>
            <ul className="w5a-bars">
              {report.matches.map((m) => {
                const top = bestShape === m.shape.id && report.verdict !== 'nothing' && report.verdict !== 'blank';
                return (
                  <li key={m.shape.id} className={top ? 'is-top' : ''}>
                    <span className="w5a-bar-name">{m.shape.name}</span>
                    <span className="w5a-bar-track" role="img" aria-label={`${m.shape.name}: ${pct(m.confidence)} sure, ${m.found} of ${m.needed} parts found`}>
                      <span className="w5a-bar-fill" style={{ width: `${Math.round(m.confidence * 100)}%` }} />
                    </span>
                    <span className="w5a-bar-pct">{pct(m.confidence)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="w5a-row" role="group" aria-label="Display options">
          <button type="button" className="w5a-chip" aria-pressed={lines} onClick={() => setLines(!lines)}>
            Show the small patterns: {lines ? 'on' : 'off'}
          </button>
          <button type="button" className="w5a-chip" aria-pressed={nums} onClick={() => setNums(!nums)}>
            Show the numbers: {nums ? 'on' : 'off'}
          </button>
        </div>
        <p className="viz-cap">
          Shaded = 1, blank = 0. A coloured line is a small pattern: three shaded squares in a row. A dashed box is where the detective thinks the shape is. This detective only knows four shapes and uses hand-made rules, so it is far simpler than a real one.
        </p>
      </div>
    </Root>
  );
}
