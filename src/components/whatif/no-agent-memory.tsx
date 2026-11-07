import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { FACTS, REQUEST, session2 } from '../../lib/whatif/no-agent-memory';

const GREEN = '#1f9d6b';
const RED = '#d6453d';
const N = FACTS.length;
const TOPICS = ['diet', 'allergy', 'kitchen', 'budget', 'spice'];

/**
 * Two sessions of the same toy agent. Session 1 ends, the context is thrown away, and session 2 starts blank.
 * Whatever is not in the notes store has to be asked again. The figure shows the three places; the chat below
 * shows what session 2 looks like to the person.
 */
export default function NoAgentMemoryWhatIf() {
  const [memory, setMemory] = useState(true);
  const [kept, setKept] = useState(N);
  const [shown, setShown] = useState(N);
  const [playing, setPlaying] = useState(false);

  const k = memory ? kept : 0;
  const s = useMemo(() => session2(k), [k]);

  useEffect(() => {
    if (!playing) return;
    if (shown >= N) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setShown((x) => x + 1), 650);
    return () => clearTimeout(t);
  }, [playing, shown]);

  const replay = () => {
    setShown(0);
    setPlaying(true);
  };
  const flip = (v: boolean) => {
    setMemory(v);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPlaying(false);
      setShown(N);
    } else replay();
  };

  const verdict = !memory ? (
    <>
      With no memory, session 2 starts blank: the agent asks all {s.asked} questions again, and you retype {s.wordsRetyped} words before it can even start planning (toy script).
    </>
  ) : s.asked === 0 ? (
    <>With a notes store that holds all {N} facts, the agent reads its notes first and asks {s.asked} repeated questions. It starts planning straight away (toy script).</>
  ) : (
    <>
      The notes store has room for {k} of {N} facts, so the agent recalls {s.recalled} and still asks {s.asked} again ({s.wordsRetyped} words retyped). A note it never wrote is a fact it does not have (toy script).
    </>
  );

  const rowY = (i: number) => 46 + i * 22;
  const done = shown >= N;

  return (
    <WhatIfFrame
      title="Same agent, two sessions"
      withLabel="With a notes store"
      withoutLabel="No memory"
      on={memory}
      onChange={flip}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Notes the store has room for <b>{memory ? `${kept} of ${N}` : 'none'}</b>
            </span>
            <input type="range" min={0} max={N} value={kept} disabled={!memory} onChange={(e) => setKept(+e.target.value)} aria-label="How many facts the notes store has room for" />
          </label>
          <div className="wa-btns" style={{ marginTop: 0 }}>
            <button type="button" className="btn quiet" onClick={replay}>
              {playing ? 'Playing…' : 'Play session 2'}
            </button>
            <span className="wa-count" aria-live="polite">
              Question {Math.min(shown, N)} of {N}
            </span>
          </div>
        </>
      }
    >
      <p className="wa-tag">Scripted illustration with a toy agent. Names, facts and money are made up. Nothing here comes from a real product.</p>
      <svg
        viewBox="0 0 340 176"
        className="dx-svg wi-svg wa-svg"
        role="img"
        aria-label={`Three boxes in a row. Session 1, where you told the agent five facts. A notes store holding ${k} of ${N} facts. Session 2, which starts blank and ${s.recalled === N ? 'recalls everything' : `asks ${s.asked} questions again`}.`}
      >
        <text x={50} y={16} textAnchor="middle" className="wa-tb">Session 1</text>
        <text x={170} y={16} textAnchor="middle" className="wa-tb">Notes store</text>
        <text x={290} y={16} textAnchor="middle" className="wa-tb">Session 2</text>
        <rect x={4} y={24} width={92} height={140} rx={12} fill="var(--surface)" stroke="currentColor" strokeWidth={1.5} />
        <rect x={124} y={24} width={92} height={140} rx={12} fill="var(--surface)" stroke="currentColor" strokeWidth={memory ? 1.8 : 1.4} strokeDasharray={memory ? undefined : '5 4'} opacity={memory ? 1 : 0.7} />
        <rect x={244} y={24} width={92} height={140} rx={12} fill="var(--surface)" stroke="currentColor" strokeWidth={1.5} />
        <text x={50} y={40} textAnchor="middle" className="wa-t2">you said</text>
        <text x={170} y={40} textAnchor="middle" className="wa-t2">{memory ? 'saved notes' : 'no store'}</text>
        <text x={290} y={40} textAnchor="middle" className="wa-t2">starts blank</text>
        {TOPICS.map((t, i) => {
          const saved = memory && i < kept;
          const fromNotes = i < k;
          return (
            <g key={t}>
              <text x={14} y={rowY(i) + 14} className="wa-t">{t}</text>
              <motion.rect
                x={132} y={rowY(i) + 1} width={76} height={18} rx={5}
                stroke={saved ? GREEN : 'currentColor'} strokeWidth={1.3}
                strokeDasharray={saved ? undefined : '3 3'}
                initial={false}
                animate={{ fill: saved ? 'rgba(31,157,107,0.2)' : 'rgba(127,127,127,0)', strokeOpacity: saved ? 1 : 0.35 }}
                transition={{ duration: 0.4, ease: EASE }}
              />
              <text x={170} y={rowY(i) + 14} textAnchor="middle" className="wa-t" opacity={saved ? 1 : 0.35}>{saved ? `✓ ${t}` : 'empty'}</text>
              <motion.g initial={false} animate={{ opacity: i < shown ? 1 : 0.15 }} transition={{ duration: 0.3, ease: EASE }}>
                <text x={254} y={rowY(i) + 14} className="wa-t" fill={fromNotes ? GREEN : RED} style={{ fill: fromNotes ? GREEN : RED }}>
                  {fromNotes ? '✓ recalled' : '? asks'}
                </text>
              </motion.g>
            </g>
          );
        })}
        {/* arrows between the boxes */}
        <line x1={96} y1={94} x2={122} y2={94} stroke={memory ? GREEN : 'currentColor'} strokeWidth={2.2} strokeDasharray={memory ? undefined : '3 4'} opacity={memory ? 1 : 0.45} />
        <line x1={216} y1={94} x2={242} y2={94} stroke={memory ? GREEN : 'currentColor'} strokeWidth={2.2} strokeDasharray={memory ? undefined : '3 4'} opacity={memory ? 1 : 0.45} />
        <text x={109} y={86} textAnchor="middle" className="wa-t2" fill={memory ? GREEN : RED} style={{ fill: memory ? GREEN : RED }}>{memory ? '→' : '✗'}</text>
        <text x={229} y={86} textAnchor="middle" className="wa-t2" fill={memory ? GREEN : RED} style={{ fill: memory ? GREEN : RED }}>{memory ? '→' : '✗'}</text>
      </svg>
      <p className="wa-note" style={{ marginTop: '0.4rem' }}>
        In session 1 you said: {FACTS.map((f) => `"${f.said}"`).join(' ')}
      </p>
      <ol className="wa-chat" style={{ minHeight: 0, marginTop: '0.8rem' }} aria-label={`Session 2, ${memory ? 'with' : 'without'} a notes store`}>
        <li className="wa-bubble wa-you">
          <span className="wa-who">You, session 2</span>
          <span>{REQUEST}</span>
        </li>
        {s.rows.slice(0, shown).map((r) =>
          r.fromNotes ? (
            <motion.li key={`${memory}-${kept}-${r.fact.id}`} className="wa-bubble wa-tool" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <span className="wa-who">Agent reads its notes</span>
              <span className="wa-mono">{r.fact.note}</span>
            </motion.li>
          ) : (
            <motion.li key={`${memory}-${kept}-${r.fact.id}`} className="wa-pair" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <span className="wa-bubble wa-model">
                <span className="wa-who">Agent</span>
                <span>{r.fact.question}</span>
              </span>
              <span className="wa-bubble wa-you wa-again">
                <span className="wa-who">You, again</span>
                <span>{r.fact.said}</span>
              </span>
            </motion.li>
          ),
        )}
        {done && (
          <motion.li className="wa-bubble wa-model" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <span className="wa-who">Agent</span>
            <span>{s.asked === 0 ? 'Here is a Friday plan that fits all of that.' : `Thanks. Now I have what I need, ${s.asked * 2} messages later. Here is a Friday plan.`}</span>
          </motion.li>
        )}
      </ol>
      <ul className="wa-score" aria-label="Counts for session 2">
        <li className={s.asked === 0 ? 'is-good' : 'is-bad'}>
          <span aria-hidden="true">{s.asked === 0 ? '✓' : '✗'}</span> Repeated questions: {s.asked} of {N}
        </li>
        <li className={s.wordsRetyped === 0 ? 'is-good' : 'is-bad'}>Words retyped: {s.wordsRetyped}</li>
        <li className={s.messagesBeforeStart === 0 ? 'is-good' : 'is-bad'}>Messages before it starts: {s.messagesBeforeStart}</li>
      </ul>
      <details className="wa-numbers">
        <summary>Open the numbers</summary>
        <p className="wa-note" style={{ marginTop: 0 }}>
          A model keeps nothing between sessions: each one begins with an empty context plus whatever the program puts in it. Here the program adds the notes file. Each fact the notes miss costs one question and one answer, so messages before the agent can start = 2 x {s.asked} = {s.messagesBeforeStart}, and the words retyped add up the answers: {FACTS.map((f) => f.said.split(/\s+/).length).join(' + ')} words for all five. The agent saves facts in the order you said them, so a store with room for fewer lines forgets the later ones. A real notes store can also go stale: if you change your mind, the note has to be updated, or the agent will confidently use the old one.
        </p>
      </details>
    </WhatIfFrame>
  );
}
