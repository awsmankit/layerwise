import { useMemo, useState, type ReactNode } from 'react';
import { Root } from '../viz/shared';
import { withBase } from '../../lib/url';
import { roles, roleGroups, ilevels, type ILevel, type Role } from '../../data/interview/types';

export type FinderItem = { id: string; prompt: string; cat: string; roles: Role[]; level: ILevel; topics: string[]; answered: boolean };
export type FinderCategory = { id: string; title: string; style: Record<string, string> };

const PAGE = 40;

/**
 * Search and filters for the interview hub. With nothing typed or chosen, the category cards (passed as
 * children by the page) show. Otherwise a list of matching questions replaces them.
 */
export default function InterviewFinder({ items, categories, children }: { items: FinderItem[]; categories: FinderCategory[]; children: ReactNode }) {
  const [text, setText] = useState('');
  const [group, setGroup] = useState<number | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [level, setLevel] = useState<ILevel | null>(null);
  const [shown, setShown] = useState(PAGE);

  const active = text.trim() !== '' || group !== null || role !== null || level !== null;
  const catOf = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const results = useMemo(() => {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const inGroup = group === null ? null : roleGroups[group].roles;
    const scored: { q: FinderItem; score: number }[] = [];
    for (const q of items) {
      if (role && !q.roles.includes(role)) continue;
      if (!role && inGroup && !q.roles.some((r) => inGroup.includes(r))) continue;
      if (level && q.level !== level) continue;
      const prompt = q.prompt.toLowerCase();
      const extra = `${q.topics.join(' ')} ${catOf[q.cat]?.title ?? ''}`.toLowerCase();
      let score = 0;
      let ok = true;
      for (const w of words) {
        if (prompt.includes(w)) score += 2;
        else if (extra.includes(w)) score += 1;
        else {
          ok = false;
          break;
        }
      }
      if (ok) scored.push({ q, score: score + (q.answered ? 0.5 : 0) });
    }
    return scored.sort((a, b) => b.score - a.score).map((x) => x.q);
  }, [items, text, group, role, level, catOf]);

  const reset = () => {
    setText('');
    setGroup(null);
    setRole(null);
    setLevel(null);
    setShown(PAGE);
  };
  const pick = <T,>(set: (v: T | null) => void, cur: T | null, v: T) => {
    set(cur === v ? null : v);
    setShown(PAGE);
  };

  return (
    <Root>
      <div className="iv-find">
        <label className="iv-search">
          <span>Search the questions</span>
          <input
            type="search"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setShown(PAGE);
            }}
            placeholder="for example: kv cache, rag, drift, prompt injection"
            autoComplete="off"
          />
        </label>
        <div className="iv-filters">
          <div className="iv-filter-row" role="group" aria-label="Filter by role">
            <b>Role</b>
            {roleGroups.map((g, i) => (
              <button
                key={g.label}
                type="button"
                className="iv-pill"
                aria-pressed={group === i}
                onClick={() => {
                  pick(setGroup, group, i);
                  setRole(null);
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
          {group !== null && (
            <div className="iv-filter-row" role="group" aria-label={`Roles in ${roleGroups[group].label}`}>
              <b aria-hidden="true" />
              {roleGroups[group].roles.map((r) => (
                <button key={r} type="button" className="iv-pill is-sub" aria-pressed={role === r} onClick={() => pick(setRole, role, r)}>
                  {roles[r]}
                </button>
              ))}
            </div>
          )}
          <div className="iv-filter-row" role="group" aria-label="Filter by level">
            <b>Level</b>
            {(Object.keys(ilevels) as ILevel[]).map((l) => (
              <button key={l} type="button" className="iv-pill" aria-pressed={level === l} onClick={() => pick(setLevel, level, l)}>
                {ilevels[l]}
              </button>
            ))}
          </div>
        </div>
        <p className="iv-status" aria-live="polite">
          {active ? `${results.length} of ${items.length} questions match.` : `${items.length} questions in ${categories.length} topics.`}
        </p>
        {active && (
          <button type="button" className="btn quiet iv-reset" onClick={reset}>
            Clear search and filters
          </button>
        )}
      </div>

      {!active && children}

      {active && (
        <>
          {results.length === 0 && <p className="iv-empty">Nothing matches that. Try fewer words, or clear the filters.</p>}
          <ul className="iv-results">
            {results.slice(0, shown).map((q) => (
              <li key={q.id} className="iv-result">
                <span className="iv-meta">
                  <span className="iv-chip is-cat" style={catOf[q.cat]?.style}>
                    {catOf[q.cat]?.title}
                  </span>
                  <span className="iv-chip">{ilevels[q.level]}</span>
                </span>
                <a href={withBase(`/interview/q/${q.id}/`)}>{q.prompt}</a>
              </li>
            ))}
          </ul>
          {results.length > shown && (
            <button type="button" className="btn quiet" onClick={() => setShown((s) => s + PAGE)}>
              Show more
            </button>
          )}
        </>
      )}
    </Root>
  );
}
