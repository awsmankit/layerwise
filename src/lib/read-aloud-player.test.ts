import { describe, expect, it } from 'vitest';
import { buildPlan } from './read-aloud';
import { ReadAloudPlayer, type UtteranceLike } from './read-aloud-player';

class U implements UtteranceLike {
  onend: ((e?: unknown) => void) | null = null;
  onerror: ((e?: unknown) => void) | null = null;
  constructor(public text: string) {}
}

function setup(texts = ['One. Two.', 'Three.', 'Four.']) {
  const spoken: U[] = [];
  let cancels = 0;
  const synth = { speak: (u: U) => void spoken.push(u), cancel: () => void cancels++ };
  const blocks: (number | null)[] = [];
  const states: string[] = [];
  const player = new ReadAloudPlayer(synth, (t) => new U(t), buildPlan(texts.map((text) => ({ text }))), {
    onBlock: (b) => blocks.push(b),
    onState: (s) => states.push(s),
  });
  const last = () => spoken[spoken.length - 1];
  return { player, spoken, blocks, states, last, cancels: () => cancels };
}

describe('ReadAloudPlayer', () => {
  it('speaks sentence by sentence and moves through paragraphs', () => {
    const { player, spoken, blocks, last } = setup();
    player.play();
    expect(spoken.map((u) => u.text)).toEqual(['One.']);
    last().onend!();
    last().onend!();
    last().onend!();
    expect(spoken.map((u) => u.text)).toEqual(['One.', 'Two.', 'Three.', 'Four.']);
    expect(blocks).toEqual([0, 1, 2]);
    last().onend!();
    expect(player.state).toBe('idle');
    expect(blocks.at(-1)).toBeNull();
  });

  it('pauses by cancelling, and resumes the same sentence', () => {
    const { player, spoken, last, states } = setup();
    player.play();
    last().onend!();
    player.pause();
    expect(player.state).toBe('paused');
    const stale = spoken[1];
    stale.onend!(); // the cancel event of the sentence in flight must be ignored
    expect(spoken).toHaveLength(2);
    player.resume();
    expect(spoken.map((u) => u.text)).toEqual(['One.', 'Two.', 'Two.']);
    expect(states).toEqual(['playing', 'paused', 'playing']);
  });

  it('next and previous jump by paragraph', () => {
    const { player, spoken, last } = setup();
    player.play();
    player.next();
    expect(last().text).toBe('Three.');
    player.next();
    expect(last().text).toBe('Four.');
    player.prev();
    expect(last().text).toBe('Three.');
    player.prev();
    player.prev();
    expect(last().text).toBe('One.');
    expect(spoken.length).toBeGreaterThan(4);
  });

  it('next at the last paragraph stops', () => {
    const { player } = setup();
    player.play(2);
    player.next();
    expect(player.state).toBe('idle');
  });

  it('stop cancels and ignores late events', () => {
    const { player, spoken, last, cancels } = setup();
    player.play();
    const u = last();
    player.stop();
    expect(cancels()).toBeGreaterThan(0);
    u.onend!();
    expect(spoken).toHaveLength(1);
    expect(player.state).toBe('idle');
  });

  it('stays paused when moving while paused', () => {
    const { player, spoken, last } = setup();
    player.play();
    player.pause();
    player.next();
    expect(player.state).toBe('paused');
    expect(player.block).toBe(1);
    expect(spoken).toHaveLength(1);
    player.resume();
    expect(last().text).toBe('Three.');
  });

  it('an engine error ends the read', () => {
    const { player, last } = setup();
    player.play();
    last().onerror!();
    expect(player.state).toBe('idle');
  });

  it('does nothing for a plan with nothing to say', () => {
    const { player, spoken } = setup(['', '']);
    player.play();
    expect(spoken).toHaveLength(0);
    expect(player.state).toBe('idle');
  });

  it('restartChunk re-speaks the current sentence only while playing', () => {
    const { player, spoken } = setup();
    player.play();
    player.restartChunk();
    expect(spoken.map((u) => u.text)).toEqual(['One.', 'One.']);
    player.pause();
    player.restartChunk();
    expect(spoken).toHaveLength(2);
  });
});
