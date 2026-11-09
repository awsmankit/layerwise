import { describe, expect, it } from 'vitest';
import { CYCLE, KIND_LABEL, cardForDay, clip, dayIndexFromIso, dayIndexOf, fitBullets, fitText, isoOf, shuffled, slotFor, type Pools } from './daily-card';

const mk = (n: number, f: (i: number) => object) => Array.from({ length: n }, (_, i) => f(i));
const pools: Pools = {
  guess: mk(10, (i) => ({ slug: `g${i}`, title: `What if g${i}?`, question: `Question ${i}?`, options: [`one ${i}`, `two ${i}`, `three ${i}`], answer: (i % 3) as 0 | 1 | 2, why: `Because ${i}.` })) as Pools['guess'],
  term: mk(12, (i) => ({ id: `t${i}`, term: `Term ${i}`, short: `Short ${i}.`, lesson: `/learn/start/l${i}/` })) as Pools['term'],
  whatif: mk(9, (i) => ({ slug: `w${i}`, title: `What if w${i}?`, blurb: `Blurb ${i}.`, takeaways: [`Take ${i} one.`, `Take ${i} two.`, `Take ${i} three.`, `Take ${i} four.`] })) as Pools['whatif'],
  remember: mk(11, (i) => ({ path: `/learn/start/r${i}/`, lesson: `Lesson ${i}`, takeaways: [`Remember ${i} a.`, `Remember ${i} b.`, `Remember ${i} c.`] })) as Pools['remember'],
  interview: mk(8, (i) => ({ id: `q${i}`, prompt: `Prompt ${i}?`, role: 'AI engineer', level: 'Mid-level', strong: [`Point ${i} a.`, `Point ${i} b.`, `Point ${i} c.`] })) as Pools['interview'],
};
const URL = 'https://example.org/site';

describe('day indexes', () => {
  it('counts calendar days from 1 January 2026', () => {
    expect(dayIndexOf(2026, 1, 1)).toBe(0);
    expect(dayIndexOf(2026, 11, 8)).toBe(311);
    expect(isoOf(311)).toBe('2026-11-08');
    expect(dayIndexFromIso('2027-01-01')).toBe(365);
  });
});

describe('the weekly rhythm', () => {
  it('follows the cycle', () => {
    for (let d = 0; d < 21; d++) expect(slotFor(d).kind).toBe(CYCLE[d % 7]);
  });
  it('counts occurrences without gaps or repeats within a kind', () => {
    const seen: Record<string, number[]> = {};
    for (let d = 0; d < 70; d++) (seen[slotFor(d).kind] ||= []).push(slotFor(d).occurrence);
    for (const occ of Object.values(seen)) expect(occ).toEqual(occ.map((_, i) => i));
  });
});

describe('cardForDay', () => {
  it('is the same card for the same day, every time', () => {
    for (let d = 300; d < 330; d++) expect(cardForDay(d, pools, URL)).toEqual(cardForDay(d, pools, URL));
  });
  it('shows every kind in a week and labels it', () => {
    const kinds = new Set<string>();
    for (let d = 0; d < 7; d++) {
      const c = cardForDay(d, pools, URL)!;
      kinds.add(c.kind);
      expect(c.label).toBe(KIND_LABEL[c.kind]);
    }
    expect([...kinds].sort()).toEqual(['guess', 'interview', 'remember', 'term', 'whatif']);
  });
  it('does not repeat an item until its pool is used up', () => {
    const titles: string[] = [];
    for (let d = 0; d < 7 * 5; d++) {
      const c = cardForDay(d, pools, URL)!;
      if (c.kind === 'whatif') titles.push(c.title);
    }
    expect(new Set(titles).size).toBe(titles.length); // 5 weeks, 9 items
  });
  it('puts the site address in every caption and keeps the answer out of guess captions', () => {
    for (let d = 0; d < 14; d++) {
      const c = cardForDay(d, pools, URL)!;
      expect(c.caption).toContain(URL + c.path);
      expect(c.caption).toMatch(/#AI/);
      expect(c.alt.length).toBeGreaterThan(20);
      if (c.kind === 'guess') {
        expect(c.options).toHaveLength(3);
        expect(c.options[0]).toMatch(/^A\) /);
        expect(c.firstComment).toMatch(/^Answer: [ABC]\) /);
        expect(c.caption).not.toContain('Answer: ');
        expect(c.caption).toContain('Answer in the first comment');
      } else expect(c.firstComment).toBe('');
    }
  });
  it('gives the first comment the right answer', () => {
    const c = cardForDay(0, pools, URL)!;
    expect(c.kind).toBe('guess');
    const g = pools.guess.find((x) => x.question === c.title)!;
    expect(c.firstComment).toContain(`Answer: ${'ABC'[g.answer]}) ${g.options[g.answer]}`);
    expect(c.firstComment).toContain(g.why);
  });
  it('returns null when a pool is empty', () => {
    expect(cardForDay(0, { ...pools, guess: [] }, URL)).toBeNull();
  });
  it('handles days before the start date', () => {
    expect(cardForDay(-3, pools, URL)).not.toBeNull();
  });
});

describe('cards teach something', () => {
  it('gives experiment, lesson and interview cards up to three real points', () => {
    for (let d = 0; d < 21; d++) {
      const c = cardForDay(d, pools, URL)!;
      if (c.kind === 'whatif' || c.kind === 'remember' || c.kind === 'interview') {
        expect(c.bullets.length).toBe(3);
        expect(c.bulletsHeading.length).toBeGreaterThan(5);
        for (const b of c.bullets) expect(c.caption).toContain(`• ${b}`);
      } else expect(c.bullets).toEqual([]);
    }
  });
  it('names the lesson in a term card footer when it is known', () => {
    const withTitle: Pools = { ...pools, term: pools.term.map((t) => ({ ...t, lessonTitle: 'How models learn' })) };
    const c = cardForDay(1, withTitle, URL)!;
    expect(c.kind).toBe('term');
    expect(c.footer).toBe('Learn more: How models learn');
  });
});

describe('text helpers', () => {
  it('fits bullet points under one font size and wraps them with an indent', () => {
    const measure = (line: string, size: number) => line.length * size * 0.5;
    const items = ['alpha beta gamma delta epsilon zeta eta theta', 'one two three four five six seven eight nine ten', 'short'];
    const r = fitBullets(items, 300, 260, { max: 36, min: 14, indent: 30 }, measure);
    expect(r.fits).toBe(true);
    expect(r.blocks).toHaveLength(3);
    const h = r.blocks.reduce((a, b) => a + b.length * r.lineHeight, 0) + r.gap * 2;
    expect(h).toBeLessThanOrEqual(260 + 0.001);
    for (const b of r.blocks) for (const l of b) expect(measure(l, r.size)).toBeLessThanOrEqual(300 - 30);
    const tiny = fitBullets(['word '.repeat(300)], 200, 40, { max: 30, min: 20 }, measure);
    expect(tiny.fits).toBe(false);
    expect(tiny.size).toBe(20);
  });
  it('clips at a word and adds an ellipsis only when needed', () => {
    expect(clip('short text', 50)).toBe('short text');
    const out = clip('one two three four five six seven eight nine ten', 24);
    expect(out.length).toBeLessThanOrEqual(24);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
  it('shuffles by a stable hash', () => {
    const a = shuffled(pools.term, (t) => t.id).map((t) => t.id);
    const b = shuffled([...pools.term].reverse(), (t) => t.id).map((t) => t.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });
  it('fits text by shrinking the font and wrapping at the width', () => {
    const measure = (line: string, size: number) => line.length * size * 0.5;
    const r = fitText('aaaa bbbb cccc dddd eeee ffff gggg hhhh', 200, 120, { max: 40, min: 12, step: 2 }, measure);
    expect(r.fits).toBe(true);
    expect(r.lines.length * r.lineHeight).toBeLessThanOrEqual(120 + 0.001);
    for (const l of r.lines) expect(measure(l, r.size)).toBeLessThanOrEqual(200);
    const tiny = fitText('word '.repeat(200), 100, 30, { max: 30, min: 20 }, measure);
    expect(tiny.fits).toBe(false);
    expect(tiny.size).toBe(20);
  });
});

describe('cards from written interview answers', () => {
  it('turns a written answer into three whole sentences that fit', async () => {
    const { answers } = await import('../data/interview/answers');
    const { answerPoints } = await import('./daily-card');
    for (const [id, a] of Object.entries(answers)) {
      const pts = answerPoints(a);
      expect(pts.length, id).toBe(3);
      for (const p of pts) expect(p.length).toBeLessThanOrEqual(135);
    }
  });
  it('uses the written answer for the bullets and the old points otherwise', () => {
    const withAnswer: Pools = {
      ...pools,
      interview: pools.interview.map((q, i) => (i === 0 ? { ...q, answer: { short: 'A written short answer.', points: ['First written point here.', 'Second written point here.', 'Third written point here.'] } } : q)),
    };
    const first = pools.interview.map((q) => q.id);
    const cards = Array.from({ length: 70 }, (_, d) => cardForDay(d, withAnswer, URL)!).filter((c) => c.kind === 'interview');
    const written = cards.filter((c) => c.bulletsHeading === 'The short answer');
    expect(written.length).toBeGreaterThan(0);
    for (const c of written) {
      expect(c.bullets).toEqual(['First written point here.', 'Second written point here.', 'Third written point here.']);
      expect(c.caption).toContain('The full answer, with a diagram');
      expect(c.path).toContain(first[0]);
    }
    expect(cards.some((c) => c.bulletsHeading === 'A strong answer covers')).toBe(true);
  });
});
