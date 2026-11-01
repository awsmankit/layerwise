import type { Lab } from './types';

const DATA = `# Recorded runs of seven predicted queries. In a real harness each rows list comes from running the query,
# for example conn.execute(sql).fetchall(); here the results are written out so the lab needs no database.
# pred_rows is None when the predicted query failed to run.
CASES = [
    {"id": "c1", "gold_sql": "SELECT COUNT(*) FROM customers", "pred_sql": "select count(*)  from customers;",
     "gold_rows": [(8,)], "pred_rows": [(8,)]},
    {"id": "c2", "gold_sql": "SELECT name FROM products ORDER BY price DESC LIMIT 3",
     "pred_sql": "SELECT p.name FROM products AS p ORDER BY p.price DESC LIMIT 3",
     "gold_rows": [("Backpack",), ("Desk lamp",), ("Mug",)], "pred_rows": [("Backpack",), ("Desk lamp",), ("Mug",)]},
    {"id": "c3", "gold_sql": "SELECT name FROM products ORDER BY price DESC LIMIT 3",
     "pred_sql": "SELECT name FROM products WHERE price > 5 ORDER BY price ASC",
     "gold_rows": [("Backpack",), ("Desk lamp",), ("Mug",)], "pred_rows": [("Mug",), ("Desk lamp",), ("Backpack",)]},
    {"id": "c4", "gold_sql": "SELECT region FROM customers GROUP BY region",
     "pred_sql": "SELECT DISTINCT region FROM customers ORDER BY region",
     "gold_rows": [("North",), ("South",), ("East",), ("West",)], "pred_rows": [("East",), ("North",), ("South",), ("West",)]},
    {"id": "c5", "gold_sql": "SELECT SUM(o.qty * p.price) FROM orders o JOIN products p ON p.id = o.product_id WHERE o.status = 'shipped'",
     "pred_sql": "SELECT SUM(o.qty * p.price) FROM orders o JOIN products p ON p.id = o.product_id",
     "gold_rows": [(170.9,)], "pred_rows": [(253.9,)]},
    {"id": "c6", "gold_sql": "SELECT SUM(qty * price) FROM shipped_lines", "pred_sql": "SELECT SUM(price * qty) FROM shipped_lines",
     "gold_rows": [(170.9,)], "pred_rows": [(170.89999999999998,)]},
    {"id": "c7", "gold_sql": "SELECT region FROM customers WHERE id <= 3", "pred_sql": "SELECT DISTINCT region FROM customers WHERE id <= 3",
     "gold_rows": [("North",), ("North",), ("North",)], "pred_rows": [("North",)]},
]
`;

export const lab: Lab = {
  id: 'sql-execution-accuracy',
  title: 'Score text-to-SQL: execution accuracy and a safety guard',
  level: 'intermediate',
  minutes: 20,
  lesson: 'rag-agents/text-to-sql-and-data-agents',
  goal: 'A text-to-SQL system is judged by comparing what its query returns with what the gold query returns, not by comparing the SQL text. Write the exact-match check, the result comparison, the scoring loop, and a small guard that lets only one read-only, limited SELECT through. The queries have already been run, so the lab needs no database.',
  steps: [
    'normalise_sql(sql) lower-cases the query, collapses runs of white space to one space, and removes a trailing semicolon. exact_match(pred_sql, gold_sql) is true when the two normalised strings are equal.',
    'rows_match(pred_rows, gold_rows, ordered=False) compares two lists of rows. Round floats to 4 places first. If ordered is true the rows must match in order; otherwise they must hold the same rows the same number of times, in any order. None (a query that failed) never matches.',
    'is_ordered(gold_sql) is true when the gold query contains ORDER BY. evaluate(cases) returns {"n", "exact_match", "execution_accuracy", "exec_but_not_exact"}: the two scores as fractions of all cases, and the ids accepted by execution but not by exact match. Use is_ordered for each case.',
    'guard(sql, allowed_tables, max_rows) returns (True, sql_to_run) or (False, reason). Refuse more than one statement, anything not starting with SELECT, any of the words insert, update, delete, drop, alter, create, attach, pragma, replace, truncate or grant, and any table after FROM or JOIN that is not allowed. If the query has no final LIMIT, add one; if the LIMIT is above max_rows, lower it.',
  ],
  starter: `import re
from collections import Counter

${DATA}
def normalise_sql(sql):
    # TODO: lower-case, collapse white space, strip a trailing semicolon
    return sql

def exact_match(pred_sql, gold_sql):
    # TODO
    return False

def rows_match(pred_rows, gold_rows, ordered=False):
    # TODO: round floats to 4 places, then compare in order or as a multiset
    return False

def is_ordered(gold_sql):
    # TODO
    return False

def evaluate(cases):
    # TODO: return {"n": ..., "exact_match": ..., "execution_accuracy": ..., "exec_but_not_exact": [...]}
    return {}

FORBIDDEN = {"insert", "update", "delete", "drop", "alter", "create", "attach", "pragma", "replace", "truncate", "grant"}

def guard(sql, allowed_tables, max_rows):
    # TODO: return (True, sql_to_run) or (False, reason)
    return (False, "not written yet")

print(evaluate(CASES))
print(guard("SELECT name FROM customers", {"customers"}, 100))
`,
  solution: `import re
from collections import Counter

${DATA}
def normalise_sql(sql):
    return re.sub(r"\\s+", " ", sql).strip().rstrip(";").strip().lower()

def exact_match(pred_sql, gold_sql):
    return normalise_sql(pred_sql) == normalise_sql(gold_sql)

def _clean(rows):
    return [tuple(round(v, 4) if isinstance(v, float) else v for v in row) for row in rows]

def rows_match(pred_rows, gold_rows, ordered=False):
    if pred_rows is None or gold_rows is None:
        return False
    p, g = _clean(pred_rows), _clean(gold_rows)
    if ordered:
        return p == g
    return Counter(p) == Counter(g)

def is_ordered(gold_sql):
    return "order by" in normalise_sql(gold_sql)

def evaluate(cases):
    exact = execution = 0
    only_exec = []
    for c in cases:
        e = exact_match(c["pred_sql"], c["gold_sql"])
        x = rows_match(c["pred_rows"], c["gold_rows"], is_ordered(c["gold_sql"]))
        exact += e
        execution += x
        if x and not e:
            only_exec.append(c["id"])
    n = len(cases)
    return {"n": n, "exact_match": exact / n, "execution_accuracy": execution / n, "exec_but_not_exact": only_exec}

FORBIDDEN = {"insert", "update", "delete", "drop", "alter", "create", "attach", "pragma", "replace", "truncate", "grant"}

def guard(sql, allowed_tables, max_rows):
    s = sql.strip().rstrip(";").strip()
    if ";" in s:
        return (False, "more than one statement")
    low = s.lower()
    if not low.startswith("select"):
        return (False, "only SELECT is allowed")
    bad = FORBIDDEN & set(re.findall(r"[a-z_]+", low))
    if bad:
        return (False, "forbidden word: " + sorted(bad)[0])
    for t in re.findall(r"\\b(?:from|join)\\s+([a-z_][a-z0-9_]*)", low):
        if t not in allowed_tables:
            return (False, "table not allowed: " + t)
    m = re.search(r"\\blimit\\s+(\\d+)\\s*$", s, re.IGNORECASE)
    if m is None:
        return (True, s + " LIMIT " + str(max_rows))
    if int(m.group(1)) > max_rows:
        return (True, s[:m.start()] + "LIMIT " + str(max_rows))
    return (True, s)

print(evaluate(CASES))
print(guard("SELECT name FROM customers", {"customers"}, 100))
`,
  tests: `
def _norm():
    assert normalise_sql("  SELECT  a\\nFROM t ;") == "select a from t", repr(normalise_sql("  SELECT  a\\nFROM t ;"))
    assert normalise_sql("select a from t") == "select a from t"
check("normalise_sql lower-cases, collapses white space and drops the trailing semicolon", _norm)

def _exact():
    assert exact_match("SELECT 1 FROM t;", "select 1   from t") is True
    assert exact_match("SELECT p.name FROM products AS p", "SELECT name FROM products") is False, "different text is not an exact match, even when the answer is the same"
check("exact_match is true for the same text and false for a rewritten query", _exact)

def _rows_basic():
    assert rows_match([(1,), (2,)], [(2,), (1,)]) is True, "unordered rows may come in any order"
    assert rows_match([(1,), (2,)], [(2,), (1,)], ordered=True) is False, "ordered rows must be in the same order"
    assert rows_match([(1,), (2,)], [(1,), (2,)], ordered=True) is True
    assert rows_match([(1,)], [(2,)]) is False
check("rows_match handles order", _rows_basic)

def _rows_dupes():
    assert rows_match([("a",), ("b",)], [("a",), ("a",), ("b",)]) is False, "a row that appears twice is not the same as one that appears once"
    assert rows_match([("a",), ("a",), ("b",)], [("a",), ("b",), ("a",)]) is True
check("rows_match counts duplicate rows", _rows_dupes)

def _rows_float_none():
    assert rows_match([(0.1 + 0.2,)], [(0.3,)]) is True, "round floats to 4 places before comparing"
    assert rows_match([(0.3001,)], [(0.3,)]) is False
    assert rows_match(None, [(1,)]) is False, "a query that failed never matches"
    assert rows_match([], []) is True
check("rows_match rounds floats and treats a failed query (None) as wrong", _rows_float_none)

def _ordered():
    assert is_ordered("SELECT a FROM t ORDER BY a") is True
    assert is_ordered("select a from t order  by a desc") is True
    assert is_ordered("SELECT a FROM t") is False
check("is_ordered looks for ORDER BY", _ordered)

def _eval():
    r = evaluate(CASES)
    assert r["n"] == 7, r
    assert abs(r["exact_match"] - 1/7) < 1e-9, "only c1 matches as text: " + str(r["exact_match"])
    assert abs(r["execution_accuracy"] - 4/7) < 1e-9, "c1, c2, c4 and c6 return the right rows: " + str(r["execution_accuracy"])
    assert sorted(r["exec_but_not_exact"]) == ["c2", "c4", "c6"], r["exec_but_not_exact"]
check("evaluate scores exact match and execution accuracy and lists where they disagree", _eval)

def _eval_small():
    cases = [{"id": "x", "gold_sql": "SELECT a FROM t ORDER BY a", "pred_sql": "SELECT a FROM t ORDER BY a DESC", "gold_rows": [(1,), (2,)], "pred_rows": [(2,), (1,)]}]
    r = evaluate(cases)
    assert r["execution_accuracy"] == 0 and r["exact_match"] == 0, "the gold query is ordered, so the order of rows matters"
    cases[0]["gold_sql"] = "SELECT a FROM t"
    assert evaluate(cases)["execution_accuracy"] == 1, "without ORDER BY in the gold query, row order is ignored"
check("evaluate uses is_ordered for each case", _eval_small)

def _guard_ok():
    ok, out = guard("SELECT name FROM customers;", {"customers"}, 100)
    assert ok is True and out == "SELECT name FROM customers LIMIT 100", out
    ok, out = guard("SELECT name FROM customers LIMIT 5", {"customers"}, 100)
    assert ok is True and out == "SELECT name FROM customers LIMIT 5", out
    ok, out = guard("select name from customers limit 5000", {"customers"}, 100)
    assert ok is True and out.lower().endswith("limit 100"), out
check("guard lets a SELECT through and makes sure there is a LIMIT of at most max_rows", _guard_ok)

def _guard_bad():
    for q in ["DELETE FROM customers", "SELECT 1 FROM customers; DROP TABLE customers", "SELECT * FROM salaries", "SELECT a FROM customers JOIN secrets ON 1 = 1", "UPDATE customers SET name = 'x'"]:
        ok, why = guard(q, {"customers", "orders"}, 100)
        assert ok is False and why, "should refuse: " + q
check("guard refuses writes, stacked statements and tables that are not allowed", _guard_bad)

def _guard_words():
    ok, why = guard("SELECT a FROM orders WHERE 1=1 AND pragma = 1", {"orders"}, 10)
    assert ok is False, "a forbidden word anywhere in the query is refused"
    ok, out = guard("SELECT created_on FROM orders", {"orders"}, 10)
    assert ok is True, "created_on is a column name, not the word create"
check("guard matches whole words only", _guard_words)
`,
  hints: [
    'normalise_sql: re.sub(r"\\s+", " ", sql) collapses white space; then strip, remove a trailing ";" with rstrip(";"), and lower-case.',
    'rows_match: turn each row into a tuple with floats rounded (round(v, 4) when isinstance(v, float)). If ordered, compare the two lists; otherwise compare Counter(p) == Counter(g). Return False first if either side is None.',
    'guard: re.findall(r"\\b(?:from|join)\\s+([a-z_][a-z0-9_]*)", low) lists the tables, re.findall(r"[a-z_]+", low) lists the words, and re.search(r"\\blimit\\s+(\\d+)\\s*$", s, re.I) finds a final LIMIT.',
  ],
};
