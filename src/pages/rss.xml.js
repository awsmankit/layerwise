import rss from '@astrojs/rss';
import { getPulse } from '../lib/content';
import { site } from '../site';

export async function GET(context) {
  const entries = await getPulse();
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return rss({
    title: `${site.name} Pulse`,
    description: site.description,
    site: context.site,
    items: entries.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date,
      link: `${base}/pulse/${e.id}/`,
    })),
  });
}
