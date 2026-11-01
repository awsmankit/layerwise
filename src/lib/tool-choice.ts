/**
 * "Pick the Tool": a ladder of ways to solve a problem, from a person or no feature up to an agent, and ten scripted
 * scenarios where the learner picks the simplest rung that does the job. All scenario text is invented for teaching.
 */

export type Rung = 'person' | 'rules' | 'search' | 'model' | 'llm' | 'agent';

export interface RungInfo {
  id: Rung;
  label: string;
  /** What it is, in a few words. */
  gist: string;
  /** Relative complexity points to build, run and maintain. An example scale, not a measurement. */
  points: number;
  useWhen: string;
  failsBy: string;
}

/** In order, simplest first. */
export const RUNGS: RungInfo[] = [
  {
    id: 'person',
    label: 'A person, or no feature',
    gist: 'Let someone do it by hand, or do not build it',
    points: 0,
    useWhen: 'The volume is tiny, the task changes often, or a mistake is costly and a person is the safest checker.',
    failsBy: 'It does not scale and it depends on people being available.',
  },
  {
    id: 'rules',
    label: 'Plain code, rules, regex or SQL',
    gist: 'Deterministic logic you can read and test',
    points: 1,
    useWhen: 'The answer is exact, the rule can be written down, or the data is already structured.',
    failsBy: 'It breaks on wording or cases nobody anticipated, and a long pile of rules becomes hard to maintain.',
  },
  {
    id: 'search',
    label: 'Search',
    gist: 'Find the right existing item (keywords or embeddings)',
    points: 2,
    useWhen: 'The right answer already exists somewhere and the problem is finding it.',
    failsBy: 'It returns what exists. It cannot combine, rewrite or reason over it.',
  },
  {
    id: 'model',
    label: 'A trained model',
    gist: 'Classical machine learning or a small purpose-built model',
    points: 3,
    useWhen: 'There is a stable, repeated decision, labelled examples, and a need for speed and low cost per item.',
    failsBy: 'It needs labelled data and retraining, and it only does the one job it was trained for.',
  },
  {
    id: 'llm',
    label: 'One LLM call',
    gist: 'A prompt, possibly with the right text pasted in',
    points: 5,
    useWhen: 'The input is free-form language, the task is fuzzy, and the cases vary too much for rules.',
    failsBy: 'It can be wrong with confidence, costs per call, adds latency, and changes when the model changes.',
  },
  {
    id: 'agent',
    label: 'An agent',
    gist: 'An LLM that chooses steps and uses tools in a loop',
    points: 8,
    useWhen: 'The steps genuinely cannot be known in advance and every action can be checked, capped or undone.',
    failsBy: 'Cost and time vary per run, errors compound across steps, and it can act on the world.',
  },
];

export const RUNG_ORDER: Rung[] = RUNGS.map((r) => r.id);
export const rungInfo = (id: Rung): RungInfo => RUNGS.find((r) => r.id === id)!;

export type Stakes = 'low' | 'medium' | 'high';

export interface Scenario {
  id: string;
  title: string;
  /** The user job, in one or two sentences. */
  job: string;
  /** Volume, data and any other facts that matter. */
  facts: string;
  stakes: Stakes;
  /** What happens if the system is wrong. */
  ifWrong: string;
  /** The simplest rung that does the job. */
  best: Rung;
  /** Other rungs that also meet the bar (the best one is always included). */
  ok: Rung[];
  /** Why the best rung wins. */
  why: string;
  /** What goes wrong with something simpler than the best rung. */
  tooSimple: string;
  /** What goes wrong with something more complex than needed. */
  tooMuch: string;
  /** A safeguard worth having: a person in the loop, a fallback or a check. */
  safeguard: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'invoice',
    title: 'Check an invoice total',
    job: 'An accounts tool must confirm that the line items on an invoice add up to the stated total.',
    facts: 'The numbers are already extracted into a table. About 3,000 invoices a month.',
    stakes: 'high',
    ifWrong: 'A wrong total means a wrong payment or an audit finding.',
    best: 'rules',
    ok: ['rules'],
    why: 'Adding numbers is exact arithmetic. Code gives the same correct answer every time, in microseconds, for free.',
    tooSimple: 'A person adding 3,000 invoices by hand will make slips and will not scale.',
    tooMuch: 'A language model predicts text. It can get a sum wrong, may answer differently on a second run, and costs money per call for something a one-line formula does exactly. Reading numbers out of a messy scan is a different job, where a model can help.',
    safeguard: 'Flag any mismatch for a person rather than correcting it silently.',
  },
  {
    id: 'spam',
    title: 'Filter spam in a shared inbox',
    job: 'Keep junk out of a company inbox that gets 40,000 messages a day.',
    facts: 'Years of mail already marked spam or not spam. Spammers keep changing their wording.',
    stakes: 'medium',
    ifWrong: 'A missed spam is an annoyance. A real message lost in the spam folder can cost a customer.',
    best: 'model',
    ok: ['model'],
    why: 'This is a stable yes-or-no decision with plenty of labelled examples and a lot of volume. A small classifier is fast, cheap per message and easy to retrain as spam evolves.',
    tooSimple: 'A list of banned words is beaten the day spammers change a spelling, and every fix adds a rule that can block real mail.',
    tooMuch: 'An LLM call per message would probably work, but at 40,000 messages a day you pay and wait for a capability the task does not need.',
    safeguard: 'Keep a quarantine folder and a "not spam" button so false positives are recoverable, and feed those clicks back as training data.',
  },
  {
    id: 'meeting',
    title: 'Summarise a meeting',
    job: 'Turn the transcript of a one-hour meeting into a short summary and a list of action items.',
    facts: 'Free-form speech, different every time. About 200 meetings a month.',
    stakes: 'low',
    ifWrong: 'A missed or invented action item is awkward but visible to the people who were there.',
    best: 'llm',
    ok: ['llm'],
    why: 'The input is messy language and the output is language. This is the fuzzy, long-tail job that language models are good at, and one call does it.',
    tooSimple: 'Rules and keyword search can pull out sentences containing "will" or "by Friday", but they cannot write a summary or tell who owes what.',
    tooMuch: 'An agent adds a loop, tools and variable cost to a job with one input and one output.',
    safeguard: 'Show the summary to the organiser before it is sent, and link each action item back to the transcript line.',
  },
  {
    id: 'clause',
    title: 'Review a contract clause',
    job: 'Check whether a supplier contract clause departs from the company policy on liability.',
    facts: 'Clauses are worded differently in every contract. About 60 contracts a month, each reviewed by a lawyer today.',
    stakes: 'high',
    ifWrong: 'A missed risky clause can bind the company to a large liability.',
    best: 'llm',
    ok: ['llm'],
    why: 'The same legal idea is phrased in endless ways, which defeats rules. An LLM can read and compare clauses, as a first pass that saves the lawyer time.',
    tooSimple: 'A keyword search for "liability" finds the word but not a reworded clause that quietly removes a cap.',
    tooMuch: 'An agent that negotiates or edits the contract on its own is an action with legal weight and nobody checking it.',
    safeguard: 'A lawyer must review every flagged and every unflagged clause sample. The model proposes, the person decides. Measure how often it misses a clause the lawyer flags.',
  },
  {
    id: 'tickets',
    title: 'Route support tickets',
    job: 'Send each incoming ticket to one of six queues: billing, login, bug, feature request, cancellation, other.',
    facts: '100,000 tickets a month. 8,000 past tickets already labelled by agents.',
    stakes: 'medium',
    ifWrong: 'A misrouted ticket is bounced between teams and answered later.',
    best: 'model',
    ok: ['model', 'llm'],
    why: 'With labelled history and high volume, a small classifier is fast and cheap. An LLM would also do well, and is the better start if you have no labelled data yet. The worked comparison above shows how volume and the cost of a mistake decide it.',
    tooSimple: 'Keyword rules for six queues catch the obvious tickets and misroute the rest ("I was charged twice and cannot log in").',
    tooMuch: 'An agent has nothing to do here: there is one decision per ticket and no tools to call.',
    safeguard: 'Send low-confidence tickets to a triage person instead of guessing, and check a weekly sample of routed tickets.',
  },
  {
    id: 'returns',
    title: 'A chatbot for the returns policy',
    job: 'Let customers ask questions about the returns policy in their own words and get a clear answer.',
    facts: 'One page of policy, updated twice a year. Questions such as "can I return a sale item I wore once?"',
    stakes: 'medium',
    ifWrong: 'A wrong answer can promise a refund the company then has to honour or refuse, which upsets the customer either way.',
    best: 'llm',
    ok: ['search', 'llm'],
    why: 'Free-form questions about one short document suit one LLM call with the policy pasted into the prompt, told to answer only from it and to quote it. If customers only need to find the page, search is enough.',
    tooSimple: 'Fixed replies for a fixed list of questions fail as soon as a customer words it differently or combines two conditions.',
    tooMuch: 'An agent that can issue refunds turns a wrong answer into a wrong action. A policy question needs no tools.',
    safeguard: 'Quote the policy line with every answer, say "I am not sure" and hand over to a person when the policy does not cover the question.',
  },
  {
    id: 'sensors',
    title: 'Spot odd readings in sensor data',
    job: 'Warn the maintenance team when a machine\'s vibration readings start to look unusual.',
    facts: '200 machines, one reading per second each, so about 17 million readings a day. Decisions are needed within a second.',
    stakes: 'medium',
    ifWrong: 'A missed fault can mean a breakdown. Too many false alarms and the team stops listening.',
    best: 'rules',
    ok: ['rules', 'model'],
    why: 'The data is numbers, not language, and it arrives fast. Plain code can keep a rolling average and spread for each machine and alert when a reading strays far from its own normal. That is cheap, instant and easy to explain. A learned model is worth adding only if this misses the faults that matter.',
    tooSimple: 'Nobody can watch 17 million readings a day by eye, so a person cannot do this job, however careful. One fixed threshold for every machine is the weak version of the code answer: it fires on noisy machines and misses quiet ones.',
    tooMuch: 'An LLM is built for text, not for millions of numeric readings a day, and its latency and cost per call do not fit a one-second budget.',
    safeguard: 'Tune the alert rate with the maintenance team so a warning is rare enough to be believed.',
  },
  {
    id: 'feedback',
    title: 'Tag customer feedback emails',
    job: 'Label each feedback email with a topic so the product team can see themes.',
    facts: 'About 20 emails a month. The topics are not fixed yet.',
    stakes: 'low',
    ifWrong: 'A wrong tag slightly blurs a theme the team will read anyway.',
    best: 'person',
    ok: ['person'],
    why: 'Twenty emails take about ten minutes by hand. At that volume, any automation costs more to build, check and maintain than it saves, and a person also learns what the topics should be.',
    tooSimple: 'There is no simpler option than a person, so the lesson here is the cost of the build.',
    tooMuch: 'The prompt, the evals, the monitoring and the upkeep take far longer than ten minutes a month of tagging. Revisit if the volume reaches thousands.',
    safeguard: 'Write the topics down as you tag. That list is the start of any later automation and its test set.',
  },
  {
    id: 'helpsearch',
    title: 'A search box for 2,000 help articles',
    job: 'Let people type a few words and get to the right help article.',
    facts: 'The articles already exist and are well written. People mistype and use different words from the articles.',
    stakes: 'low',
    ifWrong: 'A poor result means one more click or a search for a better term.',
    best: 'search',
    ok: ['search'],
    why: 'The answer already exists and the problem is finding it. Full-text search with typo tolerance, with embeddings added if wording differs, returns the article itself, which is what the user wanted.',
    tooSimple: 'An exact-match lookup on titles fails on typos and on different words for the same thing.',
    tooMuch: 'An LLM answering from memory instead of returning the article can paraphrase wrongly, costs per query and hides the source. It can still be layered on top of search later.',
    safeguard: 'Log searches that return nothing. They show which articles are missing.',
  },
  {
    id: 'pipeline',
    title: 'Work out why a nightly data job failed',
    job: 'Find the cause of a failed nightly data pipeline: read logs, query tables, check recent changes and propose a fix.',
    facts: 'Failures differ every time. The next step depends on what the last step found. A sandbox copy of the data is available.',
    stakes: 'medium',
    ifWrong: 'A wrong diagnosis wastes an engineer\'s morning. A wrong action on production data could be much worse.',
    best: 'agent',
    ok: ['agent'],
    why: 'Here the steps really cannot be fixed in advance: each one depends on the last result. Reading and querying are safe actions, so a capped agent loop is a fair fit.',
    tooSimple: 'A single call cannot look at the logs and then decide what to query. A fixed script covers only the failures you already know about.',
    tooMuch: 'There is no higher rung. The risk is the scope: give the agent read-only access and a step limit, and let it propose fixes rather than apply them.',
    safeguard: 'Read-only credentials, a cap on steps and spend, and a human approving any change to production.',
  },
];

export type Verdict = 'best' | 'ok' | 'too-simple' | 'too-much';

export interface Judgement {
  verdict: Verdict;
  /** True when the choice meets the bar at reasonable cost (best or an accepted alternative). */
  right: boolean;
  /** One sentence naming the consequence of the choice. */
  message: string;
}

/** Judge a rung chosen for a scenario. */
export function judge(s: Scenario, choice: Rung): Judgement {
  const at = (r: Rung) => RUNG_ORDER.indexOf(r);
  if (choice === s.best) return { verdict: 'best', right: true, message: s.why };
  if (s.ok.includes(choice)) {
    return {
      verdict: 'ok',
      right: true,
      message: `That also meets the bar. The strongest fit is "${rungInfo(s.best).label}". ${s.why}`,
    };
  }
  if (at(choice) < at(s.best)) return { verdict: 'too-simple', right: false, message: s.tooSimple };
  return { verdict: 'too-much', right: false, message: s.tooMuch };
}

export interface Tally {
  answered: number;
  right: number;
  /** Complexity points of the rungs the learner chose. */
  chosenPoints: number;
  /** Complexity points if every scenario used its best rung. */
  bestPoints: number;
}

/** Add up a set of answers (scenario id to rung). */
export function tally(answers: Record<string, Rung>, scenarios: Scenario[] = SCENARIOS): Tally {
  let answered = 0;
  let right = 0;
  let chosenPoints = 0;
  let bestPoints = 0;
  for (const s of scenarios) {
    const c = answers[s.id];
    if (!c) continue;
    answered++;
    if (judge(s, c).right) right++;
    chosenPoints += rungInfo(c).points;
    bestPoints += rungInfo(s.best).points;
  }
  return { answered, right, chosenPoints, bestPoints };
}
