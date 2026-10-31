import { useState } from 'react';
import { Root } from './shared';
import {
  LIMIT,
  START,
  STEP,
  TEST_CARDS,
  boundary,
  buildPile,
  evaluate,
  gap,
  percent,
  predict,
  starSide,
  train,
  type Card,
  type Score,
  type Shape,
  type Style,
} from '../../lib/bias-detective';

/*
 * "Bias Detective": the learner looks at a lopsided pile of example cards, tests the sorter on
 * new cards, sees a good overall score, then checks each group and finds the weak spot. They fix
 * it by adding the missing kind of example. The learning itself is in lib/bias-detective.ts.
 * Toy data only: shapes drawn with a marker or a pencil. Nothing is stored or sent anywhere.
 */

const STYLE_NAME: Record<Style, string> = { marker: 'Marker cards', pencil: 'Pencil cards' };

/* plot geometry (viewBox units) */
const W = 320;
const H = 288;
const X0 = 30;
const X1 = 306;
const Y0 = 30; // top = darkest
const Y1 = 256; // bottom = palest
const px = (v: number) => X0 + v * (X1 - X0);
const py = (v: number) => Y1 - v * (Y1 - Y0);

const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 1 : 0.42;
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  return `${(r * Math.cos(a)).toFixed(3)},${(r * Math.sin(a)).toFixed(3)}`;
}).join(' ');
const HEART_PATH = 'M0 0.95 C-1.25 0.1 -1.05 -0.85 -0.5 -0.9 C-0.2 -0.92 0 -0.62 0 -0.45 C0 -0.62 0.2 -0.92 0.5 -0.9 C1.05 -0.85 1.25 0.1 0 0.95 Z';

/** A star or heart outline, drawn big in a card and small on the plot. */
function Glyph({ shape, style, size, x = 0, y = 0, className }: { shape: Shape; style: Style; size: number; x?: number; y?: number; className?: string }) {
  const sw = (style === 'marker' ? 2.6 : 1.1) / size;
  const common = { strokeWidth: sw, strokeLinejoin: 'round' as const, className: `ra-glyph ra-${style} ra-${shape}${className ? ' ' + className : ''}` };
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {shape === 'star' ? <polygon points={STAR_POINTS} {...common} /> : <path d={HEART_PATH} {...common} />}
    </g>
  );
}

function MiniCard({ card }: { card: Card }) {
  return (
    <svg viewBox="-14 -14 28 28" width="26" height="26" className="ra-mini" aria-hidden="true" focusable="false">
      <Glyph shape={card.shape} style={card.style} size={11} />
    </svg>
  );
}

const scoreText = (s: Score) => `${s.right} of ${s.total} right (${percent(s)}%)`;

export default function BiasDetective() {
  const [marker, setMarker] = useState<number>(START.marker);
  const [pencil, setPencil] = useState<number>(START.pencil);
  const [tested, setTested] = useState(false);
  const [grouped, setGrouped] = useState(false);
  const [last, setLast] = useState<null | 'marker' | 'pencil'>(null);

  const pile = buildPile(marker, pencil);
  const model = train(pile);
  const report = evaluate(model, TEST_CARDS);
  const first = evaluate(train(buildPile(START.marker, START.pencil)), TEST_CARDS);
  const line = boundary(model);
  const shade = starSide(model);
  const counts = (style: Style, shape: Shape) => pile.filter((c) => c.style === style && c.shape === shape).length;

  const pencilNow = percent(report.byStyle.pencil);
  const pencilThen = percent(first.byStyle.pencil);
  const fixed = grouped && gap(report) <= 10 && pencilNow >= 90;
  const unfair = gap(report) >= 20;

  let say: string;
  if (!tested) {
    say = `The sorter learned from ${pile.length} cards. Look who is in the pile: ${marker} marker stars, ${marker} marker hearts, but only ${pencil} pencil star and ${pencil} pencil heart.`;
  } else if (!grouped) {
    say = `On ${report.overall.total} new cards it got ${report.overall.right} right: ${percent(report.overall)}%. That sounds good. But one number for everybody can hide something.`;
  } else if (fixed) {
    say = `Marker cards ${percent(report.byStyle.marker)}%, pencil cards ${pencilNow}%. Both groups are now about equally good. Checking each group found the problem, and adding the missing kind of example fixed it.`;
  } else if (last === 'marker' && pencilNow <= pencilThen) {
    say = `More marker cards, and pencil cards are still at ${pencilNow}%. More of the same kind of example does not help a group the sorter hardly ever sees.`;
  } else if (unfair) {
    say = `Marker cards ${percent(report.byStyle.marker)}%, pencil cards ${pencilNow}%. The sorter is not being careless about pencil. It has hardly seen any pencil cards.${pencilNow > pencilThen ? ` It is improving: it was ${pencilThen}%.` : ''}`;
  } else {
    say = `Marker cards ${percent(report.byStyle.marker)}%, pencil cards ${pencilNow}%. The gap is getting smaller.`;
  }

  const reset = () => {
    setMarker(START.marker);
    setPencil(START.pencil);
    setTested(false);
    setGrouped(false);
    setLast(null);
  };

  const wrongIds = new Set(TEST_CARDS.filter((c) => predict(model, c) !== c.shape).map((c) => c.id));

  const ariaPlot =
    `A plot of the cards. Across: how pointy the outline is. Up: how dark the pen is. Marker cards sit near the top, pencil cards near the bottom. ` +
    `The dashed line is where the sorter changes its mind between heart and star.` +
    (tested ? ` On the new cards it got ${report.overall.right} of ${report.overall.total} right.` : '');

  return (
    <Root>
      <div className="viz ra-bd">
        <p className="viz-title">Bias Detective: sort stars and hearts</p>

        <h4 className="ra-h">1. The training pile</h4>
        <p className="ra-note">These are the examples the sorter learns from. Every card is a star or a heart, drawn in marker or in pencil.</p>
        <div className="ra-pile">
          {(['marker', 'pencil'] as Style[]).map((s) => (
            <div key={s} className="ra-pile-row">
              <p className="ra-pile-head">
                <b>{STYLE_NAME[s]}</b>
                <span>
                  {counts(s, 'star')} {counts(s, 'star') === 1 ? 'star' : 'stars'}, {counts(s, 'heart')} {counts(s, 'heart') === 1 ? 'heart' : 'hearts'}
                </span>
              </p>
              <div className="ra-cards" aria-hidden="true">
                {pile.filter((c) => c.style === s).map((c) => (
                  <MiniCard key={c.id} card={c} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <h4 className="ra-h">2. What the sorter learned</h4>
        <p className="ra-note">
          It measures two things on each card, then learns an average star and an average heart. A new card goes with the average it is closer to.
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="ra-plot" role="img" aria-label={ariaPlot}>
          <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} className="ra-frame" />
          {shade.length > 0 && <polygon points={shade.map((p) => `${px(p.pointy)},${py(p.dark)}`).join(' ')} className="ra-starside" />}
          {line && <line x1={px(line[0].pointy)} y1={py(line[0].dark)} x2={px(line[1].pointy)} y2={py(line[1].dark)} className="ra-line" />}

          {pile.map((c) => (
            <Glyph key={c.id} shape={c.shape} style={c.style} size={7.5} x={px(c.pointy)} y={py(c.dark)} className={tested ? 'ra-dim' : undefined} />
          ))}

          {tested &&
            TEST_CARDS.map((c) => {
              const bad = wrongIds.has(c.id);
              return (
                <g key={c.id}>
                  <circle cx={px(c.pointy)} cy={py(c.dark)} r="9" className={bad ? 'ra-ring ra-bad' : 'ra-ring ra-ok'} />
                  <Glyph shape={c.shape} style={c.style} size={5} x={px(c.pointy)} y={py(c.dark)} />
                </g>
              );
            })}

          {model.star && (
            <g>
              <circle cx={px(model.star.pointy)} cy={py(model.star.dark)} r="13" className="ra-avg" />
              <Glyph shape="star" style="marker" size={8} x={px(model.star.pointy)} y={py(model.star.dark)} />
            </g>
          )}
          {model.heart && (
            <g>
              <circle cx={px(model.heart.pointy)} cy={py(model.heart.dark)} r="13" className="ra-avg" />
              <Glyph shape="heart" style="marker" size={8} x={px(model.heart.pointy)} y={py(model.heart.dark)} />
            </g>
          )}

          <text x={X0} y={Y0 - 9} className="ra-axis">↑ darker pen</text>
          <text x={X0} y={H - 6} className="ra-axis">← round</text>
          <text x={X1} y={H - 6} textAnchor="end" className="ra-axis">pointy →</text>
        </svg>
        <ul className="ra-key">
          <li><span className="ra-swatch ra-sw-avg" aria-hidden="true" />Ringed shape: the average star and the average heart</li>
          <li><span className="ra-swatch ra-sw-line" aria-hidden="true" />Dashed line: the sorter changes its mind here. Shaded side means star.</li>
          {tested && <li><span className="ra-swatch ra-sw-bad" aria-hidden="true" />Red ring: a new card it got wrong. Green ring: right.</li>}
        </ul>

        <h4 className="ra-h">3. Test it on new cards</h4>
        <div className="rl-buttons ra-actions">
          {!tested && (
            <button type="button" className="btn" onClick={() => setTested(true)}>
              Test it on {TEST_CARDS.length} new cards
            </button>
          )}
          {tested && !grouped && (
            <button type="button" className="btn" onClick={() => setGrouped(true)}>
              Check each group separately
            </button>
          )}
        </div>

        {tested && (
          <div className="ra-scores">
            <p className="ra-overall">
              Overall: <b className="num">{scoreText(report.overall)}</b>
            </p>
            {grouped && (
              <ul className="ra-bars">
                {(['marker', 'pencil'] as Style[]).map((s) => {
                  const sc = report.byStyle[s];
                  const weak = percent(sc) < 80;
                  return (
                    <li key={s}>
                      <p className="ra-bar-head">
                        <b>{STYLE_NAME[s]}</b>
                        <span className="num">{scoreText(sc)}</span>
                      </p>
                      <div className="ra-track" aria-hidden="true">
                        <div className={weak ? 'ra-fill ra-fill-weak' : 'ra-fill'} style={{ width: `${percent(sc)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <p className="ra-say" aria-live="polite">{say}</p>

        {grouped && (
          <>
            <h4 className="ra-h">4. Try to fix it</h4>
            <p className="ra-note">Add more examples to the pile. Which kind do you think will help? Watch the pencil score.</p>
            <div className="rl-buttons ra-actions">
              <button
                type="button"
                className="btn quiet"
                disabled={marker + STEP > LIMIT.marker}
                onClick={() => {
                  setMarker((n) => Math.min(LIMIT.marker, n + STEP));
                  setLast('marker');
                }}
              >
                Add {STEP} marker stars and {STEP} marker hearts
              </button>
              <button
                type="button"
                className="btn quiet"
                disabled={pencil + STEP > LIMIT.pencil}
                onClick={() => {
                  setPencil((n) => Math.min(LIMIT.pencil, n + STEP));
                  setLast('pencil');
                }}
              >
                Add {STEP} pencil stars and {STEP} pencil hearts
              </button>
              <button type="button" className="btn quiet" onClick={reset}>
                Start over
              </button>
            </div>
          </>
        )}

        <p className="viz-cap">
          A toy with invented numbers. Real systems have thousands of examples and many measurements, but the pattern is the same: a group that is rare in the examples is often the group a system gets wrong.
        </p>
      </div>
    </Root>
  );
}
