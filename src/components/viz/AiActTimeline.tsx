import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/*
 * Application dates from the European Commission's AI Act Service Desk timeline, as updated
 * for the AI Omnibus (in force 27 July 2026). Each date was read on the Commission's own pages
 * on 28 October 2026. Spacing is even, not to scale.
 */
const STEPS: { date: string; iso: string; a: string; b: string }[] = [
  { date: '1 Aug 2024', iso: '2024-08-01', a: 'The Act enters', b: 'into force' },
  { date: '2 Feb 2025', iso: '2025-02-02', a: 'Bans and AI', b: 'literacy apply' },
  { date: '2 Aug 2025', iso: '2025-08-02', a: 'General-purpose', b: 'AI duties apply' },
  { date: '2 Aug 2026', iso: '2026-08-02', a: 'Transparency (Art. 50)', b: 'and enforcement start' },
  { date: '2 Dec 2026', iso: '2026-12-02', a: 'Two new bans; marking', b: 'deadline, older systems' },
  { date: '2 Aug 2027', iso: '2027-08-02', a: 'Sandboxes due; older', b: 'GPAI models comply' },
  { date: '2 Dec 2027', iso: '2027-12-02', a: 'High-risk rules apply', b: '(Annex III uses)' },
  { date: '2 Aug 2028', iso: '2028-08-02', a: 'High-risk rules apply', b: '(Annex I products)' },
];

const X = (i: number) => 52 + i * 88;
const CHECKED = '2026-10-28';

/**
 * A line of dates. Filled marks are in the past, hollow ones still ahead, judged by the
 * reader's own date. The delay of the high-risk dates is the last two marks.
 */
export default function AiActTimeline() {
  const [today, setToday] = useState(CHECKED);
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), []);
  const passed = STEPS.filter((s) => s.iso <= today).length;

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">When the rules apply</p>
        <svg viewBox="0 0 740 250" className="dx-svg" role="img" aria-label={`Eight dates from August 2024 to August 2028. ${passed} have passed.`}>
          <path d="M 30 125 H 710" className="dx-link" />
          <motion.path d={`M 30 125 H ${passed ? X(passed - 1) : 30}`} className="dx-residual" style={{ strokeDasharray: 'none', strokeWidth: 2 }} initial={false} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }} />
          {STEPS.map((s, i) => {
            const past = i < passed;
            const up = i % 2 === 0;
            const x = X(i);
            // the date sits next to the line, the description beyond it
            const dateY = up ? 88 : 170;
            const lines = up ? [52, 66] : [188, 202];
            return (
              <g key={s.date}>
                <circle cx={x} cy="125" r="7" className={past ? 'dx-packet' : 'dx-core'} />
                <path d={`M ${x} ${up ? 118 : 132} V ${up ? 96 : 152}`} className="dx-link" />
                <text x={x} y={dateY} textAnchor="middle" className="dx-name" style={{ fontSize: 13 }}>{s.date}</text>
                <text x={x} y={lines[0]} textAnchor="middle" className="dx-small">{s.a}</text>
                <text x={x} y={lines[1]} textAnchor="middle" className="dx-small">{s.b}</text>
              </g>
            );
          })}
          <text x="710" y="238" textAnchor="end" className="dx-small">filled: already in the past</text>
        </svg>
        <p className="viz-cap">
          The 2026 AI Omnibus pushed the high-risk rules back to the last two marks (they were due on 2 August 2026 and 2 August 2027) and added the 2 December 2026 items. Spacing is even, not to scale.
        </p>
      </div>
    </Root>
  );
}
