import { useState } from 'react';
import { Root } from '../viz/shared';

export type Headline = { source: string; org: string; topic: string; title: string; url: string; date: string };

const LIMIT = 30;

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * Headlines copied from official feeds, newest first, with a topic filter. These are
 * not reviewed by us: each is a title, a date, and a link to the source.
 */
export default function Headlines({ items, topics }: { items: Headline[]; topics: Record<string, string> }) {
  const [topic, setTopic] = useState<string>('all');
  const [text, setText] = useState('');
  const [all, setAll] = useState(false);
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const matching = items.filter((i) => (topic === 'all' || i.topic === topic) && words.every((w) => `${i.title} ${i.org}`.toLowerCase().includes(w)));
  const searching = words.length > 0 || topic !== 'all';
  const shown = searching || all ? matching : matching.slice(0, LIMIT);
  const present = Object.keys(topics).filter((t) => items.some((i) => i.topic === t));

  return (
    <Root>
      <div role="group" aria-label="Filter headlines by topic" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '1rem 0' }}>
        <button type="button" className="btn quiet" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>
          All ({items.length})
        </button>
        {present.map((t) => (
          <button key={t} type="button" className="btn quiet" aria-pressed={topic === t} onClick={() => setTopic(t)}>
            {topics[t]} ({items.filter((i) => i.topic === t).length})
          </button>
        ))}
      </div>
      <div className="viz-controls" style={{ marginBottom: '1rem' }}>
        <label className="field">
          <span>Search the headlines</span>
          <input type="search" className="iv-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="for example: copilot, bedrock, vllm" />
        </label>
        {(text || topic !== 'all') && (
          <button type="button" className="btn quiet" style={{ alignSelf: 'end' }} onClick={() => { setText(''); setTopic('all'); }}>
            Clear
          </button>
        )}
      </div>
      <p role="status" className="viz-cap" style={{ margin: '0 0 0.8rem' }}>
        {searching ? `${matching.length} of ${items.length} headlines match.` : `Showing ${shown.length} of ${items.length} headlines.`}
      </p>
      {shown.length === 0 && <p>No headlines match. Try one word, or clear the search.</p>}
      <ul className="rows" aria-live="polite">
        {shown.map((h) => (
          <li key={h.url}>
            <a className="row pulse-row" href={h.url} target="_blank" rel="noopener noreferrer">
              <span className="meta">{day(h.date)}</span>
              <div>
                <h3>
                  {h.title}
                  <span className="sr-only"> (opens {h.org} in a new tab)</span>
                </h3>
                <p className="tags">
                  <span>{h.org}</span>
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
      {!searching && !all && matching.length > LIMIT && (
        <p style={{ marginTop: '1rem' }}>
          <button type="button" className="btn quiet" onClick={() => setAll(true)}>
            Show all {matching.length}
          </button>
        </p>
      )}
    </Root>
  );
}
