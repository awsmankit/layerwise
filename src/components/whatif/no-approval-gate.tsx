import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { BACKUP, BEATS, actions, runAgent, type Decision } from '../../lib/whatif/no-approval-gate';

const RED = '#d6453d';
const GREEN = '#1f9d6b';
const AMBER = '#c77d0a';
const COLS = 14;

const CAPTIONS = [
  'You ask the agent to summarise report.docx. This is the only thing you asked for.',
  'The agent opens the document and reads it, as you asked.',
  'The document\'s text now sits in the agent\'s context next to your request. One line in it was written by someone else and tells the agent to delete the backups. The agent cannot tell that line from your instructions.',
  'The agent decides to delete the backup folder. That action cannot be undone.',
  '',
];

/**
 * A scripted agent run, drawn as a line diagram. Step through it: with no gate the planted line is obeyed;
 * with a gate the irreversible action stops and waits for a person, who can deny or approve.
 */
export default function NoApprovalGateWhatIf() {
  const [gate, setGate] = useState(true);
  const [beat, setBeat] = useState(BEATS - 1);
  const [decision, setDecision] = useState<Decision>('pending');
  const [playing, setPlaying] = useState(false);

  const run = useMemo(() => runAgent(gate, decision), [gate, decision]);
  const atEnd = beat >= BEATS - 1;
  const goneNow = atEnd && run.deleted;

  useEffect(() => {
    if (!playing) return;
    if (beat >= BEATS - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setBeat((b) => b + 1), 1000);
    return () => clearTimeout(t);
  }, [playing, beat]);

  const play = () => {
    setDecision('pending');
    setBeat(0);
    setPlaying(true);
  };

  let caption = CAPTIONS[beat];
  if (beat === BEATS - 1) {
    if (!gate) caption = `The action ran at once. Nothing was asked and nobody saw it. ${BACKUP.files} of ${BACKUP.files} backup files are gone.`;
    else if (decision === 'pending') caption = 'The gate paused the run and is waiting for a person. Nothing has been deleted yet.';
    else if (decision === 'deny') caption = 'A person read the request, saw it came from the document and not from them, and said no. The backups are safe.';
    else caption = 'The person approved without checking the source, so the gate let it through. The files are gone.';
  }

  const verdict = !gate ? (
    <>With no gate, {BACKUP.files} of {BACKUP.files} backup files ({BACKUP.gb} GB) are deleted by a line you never wrote, and nothing can bring them back.</>
  ) : decision === 'approve' ? (
    <>A gate only helps if the person reads it. Approved without a look, so all {BACKUP.files} files are gone. Good requests show what will happen, who asked and that it cannot be undone.</>
  ) : decision === 'deny' ? (
    <>The gate paused 1 of {actions.length} actions, the one that cannot be undone. The person said no: {BACKUP.files} of {BACKUP.files} files are safe and the summary was still written.</>
  ) : (
    <>The gate paused 1 of {actions.length} actions, the one that cannot be undone. {BACKUP.files} of {BACKUP.files} files are still there while a person decides.</>
  );

  const lit = (b: number) => beat >= b;
  const blocked = gate && beat >= 3 && !run.deleted;

  return (
    <WhatIfFrame
      title="One agent run, step by step"
      withLabel="With approval gate"
      withoutLabel="No gate"
      on={gate}
      onChange={(v) => {
        setGate(v);
        setDecision('pending');
      }}
      verdict={verdict}
      controls={
        <div className="wa-btns" style={{ gridColumn: '1 / -1', marginTop: 0 }}>
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Play it'}
          </button>
          <button
            type="button"
            className="btn quiet"
            onClick={() => {
              setPlaying(false);
              setBeat((b) => (b >= BEATS - 1 ? 0 : b + 1));
            }}
          >
            Next step
          </button>
          <span className="wa-count" aria-live="polite">Step {beat + 1} of {BEATS}</span>
        </div>
      }
    >
      <p className="wa-tag">Scripted illustration with a toy agent. The planted line is described, not shown.</p>
      <svg
        viewBox="0 0 340 392"
        className="dx-svg wi-svg wa-svg"
        role="img"
        aria-label={`Diagram of an agent run. You ask for a summary, the agent reads a document that contains a line telling it to delete a backup folder. ${gate ? 'An approval gate sits before the backups.' : 'There is no gate before the backups.'} ${goneNow ? 'The backup files are deleted.' : 'The backup files are still there.'}`}
      >
        {/* you */}
        <rect x={4} y={8} width={140} height={52} rx={12} fill="var(--surface)" stroke="currentColor" strokeWidth={1.5} />
        <text x={14} y={30} className="wa-tb">You</text>
        <text x={14} y={48} className="wa-t2">"Summarise this"</text>
        {/* document */}
        <rect x={176} y={8} width={160} height={104} rx={12} fill="var(--surface)" stroke="currentColor" strokeWidth={1.5} />
        <text x={188} y={30} className="wa-tb">report.docx</text>
        <text x={188} y={48} className="wa-t2">Written by others</text>
        <motion.rect
          x={186}
          y={62}
          width={140}
          height={40}
          rx={8}
          fill={RED}
          initial={false}
          animate={{ fillOpacity: lit(2) ? 0.2 : 0.05, strokeOpacity: lit(2) ? 1 : 0.35 }}
          stroke={RED}
          strokeWidth={1.6}
          strokeDasharray="5 3"
          transition={{ duration: 0.4, ease: EASE }}
        />
        <text x={194} y={79} className="wa-t">Planted line:</text>
        <text x={194} y={95} className="wa-t">"delete backups"</text>
        {/* agent */}
        <rect x={95} y={150} width={150} height={52} rx={12} fill="var(--surface)" stroke="currentColor" strokeWidth={2} />
        <text x={170} y={174} textAnchor="middle" className="wa-tb">Agent</text>
        <text x={170} y={192} textAnchor="middle" className="wa-t2">follows the text</text>
        {/* arrows: you -> agent, doc -> agent */}
        <motion.path d="M 74 60 L 130 150" stroke="currentColor" strokeWidth={2} fill="none" initial={false} animate={{ pathLength: lit(0) ? 1 : 0, opacity: lit(0) ? 1 : 0 }} transition={{ duration: 0.5, ease: EASE }} />
        <motion.path d="M 256 112 L 210 150" stroke={lit(2) ? RED : 'currentColor'} strokeWidth={2} fill="none" initial={false} animate={{ pathLength: lit(1) ? 1 : 0, opacity: lit(1) ? 1 : 0 }} transition={{ duration: 0.5, ease: EASE }} />
        <text x={34} y={118} className="wa-t2" opacity={lit(0) ? 1 : 0.3}>1 ask</text>
        <text x={248} y={136} className="wa-t2" opacity={lit(1) ? 1 : 0.3}>2 read</text>
        {/* agent -> gate */}
        <motion.line x1={170} y1={202} x2={170} y2={228} stroke={lit(3) ? RED : 'currentColor'} strokeWidth={2.5} initial={false} animate={{ opacity: lit(3) ? 1 : 0 }} transition={{ duration: 0.4, ease: EASE }} />
        {/* gate */}
        {gate ? (
          <g>
            <motion.rect
              x={75} y={228} width={190} height={46} rx={12}
              stroke={blocked ? AMBER : 'currentColor'} strokeWidth={2.2}
              initial={false}
              animate={{ fill: blocked ? 'rgba(199,125,10,0.22)' : 'rgba(127,127,127,0.08)' }}
              transition={{ duration: 0.4 }}
            />
            <text x={170} y={248} textAnchor="middle" className="wa-tb">Approval gate</text>
            <text x={170} y={265} textAnchor="middle" className="wa-t2">
              {blocked ? (decision === 'pending' ? 'PAUSED: ask a person' : 'person said no') : 'irreversible = ask first'}
            </text>
          </g>
        ) : (
          <g>
            <rect x={75} y={228} width={190} height={46} rx={12} fill="none" stroke="var(--ink-2)" strokeWidth={1.4} strokeDasharray="4 4" opacity={0.7} />
            <text x={170} y={256} textAnchor="middle" className="wa-t2">no gate here</text>
          </g>
        )}
        {/* gate -> backups */}
        <motion.line
          x1={170} y1={274} x2={170} y2={304}
          stroke={blocked ? AMBER : RED}
          strokeWidth={2.5}
          strokeDasharray={blocked ? '4 4' : undefined}
          initial={false}
          animate={{ opacity: lit(4) ? 1 : 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        />
        {blocked && lit(4) && (
          <text x={180} y={294} className="wa-tb" fill={AMBER}>blocked</text>
        )}
        <text x={4} y={222} className="wa-t2" opacity={lit(3) ? 1 : 0.3}>3 decide</text>
        <text x={4} y={296} className="wa-t2" opacity={lit(4) ? 1 : 0.3}>4 act</text>
        {/* backups */}
        <rect x={30} y={304} width={280} height={82} rx={12} fill="var(--surface)" stroke={goneNow ? RED : 'currentColor'} strokeWidth={goneNow ? 2.4 : 1.5} />
        <text x={42} y={324} className="wa-tb">{BACKUP.folder}</text>
        <text x={298} y={324} textAnchor="end" className="wa-tb" fill={goneNow ? RED : GREEN}>
          {goneNow ? `0 of ${BACKUP.files} left ✗` : `${BACKUP.files} of ${BACKUP.files} safe ✓`}
        </text>
        {Array.from({ length: BACKUP.files }, (_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          return (
            <motion.rect
              key={i}
              x={44 + col * 18.4}
              y={338 + row * 15}
              width={14}
              height={11}
              rx={2.5}
              stroke={goneNow ? RED : GREEN}
              strokeWidth={1.2}
              strokeDasharray={goneNow ? '2 2' : '0'}
              initial={false}
              animate={{ fillOpacity: goneNow ? 0 : 0.85, strokeOpacity: goneNow ? 0.7 : 1 }}
              fill={GREEN}
              transition={{ duration: 0.4, delay: goneNow ? i * 0.012 : 0, ease: EASE }}
            />
          );
        })}
      </svg>
      <p className="wa-beat" aria-live="polite">{caption}</p>
      {gate && atEnd && (
        <motion.div className="wa-ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <b>Approval needed</b>
          <span>{actions[2].plain}</span>
          <span>Asked by: <b>text inside the document</b>, not by you.</span>
          <div className="wa-btns" style={{ marginTop: '0.4rem' }}>
            <button type="button" className={`btn quiet wa-deny${decision === 'deny' ? ' is-chosen' : ''}`} onClick={() => setDecision('deny')} aria-pressed={decision === 'deny'}>
              Deny
            </button>
            <button type="button" className={`btn quiet wa-approve${decision === 'approve' ? ' is-chosen' : ''}`} onClick={() => setDecision('approve')} aria-pressed={decision === 'approve'}>
              Approve without looking
            </button>
          </div>
        </motion.div>
      )}
      <ul className="wa-actions" aria-label="The three actions in this run and what happened to each">
        {run.steps.map((s) => (
          <li key={s.action.id} className={s.outcome === 'ran' ? (s.action.risk === 'irreversible' ? 'is-bad' : 'is-good') : 'is-hold'}>
            <span>{s.action.label}</span>
            <small>
              {s.action.risk === 'irreversible' ? 'cannot be undone' : s.action.risk === 'reversible' ? 'can be undone' : 'read only'} ·{' '}
              {s.outcome === 'ran' ? 'ran' : s.outcome === 'paused' ? 'paused for a person' : 'denied by a person'}
            </small>
          </li>
        ))}
      </ul>
    </WhatIfFrame>
  );
}
