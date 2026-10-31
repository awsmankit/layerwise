import { useCallback, useEffect, useRef, useState } from 'react';
import { Root } from './shared';
import {
  ACTIVATIONS,
  DATASETS,
  LIMIT,
  accuracy,
  boundaryGrid,
  createNet,
  loss,
  makeData,
  neuronMaps,
  paramCount,
  trainStep,
  weightAt,
  type Activation,
  type DatasetKind,
  type Net,
  type Point,
} from '../../lib/nn';

const MAX_LAYERS = 3;
const MAX_NEURONS = 6;
const MIN_NEURONS = 1;
const MAX_STEPS = 1500;
const STEPS_PER_FRAME = 3;
const MAX_POINTS = 260;
const RATES = [0.003, 0.01, 0.03, 0.1, 0.3];
const GRID = 44; // cells across the big picture
const THUMB = 14; // cells across each neuron's small picture

type RGB = [number, number, number];
type Palette = { a: RGB; b: RGB; bg: RGB; ink: string; line: string };

function hex(s: string, fallback: RGB): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (from: RGB, to: RGB, t: number): RGB => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];

function readPalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el);
  return {
    a: hex(cs.getPropertyValue('--da-a'), [37, 99, 235]),
    b: hex(cs.getPropertyValue('--da-b'), [217, 100, 0]),
    bg: hex(cs.getPropertyValue('--surface'), [255, 255, 255]),
    ink: cs.getPropertyValue('--ink').trim() || '#15123d',
    line: cs.getPropertyValue('--line').trim() || 'rgba(21,18,61,0.3)',
  };
}

const scratch = new Map<number, HTMLCanvasElement>();

/** Paint a grid of values as a smooth picture. `level` turns a value into -1..1 (orange to blue). */
function paintGrid(ctx: CanvasRenderingContext2D, grid: Float32Array, res: number, x: number, y: number, w: number, h: number, pal: Palette, level: (v: number) => number, strength: number) {
  let off = scratch.get(res);
  if (!off) {
    off = document.createElement('canvas');
    off.width = res;
    off.height = res;
    scratch.set(res, off);
  }
  const octx = off.getContext('2d')!;
  const img = octx.createImageData(res, res);
  for (let i = 0; i < grid.length; i++) {
    const t = Math.max(-1, Math.min(1, level(grid[i])));
    const c = mix(pal.bg, t >= 0 ? pal.a : pal.b, 0.1 + strength * Math.abs(t));
    img.data[i * 4] = c[0];
    img.data[i * 4 + 1] = c[1];
    img.data[i * 4 + 2] = c[2];
    img.data[i * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, x, y, w, h);
}

/** What a neuron's value means for colour: how far from "nothing to say" it is, signed. */
function levelFor(kind: Activation, isOutput: boolean, isInput: boolean): (v: number) => number {
  if (isOutput) return (p) => (p - 0.5) * 2;
  if (isInput) return (v) => v / LIMIT;
  if (kind === 'sigmoid') return (v) => (v - 0.5) * 3;
  if (kind === 'relu') return (v) => v * 0.9;
  if (kind === 'tanh') return (v) => v * 1.2;
  return (v) => Math.tanh(v * 0.6);
}

function shape(ctx: CanvasRenderingContext2D, p: Point, cx: number, cy: number, r: number, pal: Palette) {
  ctx.beginPath();
  if (p.label === 1) ctx.arc(cx, cy, r, 0, Math.PI * 2);
  else ctx.rect(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8);
  ctx.fillStyle = `rgb(${(p.label ? pal.a : pal.b).map(Math.round).join(',')})`;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = `rgb(${pal.bg.map(Math.round).join(',')})`;
  ctx.stroke();
}

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(Math.floor(el.getBoundingClientRect().width));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function fitCanvas(c: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  if (c.width !== pw || c.height !== ph) {
    c.width = pw;
    c.height = ph;
  }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

type Draw = 'off' | 'blue' | 'orange';

/**
 * A small neural-network playground. Pick a pattern of dots, choose how many hidden layers and neurons
 * the network has and which activation function it uses, then press Train. The big picture shows
 * the network's decision at every position; the diagram shows what each neuron responds to.
 */
export default function NeuralPlayground() {
  const [dataset, setDataset] = useState<DatasetKind>('circle');
  const [hidden, setHidden] = useState<number[]>([4]);
  const [activation, setActivation] = useState<Activation>('tanh');
  const [rate, setRate] = useState(2);
  const [running, setRunning] = useState(false);
  const [draw, setDraw] = useState<Draw>('off');
  const [dataSeed, setDataSeed] = useState(1);
  const [initSeed, setInitSeed] = useState(1);
  const [stats, setStats] = useState({ step: 0, loss: 0, acc: 0 });
  const [note, setNote] = useState('');
  const [, setRedraw] = useState(0);

  const dataRef = useRef<Point[]>(makeData('circle', 120, 1));
  const netRef = useRef<Net>(createNet([4], 'tanh', 1));
  const stepRef = useRef(0);
  const histRef = useRef<number[]>([]);
  const runRef = useRef(false);
  const rateRef = useRef(RATES[2]);
  const lastAdd = useRef(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const bigWrap = useRef<HTMLDivElement>(null);
  const bigCanvas = useRef<HTMLCanvasElement>(null);
  const netWrap = useRef<HTMLDivElement>(null);
  const netCanvas = useRef<HTMLCanvasElement>(null);
  const bigW = useWidth(bigWrap);
  const netW = useWidth(netWrap);

  runRef.current = running;
  rateRef.current = RATES[rate];

  /* ----- drawing ----- */
  const paint = useCallback(() => {
    const root = rootRef.current;
    const big = bigCanvas.current;
    const dia = netCanvas.current;
    if (!root || !big || !dia) return;
    const pal = readPalette(root);
    const net = netRef.current;
    const data = dataRef.current;

    if (bigW > 0) {
      const ctx = fitCanvas(big, bigW, bigW);
      paintGrid(ctx, boundaryGrid(net, GRID), GRID, 0, 0, bigW, bigW, pal, (p) => (p - 0.5) * 2, 0.5);
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, bigW - 1, bigW - 1);
      for (const p of data) shape(ctx, p, ((p.x + LIMIT) / (2 * LIMIT)) * bigW, ((LIMIT - p.y) / (2 * LIMIT)) * bigW, bigW < 340 ? 3.4 : 4, pal);
    }

    if (netW > 0) {
      const sizes = net.sizes;
      const cols = sizes.length;
      const colW = netW / cols;
      const S = Math.max(28, Math.min(46, colW - 16));
      const gap = 8;
      const tallest = Math.max(...sizes);
      const h = tallest * (S + gap) + gap;
      const ctx = fitCanvas(dia, netW, h);
      const cx = (c: number) => (c + 0.5) * colW;
      const cy = (c: number, j: number) => h / 2 + (j - (sizes[c] - 1) / 2) * (S + gap);
      // weights first, so the neuron pictures sit on top of the lines
      for (let l = 0; l < cols - 1; l++) {
        for (let j = 0; j < sizes[l + 1]; j++) {
          for (let i = 0; i < sizes[l]; i++) {
            const w = weightAt(net, l, i, j);
            const c = w >= 0 ? pal.a : pal.b;
            ctx.beginPath();
            ctx.moveTo(cx(l) + S / 2, cy(l, i));
            ctx.lineTo(cx(l + 1) - S / 2, cy(l + 1, j));
            ctx.strokeStyle = `rgba(${c.map(Math.round).join(',')},${Math.min(0.95, 0.25 + Math.abs(w) * 0.4)})`;
            ctx.lineWidth = Math.min(4, 0.5 + Math.abs(w) * 1.6);
            ctx.stroke();
          }
        }
      }
      const maps = neuronMaps(net, THUMB);
      for (let l = 0; l < cols; l++) {
        for (let j = 0; j < sizes[l]; j++) {
          const x = cx(l) - S / 2;
          const y = cy(l, j) - S / 2;
          paintGrid(ctx, maps[l][j], THUMB, x, y, S, S, pal, levelFor(net.activation, l === cols - 1, l === 0), 0.62);
          ctx.strokeStyle = pal.ink;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);
          ctx.globalAlpha = 1;
        }
      }
    }
  }, [bigW, netW]);

  const snapshot = useCallback(() => {
    const net = netRef.current;
    const data = dataRef.current;
    setStats({ step: stepRef.current, loss: loss(net, data), acc: accuracy(net, data) });
  }, []);

  /* ----- training loop ----- */
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let frame = 0;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = () => {
      const net = netRef.current;
      const data = dataRef.current;
      for (let i = 0; i < STEPS_PER_FRAME && stepRef.current < MAX_STEPS; i++) {
        const l = trainStep(net, data, rateRef.current);
        stepRef.current += 1;
        histRef.current.push(l);
      }
      frame += 1;
      const done = stepRef.current >= MAX_STEPS;
      if (!calm || frame % 10 === 0 || done) {
        paint();
        snapshot();
      }
      if (done) {
        setRunning(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, paint, snapshot]);

  // a short spoken summary whenever training stops
  useEffect(() => {
    if (running) return;
    const { step, loss: l, acc } = stats;
    if (step === 0) setNote('');
    else setNote(`Stopped at step ${step}. Loss ${l.toFixed(2)}, ${Math.round(acc * 100)} per cent of the dots on the right side.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // redraw when the size, the theme or the picture changes
  useEffect(() => {
    paint();
    snapshot();
  }, [paint, snapshot, hidden, activation, dataset, dataSeed, initSeed]);
  useEffect(() => {
    const mo = new MutationObserver(() => paint());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => paint();
    mq.addEventListener('change', on);
    return () => {
      mo.disconnect();
      mq.removeEventListener('change', on);
    };
  }, [paint]);

  /* ----- changes the learner can make ----- */
  const restartNet = (h: number[], a: Activation, seed: number) => {
    netRef.current = createNet(h, a, seed);
    stepRef.current = 0;
    histRef.current = [];
  };
  const pickDataset = (d: DatasetKind) => {
    setDataset(d);
    dataRef.current = makeData(d, 120, dataSeed);
    restartNet(hidden, activation, initSeed);
  };
  const newData = () => {
    const s = dataSeed + 1;
    setDataSeed(s);
    dataRef.current = makeData(dataset, 120, s);
    restartNet(hidden, activation, initSeed);
  };
  const changeHidden = (h: number[]) => {
    setHidden(h);
    restartNet(h, activation, initSeed);
  };
  const pickActivation = (a: Activation) => {
    setActivation(a);
    restartNet(hidden, a, initSeed);
  };
  const resetWeights = () => {
    const s = initSeed + 1;
    setInitSeed(s);
    restartNet(hidden, activation, s);
    setRunning(false);
  };
  const stepOnce = (n: number) => {
    setRunning(false);
    for (let i = 0; i < n && stepRef.current < MAX_STEPS; i++) {
      histRef.current.push(trainStep(netRef.current, dataRef.current, rateRef.current));
      stepRef.current += 1;
    }
    paint();
    snapshot();
    setRedraw((k) => k + 1);
  };

  /* ----- drawing dots with a finger or mouse ----- */
  const addAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draw === 'off' || dataRef.current.length >= MAX_POINTS) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = -LIMIT + ((e.clientX - r.left) / r.width) * 2 * LIMIT;
    const y = LIMIT - ((e.clientY - r.top) / r.height) * 2 * LIMIT;
    if (Math.abs(x) > LIMIT || Math.abs(y) > LIMIT) return;
    dataRef.current = [...dataRef.current, { x, y, label: draw === 'blue' ? 1 : 0 }];
    paint();
    snapshot();
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draw === 'off') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    lastAdd.current = performance.now();
    addAt(e);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draw === 'off' || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const now = performance.now();
    if (now - lastAdd.current < 70) return;
    lastAdd.current = now;
    addAt(e);
  };

  const hist = histRef.current;
  const histPath = (() => {
    if (hist.length < 2) return '';
    const n = Math.min(160, hist.length);
    return Array.from({ length: n }, (_, k) => {
      const i = Math.round((k / (n - 1)) * (hist.length - 1));
      const y = 38 - Math.min(0.8, hist[i]) / 0.8 * 36;
      return `${k ? 'L' : 'M'}${((k / (n - 1)) * 200).toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  })();

  const ds = DATASETS.find((d) => d.id === dataset)!;
  const columns = ['inputs', ...hidden.map((_, i) => `hidden ${i + 1}`), 'output'];

  return (
    <Root>
      <div className="viz da-pg" ref={rootRef}>
        <p className="viz-title">Neural network playground</p>

        <div className="da-row" role="group" aria-label="Pattern of dots">
          {DATASETS.map((d) => (
            <button key={d.id} type="button" className="da-chip" aria-pressed={dataset === d.id} onClick={() => pickDataset(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
        <p className="da-note">{ds.note}</p>

        <div className="da-main">
          <div className="da-left">
            <div ref={bigWrap} className="da-bigwrap">
              <canvas
                ref={bigCanvas}
                className={`da-big${draw !== 'off' ? ' da-drawing' : ''}`}
                style={{ height: bigW || undefined }}
                role="img"
                aria-label={`Decision picture for the ${ds.label} pattern. ${stats.step === 0 ? 'Not trained yet.' : `After ${stats.step} steps, ${Math.round(stats.acc * 100)} per cent of the dots are on the right side.`} Blue circles are one class, orange squares the other.`}
                onPointerDown={onDown}
                onPointerMove={onMove}
              />
            </div>
            <div className="da-row da-draw" role="group" aria-label="Add your own dots">
              <span className="da-lab">Add dots</span>
              {(['off', 'blue', 'orange'] as Draw[]).map((d) => (
                <button key={d} type="button" className={`da-chip da-chip-${d}`} aria-pressed={draw === d} onClick={() => setDraw(d)}>
                  {d === 'off' ? 'Off' : d === 'blue' ? 'Blue circle' : 'Orange square'}
                </button>
              ))}
            </div>
          </div>

          <div className="da-right">
            <div className="da-row" role="group" aria-label="Activation function">
              <span className="da-lab">Activation</span>
              {ACTIVATIONS.map((a) => (
                <button key={a.id} type="button" className="da-chip" aria-pressed={activation === a.id} onClick={() => pickActivation(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>

            <div ref={netWrap} className="da-netwrap">
              <canvas
                ref={netCanvas}
                className="da-net"
                role="img"
                aria-label={`The network: 2 inputs, ${hidden.length === 0 ? 'no hidden layers' : `hidden layers of ${hidden.join(', ')} neurons`}, and 1 output, ${paramCount(hidden)} weights and biases in all. Each square shows what one neuron responds to.`}
              />
              <div className="da-cols" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }} aria-hidden="true">
                {columns.map((c, i) => (
                  <span key={i}>{c}</span>
                ))}
              </div>
            </div>

            <div className="da-layers">
              {hidden.map((n, i) => (
                <div key={i} className="da-layer">
                  <span className="da-lab">Layer {i + 1}</span>
                  <button type="button" className="da-step" aria-label={`Remove a neuron from layer ${i + 1}`} disabled={n <= MIN_NEURONS} onClick={() => changeHidden(hidden.map((v, k) => (k === i ? v - 1 : v)))}>
                    −
                  </button>
                  <span className="da-count">
                    {n} {n === 1 ? 'neuron' : 'neurons'}
                  </span>
                  <button type="button" className="da-step" aria-label={`Add a neuron to layer ${i + 1}`} disabled={n >= MAX_NEURONS} onClick={() => changeHidden(hidden.map((v, k) => (k === i ? v + 1 : v)))}>
                    +
                  </button>
                </div>
              ))}
              <div className="da-row">
                <button type="button" className="da-chip" disabled={hidden.length >= MAX_LAYERS} onClick={() => changeHidden([...hidden, hidden.length ? hidden[hidden.length - 1] : 4])}>
                  Add a layer
                </button>
                <button type="button" className="da-chip" disabled={hidden.length === 0} onClick={() => changeHidden(hidden.slice(0, -1))}>
                  Remove a layer
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="da-run">
          <button type="button" className="btn da-go" onClick={() => (stepRef.current >= MAX_STEPS ? null : setRunning((r) => !r))} disabled={stepRef.current >= MAX_STEPS && !running}>
            {running ? 'Pause' : stats.step > 0 ? 'Keep training' : 'Train'}
          </button>
          <button type="button" className="btn quiet" onClick={() => stepOnce(10)} disabled={stepRef.current >= MAX_STEPS}>
            Step ×10
          </button>
          <button type="button" className="btn quiet" onClick={resetWeights}>
            Restart with new weights
          </button>
          <button type="button" className="btn quiet" onClick={newData}>
            New dots
          </button>
        </div>

        <label className="da-rate">
          <span>
            Learning rate <b className="num">{RATES[rate]}</b>
          </span>
          <input type="range" min={0} max={RATES.length - 1} step={1} value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Learning rate" aria-valuetext={`${RATES[rate]}`} />
        </label>

        <div className="da-stats num">
          <span>
            Step <b>{stats.step}</b>
          </span>
          <span>
            Loss <b>{stats.loss.toFixed(3)}</b>
          </span>
          <span>
            Dots right <b>{Math.round(stats.acc * 100)}%</b>
          </span>
          <span>
            Weights and biases <b>{paramCount(hidden)}</b>
          </span>
        </div>
        <svg className="da-spark" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 38 H200" className="da-spark-axis" />
          {histPath && <path d={histPath} className="da-spark-line" vectorEffect="non-scaling-stroke" />}
        </svg>
        <p className="da-spark-cap">Loss over the steps so far (lower is better).</p>
        <p className="sr-only" aria-live="polite">
          {note}
        </p>

        <p className="viz-cap">
          Big picture: the colour at each position is what the network would answer there, blue for the circles and orange for the squares, with the pale band between them where it is unsure. Diagram: each small square shows what one neuron responds to across the same space; blue lines are positive weights, orange lines are negative, and thicker means larger. Training stops by itself at {MAX_STEPS} steps.
        </p>
      </div>
    </Root>
  );
}
