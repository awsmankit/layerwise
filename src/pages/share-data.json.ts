import type { APIRoute } from 'astro';
import { getLessons, slugOf, lessonPath } from '../lib/content';
import { extras } from '../data/lesson-extras';
import { glossary } from '../data/glossary';
import { whatifs } from '../data/whatif';
import { predictions } from '../data/whatif/predictions';
import { questions, roles, ilevels } from '../data/interview';
import { answers } from '../data/interview/answers';
import { answerPoints } from '../lib/daily-card';
import type { Pools } from '../lib/daily-card';

/**
 * The material the Daily card page picks from, as one small file. Built with the site, so it grows when lessons,
 * experiments and questions are added. Terms are limited to short definitions that fit on a picture.
 */
export const GET: APIRoute = async () => {
  const lessons = await getLessons();

  const lessonTitleByPath = new Map(lessons.map((l) => [lessonPath(l), l.data.title]));

  const guess: Pools['guess'] = whatifs.flatMap((w) => {
    const p = w.predict ?? predictions[w.slug];
    return p ? [{ slug: w.slug, title: w.title, question: p.question, options: p.options, answer: p.answer, why: p.why }] : [];
  });

  const term: Pools['term'] = glossary
    .filter((g) => g.lesson && g.short.length >= 40 && g.short.length <= 190)
    .map((g) => ({ id: g.id, term: g.term, short: g.short, lesson: g.lesson as string, lessonTitle: lessonTitleByPath.get(g.lesson as string) }));

  const whatif: Pools['whatif'] = whatifs.map((w) => ({ slug: w.slug, title: w.title, blurb: w.blurb, takeaways: w.takeaways }));

  // lessons with at least three clear takeaways that fit on a picture
  const remember: Pools['remember'] = lessons.flatMap((l) => {
    const key = `${l.data.track}/${slugOf(l)}`;
    const ok = (extras[key]?.takeaways ?? []).filter((x) => x.length >= 30 && x.length <= 260);
    if (ok.length < 3) return [];
    return [{ path: lessonPath(l), lesson: l.data.title, takeaways: ok.slice(0, 3) }];
  });

  // a card shows the whole prompt when it fits, otherwise only the closing question (the part that is actually asked)
  const asked = (prompt: string): string | null => {
    if (prompt.length <= 230) return prompt;
    const sentences = prompt.split(/(?<=[.?!])\s+/);
    const last = sentences[sentences.length - 1];
    return last.endsWith('?') && last.length >= 40 && last.length <= 230 ? last : null;
  };
  const interview: Pools['interview'] = questions.flatMap((q) => {
    const shown = asked(q.prompt);
    const a = answers[q.id];
    return shown ? [{ id: q.id, prompt: shown, role: roles[q.roles[0]], level: ilevels[q.level], strong: q.strong.slice(0, 3), ...(a ? { answer: { short: a.short, points: answerPoints(a) } } : {}) }] : [];
  });

  const pools: Pools = { guess, term, whatif, remember, interview };
  return new Response(JSON.stringify(pools), { headers: { 'Content-Type': 'application/json' } });
};
