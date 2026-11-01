/*
 * A tiny, deterministic SQL SELECT evaluator for the text-to-SQL workbench. It is a teaching tool, not a
 * database: it supports SELECT [DISTINCT], column and aggregate expressions, FROM with aliases, INNER and
 * LEFT JOIN, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, and the functions COUNT, SUM, AVG, MIN and MAX.
 * Anything else is an error, which is also what makes the guard below fail closed.
 */

export type Value = string | number | null;
export type Table = { columns: string[]; rows: Value[][] };
export type Db = Record<string, Table>;
export type QueryResult = { columns: string[]; rows: Value[][]; ordered: boolean };

export class SqlError extends Error {}

/* ---------- tokens ---------- */

type Tok = { t: 'id' | 'num' | 'str' | 'sym'; v: string; up: string };

function tokenise(sql: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9]/.test(c)) {
      const m = /^\d+(\.\d+)?/.exec(sql.slice(i))!;
      out.push({ t: 'num', v: m[0], up: m[0] });
      i += m[0].length;
    } else if (c === "'") {
      let j = i + 1;
      let s = '';
      for (;;) {
        if (j >= sql.length) throw new SqlError('unterminated string');
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            s += "'";
            j += 2;
            continue;
          }
          break;
        }
        s += sql[j++];
      }
      out.push({ t: 'str', v: s, up: s });
      i = j + 1;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(sql.slice(i))!;
      out.push({ t: 'id', v: m[0], up: m[0].toUpperCase() });
      i += m[0].length;
    } else {
      const two = sql.slice(i, i + 2);
      if (two === '<=' || two === '>=' || two === '<>' || two === '!=') {
        out.push({ t: 'sym', v: two, up: two });
        i += 2;
      } else if ('(),.*=<>+-/;'.includes(c)) {
        out.push({ t: 'sym', v: c, up: c });
        i++;
      } else {
        throw new SqlError(`unexpected character ${c}`);
      }
    }
  }
  return out;
}

/* ---------- syntax tree ---------- */

type Expr =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'null' }
  | { k: 'col'; table?: string; name: string }
  | { k: 'star' }
  | { k: 'bin'; op: string; l: Expr; r: Expr }
  | { k: 'not'; e: Expr }
  | { k: 'fn'; name: string; args: Expr[]; distinct: boolean }
  | { k: 'in'; e: Expr; list: Expr[]; neg: boolean }
  | { k: 'isnull'; e: Expr; neg: boolean }
  | { k: 'between'; e: Expr; lo: Expr; hi: Expr; neg: boolean }
  | { k: 'like'; e: Expr; pat: Expr; neg: boolean };

type Ref = { table: string; alias: string };
type Select = {
  distinct: boolean;
  items: { expr: Expr; alias?: string; text: string }[];
  from: Ref;
  joins: { left: boolean; ref: Ref; on: Expr }[];
  where?: Expr;
  groupBy: Expr[];
  having?: Expr;
  orderBy: { expr: Expr; desc: boolean }[];
  limit?: number;
};

const AGG = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']);
const RESERVED = new Set([
  'SELECT', 'DISTINCT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'JOIN', 'INNER', 'LEFT', 'OUTER', 'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'IS', 'NULL', 'BETWEEN', 'ASC', 'DESC',
]);

class Parser {
  i = 0;
  constructor(readonly toks: Tok[]) {}
  peek(o = 0) {
    return this.toks[this.i + o];
  }
  isKw(w: string, o = 0) {
    const t = this.peek(o);
    return !!t && t.t === 'id' && t.up === w;
  }
  isSym(s: string, o = 0) {
    const t = this.peek(o);
    return !!t && t.t === 'sym' && t.v === s;
  }
  eatKw(w: string) {
    if (this.isKw(w)) {
      this.i++;
      return true;
    }
    return false;
  }
  eatSym(s: string) {
    if (this.isSym(s)) {
      this.i++;
      return true;
    }
    return false;
  }
  expectKw(w: string) {
    if (!this.eatKw(w)) throw new SqlError(`expected ${w}${this.peek() ? ` near "${this.peek().v}"` : ' at the end'}`);
  }
  expectSym(s: string) {
    if (!this.eatSym(s)) throw new SqlError(`expected ${s}${this.peek() ? ` near "${this.peek().v}"` : ' at the end'}`);
  }
  ident(what: string): string {
    const t = this.peek();
    if (!t || t.t !== 'id' || RESERVED.has(t.up)) throw new SqlError(`expected ${what}${t ? ` near "${t.v}"` : ' at the end'}`);
    this.i++;
    return t.v.toLowerCase();
  }

  select(): Select {
    this.expectKw('SELECT');
    const distinct = this.eatKw('DISTINCT');
    const items: Select['items'] = [];
    do {
      const start = this.i;
      const expr = this.eatSym('*') ? ({ k: 'star' } as Expr) : this.expr();
      let alias: string | undefined;
      if (this.eatKw('AS')) alias = this.ident('an alias');
      else if (this.peek() && this.peek().t === 'id' && !RESERVED.has(this.peek().up)) alias = this.ident('an alias');
      items.push({ expr, alias, text: this.toks.slice(start, this.i).map((t) => t.v).join(' ') });
    } while (this.eatSym(','));
    this.expectKw('FROM');
    const from = this.ref();
    const joins: Select['joins'] = [];
    for (;;) {
      let left = false;
      if (this.isKw('LEFT')) {
        this.i++;
        this.eatKw('OUTER');
        left = true;
        this.expectKw('JOIN');
      } else if (this.isKw('INNER')) {
        this.i++;
        this.expectKw('JOIN');
      } else if (!this.eatKw('JOIN')) break;
      const ref = this.ref();
      this.expectKw('ON');
      joins.push({ left, ref, on: this.expr() });
    }
    const s: Select = { distinct, items, from, joins, groupBy: [], orderBy: [] };
    if (this.eatKw('WHERE')) s.where = this.expr();
    if (this.eatKw('GROUP')) {
      this.expectKw('BY');
      do s.groupBy.push(this.expr());
      while (this.eatSym(','));
    }
    if (this.eatKw('HAVING')) s.having = this.expr();
    if (this.eatKw('ORDER')) {
      this.expectKw('BY');
      do {
        const expr = this.expr();
        const desc = this.eatKw('DESC');
        if (!desc) this.eatKw('ASC');
        s.orderBy.push({ expr, desc });
      } while (this.eatSym(','));
    }
    if (this.eatKw('LIMIT')) {
      const t = this.peek();
      if (!t || t.t !== 'num' || t.v.includes('.')) throw new SqlError('LIMIT needs a whole number');
      this.i++;
      s.limit = Number(t.v);
    }
    this.eatSym(';');
    if (this.peek()) throw new SqlError(`unexpected "${this.peek().v}"`);
    return s;
  }

  ref(): Ref {
    const table = this.ident('a table name');
    let alias = table;
    if (this.eatKw('AS')) alias = this.ident('an alias');
    else if (this.peek() && this.peek().t === 'id' && !RESERVED.has(this.peek().up)) alias = this.ident('an alias');
    return { table, alias };
  }

  expr(): Expr {
    let l = this.and();
    while (this.eatKw('OR')) l = { k: 'bin', op: 'OR', l, r: this.and() };
    return l;
  }
  and(): Expr {
    let l = this.not();
    while (this.eatKw('AND')) l = { k: 'bin', op: 'AND', l, r: this.not() };
    return l;
  }
  not(): Expr {
    if (this.eatKw('NOT')) return { k: 'not', e: this.not() };
    return this.cmp();
  }
  cmp(): Expr {
    const l = this.add();
    const t = this.peek();
    if (t && t.t === 'sym' && ['=', '<>', '!=', '<', '>', '<=', '>='].includes(t.v)) {
      this.i++;
      return { k: 'bin', op: t.v === '!=' ? '<>' : t.v, l, r: this.add() };
    }
    if (this.isKw('IS')) {
      this.i++;
      const neg = this.eatKw('NOT');
      this.expectKw('NULL');
      return { k: 'isnull', e: l, neg };
    }
    let neg = false;
    if (this.isKw('NOT') && (this.isKw('IN', 1) || this.isKw('LIKE', 1) || this.isKw('BETWEEN', 1))) {
      this.i++;
      neg = true;
    }
    if (this.eatKw('LIKE')) return { k: 'like', e: l, pat: this.add(), neg };
    if (this.eatKw('BETWEEN')) {
      const lo = this.add();
      this.expectKw('AND');
      return { k: 'between', e: l, lo, hi: this.add(), neg };
    }
    if (this.eatKw('IN')) {
      this.expectSym('(');
      const list: Expr[] = [];
      do list.push(this.add());
      while (this.eatSym(','));
      this.expectSym(')');
      return { k: 'in', e: l, list, neg };
    }
    return l;
  }
  add(): Expr {
    let l = this.mul();
    for (;;) {
      if (this.isSym('+') || this.isSym('-')) {
        const op = this.peek().v;
        this.i++;
        l = { k: 'bin', op, l, r: this.mul() };
      } else return l;
    }
  }
  mul(): Expr {
    let l = this.primary();
    for (;;) {
      if (this.isSym('*') || this.isSym('/')) {
        const op = this.peek().v;
        this.i++;
        l = { k: 'bin', op, l, r: this.primary() };
      } else return l;
    }
  }
  primary(): Expr {
    const t = this.peek();
    if (!t) throw new SqlError('the query ends too early');
    if (this.eatSym('(')) {
      const e = this.expr();
      this.expectSym(')');
      return e;
    }
    if (this.eatSym('-')) {
      const n = this.peek();
      if (!n || n.t !== 'num') throw new SqlError('expected a number after -');
      this.i++;
      return { k: 'num', v: -Number(n.v) };
    }
    if (t.t === 'num') {
      this.i++;
      return { k: 'num', v: Number(t.v) };
    }
    if (t.t === 'str') {
      this.i++;
      return { k: 'str', v: t.v };
    }
    if (t.t === 'id') {
      if (t.up === 'NULL') {
        this.i++;
        return { k: 'null' };
      }
      if (this.isSym('(', 1)) {
        if (!AGG.has(t.up)) throw new SqlError(`function ${t.v} is not supported here`);
        this.i += 2;
        const distinct = this.eatKw('DISTINCT');
        const args: Expr[] = [];
        if (this.eatSym('*')) args.push({ k: 'star' });
        else args.push(this.expr());
        this.expectSym(')');
        return { k: 'fn', name: t.up, args, distinct };
      }
      if (RESERVED.has(t.up)) throw new SqlError(`unexpected ${t.v}`);
      this.i++;
      if (this.eatSym('.')) {
        const n = this.peek();
        if (!n || n.t !== 'id') throw new SqlError('expected a column name after .');
        this.i++;
        return { k: 'col', table: t.v.toLowerCase(), name: n.v.toLowerCase() };
      }
      return { k: 'col', name: t.v.toLowerCase() };
    }
    throw new SqlError(`unexpected "${t.v}"`);
  }
}

export function parseSelect(sql: string): Select {
  return new Parser(tokenise(sql)).select();
}

/* ---------- evaluation ---------- */

const hasAgg = (e: Expr): boolean => {
  switch (e.k) {
    case 'fn':
      return true;
    case 'bin':
      return hasAgg(e.l) || hasAgg(e.r);
    case 'not':
    case 'isnull':
      return hasAgg(e.e);
    case 'in':
      return hasAgg(e.e) || e.list.some(hasAgg);
    case 'between':
      return hasAgg(e.e) || hasAgg(e.lo) || hasAgg(e.hi);
    case 'like':
      return hasAgg(e.e) || hasAgg(e.pat);
    default:
      return false;
  }
};

type Slot = { alias: string; name: string };
type Ctx = { slots: Slot[]; row: Value[]; group?: Value[][] };

function colIndex(slots: Slot[], e: { table?: string; name: string }): number {
  const hits: number[] = [];
  slots.forEach((s, i) => {
    if (s.name === e.name && (e.table === undefined || s.alias === e.table)) hits.push(i);
  });
  if (hits.length === 0) throw new SqlError(`no such column: ${e.table ? e.table + '.' : ''}${e.name}`);
  if (hits.length > 1) throw new SqlError(`ambiguous column name: ${e.name}`);
  return hits[0];
}

export function compareValues(a: Value, b: Value): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'number') return -1;
  if (typeof b === 'number') return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

const truthy = (v: Value) => typeof v === 'number' && v !== 0;
const bool = (b: boolean): Value => (b ? 1 : 0);

function likeToRegex(p: string): RegExp {
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${esc}$`, 'is');
}

function evalExpr(e: Expr, c: Ctx): Value {
  switch (e.k) {
    case 'num':
    case 'str':
      return e.v;
    case 'null':
      return null;
    case 'star':
      throw new SqlError('* is only allowed in the select list or COUNT(*)');
    case 'col': {
      const i = colIndex(c.slots, e);
      return c.row[i] ?? null;
    }
    case 'not': {
      const v = evalExpr(e.e, c);
      return v === null ? null : bool(!truthy(v));
    }
    case 'isnull': {
      const v = evalExpr(e.e, c);
      return bool((v === null) !== e.neg);
    }
    case 'in': {
      const v = evalExpr(e.e, c);
      if (v === null) return null;
      const hit = e.list.some((x) => compareValues(v, evalExpr(x, c)) === 0);
      return bool(hit !== e.neg);
    }
    case 'between': {
      const v = evalExpr(e.e, c);
      const lo = evalExpr(e.lo, c);
      const hi = evalExpr(e.hi, c);
      if (v === null || lo === null || hi === null) return null;
      return bool((compareValues(v, lo) >= 0 && compareValues(v, hi) <= 0) !== e.neg);
    }
    case 'like': {
      const v = evalExpr(e.e, c);
      const p = evalExpr(e.pat, c);
      if (v === null || p === null) return null;
      return bool(likeToRegex(String(p)).test(String(v)) !== e.neg);
    }
    case 'fn': {
      if (!c.group) throw new SqlError(`misuse of aggregate ${e.name}()`);
      const arg = e.args[0];
      if (arg.k === 'star') {
        if (e.name !== 'COUNT') throw new SqlError(`${e.name}(*) is not valid`);
        return c.group.length;
      }
      let vals = c.group.map((r) => evalExpr(arg, { slots: c.slots, row: r })).filter((v): v is string | number => v !== null);
      if (e.distinct) vals = [...new Map(vals.map((v) => [typeof v + ':' + v, v])).values()];
      if (e.name === 'COUNT') return vals.length;
      if (vals.length === 0) return null;
      if (e.name === 'MIN') return vals.reduce((a, b) => (compareValues(a, b) <= 0 ? a : b));
      if (e.name === 'MAX') return vals.reduce((a, b) => (compareValues(a, b) >= 0 ? a : b));
      const nums = vals.map((v) => (typeof v === 'number' ? v : Number(v) || 0));
      const sum = nums.reduce((a, b) => a + b, 0);
      return e.name === 'SUM' ? sum : sum / nums.length;
    }
    case 'bin': {
      if (e.op === 'AND' || e.op === 'OR') {
        const l = evalExpr(e.l, c);
        const r = evalExpr(e.r, c);
        if (e.op === 'AND') {
          if ((l !== null && !truthy(l)) || (r !== null && !truthy(r))) return 0;
          return l === null || r === null ? null : 1;
        }
        if (truthy(l) || truthy(r)) return 1;
        return l === null || r === null ? null : 0;
      }
      const l = evalExpr(e.l, c);
      const r = evalExpr(e.r, c);
      if (l === null || r === null) return null;
      switch (e.op) {
        case '=':
          return bool(compareValues(l, r) === 0);
        case '<>':
          return bool(compareValues(l, r) !== 0);
        case '<':
          return bool(compareValues(l, r) < 0);
        case '>':
          return bool(compareValues(l, r) > 0);
        case '<=':
          return bool(compareValues(l, r) <= 0);
        case '>=':
          return bool(compareValues(l, r) >= 0);
      }
      const a = typeof l === 'number' ? l : Number(l) || 0;
      const b = typeof r === 'number' ? r : Number(r) || 0;
      if (e.op === '+') return a + b;
      if (e.op === '-') return a - b;
      if (e.op === '*') return a * b;
      return b === 0 ? null : a / b;
    }
  }
}

const key = (r: Value[]) => JSON.stringify(r);

export function runSelect(db: Db, s: Select): QueryResult {
  const get = (name: string) => {
    const t = db[name];
    if (!t) throw new SqlError(`no such table: ${name}`);
    return t;
  };
  const baseT = get(s.from.table);
  let slots: Slot[] = baseT.columns.map((n) => ({ alias: s.from.alias, name: n }));
  let rows: Value[][] = baseT.rows.map((r) => [...r]);
  for (const j of s.joins) {
    const t = get(j.ref.table);
    const rslots = t.columns.map((n) => ({ alias: j.ref.alias, name: n }));
    const all = [...slots, ...rslots];
    const next: Value[][] = [];
    for (const l of rows) {
      let matched = false;
      for (const r of t.rows) {
        const row = [...l, ...r];
        if (truthy(evalExpr(j.on, { slots: all, row }))) {
          next.push(row);
          matched = true;
        }
      }
      if (!matched && j.left) next.push([...l, ...rslots.map(() => null)]);
    }
    slots = all;
    rows = next;
  }
  if (s.where) {
    if (hasAgg(s.where)) throw new SqlError('aggregate functions are not allowed in WHERE; use HAVING');
    rows = rows.filter((row) => truthy(evalExpr(s.where!, { slots, row })));
  }

  // expand * in the select list
  const items: Select['items'] = [];
  for (const it of s.items) {
    if (it.expr.k === 'star') slots.forEach((sl) => items.push({ expr: { k: 'col', table: sl.alias, name: sl.name }, alias: sl.name, text: sl.name }));
    else items.push(it);
  }
  const names = items.map((it) => it.alias ?? (it.expr.k === 'col' ? it.expr.name : it.text));

  const aggregate = s.groupBy.length > 0 || items.some((i) => hasAgg(i.expr)) || (s.having ? hasAgg(s.having) : false) || s.orderBy.some((o) => hasAgg(o.expr));
  type Unit = { ctx: Ctx };
  let units: Unit[];
  if (aggregate) {
    const groups = new Map<string, Value[][]>();
    if (s.groupBy.length === 0) groups.set('all', rows);
    else for (const row of rows) {
      const k = key(s.groupBy.map((g) => evalExpr(g, { slots, row })));
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(row);
    }
    units = [...groups.values()].map((g) => ({ ctx: { slots, row: g[0] ?? slots.map(() => null), group: g } }));
    if (s.having) units = units.filter((u) => truthy(evalExpr(s.having!, u.ctx)));
  } else {
    if (s.having) throw new SqlError('HAVING needs GROUP BY or an aggregate');
    units = rows.map((row) => ({ ctx: { slots, row } }));
  }

  let out = units.map((u) => ({
    values: items.map((it) => evalExpr(it.expr, u.ctx)),
    sort: s.orderBy.map((o) => {
      if (o.expr.k === 'col' && !o.expr.table) {
        const ai = items.findIndex((it) => it.alias === (o.expr as { name: string }).name);
        if (ai >= 0) return evalExpr(items[ai].expr, u.ctx);
      }
      return evalExpr(o.expr, u.ctx);
    }),
  }));
  if (s.distinct) {
    const seen = new Set<string>();
    out = out.filter((r) => (seen.has(key(r.values)) ? false : (seen.add(key(r.values)), true)));
  }
  if (s.orderBy.length) {
    out = out
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        for (let n = 0; n < s.orderBy.length; n++) {
          const d = compareValues(a.r.sort[n], b.r.sort[n]);
          if (d !== 0) return s.orderBy[n].desc ? -d : d;
        }
        return a.i - b.i;
      })
      .map((x) => x.r);
  }
  if (s.limit !== undefined) out = out.slice(0, s.limit);
  return { columns: names, rows: out.map((r) => r.values), ordered: s.orderBy.length > 0 };
}

export type RunOutcome = { ok: true; result: QueryResult } | { ok: false; error: string };

/** Run a query; never throws. */
export function runSql(db: Db, sql: string): RunOutcome {
  try {
    return { ok: true, result: runSelect(db, parseSelect(sql)) };
  } catch (e) {
    if (e instanceof SqlError) return { ok: false, error: e.message };
    throw e;
  }
}

/* ---------- comparing queries and results ---------- */

/** Lower-case, collapse white space, drop a trailing semicolon. A deliberately naive exact-match check. */
export function normaliseSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().replace(/\s*;+$/, '').toLowerCase();
}

export const exactMatch = (a: string, b: string) => normaliseSql(a) === normaliseSql(b);

const cell = (v: Value) => (typeof v === 'number' ? String(Math.round(v * 1e6) / 1e6) : v === null ? 'null' : 's:' + v);

/**
 * Do two results hold the same rows? Column names are ignored. Row order counts only when `ordered`
 * (the gold query had an ORDER BY). Duplicates count: this compares rows as a multiset.
 */
export function sameRows(a: QueryResult, b: QueryResult, ordered: boolean): boolean {
  if (a.columns.length !== b.columns.length || a.rows.length !== b.rows.length) return false;
  const ka = a.rows.map((r) => r.map(cell).join('|'));
  const kb = b.rows.map((r) => r.map(cell).join('|'));
  if (!ordered) {
    ka.sort();
    kb.sort();
  }
  return ka.every((k, i) => k === kb[i]);
}

export type Verdict = {
  exact: boolean;
  /** One entry per database: did the prediction return the same rows as the gold query? */
  perDb: { ran: boolean; error?: string; match: boolean }[];
  /** Matches on the first (main) database. This is what plain execution accuracy measures. */
  execution: boolean;
  /** Matches on every database. This is the idea behind test-suite accuracy. */
  everywhere: boolean;
};

export function judge(dbs: Db[], gold: string, pred: string): Verdict {
  const perDb = dbs.map((db) => {
    const g = runSql(db, gold);
    const p = runSql(db, pred);
    if (!g.ok) throw new Error('the gold query must run: ' + g.error);
    if (!p.ok) return { ran: false, error: p.error, match: false };
    return { ran: true, match: sameRows(p.result, g.result, g.result.ordered) };
  });
  return { exact: exactMatch(gold, pred), perDb, execution: perDb[0].match, everywhere: perDb.every((d) => d.match) };
}

/* ---------- a guard in front of the database ---------- */

export type Guard = { ok: true; sql: string; note: string } | { ok: false; reason: string };

/**
 * Accept one SELECT over allow-listed tables, using only the functions this evaluator knows, and make
 * sure it has a row limit. Fails closed: anything it cannot parse is refused. This is a teaching sketch.
 * In production the same checks belong in a real SQL parser, with a read-only database role behind it.
 */
export function guardSql(sql: string, allowed: string[], maxRows: number): Guard {
  let toks: Tok[];
  try {
    toks = tokenise(sql);
  } catch (e) {
    return { ok: false, reason: e instanceof SqlError ? e.message : 'could not read the query' };
  }
  const semi = toks.findIndex((t) => t.t === 'sym' && t.v === ';');
  if (semi >= 0 && semi < toks.length - 1) return { ok: false, reason: 'more than one statement' };
  if (!toks.length || toks[0].up !== 'SELECT') return { ok: false, reason: 'only SELECT statements are allowed' };
  let s: Select;
  try {
    s = new Parser(toks).select();
  } catch (e) {
    return { ok: false, reason: 'refused, could not parse it: ' + (e instanceof SqlError ? e.message : 'unknown error') };
  }
  const used = [s.from.table, ...s.joins.map((j) => j.ref.table)];
  const bad = used.find((t) => !allowed.includes(t));
  if (bad) return { ok: false, reason: `table ${bad} is not on the allow-list` };
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  if (s.limit === undefined) return { ok: true, sql: `${trimmed} LIMIT ${maxRows}`, note: `no LIMIT, so LIMIT ${maxRows} was added` };
  if (s.limit > maxRows) return { ok: true, sql: trimmed.replace(/limit\s+\d+\s*$/i, `LIMIT ${maxRows}`), note: `LIMIT lowered to ${maxRows}` };
  return { ok: true, sql: trimmed, note: 'allowed as written' };
}
