import type { Lab } from './types';

export const lab: Lab = {
  id: 'grpo-advantages',
  title: 'Group-relative advantages and the clipped objective (GRPO)',
  level: 'advanced',
  minutes: 20,
  lesson: 'deep-learning/rl-post-training',
  goal: 'GRPO replaces the value model of PPO with a simple trick: sample a group of answers to one prompt, score them, and judge each answer against the rest of its group. Write that advantage, the clipped objective that limits how far one update can move the policy, and the small KL penalty that keeps the policy near its starting point, then check them on a hand-sized example.',
  steps: [
    'In group_advantages, compute the group mean and the sample standard deviation (divide the sum of squared differences by k - 1), and return (r - mean) / std for each reward. If the std is 0, return all zeros: nothing in the group is better than anything else.',
    'In clipped_term, compute ratio * advantage and clip(ratio, 1 - eps, 1 + eps) * advantage, and return the smaller of the two.',
    'In grpo_objective, turn the old and new probabilities of each sampled answer into ratios (new / old), then average clipped_term over the group.',
    'In kl_estimate, return r - log(r) - 1 for r = p_ref / p_new. This is the per-sample estimator the GRPO papers use; it is never negative.',
    'Run it: with one correct answer in four, the correct answer gets advantage +1.5 and each wrong one -0.5.',
  ],
  starter: `import math

def group_advantages(rewards):
    """Advantage of each sample: (reward - group mean) / group standard deviation (sample std, k - 1)."""
    # TODO: mean, std, then the list of advantages. All zeros if std == 0.
    return [0.0 for _ in rewards]


def clipped_term(ratio, advantage, eps=0.2):
    """PPO/GRPO surrogate for one sample: min(ratio * A, clip(ratio, 1 - eps, 1 + eps) * A)."""
    # TODO
    return 0.0


def grpo_objective(old_probs, new_probs, rewards, eps=0.2):
    """Mean clipped term over a group. old_probs and new_probs are each sampled answer's probability under the old and new policy."""
    advantages = group_advantages(rewards)
    # TODO: ratio = new / old for each sample; average clipped_term(ratio, advantage, eps).
    return 0.0


def kl_estimate(p_ref, p_new):
    """Per-sample estimate of KL(new || ref): r - log(r) - 1 with r = p_ref / p_new."""
    # TODO
    return 0.0


# One prompt, four sampled answers; only the first passed the checker.
rewards = [1, 0, 0, 0]
old = [0.2, 0.3, 0.3, 0.2]     # probability of each sampled answer under the policy that produced them
new = [0.3, 0.25, 0.3, 0.15]   # after an update: the correct answer became more likely
print("advantages:", [round(a, 3) for a in group_advantages(rewards)])
print("objective (higher is better):", round(grpo_objective(old, new, rewards), 4))
print("KL estimate when the policy drifted from 0.2 to 0.3:", round(kl_estimate(0.2, 0.3), 4))
`,
  solution: `import math

def group_advantages(rewards):
    """Advantage of each sample: (reward - group mean) / group standard deviation (sample std, k - 1)."""
    k = len(rewards)
    mean = sum(rewards) / k
    std = math.sqrt(sum((r - mean) ** 2 for r in rewards) / (k - 1))
    if std == 0:
        return [0.0 for _ in rewards]
    return [(r - mean) / std for r in rewards]


def clipped_term(ratio, advantage, eps=0.2):
    """PPO/GRPO surrogate for one sample: min(ratio * A, clip(ratio, 1 - eps, 1 + eps) * A)."""
    clipped = min(max(ratio, 1 - eps), 1 + eps)
    return min(ratio * advantage, clipped * advantage)


def grpo_objective(old_probs, new_probs, rewards, eps=0.2):
    """Mean clipped term over a group. old_probs and new_probs are each sampled answer's probability under the old and new policy."""
    advantages = group_advantages(rewards)
    terms = [clipped_term(n / o, a, eps) for o, n, a in zip(old_probs, new_probs, advantages)]
    return sum(terms) / len(terms)


def kl_estimate(p_ref, p_new):
    """Per-sample estimate of KL(new || ref): r - log(r) - 1 with r = p_ref / p_new."""
    r = p_ref / p_new
    return r - math.log(r) - 1


# One prompt, four sampled answers; only the first passed the checker.
rewards = [1, 0, 0, 0]
old = [0.2, 0.3, 0.3, 0.2]     # probability of each sampled answer under the policy that produced them
new = [0.3, 0.25, 0.3, 0.15]   # after an update: the correct answer became more likely
print("advantages:", [round(a, 3) for a in group_advantages(rewards)])
print("objective (higher is better):", round(grpo_objective(old, new, rewards), 4))
print("KL estimate when the policy drifted from 0.2 to 0.3:", round(kl_estimate(0.2, 0.3), 4))
`,
  tests: `
def _close(a, b, tol=1e-6):
    return abs(a - b) < tol

def _adv():
    a = group_advantages([1, 0, 0, 0])
    assert _close(a[0], 1.5) and all(_close(x, -0.5) for x in a[1:]), "expected [1.5, -0.5, -0.5, -0.5], got " + str([round(x, 3) for x in a])
check("one right answer in four: advantages +1.5 and -0.5", _adv)

def _adv_sum():
    a = group_advantages([1, 0, 1, 1, 0, 0, 0, 1])
    assert _close(sum(a), 0.0), "advantages in a group sum to zero, got " + str(sum(a))
    assert a[0] > 0 and a[1] < 0
check("advantages sum to zero and keep their sign", _adv_sum)

def _adv_flat():
    assert group_advantages([1, 1, 1, 1]) == [0.0, 0.0, 0.0, 0.0], "an all-correct group gives no signal"
    assert group_advantages([0, 0, 0]) == [0.0, 0.0, 0.0], "an all-wrong group gives no signal"
check("a group where every answer scored the same has zero advantage", _adv_flat)

def _scale():
    a = group_advantages([1, 0, 0, 1])
    b = group_advantages([5, 0, 0, 5])
    assert all(_close(x, y) for x, y in zip(a, b)), "dividing by the std removes the reward scale"
check("the reward scale does not matter", _scale)

def _clip():
    assert _close(clipped_term(1.1, 2.0), 2.2), "inside the range the term is ratio * A"
    assert _close(clipped_term(1.5, 2.0), 2.4), "a rewarded sample is capped at (1 + eps) * A = 2.4, got " + str(clipped_term(1.5, 2.0))
    assert _close(clipped_term(0.5, -1.0), -0.8), "a penalised sample stops at (1 - eps) * A = -0.8, got " + str(clipped_term(0.5, -1.0))
    assert _close(clipped_term(1.5, -1.0), -1.5), "if a bad answer became more likely the penalty is not clipped: -1.5, got " + str(clipped_term(1.5, -1.0))
check("clipping limits the gain from a move, not the penalty for a bad one", _clip)

def _objective():
    v = grpo_objective([0.2, 0.3, 0.3, 0.2], [0.3, 0.25, 0.3, 0.15], [1, 0, 0, 0])
    assert _close(v, 0.120833, 1e-5), "expected 0.1208 (terms 1.8, -0.4167, -0.5, -0.4 averaged), got " + str(round(v, 5))
check("the objective on the worked example is 0.1208", _objective)

def _no_move():
    v = grpo_objective([0.25] * 4, [0.25] * 4, [1, 0, 0, 0])
    assert _close(v, 0.0), "with ratio 1 everywhere the objective is the mean advantage, which is 0, got " + str(v)
check("an unchanged policy scores zero", _no_move)

def _kl():
    assert _close(kl_estimate(0.3, 0.3), 0.0), "no drift, no KL"
    assert _close(kl_estimate(0.2, 0.3), 2 / 3 - math.log(2 / 3) - 1, 1e-9), "r - log(r) - 1 with r = 0.2 / 0.3"
    assert kl_estimate(0.6, 0.3) > 0 and kl_estimate(0.1, 0.3) > 0, "the estimator is never negative"
check("the KL estimate is zero at no drift and positive otherwise", _kl)
`,
  hints: [
    'mean = sum(rewards) / k. std = math.sqrt(sum((r - mean) ** 2 for r in rewards) / (k - 1)). Handle std == 0 before dividing.',
    'clipped = min(max(ratio, 1 - eps), 1 + eps), then return min(ratio * advantage, clipped * advantage). The min matters when the advantage is negative.',
    'grpo_objective: terms = [clipped_term(n / o, a, eps) for o, n, a in zip(old_probs, new_probs, advantages)]; return sum(terms) / len(terms). kl_estimate: r = p_ref / p_new; return r - math.log(r) - 1.',
  ],
};
