import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from '../viz/shared';
import { buildSet, scorecardMarkdown, suggestScore, totalMinutes, type ScoreRow } from '../../lib/interview';
import { questions, questionById, roles, ilevels, kinds, rubric, type Question, type Role, type ILevel } from '../../data/interview';

type Sheet = { ticked: boolean[]; follow: boolean[]; flags: boolean[]; score: number | null; notes: string };
const blank = (q: Question): Sheet => ({ ticked: q.strong.map(() => false), follow: q.followUps.map(() => false), flags: q.redFlags.map(() => false), score: null, notes: '' });

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  return {
    role: (p.get('role') as Role | 'any') ?? 'any',
    level: (p.get('level') as ILevel | 'any') ?? 'any',
    minutes: Number(p.get('min')) || 45,
    seed: p.get('seed') ?? '',
    ids: p.get('set')?.split(',').filter((id) => questionById(id)) ?? [],
  };
}

export default function RunInterview() {
  const [role, setRole] = useState<Role | 'any'>('ai-eng');
  const [level, setLevel] = useState<ILevel | 'any'>('mid');
  const [minutes, setMinutes] = useState(45);
  const [seed, setSeed] = useState('round-1');
  const [ids, setIds] = useState<string[]>([]);
  const [sheets, setSheets] = useState<Record<string, Sheet>>({});
  const [copied, setCopied] = useState(false);

  // a link with ?set=... reproduces exactly the same interview
  useEffect(() => {
    const u = readUrl();
    if (u.ids.length) {
      setIds(u.ids);
      if (u.role) setRole(u.role);
      if (u.level) setLevel(u.level);
      setMinutes(u.minutes);
    }
  }, []);

  const set = useMemo(() => ids.map((id) => questionById(id)!).filter(Boolean), [ids]);
  const build = () => {
    const chosen = buildSet(questions, role, level, minutes, `${role}|${level}|${minutes}|${seed}`);
    setIds(chosen.map((q) => q.id));
    setSheets({});
  };
  const swap = (i: number) => {
    const current = set[i];
    const others = buildSet(
      questions.filter((q) => !ids.includes(q.id) && q.kind === current.kind),
      role,
      level,
      current.minutes + 5,
      `${seed}|swap|${current.id}|${Date.now()}`,
    );
    const alt = others[0];
    if (!alt) return;
    setIds((xs) => xs.map((x, k) => (k === i ? alt.id : x)));
  };

  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}?role=${role}&level=${level}&min=${minutes}&set=${ids.join(',')}`;
  const sheet = (q: Question) => sheets[q.id] ?? blank(q);
  const update = (q: Question, patch: Partial<Sheet>) => setSheets((s) => ({ ...s, [q.id]: { ...sheet(q), ...patch } }));

  const rows: ScoreRow[] = set.map((q) => {
    const s = sheet(q);
    return {
      id: q.id,
      prompt: q.prompt,
      score: s.score,
      covered: q.strong.filter((_, i) => s.ticked[i]),
      missed: q.strong.filter((_, i) => !s.ticked[i]),
      flags: q.redFlags.filter((_, i) => s.flags[i]),
      notes: s.notes,
    };
  });
  const title = `Interview scorecard: ${role === 'any' ? 'any role' : roles[role]}, ${level === 'any' ? 'any level' : ilevels[level]}`;
  const md = scorecardMarkdown(title, rows);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the download still works */
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview-scorecard.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Root>
      <div className="iv run">
        <section className="iv-setup viz" aria-label="Build the interview">
          <div className="viz-controls">
            <label className="field">
              <span>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role | 'any')}>
                <option value="any">Any role</option>
                {Object.entries(roles).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Level</span>
              <select value={level} onChange={(e) => setLevel(e.target.value as ILevel | 'any')}>
                <option value="any">Any level</option>
                {Object.entries(ilevels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Length</span>
              <select value={minutes} onChange={(e) => setMinutes(+e.target.value)}>
                {[30, 45, 60, 90].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Set name (same name, same questions)</span>
              <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} className="iv-input" />
            </label>
          </div>
          <div className="iv-setup-foot">
            <p className="gm-note">Every candidate for the same role should get the same set, so scores compare fairly. Nothing you type here is saved or sent: export the scorecard before you close the page.</p>
            <button type="button" className="btn" onClick={build}>
              Build the interview
            </button>
          </div>
        </section>

        {set.length > 0 && (
          <>
            <div className="iv-plan">
              <p className="num">
                <b>{set.length} question{set.length === 1 ? '' : 's'}, {totalMinutes(set)} minutes</b> plus 5 for the candidate’s questions.
                {role !== 'any' && set.some((q) => !q.roles.includes(role)) && <> Some questions come from other roles at this level, because the bank has few for this combination.</>}
              </p>
              <p className="iv-share">
                <span>Link to this exact set:</span> <input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} aria-label="Link to this interview" className="iv-input" />
              </p>
              <button type="button" className="btn quiet" onClick={() => window.print()}>
                Print the interview sheet
              </button>
            </div>

            {set.map((q, i) => {
              const s = sheet(q);
              const covered = s.ticked.filter(Boolean).length;
              const suggested = suggestScore(covered, q.strong.length, s.follow.filter(Boolean).length, false);
              return (
                <motion.article key={q.id} className="iv-q sheet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05, ease: EASE }}>
                  <header className="iv-sheet-head">
                    <span className="iv-n num">{i + 1}</span>
                    <p className="iv-meta">
                      <span className={`iv-chip k-${q.kind}`}>{kinds[q.kind]}</span>
                      <span className="iv-chip">{ilevels[q.level]}</span>
                      <span className="iv-chip num">{q.minutes} min</span>
                    </p>
                    <button type="button" className="btn quiet iv-swap" onClick={() => swap(i)}>
                      Swap question
                    </button>
                  </header>
                  <h2 className="iv-prompt">{q.prompt}</h2>

                  <div className="iv-cols">
                    <div>
                      <h3>Strong answer covers</h3>
                      <ul className="iv-list">
                        {q.strong.map((p, k) => (
                          <li key={p}>
                            <label className={s.ticked[k] ? 'on' : ''}>
                              <input type="checkbox" checked={s.ticked[k]} onChange={(e) => update(q, { ticked: s.ticked.map((v, j) => (j === k ? e.target.checked : v)) })} />
                              <span>{p}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                      <h3>Red flags</h3>
                      <ul className="iv-list flags">
                        {q.redFlags.map((f, k) => (
                          <li key={f}>
                            <label className={s.flags[k] ? 'on' : ''}>
                              <input type="checkbox" checked={s.flags[k]} onChange={(e) => update(q, { flags: s.flags.map((v, j) => (j === k ? e.target.checked : v)) })} />
                              <span>{f}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3>Follow-ups, in order</h3>
                      <ol className="iv-follow">
                        {q.followUps.map((f, k) => (
                          <li key={f.q}>
                            <b>{f.q}</b>
                            <p>
                              <span>Look for:</span> {f.lookFor}
                            </p>
                            <label className={s.follow[k] ? 'on' : ''}>
                              <input type="checkbox" checked={s.follow[k]} onChange={(e) => update(q, { follow: s.follow.map((v, j) => (j === k ? e.target.checked : v)) })} />
                              <span>Answered well</span>
                            </label>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <h3>Score</h3>
                  <p className="gm-note num">
                    Suggested from what you ticked: {suggested} ({rubric[suggested - 1].label}). Red flags that would cause harm in production should pull the score down; that is your call.
                  </p>
                  <div className="iv-rubric" role="radiogroup" aria-label={`Score for question ${i + 1}`}>
                    {rubric.map((r) => (
                      <button key={r.score} type="button" role="radio" aria-checked={s.score === r.score} className={`iv-score${s.score === r.score ? ' is-on' : ''}${suggested === r.score ? ' is-suggested' : ''}`} onClick={() => update(q, { score: r.score })}>
                        <b className="num">{r.score}</b>
                        <span>{r.label}</span>
                        <small>{r.meaning}</small>
                      </button>
                    ))}
                  </div>
                  <label className="iv-notes">
                    <span>Evidence for your score (what they said, not your impression)</span>
                    <textarea rows={3} value={s.notes} onChange={(e) => update(q, { notes: e.target.value })} />
                  </label>
                </motion.article>
              );
            })}

            <section className="iv-export viz" aria-label="Scorecard">
              <h2>Scorecard</h2>
              <p className="num">
                Scored {rows.filter((r) => r.score !== null).length} of {rows.length}.{' '}
                {rows.some((r) => r.score !== null) && <>Average {(rows.filter((r) => r.score !== null).reduce((n, r) => n + (r.score ?? 0), 0) / rows.filter((r) => r.score !== null).length).toFixed(1)} of 4.</>}
              </p>
              <div className="gm-result-actions">
                <button type="button" className="btn" onClick={copy}>
                  {copied ? 'Copied' : 'Copy as Markdown'}
                </button>
                <button type="button" className="btn quiet" onClick={download}>
                  Download .md
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </Root>
  );
}
