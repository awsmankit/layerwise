import { describe, expect, it } from 'vitest';
import { parseFeed, pick, plain, safeLink, windowDays } from './feed-lib.mjs';
import { sources } from './feed-sources.mjs';

const rss = `<rss><channel>
<item><title><![CDATA[Bedrock &amp; AgentCore: new <b>agents</b>]]></title><link>https://aws.amazon.com/about-aws/whats-new/2026/10/a/?utm_source=x&amp;id=3</link><pubDate>Tue, 27 Oct 2026 15:00:00 GMT</pubDate><description>Run agents</description></item>
<item><title>Evil</title><link>https://evil.example.com/x</link><pubDate>Tue, 27 Oct 2026 15:00:00 GMT</pubDate></item>
<item><title>Insecure</title><link>http://aws.amazon.com/x</link><pubDate>Tue, 27 Oct 2026 15:00:00 GMT</pubDate></item>
<item><title>Old</title><link>https://aws.amazon.com/old</link><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item>
<item><title>Unrelated cooking news</title><link>https://aws.amazon.com/cook</link><pubDate>Tue, 27 Oct 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;

const atom = (titles) => `<feed>${titles.map((t, i) => `<entry><title>${t}</title><link rel="alternate" type="text/html" href="https://github.com/x/y/releases/tag/${i}"/><updated>2026-10-2${i}T10:00:00Z</updated></entry>`).join('')}</feed>`;
const now = Date.parse('2026-10-28T00:00:00Z');
const src = (id) => sources.find((s) => s.id === id);

describe('feed reading', () => {
  it('turns escaped and CDATA markup in a title into plain text', () => {
    expect(plain('<![CDATA[Bedrock &amp; AgentCore: new <b>agents</b>]]>')).toBe('Bedrock & AgentCore: new agents');
    expect(plain('&lt;script&gt;alert(1)&lt;/script&gt; hi')).toBe('alert(1) hi');
  });

  it('parses RSS items and Atom entries', () => {
    expect(parseFeed(rss)).toHaveLength(5);
    const a = parseFeed(atom(['v1.0.0']));
    expect(a[0]).toMatchObject({ title: 'v1.0.0', link: 'https://github.com/x/y/releases/tag/0' });
    expect(a[0].date).toBe('2026-10-20T10:00:00.000Z');
  });

  it('keeps only https links on the source’s own hosts, and removes tracking parameters', () => {
    expect(safeLink('https://aws.amazon.com/a?utm_source=x&id=3', ['aws.amazon.com'])).toBe('https://aws.amazon.com/a?id=3');
    expect(safeLink('https://evil.example.com/a', ['aws.amazon.com'])).toBe('');
    expect(safeLink('http://aws.amazon.com/a', ['aws.amazon.com'])).toBe('');
    expect(safeLink('javascript:alert(1)', ['aws.amazon.com'])).toBe('');
    expect(safeLink('https://aws.amazon.com.evil.com/a', ['aws.amazon.com'])).toBe('');
  });

  it('applies a source’s topic filter, age limit and link rule', () => {
    const got = pick(src('aws-whats-new'), parseFeed(rss), now);
    expect(got.map((g) => g.title)).toEqual(['Bedrock & AgentCore: new agents']);
    expect(got[0].url).toBe('https://aws.amazon.com/about-aws/whats-new/2026/10/a/?id=3');
  });

  it('lists releases but not release candidates or other packages', () => {
    const vllm = pick({ ...src('vllm'), max: 5 }, parseFeed(atom(['v0.32.0rc3: [Bugfix] x', 'v0.32.0', 'v0.33.0rc0'])), now);
    expect(vllm.map((v) => v.title)).toEqual(['vLLM v0.32.0']);
    const lc = pick({ ...src('langchain'), max: 5 }, parseFeed(atom(['langchain-anthropic==1.7.7', 'langchain==1.4.7'])), now);
    expect(lc.map((v) => v.title)).toEqual(['LangChain langchain==1.4.7']);
    const mcp = pick({ ...src('mcp'), max: 5 }, parseFeed(atom(['2026-07-28 RC', '2026-07-28'])), now);
    expect(mcp.map((v) => v.title)).toEqual(['MCP spec 2026-07-28']);
  });

  it('shows a month of news and three months of releases', () => {
    expect(windowDays(src('aws-whats-new'))).toBe(30);
    expect(windowDays(src('vllm'))).toBe(90);
    const old = `<rss><channel><item><title>AI agent news</title><link>https://aws.amazon.com/a</link><pubDate>Mon, 01 Sep 2026 00:00:00 GMT</pubDate></item></channel></rss>`;
    expect(pick(src('aws-whats-new'), parseFeed(old), now)).toHaveLength(0); // 57 days old
    expect(pick(src('aws-ml-blog'), parseFeed(old.replace('Sep 2026', 'Oct 2026')), now)).toHaveLength(1);
  });

  it('only allows https feed sources', () => {
    for (const s of sources) expect(s.url.startsWith('https://'), s.id).toBe(true);
  });
});
