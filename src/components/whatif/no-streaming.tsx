import { useEffect, useState } from 'react';
import WhatIfFrame from './WhatIfFrame';
import { example, fractionVisible, timeToFirstToken, tokensVisible, totalSeconds, wordsOf, blankSeconds, blankRatio } from '../../lib/whatif/no-streaming';

const X = 6;
const W = 368;
const WORD_W = [26, 40, 18, 34, 28, 44, 22, 36];
const LINES = 5;
const PER_LINE = 8;

const s1 = (n: number) => `${n.toFixed(1)} s`;

/**
 * A phone-like screen shows what the user sees at a chosen moment after pressing send. Two timelines
 * under it show the blank wait (red) and the text appearing (green) for both ways. Drag the time or press Play.
 */
export default function NoStreamingWhatIf() {
  const [streamed, setStreamed] = useState(true);
  const [reply, setReply] = useState(300);
  const [speed, setSpeed] = useState(40);
  const [t, setT] = useState(3);
  const [playing, setPlaying] = useState(false);

  const first = timeToFirstToken();
  const total = totalSeconds(reply, speed);
  const now = Math.min(t, total);

  useEffect(() => {
    if (!playing) return;
    const factor = Math.max(1, total / 5);
    const id = setInterval(() => {
      setT((x) => {
        const next = x + 0.05 * factor;
        if (next >= total) {
          setPlaying(false);
          return total;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(id);
  }, [playing, total]);

  const frac = fractionVisible(now, streamed, reply, speed);
  const shown = Math.round(frac * LINES * PER_LINE);
  const tokens = tokensVisible(now, streamed, reply, speed);
  const blank = blankSeconds(streamed, reply, speed);
  const waitingNow = tokens === 0;
  const x = (sec: number) => X + (sec / total) * W;

  // word blocks of the reply, laid out in lines
  const blocks: { x: number; y: number; w: number; k: number }[] = [];
  for (let l = 0; l < LINES; l++) {
    let cx = 0;
    for (let i = 0; i < PER_LINE; i++) {
      const k = l * PER_LINE + i;
      const w = WORD_W[(k * 3 + l) % WORD_W.length];
      if (cx + w > 324) break;
      blocks.push({ x: cx, y: l * 16, w, k });
      cx += w + 6;
    }
  }

  const rowY = 214;
  const H = 316;

  return (
    <WhatIfFrame
      title="Press send and look at the screen"
      withLabel="Streamed"
      withoutLabel="Not streamed"
      on={streamed}
      onChange={setStreamed}
      verdict={
        streamed ? (
          <>
            The first words appear after {s1(first)}, so the blank wait is {s1(blank)}. The whole {reply}-token reply still finishes at {s1(total)} (example speeds).
          </>
        ) : (
          <>
            The screen stays blank for {s1(blank)}, then the whole reply appears at once. The total time is the same {s1(total)}, but the blank wait is {blankRatio(reply, speed).toFixed(0)} times longer (example speeds).
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Reply length <b>{reply} tokens</b>
            </span>
            <input type="range" min={50} max={1000} step={50} value={reply} onChange={(e) => setReply(+e.target.value)} aria-label="Reply length in tokens" />
          </label>
          <label className="field">
            <span>
              Writing speed <b>{speed} tokens/s</b>
            </span>
            <input type="range" min={10} max={100} step={5} value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label="Writing speed in tokens per second" />
          </label>
          <label className="field">
            <span>
              Time since send <b>{s1(now)}</b>
            </span>
            <input
              type="range"
              min={0}
              max={Math.round(total * 10)}
              step={1}
              value={Math.round(now * 10)}
              onChange={(e) => {
                setPlaying(false);
                setT(+e.target.value / 10);
              }}
              aria-label="Seconds since you pressed send"
              aria-valuetext={s1(now)}
            />
          </label>
          <div className="ws-btnrow">
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                setT(0);
                setPlaying(true);
              }}
            >
              {playing ? 'Playing…' : 'Play it'}
            </button>
          </div>
        </>
      }
    >
      <p className="ws-idea">
        The answer takes the same time to write either way. Streaming just lets you start reading while the rest is still coming.
      </p>
      <svg viewBox={`0 0 380 ${H}`} className="dx-svg wi-svg ws-svg" role="img" aria-label={`What the user sees ${s1(now)} after pressing send: ${waitingNow ? 'a blank screen' : `${wordsOf(tokens)} words of the reply`}.`}>
        <rect x={X} y={6} width={W} height={150} rx={12} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.6} />
        <rect x={X + 12} y={16} width={120} height={20} rx={10} className="ws-track" />
        <text x={X + 22} y={31} className="ws-svg-t">
          Your question
        </text>
        <text x={X + W - 12} y={31} textAnchor="end" className="ws-svg-b">
          {s1(now)}
        </text>
        <g transform={`translate(${X + 22} 54)`}>
          {blocks.map((b) => (
            <rect key={b.k} x={b.x} y={b.y} width={b.w} height={9} rx={4.5} fill="var(--ink)" opacity={b.k < shown ? 0.75 : 0} />
          ))}
        </g>
        {waitingNow && (
          <text x={X + W / 2} y={104} textAnchor="middle" className="ws-svg-b" style={{ fill: '#d6453d' }}>
            Blank screen: still waiting...
          </text>
        )}
        <text x={X + 12} y={146} className="ws-svg-t">
          {waitingNow ? 'nothing to read yet' : `${wordsOf(tokens)} words on screen of about ${wordsOf(reply)}`}
        </text>

        {[
          { label: 'Streamed', blankEnd: first, y: rowY, on: true },
          { label: 'Not streamed', blankEnd: total, y: rowY + 46, on: false },
        ].map((r) => (
          <g key={r.label} opacity={r.on === streamed ? 1 : 0.6}>
            <text x={X} y={r.y} className="ws-svg-b">
              {r.label}: blank for {s1(r.blankEnd)}
            </text>
            <rect x={X} y={r.y + 7} width={W} height={16} rx={4} className="ws-track" />
            <rect x={X} y={r.y + 7} width={Math.max(2, x(r.blankEnd) - X)} height={16} rx={4} className="ws-bad" />
            {r.blankEnd < total && <rect x={x(r.blankEnd)} y={r.y + 7} width={x(total) - x(r.blankEnd)} height={16} className="ws-good" />}
          </g>
        ))}
        <line x1={x(now)} x2={x(now)} y1={rowY - 12} y2={rowY + 74} stroke="var(--ink)" strokeWidth={2.5} />
        <text x={X} y={H - 4} className="ws-svg-t">
          red = blank screen, green = text appearing
        </text>
      </svg>
      <p className="ws-note">
        Example numbers, not a measurement: a {example.promptTokens.toLocaleString('en-US')}-token prompt read at {example.prefillTokS.toLocaleString('en-US')} tokens per second plus {example.overheadS} s of delay gives a first token after {s1(first)}. About {example.wordsPerToken} words per token.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <p className="ws-note" style={{ marginTop: 0 }}>
          Time to first token = delay + prompt tokens / prefill speed = {example.overheadS} + {example.promptTokens} / {example.prefillTokS} = {first.toFixed(2)} s. Total = time to first token + reply tokens / writing speed = {first.toFixed(2)} + {reply} / {speed} = {total.toFixed(2)} s. Blank wait: {first.toFixed(2)} s streamed, {total.toFixed(2)} s not streamed.
        </p>
      </details>
    </WhatIfFrame>
  );
}
