/**
 * A practice lab: a short Python exercise that runs and checks itself in the
 * browser (Pyodide). The learner edits `starter`, presses Run checks, and sees which
 * checks pass. The same prelude, solution and tests also run under real Python in
 * the test suite, so a lab whose solution fails its own tests cannot ship.
 */
export type Lab = {
  id: string;
  title: string;
  level: 'basic' | 'intermediate' | 'advanced';
  minutes: number;
  /** Key of the lesson that teaches the idea, such as 'rag-agents/rag-from-scratch'. */
  lesson?: string;
  /** What the learner builds and why, in one or two plain sentences. */
  goal: string;
  /** Short numbered instructions, one line each. */
  steps?: string[];
  /** Code the learner starts from: working scaffolding, with the part to write marked TODO. It must run without an error. */
  starter: string;
  /** A correct answer. Shown on request, and used by the test suite. */
  solution: string;
  /** Python that calls check(name, fn) for each requirement. See `prelude`. */
  tests: string;
  /** Up to three nudges, from gentle to nearly the answer. */
  hints: string[];
};

/**
 * Python run before the learner's code and the tests. `check` records one result;
 * `_report()` returns the results as JSON. A test fails when its function raises or
 * returns something false; returning None counts as a pass, so a test can just assert.
 */
export const prelude = `
import json as _json
_results = []
def check(name, fn):
    try:
        ok = fn()
        _results.append({"name": name, "ok": True if ok is None else bool(ok), "why": ""})
    except Exception as e:
        _results.append({"name": name, "ok": False, "why": type(e).__name__ + ": " + str(e)})
def _report():
    return _json.dumps(_results)
`;

export type CheckResult = { name: string; ok: boolean; why: string };

/** Everything to run, in order: prelude, the learner's code, then the tests. */
export const program = (code: string, tests: string) => `${prelude}\n${code}\n${tests}\n`;
