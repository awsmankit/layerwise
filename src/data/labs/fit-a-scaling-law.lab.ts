import type { Lab } from './types';

export const lab: Lab = {
  id: 'fit-a-scaling-law',
  title: 'Fit a scaling law and see how far it can be trusted',
  level: 'advanced',
  minutes: 30,
  lesson: 'deep-learning/scaling-laws',
  goal: 'A scaling law is a straight line on log-log axes. Fit one to eight small training runs with least squares, use it to predict the loss of a run ten times bigger than any you fitted, then see how the prediction changes when you assume a floor under the loss, and how much the answer moves when that assumption is a little wrong. The loss values are invented for this lab; they are not from a real model.',
  steps: [
    'In fit_power_law, take log10 of every x and y, then compute the least-squares slope (the exponent) and intercept. Return (coef, exponent) where y = coef * x ** exponent.',
    'In predict, return coef * x ** exponent.',
    'Run the script: the fit uses only the six cheapest runs and predicts the two biggest, which were held back. Read the relative errors. A negative error means the prediction was lower (more hopeful) than the real loss.',
    'In fit_with_floor, fit the power law to the loss minus a floor instead, and add the floor back when predicting. Compare its error on the held-out runs with the plain fit.',
    'Look at the last printout: the same data, three plausible floors, a prediction at 1e24 FLOPs, a thousand times beyond the biggest run you fitted.',
  ],
  starter: `import math

# Invented example data for this lab, not from a real model:
# (training compute in FLOPs, final validation loss).
RUNS = [
    (1e17, 4.31), (3e17, 3.97), (1e18, 3.68), (3e18, 3.42),
    (1e19, 3.21), (3e19, 3.01),          # the six runs you can afford
    (1e20, 2.83), (1e21, 2.56),          # held back: pretend these have not been run yet
]
cheap, big = RUNS[:6], RUNS[6:]


def fit_power_law(points):
    """Least-squares line through (log10 x, log10 y). Return (coef, exponent) for y = coef * x ** exponent."""
    # TODO: logs of x and of y; the slope is sum((lx - mean_lx) * (ly - mean_ly)) / sum((lx - mean_lx) ** 2);
    # the intercept is mean_ly - slope * mean_lx; coef = 10 ** intercept.
    return (1.0, 0.0)


def predict(fit, x):
    coef, exponent = fit
    # TODO: the fitted line's value at x.
    return 0.0


def relative_error(predicted, actual):
    return (predicted - actual) / actual


def fit_with_floor(points, floor):
    """Fit y - floor as a power law. Return a function that predicts the loss at any x."""
    # TODO: fit_power_law on (x, y - floor), then return a function f(x) that gives floor + predict(...).
    return lambda x: 0.0


plain = fit_power_law(cheap)
print("plain fit: loss = %.2f * C ** %.4f" % plain)
for x, y in big:
    print("  C = %.0e  actual %.2f  predicted %.3f  error %+.1f%%" % (x, y, predict(plain, x), 100 * relative_error(predict(plain, x), y)))

with_floor = fit_with_floor(cheap, 1.7)
for x, y in big:
    print("  with a floor of 1.7: C = %.0e  predicted %.3f  error %+.1f%%" % (x, with_floor(x), 100 * relative_error(with_floor(x), y)))

print("prediction at 1e24 FLOPs:")
print("  plain power law:", round(predict(plain, 1e24), 3))
for f in (1.5, 1.7, 1.9):
    print("  floor", f, ":", round(fit_with_floor(cheap, f)(1e24), 3))
`,
  solution: `import math

# Invented example data for this lab, not from a real model:
# (training compute in FLOPs, final validation loss).
RUNS = [
    (1e17, 4.31), (3e17, 3.97), (1e18, 3.68), (3e18, 3.42),
    (1e19, 3.21), (3e19, 3.01),          # the six runs you can afford
    (1e20, 2.83), (1e21, 2.56),          # held back: pretend these have not been run yet
]
cheap, big = RUNS[:6], RUNS[6:]


def fit_power_law(points):
    """Least-squares line through (log10 x, log10 y). Return (coef, exponent) for y = coef * x ** exponent."""
    lx = [math.log10(x) for x, _ in points]
    ly = [math.log10(y) for _, y in points]
    n = len(points)
    mx = sum(lx) / n
    my = sum(ly) / n
    slope = sum((a - mx) * (b - my) for a, b in zip(lx, ly)) / sum((a - mx) ** 2 for a in lx)
    intercept = my - slope * mx
    return (10 ** intercept, slope)


def predict(fit, x):
    coef, exponent = fit
    return coef * x ** exponent


def relative_error(predicted, actual):
    return (predicted - actual) / actual


def fit_with_floor(points, floor):
    """Fit y - floor as a power law. Return a function that predicts the loss at any x."""
    fit = fit_power_law([(x, y - floor) for x, y in points])
    return lambda x: floor + predict(fit, x)


plain = fit_power_law(cheap)
print("plain fit: loss = %.2f * C ** %.4f" % plain)
for x, y in big:
    print("  C = %.0e  actual %.2f  predicted %.3f  error %+.1f%%" % (x, y, predict(plain, x), 100 * relative_error(predict(plain, x), y)))

with_floor = fit_with_floor(cheap, 1.7)
for x, y in big:
    print("  with a floor of 1.7: C = %.0e  predicted %.3f  error %+.1f%%" % (x, with_floor(x), 100 * relative_error(with_floor(x), y)))

print("prediction at 1e24 FLOPs:")
print("  plain power law:", round(predict(plain, 1e24), 3))
for f in (1.5, 1.7, 1.9):
    print("  floor", f, ":", round(fit_with_floor(cheap, f)(1e24), 3))
`,
  tests: `
def _close(a, b, tol=1e-6):
    return abs(a - b) < tol

def _clean():
    pts = [(x, 3.0 * x ** -0.25) for x in (1.0, 10.0, 100.0, 1000.0)]
    coef, exponent = fit_power_law(pts)
    assert _close(exponent, -0.25, 1e-9), "exponent should be -0.25, got " + str(exponent)
    assert _close(coef, 3.0, 1e-9), "coefficient should be 3.0, got " + str(coef)
check("fit_power_law recovers y = 3 * x ** -0.25 exactly", _clean)

def _predict():
    assert _close(predict((3.0, -0.25), 16.0), 1.5), "3 * 16 ** -0.25 is 1.5, got " + str(predict((3.0, -0.25), 16.0))
check("predict evaluates coef * x ** exponent", _predict)

def _cheap_fit():
    coef, exponent = fit_power_law(cheap)
    assert _close(exponent, -0.06241, 2e-4), "exponent on the six cheap runs should be about -0.0624, got " + str(round(exponent, 5))
    assert _close(coef, 49.13, 0.05), "coefficient should be about 49.13, got " + str(round(coef, 3))
check("the six cheap runs give exponent about -0.0624", _cheap_fit)

def _held_out():
    fit = fit_power_law(cheap)
    err = relative_error(predict(fit, 1e21), 2.56)
    assert _close(err, -0.0615, 0.003), "relative error at 1e21 should be about -6.2% (too hopeful), got " + str(round(err, 4))
    err100 = relative_error(predict(fit, 1e20), 2.83)
    assert err100 < 0 and abs(err100) < abs(err), "the error should be smaller at 1e20 than at 1e21 and also negative: " + str(round(err100, 4))
check("a plain power law is too hopeful, and more so the further it extrapolates", _held_out)

def _floor():
    f = fit_with_floor(cheap, 1.7)
    for x, y in big:
        e = relative_error(f(x), y)
        assert abs(e) < 0.005, "with the right floor the error at " + str(x) + " should be under 0.5%, got " + str(round(e, 4))
check("with a floor of 1.7 the held-out runs are predicted to within 0.5%", _floor)

def _beyond():
    plain = fit_power_law(cheap)
    p = predict(plain, 1e24)
    assert p < 1.7, "the plain fit should (wrongly) predict a loss below the floor at 1e24, got " + str(round(p, 3))
    lo = fit_with_floor(cheap, 1.5)(1e24)
    hi = fit_with_floor(cheap, 1.9)(1e24)
    assert hi - lo > 0.15, "three plausible floors should disagree by more than 0.15 at 1e24, got " + str(round(hi - lo, 3))
    # the same floors agree closely where we have data
    assert abs(fit_with_floor(cheap, 1.5)(1e19) - fit_with_floor(cheap, 1.9)(1e19)) < 0.05
check("far beyond the data, small assumptions change the answer a lot", _beyond)
`,
  hints: [
    'Work in logs: lx = [math.log10(x) ...], ly = [math.log10(y) ...]. A power law y = c * x**e becomes the straight line log10(y) = log10(c) + e * log10(x), so the exponent is the slope.',
    'slope = sum((a - mx) * (b - my)) / sum((a - mx) ** 2), with mx and my the means of lx and ly. Then coef = 10 ** (my - slope * mx).',
    'fit_with_floor: fit = fit_power_law([(x, y - floor) for x, y in points]); return lambda x: floor + predict(fit, x). Remember the floor is an assumption: the last printout shows what happens when it is wrong.',
  ],
};
