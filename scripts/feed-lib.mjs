/**
 * Reads RSS and Atom feeds without a dependency. Feed text is untrusted: titles are
 * reduced to plain text and shortened, and a link is kept only if it is https and
 * points at one of the source's own hosts.
 */

const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };

export function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => entities[n.toLowerCase()] ?? m);
}

/** Plain text from a possibly HTML-escaped fragment. */
export function plain(s = '') {
  const once = decode(s);
  // some feeds escape their markup inside a title, so decode once more before stripping tags
  return decode(once.replace(/<[^>]*>/g, ' ')).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : '';
};

/** Items from an RSS or Atom document: { title, link, date (ISO or ''), summary }. */
export function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  return blocks.map((b) => {
    const href =
      b.match(/<link[^>]*\srel=["']alternate["'][^>]*\shref=["']([^"']+)["']/i)?.[1] ??
      b.match(/<link[^>]*\shref=["']([^"']+)["'][^>]*\srel=["']alternate["']/i)?.[1] ??
      b.match(/<link[^>]*\shref=["']([^"']+)["']/i)?.[1];
    const link = plain(href ?? tag(b, 'link') ?? '') || plain(tag(b, 'guid'));
    const raw = plain(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'));
    const t = raw ? new Date(raw) : null;
    return {
      title: plain(tag(b, 'title')),
      link,
      date: t && !Number.isNaN(t.getTime()) ? t.toISOString() : '',
      summary: plain(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 400),
    };
  });
}

/** https only, on an allowed host, with tracking parameters removed. Returns '' if the link is not acceptable. */
export function safeLink(link, hosts) {
  try {
    const u = new URL(link);
    if (u.protocol !== 'https:') return '';
    if (!hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))) return '';
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$)/i.test(k)) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return '';
  }
}

/** How many days back a source's entries are shown: a month of news, three months of releases. */
export const windowDays = (source) => source.maxAgeDays ?? (source.release ? 90 : 30);

const PRERELEASE = /(^|[^a-z])(rc|alpha|beta|nightly|dev|preview)\d*($|[^a-z])/i;

/** Turn one source's parsed items into the entries the site keeps. */
export function pick(source, items, now = Date.now()) {
  const maxAge = windowDays(source) * 864e5;
  const out = [];
  for (const it of items) {
    if (!it.title || !it.date) continue;
    const t = Date.parse(it.date);
    if (t > now + 864e5 || now - t > maxAge) continue;
    if (source.keep && !source.keep.test(`${it.title} ${it.summary}`)) continue;
    if (source.release && (PRERELEASE.test(it.title) || (source.accept && !source.accept.test(it.title)))) continue;
    const url = safeLink(it.link, source.hosts);
    if (!url) continue;
    const title = (source.prefix ? `${source.prefix} ${it.title}` : it.title).slice(0, 150);
    out.push({ source: source.id, org: source.name, topic: source.topic, title, url, date: it.date });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, source.max);
}
