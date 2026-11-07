/**
 * What if one user can send unlimited requests?
 *
 * A deterministic discrete-time simulation of one shared server. Ten ordinary users send one or two requests
 * per tick. A noisy user (a loop with a bug) sends the same as everyone, except during a burst, when it sends
 * far more. The server finishes a fixed number of requests per tick from one shared first-come-first-served
 * queue. A client gives up when its request has waited longer than the deadline. With limits, each user also
 * has a token bucket: a request needs one token, and tokens refill at a steady rate up to the bucket size.
 * Every number is an EXAMPLE chosen to show the shape.
 */

export const config = {
  ticks: 80,
  /** Requests the server can finish per tick. */
  capacity: 20,
  normalUsers: 10,
  /** Each ordinary user sends 1 request per tick, plus a second one half of the time (mean 1.5). */
  secondRequestChance: 0.5,
  burstStart: 20,
  burstEnd: 60,
  /** Requests per tick the noisy user sends while the bug runs (the slider changes this). */
  noisyRate: 100,
  /** A client gives up when its request has waited more than this many ticks. */
  deadline: 5,
  /** Token bucket per user: room for 6 tokens, 2 new tokens per tick. */
  bucketSize: 6,
  refill: 2,
  seed: 11,
};

export type Config = typeof config;
export type Policy = 'open' | 'limited';

/** Small seeded generator (mulberry32) so the same inputs always give the same run. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Users 0 to normalUsers-1 are ordinary. The last user is the noisy one. */
export const noisyIndex = (c: Config = config) => c.normalUsers;

/** arrivals[t][u] = requests user u tries to send in tick t. The same for both policies. */
export function arrivals(c: Config = config): number[][] {
  const rand = rng(c.seed);
  const out: number[][] = [];
  for (let t = 0; t < c.ticks; t++) {
    const row: number[] = [];
    for (let u = 0; u <= c.normalUsers; u++) {
      const ordinary = 1 + (rand() < c.secondRequestChance ? 1 : 0);
      row.push(u === c.normalUsers && t >= c.burstStart && t < c.burstEnd ? c.noisyRate : ordinary);
    }
    out.push(row);
  }
  return out;
}

export type UserTotals = {
  sent: number;
  /** Turned away at once by the limit (HTTP 429). */
  rejected: number;
  /** Finished by the server in time. */
  served: number;
  /** Waited past the deadline and gave up. */
  timedOut: number;
  /** Sum of waits (in ticks) of the finished requests. */
  waitSum: number;
  /** Finished during the burst ticks only. */
  servedInBurst: number;
  /** Requests tried during the burst ticks only. */
  sentInBurst: number;
};

export type Run = {
  policy: Policy;
  /** Requests waiting after each tick. */
  queue: number[];
  users: UserTotals[];
};

export function simulate(policy: Policy, c: Config = config): Run {
  const arr = arrivals(c);
  const nUsers = c.normalUsers + 1;
  const users: UserTotals[] = Array.from({ length: nUsers }, () => ({ sent: 0, rejected: 0, served: 0, timedOut: 0, waitSum: 0, servedInBurst: 0, sentInBurst: 0 }));
  const order = rng(c.seed + 1);
  const tokens = Array.from({ length: nUsers }, () => c.bucketSize);
  const qUser: number[] = [];
  const qBorn: number[] = [];
  let head = 0;
  const queue: number[] = [];
  for (let t = 0; t < c.ticks; t++) {
    // clients that have waited too long give up (the queue is in arrival order, so they are at the front)
    while (head < qUser.length && t - qBorn[head] > c.deadline) {
      users[qUser[head]].timedOut += 1;
      head += 1;
    }
    // this tick's requests reach the server in a shuffled order (the same order for both policies)
    const attempts: number[] = [];
    arr[t].forEach((n, u) => {
      users[u].sent += n;
      if (t >= c.burstStart && t < c.burstEnd) users[u].sentInBurst += n;
      for (let j = 0; j < n; j++) attempts.push(u);
    });
    for (let i = attempts.length - 1; i > 0; i--) {
      const j = Math.floor(order() * (i + 1));
      [attempts[i], attempts[j]] = [attempts[j], attempts[i]];
    }
    if (policy === 'limited') for (let u = 0; u < nUsers; u++) tokens[u] = Math.min(c.bucketSize, tokens[u] + c.refill);
    for (const u of attempts) {
      if (policy === 'limited') {
        if (tokens[u] < 1) {
          users[u].rejected += 1;
          continue;
        }
        tokens[u] -= 1;
      }
      qUser.push(u);
      qBorn.push(t);
    }
    // the server finishes the oldest requests first
    for (let k = 0; k < c.capacity && head < qUser.length; k++, head++) {
      const u = qUser[head];
      users[u].served += 1;
      users[u].waitSum += t - qBorn[head];
      if (t >= c.burstStart && t < c.burstEnd) users[u].servedInBurst += 1;
    }
    queue.push(qUser.length - head);
  }
  // whatever is still waiting at the end has not timed out yet; leave it out of the totals
  return { policy, queue, users };
}

export type Summary = {
  /** Ordinary users, all together. */
  normalSent: number;
  normalServed: number;
  /** Share of the ordinary users' requests that finished in time. */
  normalServedShare: number;
  normalTimedOut: number;
  /** Average ticks an ordinary request waited before the server finished it. */
  normalAvgWait: number;
  noisySent: number;
  noisyServed: number;
  noisyRejected: number;
  /** Share of the server's finished requests during the burst that went to the noisy user. */
  noisyShareInBurst: number;
  /** Requests per tick, averaged over the burst, finished for each ordinary user and for the noisy one. */
  perUserInBurst: { normal: number[]; noisy: number };
  /** The same, but what each one tried to send. */
  askedInBurst: { normal: number[]; noisy: number };
  peakQueue: number;
};

export function summarise(run: Run, c: Config = config): Summary {
  const n = c.normalUsers;
  const normal = run.users.slice(0, n);
  const noisy = run.users[n];
  const sum = (f: (u: UserTotals) => number) => normal.reduce((a, u) => a + f(u), 0);
  const normalSent = sum((u) => u.sent);
  const normalServed = sum((u) => u.served);
  const burstTicks = c.burstEnd - c.burstStart;
  const burstServedAll = run.users.reduce((a, u) => a + u.servedInBurst, 0);
  return {
    normalSent,
    normalServed,
    normalServedShare: normalSent > 0 ? normalServed / normalSent : 1,
    normalTimedOut: sum((u) => u.timedOut),
    normalAvgWait: normalServed > 0 ? sum((u) => u.waitSum) / normalServed : 0,
    noisySent: noisy.sent,
    noisyServed: noisy.served,
    noisyRejected: noisy.rejected,
    noisyShareInBurst: burstServedAll > 0 ? noisy.servedInBurst / burstServedAll : 0,
    perUserInBurst: { normal: normal.map((u) => u.servedInBurst / burstTicks), noisy: noisy.servedInBurst / burstTicks },
    askedInBurst: { normal: normal.map((u) => u.sentInBurst / burstTicks), noisy: noisy.sentInBurst / burstTicks },
    peakQueue: Math.max(...run.queue),
  };
}

/** Fair share of the server for each of the users, in requests per tick. */
export const fairShare = (c: Config = config) => c.capacity / (c.normalUsers + 1);

/** Queue length at which a newly arrived request would wait exactly the deadline. */
export const deadlineQueue = (c: Config = config) => c.capacity * c.deadline;

export const noisyChoices = [10, 25, 50, 100, 200] as const;
