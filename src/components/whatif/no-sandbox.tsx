import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { EXTRA_LABEL, HOSTS, PROJECT, TARGET, TREE, intended, runCommand, worstCase, type Access, type Extra } from '../../lib/whatif/no-sandbox';

const GREEN = '#1f9d6b';
const RED = '#d6453d';
const AMBER = '#c77d0a';
const fmt = (n: number) => n.toLocaleString('en-US');

const EXTRAS: Extra[] = ['nothing', 'home-read', 'home-write'];

const ACCESS_WORD: Record<Access, string> = { write: 'can change', read: 'read only', none: 'blocked' };

/** Outside-the-project items drawn in the figure, with the tree path they stand for. */
const OUTSIDE = [
  { path: '/home/dev/photos', label: 'photos' },
  { path: '/home/dev/invoices', label: 'invoices' },
  { path: '/home/dev/.ssh', label: '.ssh key files' },
];

/**
 * A made-up laptop. A coding agent's cleanup command has a bug in its path and is aimed at the whole home folder.
 * Without isolation it runs as you; in a sandbox it only gets the permission list. Same command, same mistake.
 */
export default function NoSandboxWhatIf() {
  const [isolated, setIsolated] = useState(true);
  const [extra, setExtra] = useState<Extra>('nothing');
  const [shown, setShown] = useState(TREE.length);
  const [playing, setPlaying] = useState(false);

  const o = useMemo(() => runCommand(isolated, extra), [isolated, extra]);
  const worst = worstCase();
  const want = intended();

  useEffect(() => {
    if (!playing) return;
    if (shown >= TREE.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setShown((s) => s + 1), 380);
    return () => clearTimeout(t);
  }, [playing, shown]);

  const replay = () => {
    setShown(0);
    setPlaying(true);
  };
  const flip = (v: boolean) => {
    setIsolated(v);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPlaying(false);
      setShown(TREE.length);
    } else replay();
  };

  const accessOf = (path: string): Access => o.rows.find((r) => r.node.path === path)!.access;
  const touchedSoFar = o.rows.slice(0, shown).reduce((n, r) => n + r.deleted, 0);

  const verdict = !isolated ? (
    <>
      With no isolation the cleanup, meant to remove {fmt(want)} old build files, deletes {fmt(o.deleted)} files, including photos, invoices and key files, because the process can do whatever your account can. It can also reach all {o.hosts.length} servers (example numbers).
    </>
  ) : extra === 'nothing' ? (
    <>
      In the sandbox the same mistake is stopped at the project folder: {fmt(o.deleted)} files deleted there, {fmt(o.refused)} refused. Only {o.hosts.length} of {HOSTS.length} servers is reachable (example numbers).
    </>
  ) : extra === 'home-read' ? (
    <>
      Allowing reads of the home folder keeps deletions at {fmt(o.deleted)}, but the agent can now read {o.secretsReadable} secret files it never needed. Each extra rule widens what a mistake can see.
    </>
  ) : (
    <>
      A rule that lets the sandbox write to the whole home folder brings the damage back: {fmt(o.deleted)} files deleted, the same as no sandbox. A sandbox is only as small as its permission list.
    </>
  );

  const outStatus = (path: string) => {
    const a = accessOf(path);
    return a === 'write' ? RED : a === 'read' ? AMBER : GREEN;
  };

  return (
    <WhatIfFrame
      title="One buggy cleanup command on a made-up laptop"
      withLabel="Sandboxed"
      withoutLabel="Runs as you"
      on={isolated}
      onChange={flip}
      verdict={verdict}
      controls={
        <>
          <div className="wa-picker" role="group" aria-label="What the sandbox allows beyond the project folder">
            {EXTRAS.map((e) => (
              <button key={e} type="button" className={`wa-pick${extra === e ? ' is-on' : ''}`} aria-pressed={extra === e} disabled={!isolated} onClick={() => setExtra(e)}>
                <span>{EXTRA_LABEL[e]}</span>
                <small>{e === 'nothing' ? 'least privilege' : e === 'home-read' ? 'wider rule' : 'too wide'}</small>
              </button>
            ))}
          </div>
          <div className="wa-btns" style={{ marginTop: 0, gridColumn: '1 / -1' }}>
            <button type="button" className="btn quiet" onClick={replay}>
              {playing ? 'Playing…' : 'Run the command'}
            </button>
            <span className="wa-count" aria-live="polite">
              {fmt(touchedSoFar)} files deleted so far
            </span>
          </div>
        </>
      }
    >
      <p className="wa-tag">Conceptual illustration with a made-up file tree, counts and server names. The command is described, not written out.</p>
      <svg
        viewBox="0 0 340 196"
        className="dx-svg wi-svg wa-svg"
        role="img"
        aria-label={`Diagram of an agent on a computer. ${isolated ? 'It sits inside a sandbox that holds only the project folder.' : 'There is no sandbox around it.'} Photos: ${ACCESS_WORD[accessOf('/home/dev/photos')]}. Invoices: ${ACCESS_WORD[accessOf('/home/dev/invoices')]}. Key files: ${ACCESS_WORD[accessOf('/home/dev/.ssh')]}. Servers reachable: ${o.hosts.length} of ${HOSTS.length}.`}
      >
        <rect x={2} y={2} width={336} height={192} rx={14} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.5} />
        <text x={12} y={20} className="wa-t2">Your computer</text>
        {/* sandbox wall */}
        <motion.rect
          x={8} y={30} width={158} height={156} rx={12}
          fill="none" strokeWidth={3} strokeDasharray="7 4"
          initial={false}
          animate={{ stroke: isolated ? GREEN : 'rgba(127,127,127,0.35)', fillOpacity: isolated ? 0.08 : 0 }}
          style={{ fill: GREEN }}
          transition={{ duration: 0.5, ease: EASE }}
        />
        <text x={18} y={48} className="wa-tb" style={{ fill: isolated ? GREEN : 'var(--ink-2)' }}>{isolated ? 'Sandbox' : 'no sandbox'}</text>
        <rect x={20} y={58} width={80} height={40} rx={9} fill="var(--surface)" stroke="currentColor" strokeWidth={1.6} />
        <text x={60} y={75} textAnchor="middle" className="wa-tb">Agent</text>
        <text x={60} y={91} textAnchor="middle" className="wa-t2">runs it</text>
        <rect x={20} y={128} width={134} height={44} rx={9} fill="var(--surface)" stroke="currentColor" strokeWidth={1.6} />
        <text x={87} y={146} textAnchor="middle" className="wa-tb">project/</text>
        <text x={87} y={163} textAnchor="middle" className="wa-t2">intended target</text>
        <line x1={60} y1={98} x2={60} y2={126} stroke={GREEN} strokeWidth={2.2} />
        {/* outside boxes */}
        {OUTSIDE.map((x, i) => {
          const y = 30 + i * 40;
          const c = outStatus(x.path);
          const a = accessOf(x.path);
          return (
            <g key={x.path}>
              <motion.rect x={196} y={y} width={138} height={34} rx={9} strokeWidth={1.8} initial={false} animate={{ stroke: c, fill: c + '26' }} transition={{ duration: 0.4, ease: EASE }} />
              <text x={204} y={y + 14} className="wa-tb">{x.label}</text>
              <text x={204} y={y + 29} className="wa-t2" style={{ fill: c }}>{a === 'none' ? '✓ blocked' : a === 'read' ? '! read only' : '✗ can delete'}</text>
              <motion.line
                x1={100} y1={78} x2={194} y2={y + 17}
                strokeWidth={2.2} strokeDasharray={a === 'none' ? '3 4' : undefined}
                initial={false}
                animate={{ stroke: c, opacity: a === 'none' ? 0.35 : 1 }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            </g>
          );
        })}
        <g>
          {(() => {
            const y = 150;
            const all = o.hosts.length === HOSTS.length;
            const c = all ? RED : GREEN;
            return (
              <>
                <motion.rect x={196} y={y} width={138} height={36} rx={9} strokeWidth={1.8} initial={false} animate={{ stroke: c, fill: c + '26' }} transition={{ duration: 0.4, ease: EASE }} />
                <text x={204} y={y + 14} className="wa-tb">internet</text>
                <text x={204} y={y + 30} className="wa-t2" style={{ fill: c }}>{all ? `✗ all ${HOSTS.length} servers` : `✓ ${o.hosts.length} of ${HOSTS.length} servers`}</text>
                <motion.line x1={100} y1={86} x2={194} y2={y + 18} strokeWidth={2.2} strokeDasharray={all ? undefined : '3 4'} initial={false} animate={{ stroke: c, opacity: all ? 1 : 0.35 }} transition={{ duration: 0.4, ease: EASE }} />
              </>
            );
          })()}
        </g>
      </svg>
      <p className="wa-note" style={{ marginTop: '0.4rem' }}>
        The agent wrote a command that deletes files older than 7 days under a folder it worked out for itself. A bug made that folder <b>{TARGET}</b> (your whole home folder) instead of <b>/home/dev/project/build</b>.
      </p>
      <ul className="wa-tree" aria-label="Which folders the command could reach in this mode">
        {o.rows.map((r, i) => {
          const done = i < shown;
          const inScope = r.node.path.startsWith(TARGET);
          const inProject = r.node.path.startsWith(PROJECT);
          const cls = inProject ? 'is-hold' : r.access === 'write' && r.node.old && inScope ? 'is-bad' : r.access === 'none' ? 'is-good' : 'is-hold';
          return (
            <motion.li
              key={r.node.path}
              className={`wa-node ${cls}`}
              style={{ paddingLeft: `${0.55 + r.node.depth * 0.9}rem` }}
              initial={false}
              animate={{ opacity: done ? 1 : 0.4 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <span className="wa-node-name">
                <b>{r.node.label}</b>
                <small>{r.node.what}</small>
              </span>
              <span className="wa-node-acc">
                {ACCESS_WORD[r.access]}
              </span>
              <span className="wa-node-res">
                {r.node.files === 0 ? '' : !inScope ? 'not in the way' : !done ? '...' : r.deleted > 0 ? `deleted ${fmt(r.deleted)}` : r.refused > 0 ? `refused ${fmt(r.refused)}` : 'nothing'}
              </span>
            </motion.li>
          );
        })}
      </ul>
      <ul className="wa-score" aria-label="Totals for this run">
        <li className={o.deleted <= want + 70 ? 'is-good' : 'is-bad'}>
          Deleted: {fmt(o.deleted)} of {fmt(worst)} possible
        </li>
        <li className={o.refused > 0 ? 'is-good' : 'is-bad'}>Refused: {fmt(o.refused)}</li>
        <li className={o.secretsReadable === 0 ? 'is-good' : 'is-bad'}>Key and token files readable: {o.secretsReadable} of 2</li>
      </ul>
      <details className="wa-numbers">
        <summary>Open the numbers</summary>
        <p className="wa-note" style={{ marginTop: 0 }}>
          Each folder has a made-up count of files older than 7 days: {TREE.filter((n) => n.path.startsWith(TARGET) && n.old).map((n) => `${n.label} ${fmt(n.old)}`).join(', ')}. That sums to {fmt(worst)}, the worst case. The permission list gives each path one of three rights, and the most specific rule wins. A path with no rule gets none. Deleting needs the right to change a folder, so deletions = the old files in every folder the process can change. Without isolation the process has your account's rights over your home folder. In the sandbox it has the project folder and read-only programs, plus whatever extra rule you pick. Real sandboxes (containers, virtual machines, operating-system sandboxes) also restrict the network to an allow-list; here that leaves the one package registry the project needs. Isolation limits the damage of a mistake or of a hijacked agent, and it does not make the code correct.
        </p>
      </details>
    </WhatIfFrame>
  );
}
