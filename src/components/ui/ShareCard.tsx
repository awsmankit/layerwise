import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cardForDay, dayIndexFromIso, dayIndexOf, fitText, isoOf, type Card, type CardKind, type Pools } from '../../lib/daily-card';
import { withBase } from '../../lib/url';

const ACCENT: Record<CardKind, string> = { guess: '#FFC233', term: '#2ED3C0', whatif: '#FF8FB8', remember: '#C5E84A', interview: '#98A0F8' };
const NAVY = '#120f3d';
const DISPLAY = '"Bricolage Grotesque Variable", "Helvetica Neue", Arial, sans-serif';
const BODY = '"Source Serif 4 Variable", Georgia, serif';

type Format = '4x5' | '1x1';
const SIZE: Record<Format, [number, number]> = { '4x5': [1080, 1350], '1x1': [1080, 1080] };

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw one card. Pure drawing: the same card and size always give the same picture. */
function draw(ctx: CanvasRenderingContext2D, card: Card, format: Format, siteHost: string) {
  const [W, H] = SIZE[format];
  const M = 84;
  const accent = ACCENT[card.kind];
  const measure = (font: string) => (line: string, size: number) => {
    ctx.font = font.replace('{s}', String(size));
    return ctx.measureText(line).width;
  };

  // background
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, NAVY);
  g.addColorStop(1, '#241a63');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(W - 90, 120, 280, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(60, H - 60, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // brand
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const [x1, x2, y] of [[M, M + 56, 98], [M + 8, M + 48, 118], [M + 18, M + 38, 138]] as const) {
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(M + 28, 118, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `700 38px ${DISPLAY}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Layerwise', M + 78, 128);

  // label chip
  ctx.font = `700 30px ${DISPLAY}`;
  const label = card.label.toUpperCase();
  const lw = ctx.measureText(label).width + 48;
  ctx.fillStyle = accent;
  roundRect(ctx, W - M - lw, 84, lw, 60, 30);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.fillText(label, W - M - lw + 24, 126);

  // main text area
  const top = 230;
  const bottom = H - 230;
  const hasOptions = card.options.length > 0;
  const hasBody = card.body.length > 0;
  const titleBox = hasOptions ? (bottom - top) * 0.42 : hasBody ? (bottom - top) * 0.45 : bottom - top;
  const titleFont = card.kind === 'term' ? `800 {s}px ${DISPLAY}` : `700 {s}px ${DISPLAY}`;
  const t = fitText(card.title, W - 2 * M, titleBox, { max: card.kind === 'term' ? 130 : 72, min: 36, step: 2, lineHeight: 1.18 }, measure(titleFont));
  ctx.fillStyle = '#fff';
  ctx.font = titleFont.replace('{s}', String(t.size));
  let y = top + t.size;
  for (const line of t.lines) {
    ctx.fillText(line, M, y);
    y += t.lineHeight;
  }
  y += 16;

  if (hasBody) {
    const bodyFont = `400 {s}px ${BODY}`;
    const b = fitText(card.body, W - 2 * M, bottom - y, { max: 44, min: 28, step: 2, lineHeight: 1.35 }, measure(bodyFont));
    ctx.fillStyle = '#e7e4ff';
    ctx.font = bodyFont.replace('{s}', String(b.size));
    y += b.size;
    for (const line of b.lines) {
      ctx.fillText(line, M, y);
      y += b.lineHeight;
    }
  }

  if (hasOptions) {
    const rowH = Math.min(120, (bottom - y - 20) / card.options.length - 14);
    const optFont = `600 {s}px ${DISPLAY}`;
    card.options.forEach((o, i) => {
      const oy = y + 10 + i * (rowH + 14);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      roundRect(ctx, M, oy, W - 2 * M, rowH, 22);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.stroke();
      const f = fitText(o.slice(3), W - 2 * M - 120, rowH - 24, { max: 36, min: 24, step: 2, lineHeight: 1.2 }, measure(optFont));
      ctx.fillStyle = accent;
      ctx.font = `800 44px ${DISPLAY}`;
      ctx.fillText(o[0], M + 28, oy + rowH / 2 + 15);
      ctx.fillStyle = '#fff';
      ctx.font = optFont.replace('{s}', String(f.size));
      const blockH = f.lines.length * f.lineHeight;
      let ly = oy + (rowH - blockH) / 2 + f.size * 0.9;
      for (const line of f.lines) {
        ctx.fillText(line, M + 96, ly);
        ly += f.lineHeight;
      }
    });
  }

  // footer
  ctx.fillStyle = '#bdb8f0';
  ctx.font = `600 30px ${DISPLAY}`;
  const foot = fitText(card.footer, W - 2 * M, 40, { max: 30, min: 22, step: 2, lineHeight: 1.2 }, measure(`600 {s}px ${DISPLAY}`));
  ctx.font = `600 ${foot.size}px ${DISPLAY}`;
  ctx.fillText(foot.lines[0] ?? '', M, H - 150);
  ctx.fillStyle = accent;
  roundRect(ctx, M, H - 126, W - 2 * M, 72, 36);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.font = `700 34px ${DISPLAY}`;
  const urlText = siteHost;
  const uw = ctx.measureText(urlText).width;
  ctx.fillText(urlText, (W - uw) / 2, H - 78);
}

function pretty(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function ShareCard({ siteUrl, buildDay }: { siteUrl: string; buildDay: number }) {
  const [pools, setPools] = useState<Pools | null>(null);
  const [failed, setFailed] = useState(false);
  const [day, setDay] = useState(buildDay);
  const [format, setFormat] = useState<Format>('4x5');
  const [note, setNote] = useState('');
  const [canShare, setCanShare] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  // the real "today" is on the visitor's clock, so it is set after the page loads
  useEffect(() => {
    const n = new Date();
    setDay(dayIndexOf(n.getFullYear(), n.getMonth() + 1, n.getDate()));
    fetch(withBase('/share-data.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p: Pools) => setPools(p))
      .catch(() => setFailed(true));
  }, []);

  const card = useMemo(() => (pools ? cardForDay(day, pools, siteUrl) : null), [pools, day, siteUrl]);
  const host = siteUrl.replace(/^https?:\/\//, '') + '/';

  const render = useCallback(async () => {
    const c = canvas.current;
    if (!c || !card) return;
    try {
      await Promise.all([document.fonts.load(`700 40px ${DISPLAY}`), document.fonts.load(`800 40px ${DISPLAY}`), document.fonts.load(`400 40px ${BODY}`)]);
    } catch {
      /* fall back to the system fonts */
    }
    const [W, H] = SIZE[format];
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (ctx) draw(ctx, card, format, host);
  }, [card, format, host]);

  useEffect(() => {
    void render();
  }, [render]);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && typeof File === 'function');
  }, []);

  const toBlob = () => new Promise<Blob | null>((res) => canvas.current?.toBlob((b) => res(b), 'image/png'));
  const fileName = `layerwise-${isoOf(day)}-${format}.png`;

  const download = async () => {
    const blob = await toBlob();
    if (!blob) return setNote('Could not make the picture. Try again.');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setNote('Picture saved. On a phone, press and hold the picture above if it does not download.');
  };

  const share = async () => {
    const blob = await toBlob();
    if (!blob || !card) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: card.caption });
      else setNote('Your browser cannot share pictures from here. Use Download instead.');
    } catch {
      /* the person closed the share sheet */
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNote(`${what} copied.`);
    } catch {
      setNote('Could not copy. Select the text below and copy it by hand.');
    }
  };

  const iso = isoOf(day);
  const shift = (n: number) => setDay((d) => d + n);

  if (failed) return <p>The card could not load. Check your connection and reload.</p>;

  return (
    <div className="sh">
      <div className="sh-bar">
        <div className="sh-days" role="group" aria-label="Choose a day">
          <button type="button" className="btn quiet" onClick={() => shift(-1)}>
            Day before
          </button>
          <button
            type="button"
            className="btn quiet"
            onClick={() => {
              const n = new Date();
              setDay(dayIndexOf(n.getFullYear(), n.getMonth() + 1, n.getDate()));
            }}
          >
            Today
          </button>
          <button type="button" className="btn quiet" onClick={() => shift(1)}>
            Day after
          </button>
          <label className="sh-date">
            <span className="sr-only">Pick a date</span>
            <input type="date" value={iso} onChange={(e) => e.target.value && setDay(dayIndexFromIso(e.target.value))} />
          </label>
        </div>
        <div className="sh-format" role="group" aria-label="Picture shape">
          <button type="button" className={format === '4x5' ? 'is-on' : ''} aria-pressed={format === '4x5'} onClick={() => setFormat('4x5')}>
            Portrait 4:5
          </button>
          <button type="button" className={format === '1x1' ? 'is-on' : ''} aria-pressed={format === '1x1'} onClick={() => setFormat('1x1')}>
            Square 1:1
          </button>
        </div>
      </div>

      <p className="sh-date-line">{pretty(iso)}</p>

      <div className="sh-stage">
        <canvas ref={canvas} className="sh-canvas" role="img" aria-label={card?.alt ?? 'The daily card is loading'} />
        {!card && !failed && <p className="sh-loading">Loading today’s card…</p>}
      </div>

      {card && (
        <>
          <div className="sh-actions">
            <button type="button" className="btn" onClick={download}>
              Download picture
            </button>
            {canShare && (
              <button type="button" className="btn" onClick={share}>
                Share
              </button>
            )}
            <button type="button" className="btn quiet" onClick={() => copy(card.caption, 'Caption')}>
              Copy caption
            </button>
            {card.firstComment && (
              <button type="button" className="btn quiet" onClick={() => copy(card.firstComment, 'First comment')}>
                Copy first comment
              </button>
            )}
            <button type="button" className="btn quiet" onClick={() => copy(card.alt, 'Picture description')}>
              Copy picture description
            </button>
          </div>
          <p className="sh-note" role="status" aria-live="polite">
            {note}
          </p>

          <div className="sh-text">
            <h2>Caption</h2>
            <pre className="sh-pre">{card.caption}</pre>
            {card.firstComment && (
              <>
                <h2>First comment (the answer)</h2>
                <pre className="sh-pre">{card.firstComment}</pre>
              </>
            )}
            <h2>Picture description</h2>
            <p>{card.alt}</p>
          </div>
        </>
      )}
    </div>
  );
}
