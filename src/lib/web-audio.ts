/** Small helpers around the Web Audio API. Nothing here runs until a component calls it in the browser. */

export type AudioContextClass = new (options?: AudioContextOptions) => AudioContext;

/** The AudioContext constructor, or null when the browser (or the server) has none. Older Safari used a prefix. */
export function audioContextClass(): AudioContextClass | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** True when the page may ask for the microphone (needs a secure page and the mediaDevices API). */
export function canUseMicrophone(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && (typeof window === 'undefined' || window.isSecureContext !== false);
}
