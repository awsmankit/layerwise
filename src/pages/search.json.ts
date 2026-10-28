import type { APIRoute } from 'astro';
import { getLessons, lessonPath, getPulse } from '../lib/content';
import { glossary } from '../data/glossary';
import { games } from '../data/games';
import { tracks } from '../data/tracks';
import type { SearchItem } from '../lib/search';
import { questions, kinds } from '../data/interview';
import { searchPages } from '../data/search-pages';
import { labs } from '../data/labs';
import { libraries, categoryLabels } from '../data/libraries';
import { cases } from '../data/cases';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const u = (path: string) => `${base}${path}`;

export const GET: APIRoute = async () => {
  const lessons = await getLessons();
  const pulse = await getPulse();
  const trackTitle = Object.fromEntries(tracks.map((t) => [t.id, t.title]));

  const items: SearchItem[] = [
    ...lessons.map((l) => ({ t: l.data.title, u: u(lessonPath(l)), k: 'Lesson', s: `${trackTitle[l.data.track]}. ${l.data.summary}` })),
    ...glossary.map((g) => ({ t: g.term, u: u(`/glossary/#${g.id}`), k: 'Term', s: g.short })),
    ...games.map((g) => ({ t: g.title, u: u(g.href), k: 'Game', s: `${g.tagline}. ${g.blurb}` })),
    ...searchPages.map((p) => ({ ...p, u: u(p.u) })),
    ...labs.map((l) => ({ t: l.title, u: u(`/practice/${l.id}/`), k: 'Lab', s: `${l.goal.split(/(?<=\.)\s/)[0]} ${l.minutes} minutes, ${l.level}.` })),
    ...libraries.map((b) => ({ t: b.name, u: u('/libraries/'), k: 'Library', s: `${categoryLabels[b.category]}. ${b.what}` })),
    ...cases.map((c) => ({ t: c.title, u: u('/cases/'), k: 'Case study', s: `${c.company}. ${c.learn ?? 'Link only.'}` })),
    ...pulse.map((p) => ({ t: p.data.title, u: u(`/pulse/${p.id}/`), k: 'News', s: p.data.tags.join(', ') })),
    ...questions.map((q) => ({ t: q.prompt, u: u(`/interview/q/${q.id}/`), k: 'Interview', s: `${kinds[q.kind]}. ${q.topics.join(', ')}` })),
  ];

  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
};
