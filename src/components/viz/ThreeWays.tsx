import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import {
  GRID,
  LEN_MAX,
  MAX_STEPS,
  PILE,
  RED_MAX,
  bestMove,
  cellId,
  greedyPath,
  groupMakeup,
  isGoal,
  isPit,
  isWall,
  nearest,
  newLearner,
  runGroups,
  startGroups,
  stepGroups,
  train,
  vote,
  type Groups,
  type Kind,
  type Learner,
  type Point,
} from '../../lib/three-ways';

type Tab = 'labels' | 'groups' | 'rewards';
const TABS: { id: Tab; name: string; short: string }[] = [
  { id: 'labels', name: 'With name tags', short: 'Labels' },
  { id: 'groups', name: 'Without name tags', short: 'No labels' },
  { id: 'rewards', name: 'With rewards', short: 'Rewards' },
];

/* ---------- the plot shared by the first two tabs ---------- */
const W = 340;
const H = 250;
const PAD = { l: 38, r: 12, t: 12, b: 40 };
const px = (len: number) => PAD.l + (len / LEN_MAX) * (W - PAD.l - PAD.r);
const py = (red: number) => H - PAD.b - (red / RED_MAX) * (H - PAD.t - PAD.b);

const KIND_NAME: Record<Kind, string> = { cherry: 'cherry', apple: 'apple', banana: 'banana' };
const plural = (k: Kind, n: number) => `${n} ${k === 'cherry' ? (n === 1 ? 'cherry' : 'cherries') : n === 1 ? k : k + 's'}`;

const MYSTERY = [
  { name: 'Long and yellow', len: 17, red: 1.5 },
  { name: 'Small and very red', len: 2.5, red: 9 },
  { name: 'In between', len: 11.5, red: 3 },
];

function KindMark({ kind, x, y, r = 8, cls = '' }: { kind: Kind; x: number; y: number; r?: number; cls?: string }) {
  if (kind === 'cherry') return <circle cx={x} cy={y} r={r - 1} className={`ka-dot ka-cherry ${cls}`} />;
  if (kind === 'apple') return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx="4" className={`ka-dot ka-apple ${cls}`} />;
  return <path d={`M ${x} ${y - r - 1} L ${x + r + 1} ${y + r - 1} L ${x - r - 1} ${y + r - 1} Z`} className={`ka-dot ka-banana ${cls}`} />;
}

function Axes() {
  const ticks = [0, 6, 12, 18, 24];
  return (
    <g>
      <path d={`M ${px(0)} ${py(0)} H ${px(LEN_MAX)} M ${px(0)} ${py(0)} V ${py(RED_MAX)}`} className="ka-axis" />
      {ticks.map((t) => (
        <text key={t} x={px(t)} y={H - PAD.b + 16} textAnchor="middle" className="ka-t">
          {t}
        </text>
      ))}
      <text x={(px(0) + px(LEN_MAX)) / 2} y={H - 6} textAnchor="middle" className="ka-t">
        length (cm)
      </text>
      <text transform={`translate(12 ${(py(0) + py(RED_MAX)) / 2}) rotate(-90)`} textAnchor="middle" className="ka-t">
        how red
      </text>
    </g>
  );
}

function Legend() {
  return (
    <ul className="ka-legend" aria-label="Key to the shapes">
      {(['cherry', 'apple', 'banana'] as Kind[]).map((k) => (
        <li key={k}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <KindMark kind={k} x={10} y={10} r={7} />
          </svg>
          {k}
        </li>
      ))}
    </ul>
  );
}

/* ---------- tab 1: learning from labels ---------- */
function Labels() {
  const [m, setM] = useState<{ len: number; red: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const place = (e: PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const vx = ((e.clientX - r.left) / r.width) * W;
    const vy = ((e.clientY - r.top) / r.height) * H;
    const len = Math.min(LEN_MAX, Math.max(0, ((vx - PAD.l) / (W - PAD.l - PAD.r)) * LEN_MAX));
    const red = Math.min(RED_MAX, Math.max(0, ((H - PAD.b - vy) / (H - PAD.t - PAD.b)) * RED_MAX));
    setM({ len: Math.round(len * 2) / 2, red: Math.round(red * 2) / 2 });
  };

  const near = m ? nearest(PILE, m.len, m.red, 3) : [];
  const v = m ? vote(near) : null;
  const say = !m || !v
    ? 'Every item in the pile has a name tag. Place a mystery fruit and watch how the computer uses the tags.'
    : `Mystery fruit: ${m.len} cm long, redness ${m.red} out of ${RED_MAX}. Its 3 closest tagged examples are ${near.map((n) => KIND_NAME[n.kind]).join(', ')}. ${
        v.unanimous ? `All 3 agree, so it guesses ${KIND_NAME[v.kind]}.` : `${v.counts[v.kind]} of 3 say ${KIND_NAME[v.kind]}, so it guesses ${KIND_NAME[v.kind]}, but it is not sure.`
      }`;

  return (
    <div>
      <p className="ka-lead">
        <b>A teacher gives the answers.</b> Every fruit here has a name tag. To name a new fruit, the computer finds the tagged fruit it looks most like.
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="ka-svg ka-tap"
        role="img"
        aria-label={`Twelve fruit plotted by length and redness. Cherries are small and red, apples are medium, bananas are long and not red. ${m ? say : 'Tap the chart to place a mystery fruit.'}`}
        onPointerDown={place}
      >
        <Axes />
        {m &&
          near.map((n) => (
            <motion.path
              key={n.id + m.len + m.red}
              d={`M ${px(m.len)} ${py(m.red)} L ${px(n.len)} ${py(n.red)}`}
              className="ka-link"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: EASE }}
            />
          ))}
        {PILE.map((it) => (
          <KindMark key={it.id} kind={it.kind} x={px(it.len)} y={py(it.red)} cls={near.includes(it) ? 'ka-near' : ''} />
        ))}
        {m && (
          <g>
            <circle cx={px(m.len)} cy={py(m.red)} r="12" className="ka-mystery" />
            <text x={px(m.len)} y={py(m.red) + 5} textAnchor="middle" className="ka-q">
              ?
            </text>
          </g>
        )}
        {!m && (
          <text x={px(LEN_MAX) - 4} y={py(RED_MAX) + 14} textAnchor="end" className="ka-t">
            tap to place a ?
          </text>
        )}
      </svg>
      <Legend />
      <div className="ka-row" role="group" aria-label="Mystery fruit to try">
        {MYSTERY.map((x) => (
          <button key={x.name} type="button" className={`btn quiet ka-btn${m && m.len === x.len && m.red === x.red ? ' on' : ''}`} onClick={() => setM({ len: x.len, red: x.red })}>
            {x.name}
          </button>
        ))}
      </div>
      <p className="ka-say" aria-live="polite">
        {say}
      </p>
    </div>
  );
}

/* ---------- tab 2: finding groups without labels ---------- */
function Groups_() {
  const [k, setK] = useState(3);
  const [g, setG] = useState<Groups>(() => startGroups(PILE, 3));
  const [peek, setPeek] = useState(false);

  const pick = (n: number) => {
    setK(n);
    setG(startGroups(PILE, n));
    setPeek(false);
  };
  const makeup = g.assign ? groupMakeup(PILE, g.assign, g.k) : null;

  let say: string;
  if (!g.assign) say = `The tags are hidden. You chose ${k} groups. The computer starts with ${k} centres, shown as crosses, spread far apart. Press “One round”.`;
  else if (g.done) say = `Finished after ${g.round} rounds: the last round changed nothing. The computer found ${k} groups by closeness alone. It has no names for them.`;
  else say = `Round ${g.round}: every fruit joined its nearest centre, then each centre moved to the middle of its group.`;

  return (
    <div>
      <p className="ka-lead">
        <b>No answers at all.</b> The same pile, with the name tags taken away. The computer can only look for fruit that sit close together.
      </p>
      <div className="ka-row ka-kpick" role="group" aria-label="How many groups should it look for?">
        <span className="ka-label">You choose how many groups:</span>
        {[2, 3, 4].map((n) => (
          <button key={n} type="button" className={`btn quiet ka-btn ka-small${k === n ? ' on' : ''}`} aria-pressed={k === n} onClick={() => pick(n)}>
            {n}
          </button>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="ka-svg"
        role="img"
        aria-label={`The same twelve fruit as plain dots, with no tags. ${say}`}
      >
        <Axes />
        {PILE.map((it, i) => (
          <motion.circle
            key={it.id}
            cx={px(it.len)}
            cy={py(it.red)}
            r="8"
            className={`ka-dot ka-plain${g.assign ? ` ka-g${g.assign[i]}` : ''}`}
            initial={false}
            animate={{ scale: g.assign ? [1.25, 1] : 1 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            transition={{ duration: 0.35, ease: EASE }}
          />
        ))}
        {g.centres.map((c, j) => (
          <motion.g key={j} initial={false} animate={{ x: px(c[0] * LEN_MAX), y: py(c[1] * RED_MAX) }} transition={{ duration: 0.5, ease: EASE }}>
            <path d="M -7 0 H 7 M 0 -7 V 7" className={`ka-centre ka-gc${j}`} />
          </motion.g>
        ))}
      </svg>
      <div className="ka-row">
        {!g.done && (
          <>
            <button type="button" className="btn ka-btn" onClick={() => setG(stepGroups(PILE, g))}>
              One round
            </button>
            <button type="button" className="btn quiet ka-btn" onClick={() => setG(runGroups(PILE, g))}>
              Run to the end
            </button>
          </>
        )}
        {g.done && (
          <button type="button" className="btn quiet ka-btn" aria-pressed={peek} onClick={() => setPeek(!peek)}>
            {peek ? 'Hide the real names' : 'Peek at the real names'}
          </button>
        )}
        <button type="button" className="btn quiet ka-btn" onClick={() => pick(k)} disabled={!g.assign}>
          Start over
        </button>
      </div>
      <p className="ka-say" aria-live="polite">
        {say}
      </p>
      {g.done && peek && makeup && (
        <ul className="ka-makeup" aria-label="What is really in each group (the computer cannot see this)">
          {makeup.map((m, j) => (
            <li key={j}>
              <i className={`ka-swatch ka-g${j}`} aria-hidden="true" />
              Group {j + 1}:{' '}
              {(Object.keys(m) as Kind[])
                .filter((kind) => m[kind] > 0)
                .map((kind) => plural(kind, m[kind]))
                .join(' and ')}
            </li>
          ))}
          <li className="ka-note">
            {k === 3 ? 'The groups match the three kinds. A person still has to give them names.' : k < 3 ? 'With fewer groups, two kinds are lumped together. The number of groups was your choice.' : 'With more groups, one kind is split in two. The number of groups was your choice.'}
          </li>
        </ul>
      )}
    </div>
  );
}

/* ---------- tab 3: learning from rewards ---------- */
const CELL = 56;
const GW = GRID.cols * CELL;
const GH = GRID.rows * CELL;
const cx = (x: number) => x * CELL + CELL / 2;
const cy = (y: number) => y * CELL + CELL / 2;
const ARROW_ROT = [0, 90, 180, 270];

function Rewards() {
  const [l, setL] = useState<Learner>(() => newLearner());
  const [run, setRun] = useState<Point[] | null>(null);
  const [at, setAt] = useState(0);

  const path = greedyPath(l.q);
  const last = l.history[l.history.length - 1];

  useEffect(() => {
    if (!run || at >= run.length - 1) return;
    const t = setTimeout(() => setAt((a) => a + 1), 380);
    return () => clearTimeout(t);
  }, [run, at]);

  const go = (n: number) => {
    setRun(null);
    setL((cur) => train(cur, n));
  };
  const watch = () => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setRun(path.cells);
    setAt(reduce ? path.cells.length - 1 : 0);
  };
  const reset = () => {
    setRun(null);
    setL(newLearner());
  };

  const agent = run ? run[Math.min(at, run.length - 1)] : GRID.start;
  const recent = l.history.slice(-60);

  let say: string;
  if (!last) say = 'The robot knows nothing yet. Press “Try once” and it will wander, bump into walls and maybe fall in a hole.';
  else {
    const res = last.outcome === 'goal' ? `reached the star in ${last.steps} moves` : last.outcome === 'pit' ? `fell into a hole after ${last.steps} moves` : `ran out of time after ${MAX_STEPS} moves`;
    say = `Tries so far: ${l.tries}. Last try: ${res}. ${
      path.reached ? `Its best route now takes ${path.cells.length - 1} moves.` : 'It does not yet have a safe route from the start.'
    }`;
  }
  if (run && at >= run.length - 1) say = `The robot walked its best route: ${run.length - 1} moves to the star.`;

  return (
    <div>
      <p className="ka-lead">
        <b>Only a score.</b> Nobody tells the robot where to go. It tries moves, gets points or loses points, and remembers what worked.
      </p>
      <svg viewBox={`-2 -2 ${GW + 4} ${GH + 4}`} className="ka-svg ka-grid" role="img" aria-label={`A grid with a robot at the top left, a star at the bottom right, two holes and two walls. ${say}`}>
        {Array.from({ length: GRID.rows }, (_, y) =>
          Array.from({ length: GRID.cols }, (_, x) => {
            const wall = isWall(x, y);
            const pit = isPit(x, y);
            const goal = isGoal(x, y);
            const m = !wall && !pit && !goal ? bestMove(l.q, x, y) : null;
            return (
              <g key={cellId(x, y)}>
                <rect x={x * CELL} y={y * CELL} width={CELL} height={CELL} className={`ka-cell${wall ? ' ka-wall' : ''}${pit ? ' ka-pit' : ''}${goal ? ' ka-goal' : ''}`} />
                {pit && (
                  <text x={cx(x)} y={cy(y) + 5} textAnchor="middle" className="ka-t ka-hole">
                    −10
                  </text>
                )}
                {goal && <path d={starPath(cx(x), cy(y), 16, 7)} className="ka-star" />}
                {m !== null && (
                  <g transform={`translate(${cx(x)} ${cy(y)}) rotate(${ARROW_ROT[m]})`} className="ka-arrow">
                    <path d="M 0 -13 L 8 -2 H 3 V 11 H -3 V -2 H -8 Z" />
                  </g>
                )}
              </g>
            );
          }),
        )}
        {path.reached && !run && <path d={'M ' + path.cells.map((c) => `${cx(c[0])} ${cy(c[1])}`).join(' L ')} className="ka-route" />}
        <motion.g initial={false} animate={{ x: cx(agent[0]), y: cy(agent[1]) }} transition={{ duration: 0.3, ease: EASE }}>
          <rect x="-12" y="-11" width="24" height="22" rx="6" className="ka-robot" />
          <circle cx="-5" cy="-2" r="2.4" className="ka-eye" />
          <circle cx="5" cy="-2" r="2.4" className="ka-eye" />
          <path d="M -5 5 H 5" className="ka-mouth" />
          <path d="M 0 -11 V -16" className="ka-mouth" />
        </motion.g>
      </svg>
      <p className="ka-rules">
        Star <b>+10</b>. Hole <b>−10</b> (the try ends). Every move <b>−1</b>, so wasting time costs points. Arrows show the best move it has found so far.
      </p>
      <div className="ka-row">
        <button type="button" className="btn ka-btn" onClick={() => go(1)}>
          Try once
        </button>
        <button type="button" className="btn ka-btn" onClick={() => go(10)}>
          Try 10 times
        </button>
        <button type="button" className="btn ka-btn" onClick={() => go(100)}>
          Try 100 times
        </button>
        <button type="button" className="btn quiet ka-btn" onClick={watch} disabled={!path.reached}>
          Watch its best route
        </button>
        <button type="button" className="btn quiet ka-btn" onClick={reset} disabled={l.tries === 0}>
          Start over
        </button>
      </div>
      <p className="ka-say" aria-live="polite">
        {say}
      </p>
      {recent.length > 0 && (
        <figure className="ka-chart">
          <svg viewBox="0 0 320 84" className="ka-svg" role="img" aria-label={`Bar chart of moves used in each of the last ${recent.length} tries. Green bars reached the star, red bars fell in a hole, grey bars ran out of time.`}>
            <path d="M 0 66 H 320" className="ka-axis" />
            {recent.map((h, i) => {
              const bw = 320 / recent.length;
              const bh = Math.max(2, (h.steps / MAX_STEPS) * 60);
              return <rect key={i} x={i * bw + 0.5} y={66 - bh} width={Math.max(1, bw - 1)} height={bh} className={`ka-bar ka-bar-${h.outcome}`} />;
            })}
            <text x="0" y="81" className="ka-t">
              older tries
            </text>
            <text x="320" y="81" textAnchor="end" className="ka-t">
              latest
            </text>
          </svg>
          <figcaption className="viz-cap">
            Moves used in each try (last {recent.length}). Taller bars mean more wandering. Green reached the star, red fell in a hole, grey ran out of time. It still tries a random move now and then to explore, so a few bad tries remain.
          </figcaption>
        </figure>
      )}
    </div>
  );
}

function starPath(x: number, y: number, R: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(x + rad * Math.cos(a)).toFixed(1)} ${(y + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

/* ---------- the whole playground ---------- */
export default function ThreeWays() {
  const [tab, setTab] = useState<Tab>('labels');
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') n = (i + TABS.length - 1) % TABS.length;
    else return;
    e.preventDefault();
    setTab(TABS[n].id);
    refs.current[TABS[n].id]?.focus();
  };

  return (
    <Root>
      <div className="viz ka">
        <p className="viz-title">One pile of fruit, three ways to learn</p>
        <div className="ka-tabs" role="tablist" aria-label="Ways to learn">
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`ka-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`ka-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className={`ka-tab${tab === t.id ? ' on' : ''}`}
              onClick={() => setTab(t.id)}
              onKeyDown={onKey}
            >
              <span className="ka-tab-full">{t.name}</span>
              <span className="ka-tab-short">{t.short}</span>
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`ka-panel-${tab}`} aria-labelledby={`ka-tab-${tab}`} className="ka-panel">
          {tab === 'labels' && <Labels />}
          {tab === 'groups' && <Groups_ />}
          {tab === 'rewards' && <Rewards />}
        </div>
        <p className="viz-cap">The fruit sizes, colours and scores are made-up examples. Real systems use thousands of measurements, not two, but the three ideas are the same.</p>
      </div>
    </Root>
  );
}
