import { describe, expect, it } from 'vitest';
import { chartMax, config, demandAt, demandSeries, serversForPeak, simulateAuto, simulateFixed, summarise, wanted } from './no-autoscaling';

describe('no autoscaling what-if', () => {
  it('a day is 144 ten-minute ticks with a quiet floor of 12 requests per second and a peak of 77', () => {
    const d = demandSeries();
    expect(d).toHaveLength(144);
    expect(Math.min(...d)).toBe(12);
    expect(d[0]).toBe(12);
    expect(Math.max(...d)).toBe(77);
    expect(d.indexOf(77)).toBe(119); // the evening rush, about 19:50
    expect(demandAt(119)).toBe(77);
    expect(d.reduce((a, b) => a + b, 0) * 600).toBe(3118800);
  });
  it('Kubernetes rule: servers wanted = ceil(load / 7), never fewer than 1', () => {
    expect(wanted(12)).toBe(2);
    expect(wanted(14)).toBe(2);
    expect(wanted(15)).toBe(3);
    expect(wanted(77)).toBe(11);
    expect(wanted(0)).toBe(1);
  });
  it('fixed servers cost servers x 24 hours x $2.50, whatever the traffic', () => {
    expect(summarise(simulateFixed(6)).cost).toBeCloseTo(360, 8);
    expect(summarise(simulateFixed(8)).cost).toBeCloseTo(480, 8);
  });
  it('the day needs 8 fixed servers to turn nothing away, and then most paid capacity sits idle', () => {
    expect(serversForPeak()).toBe(8);
    const s = summarise(simulateFixed(8));
    expect(s.dropped).toBe(0);
    expect(s.utilisation).toBeCloseTo(3118800 / (8 * 10 * 86400), 9);
    expect(s.utilisation).toBeLessThan(0.46);
    expect(s.idleCost).toBeCloseTo(480 * (1 - s.utilisation), 6);
  });
  it('fewer fixed servers are cheaper but turn requests away at the peak', () => {
    const six = summarise(simulateFixed(6));
    const four = summarise(simulateFixed(4));
    expect(six.dropped).toBeGreaterThan(0);
    expect(four.dropped).toBeGreaterThan(six.dropped);
    expect(four.peakDropped).toBe(77 - 40);
    expect(six.peakDropped).toBe(77 - 60);
    expect(four.cost).toBeLessThan(six.cost);
  });
  it('dropped requests are exactly the load above the paid capacity', () => {
    for (const t of simulateFixed(5)) expect(t.dropped).toBe(Math.max(0, t.demand - 50));
  });
  it('autoscaling with no delay at all costs less than 8 fixed servers and turns away nothing', () => {
    const a = summarise(simulateAuto(0));
    expect(a.dropped).toBe(0);
    expect(a.cost).toBeLessThan(summarise(simulateFixed(8)).cost);
    expect(a.cost).toBeCloseTo(345, 6);
    expect(a.utilisation).toBeGreaterThan(summarise(simulateFixed(8)).utilisation + 0.15);
  });
  it('the start-up delay is what lets requests through: more delay, more turned away', () => {
    const drop = [0, 1, 2, 3].map((l) => summarise(simulateAuto(l)).droppedShare);
    expect(drop[0]).toBe(0);
    for (let i = 1; i < drop.length; i++) expect(drop[i]).toBeGreaterThanOrEqual(drop[i - 1]);
    expect(drop[3]).toBeGreaterThan(drop[1]);
  });
  it('servers are billed while they start, so the delay does not make autoscaling cheaper', () => {
    expect(summarise(simulateAuto(0)).cost).toBeCloseTo(summarise(simulateAuto(5)).cost, 8);
  });
  it('scale-down waits for the stabilisation window', () => {
    const run = simulateAuto(0);
    // billed servers never fall faster than the window allows: each tick keeps the max of the last 3 wanted values
    const want = demandSeries().map((_, t, d) => wanted(d[Math.max(0, t - config.metricLagTicks)]));
    for (let t = 2; t < run.length; t++) expect(run[t].billed).toBe(Math.max(want[t], want[t - 1], want[t - 2]));
  });
  it('ready servers never exceed the billed ones', () => {
    for (const l of [0, 2, 5]) for (const t of simulateAuto(l)) expect(t.ready).toBeLessThanOrEqual(t.billed);
  });
  it('chartMax rounds the peak up to a multiple of 20', () => {
    expect(chartMax([simulateFixed(4)])).toBe(80);
    expect(chartMax([simulateFixed(10)])).toBe(100);
  });
});
