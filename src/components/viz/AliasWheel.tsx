import { useState } from 'react';
import { Root } from './shared';
import { aliasFrequency } from '../../lib/audio-dsp';

/*
 * The wagon-wheel picture of aliasing. A wheel with one mark turns at a steady speed and a camera
 * takes 10 photos a second. The strip shows where the mark is in each photo. This is exactly the
 * sampling idea in the tone lab, with turns per second standing in for pitch and photos per second
 * standing in for the sampling rate. Silent: no sound needed.
 */

const FPS = 10;
const FRAMES = 8;
const R = 24;
const C = 30;

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function AliasWheel() {
  const [turns, setTurns] = useState(2);
  const seen = aliasFrequency(turns, FPS); // signed turns per second the film seems to show
  const stepReal = (360 * turns) / FPS;
  const stepSeen = (360 * seen) / FPS;
  const tooFast = turns >= FPS / 2;

  let say: string;
  if (turns === 0) say = 'The wheel is not turning, and the film shows that correctly.';
  else if (turns === FPS / 2) say = `Right at the limit: the mark moves exactly half a turn between photos, so the film cannot tell whether it goes forwards or backwards.`;
  else if (!tooFast) say = `Fast enough. The mark moves ${fmt(stepReal)} degrees between photos, and the film shows the wheel turning forwards at ${fmt(turns)} turns a second. Correct.`;
  else if (Math.abs(seen) < 0.001) say = `Every photo catches the mark in the same place, so the film shows a wheel that is not moving at all, although it is spinning at ${fmt(turns)} turns a second.`;
  else
    say = `The wheel really turns ${fmt(turns)} times a second, which is more than half the ${FPS} photos a second. Between photos the mark moves ${fmt(stepReal)} degrees, but your eye takes the shorter way round: ${fmt(Math.abs(stepSeen))} degrees ${seen < 0 ? 'backwards' : 'forwards'}. The film shows a wheel turning ${seen < 0 ? 'backwards' : 'forwards'} at ${fmt(Math.abs(seen))} turns a second. Wrong.`;

  const frames = Array.from({ length: FRAMES }, (_, i) => {
    const deg = (stepReal * i) % 360;
    const a = (deg * Math.PI) / 180;
    return { i, x: Math.round((C + R * 0.72 * Math.sin(a)) * 100) / 100, y: Math.round((C - R * 0.72 * Math.cos(a)) * 100) / 100 };
  });

  return (
    <Root>
      <div className="viz au au-wheel">
        <p className="viz-title">The wagon-wheel effect: photos of a spinning wheel</p>
        <label className="field">
          <span>
            Real speed of the wheel <b>{fmt(turns)} turns a second</b>
          </span>
          <input type="range" min={0} max={20} step={0.5} value={turns} onChange={(e) => setTurns(+e.target.value)} aria-label="Wheel speed in turns per second" aria-valuetext={`${fmt(turns)} turns per second`} />
        </label>
        <p className="au-hint">The camera takes {FPS} photos every second. Eight photos in a row, left to right:</p>

        <ol className="au-frames" aria-label="The mark on the wheel in eight photos in a row">
          {frames.map((f) => (
            <li key={f.i}>
              <svg viewBox="0 0 60 60" className="au-frame" role="img" aria-label={`Photo ${f.i + 1}: the mark is at ${Math.round((stepReal * f.i) % 360)} degrees clockwise from the top`}>
                <circle cx={C} cy={C} r={R} className="au-wheel-rim" />
                <path d={`M ${C} ${C} L ${C} ${C - R}`} className="au-wheel-ref" />
                <path d={`M ${C} ${C} L ${f.x} ${f.y}`} className={`au-wheel-spoke${tooFast ? ' au-bad-spoke' : ''}`} />
                <circle cx={f.x} cy={f.y} r="4" className={tooFast ? 'au-wheel-dot au-bad-dot' : 'au-wheel-dot'} />
              </svg>
              <span>{f.i + 1}</span>
            </li>
          ))}
        </ol>

        <p className={`au-say${tooFast ? ' au-bad' : ''}`} aria-live="polite">
          {say}
        </p>
        <p className="viz-cap">
          Try 2, then 4, then 6, then 10 turns a second. The rule is the same one a microphone follows: you need more than two photos for every turn (or more than two samples for every wave) to see the truth. The dashed line in each photo is straight up, to show where the mark started.
        </p>
      </div>
    </Root>
  );
}
