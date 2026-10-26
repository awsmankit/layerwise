import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';

type Mode = 'small' | 'right' | 'big';

/* An example staff-handbook page. Token counts are real, from the o200k_base tokenizer. */
const SMALL = [
  { text: 'Staff parking permits are issued by Facilities.', tokens: 8 },
  { text: 'A permit costs 120 euros a year.', tokens: 9 },
  { text: 'It must be renewed annually before 31 January.', tokens: 10, orphan: true },
];
const OVERLAP = 'It must be renewed annually before 31 January.';
const RIGHT = [
  { lines: ['Staff parking permits are issued by Facilities.', 'A permit costs 120 euros a year.', OVERLAP], tokens: 33 },
  { lines: [OVERLAP, 'Lost permits are replaced for 10 euros at the Facilities desk.'], tokens: 29 },
];
const BIG = [
  'Staff handbook. Parking permits: staff parking permits are issued by Facilities.',
  'A permit costs 120 euros a year. It must be renewed annually before 31 January.',
  'Lost permits are replaced for 10 euros at the Facilities desk. Bike storage: covered',
  'racks are behind building B and need a key card. Visitors: guests sign in at',
  'reception and wear a badge. Building hours: the main doors open at 7:00 and close',
  'at 20:00 on weekdays.',
];

const NOTES: Record<Mode, string> = {
  small: 'One sentence per chunk. The third one is retrieved for "When do I renew my parking permit?", but "it" could be anything: the chunk has lost its context.',
  right: 'One section per chunk, with the document title and heading added to the text that is embedded. Where a section must be split, one sentence is repeated in both chunks so neither loses the thread.',
  big: 'The whole page as one chunk. Its single vector averages four topics, so it matches no question well, and every answer drags in text about bikes, visitors and opening hours.',
};

const LINE = { fontFamily: 'var(--font-display)', fontSize: 12.5, fill: 'var(--ink)' } as const;

/** One example page, chunked three ways. */
export default function ChunkSizes() {
  const [mode, setMode] = useState<Mode>('right');

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">One page, chunked three ways</p>
          <div className="dx-steps" role="group" aria-label="Chunk size">
            {(['small', 'right', 'big'] as Mode[]).map((m) => (
              <button key={m} type="button" className="btn quiet" aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === 'small' ? 'Too small' : m === 'right' ? 'About right' : 'Too big'}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 740 236" className="dx-svg" role="img" aria-label={NOTES[mode]}>
          <AnimatePresence mode="wait">
            <motion.g key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              {mode === 'small' &&
                SMALL.map((c, i) => (
                  <g key={c.text}>
                    <rect x="20" y={20 + i * 62} width="560" height="46" rx="8" className={c.orphan ? 'dx-core dx-hot' : 'dx-core'} />
                    <text x="36" y={48 + i * 62} style={LINE}>{c.text}</text>
                    <text x="596" y={40 + i * 62} className="dx-small">{`${c.tokens} tokens`}</text>
                    {c.orphan && <text x="596" y={56 + i * 62} className="dx-small" style={{ fill: 'var(--warn)' }}>what is "it"?</text>}
                  </g>
                ))}

              {mode === 'right' &&
                RIGHT.map((c, i) => {
                  const y = i === 0 ? 14 : 132;
                  const h = 28 + c.lines.length * 22;
                  return (
                    <g key={i}>
                      <rect x="20" y={y} width="560" height={h} rx="8" className="dx-core" />
                      <text x="36" y={y + 20} className="dx-small">Staff handbook &gt; Parking permits</text>
                      {c.lines.map((l, k) => {
                        const isOverlap = l === OVERLAP;
                        const ly = y + 42 + k * 22;
                        return (
                          <g key={k}>
                            {isOverlap && <rect x="30" y={ly - 15} width="300" height="21" rx="4" className="kv-cached" />}
                            <text x="36" y={ly} style={LINE}>{l}</text>
                          </g>
                        );
                      })}
                      <text x="596" y={y + 24} className="dx-small">{`chunk ${i + 1}: ${c.tokens} tokens`}</text>
                    </g>
                  );
                })}
              {mode === 'right' && (
                <g>
                  <path d="M 336 95 H 588 V 170 H 336" className="dx-residual" />
                  <text x="596" y="136" className="dx-small">same sentence in both</text>
                </g>
              )}

              {mode === 'big' && (
                <g>
                  <rect x="20" y="14" width="560" height="166" rx="8" className="dx-core dx-hot" />
                  {BIG.map((l, k) => (
                    <text key={k} x="36" y={42 + k * 24} style={{ ...LINE, fontSize: 12 }}>{l}</text>
                  ))}
                  <text x="596" y="38" className="dx-small">1 chunk: 95 tokens</text>
                  <text x="596" y="56" className="dx-small">4 topics,</text>
                  <text x="596" y="72" className="dx-small">1 vector</text>
                </g>
              )}
            </motion.g>
          </AnimatePresence>
          <text x="20" y="228" className="dx-small">An example handbook page. Token counts are real, from the o200k_base tokenizer.</text>
        </svg>
        <p className="viz-cap">{NOTES[mode]}</p>
      </div>
    </Root>
  );
}
