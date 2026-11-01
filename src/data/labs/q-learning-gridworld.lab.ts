import type { Lab } from './types';

export const lab: Lab = {
  id: 'q-learning-gridworld',
  title: 'Q-learning on a small grid world',
  level: 'intermediate',
  minutes: 25,
  lesson: 'deep-learning/reinforcement-learning-from-scratch',
  goal: 'Write the three pieces of tabular Q-learning yourself: choosing a move with epsilon-greedy exploration, the Q-learning update, and the training loop. Then read off the route the agent has learned. The grid world, its rewards and its step function are given, so every check has one right answer.',
  steps: [
    'choose_action(q, state, epsilon, rng): draw rng.random() once. If it is below epsilon, explore and return rng.randrange(4). Otherwise return the index of the largest of the four values in q[state]; if several are equal, the lowest index wins.',
    'q_update(q, state, action, reward, next_state, done, alpha, gamma): set q[state][action] to old + alpha x (target - old), where target = reward + gamma x max(q[next_state]), or just reward when done is true. Return the new value.',
    'run_episode(q, alpha, gamma, epsilon, rng, max_steps=50): start at START and repeat: choose an action, call step, update q, move on. Stop when the episode ends or after max_steps moves. Return the total reward collected.',
    'train(episodes, alpha, gamma, epsilon, seed): make a fresh table, a random.Random(seed), run that many episodes, and return the table.',
    'greedy_path(q, max_steps=20): from START, always take the best move (lowest index on a tie) until the goal or the pit is reached or max_steps moves have been made. Return the list of states visited, START first.',
  ],
  starter: `import random

# The grid: S start, G goal (+10, episode ends), P pit (-10, episode ends), # wall. Every other move costs -1.
GRID = [
    "S....",
    ".#...",
    "...PG",
]
ROWS, COLS = len(GRID), len(GRID[0])
START = (0, 0)
ACTIONS = [(0, -1), (1, 0), (0, 1), (-1, 0)]   # 0 up, 1 right, 2 down, 3 left


def step(state, action):
    """Given: where the move leads. Returns (next_state, reward, done). Walls and edges leave you where you are."""
    x, y = state
    dx, dy = ACTIONS[action]
    nx, ny = x + dx, y + dy
    if not (0 <= nx < COLS and 0 <= ny < ROWS) or GRID[ny][nx] == "#":
        nx, ny = x, y
    cell = GRID[ny][nx]
    if cell == "G":
        return (nx, ny), 10, True
    if cell == "P":
        return (nx, ny), -10, True
    return (nx, ny), -1, False


def make_q():
    """Given: one list of four action values per open cell, all zero."""
    return {(x, y): [0.0, 0.0, 0.0, 0.0] for y in range(ROWS) for x in range(COLS) if GRID[y][x] != "#"}


def choose_action(q, state, epsilon, rng):
    # TODO: epsilon-greedy. Draw rng.random() once; explore with rng.randrange(4), else the best index (lowest on a tie).
    return 0


def q_update(q, state, action, reward, next_state, done, alpha, gamma):
    # TODO: move q[state][action] a fraction alpha towards reward + gamma * max(q[next_state]) (just reward if done). Return the new value.
    return q[state][action]


def run_episode(q, alpha, gamma, epsilon, rng, max_steps=50):
    # TODO: play one episode from START, updating q after every move. Return the total reward.
    return 0


def train(episodes, alpha=0.5, gamma=0.9, epsilon=0.2, seed=0):
    # TODO: fresh table, random.Random(seed), run the episodes, return the table.
    return make_q()


def greedy_path(q, max_steps=20):
    # TODO: follow the best move from START until the goal or the pit (or max_steps). Return the list of states.
    return [START]


q = train(1500)
path = greedy_path(q)
print("route:", path)
print("moves:", len(path) - 1)
print("value of going down from (4, 1):", round(q[(4, 1)][2], 2))
`,
  solution: `import random

# The grid: S start, G goal (+10, episode ends), P pit (-10, episode ends), # wall. Every other move costs -1.
GRID = [
    "S....",
    ".#...",
    "...PG",
]
ROWS, COLS = len(GRID), len(GRID[0])
START = (0, 0)
ACTIONS = [(0, -1), (1, 0), (0, 1), (-1, 0)]   # 0 up, 1 right, 2 down, 3 left


def step(state, action):
    """Given: where the move leads. Returns (next_state, reward, done). Walls and edges leave you where you are."""
    x, y = state
    dx, dy = ACTIONS[action]
    nx, ny = x + dx, y + dy
    if not (0 <= nx < COLS and 0 <= ny < ROWS) or GRID[ny][nx] == "#":
        nx, ny = x, y
    cell = GRID[ny][nx]
    if cell == "G":
        return (nx, ny), 10, True
    if cell == "P":
        return (nx, ny), -10, True
    return (nx, ny), -1, False


def make_q():
    """Given: one list of four action values per open cell, all zero."""
    return {(x, y): [0.0, 0.0, 0.0, 0.0] for y in range(ROWS) for x in range(COLS) if GRID[y][x] != "#"}


def best_action(values):
    best = 0
    for a in range(1, 4):
        if values[a] > values[best]:
            best = a
    return best


def choose_action(q, state, epsilon, rng):
    if rng.random() < epsilon:
        return rng.randrange(4)
    return best_action(q[state])


def q_update(q, state, action, reward, next_state, done, alpha, gamma):
    future = 0.0 if done else max(q[next_state])
    target = reward + gamma * future
    q[state][action] += alpha * (target - q[state][action])
    return q[state][action]


def run_episode(q, alpha, gamma, epsilon, rng, max_steps=50):
    state = START
    total = 0
    for _ in range(max_steps):
        action = choose_action(q, state, epsilon, rng)
        next_state, reward, done = step(state, action)
        q_update(q, state, action, reward, next_state, done, alpha, gamma)
        total += reward
        state = next_state
        if done:
            break
    return total


def train(episodes, alpha=0.5, gamma=0.9, epsilon=0.2, seed=0):
    q = make_q()
    rng = random.Random(seed)
    for _ in range(episodes):
        run_episode(q, alpha, gamma, epsilon, rng)
    return q


def greedy_path(q, max_steps=20):
    state = START
    path = [state]
    for _ in range(max_steps):
        state, _, done = step(state, best_action(q[state]))
        path.append(state)
        if done:
            break
    return path


q = train(1500)
path = greedy_path(q)
print("route:", path)
print("moves:", len(path) - 1)
print("value of going down from (4, 1):", round(q[(4, 1)][2], 2))
`,
  tests: `
import random as _random

class _Script:
    """A stand-in random generator that returns scripted numbers, so the exploration rule can be checked exactly."""
    def __init__(self, floats, ints=()):
        self.floats = list(floats)
        self.ints = list(ints)
        self.float_calls = 0
        self.int_calls = 0
    def random(self):
        self.float_calls += 1
        return self.floats.pop(0)
    def randrange(self, n):
        self.int_calls += 1
        return self.ints.pop(0)

def _greedy():
    q = {(0, 0): [0.1, 0.9, 0.5, 0.2]}
    rng = _Script([0.99])
    assert choose_action(q, (0, 0), 0.1, rng) == 1, "with a draw of 0.99 and epsilon 0.1 you should take the best action (index 1)"
    assert rng.int_calls == 0, "do not call randrange when you are not exploring"
check("takes the best action when the draw is above epsilon", _greedy)

def _ties():
    assert choose_action({(0, 0): [0, 0, 0, 0]}, (0, 0), 0.0, _Script([0.5])) == 0, "all equal: the lowest index wins"
    assert choose_action({(0, 0): [1, 3, 3, 2]}, (0, 0), 0.0, _Script([0.5])) == 1, "a tie for the best goes to the lower index"
check("the lowest index wins a tie", _ties)

def _explore():
    q = {(0, 0): [0.1, 0.9, 0.5, 0.2]}
    rng = _Script([0.05], [2])
    assert choose_action(q, (0, 0), 0.1, rng) == 2, "a draw of 0.05 is below epsilon 0.1, so explore: return rng.randrange(4)"
    assert rng.float_calls == 1, "draw rng.random() exactly once"
check("explores with randrange when the draw is below epsilon", _explore)

def _eps_zero():
    q = {(0, 0): [0.1, 0.9, 0.5, 0.2]}
    assert choose_action(q, (0, 0), 0.0, _Script([0.0], [3])) == 1, "epsilon 0 never explores, even for a draw of 0.0"
check("epsilon 0 never explores", _eps_zero)

def _update():
    q = {(0, 0): [0.0, 0.0, 0.0, 0.0], (1, 0): [0.0, 2.0, 1.0, 0.0]}
    new = q_update(q, (0, 0), 1, -1, (1, 0), False, 0.5, 0.9)
    assert abs(new - 0.4) < 1e-9, "target = -1 + 0.9 x 2 = 0.8, so the new value is 0 + 0.5 x 0.8 = 0.4, got " + str(new)
    assert abs(q[(0, 0)][1] - 0.4) < 1e-9, "q must be changed in place"
    assert q[(0, 0)][0] == 0.0 and q[(0, 0)][2] == 0.0, "only the chosen action changes"
check("the update on the worked example gives 0.4", _update)

def _update_done():
    q = {(3, 0): [0.0, 0.0, 0.0, 0.0], (4, 0): [9.0, 9.0, 9.0, 9.0]}
    new = q_update(q, (3, 0), 1, 10, (4, 0), True, 0.5, 0.9)
    assert abs(new - 5.0) < 1e-9, "when done, the target is just the reward: 0 + 0.5 x 10 = 5, got " + str(new)
check("a finished episode has no future value", _update_done)

def _update_alpha():
    q = {(0, 0): [1.0, 0.0, 0.0, 0.0], (1, 0): [0.0, 5.0, 0.0, 0.0]}
    assert q_update(q, (0, 0), 0, -1, (1, 0), False, 0.0, 0.9) == 1.0, "alpha 0 changes nothing"
    assert abs(q_update(q, (0, 0), 0, -1, (1, 0), False, 1.0, 0.9) - 3.5) < 1e-9, "alpha 1 jumps to the target -1 + 0.9 x 5 = 3.5"
check("alpha 0 changes nothing and alpha 1 jumps to the target", _update_alpha)

def _episode():
    q = make_q()
    route = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (4, 1)]
    for state, action in zip(route, [1, 1, 1, 1, 2, 2]):
        q[state][action] = 1.0
    total = run_episode(q, 0.0, 0.9, 0.0, _random.Random(0))
    assert total == 5, "five moves at -1 and then +10 for the goal is 5, got " + str(total)
check("an episode along a known route collects 5", _episode)

def _episode_limit():
    q = make_q()
    q[(0, 0)][0] = 1.0   # always bump the top edge and stay put
    total = run_episode(q, 0.0, 0.9, 0.0, _random.Random(0), max_steps=7)
    assert total == -7, "seven moves at -1 when the episode is cut off by max_steps, got " + str(total)
check("an episode stops after max_steps", _episode_limit)

def _train():
    q = train(1500, 0.5, 0.9, 0.2, 0)
    path = greedy_path(q)
    assert path[0] == (0, 0) and path[-1] == (4, 2), "the route should end at the goal (4, 2), got " + str(path)
    assert len(path) - 1 == 6, "the shortest route is 6 moves, got " + str(len(path) - 1)
    assert (3, 2) not in path, "the route must avoid the pit at (3, 2)"
check("after 1500 episodes the greedy route reaches the goal in 6 moves and avoids the pit", _train)

def _values():
    q = train(1500, 0.5, 0.9, 0.2, 0)
    assert q[(4, 1)][2] > 9.5, "going down from (4, 1) lands on the goal for +10, so its value should be close to 10, got " + str(round(q[(4, 1)][2], 3))
    assert q[(3, 1)][2] < 0, "stepping down from (3, 1) into the pit should look bad, got " + str(round(q[(3, 1)][2], 3))
check("the learned values make sense next to the goal and the pit", _values)

def _no_learning():
    q = train(200, 0.0, 0.9, 0.2, 0)
    assert all(v == 0.0 for vals in q.values() for v in vals), "with alpha 0 nothing is learned"
check("with a learning rate of 0, nothing is learned", _no_learning)
`,
  hints: [
    'choose_action: if rng.random() < epsilon: return rng.randrange(4). Otherwise loop over the four values and keep the first index that is strictly larger than the best so far. That makes the lowest index win ties.',
    'q_update: future = 0.0 if done else max(q[next_state]); target = reward + gamma * future; q[state][action] += alpha * (target - q[state][action]); return q[state][action].',
    'run_episode: state = START, total = 0, then for _ in range(max_steps): action = choose_action(...); next_state, reward, done = step(state, action); q_update(...); total += reward; state = next_state; break if done. greedy_path is the same loop without learning, always taking the best action.',
  ],
};
