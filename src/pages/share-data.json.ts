import type { APIRoute } from 'astro';
import { getLessons, slugOf, lessonPath } from '../lib/content';
import { extras } from '../data/lesson-extras';
import { glossary } from '../data/glossary';
import { whatifs } from '../data/whatif';
import { predictions } from '../data/whatif/predictions';
import { questions, roles, ilevels } from '../data/interview';
import { hash, type Pools } from '../lib/daily-card';

/**
 * The material the Daily card page picks from, as one small file. Built with the site, so it grows when lessons,
 * experiments and questions are added. Terms are limited to short definitions that fit on a picture.
 */
export const GET: APIRoute = async () => {
  const lessons = await getLessons();

  const guess: Pools['guess'] = whatifs.flatMap((w) => {
    const p = w.predict ?? predictions[w.slug];
    return p ? [{ slug: w.slug, title: w.title, question: p.question, options: p.options, answer: p.answer, why: p.why }] : [];
  });

  const term: Pools['term'] = glossary
    .filter((g) => g.lesson && g.short.length >= 40 && g.short.length <= 190)
    .map((g) => ({ id: g.id, term: g.term, short: g.short, lesson: g.lesson as string }));

  const whatif: Pools['whatif'] = whatifs.map((w) => ({ slug: w.slug, title: w.title, blurb: w.blurb, takeaway: w.takeaways[0] }));

  // one takeaway per lesson, picked by a hash of the lesson so it is stable
  const remember: Pools['remember'] = lessons.flatMap((l) => {
    const key = `${l.data.track}/${slugOf(l)}`;
    const t = extras[key]?.takeaways ?? [];
    const ok = t.filter((x) => x.length >= 30 && x.length <= 230);
    if (!ok.length) return [];
    return [{ path: lessonPath(l), lesson: l.data.title, takeaway: ok[hash(key) % ok.length] }];
  });

  const interview: Pools['interview'] = questions
    .filter((q) => q.prompt.length <= 260)
    .map((q) => ({ id: q.id, prompt: q.prompt, role: roles[q.roles[0]], level: ilevels[q.level] }));

  const pools: Pools = { guess, term, whatif, remember, interview };
  return new Response(JSON.stringify(pools), { headers: { 'Content-Type': 'application/json' } });
};
