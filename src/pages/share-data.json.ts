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

  // the track of the first linked lesson, e.g. ['serving/kv-cache'] gives 'serving'
  const trackOfKeys = (keys?: string[]) => keys?.[0]?.split('/')[0];

  const lessonTitleByPath = new Map(lessons.map((l) => [lessonPath(l), l.data.title]));

  const guess: Pools['guess'] = whatifs.flatMap((w) => {
    const p = w.predict ?? predictions[w.slug];
    return p ? [{ slug: w.slug, track: trackOfKeys(w.lessons), title: w.title, question: p.question, options: p.options, answer: p.answer, why: p.why }] : [];
  });

  // A term card adds one point from its lesson. Each point goes to one term at most, a point that names the term is
  // preferred, and the first two points are left out because the lesson's Remember card shows them. A term with no
  // point left shows its definition alone, so no two cards ever show the same point.
  const usedPoints = new Set<string>();
  const term: Pools['term'] = glossary
    .filter((g) => g.lesson && g.short.length >= 40 && g.short.length <= 190)
    .map((g) => {
      const key = (g.lesson as string).replace(/^\/learn\//, '').replace(/\/$/, '');
      const free = (extras[key]?.takeaways ?? []).slice(2).filter((x) => x.length >= 30 && x.length <= 140 && !usedPoints.has(x));
      const names = [g.term, ...(g.aka ?? [])].map((x) => x.toLowerCase());
      const pick = free.find((x) => names.some((nm) => x.toLowerCase().includes(nm))) ?? free[0];
      if (pick) usedPoints.add(pick);
      return { id: g.id, track: key.split('/')[0], term: g.term, short: g.short, lesson: g.lesson as string, lessonTitle: lessonTitleByPath.get(g.lesson as string), ...(pick ? { more: [pick] } : {}) };
    });

  const whatif: Pools['whatif'] = whatifs.map((w) => ({ slug: w.slug, track: trackOfKeys(w.lessons), title: w.title, blurb: w.blurb, takeaways: w.takeaways }));

  // lessons with at least three clear takeaways that fit on a picture
  const remember: Pools['remember'] = lessons.flatMap((l) => {
    const key = `${l.data.track}/${slugOf(l)}`;
    const ok = (extras[key]?.takeaways ?? []).filter((x) => x.length >= 30 && x.length <= 260);
    if (ok.length < 3) return [];
    return [{ path: lessonPath(l), track: l.data.track, lesson: l.data.title, takeaways: ok.slice(0, 3) }];
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
    return shown ? [{ id: q.id, track: trackOfKeys(q.lessons), prompt: shown, role: roles[q.roles[0]], level: ilevels[q.level], strong: q.strong.slice(0, 3), ...(a ? { answer: { short: a.short, points: answerPoints(a) } } : {}) }] : [];
  });

  const pools: Pools = { guess, term, whatif, remember, interview };
  return new Response(JSON.stringify(pools), { headers: { 'Content-Type': 'application/json' } });
};
