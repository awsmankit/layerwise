import type { Lab } from './types';

export const lab: Lab = {
  id: 'causal-attention',
  title: 'Write causal attention',
  level: 'advanced',
  minutes: 25,
  lesson: 'foundations/inside-a-transformer',
  goal: 'Attention lets each token blend in information from the tokens before it. Write single-head scaled dot-product attention with a causal mask, using plain lists instead of numpy.',
  steps: [
    'Score every pair: scores[i][j] is the dot product of query i and key j, divided by the square root of d.',
    'Apply the causal mask: token i must not see any token j after it, so set those scores to minus infinity.',
    'Turn each row of scores into weights with the softmax helper. Each row must sum to 1.',
    'Blend the values: output row i is the sum over j of weights[i][j] times V[j]. Return (weights, output).',
  ],
  starter: `import math

def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

def softmax(scores):
    # Works with float("-inf"): exp(-inf) is 0, so a masked score gets weight 0.
    top = max(scores)
    exps = [math.exp(s - top) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]

def attention(Q, K, V):
    # Q, K, V are lists with one vector per token (tokens x d).
    # Return (weights, output): weights is tokens x tokens, output is tokens x d.
    # TODO: scores -> causal mask -> softmax per row -> weighted sum of V
    ...

Q = K = V = [[1.0, 0.0], [0.0, 1.0]]
print(attention(Q, K, V))
`,
  solution: `import math

def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

def softmax(scores):
    # Works with float("-inf"): exp(-inf) is 0, so a masked score gets weight 0.
    top = max(scores)
    exps = [math.exp(s - top) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]

def attention(Q, K, V):
    n = len(Q)
    d = len(Q[0])
    weights = []
    for i in range(n):
        row = []
        for j in range(n):
            if j > i:
                row.append(float("-inf"))
            else:
                row.append(dot(Q[i], K[j]) / math.sqrt(d))
        weights.append(softmax(row))
    output = []
    for i in range(n):
        out = [0.0] * len(V[0])
        for j in range(n):
            for c in range(len(V[0])):
                out[c] += weights[i][j] * V[j][c]
        output.append(out)
    return weights, output

Q = K = V = [[1.0, 0.0], [0.0, 1.0]]
print(attention(Q, K, V))
`,
  tests: `
def _close(a, b, tol=1e-9):
    return abs(a - b) < tol

_I = [[1.0, 0.0], [0.0, 1.0]]

check("every row of weights sums to 1", lambda: all(_close(sum(r), 1.0) for r in attention(_I, _I, _I)[0]))
check("a token gets zero weight on every token after it", lambda: _close(attention(_I, _I, _I)[0][0][1], 0.0))
check("the first token attends only to itself", lambda: _close(attention(_I, _I, _I)[0][0][0], 1.0))

def _hand_example():
    # Row 1 scores are [0, 1/sqrt(2)] for Q = K = identity, so the weights are softmax of those.
    s = 1 / math.sqrt(2)
    w1 = 1 / (1 + math.exp(s))
    w, out = attention(_I, _I, _I)
    assert _close(w[1][0], w1), "weight on token 0 should be " + str(round(w1, 4)) + ", got " + str(w[1][0])
    assert _close(w[1][1], 1 - w1)
    assert _close(out[1][0], w1) and _close(out[1][1], 1 - w1), "output should be the weights times V"
check("matches a hand-worked 2 by 2 example", _hand_example)

def _scaling():
    # Without dividing by sqrt(d) the weights would differ. Here d = 2 and the scores are [0, 4].
    Q = [[2.0, 0.0], [0.0, 2.0]]
    w = attention(Q, Q, Q)[0]
    s = 4 / math.sqrt(2)
    assert _close(w[1][1], math.exp(s) / (1 + math.exp(s))), "divide the scores by the square root of d"
check("divides the scores by the square root of d", _scaling)

def _causal():
    # Changing a later token must never change an earlier token's output.
    Q = [[1.0, 0.0], [0.5, 0.5], [0.0, 1.0]]
    V = [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]
    a = attention(Q, Q, V)[1]
    Q2 = [Q[0], Q[1], [9.0, -9.0]]
    V2 = [V[0], V[1], [100.0, 100.0]]
    b = attention(Q2, Q2, V2)[1]
    assert a[0] == b[0] and a[1] == b[1], "earlier outputs changed when only the last token changed"
check("later tokens never change earlier outputs", _causal)

def _shape():
    Q = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 1.0, 1.0]]
    w, out = attention(Q, Q, Q)
    assert len(w) == 4 and all(len(r) == 4 for r in w), "weights should be tokens x tokens"
    assert len(out) == 4 and all(len(r) == 3 for r in out), "output should be tokens x d"
check("returns weights (tokens x tokens) and output (tokens x d)", _shape)
`,
  hints: [
    'Build one row of scores at a time. For token i, loop j over all tokens and put float("-inf") where j > i.',
    'Mask before the softmax, not after. If you zero the weights afterwards, the row no longer sums to 1.',
    'weights[i][j] = softmax over row i; output[i] = sum over j of weights[i][j] * V[j], added element by element.',
  ],
};
