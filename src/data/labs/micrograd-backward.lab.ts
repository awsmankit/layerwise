import type { Lab } from './types';

export const lab: Lab = {
  id: 'micrograd-backward',
  title: 'Write backpropagation: a tiny autograd engine',
  level: 'intermediate',
  minutes: 30,
  lesson: 'deep-learning/backprop-from-scratch',
  goal: 'Backpropagation is the chain rule applied to a graph of small operations. Fill in the backward step for addition, multiplication and tanh, then the loop that runs them in the right order, and check your gradients against a numerical estimate. The same engine then trains a single neuron.',
  steps: [
    'In __add__, write _backward: addition passes the gradient arriving at out straight on to both inputs. Use += so gradients from several uses of one value add up.',
    'In __mul__, write _backward: each input receives the other input\'s value times out.grad.',
    'In tanh, write _backward: the local slope is 1 - t * t, where t is the output value; multiply by out.grad.',
    'In backward(), set this node\'s grad to 1.0 and call each node\'s _backward in reverse topological order (the list `order` is already built for you). Then run the checks and watch the training loss fall.',
  ],
  starter: `import math

class Value:
    """A number that remembers how it was made, so gradients can flow back to its inputs."""

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0           # d(final result)/d(this value), filled in by backward()
        self._parents = parents
        self._backward = lambda: None

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def _backward():
            # TODO: addition passes out.grad on to both inputs (local derivative 1). Use +=.
            pass
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def _backward():
            # TODO: each input gets (the other input's value) * out.grad. Use +=.
            pass
        out._backward = _backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,))
        def _backward():
            # TODO: the local derivative of tanh is 1 - t * t. Multiply by out.grad. Use +=.
            pass
        out._backward = _backward
        return out

    def backward(self):
        order, seen = [], set()
        def visit(v):                     # depth-first: a node is added after everything it depends on
            if v not in seen:
                seen.add(v)
                for p in v._parents:
                    visit(p)
                order.append(v)
        visit(self)
        # TODO: set self.grad = 1.0, then call _backward() on every node, last-made first.

    # conveniences built from the two operations above: they work once add and mul do
    def __neg__(self): return self * -1
    def __sub__(self, other): return self + (-other if isinstance(other, Value) else -other)
    def __radd__(self, other): return self + other
    def __rmul__(self, other): return self * other


# Train one tanh neuron to say +1 only when both inputs are +1.
data = [((-1.0, -1.0), -1.0), ((-1.0, 1.0), -1.0), ((1.0, -1.0), -1.0), ((1.0, 1.0), 1.0)]
w1, w2, b = Value(0.3), Value(-0.2), Value(0.0)

def total_loss():
    loss = Value(0.0)
    for (x1, x2), y in data:
        err = (w1 * x1 + w2 * x2 + b).tanh() - y
        loss = loss + err * err
    return loss

for step in range(40):
    loss = total_loss()
    for p in (w1, w2, b):
        p.grad = 0.0
    loss.backward()
    for p in (w1, w2, b):
        p.data -= 0.1 * p.grad
    if step % 10 == 0:
        print("step", step, "loss", round(loss.data, 4))
`,
  solution: `import math

class Value:
    """A number that remembers how it was made, so gradients can flow back to its inputs."""

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0           # d(final result)/d(this value), filled in by backward()
        self._parents = parents
        self._backward = lambda: None

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def _backward():
            self.grad += out.grad
            other.grad += out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,))
        def _backward():
            self.grad += (1 - t * t) * out.grad
        out._backward = _backward
        return out

    def backward(self):
        order, seen = [], set()
        def visit(v):                     # depth-first: a node is added after everything it depends on
            if v not in seen:
                seen.add(v)
                for p in v._parents:
                    visit(p)
                order.append(v)
        visit(self)
        self.grad = 1.0
        for v in reversed(order):
            v._backward()

    # conveniences built from the two operations above: they work once add and mul do
    def __neg__(self): return self * -1
    def __sub__(self, other): return self + (-other if isinstance(other, Value) else -other)
    def __radd__(self, other): return self + other
    def __rmul__(self, other): return self * other


# Train one tanh neuron to say +1 only when both inputs are +1.
data = [((-1.0, -1.0), -1.0), ((-1.0, 1.0), -1.0), ((1.0, -1.0), -1.0), ((1.0, 1.0), 1.0)]
w1, w2, b = Value(0.3), Value(-0.2), Value(0.0)

def total_loss():
    loss = Value(0.0)
    for (x1, x2), y in data:
        err = (w1 * x1 + w2 * x2 + b).tanh() - y
        loss = loss + err * err
    return loss

for step in range(40):
    loss = total_loss()
    for p in (w1, w2, b):
        p.grad = 0.0
    loss.backward()
    for p in (w1, w2, b):
        p.data -= 0.1 * p.grad
    if step % 10 == 0:
        print("step", step, "loss", round(loss.data, 4))
`,
  tests: `
def _close(a, b, tol=1e-6):
    return abs(a - b) < tol

def _add():
    a, b = Value(2.0), Value(-3.0)
    c = a + b
    c.backward()
    assert c.data == -1.0
    assert a.grad == 1.0 and b.grad == 1.0, "addition passes the gradient on unchanged: got " + str((a.grad, b.grad))
check("add: both inputs receive the gradient unchanged", _add)

def _mul():
    a, b = Value(2.0), Value(-3.0)
    c = a * b
    c.backward()
    assert a.grad == -3.0, "a.grad should be b's value, -3.0; got " + str(a.grad)
    assert b.grad == 2.0, "b.grad should be a's value, 2.0; got " + str(b.grad)
check("multiply: each input gets the other input's value", _mul)

def _tanh():
    x = Value(0.5)
    y = x.tanh()
    y.backward()
    t = math.tanh(0.5)
    assert _close(x.grad, 1 - t * t), "expected 1 - tanh(x)^2 = " + str(1 - t * t) + ", got " + str(x.grad)
check("tanh: the local slope is 1 - tanh(x)^2", _tanh)

def _scaled():
    # the upstream gradient must be multiplied in, not dropped
    a = Value(1.5)
    y = (a * 3.0) * 2.0
    y.backward()
    assert _close(a.grad, 6.0), "d(6a)/da should be 6, got " + str(a.grad)
check("the chain rule multiplies along a path", _scaled)

def _reuse():
    a = Value(3.0)
    y = a * a
    y.backward()
    assert _close(a.grad, 6.0), "a used twice: d(a*a)/da = 2a = 6, got " + str(a.grad) + " (use += so contributions add up)"
    b = Value(4.0)
    z = b + b
    z.backward()
    assert _close(b.grad, 2.0), "b + b: gradient 2, got " + str(b.grad)
check("a value used twice collects both gradients", _reuse)

def _numeric(build, point):
    leaves = [Value(v) for v in point]
    build(*leaves).backward()
    h = 1e-6
    for k in range(len(point)):
        up = list(point); up[k] += h
        down = list(point); down[k] -= h
        num = (build(*[Value(v) for v in up]).data - build(*[Value(v) for v in down]).data) / (2 * h)
        assert _close(leaves[k].grad, num, 1e-5), "input " + str(k) + ": backprop gives " + str(leaves[k].grad) + ", numerical gives " + str(num)

def _numeric_chain():
    _numeric(lambda a, b, c: (a * b + c).tanh(), [0.8, -1.2, 0.3])
    _numeric(lambda a, b: (a * b + a).tanh() * b, [0.5, -1.5])
check("matches numerical gradients on tanh(a*b + c)", _numeric_chain)

def _numeric_diamond():
    # f = (a+b) * (a*b): a and b each feed two paths that rejoin, so order matters
    _numeric(lambda a, b: (a + b) * (a * b), [1.3, -0.7])
    _numeric(lambda a: (a * a).tanh() + a * 2.0, [0.6])
check("matches numerical gradients when paths split and rejoin", _numeric_diamond)

def _training():
    # a fresh run of the neuron from the bottom of your file: the loss must come down
    pts = [((-1.0, -1.0), -1.0), ((-1.0, 1.0), -1.0), ((1.0, -1.0), -1.0), ((1.0, 1.0), 1.0)]
    p1, p2, q = Value(0.3), Value(-0.2), Value(0.0)
    first = last = None
    for step in range(60):
        loss = Value(0.0)
        for (x1, x2), y in pts:
            err = (p1 * x1 + p2 * x2 + q).tanh() - y
            loss = loss + err * err
        for p in (p1, p2, q):
            p.grad = 0.0
        loss.backward()
        for p in (p1, p2, q):
            p.data -= 0.1 * p.grad
        if first is None:
            first = loss.data
        last = loss.data
    assert last < first * 0.5, "loss went from " + str(round(first, 3)) + " to " + str(round(last, 3)) + "; it should at least halve"
    for (x1, x2), y in pts:
        out = math.tanh(p1.data * x1 + p2.data * x2 + q.data)
        assert (out > 0) == (y > 0), "the trained neuron gets the point " + str((x1, x2)) + " wrong"
check("a neuron trained with your gradients learns the AND pattern", _training)
`,
  hints: [
    'Each _backward adds to its inputs\' .grad: for example self.grad += (something) * out.grad. Never use = here, because one value can be used more than once.',
    'For multiply, the derivative of self * other with respect to self is other.data, and with respect to other is self.data. Tanh: (1 - t * t) * out.grad, where t is the tanh output already stored in the variable t.',
    "In backward(): self.grad = 1.0, then for v in reversed(order): v._backward(). Reverse order guarantees that a node's own gradient is complete before it passes gradients on to its inputs.",
  ],
};
