import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Root } from './shared';
import {
  CUSTOM_START,
  PICTURES,
  PRESETS,
  autoDivide,
  convolve,
  greyFor,
  isDetector,
  maxPool,
  origin,
  patchAt,
  products,
  show,
  sumOf,
  type Grid,
  type Kernel,
} from '../../lib/convolution';

type FilterId = (typeof PRESETS)[number]['id'] | 'custom';

const cellVars = (n: number, name = '--n'): CSSProperties => ({ [name as string]: n });

/** Colour of one feature-map cell: grey like a picture for blur and sharpen, blue or orange for edge filters. */
function featureStyle(v: number, detector: boolean, maxAbs: number): CSSProperties {
  if (detector) {
    const t = maxAbs > 0 ? Math.min(1, Math.abs(v) / maxAbs) : 0;
    const pct = Math.round(t * 90);
    const hue = v >= 0 ? 'var(--signal)' : 'var(--warn)';
    return { background: `color-mix(in srgb, ${hue} ${pct}%, var(--surface))`, color: t > 0.55 ? 'var(--on-signal)' : 'var(--ink)' };
  }
  const g = greyFor(v);
  return { background: `rgb(${g}, ${g}, ${g})` };
}

export default function ConvolutionLab() {
  const [pictureId, setPictureId] = useState(PICTURES[0].id);
  const [filterId, setFilterId] = useState<FilterId>('vertical');
  const [custom, setCustom] = useState<string[][]>(CUSTOM_START.map((r) => r.map(String)));
  const [pad, setPad] = useState(0);
  const [stride, setStride] = useState(1);
  const [pool, setPool] = useState(false);
  const [nums, setNums] = useState(true);
  const [sel, setSel] = useState<[number, number]>([5, 8]);
  const [shown, setShown] = useState<number | null>(null); // how many map cells are filled in; null means all
  const [playing, setPlaying] = useState(false);
  const mapRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const picture = PICTURES.find((p) => p.id === pictureId)!;
  const img = picture.pixels;

  const kernel: Kernel = useMemo(() => {
    if (filterId === 'custom') {
      const w = custom.map((r) => r.map((s) => (Number.isFinite(Number(s)) && s.trim() !== '' ? Number(s) : 0)));
      return { w, divide: autoDivide(w) };
    }
    return PRESETS.find((p) => p.id === filterId)!.kernel;
  }, [filterId, custom]);
  const preset = PRESETS.find((p) => p.id === filterId);

  const opts = { pad, stride };
  const map = useMemo(() => convolve(img, kernel, opts), [img, kernel, pad, stride]);
  const rows = map.length;
  const cols = map[0].length;
  const total = rows * cols;
  const detector = isDetector(kernel);
  const maxAbs = useMemo(() => Math.max(0, ...map.flat().map(Math.abs)), [map]);
  const pooled = useMemo(() => (pool && rows >= 2 && cols >= 2 ? maxPool(map) : null), [pool, map, rows, cols]);

  const count = shown ?? total;
  const slideIndex = playing ? Math.max(0, count - 1) : null;
  const si = slideIndex !== null ? Math.floor(slideIndex / cols) : Math.min(sel[0], rows - 1);
  const sj = slideIndex !== null ? slideIndex % cols : Math.min(sel[1], cols - 1);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setShown((s) => {
        const next = (s ?? 0) + 1;
        if (next >= total) {
          setPlaying(false);
          setSel([rows - 1, cols - 1]);
          return null;
        }
        return next;
      });
    }, 45);
    return () => clearInterval(id);
  }, [playing, total, rows, cols]);

  const stop = () => {
    setPlaying(false);
    setShown(null);
  };
  const choose = (i: number, j: number, focus = false) => {
    stop();
    const ni = Math.max(0, Math.min(rows - 1, i));
    const nj = Math.max(0, Math.min(cols - 1, j));
    setSel([ni, nj]);
    if (focus) mapRefs.current[`${ni}-${nj}`]?.focus();
  };
  const step = (d: number) => {
    const idx = Math.max(0, Math.min(total - 1, si * cols + sj + d));
    choose(Math.floor(idx / cols), idx % cols);
  };
  const slide = () => {
    setSel([0, 0]);
    setShown(0);
    setPlaying(true);
  };

  const pickFilter = (id: FilterId) => {
    stop();
    if (id === 'custom') {
      const from = PRESETS.find((p) => p.id === filterId);
      setCustom((from ? from.kernel.w : kernel.w).map((r) => r.map(String)));
    }
    setFilterId(id);
  };

  const [t0, l0] = origin(si, sj, opts);
  const patch = patchAt(img, t0, l0);
  const prods = products(patch, kernel.w);
  const sum = sumOf(prods);
  const value = sum / kernel.divide;
  const filled = (i: number, j: number) => i * cols + j < count;

  const onMapKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    choose(si + m[0], sj + m[1], true);
  };

  /** Tapping a pixel of the picture selects the filter position centred on it. */
  const fromPixel = (r: number, c: number) => choose(Math.round((r - 1 + pad) / stride), Math.round((c - 1 + pad) / stride));

  const side = 12 + 2 * pad;
  const say = `Filter position row ${si + 1}, column ${sj + 1} of the feature map. The nine products add up to ${show(sum)}${kernel.divide !== 1 ? `, divided by ${kernel.divide} gives ${show(value)}` : ''}. That number is the feature map value here.`;

  return (
    <Root>
      <div className="viz db" style={cellVars(side, '--side')}>
        <p className="viz-title">Slide a filter over a picture</p>

        <div className="db-row" role="group" aria-label="Picture">
          <span className="db-label">Picture</span>
          {PICTURES.map((p) => (
            <button key={p.id} type="button" className="db-chip" aria-pressed={pictureId === p.id} onClick={() => { stop(); setPictureId(p.id); }}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="db-row" role="group" aria-label="Filter">
          <span className="db-label">Filter</span>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="db-chip" aria-pressed={filterId === p.id} onClick={() => pickFilter(p.id)}>
              {p.label}
            </button>
          ))}
          <button type="button" className="db-chip" aria-pressed={filterId === 'custom'} onClick={() => pickFilter('custom')}>
            Your own
          </button>
        </div>
        <p className="db-blurb">
          {preset ? preset.blurb : 'Type any whole numbers into the nine boxes. Weights that add to more than 1 are divided by their total, so the picture keeps its brightness.'}
        </p>

        <div className="db-stage">
          <figure className="db-fig">
            <figcaption>The picture <span className="db-sub">{pad ? '(with a ring of zeros)' : ''}</span></figcaption>
            <div className="db-board" style={cellVars(side)}>
              <div className="db-grid" role="img" aria-label={`A 12 by 12 pixel picture of ${picture.alt}. Each pixel is a number from 0 (black) to 9 (white). The 3 by 3 window currently covers rows ${t0 + 1} to ${t0 + 3} and columns ${l0 + 1} to ${l0 + 3}.`}>
                {Array.from({ length: side * side }, (_, k) => {
                  const r = Math.floor(k / side) - pad;
                  const c = (k % side) - pad;
                  const inside = r >= 0 && r < 12 && c >= 0 && c < 12;
                  const v = inside ? img[r][c] : 0;
                  const g = greyFor(v);
                  return (
                    <div
                      key={k}
                      className={`db-px${inside ? '' : ' db-ring'}`}
                      style={inside ? { background: `rgb(${g}, ${g}, ${g})`, color: v >= 5 ? '#15123d' : '#f1eeff' } : undefined}
                      onClick={inside ? () => fromPixel(r, c) : undefined}
                      onPointerEnter={inside ? (e) => { if (e.pointerType === 'mouse' && !playing) fromPixel(r, c); } : undefined}
                    >
                      {nums ? v : ''}
                    </div>
                  );
                })}
                <div className="db-window" style={{ ['--top' as string]: t0 + pad, ['--left' as string]: l0 + pad }} aria-hidden="true" />
              </div>
            </div>
          </figure>

          <figure className="db-fig">
            <figcaption>
              The feature map <span className="db-sub">({rows} by {cols})</span>
            </figcaption>
            <div className="db-board" style={cellVars(cols)}>
              <div className="db-grid db-map" role="group" aria-label="Feature map. Use the arrow keys to move the filter.">
                {map.map((row, i) =>
                  row.map((v, j) => {
                    const on = i === si && j === sj;
                    const ok = filled(i, j);
                    return (
                      <button
                        key={`${i}-${j}`}
                        ref={(el) => { mapRefs.current[`${i}-${j}`] = el; }}
                        type="button"
                        className={`db-px db-fm${on ? ' is-sel' : ''}${ok ? '' : ' db-empty'}`}
                        style={ok ? featureStyle(v, detector, maxAbs) : undefined}
                        tabIndex={on ? 0 : -1}
                        aria-label={ok ? `Row ${i + 1}, column ${j + 1}: ${show(v)}` : `Row ${i + 1}, column ${j + 1}: not computed yet`}
                        aria-pressed={on}
                        onClick={() => choose(i, j)}
                        onKeyDown={onMapKey}
                        onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !playing) choose(i, j); }}
                      />
                    );
                  }),
                )}
              </div>
            </div>
            <p className="db-key">
              {detector ? (
                <>
                  <i className="db-swatch db-pos" /> found it <i className="db-swatch db-neg" /> opposite <i className="db-swatch db-zero" /> nothing here
                </>
              ) : (
                <>Drawn as a picture: brighter means a bigger number.</>
              )}
            </p>
          </figure>
        </div>

        <div className="db-calc" aria-label="Multiply and add for the chosen position">
          <p className="db-calc-title">
            Filter at row {si + 1}, column {sj + 1}
            <span className="db-sub"> covers picture pixels from row {t0 + 1}, column {l0 + 1}</span>
          </p>
          <div className="db-sum">
            <Mini title="Pixels" grid={patch} />
            <span className="db-op" aria-hidden="true">×</span>
            <div className="db-mini">
              <span className="db-mini-t">Weights</span>
              <div className="db-mini-g">
                {kernel.w.map((row, r) =>
                  row.map((w, c) =>
                    filterId === 'custom' ? (
                      <input
                        key={`${r}-${c}`}
                        className="db-in"
                        type="text"
                        inputMode="text"
                        value={custom[r][c]}
                        aria-label={`Weight row ${r + 1}, column ${c + 1}`}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.\-−]/g, '').replace('−', '-').slice(0, 4);
                          stop();
                          setCustom((cur) => cur.map((rr, i) => rr.map((x, j) => (i === r && j === c ? v : x))));
                        }}
                      />
                    ) : (
                      <span key={`${r}-${c}`} className={`db-c${w < 0 ? ' db-minus' : ''}`}>{show(w)}</span>
                    ),
                  ),
                )}
              </div>
            </div>
            <span className="db-op" aria-hidden="true">=</span>
            <Mini title="Products" grid={prods} signed />
          </div>
          <p className="db-result" aria-live="polite">
            <span className="sr-only">{say}</span>
            <span aria-hidden="true">
              Add the nine products: <b>{show(sum)}</b>
              {kernel.divide !== 1 && (
                <>
                  , divide by {kernel.divide}: <b>{show(value)}</b>
                </>
              )}
              . That one number goes into the feature map.
            </span>
          </p>
        </div>

        <div className="db-controls">
          <button type="button" className="btn" onClick={() => step(-1)} aria-label="Previous position">
            ← Back
          </button>
          <button type="button" className="btn" onClick={() => step(1)} aria-label="Next position">
            Next →
          </button>
          {playing ? (
            <button type="button" className="btn quiet" onClick={stop}>
              Stop
            </button>
          ) : (
            <button type="button" className="btn quiet" onClick={slide}>
              Slide it across
            </button>
          )}
        </div>

        <div className="db-row db-opts" role="group" aria-label="Options">
          <button type="button" className="db-chip" aria-pressed={pad === 1} onClick={() => { stop(); setPad(pad ? 0 : 1); }}>
            Padding: {pad ? 'on' : 'off'}
          </button>
          <button type="button" className="db-chip" aria-pressed={stride === 2} onClick={() => { stop(); setStride(stride === 1 ? 2 : 1); }}>
            Stride: {stride}
          </button>
          <button type="button" className="db-chip" aria-pressed={pool} onClick={() => setPool(!pool)}>
            Max pooling: {pool ? 'on' : 'off'}
          </button>
          <button type="button" className="db-chip" aria-pressed={nums} onClick={() => setNums(!nums)}>
            Numbers: {nums ? 'on' : 'off'}
          </button>
        </div>

        {pooled && (
          <figure className="db-fig db-pooled">
            <figcaption>
              After 2 by 2 max pooling <span className="db-sub">({pooled.length} by {pooled[0].length})</span>
            </figcaption>
            <div className="db-board" style={cellVars(pooled[0].length)}>
              <div className="db-grid" role="img" aria-label={`The pooled map, ${pooled.length} by ${pooled[0].length}. Each cell is the largest value in a 2 by 2 block of the feature map.`}>
                {pooled.flat().map((v, k) => (
                  <div key={k} className="db-px" style={featureStyle(v, detector, maxAbs)} />
                ))}
              </div>
            </div>
          </figure>
        )}

        <p className="viz-cap">
          Pixel values here run from 0 (black) to 9 (white) to keep the sums small. Real pictures use 0 to 255 and three colour channels. Padding adds a ring of zeros so the map keeps the picture&rsquo;s size; stride 2 moves the filter two pixels at a time and halves the map. Pooling keeps the largest number in each 2 by 2 block.
        </p>
      </div>
    </Root>
  );
}

function Mini({ title, grid, signed = false }: { title: string; grid: Grid; signed?: boolean }) {
  return (
    <div className="db-mini">
      <span className="db-mini-t">{title}</span>
      <div className="db-mini-g">
        {grid.flat().map((v, k) => (
          <span key={k} className={`db-c${signed && v < 0 ? ' db-minus' : ''}`}>
            {show(v)}
          </span>
        ))}
      </div>
    </div>
  );
}
