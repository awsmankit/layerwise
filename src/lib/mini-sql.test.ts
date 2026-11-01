import { describe, expect, it } from 'vitest';
import { exactMatch, guardSql, judge, normaliseSql, parseSelect, runSql, sameRows, type Db } from './mini-sql';
import { ALLOWED_TABLES, MAIN, QUESTIONS, VARIANT } from './sql-workbench-data';

const rows = (db: Db, sql: string) => {
  const r = runSql(db, sql);
  if (!r.ok) throw new Error(r.error);
  return r.result.rows;
};

describe('mini SQL evaluator', () => {
  it('selects, filters and orders', () => {
    expect(rows(MAIN, "SELECT name FROM customers WHERE region = 'South' ORDER BY name DESC")).toEqual([['Elif'], ['Dev']]);
    expect(rows(MAIN, 'SELECT name, price FROM products WHERE price BETWEEN 3 AND 8 ORDER BY price')).toEqual([['Sticker pack', 3], ['Notebook A5', 4.5], ['Mug', 8]]);
    expect(rows(MAIN, "SELECT name FROM products WHERE category IN ('home','bags') AND price < 30 ORDER BY id")).toEqual([['Desk lamp'], ['Mug']]);
  });

  it('aggregates over everything, over groups and with HAVING', () => {
    expect(rows(MAIN, 'SELECT COUNT(*), MIN(price), MAX(price) FROM products')).toEqual([[6, 1.8, 35]]);
    expect(rows(MAIN, 'SELECT category, COUNT(*) AS n FROM products GROUP BY category ORDER BY n DESC, category')).toEqual([['stationery', 3], ['home', 2], ['bags', 1]]);
    expect(rows(MAIN, 'SELECT category FROM products GROUP BY category HAVING COUNT(*) >= 2 ORDER BY category')).toEqual([['home'], ['stationery']]);
    expect(rows(MAIN, 'SELECT COUNT(*) FROM orders WHERE qty > 100')).toEqual([[0]]);
    expect(rows(MAIN, 'SELECT SUM(qty) FROM orders WHERE qty > 100')).toEqual([[null]]);
  });

  it('inner and left joins differ on unmatched rows', () => {
    expect(rows(MAIN, 'SELECT COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.id')).toEqual([[13]]);
    expect(rows(MAIN, 'SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id')).toEqual([[15]]);
    expect(rows(MAIN, 'SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL ORDER BY c.name')).toEqual([['Grace'], ['Hugo']]);
  });

  it('handles DISTINCT, COUNT(DISTINCT), LIKE and LIMIT', () => {
    expect(rows(MAIN, 'SELECT DISTINCT status FROM orders ORDER BY status')).toEqual([['cancelled'], ['pending'], ['shipped']]);
    expect(rows(MAIN, 'SELECT COUNT(DISTINCT customer_id) FROM orders')).toEqual([[6]]);
    expect(rows(MAIN, "SELECT name FROM products WHERE name LIKE '%pen' OR name LIKE 'MUG'")).toEqual([['Gel pen'], ['Mug']]);
    expect(rows(MAIN, 'SELECT id FROM orders ORDER BY id DESC LIMIT 2')).toEqual([[13], [12]]);
  });

  it('reports errors without throwing', () => {
    expect(runSql(MAIN, 'SELECT nope FROM customers')).toEqual({ ok: false, error: 'no such column: nope' });
    expect(runSql(MAIN, 'SELECT id FROM ghosts')).toEqual({ ok: false, error: 'no such table: ghosts' });
    expect(runSql(MAIN, 'SELECT id FROM customers c JOIN orders o ON o.customer_id = c.id')).toEqual({ ok: false, error: 'ambiguous column name: id' });
    expect(runSql(MAIN, 'DROP TABLE customers').ok).toBe(false);
    expect(runSql(MAIN, "SELECT * FROM customers WHERE name = 'x").ok).toBe(false);
    expect(runSql(MAIN, 'SELECT UPPER(name) FROM customers').ok).toBe(false);
  });

  it('expands * and parses', () => {
    const r = runSql(MAIN, 'SELECT * FROM products LIMIT 1');
    expect(r.ok && r.result.columns).toEqual(['id', 'name', 'category', 'price']);
    expect(parseSelect('select 1 + 2 * 3 from products').items[0].text).toBe('1 + 2 * 3');
    expect(rows(MAIN, 'SELECT 1 + 2 * 3 FROM products LIMIT 1')).toEqual([[7]]);
  });
});

describe('comparing queries', () => {
  it('normalises SQL text', () => {
    expect(normaliseSql('  SELECT  a\nFROM t ;')).toBe('select a from t');
    expect(exactMatch('SELECT 1 FROM t;', 'select 1   from t')).toBe(true);
    expect(exactMatch('SELECT t.a FROM t', 'SELECT a FROM t')).toBe(false);
  });

  it('compares rows with and without order, and counts duplicates', () => {
    const q = (rs: (string | number | null)[][], ordered = false) => ({ columns: ['x'], rows: rs, ordered });
    expect(sameRows(q([[1], [2]]), q([[2], [1]]), false)).toBe(true);
    expect(sameRows(q([[1], [2]]), q([[2], [1]]), true)).toBe(false);
    expect(sameRows(q([[1], [1], [2]]), q([[1], [2], [2]]), false)).toBe(false);
    expect(sameRows(q([[0.1 + 0.2]]), q([[0.3]]), false)).toBe(true);
  });
});

describe('workbench questions', () => {
  const dbs = [MAIN, VARIANT];

  it('computes the hand-checked gold answers on the main data', () => {
    expect(rows(MAIN, QUESTIONS[0].gold)).toEqual([[2]]);
    const rev = rows(MAIN, QUESTIONS[1].gold)[0][0] as number;
    expect(rev).toBeCloseTo(170.9, 6);
    expect(rows(MAIN, QUESTIONS[2].gold)).toEqual([[7]]);
    expect(rows(MAIN, QUESTIONS[3].gold)).toEqual([['Backpack'], ['Desk lamp'], ['Mug']]);
  });

  it('computes the hand-checked wrong answers', () => {
    expect((rows(MAIN, QUESTIONS[1].candidates[1].sql)[0][0] as number)).toBeCloseTo(253.9, 6);
    expect((rows(MAIN, QUESTIONS[1].candidates[2].sql)[0][0] as number)).toBeCloseTo(101.9, 6);
    expect((rows(MAIN, QUESTIONS[1].candidates[3].sql)[0][0] as number)).toBeCloseTo(213.9, 6);
    expect(rows(MAIN, QUESTIONS[0].candidates[1].sql)).toEqual([[0]]);
    expect(rows(MAIN, QUESTIONS[0].candidates[2].sql)).toEqual([[6]]);
    expect(rows(MAIN, QUESTIONS[2].candidates[1].sql)).toEqual([[7]]);
    expect(rows(MAIN, QUESTIONS[2].candidates[2].sql)).toEqual([[3]]);
    expect(rows(VARIANT, QUESTIONS[2].gold)).toEqual([[4]]);
    expect(rows(VARIANT, QUESTIONS[2].candidates[1].sql)).toEqual([[7]]);
  });

  // [exact string match, execution match on main, match on both databases]
  const expected: Record<string, [boolean, boolean, boolean]> = {
    'never-a': [false, true, true],
    'never-b': [false, false, false],
    'never-c': [false, false, false],
    'rev-a': [false, true, true],
    'rev-b': [false, false, false],
    'rev-c': [false, false, false],
    'rev-d': [false, false, false],
    'north-a': [false, true, true],
    'north-b': [false, true, false],
    'north-c': [false, false, false],
    'top-a': [false, true, true],
    'top-b': [false, false, false],
    'top-c': [false, false, false],
  };

  for (const q of QUESTIONS) {
    for (const c of q.candidates) {
      it(`judges ${c.id} as designed`, () => {
        const v = judge(dbs, q.gold, c.sql);
        expect([v.exact, v.execution, v.everywhere]).toEqual(expected[c.id]);
      });
    }
  }

  it('covers every candidate and shows each metric disagreeing with the others', () => {
    const all = QUESTIONS.flatMap((q) => q.candidates);
    expect(all.map((c) => c.id).sort()).toEqual(Object.keys(expected).sort());
    expect(judge(dbs, QUESTIONS[3].gold, QUESTIONS[3].gold).exact).toBe(true);
    const lucky = judge(dbs, QUESTIONS[2].gold, QUESTIONS[2].candidates[1].sql);
    expect(lucky.execution && !lucky.everywhere).toBe(true);
  });

  it('a gold query matches itself everywhere', () => {
    for (const q of QUESTIONS) expect(judge(dbs, q.gold, q.gold).everywhere).toBe(true);
  });

  it('top-b really is an order mistake on the main data', () => {
    const g = runSql(MAIN, QUESTIONS[3].gold);
    const p = runSql(MAIN, QUESTIONS[3].candidates[1].sql);
    expect(g.ok && p.ok && sameRows(p.result, g.result, false)).toBe(true);
    expect(g.ok && p.ok && sameRows(p.result, g.result, true)).toBe(false);
  });
});

describe('guardSql', () => {
  it('accepts a single SELECT and adds a LIMIT', () => {
    const g = guardSql('SELECT name FROM customers;', ALLOWED_TABLES, 100);
    expect(g).toEqual({ ok: true, sql: 'SELECT name FROM customers LIMIT 100', note: 'no LIMIT, so LIMIT 100 was added' });
  });
  it('lowers a LIMIT that is too large and keeps a small one', () => {
    const big = guardSql('SELECT name FROM customers LIMIT 5000', ALLOWED_TABLES, 100);
    expect(big.ok && big.sql).toBe('SELECT name FROM customers LIMIT 100');
    const small = guardSql('SELECT name FROM customers LIMIT 5', ALLOWED_TABLES, 100);
    expect(small.ok && small.sql).toBe('SELECT name FROM customers LIMIT 5');
  });
  it('refuses writes, stacked statements, other tables and anything it cannot parse', () => {
    expect(guardSql('DELETE FROM orders', ALLOWED_TABLES, 100)).toEqual({ ok: false, reason: 'only SELECT statements are allowed' });
    expect(guardSql('SELECT 1 FROM orders; DROP TABLE orders', ALLOWED_TABLES, 100)).toEqual({ ok: false, reason: 'more than one statement' });
    const t = guardSql('SELECT * FROM salaries', ALLOWED_TABLES, 100);
    expect(!t.ok && t.reason).toBe('table salaries is not on the allow-list');
    expect(guardSql('SELECT load_extension(1) FROM orders', ALLOWED_TABLES, 100).ok).toBe(false);
    expect(guardSql("SELECT 'x", ALLOWED_TABLES, 100).ok).toBe(false);
  });
  it('checks tables in joins as well', () => {
    const g = guardSql('SELECT 1 FROM orders o JOIN secrets s ON s.id = o.id', ALLOWED_TABLES, 100);
    expect(!g.ok && g.reason).toContain('secrets');
  });
});
