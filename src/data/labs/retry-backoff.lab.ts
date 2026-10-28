import type { Lab } from './types';

export const lab: Lab = {
  id: 'retry-backoff',
  title: 'Retry with backoff and a circuit breaker',
  level: 'intermediate',
  minutes: 20,
  lesson: 'systems/model-routing-and-fallbacks',
  goal: 'A 429 from a model API is normal, and retrying badly makes it worse. Write a retry loop with exponential backoff and jitter that only retries errors that can pass, then a circuit breaker that stops calling a failing service.',
  steps: [
    'Write call_with_retry: retry only RateLimitError, wait with exponential backoff and full jitter (a random wait between 0 and the current limit), and stop after max_attempts.',
    'Do not retry other errors, such as ValueError for invalid input, because they will fail the same way again.',
    'Write CircuitBreaker.call: after N failures in a row it opens and refuses calls without touching the service, then lets one trial call through after the cool-down.',
  ],
  starter: `import time
import random

class RateLimitError(Exception):
    pass

class CircuitOpenError(Exception):
    pass

def call_with_retry(fn, max_attempts=4, base=0.5, cap=8.0, sleep=time.sleep, rand=random.random):
    # fn() either returns a value or raises. Retry only RateLimitError.
    # Wait before retry number n (n = 0 for the first retry) for rand() * min(cap, base * 2 ** n) seconds.
    # Do not wait after the last attempt. After max_attempts, raise the last error.
    # TODO
    ...

class CircuitBreaker:
    def __init__(self, failure_threshold=3, cooldown=30.0, clock=time.monotonic):
        self.failure_threshold = failure_threshold
        self.cooldown = cooldown
        self.clock = clock
        self.failures = 0        # failures in a row
        self.opened_at = None    # when the circuit opened, or None while it is closed

    def call(self, fn):
        # Closed: call fn. A success resets the count; a failure adds one, and at the threshold the circuit opens.
        # Open and still cooling down: raise CircuitOpenError without calling fn.
        # Open and cooled down: let one trial call through. Success closes the circuit; failure opens it again.
        # TODO
        ...

attempts = []
def flaky():
    attempts.append(1)
    if len(attempts) < 3:
        raise RateLimitError("429")
    return "ok"

print(call_with_retry(flaky, sleep=lambda s: None, rand=lambda: 0.5))
`,
  solution: `import time
import random

class RateLimitError(Exception):
    pass

class CircuitOpenError(Exception):
    pass

def call_with_retry(fn, max_attempts=4, base=0.5, cap=8.0, sleep=time.sleep, rand=random.random):
    for attempt in range(max_attempts):
        try:
            return fn()
        except RateLimitError:
            if attempt == max_attempts - 1:
                raise
            sleep(rand() * min(cap, base * 2 ** attempt))

class CircuitBreaker:
    def __init__(self, failure_threshold=3, cooldown=30.0, clock=time.monotonic):
        self.failure_threshold = failure_threshold
        self.cooldown = cooldown
        self.clock = clock
        self.failures = 0
        self.opened_at = None

    def call(self, fn):
        if self.opened_at is not None and self.clock() - self.opened_at < self.cooldown:
            raise CircuitOpenError("circuit is open")
        try:
            result = fn()
        except Exception:
            self.failures += 1
            if self.opened_at is not None or self.failures >= self.failure_threshold:
                self.opened_at = self.clock()
            raise
        self.failures = 0
        self.opened_at = None
        return result

attempts = []
def flaky():
    attempts.append(1)
    if len(attempts) < 3:
        raise RateLimitError("429")
    return "ok"

print(call_with_retry(flaky, sleep=lambda s: None, rand=lambda: 0.5))
`,
  tests: `
class _Fn:
    """A function that raises the given errors in order, then returns 'ok'. Counts its calls."""
    def __init__(self, errors):
        self.errors = list(errors)
        self.calls = 0
    def __call__(self):
        self.calls += 1
        if self.errors:
            raise self.errors.pop(0)
        return "ok"

def _naps():
    naps = []
    return naps, naps.append

def _first_try():
    naps, sleep = _naps()
    f = _Fn([])
    assert call_with_retry(f, sleep=sleep, rand=lambda: 1.0) == "ok"
    assert f.calls == 1 and naps == [], "no waiting when the first call works"
check("a call that works the first time returns at once, with no waiting", _first_try)

def _recovers():
    naps, sleep = _naps()
    f = _Fn([RateLimitError("429"), RateLimitError("429")])
    assert call_with_retry(f, max_attempts=4, sleep=sleep, rand=lambda: 1.0) == "ok"
    assert f.calls == 3 and len(naps) == 2, "two failures, so two waits and three calls"
check("retries a RateLimitError until the call works", _recovers)

def _backoff():
    naps, sleep = _naps()
    f = _Fn([RateLimitError("429")] * 10)
    try:
        call_with_retry(f, max_attempts=5, base=1.0, cap=4.0, sleep=sleep, rand=lambda: 1.0)
    except RateLimitError:
        pass
    assert naps == [1.0, 2.0, 4.0, 4.0], "waits should double and stop growing at the cap, got " + str(naps)
check("waits double each time, stop growing at the cap, and there is no wait after the last attempt", _backoff)

def _jitter():
    naps, sleep = _naps()
    f = _Fn([RateLimitError("429")] * 3)
    try:
        call_with_retry(f, max_attempts=3, base=2.0, cap=100.0, sleep=sleep, rand=lambda: 0.25)
    except RateLimitError:
        pass
    assert naps == [0.5, 1.0], "full jitter: each wait is rand() times the limit, got " + str(naps)
check("each wait is a random share of the limit (full jitter)", _jitter)

def _invalid():
    naps, sleep = _naps()
    f = _Fn([ValueError("bad input")])
    try:
        call_with_retry(f, sleep=sleep, rand=lambda: 1.0)
        assert False, "should have raised"
    except ValueError:
        pass
    assert f.calls == 1 and naps == [], "an invalid request will fail again, so do not retry it"
check("does not retry errors that will not change, such as ValueError", _invalid)

def _gives_up():
    f = _Fn([RateLimitError("first"), RateLimitError("second"), RateLimitError("last")])
    try:
        call_with_retry(f, max_attempts=3, sleep=lambda s: None, rand=lambda: 1.0)
        assert False, "should have raised"
    except RateLimitError as e:
        assert str(e) == "last", "raise the last error"
    assert f.calls == 3
check("stops after max_attempts and raises the last error", _gives_up)

class _Clock:
    def __init__(self):
        self.now = 0.0
    def __call__(self):
        return self.now

def _bad():
    raise RuntimeError("down")

def _opens():
    clock = _Clock()
    cb = CircuitBreaker(failure_threshold=3, cooldown=10.0, clock=clock)
    for _ in range(3):
        try:
            cb.call(_bad)
        except RuntimeError:
            pass
    f = _Fn([])
    try:
        cb.call(f)
        assert False, "should have refused"
    except CircuitOpenError:
        pass
    assert f.calls == 0, "an open circuit must not call the service"
check("the circuit opens after 3 failures in a row and refuses calls without touching the service", _opens)

def _resets():
    cb = CircuitBreaker(failure_threshold=3, cooldown=10.0, clock=_Clock())
    for _ in range(2):
        try:
            cb.call(_bad)
        except RuntimeError:
            pass
    assert cb.call(_Fn([])) == "ok"
    for _ in range(2):
        try:
            cb.call(_bad)
        except RuntimeError:
            pass
    assert cb.call(_Fn([])) == "ok", "only failures in a row count, so a success resets the count"
check("a success resets the count, so failures must be in a row", _resets)

def _recovery():
    clock = _Clock()
    cb = CircuitBreaker(failure_threshold=2, cooldown=10.0, clock=clock)
    for _ in range(2):
        try:
            cb.call(_bad)
        except RuntimeError:
            pass
    clock.now = 9.0
    try:
        cb.call(_Fn([]))
        assert False, "still cooling down"
    except CircuitOpenError:
        pass
    clock.now = 10.0
    assert cb.call(_Fn([])) == "ok", "after the cool-down one trial call goes through"
    assert cb.call(_Fn([])) == "ok", "and a good trial closes the circuit"
check("after the cool-down a trial call goes through, and success closes the circuit", _recovery)

def _trial_fails():
    clock = _Clock()
    cb = CircuitBreaker(failure_threshold=2, cooldown=10.0, clock=clock)
    for _ in range(2):
        try:
            cb.call(_bad)
        except RuntimeError:
            pass
    clock.now = 10.0
    try:
        cb.call(_bad)
    except RuntimeError:
        pass
    try:
        cb.call(_Fn([]))
        assert False, "a failed trial should open the circuit again"
    except CircuitOpenError:
        pass
check("a failed trial call opens the circuit again", _trial_fails)
`,
  hints: [
    'Loop over attempts. Wrap fn() in try/except RateLimitError, and return its result when it works. Any other exception just propagates.',
    'On the last attempt re-raise instead of sleeping. Otherwise sleep(rand() * min(cap, base * 2 ** attempt)), where attempt starts at 0.',
    'For the breaker, check first: if opened_at is set and clock() - opened_at < cooldown, raise CircuitOpenError. On a failure, count it, and set opened_at = clock() at the threshold or when a trial call fails.',
  ],
};
