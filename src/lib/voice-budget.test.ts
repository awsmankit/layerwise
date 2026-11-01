import { describe, expect, it } from 'vitest';
import { HUMAN_GAP, PRESETS, SEMANTIC, UTTERANCES, biggestStage, clauseMs, endpoint, endpointAll, timeline, timesHumanMean, verdict } from './voice-budget';

const preset = (id: string) => PRESETS.find((p) => p.id === id)!.cfg;

describe('clause time', () => {
  it('is tokens divided by speed', () => {
    expect(clauseMs(8, 80)).toBe(100);
    expect(clauseMs(20, 60)).toBeCloseTo(333.33, 1);
    expect(clauseMs(10, 0)).toBe(0);
  });
});

describe('cascade timeline', () => {
  it('adds the stages in order when nothing overlaps (naive preset)', () => {
    const t = timeline(preset('naive'));
    // 800 + 300 + 900 + 333.3 + 400 + 150
    expect(t.heardAt).toBeCloseTo(2883.3, 1);
    expect(t.rows.map((r) => r.id)).toEqual(['endpoint', 'asr', 'llm', 'clause', 'tts', 'net']);
    expect(t.speculativeLeadMs).toBe(0);
  });

  it('lets stages start where the previous one ended', () => {
    const t = timeline(preset('tuned'));
    const byId = Object.fromEntries(t.rows.map((r) => [r.id, r]));
    expect(byId.asr.start).toBe(400);
    expect(byId.llm.start).toBe(500);
    expect(byId.clause.start).toBe(850);
    expect(byId.tts.start).toBe(950);
    expect(byId.net.start).toBe(1100);
    expect(t.heardAt).toBe(1200);
  });

  it('speculative generation starts work at the speculative point but cannot speak before the turn is confirmed', () => {
    const t = timeline(preset('tuned-spec'));
    // work starts at 150: 150 + 100 + 350 + 100 + 150 = 850, then 100 of network
    expect(t.heardAt).toBe(950);
    expect(t.speculativeLeadMs).toBe(250);
  });

  it('holds the audio when speculative work finishes before the endpoint wait', () => {
    const cfg = { ...preset('tuned-spec'), endpointMs: 1200 };
    const t = timeline(cfg);
    expect(t.heardAt).toBe(1200 + 100);
    expect(t.rows.some((r) => r.id === 'hold')).toBe(true);
  });

  it('adds the phone line to the network row', () => {
    const t = timeline(preset('phone'));
    expect(t.heardAt).toBe(1320);
    expect(t.rows.at(-1)!.label).toBe('Network and phone line');
  });

  it('never goes negative or reorders when the endpoint wait is zero', () => {
    const t = timeline({ ...preset('tuned'), endpointMs: 0 });
    expect(t.heardAt).toBe(800);
  });
});

describe('speech-to-speech timeline', () => {
  it('is the wait, the model and the network', () => {
    const t = timeline(preset('s2s'));
    expect(t.heardAt).toBe(700);
    expect(t.rows.map((r) => r.id)).toEqual(['endpoint', 'model', 'net']);
  });
});

describe('biggest stage', () => {
  it('finds the language model wait in the naive cascade', () => {
    expect(biggestStage(timeline(preset('naive')).rows)!.id).toBe('llm');
  });
});

describe('comparison with people', () => {
  it('uses the figures from Stivers et al. (2009)', () => {
    expect(HUMAN_GAP.mean).toBe(208);
    expect(HUMAN_GAP.slowestLanguageMean).toBe(469);
  });
  it('classifies response times', () => {
    expect(verdict(300)).toBe('inside-range');
    expect(verdict(469)).toBe('inside-range');
    expect(verdict(470)).toBe('slower-than-all-means');
    expect(verdict(938)).toBe('slower-than-all-means');
    expect(verdict(939)).toBe('far-slower');
  });
  it('expresses a time as a multiple of the mean gap', () => {
    expect(timesHumanMean(208)).toBe(1);
    expect(timesHumanMean(1200)).toBe(5.8);
  });
});

describe('endpointing toy', () => {
  const find = (id: string) => UTTERANCES.find((u) => u.id === id)!;

  it('a short threshold cuts off a user who pauses inside a thought', () => {
    expect(endpoint(find('table'), 400, false).cutOff).toBe(true); // 450 ms pause after "four"
    expect(endpoint(find('table'), 500, false).cutOff).toBe(false);
  });

  it('a longer threshold avoids the cut-off but delays every answer by that much', () => {
    const o = endpoint(find('weather'), 1200, false);
    expect(o.cutOff).toBe(false);
    expect(o.addedDelayMs).toBe(1200);
  });

  it('counts cut-offs across the scripted set at three thresholds', () => {
    // pauses inside thoughts: 600 and 700 (phone number), 900 (hesitation), 450 (table), 1100 (order)
    expect(endpointAll(300, false).cutOffs).toBe(4);
    expect(endpointAll(800, false).cutOffs).toBe(2);
    expect(endpointAll(1000, false).cutOffs).toBe(1);
    expect(endpointAll(1200, false).cutOffs).toBe(0);
  });

  it('the toy meaning-aware detector avoids cut-offs and answers finished turns quickly', () => {
    const s = endpointAll(300, true);
    expect(s.cutOffs).toBe(0);
    expect(s.meanDelayMs).toBe(SEMANTIC.finishedWaitMs);
  });
});
