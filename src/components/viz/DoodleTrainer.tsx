import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';
import { bounds, classify, GRID, hasInk, normalise, unbalanced, type Drawing, type Guess, type Point } from '../../lib/doodle';

/*
 * "Teach the computer your drawings": the learner saves a few drawings of two
 * things, then draws a new one and the computer guesses by finding the saved
 * drawings that look most like it (k-nearest neighbours, see lib/doodle.ts).
 * Nothing is stored; drawings vanish on reload.
 */

type Side = 0 | 1;
type Example = { id: number; side: Side; drawing: Drawing; vec: number[] };
type Result = { drawing: Drawing; vec: number[]; guess: Guess<Side>; near: Example[]; verdict: null | 'right' | 'wrong'; fixed: boolean };

const PRESETS = [
  { id: 'sun', label: 'Sun or moon', names: ['sun', 'moon'] },
  { id: 'cat', label: 'Cat face or fish', names: ['cat face', 'fish'] },
  { id: 'tick', label: 'Tick or cross', names: ['tick', 'cross'] },
  { id: 'own', label: 'Your own', names: ['', ''] },
] as const;
type PresetId = (typeof PRESETS)[number]['id'];

const AIM = 5; // examples per side we suggest
const MIN = 3; // examples per side before testing
const MAX = 12; // keeps the thumbnail rows tidy
const K = 3; // neighbours that vote

const plural = (n: number, word: string) => `${n} ${word} drawing${n === 1 ? '' : 's'}`;

export default function DoodleTrainer() {
  const [preset, setPreset] = useState<PresetId>('sun');
  const [own, setOwn] = useState<[string, string]>(['', '']);
  const [examples, setExamples] = useState<Example[]>([]);
  const [mode, setMode] = useState<'teach' | 'test'>('teach');
  const [result, setResult] = useState<Result | null>(null);
  const [tally, setTally] = useState({ right: 0, tested: 0 });
  const [say, setSay] = useState('');
  const nextId = useRef(1);
  const pad = usePad();
  const ids = useId();

  const p = PRESETS.find((x) => x.id === preset)!;
  const names: [string, string] =
    preset === 'own' ? [own[0].trim() || 'thing 1', own[1].trim() || 'thing 2'] : [p.names[0], p.names[1]];
  const count: [number, number] = [examples.filter((e) => e.side === 0).length, examples.filter((e) => e.side === 1).length];
  const ready = count[0] >= MIN && count[1] >= MIN;
  const lopsided = unbalanced(count[0], count[1]);
  const ink = hasInk(pad.strokes);

  const resetAll = (next: PresetId) => {
    setPreset(next);
    setExamples([]);
    setMode('teach');
    setResult(null);
    setTally({ right: 0, tested: 0 });
    pad.clear();
    const n = PRESETS.find((x) => x.id === next)!;
    setSay(next === 'own' ? 'Type the names of your two things, then start drawing.' : `New pair: ${n.label.toLowerCase()}. Start drawing.`);
  };

  const save = (side: Side, drawing: Drawing = pad.strokes) => {
    if (!hasInk(drawing)) return;
    const ex: Example = { id: nextId.current++, side, drawing, vec: normalise(drawing) };
    setExamples((xs) => [...xs, ex]);
    return count[side] + 1;
  };

  const saveFromPad = (side: Side) => {
    const n = save(side);
    if (!n) return;
    pad.clear();
    setSay(`Saved as ${names[side]}. You have ${plural(n, names[side])}.`);
  };

  const remove = (ex: Example) => {
    setExamples((xs) => xs.filter((x) => x.id !== ex.id));
    setSay(`Removed one ${names[ex.side]} drawing. ${count[ex.side] - 1} left.`);
  };

  const switchMode = (m: 'teach' | 'test') => {
    setMode(m);
    setResult(null);
    pad.clear();
    setSay(m === 'test' ? `Now draw a new ${names[0]} or ${names[1]}, then press “Guess”.` : 'Draw more examples, then test again.');
  };

  const guess = () => {
    if (!ink) return;
    const vec = normalise(pad.strokes);
    const g = classify<Side>(vec, examples.map((e) => ({ label: e.side, vec: e.vec })), K);
    if (!g) return;
    const near = g.neighbours.map((n) => examples[n.index]);
    setResult({ drawing: pad.strokes, vec, guess: g, near, verdict: null, fixed: false });
    setSay('');
  };

  const mark = (verdict: 'right' | 'wrong') => {
    if (!result || result.verdict) return;
    setResult({ ...result, verdict });
    setTally((t) => ({ right: t.right + (verdict === 'right' ? 1 : 0), tested: t.tested + 1 }));
    setSay(
      verdict === 'right'
        ? 'Yes! Draw another one. Can you find a drawing that tricks it?'
        : `Oops, it got that one wrong. Draw more examples, or more varied ones, and try again. You can start by saving this drawing as ${names[result.guess.label === 0 ? 1 : 0]}.`,
    );
  };

  const fix = () => {
    if (!result || result.fixed) return;
    const side: Side = result.guess.label === 0 ? 1 : 0;
    save(side, result.drawing);
    setResult({ ...result, fixed: true });
    setSay(`Saved as ${names[side]}. Now it has one more example to learn from. Draw a new one and test again.`);
  };

  /* starting a new test drawing clears the old guess */
  const onStart = () => {
    if (mode === 'test' && result) {
      setResult(null);
      setSay('');
      return true; // ask the pad to wipe before drawing
    }
    return false;
  };

  return (
    <Root>
      <div className="viz dg">
        <p className="viz-title">Teach the computer your drawings</p>
        <p className="sr-only">
          This activity needs drawing with a finger, mouse or pen. You draw a few examples of two things, then draw a new one, and the computer guesses which it is by finding the examples that look most like it.
        </p>

        <div className="dg-pick" role="group" aria-labelledby={`${ids}-pick`}>
          <p className="dg-step" id={`${ids}-pick`}>
            <span className="dg-n" aria-hidden="true">1</span>
            <span>Pick two things to teach</span>
          </p>
          <div className="dg-chips">
            {PRESETS.map((x) => (
              <button key={x.id} type="button" className="dg-chip" aria-pressed={preset === x.id} onClick={() => preset !== x.id && resetAll(x.id)}>
                {x.label}
              </button>
            ))}
          </div>
          {preset === 'own' && (
            <div className="dg-own">
              {[0, 1].map((i) => (
                <label key={i} className="dg-field">
                  <span>{i === 0 ? 'First thing' : 'Second thing'}</span>
                  <input
                    type="text"
                    maxLength={16}
                    autoComplete="off"
                    placeholder={i === 0 ? 'e.g. house' : 'e.g. tree'}
                    value={own[i]}
                    onChange={(e) => setOwn((o) => (i === 0 ? [e.target.value, o[1]] : [o[0], e.target.value]))}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <p className="dg-step">
          <span className="dg-n" aria-hidden="true">{mode === 'teach' ? 2 : 3}</span>
          {mode === 'teach' ? (
            <span>Teach it: draw one, then save it as <b>{names[0]}</b> or <b>{names[1]}</b></span>
          ) : (
            <span>Test it: draw a new <b>{names[0]}</b> or <b>{names[1]}</b>, then press “Guess”</span>
          )}
        </p>

        <div className="dg-stage">
          <div className="dg-padcol">
            <div className="dg-pad">
              <canvas
                ref={pad.ref}
                className="dg-canvas"
                role="img"
                aria-label={`Drawing area. Draw with a finger, mouse or pen.${pad.strokes.length ? ' It has a drawing on it.' : ' It is empty.'}`}
                onPointerDown={(e) => pad.down(e, onStart())}
                onPointerMove={pad.move}
                onPointerUp={pad.up}
                onPointerCancel={pad.up}
                onLostPointerCapture={pad.up}
              />
              {!pad.strokes.length && !pad.drawing && (
                <span className="dg-here" aria-hidden="true">
                  Draw here
                </span>
              )}
            </div>
            <div className="rl-buttons dg-tools">
              {mode === 'teach' ? (
                <>
                  {([0, 1] as Side[]).map((s) => (
                    <button key={s} type="button" className="btn" disabled={!ink || count[s] >= MAX} onClick={() => saveFromPad(s)}>
                      Save as {names[s]}
                    </button>
                  ))}
                </>
              ) : (
                <button type="button" className="btn" disabled={!ink || !!result} onClick={guess}>
                  Guess
                </button>
              )}
              <button type="button" className="btn quiet" disabled={!pad.strokes.length} onClick={() => { pad.undo(); if (mode === 'test') setResult(null); }}>
                Undo
              </button>
              <button type="button" className="btn quiet" disabled={!pad.strokes.length} onClick={() => { pad.clear(); if (mode === 'test') setResult(null); }}>
                Clear
              </button>
            </div>
          </div>

          <div className="dg-side">
            {/* one live region: what just happened, or the guess and how sure it is */}
            <div className="dg-say" aria-live="polite">
              {mode === 'test' && result ? (
                <>
                  <p className="dg-guess">
                    My guess: <b>{names[result.guess.label]}</b>
                  </p>
                  <p className="dg-sure">
                    <span className="dg-dots" aria-hidden="true">
                      {Array.from({ length: result.guess.k }, (_, i) => (
                        <i key={i} className={i < result.guess.votes ? 'on' : ''} />
                      ))}
                    </span>
                    <span>
                      {result.guess.votes === result.guess.k
                        ? `Sure: all ${result.guess.k} closest matches are ${names[result.guess.label]} drawings.`
                        : `Not so sure: only ${result.guess.votes} of the ${result.guess.k} closest matches are ${names[result.guess.label]} drawings.`}
                    </span>
                  </p>
                  {result.verdict && say && <p className={`dg-feedback ${result.verdict === 'wrong' && !result.fixed ? 'is-wrong' : 'is-right'}`}>{say}</p>}
                </>
              ) : (
                <p>{say || (mode === 'teach' ? 'Draw in the square, then save it. Aim for about 5 of each.' : 'Draw a new one, then press “Guess”.')}</p>
              )}
            </div>

            {mode === 'teach' ? (
              <>
                {([0, 1] as Side[]).map((s) => (
                  <div key={s} className="dg-row">
                    <p className="dg-row-head">
                      <b>{names[s]}</b>{' '}
                      <span className="num">
                        {count[s]} of about {AIM}
                      </span>
                      {count[s] < MIN && <span className="dg-need"> (need {MIN - count[s]} more)</span>}
                    </p>
                    <ul className="dg-thumbs" aria-label={`Your ${names[s]} drawings`}>
                      <AnimatePresence initial={false}>
                        {examples
                          .filter((e) => e.side === s)
                          .map((e, i) => (
                            <motion.li key={e.id} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.25, ease: EASE }}>
                              <button type="button" className="dg-thumb" aria-label={`Delete ${names[s]} drawing ${i + 1}`} title="Delete" onClick={() => remove(e)}>
                                <Doodle drawing={e.drawing} />
                                <span className="dg-del" aria-hidden="true">×</span>
                              </button>
                            </motion.li>
                          ))}
                      </AnimatePresence>
                      {count[s] === 0 && <li className="dg-empty">None yet</li>}
                    </ul>
                  </div>
                ))}

                {lopsided && (
                  <p className="dg-tip">
                    <b>Unbalanced examples.</b> You have {plural(count[0], names[0])} but {plural(count[1], names[1])}. With many more of one, it may guess that one too often. Try to give both about the same number.
                  </p>
                )}

                <div className="rl-buttons">
                  <button type="button" className="btn" disabled={!ready} onClick={() => switchMode('test')}>
                    Test it →
                  </button>
                </div>
                {!ready && <p className="dg-note">You need at least {MIN} of each before you can test it.</p>}
              </>
            ) : (
              <>
                <AnimatePresence mode="wait">
                  {result && (
                    <motion.div key="r" className="dg-result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                      <p className="dg-label">It looks most like these drawings of yours:</p>
                      <ul className="dg-near">
                        {result.near.map((e, i) => (
                          <li key={e.id} className={e.side === result.guess.label ? 'is-same' : 'is-other'}>
                            <span className="dg-thumb dg-thumb-lg">
                              <Doodle drawing={e.drawing} />
                            </span>
                            <span className="dg-near-name">
                              {i === 0 ? 'closest: ' : ''}
                              {names[e.side]}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="dg-seen">
                        <GridView vec={result.vec} />
                        <span>What the computer compares: your drawing shrunk to {GRID} × {GRID} squares.</span>
                      </div>

                      {!result.verdict ? (
                        <div className="dg-verdict" role="group" aria-label="Was the guess right?">
                          <span>Was it right?</span>
                          <button type="button" className="btn quiet" onClick={() => mark('right')}>
                            Yes
                          </button>
                          <button type="button" className="btn quiet" onClick={() => mark('wrong')}>
                            No
                          </button>
                        </div>
                      ) : result.verdict === 'wrong' && !result.fixed ? (
                        <div className="rl-buttons">
                          <button type="button" className="btn" onClick={fix} disabled={count[result.guess.label === 0 ? 1 : 0] >= MAX}>
                            Save it as {names[result.guess.label === 0 ? 1 : 0]}
                          </button>
                        </div>
                      ) : null}
                      {result.verdict === 'wrong' && lopsided && (
                        <p className="dg-tip">
                          <b>Unbalanced examples.</b> You have {plural(count[0], names[0])} and {plural(count[1], names[1])}. Try to give both about the same number.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                {tally.tested > 0 && (
                  <p className="dg-note num">
                    Right so far: {tally.right} of {tally.tested}
                  </p>
                )}
                <div className="rl-buttons">
                  <button type="button" className="btn quiet" onClick={() => switchMode('teach')}>
                    ← Back to teaching
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="viz-cap">
          This is a simple method called <b>nearest neighbour</b>. It shrinks every drawing to a small {GRID} × {GRID} grid of squares, then finds the saved drawings whose squares match best. Real image models learn their own patterns from millions of pictures, but the idea of learning from examples is the same. Nothing is saved: your drawings disappear when you leave the page.
        </p>
      </div>
    </Root>
  );
}

/* ---------- the drawing pad ---------- */

function usePad() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Drawing>([]);
  const [drawing, setDrawing] = useState(false);
  const live = useRef<Point[] | null>(null);
  const pointer = useRef<number | null>(null);
  const strokesRef = useRef<Drawing>(strokes);
  strokesRef.current = strokes;

  const style = (ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) => {
    ctx.strokeStyle = getComputedStyle(c).color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = Math.max(3, c.width * 0.024);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const paintStroke = (ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, s: Point[]) => {
    if (!s.length) return;
    if (s.length === 1) {
      ctx.beginPath();
      ctx.arc(s[0].x * c.width, s[0].y * c.height, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(s[0].x * c.width, s[0].y * c.height);
    for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x * c.width, s[i].y * c.height);
    ctx.stroke();
  };

  const redraw = useCallback(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    style(ctx, c);
    for (const s of strokesRef.current) paintStroke(ctx, c, s);
    if (live.current) paintStroke(ctx, c, live.current);
  }, []);

  useEffect(redraw, [strokes, redraw]);

  /* keep the backing store sharp at any size, and repaint in the new ink colour when the theme changes */
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(c.clientWidth * dpr);
      const h = Math.round(c.clientHeight * dpr);
      if (w && h && (c.width !== w || c.height !== h)) {
        c.width = w;
        c.height = h;
      }
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', redraw);
    return () => {
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener('change', redraw);
    };
  }, [redraw]);

  const at = (e: { clientX: number; clientY: number }): Point => {
    const r = ref.current!.getBoundingClientRect();
    const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
  };

  const down = (e: ReactPointerEvent<HTMLCanvasElement>, wipe: boolean) => {
    if (pointer.current !== null) return; // one finger at a time
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety; drawing still works without it */
    }
    if (wipe) {
      strokesRef.current = [];
      setStrokes([]);
    }
    pointer.current = e.pointerId;
    live.current = [at(e)];
    setDrawing(true);
    redraw();
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== e.pointerId || !live.current) return;
    e.preventDefault();
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const native = e.nativeEvent;
    const batch = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const pts = (batch.length ? batch : [native]).map(at);
    style(ctx, c);
    ctx.beginPath();
    let last = live.current[live.current.length - 1];
    ctx.moveTo(last.x * c.width, last.y * c.height);
    for (const pt of pts) {
      if (Math.hypot(pt.x - last.x, pt.y - last.y) < 0.003) continue;
      live.current.push(pt);
      ctx.lineTo(pt.x * c.width, pt.y * c.height);
      last = pt;
    }
    ctx.stroke();
  };

  const up = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    const s = live.current;
    live.current = null;
    setDrawing(false);
    if (s && s.length) setStrokes((xs) => [...xs, s]);
  };

  const undo = () => setStrokes((xs) => xs.slice(0, -1));
  const clear = () => {
    live.current = null;
    pointer.current = null;
    setDrawing(false);
    setStrokes([]);
  };

  return { ref, strokes, drawing, down, move, up, undo, clear };
}

/* ---------- small pictures ---------- */

/** A saved drawing, cropped to its ink so small drawings still show clearly. */
function Doodle({ drawing }: { drawing: Drawing }) {
  const b = bounds(drawing);
  if (!b) return null;
  const span = Math.max(b.w, b.h, 0.05);
  const pad = span * 0.15;
  const x = (b.minX + b.maxX) / 2 - span / 2 - pad;
  const y = (b.minY + b.maxY) / 2 - span / 2 - pad;
  const size = span + pad * 2;
  return (
    <svg viewBox={`${x} ${y} ${size} ${size}`} className="dg-doodle" aria-hidden="true" focusable="false">
      {drawing.map((s, i) =>
        s.length === 1 ? (
          <circle key={i} cx={s[0].x} cy={s[0].y} r={size * 0.02} />
        ) : (
          <polyline key={i} points={s.map((pt) => `${pt.x},${pt.y}`).join(' ')} vectorEffect="non-scaling-stroke" />
        ),
      )}
    </svg>
  );
}

/** The grid of squares the computer actually compares. */
function GridView({ vec }: { vec: number[] }) {
  const max = Math.max(...vec) || 1;
  return (
    <svg viewBox={`0 0 ${GRID} ${GRID}`} className="dg-grid" role="img" aria-label={`Your drawing shrunk to ${GRID} by ${GRID} squares`}>
      {vec.map((v, i) =>
        v > 0.02 * max ? <rect key={i} x={i % GRID} y={Math.floor(i / GRID)} width="1" height="1" style={{ opacity: Math.min(1, (v / max) * 1.1) }} /> : null,
      )}
    </svg>
  );
}
