import { useState } from 'react';
import { Root } from './shared';

/*
 * U-Net in one picture. Blocks are feature maps. Taller means more detail (higher resolution),
 * the picture shrinks on the way down and grows on the way up, and skips copy detail across.
 */

const STEPS = [
  { id: 'all', name: 'The whole U', text: 'A picture goes in on the left. A mask the same size as the picture comes out on the right. The shape of the network looks like a U.' },
  { id: 'down', name: '1 Shrink', text: 'Going down the left side, each stage makes the picture smaller. Small maps see a wide area, so the network learns what is in the scene, but exact edges get blurry.' },
  { id: 'bottom', name: '2 Bottom', text: 'At the bottom the map is smallest. Each cell here has looked at a large part of the picture, so this is where context is strongest.' },
  { id: 'up', name: '3 Grow', text: 'Going up the right side, each stage makes the map bigger again, until it is the size of the original picture. Growing alone cannot bring back fine detail that was lost on the way down.' },
  { id: 'skip', name: '4 Skips', text: 'The dashed arrows copy the sharp maps from the left side straight across to the right side. The right side then has both context from below and exact outlines from the skip.' },
] as const;

const BLOCK_W = 20;
const GAP = 14;
const X0 = 14;
const HEIGHTS = [130, 104, 78, 52, 30];
const CY = 96;

export default function UNetDiagram() {
  const [step, setStep] = useState<(typeof STEPS)[number]['id']>('all');
  const cur = STEPS.find((s) => s.id === step)!;

  const xs = Array.from({ length: 9 }, (_, i) => X0 + i * (BLOCK_W + GAP));
  // blocks 0..3 down, 4 bottom, 5..8 up; heights mirror
  const hs = [HEIGHTS[0], HEIGHTS[1], HEIGHTS[2], HEIGHTS[3], HEIGHTS[4], HEIGHTS[3], HEIGHTS[2], HEIGHTS[1], HEIGHTS[0]];
  const part = (i: number) => (i < 4 ? 'down' : i === 4 ? 'bottom' : 'up');
  const on = (i: number) => step === 'all' || step === 'skip' || step === part(i);

  return (
    <Root>
      <div className="viz w5a-unet">
        <p className="viz-title">U-Net in one picture</p>
        <div className="w5a-row" role="group" aria-label="Parts of the U-Net">
          {STEPS.map((s) => (
            <button key={s.id} type="button" className="w5a-chip" aria-pressed={step === s.id} onClick={() => setStep(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
        <svg className="w5a-unet-svg" viewBox="0 0 320 190" role="img" aria-label="A U-shaped network. Five blocks shrink from a large picture on the left to a small block at the bottom, then five blocks grow back to a mask on the right, with dashed skip arrows copying detail across.">
          {[0, 1, 2, 3].map((i) => {
            const y = CY - hs[i] / 2 + 8;
            return (
              <line
                key={`s${i}`}
                x1={xs[i] + BLOCK_W}
                y1={y}
                x2={xs[8 - i]}
                y2={y}
                className={`w5a-skip${step === 'skip' ? ' is-hot' : ''}`}
              />
            );
          })}
          {xs.map((x, i) => (
            <rect key={i} x={x} y={CY - hs[i] / 2} width={BLOCK_W} height={hs[i]} rx="4" className={`w5a-blk w5a-blk-${part(i)}${on(i) ? ' is-on' : ''}`} />
          ))}
          <text x={xs[0] + BLOCK_W / 2} y="184" textAnchor="middle" className="w5a-svg-t">picture</text>
          <text x={xs[4] + BLOCK_W / 2} y="184" textAnchor="middle" className="w5a-svg-t">bottom</text>
          <text x={xs[8] + BLOCK_W / 2} y="184" textAnchor="middle" className="w5a-svg-t">mask</text>
        </svg>
        <p className="w5a-result" aria-live="polite">
          <b>{cur.name}.</b> {cur.text}
        </p>
      </div>
    </Root>
  );
}
