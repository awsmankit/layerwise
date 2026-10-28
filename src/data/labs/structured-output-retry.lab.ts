import type { Lab } from './types';

export const lab: Lab = {
  id: 'structured-output-retry',
  title: 'Get a valid ticket, or fail clearly',
  level: 'intermediate',
  minutes: 15,
  lesson: 'llm/prompting-and-structured-output',
  goal: 'A model asked for JSON sometimes returns broken or wrong JSON. Write a validator and a loop that sends the error back to the model, retries a few times, and then fails with a clear message instead of passing bad data on.',
  steps: [
    'Write validate(data): return None if the ticket is fine, or a short error message. The category must be one of billing, bug or question, and the urgency must be a whole number from 1 to 5.',
    'Write get_ticket(model, email): ask the model, parse the reply as JSON, validate it, and return the ticket if it is good.',
    'If the reply is not valid JSON or fails validation, ask again with the error added to the prompt. Allow 3 attempts in total, then raise TicketError.',
  ],
  starter: `import json

CATEGORIES = {"billing", "bug", "question"}

class TicketError(Exception):
    pass

class FakeModel:
    """Replays scripted replies and remembers every prompt it was sent."""
    def __init__(self, replies):
        self.replies = list(replies)
        self.prompts = []
    def __call__(self, prompt):
        self.prompts.append(prompt)
        return self.replies.pop(0)

def validate(data):
    # Return None if data is a good ticket, otherwise a short error message that names the problem.
    # TODO
    ...

def get_ticket(model, email, max_attempts=3):
    prompt = "Reply with only JSON like {\\"category\\": ..., \\"urgency\\": ...} for this email:\\n" + email
    # TODO: call the model, parse, validate. On a problem, add the error to the prompt and try again.
    ...

model = FakeModel(['{"category": "bug", "urgency": 9}', '{"category": "bug", "urgency": 2}'])
print(get_ticket(model, "The export button does nothing."))
`,
  solution: `import json

CATEGORIES = {"billing", "bug", "question"}

class TicketError(Exception):
    pass

class FakeModel:
    """Replays scripted replies and remembers every prompt it was sent."""
    def __init__(self, replies):
        self.replies = list(replies)
        self.prompts = []
    def __call__(self, prompt):
        self.prompts.append(prompt)
        return self.replies.pop(0)

def validate(data):
    if not isinstance(data, dict):
        return "the reply must be a JSON object"
    if data.get("category") not in CATEGORIES:
        return "category must be one of " + ", ".join(sorted(CATEGORIES))
    urgency = data.get("urgency")
    if not isinstance(urgency, int) or isinstance(urgency, bool) or not 1 <= urgency <= 5:
        return "urgency must be a whole number from 1 to 5"
    return None

def get_ticket(model, email, max_attempts=3):
    base = "Reply with only JSON like {\\"category\\": ..., \\"urgency\\": ...} for this email:\\n" + email
    prompt = base
    error = ""
    for _ in range(max_attempts):
        raw = model(prompt)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            error = "the reply was not valid JSON (" + e.msg + ")"
        else:
            error = validate(data)
            if error is None:
                return data
        prompt = base + "\\nYour last reply was rejected: " + error + ". Reply again with only valid JSON."
    raise TicketError("gave up after " + str(max_attempts) + " attempts: " + error)

model = FakeModel(['{"category": "bug", "urgency": 9}', '{"category": "bug", "urgency": 2}'])
print(get_ticket(model, "The export button does nothing."))
`,
  tests: `
GOOD = '{"category": "bug", "urgency": 2}'

check("a good ticket passes validation", lambda: validate({"category": "bug", "urgency": 3}) is None)

def _bad_category():
    msg = validate({"category": "complaint", "urgency": 3})
    assert isinstance(msg, str) and "category" in msg, "return a message that names the category"
check("an unknown category is rejected with a message that names it", _bad_category)

def _bad_urgency():
    for bad in (0, 6, 2.5, "3", None):
        msg = validate({"category": "bug", "urgency": bad})
        assert isinstance(msg, str) and "urgency" in msg, "urgency " + repr(bad) + " should be rejected"
check("urgency must be a whole number from 1 to 5", _bad_urgency)

def _not_an_int():
    msg = validate({"category": "bug", "urgency": True})
    assert isinstance(msg, str), "True is a bool, not a number of urgency"
check("True is not accepted as an urgency, even though Python treats it as 1", _not_an_int)

def _shape():
    assert isinstance(validate(["bug", 3]), str), "a list is not a ticket"
    assert isinstance(validate({"category": "bug"}), str), "urgency is missing"
check("rejects replies that are not objects or are missing a field", _shape)

def _first_time():
    m = FakeModel([GOOD])
    assert get_ticket(m, "Export is broken") == {"category": "bug", "urgency": 2}
    assert len(m.prompts) == 1, "a good first reply needs only one call"
check("a good first reply is returned after one call", _first_time)

def _recovers():
    m = FakeModel(["Sure! Here you go: bug", GOOD])
    assert get_ticket(m, "Export is broken") == {"category": "bug", "urgency": 2}
    assert len(m.prompts) == 2
check("recovers from a reply that is not JSON", _recovers)

def _feeds_error_back():
    m = FakeModel(['{"category": "bug", "urgency": 9}', GOOD])
    get_ticket(m, "Export is broken")
    problem = validate({"category": "bug", "urgency": 9})
    assert problem in m.prompts[1], "the second prompt should contain the exact error from validate(): " + str(problem)
    assert "Export is broken" in m.prompts[1], "and still include the email"
    assert problem not in m.prompts[0], "the first prompt should not mention an error"
check("the retry prompt includes the error and still includes the email", _feeds_error_back)

def _gives_up():
    m = FakeModel(["nope", "still nope", '{"category": "x", "urgency": 1}', GOOD, GOOD])
    try:
        get_ticket(m, "Export is broken")
        assert False, "should have raised TicketError"
    except TicketError as e:
        assert "3" in str(e), "say how many attempts were made"
    assert len(m.prompts) == 3, "stop after 3 attempts, not more"
check("gives up after 3 attempts with a TicketError that says so", _gives_up)
`,
  hints: [
    'Parse with json.loads inside try/except json.JSONDecodeError. Treat a parse failure like a validation failure: it gives you an error message.',
    'Keep the original prompt, and for each retry build a new one: the original plus "Your last reply was rejected: <error>".',
    'Loop max_attempts times. Return the data as soon as validate(data) is None. After the loop, raise TicketError with the attempt count and the last error.',
  ],
};
