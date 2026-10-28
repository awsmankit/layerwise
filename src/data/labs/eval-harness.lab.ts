import type { Lab } from './types';

export const lab: Lab = {
  id: 'eval-harness',
  title: 'Build a tiny eval harness',
  level: 'intermediate',
  minutes: 20,
  lesson: 'evals/evals-101',
  goal: 'An eval set only helps if you can score it and compare two versions of a prompt. Write the scorers, an accuracy report with a per-category breakdown, and a comparison that flags regressions even when the overall score looks the same.',
  steps: [
    'Write exact_match and contains. Ignore case and spaces around the text.',
    'Write run_eval(cases, outputs, scorer): score every case, and return the accuracy, the accuracy per category, and the ids that passed. A case with no output fails.',
    'Write compare(before, after): list the ids that regressed (passed before, fail now) and the ids that were fixed (failed before, pass now).',
  ],
  starter: `CASES = [
    {"id": "a1", "category": "billing", "expected": "refund"},
    {"id": "a2", "category": "billing", "expected": "invoice"},
    {"id": "b1", "category": "bug", "expected": "reproduce"},
    {"id": "b2", "category": "bug", "expected": "stack trace"},
]

def exact_match(output, expected):
    # True if the two texts are equal once case and surrounding spaces are ignored.
    # TODO
    ...

def contains(output, expected):
    # True if expected appears inside output, ignoring case.
    # TODO
    ...

def run_eval(cases, outputs, scorer):
    # outputs maps a case id to the model's text. A case with no output fails.
    # Return {"accuracy": float, "by_category": {category: accuracy}, "passed": [ids, in case order]}.
    # An empty list of cases has accuracy 0.0, not an error.
    # TODO
    ...

def compare(before, after):
    # before and after are results from run_eval.
    # Return {"regressions": sorted ids that passed before and fail now, "fixes": sorted ids that failed before and pass now}.
    # TODO
    ...

outputs = {"a1": "We will refund you", "a2": "see invoice", "b1": "please reproduce it", "b2": "unsure"}
print(run_eval(CASES, outputs, contains))
`,
  solution: `CASES = [
    {"id": "a1", "category": "billing", "expected": "refund"},
    {"id": "a2", "category": "billing", "expected": "invoice"},
    {"id": "b1", "category": "bug", "expected": "reproduce"},
    {"id": "b2", "category": "bug", "expected": "stack trace"},
]

def exact_match(output, expected):
    return output.strip().lower() == expected.strip().lower()

def contains(output, expected):
    return expected.strip().lower() in output.lower()

def run_eval(cases, outputs, scorer):
    passed = []
    per_cat = {}
    for case in cases:
        ok = case["id"] in outputs and scorer(outputs[case["id"]], case["expected"])
        if ok:
            passed.append(case["id"])
        total, good = per_cat.get(case["category"], (0, 0))
        per_cat[case["category"]] = (total + 1, good + (1 if ok else 0))
    accuracy = len(passed) / len(cases) if cases else 0.0
    return {
        "accuracy": accuracy,
        "by_category": {c: good / total for c, (total, good) in per_cat.items()},
        "passed": passed,
    }

def compare(before, after):
    was, now = set(before["passed"]), set(after["passed"])
    return {"regressions": sorted(was - now), "fixes": sorted(now - was)}

outputs = {"a1": "We will refund you", "a2": "see invoice", "b1": "please reproduce it", "b2": "unsure"}
print(run_eval(CASES, outputs, contains))
`,
  tests: `
check("exact_match ignores case and surrounding spaces", lambda: exact_match("  Refund ", "refund") is True)
check("exact_match is not the same as contains", lambda: exact_match("a refund please", "refund") is False)
check("contains finds the text anywhere, ignoring case", lambda: contains("We will REFUND you", "refund") is True and contains("hello", "refund") is False)

def _scores():
    out = {"a1": "We will refund you", "a2": "wrong", "b1": "reproduce", "b2": "unsure"}
    r = run_eval(CASES, out, contains)
    assert abs(r["accuracy"] - 0.5) < 1e-9, "2 of 4 passed, got " + str(r["accuracy"])
    assert r["passed"] == ["a1", "b1"], "passed ids, in case order: " + str(r["passed"])
check("accuracy and the passed ids are right", _scores)

def _by_cat():
    out = {"a1": "refund", "a2": "invoice", "b1": "x", "b2": "y"}
    r = run_eval(CASES, out, contains)
    assert r["by_category"] == {"billing": 1.0, "bug": 0.0}, "got " + str(r["by_category"])
check("reports accuracy per category, so a weak category is visible", _by_cat)

def _missing():
    r = run_eval(CASES, {"a1": "refund"}, contains)
    assert r["passed"] == ["a1"] and abs(r["accuracy"] - 0.25) < 1e-9, "cases with no output fail"
check("a case with no output counts as a failure", _missing)

def _empty():
    r = run_eval([], {}, contains)
    assert r["accuracy"] == 0.0 and r["passed"] == [] and r["by_category"] == {}
check("an empty case list gives accuracy 0.0 instead of an error", _empty)

def _same_score_still_regressed():
    before = run_eval(CASES, {"a1": "refund", "a2": "invoice", "b1": "x", "b2": "y"}, contains)
    after = run_eval(CASES, {"a1": "x", "a2": "invoice", "b1": "reproduce", "b2": "y"}, contains)
    assert before["accuracy"] == after["accuracy"] == 0.5, "the scores are tied"
    d = compare(before, after)
    assert d["regressions"] == ["a1"], "a1 passed before and fails now, even though the accuracy is the same: " + str(d)
    assert d["fixes"] == ["b1"], "b1 was fixed"
check("finds a regression even when the overall score is unchanged", _same_score_still_regressed)

def _no_change():
    r = run_eval(CASES, {"a1": "refund"}, contains)
    d = compare(r, r)
    assert d == {"regressions": [], "fixes": []}
check("comparing a result with itself shows no regressions and no fixes", _no_change)
`,
  hints: [
    'Normalise first: output.strip().lower() == expected.strip().lower() for exact_match, and expected.lower() in output.lower() for contains.',
    'Walk the cases once. A case passes when its id is in outputs and scorer(outputs[id], expected) is true. Keep a per-category count of total and passed.',
    'compare: turn each "passed" list into a set. Regressions are the ids in before but not after, fixes are in after but not before. Return them sorted.',
  ],
};
