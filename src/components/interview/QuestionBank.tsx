import { useMemo, useState } from 'react';
import { Root } from '../viz/shared';
import { useStore } from '../../lib/store';
import { withBase } from '../../lib/url';
import { roles, ilevels, kinds, type Role, type ILevel, type Kind } from '../../data/interview/types';

type Item = { id: string; prompt: string; roles: Role[]; level: ILevel; kind: Kind; topics: string[]; minutes: number };
type History = Record<string, { score: number; at: number }[]>;

/** Filterable list of every question, with your last practice score if you have one. */
export default function QuestionBank({ items }: { items: Item[] }) {
  const [history] = useStore<History>('layerwise:interview', {});
  const [role, setRole] = useState<Role | 'any'>('any');
  const [level, setLevel] = useState<ILevel | 'any'>('any');
  const [kind, setKind] = useState<Kind | 'any'>('any');
  const [text, setText] = useState('');

  const shown = useMemo(() => {
    const t = text.trim().toLowerCase();
    return items.filter(
      (q) =>
        (role === 'any' || q.roles.includes(role)) &&
        (level === 'any' || q.level === level) &&
        (kind === 'any' || q.kind === kind) &&
        (!t || q.prompt.toLowerCase().includes(t) || q.topics.some((x) => x.includes(t))),
    );
  }, [items, role, level, kind, text]);

  return (
    <Root>
      <div className="qb">
        <div className="viz-controls qb-filters">
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
            <span>Kind</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind | 'any')}>
              <option value="any">Any kind</option>
              {Object.entries(kinds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Topic or word</span>
            <input type="search" className="iv-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="for example: rag, kv cache, lora" />
          </label>
        </div>
        <p className="gm-note num">
          Showing {shown.length} of {items.length}.
        </p>
        <ul className="rows qb-list">
          {shown.map((q) => {
            const h = history[q.id];
            const last = h?.[h.length - 1];
            return (
              <li key={q.id}>
                <a className="row qb-row" href={withBase(`/interview/q/${q.id}/`)}>
                  <span className="qb-meta">
                    <span className={`iv-chip k-${q.kind}`}>{kinds[q.kind]}</span>
                    <span className="iv-chip">{ilevels[q.level]}</span>
                  </span>
                  <span className="qb-prompt">{q.prompt}</span>
                  <span className="meta num">
                    {q.minutes} min
                    {last && <em className={last.score <= 2 ? 'weak' : 'ok'}> · last {last.score}/4</em>}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </Root>
  );
}
