import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { aliasHz, isFaithful, minRate, sampleSine, samplesPerCycle, signedAlias, sinePoints } from '../../lib/whatif/sampling-rate';

const W = 340;
const WINDOW_MS = 8;
const MID = 92;
const AMP = 52;
const AXIS_MAX = 1600;
const PAD = 8;

const pathOf = (pts: { t: number; y: number }[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${((p.t / (WINDOW_MS / 1000)) * W).toFixed(1)} ${(MID - p.y * AMP).toFixed(1)}`).join('');

const q = (v: number) => Math.round(v * 10) / 10;
const axisX = (hz: number) => PAD + (Math.min(hz, AXIS_MAX) / AXIS_MAX) * (W - 2 * PAD);

/**
 * A sine wave and the dots a microphone would keep of it. The dots are all the computer has.
 * Below twice the pitch, a slower wave fits every dot just as well, and that is the one it rebuilds.
 */
export default function SamplingRateWhatIf() {
  const [tone, setTone] = useState(1000);
  const [rate, setRate] = useState(8000);
  const [playing, setPlaying] = useState(false);

  const faithful = isFaithful(tone, rate);
  const alias = aliasHz(tone, rate);
  const signed = signedAlias(tone, rate);

  const real = useMemo(() => pathOf(sinePoints(tone, WINDOW_MS, 320)), [tone]);
  const rebuilt = useMemo(() => pathOf(sinePoints(signed, WINDOW_MS, 320)), [signed]);
  const dots = useMemo(() => sampleSine(tone, rate, WINDOW_MS), [tone, rate]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTone((t) => {
        if (t >= 1500) {
          setPlaying(false);
          return t;
        }
        return t + 50;
      });
    }, 130);
    return () => clearInterval(id);
  }, [playing]);

  const play = () => {
    setRate(1600);
    setTone(100);
    setPlaying(true);
  };

  const color = faithful ? '#1f9d6b' : '#d6453d';
  const nyq = rate / 2;
  const nyqOnAxis = nyq <= AXIS_MAX;
  const anchorFor = (x: number) => (x < 90 ? 'start' : x > W - 90 ? 'end' : 'middle');
  const px = axisX(tone);
  const ax = axisX(alias);
  const r = dots.length > 40 ? 2.4 : 3.4;

  return (
    <WhatIfFrame
      title="A tone, and the dots the computer keeps of it"
      withLabel="Enough samples"
      withoutLabel="Too few samples"
      on={faithful}
      onChange={(v) => {
        setPlaying(false);
        if (v) setRate(Math.min(8000, Math.max(2 * tone + 100, Math.round((tone * 8) / 100) * 100)));
        else setRate(Math.max(400, Math.round((tone * 1.3) / 100) * 100));
      }}
      verdict={
        faithful ? (
          <>
            A {fmt.int(tone)} Hz tone sampled {fmt.int(rate)} times a second gives {samplesPerCycle(tone, rate).toFixed(1)} dots per wave. The rebuilt tone is {fmt.int(alias)} Hz: nothing lost.
          </>
        ) : alias === 0 ? (
          <>
            A {fmt.int(tone)} Hz tone sampled {fmt.int(rate)} times a second lands on the same point of every wave, so the dots form a flat line: the tone vanishes. Keeping it needs more than {fmt.int(minRate(tone))} samples a second.
          </>
        ) : (
          <>
            A {fmt.int(tone)} Hz tone sampled {fmt.int(rate)} times a second is rebuilt as a {fmt.int(alias)} Hz tone, a pitch that was never there. Keeping it needs more than {fmt.int(minRate(tone))} samples a second.
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Tone pitch <b>{fmt.int(tone)} Hz</b>
            </span>
            <input type="range" min={100} max={1500} step={50} value={tone} onChange={(e) => { setPlaying(false); setTone(+e.target.value); }} aria-label="Pitch of the tone in hertz" />
          </label>
          <label className="field">
            <span>
              Samples per second <b>{fmt.int(rate)}</b>
            </span>
            <input type="range" min={400} max={8000} step={100} value={rate} onChange={(e) => { setPlaying(false); setRate(+e.target.value); }} aria-label="Samples taken per second" />
          </label>
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Play a rising tone'}
          </button>
        </>
      }
    >
      <svg viewBox={`0 0 ${W} 284`} className="dx-svg wi-svg we-svg" role="img" aria-label={`A ${tone} hertz tone sampled ${rate} times a second. The samples describe a ${alias} hertz tone, so the rebuilt wave is ${faithful ? 'the same as' : 'different from'} the real one.`}>
        <line x1={0} x2={W} y1={MID} y2={MID} className="we-grid" />
        <line x1={0} x2={0} y1={MID - AMP - 4} y2={MID + AMP + 4} className="we-grid" />
        <line x1={0} x2={18} y1={11} y2={11} stroke="var(--ink-2)" strokeWidth={1.6} />
        <text x={24} y={15} className="we-t">real tone</text>
        <line x1={112} x2={130} y1={11} y2={11} stroke={color} strokeWidth={3.2} />
        <text x={136} y={15} className="we-t">rebuilt from the dots</text>
        <path d={real} fill="none" stroke="var(--ink-2)" strokeWidth={1.6} />
        <motion.path
          key={String(faithful)}
          d={rebuilt}
          fill="none"
          stroke={color}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={faithful ? undefined : '0'}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
        />
        {dots.map((d, i) => {
          const x = q((d.t / (WINDOW_MS / 1000)) * W);
          const y = q(MID - d.y * AMP);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={MID} y2={y} stroke="var(--ink)" strokeWidth={1} opacity={0.35} />
              <circle cx={x} cy={y} r={r} fill="var(--ink)" stroke="var(--surface)" strokeWidth={1} />
            </g>
          );
        })}
        <text x={W} y={MID + AMP + 20} textAnchor="end" className="we-t">{WINDOW_MS} ms of sound, {dots.length} dots</text>

        {/* pitch ruler */}
        <line x1={PAD} x2={W - PAD} y1={222} y2={222} className="we-axis" />
        {[0, 400, 800, 1200, 1600].map((hz) => (
          <g key={hz}>
            <line x1={axisX(hz)} x2={axisX(hz)} y1={219} y2={225} className="we-axis" />
          </g>
        ))}
        <text x={PAD} y={240} className="we-t" textAnchor="start">0</text>
        <text x={W - PAD} y={240} className="we-t" textAnchor="end">1,600 Hz</text>
        {nyqOnAxis && <line x1={axisX(nyq)} x2={axisX(nyq)} y1={198} y2={228} stroke="var(--ink-2)" strokeWidth={1.4} strokeDasharray="4 3" />}
        <text x={anchorFor(px) === 'end' ? px + 6 : px} y={190} textAnchor={anchorFor(px)} className="we-t-b">played {fmt.int(tone)} Hz</text>
        <path d={`M${px - 5} 205 L${px + 5} 205 L${px} 216 Z`} fill="var(--ink)" />
        <path d={`M${ax - 5} 229 L${ax + 5} 229 L${ax} 218 Z`} fill={color} stroke={color} />
        <text x={ax} y={258} textAnchor={anchorFor(ax)} className={faithful ? 'we-t-good' : 'we-t-bad'}>
          {alias === 0 ? 'heard: nothing (0 Hz)' : `heard ${fmt.int(alias)} Hz`}
        </text>
        <text x={nyqOnAxis ? Math.min(Math.max(axisX(nyq), 100), W - 100) : W - PAD} y={276} textAnchor={nyqOnAxis ? 'middle' : 'end'} className="we-t">
          {nyqOnAxis ? `limit ${fmt.int(nyq)} Hz (half the rate)` : `limit ${fmt.int(nyq)} Hz, off this scale`}
        </text>
      </svg>
      <p className="we-note">
        The dots are all the computer has. Any wave that passes through every dot is a possible answer, and rebuilding picks the slowest one. Tones above half the sample rate fold down to a lower pitch. Speech sampled at 16,000 per second keeps everything up to 8,000 Hz.
      </p>
    </WhatIfFrame>
  );
}
