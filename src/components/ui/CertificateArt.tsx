import { forwardRef, useEffect, useState } from 'react';
import { swatch } from '../../lib/palette';
import { wrapText } from '../../lib/certificate';

/**
 * The certificate itself, drawn as one SVG at A4 landscape proportions. The same SVG is
 * shown on screen (scaled to fit any width), printed, and drawn onto a canvas for the PNG,
 * so all three look the same. SVG text does not wrap, so lines are measured with a canvas
 * using the site's web fonts and wrapped here.
 */

export const CERT_W = 1600;
export const CERT_H = 1131;

const DISPLAY = "'Bricolage Grotesque Variable', 'Helvetica Neue', Arial, sans-serif";
const SERIF = "'Source Serif 4 Variable', Georgia, 'Times New Roman', serif";
const MONO = "'JetBrains Mono Variable', ui-monospace, Menlo, monospace";

/** The certificate is always on paper, whatever the site theme. */
const PAPER = '#FFFDF6';
const INK = '#15123D';
const INK2 = '#403C6B';
const INK3 = '#66628D';

export type CertificateData = {
  name: string;
  pathTitle: string;
  pathShort: string;
  promise: string;
  color: string;
  on: string;
  lessons: number;
  date: string;
  /** Whole percent, or null when no quiz in the path was taken. */
  quiz: number | null;
  site: string;
};

type Measure = (text: string, font: string) => number;

const FONTS_TO_LOAD = [`800 100px ${DISPLAY}`, `700 30px ${DISPLAY}`, `italic 600 80px ${SERIF}`, `italic 400 30px ${SERIF}`, `400 25px ${SERIF}`, `500 16px ${MONO}`];

/**
 * A text measurer backed by a canvas. It re-renders once the web fonts have loaded, so
 * the wrapping matches the fonts the certificate is drawn in.
 */
export function useMeasure(): Measure {
  const [ready, setReady] = useState(0);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    setCtx(document.createElement('canvas').getContext('2d'));
    let live = true;
    Promise.all(FONTS_TO_LOAD.map((f) => document.fonts?.load(f)))
      .catch(() => undefined)
      .then(() => document.fonts?.ready)
      .then(() => live && setReady((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);
  return (text: string, font: string) => {
    void ready;
    if (!ctx) return text.length * (parseFloat(font.match(/(\d+)px/)?.[1] ?? '20') * 0.55);
    ctx.font = font;
    return ctx.measureText(text).width;
  };
}

/** A rosette: a star with many shallow points, for the seal. */
function rosette(cx: number, cy: number, outer: number, inner: number, points: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** A hand-drawn-looking wave under a word, like the site's squiggle underlines. */
function squiggle(x: number, y: number, w: number): string {
  const step = 34;
  const n = Math.max(2, Math.round(w / step));
  const s = w / n;
  let d = `M${x},${y}`;
  for (let i = 0; i < n; i++) d += ` q${s / 4},${i % 2 ? 9 : -9} ${s / 2},0 t${s / 2},0`;
  return d;
}

const PANEL_X = 40;
const PANEL_W = 420;
const PANEL_CX = PANEL_X + PANEL_W / 2;
const LEFT = 540;
const RIGHT = 1500;
const TEXT_W = RIGHT - LEFT;

const CertificateArt = forwardRef<SVGSVGElement, CertificateData & { measure: Measure; className?: string }>(function CertificateArt(d, ref) {
  const { measure } = d;
  const stripe = Object.values(swatch);
  const confetti = (Object.values(swatch) as string[]).filter((c) => c.toLowerCase() !== d.color.toLowerCase());

  // name: as large as fits, down to a floor; past that the glyphs are squeezed to fit
  const name = d.name.trim();
  const nameFont = (px: number) => `italic 600 ${px}px ${SERIF}`;
  let namePx = 80;
  while (namePx > 40 && name && measure(name, nameFont(namePx)) > TEXT_W) namePx -= 2;
  const nameTooWide = !!name && measure(name, nameFont(namePx)) > TEXT_W;

  // path title in a pill
  const titleFont = (px: number) => `800 ${px}px ${DISPLAY}`;
  let titlePx = 44;
  while (titlePx > 26 && measure(d.pathTitle, titleFont(titlePx)) > TEXT_W - 72) titlePx -= 2;
  const pillW = Math.min(TEXT_W, measure(d.pathTitle, titleFont(titlePx)) + 64);

  // what the path covered: at most three lines
  let promisePx = 25;
  let promiseLines = wrapText(d.promise, TEXT_W, (s) => measure(s, `400 ${promisePx}px ${SERIF}`));
  while (promiseLines.length > 3 && promisePx > 19) {
    promisePx -= 1;
    promiseLines = wrapText(d.promise, TEXT_W, (s) => measure(s, `400 ${promisePx}px ${SERIF}`));
  }
  const promiseLh = Math.round(promisePx * 1.42);

  const shortLines = wrapText(d.pathShort, PANEL_W - 90, (s) => measure(s, `700 30px ${DISPLAY}`));
  const smallPrint = wrapText('Completed on Layerwise in this browser. Progress is self-reported and this is not an accredited qualification.', 640, (s) => measure(s, `400 18px ${SERIF}`));

  const ofW = measure('of completion', titleFont(100));
  const ofX = LEFT + measure('of ', titleFont(100));

  const promiseTop = 806;
  const statsTop = promiseTop + (promiseLines.length - 1) * promiseLh + 38;
  const stats = [
    { label: 'Lessons', value: String(d.lessons) },
    { label: 'Completed', value: d.date },
    ...(d.quiz !== null ? [{ label: 'Average quiz score', value: `${d.quiz}%` }] : []),
  ];
  // the date needs the most room and the lesson count the least
  const shares = stats.length === 3 ? [0.2, 0.42, 0.38] : [0.3, 0.7];
  const colX = shares.map((_, i) => LEFT + shares.slice(0, i).reduce((a, b) => a + b, 0) * TEXT_W);
  const valuePx = stats.map((st, i) => {
    let px = 36;
    while (px > 24 && measure(st.value, `700 ${px}px ${DISPLAY}`) > shares[i] * TEXT_W - 48) px -= 2;
    return px;
  });

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${CERT_W} ${CERT_H}`}
      width={CERT_W}
      height={CERT_H}
      className={d.className}
      role="img"
      aria-label={`Layerwise certificate of completion: ${name || 'your name'} completed the learning path “${d.pathTitle}”, ${d.lessons} lessons, on ${d.date}.`}
    >
      <defs>
        <clipPath id="cert-frame">
          <rect x="40" y="40" width={CERT_W - 80} height={CERT_H - 80} rx="30" />
        </clipPath>
        <path id="cert-ring" d={`M${PANEL_CX},${560 - 121} a121,121 0 1,1 -0.01,0`} />
      </defs>

      {/* hard shadow and paper, like the site's cards */}
      <rect x="50" y="50" width={CERT_W - 80} height={CERT_H - 80} rx="30" fill={INK} />
      <rect width={CERT_W} height={CERT_H} fill="none" />
      <rect x="40" y="40" width={CERT_W - 80} height={CERT_H - 80} rx="30" fill={PAPER} />

      <g clipPath="url(#cert-frame)">
        {/* the path's colour panel */}
        <rect x={PANEL_X} y="40" width={PANEL_W} height={CERT_H - 80} fill={d.color} />
        {/* a stripe of every track colour, as along the site footer */}
        {stripe.map((c, i) => (
          <rect key={c} x={40 + (i * (CERT_W - 80)) / stripe.length} y={CERT_H - 58} width={(CERT_W - 80) / stripe.length + 1} height="18" fill={c} />
        ))}
        <line x1="40" x2={CERT_W - 40} y1={CERT_H - 58} y2={CERT_H - 58} stroke={INK} strokeWidth="3" />
        <line x1={PANEL_X + PANEL_W} x2={PANEL_X + PANEL_W} y1="40" y2={CERT_H - 58} stroke={INK} strokeWidth="3" />

        {/* confetti */}
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
          <circle cx="92" cy="268" r="15" fill={confetti[3]} />
          <path d="M392 222 l26 44 h-52 z" fill={confetti[1]} />
          <rect x="370" y="356" width="30" height="30" rx="5" transform="rotate(18 385 371)" fill={confetti[8]} />
          <path d="M84 404 q14 -18 28 0 t28 0 t28 0" fill="none" stroke={INK} strokeWidth="5" />
          <circle cx="110" cy="955" r="11" fill={confetti[5]} />
          <path d="M366 930 l10 22 l24 3 l-18 16 l5 24 l-21 -12 l-21 12 l5 -24 l-18 -16 l24 -3 z" fill={confetti[10]} />
          <path d="M298 1004 q14 -18 28 0 t28 0 t28 0" fill="none" stroke={INK} strokeWidth="5" />
        </g>
      </g>

      {/* frame on top of the clipped panel */}
      <rect x="40" y="40" width={CERT_W - 80} height={CERT_H - 80} rx="30" fill="none" stroke={INK} strokeWidth="4" />

      {/* brand */}
      <g transform="translate(84 92) scale(2.3)" fill="none" stroke={d.on} strokeWidth="1.8" strokeLinecap="round">
        <path d="M2 5h18M4 11h14M7 17h8" />
        <circle cx="11" cy="11" r="2.4" fill={d.on} stroke="none" />
      </g>
      <text x="146" y="134" fontFamily={DISPLAY} fontWeight="800" fontSize="44" fill={d.on}>
        Layerwise
      </text>

      {/* seal */}
      <path d={rosette(PANEL_CX + 8, 568, 150, 137, 30)} fill={INK} />
      <path d={rosette(PANEL_CX, 560, 150, 137, 30)} fill={PAPER} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx={PANEL_CX} cy="560" r="104" fill="none" stroke={INK} strokeWidth="2" />
      <text fontFamily={MONO} fontWeight="600" fontSize="17" fill={INK} letterSpacing="3">
        <textPath href="#cert-ring" textLength="740" lengthAdjust="spacing">
          PATH COMPLETE • LAYERWISE • PATH COMPLETE • LAYERWISE •
        </textPath>
      </text>
      <circle cx={PANEL_CX} cy="560" r="80" fill={d.color} stroke={INK} strokeWidth="3" />
      <path d={`M${PANEL_CX - 36} 562 l24 25 l48 -52`} fill="none" stroke={d.on} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />

      {/* what the path is, under the seal */}
      {shortLines.map((l, i) => (
        <text key={i} x={PANEL_CX} y={790 + i * 38} textAnchor="middle" fontFamily={DISPLAY} fontWeight="700" fontSize="30" fill={d.on}>
          {l}
        </text>
      ))}

      {/* right side: the words */}
      <text x={LEFT} y="128" fontFamily={MONO} fontWeight="500" fontSize="17" letterSpacing="3" fill={INK3}>
        HOW AI SYSTEMS WORK, ONE LAYER AT A TIME
      </text>
      <text x={LEFT - 4} y="236" fontFamily={DISPLAY} fontWeight="800" fontSize="100" letterSpacing="-2" fill={INK}>
        Certificate
      </text>
      <text x={LEFT - 4} y="336" fontFamily={DISPLAY} fontWeight="800" fontSize="100" letterSpacing="-2" fill={INK}>
        of completion
      </text>
      <path d={squiggle(ofX, 366, LEFT + ofW - ofX - 10)} fill="none" stroke={INK} strokeWidth="15" strokeLinecap="round" />
      <path d={squiggle(ofX, 366, LEFT + ofW - ofX - 10)} fill="none" stroke={d.color} strokeWidth="8" strokeLinecap="round" />

      <text x={LEFT} y="434" fontFamily={SERIF} fontStyle="italic" fontSize="30" fill={INK2}>
        This certifies that
      </text>
      <text
        x={LEFT}
        y="520"
        fontFamily={SERIF}
        fontStyle="italic"
        fontWeight="600"
        fontSize={namePx}
        fill={name ? INK : INK3}
        opacity={name ? 1 : 0.45}
        {...(nameTooWide ? { textLength: TEXT_W, lengthAdjust: 'spacingAndGlyphs' } : {})}
      >
        {name || 'Your name'}
      </text>
      <line x1={LEFT} x2={RIGHT} y1="550" y2="550" stroke={INK} strokeWidth="2" />
      <text x={LEFT} y="606" fontFamily={SERIF} fontSize="30" fill={INK2}>
        has completed every lesson of the learning path
      </text>

      <rect x={LEFT + 6} y="638" width={pillW} height="74" rx="37" fill={INK} />
      <rect x={LEFT} y="632" width={pillW} height="74" rx="37" fill={d.color} stroke={INK} strokeWidth="3" />
      <text x={LEFT + pillW / 2} y={669 + titlePx * 0.35} textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize={titlePx} fill={d.on}>
        {d.pathTitle}
      </text>

      <text x={LEFT} y="768" fontFamily={MONO} fontWeight="600" fontSize="16" letterSpacing="3" fill={INK3}>
        WHAT IT COVERED
      </text>
      {promiseLines.map((l, i) => (
        <text key={i} x={LEFT} y={promiseTop + i * promiseLh} fontFamily={SERIF} fontSize={promisePx} fill={INK2}>
          {l}
        </text>
      ))}

      {/* facts */}
      <line x1={LEFT} x2={RIGHT} y1={statsTop} y2={statsTop} stroke={INK} strokeWidth="2" />
      {stats.map((st, i) => (
        <g key={st.label}>
          {i > 0 && <line x1={colX[i]} x2={colX[i]} y1={statsTop} y2={statsTop + 86} stroke={INK} strokeWidth="1.5" />}
          <text x={colX[i] + (i ? 24 : 0)} y={statsTop + 32} fontFamily={MONO} fontWeight="600" fontSize="15" letterSpacing="2.5" fill={INK3}>
            {st.label.toUpperCase()}
          </text>
          <text x={colX[i] + (i ? 24 : 0)} y={statsTop + 72} fontFamily={DISPLAY} fontWeight="700" fontSize={valuePx[i]} fill={INK}>
            {st.value}
          </text>
        </g>
      ))}

      {/* small print */}
      {smallPrint.map((l, i) => (
        <text key={i} x={LEFT} y={CERT_H - 85 + (i - smallPrint.length + 1) * 25} fontFamily={SERIF} fontSize="18" fill={INK3}>
          {l}
        </text>
      ))}
      <text x={RIGHT} y={CERT_H - 85} textAnchor="end" fontFamily={MONO} fontWeight="500" fontSize="16" fill={INK3}>
        {d.site}
      </text>
    </svg>
  );
});

export default CertificateArt;
