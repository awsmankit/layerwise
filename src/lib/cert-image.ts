/**
 * Turns the certificate SVG into a PNG, entirely in the browser. An SVG drawn as an image
 * cannot load anything from outside itself, so the site's web fonts are fetched and
 * embedded in it as data URLs first; without them the PNG would fall back to system fonts.
 */
import bricolageLatin from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url';
import bricolageExt from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-ext-wght-normal.woff2?url';
import serifLatin from '@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2?url';
import serifExt from '@fontsource-variable/source-serif-4/files/source-serif-4-latin-ext-wght-normal.woff2?url';
import serifItalicLatin from '@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-italic.woff2?url';
import serifItalicExt from '@fontsource-variable/source-serif-4/files/source-serif-4-latin-ext-wght-italic.woff2?url';
import monoLatin from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url';

// the same unicode ranges fontsource uses, so each file covers only its own characters
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

const FACES = [
  { family: 'Bricolage Grotesque Variable', style: 'normal', weight: '200 800', url: bricolageLatin, range: LATIN },
  { family: 'Bricolage Grotesque Variable', style: 'normal', weight: '200 800', url: bricolageExt, range: EXT },
  { family: 'Source Serif 4 Variable', style: 'normal', weight: '200 900', url: serifLatin, range: LATIN },
  { family: 'Source Serif 4 Variable', style: 'normal', weight: '200 900', url: serifExt, range: EXT },
  { family: 'Source Serif 4 Variable', style: 'italic', weight: '200 900', url: serifItalicLatin, range: LATIN },
  { family: 'Source Serif 4 Variable', style: 'italic', weight: '200 900', url: serifItalicExt, range: EXT },
  { family: 'JetBrains Mono Variable', style: 'normal', weight: '100 800', url: monoLatin, range: LATIN },
];

async function dataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font ${url}: ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^;,]*/, 'data:font/woff2'));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

let fontCss: Promise<string> | null = null;

/** @font-face rules with every font inlined. Fetched once per page; a failure is retried next time. */
export function embeddedFontCss(): Promise<string> {
  fontCss ??= Promise.all(
    FACES.map(async (f) => `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};src:url(${await dataUrl(f.url)}) format('woff2');unicode-range:${f.range};}`),
  ).then(
    (rules) => rules.join('\n'),
    (e) => {
      fontCss = null;
      throw e;
    },
  );
  return fontCss;
}

/** The SVG as a standalone file, fonts included, at the given pixel size. */
export async function standaloneSvg(svg: SVGSVGElement, width: number, height: number): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.removeAttribute('class');
  clone.removeAttribute('style');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = await embeddedFontCss();
  clone.insertBefore(style, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'sync';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('the certificate image could not be drawn'));
    img.src = src;
  });
}

/** Draws the certificate at `scale` times its own size and returns a PNG. */
export async function certificatePng(svg: SVGSVGElement, scale = 2): Promise<Blob> {
  const vb = svg.viewBox.baseVal;
  const w = Math.round(vb.width * scale);
  const h = Math.round(vb.height * scale);
  const text = await standaloneSvg(svg, w, h);
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await loadImage(url);
    await img.decode?.().catch(() => undefined);
    // give the embedded fonts a moment: some browsers fire load before an SVG image's fonts are ready
    await new Promise((r) => setTimeout(r, 120));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas is not available');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Saves a blob under a file name, through a temporary link. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
