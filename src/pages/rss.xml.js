import rss from '@astrojs/rss';
import { getLessons, getPulse, lessonPath } from '../lib/content';
import { site } from '../site';

/** News notes and lessons together, newest first, so the feed shows everything that changed. */
export async function GET(context) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const news = (await getPulse()).map((e) => ({
    title: e.data.title,
    pubDate: e.data.date,
    link: `${base}/pulse/${e.id}/`,
    categories: ['News', ...e.data.tags],
  }));
  const lessons = (await getLessons()).map((l) => ({
    title: `Lesson: ${l.data.title}`,
    pubDate: l.data.updated,
    description: l.data.summary,
    link: `${base}${lessonPath(l)}`,
    categories: ['Lesson', l.data.track, l.data.level],
  }));
  return rss({
    title: `${site.name}: news and lessons`,
    description: site.description,
    site: context.site,
    items: [...news, ...lessons].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()),
  });
}
