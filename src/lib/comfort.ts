/**
 * Reading comfort settings: text size, line spacing, reading width, calm mode,
 * and the read-aloud speed and voice. Pure functions plus a small browser
 * layer. Everything lives in this browser's localStorage under one key, and
 * nothing is sent anywhere.
 *
 * The same attribute names are set before first paint by the inline script in
 * src/layouts/Base.astro, so that script and `comfortAttributes` must agree
 * (comfort.test.ts checks this).
 */

export const COMFORT_KEY = 'layerwise:comfort';
/** Fired on window whenever the settings change on this page. */
export const COMFORT_EVENT = 'layerwise:comfort';

export const TEXT_SIZES = [100, 115, 130] as const;
export const SPACINGS = ['normal', 'roomy'] as const;
export const WIDTHS = ['normal', 'narrow'] as const;
export const RATES = [0.8, 0.9, 1, 1.1, 1.25, 1.5] as const;

export type TextSize = (typeof TEXT_SIZES)[number];
export type Spacing = (typeof SPACINGS)[number];
export type Width = (typeof WIDTHS)[number];

export type Comfort = {
  text: TextSize;
  space: Spacing;
  width: Width;
  calm: boolean;
  /** Read-aloud speed, 0.8 to 1.5. */
  rate: number;
  /** voiceURI of the chosen read-aloud voice; empty means the device default. */
  voice: string;
};

export const DEFAULT_COMFORT: Comfort = { text: 100, space: 'normal', width: 'normal', calm: false, rate: 1, voice: '' };

/** The html attributes that carry each setting. A null value means "remove the attribute". */
export const ATTRS = {
  text: 'data-cm-text',
  space: 'data-cm-space',
  width: 'data-cm-width',
  calm: 'data-cm-calm',
} as const;

/** Snap a speed to the allowed range (0.8 to 1.5), to the nearest 0.05. */
export function clampRate(r: unknown): number {
  const n = typeof r === 'number' && isFinite(r) ? r : 1;
  return Math.round(Math.min(1.5, Math.max(0.8, n)) * 20) / 20;
}

/** Accepts anything read from storage and returns a complete, valid settings object. */
export function normaliseComfort(raw: unknown): Comfort {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    text: (TEXT_SIZES as readonly unknown[]).includes(o.text) ? (o.text as TextSize) : 100,
    space: o.space === 'roomy' ? 'roomy' : 'normal',
    width: o.width === 'narrow' ? 'narrow' : 'normal',
    calm: o.calm === true,
    rate: clampRate(o.rate),
    voice: typeof o.voice === 'string' ? o.voice.slice(0, 300) : '',
  };
}

export function isDefaultComfort(c: Comfort): boolean {
  return c.text === 100 && c.space === 'normal' && c.width === 'normal' && !c.calm;
}

/** What to put on the html element. Default values map to null so the page stays untouched. */
export function comfortAttributes(c: Comfort): Record<(typeof ATTRS)[keyof typeof ATTRS], string | null> {
  return {
    [ATTRS.text]: c.text === 100 ? null : String(c.text),
    [ATTRS.space]: c.space === 'roomy' ? 'roomy' : null,
    [ATTRS.width]: c.width === 'narrow' ? 'narrow' : null,
    [ATTRS.calm]: c.calm ? '1' : null,
  };
}

/* ---------- browser layer (safe when storage is blocked) ---------- */

export function readComfort(): Comfort {
  try {
    const raw = localStorage.getItem(COMFORT_KEY);
    return normaliseComfort(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_COMFORT };
  }
}

export function applyComfort(c: Comfort, root: Element = document.documentElement): void {
  const attrs = comfortAttributes(c);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null) root.removeAttribute(name);
    else root.setAttribute(name, value);
  }
}

/** Save, apply and announce a change. Returns the normalised settings. */
export function saveComfort(next: Partial<Comfort>): Comfort {
  const c = normaliseComfort({ ...readComfort(), ...next });
  try {
    // an all-default object is removed, so Reset leaves nothing behind
    if (isDefaultComfort(c) && c.rate === 1 && c.voice === '') localStorage.removeItem(COMFORT_KEY);
    else localStorage.setItem(COMFORT_KEY, JSON.stringify(c));
  } catch {
    /* storage blocked: the settings still apply to this page */
  }
  applyComfort(c);
  window.dispatchEvent(new CustomEvent(COMFORT_EVENT, { detail: c }));
  return c;
}

/** True when calm mode is on for this page. Safe on the server. */
export function isCalm(): boolean {
  return typeof document !== 'undefined' && document.documentElement.hasAttribute(ATTRS.calm);
}
