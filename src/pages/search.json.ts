import type { APIRoute } from 'astro';
import { getLessons, lessonPath, getPulse } from '../lib/content';
import { glossary } from '../data/glossary';
import { games } from '../data/games';
import { tracks } from '../data/tracks';
import type { SearchItem } from '../lib/search';
import { questions, kinds } from '../data/interview';

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
    { t: 'Cost calculator', u: u('/tools/cost/'), k: 'Tool', s: 'Estimate monthly spend from traffic and token counts.' },
    { t: 'Model memory calculator', u: u('/tools/memory/'), k: 'Tool', s: 'Weights plus KV cache against device memory.' },
    { t: 'GPU explorer', u: u('/tools/gpu/'), k: 'Tool', s: 'Which accelerators hold a model, how many users fit and how fast each decodes.' },
    { t: 'API or your own GPUs?', u: u('/tools/breakeven/'), k: 'Tool', s: 'Break-even between API pricing and self-hosted GPUs.' },
    { t: 'Latency budget', u: u('/tools/latency/'), k: 'Tool', s: 'Cloud versus on-device inference against a time budget.' },
    { t: 'Choose a path', u: u('/start/'), k: 'Page', s: 'Find your starting point and get a learning path.' },
    { t: 'Glossary', u: u('/glossary/'), k: 'Page', s: 'Every term used on the site, in plain English.' },
    ...pulse.map((p) => ({ t: p.data.title, u: u(`/pulse/${p.id}/`), k: 'News', s: p.data.tags.join(', ') })),
    ...questions.map((q) => ({ t: q.prompt, u: u(`/interview/q/${q.id}/`), k: 'Interview', s: `${kinds[q.kind]}. ${q.topics.join(', ')}` })),
    { t: 'Interview prep', u: u('/interview/'), k: 'Page', s: 'Practise AI interviews or run them with a shared rubric.' },
    { t: 'Your progress', u: u('/progress/'), k: 'Page', s: 'Lessons done, quiz scores, revision and a mixed review.' },
    { t: 'For teachers', u: u('/teach/'), k: 'Page', s: 'Course plans and classroom activities.' },
  ];

  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
};
