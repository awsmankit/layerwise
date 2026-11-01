/**
 * The read-aloud controller. It knows nothing about the page: it is given a
 * `Plan` (src/lib/read-aloud.ts), a speech engine shaped like `speechSynthesis`
 * and a way to make utterances, so it can be tested with a stand-in engine.
 *
 * Design notes
 * - One utterance per chunk (a sentence, or part of a very long one), because
 *   Chrome silently stops long utterances.
 * - "Pause" cancels the engine and remembers the chunk, and "resume" speaks
 *   that chunk again. The engines' own pause() is unreliable (Android Chrome
 *   treats it as a cancel, some desktop voices ignore resume), so this behaves
 *   the same everywhere. The cost is that the current sentence restarts.
 * - Cancelling an utterance fires `end` or `error` depending on the browser.
 *   Every utterance carries a generation number, and events from a stale
 *   generation are ignored.
 */

import { chunkAtBlock, chunkBeforeBlock, type Plan } from './read-aloud';

export type PlayerState = 'idle' | 'playing' | 'paused';

export interface UtteranceLike {
  // `never` so a real SpeechSynthesisUtterance (whose handlers take an event) fits too
  onend: ((e: never) => void) | null;
  onerror: ((e: never) => void) | null;
}

export type PlayerHooks = {
  /** The paragraph being read changed (null when reading stops). */
  onBlock?: (block: number | null) => void;
  onState?: (state: PlayerState) => void;
};

export class ReadAloudPlayer<U extends UtteranceLike> {
  private chunk = 0;
  private gen = 0;
  private current: number | null = null;
  state: PlayerState = 'idle';

  constructor(
    private synth: { speak(u: U): void; cancel(): void },
    private make: (text: string) => U,
    private plan: Plan,
    private hooks: PlayerHooks = {},
  ) {}

  get block(): number | null {
    return this.current;
  }

  get blocks(): number {
    return this.plan.blocks;
  }

  /** Swap in a new plan (the page content changed). Stops first. */
  setPlan(plan: Plan) {
    this.stop();
    this.plan = plan;
  }

  /** Start from a paragraph (default: the first one with something to say). */
  play(fromBlock = 0) {
    const at = chunkAtBlock(this.plan, fromBlock);
    if (at < 0) return this.stop();
    this.speakFrom(at);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.gen++; // ignore the cancel event of the sentence in flight
    this.synth.cancel();
    this.setState('paused');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.speakFrom(this.chunk);
  }

  toggle() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
    else this.play(0);
  }

  stop() {
    this.gen++;
    if (this.state !== 'idle' || this.current !== null) this.synth.cancel();
    this.chunk = 0;
    this.setBlock(null);
    this.setState('idle');
  }

  next() {
    if (this.state === 'idle') return;
    const from = (this.current ?? -1) + 1;
    const at = chunkAtBlock(this.plan, from);
    if (at < 0) return this.stop();
    this.move(at);
  }

  prev() {
    if (this.state === 'idle') return;
    this.move(chunkBeforeBlock(this.plan, this.current ?? 0));
  }

  /** Re-speak the current sentence, for when speed or voice changed mid-read. */
  restartChunk() {
    if (this.state === 'playing') this.speakFrom(this.chunk);
  }

  private move(at: number) {
    if (this.state === 'paused') {
      // stay paused, but show where "resume" will start
      this.chunk = at;
      this.setBlock(this.plan.chunks[at].block);
    } else this.speakFrom(at);
  }

  private speakFrom(at: number) {
    this.gen++;
    this.synth.cancel();
    this.chunk = at;
    this.setState('playing');
    this.speakCurrent();
  }

  private speakCurrent() {
    const c = this.plan.chunks[this.chunk];
    if (!c) return this.stop();
    this.setBlock(c.block);
    const gen = this.gen;
    const u = this.make(c.text);
    const advance = () => {
      if (gen !== this.gen || this.state !== 'playing') return;
      this.chunk++;
      this.speakCurrent();
    };
    u.onend = advance;
    // a real error (not a cancel) ends the read rather than looping on a broken voice
    u.onerror = () => {
      if (gen !== this.gen) return;
      this.stop();
    };
    this.synth.speak(u);
  }

  private setBlock(b: number | null) {
    if (this.current === b) return;
    this.current = b;
    this.hooks.onBlock?.(b);
  }

  private setState(s: PlayerState) {
    if (this.state === s) return;
    this.state = s;
    this.hooks.onState?.(s);
  }
}
