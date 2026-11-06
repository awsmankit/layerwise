/**
 * What if we sample sound too slowly? A tone of f Hz measured fs times a second.
 * If fs is not more than 2f, the samples fit a different, lower tone: the alias.
 * Every figure on the page comes from these functions.
 */

/** Half the sampling rate: the highest tone the samples can describe. */
export function nyquist(rateHz: number): number {
  return rateHz / 2;
}

/** True when the samples can describe the tone: the rate is more than twice the tone. */
export function isFaithful(toneHz: number, rateHz: number): boolean {
  return rateHz > 2 * toneHz;
}

/**
 * The tone the samples really describe, as a signed frequency in [-fs/2, fs/2].
 * Tones f and f - k*fs give identical samples. We pick the k that lands nearest zero.
 * A negative value means the rebuilt wave is upside down compared with a positive one of the same size.
 */
export function signedAlias(toneHz: number, rateHz: number): number {
  const k = Math.round(toneHz / rateHz);
  const a = toneHz - k * rateHz;
  return Object.is(a, -0) ? 0 : a;
}

/** The pitch you hear after rebuilding the wave from the samples. */
export function aliasHz(toneHz: number, rateHz: number): number {
  return Math.abs(signedAlias(toneHz, rateHz));
}

/** How many samples land in one wave of the tone. Below 2 the wave cannot be seen. */
export function samplesPerCycle(toneHz: number, rateHz: number): number {
  return rateHz / toneHz;
}

/** The sample values: one point every 1/fs seconds, for the given time window. */
export function sampleSine(toneHz: number, rateHz: number, windowMs: number): { t: number; y: number }[] {
  const n = Math.floor((windowMs / 1000) * rateHz + 1e-9) + 1;
  return Array.from({ length: n }, (_, i) => {
    const t = i / rateHz;
    return { t, y: Math.sin(2 * Math.PI * toneHz * t) };
  });
}

/** A smooth curve of a sine, for drawing. */
export function sinePoints(freqHz: number, windowMs: number, count: number): { t: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const t = ((windowMs / 1000) * i) / (count - 1);
    return { t, y: Math.sin(2 * Math.PI * freqHz * t) };
  });
}

/** Lowest sampling rate that keeps a tone: just above twice its pitch. */
export function minRate(toneHz: number): number {
  return 2 * toneHz;
}
