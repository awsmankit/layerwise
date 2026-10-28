import type { Lab } from './types';

export const lab: Lab = {
  id: 'sampling-temperature',
  title: 'Temperature and top-p, from scratch',
  level: 'intermediate',
  minutes: 15,
  lesson: 'llm/parameters-and-hyperparameters',
  goal: 'A model scores every possible next token, and sampling settings decide how those scores become a choice. Write softmax with a temperature, then top-p filtering, and see for yourself why low temperature repeats and high temperature wanders.',
  steps: [
    'softmax(logits, temperature): divide the scores by the temperature, then turn them into probabilities that add up to 1. Subtract the largest score first so big numbers cannot overflow. A temperature of 0 or less raises ValueError.',
    'top_p_filter(probs, p): keep the most likely tokens, in order, until their running total reaches p (include the token that reaches it). Set the rest to 0, then scale what is left so it adds up to 1. Keep the original order of the list.',
  ],
  starter: `import math

def softmax(logits, temperature=1.0):
    # TODO: probabilities from scores, sharpened or flattened by temperature
    ...

def top_p_filter(probs, p):
    # TODO: zero out the long tail, then renormalise
    ...

logits = [2.0, 1.0, 0.1]
print(softmax(logits))
print(top_p_filter([0.5, 0.3, 0.15, 0.05], 0.9))
`,
  solution: `import math

def softmax(logits, temperature=1.0):
    if temperature <= 0:
        raise ValueError("temperature must be above 0")
    top = max(logits)
    exps = [math.exp((x - top) / temperature) for x in logits]
    total = sum(exps)
    return [e / total for e in exps]

def top_p_filter(probs, p):
    order = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)
    keep = set()
    running = 0.0
    for i in order:
        keep.add(i)
        running += probs[i]
        if running >= p - 1e-12:
            break
    kept_total = sum(probs[i] for i in keep)
    return [probs[i] / kept_total if i in keep else 0.0 for i in range(len(probs))]

logits = [2.0, 1.0, 0.1]
print(softmax(logits))
print(top_p_filter([0.5, 0.3, 0.15, 0.05], 0.9))
`,
  tests: `
def _close(a, b, tol=1e-3):
    return len(a) == len(b) and all(abs(x - y) <= tol for x, y in zip(a, b))

def _raises(fn):
    try:
        fn()
    except ValueError:
        return True
    return False

logits = [2.0, 1.0, 0.1]
check("probabilities add up to 1", lambda: abs(sum(softmax(logits)) - 1) < 1e-9 and abs(sum(softmax(logits, 0.5)) - 1) < 1e-9)
check("at temperature 1 the scores 2.0, 1.0, 0.1 give about 0.659, 0.242, 0.099", lambda: _close(softmax(logits), [0.659, 0.2424, 0.0986]))
check("temperature 0.5 sharpens: the top token gets more", lambda: softmax(logits, 0.5)[0] > softmax(logits, 1.0)[0])
check("temperature 2.0 flattens: the top token gets less", lambda: softmax(logits, 2.0)[0] < softmax(logits, 1.0)[0])
check("a very low temperature is almost certain of the top token", lambda: softmax(logits, 0.01)[0] > 0.999)
check("huge scores do not overflow", lambda: abs(sum(softmax([1000.0, 999.0, 0.0])) - 1) < 1e-9 and softmax([1000.0, 999.0, 0.0])[0] > softmax([1000.0, 999.0, 0.0])[1])
check("temperature 0 or below raises ValueError", lambda: _raises(lambda: softmax(logits, 0)) and _raises(lambda: softmax(logits, -1)))
check("top-p 0.8 keeps the top two tokens, rescaled to 0.625 and 0.375", lambda: _close(top_p_filter([0.5, 0.3, 0.15, 0.05], 0.8), [0.625, 0.375, 0.0, 0.0]))
check("top-p 0.9 also keeps the token that carries the total past 0.9", lambda: _close(top_p_filter([0.5, 0.3, 0.15, 0.05], 0.9), [0.5 / 0.95, 0.3 / 0.95, 0.15 / 0.95, 0.0]))
check("top-p keeps the original order of the list", lambda: _close(top_p_filter([0.05, 0.5, 0.15, 0.3], 0.8), [0.0, 0.625, 0.0, 0.375]))
check("top-p 1.0 keeps everything, and a tiny p still keeps the best token", lambda: _close(top_p_filter([0.5, 0.3, 0.2], 1.0), [0.5, 0.3, 0.2]) and _close(top_p_filter([0.5, 0.3, 0.2], 0.01), [1.0, 0.0, 0.0]))
`,
  hints: [
    'Softmax is exp(score / temperature) for each score, divided by the sum of those values.',
    'To avoid overflow, subtract max(logits) from every score before dividing by the temperature. The probabilities come out the same.',
    'For top-p, sort the indexes by probability (highest first), add them to a keep set while a running total builds, and stop once the total is at least p. Then divide each kept probability by the kept total.',
  ],
};
