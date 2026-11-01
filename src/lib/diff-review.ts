/**
 * Data and grading for the "review the diff" exercise. Each case is a short, invented, AI-written change.
 * Lines carry a `tag` so the planted problems are described by name rather than by line number.
 */

export type LineKind = 'ctx' | 'add' | 'del' | 'file';
export type IssueKind = 'logic' | 'hallucinated-api' | 'removed-check' | 'secret' | 'weak-test' | 'error-handling';

export interface DiffLine {
  kind: LineKind;
  text: string;
  tag?: string;
}

export interface Issue {
  id: string;
  kind: IssueKind;
  /** Tags of the lines where flagging the problem counts as finding it. */
  tags: string[];
  title: string;
  why: string;
  /** What would have caught it without a human. */
  catchWith: string;
  /** Worth noting, but a review is complete without it. */
  minor?: boolean;
}

export interface DiffCase {
  id: string;
  title: string;
  /** What the person asked the AI for. */
  ask: string;
  file: string;
  lines: DiffLine[];
  issues: Issue[];
  /** For a change with no planted problem: why it is acceptable. */
  verdict?: string;
}

const ctx = (text: string, tag?: string): DiffLine => ({ kind: 'ctx', text, tag });
const add = (text: string, tag?: string): DiffLine => ({ kind: 'add', text, tag });
const del = (text: string, tag?: string): DiffLine => ({ kind: 'del', text, tag });
const file = (text: string): DiffLine => ({ kind: 'file', text });

export const CASES: DiffCase[] = [
  {
    id: 'pagination',
    title: 'Add pagination to the orders list',
    ask: 'Add page and page_size parameters to list_orders. Pages are numbered from 1.',
    file: 'orders/service.py',
    lines: [
      ctx('def list_orders(db, customer_id, page=1, page_size=20):'),
      del('    return db.query("SELECT * FROM orders WHERE customer_id = ?", customer_id)'),
      add('    offset = page * page_size', 'offset'),
      add('    return db.query('),
      add('        "SELECT * FROM orders WHERE customer_id = ? "'),
      add('        "ORDER BY created_at DESC LIMIT ? OFFSET ?",'),
      add('        customer_id, page_size, offset,'),
      add('    )'),
      file('tests/test_orders.py'),
      add('def test_list_orders_returns_a_page(db):'),
      add('    rows = list_orders(db, customer_id=7, page=2, page_size=20)', 'testcall'),
      add('    assert len(rows) <= 20', 'testassert'),
    ],
    issues: [
      {
        id: 'offset',
        kind: 'logic',
        tags: ['offset'],
        title: 'Off by one page',
        why: 'Pages are numbered from 1, so page 1 should skip no rows. With page * page_size, page 1 skips the first 20 and the first page of orders can never be seen. The offset should be (page - 1) * page_size.',
        catchWith: 'A test that creates 45 orders and asserts that page 1 returns the newest 20. The tests passed here because they never looked at which rows came back.',
      },
      {
        id: 'weak-test',
        kind: 'weak-test',
        tags: ['testassert', 'testcall'],
        minor: true,
        title: 'A test that cannot fail',
        why: 'assert len(rows) <= 20 is true for an empty list and for any page size or offset. It makes the change look tested without testing it.',
        catchWith: 'Reading the assertion and asking: what wrong implementation would make this fail? Mutation testing finds these automatically.',
      },
    ],
  },
  {
    id: 'cache',
    title: 'Cache the exchange rate for ten minutes',
    ask: 'get_rate calls the rates API on every request. Cache each currency for 10 minutes and add a test.',
    file: 'app/rates.py',
    lines: [
      ctx('from .client import fetch_rate'),
      add('import time'),
      add(''),
      add('_cache: dict[str, tuple[float, float]] = {}'),
      add('TTL_SECONDS = 600'),
      add(''),
      add(''),
      add('def get_rate(code: str) -> float:'),
      add('    now = time.monotonic()'),
      add('    hit = _cache.get(code)'),
      add('    if hit is not None and now - hit[0] < TTL_SECONDS:'),
      add('        return hit[1]'),
      add('    rate = fetch_rate(code)'),
      add('    _cache[code] = (now, rate)'),
      add('    return rate'),
      file('tests/test_rates.py'),
      add('def test_second_call_uses_the_cache(monkeypatch):'),
      add('    calls = []'),
      add('    monkeypatch.setattr(rates, "fetch_rate", lambda code: calls.append(code) or 1.25)'),
      add('    rates._cache.clear()'),
      add('    assert rates.get_rate("EUR") == 1.25'),
      add('    assert rates.get_rate("EUR") == 1.25'),
      add('    assert calls == ["EUR"]'),
    ],
    issues: [],
    verdict:
      'This one is fine. It does what was asked, uses time.monotonic so a clock change cannot break expiry, keys the cache by currency, and ships a test that fails if the cache is removed. A reviewer might still ask about thread safety or an unbounded cache, but the keys are currency codes, so the cache stays small. Flagging nothing here is the right call.',
  },
  {
    id: 'iso',
    title: 'Parse the new ISO 8601 webhook timestamp',
    ask: 'The webhook now sends timestamps like 2026-03-01T09:30:00+00:00. Update parse_event_time.',
    file: 'webhooks/events.py',
    lines: [
      ctx('from datetime import datetime'),
      ctx(''),
      ctx('def parse_event_time(payload: dict) -> datetime:'),
      ctx('    raw = payload["timestamp"]'),
      del('    return datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")'),
      add('    return datetime.parse_iso(raw)', 'parse'),
    ],
    issues: [
      {
        id: 'parse',
        kind: 'hallucinated-api',
        tags: ['parse'],
        title: 'A method that does not exist',
        why: 'datetime has no parse_iso. The real method is datetime.fromisoformat. The name sounds right, which is exactly why a model writes it and a tired reviewer skims past it. The code would fail with AttributeError the first time a webhook arrives.',
        catchWith: 'Running the code once, a type checker such as mypy or pyright, or a test that parses the sample timestamp. The same habit catches invented package names: check that every import exists and is the one you meant.',
      },
    ],
  },
  {
    id: 'authz',
    title: 'Fix the 403 error admins see on invoices',
    ask: 'Admins sometimes get a 403 when they open a customer invoice. Fix it. All tests must pass.',
    file: 'billing/routes.py',
    lines: [
      ctx('@router.get("/invoices/{invoice_id}")'),
      ctx('def get_invoice(invoice_id: int, user: User = Depends(current_user)):'),
      ctx('    invoice = repo.get_invoice(invoice_id)'),
      del('    if invoice.owner_id != user.id and not user.is_admin:', 'check'),
      del('        raise HTTPException(status_code=403, detail="Not your invoice")', 'check'),
      ctx('    return invoice'),
    ],
    issues: [
      {
        id: 'check',
        kind: 'removed-check',
        tags: ['check'],
        title: 'The authorisation check was deleted',
        why: 'The 403 was the owner check working. Deleting it makes the error go away for admins and also lets every signed-in user read every invoice. The model was told the tests must pass, and no test asked whether other customers are refused.',
        catchWith: 'Reading the removed lines (deletions deserve as much attention as additions) and a negative test: a different customer requests this invoice and must get a 403.',
      },
    ],
  },
  {
    id: 'secret',
    title: 'Post the weekly report to Slack',
    ask: 'Post the weekly report text to the #reports Slack channel.',
    file: 'reports/notify.py',
    lines: [
      add('import requests'),
      add(''),
      add('API_TOKEN = "xoxb-EXAMPLE-0000-not-a-real-token"', 'token'),
      add(''),
      add('def post_report(text: str) -> None:'),
      add('    requests.post(', 'post'),
      add('        "https://slack.com/api/chat.postMessage",'),
      add('        headers={"Authorization": f"Bearer {API_TOKEN}"},', 'token'),
      add('        json={"channel": "#reports", "text": text},'),
      add('        timeout=10,'),
      add('    )'),
    ],
    issues: [
      {
        id: 'token',
        kind: 'secret',
        tags: ['token'],
        title: 'A credential in the source code',
        why: 'A token in a file is a token in version control, in every clone and every build log. The value here is invented for the exercise; a real one would need to be revoked even if the commit were deleted. Read it from an environment variable or a secrets manager.',
        catchWith: 'A secret scanner in the pre-commit hook or in CI, and push protection on the repository. Also: never paste real credentials into a prompt, because the agent may copy them into the code.',
      },
      {
        id: 'response',
        kind: 'error-handling',
        tags: ['post'],
        minor: true,
        title: 'The response is ignored',
        why: 'The Slack API reports many failures in the response body, and the call here would silently do nothing. Minor next to the token, but a reviewer might ask for a check.',
        catchWith: 'A test with a stubbed failing response.',
      },
    ],
  },
];

/** Indices of the lines that belong to an issue. */
export function issueLines(c: DiffCase, issue: Issue): number[] {
  return c.lines.map((l, i) => (l.tag && issue.tags.includes(l.tag) ? i : -1)).filter((i) => i >= 0);
}

export type Outcome = 'approved-good' | 'false-alarm' | 'found-all' | 'found-some' | 'missed' | 'approved-bad';

export interface Graded {
  outcome: Outcome;
  /** Required problems the review found, by issue id. */
  found: string[];
  /** Required problems the review missed. */
  missed: string[];
  /** Minor problems the review noticed. */
  minorFound: string[];
  /** Flagged lines that are not part of any problem. */
  falseFlags: number[];
  /** Everything a reviewer needed to do was done and nothing was wrongly flagged. */
  full: boolean;
}

/** Grade a review. `flagged` holds the indices of the lines the learner marked as a problem. */
export function gradeReview(c: DiffCase, flagged: number[]): Graded {
  const flags = [...new Set(flagged)].sort((a, b) => a - b);
  const lines = new Map(c.issues.map((i) => [i, issueLines(c, i)]));
  const hit = (i: Issue) => lines.get(i)!.some((n) => flags.includes(n));
  const required = c.issues.filter((i) => !i.minor);
  const found = required.filter(hit).map((i) => i.id);
  const missed = required.filter((i) => !hit(i)).map((i) => i.id);
  const minorFound = c.issues.filter((i) => i.minor && hit(i)).map((i) => i.id);
  const covered = new Set([...lines.values()].flat());
  const falseFlags = flags.filter((n) => !covered.has(n));

  let outcome: Outcome;
  if (required.length === 0) outcome = flags.length === 0 ? 'approved-good' : 'false-alarm';
  else if (found.length === required.length) outcome = 'found-all';
  else if (found.length > 0) outcome = 'found-some';
  else outcome = flags.length === 0 ? 'approved-bad' : 'missed';

  const full = required.length === 0 ? flags.length === 0 : missed.length === 0 && falseFlags.length === 0;
  return { outcome, found, missed, minorFound, falseFlags, full };
}

/** Count of cases reviewed with full marks. */
export function score(results: (Graded | undefined)[]): { full: number; reviewed: number } {
  return { full: results.filter((r) => r?.full).length, reviewed: results.filter(Boolean).length };
}
