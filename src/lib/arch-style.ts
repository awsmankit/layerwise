/**
 * Data and logic for the three "choosing an agent architecture" figures: the comparison table
 * (ArchStyleCompare), the same task in each style (ArchStyleFlows) and the question flow (ArchStyleChooser).
 *
 * The advice is the lesson's own reasoning, built on the vendors' guidance that is cited in the lesson
 * (start simple, add structure for a named reason). Product facts are dated in the lesson text, not here.
 */

export type StyleId = 'single' | 'workflow' | 'loop' | 'graph' | 'multi' | 'harness';

/** The rows of the comparison, in the order the lesson teaches them. */
export const STYLE_ORDER: StyleId[] = ['single', 'workflow', 'loop', 'graph', 'multi', 'harness'];

export type DimensionId = 'control' | 'state' | 'failure' | 'resume' | 'test' | 'pick' | 'avoid';

export const DIMENSIONS: { id: DimensionId; label: string; question: string }[] = [
  { id: 'control', label: 'Who picks the next step', question: 'Who decides what happens next: your code or the model?' },
  { id: 'state', label: 'State and memory', question: 'Where does the run keep what it knows?' },
  { id: 'failure', label: 'Failure and cost', question: 'How does it fail, and is the cost predictable?' },
  { id: 'resume', label: 'Pause and approval', question: 'Can it stop for a person and carry on later?' },
  { id: 'test', label: 'Testing and debugging', question: 'How hard is it to test and to find what went wrong?' },
  { id: 'pick', label: 'Pick it when', question: 'When is this the right choice?' },
  { id: 'avoid', label: 'Do not pick it when', question: 'When is it the wrong choice?' },
];

export interface StyleInfo {
  id: StyleId;
  name: string;
  /** What it is, in one sentence. */
  what: string;
  /** How much the model, rather than your code, steers the flow: 0 (none) to 4 (most). A rough guide, not a measurement. */
  modelSteers: 0 | 1 | 2 | 3 | 4;
  cells: Record<DimensionId, string>;
}

export const STYLES: Record<StyleId, StyleInfo> = {
  single: {
    id: 'single',
    name: 'Single model call',
    what: 'One prompt, one answer. Your code can fetch text first and put it in the prompt (retrieval).',
    modelSteers: 0,
    cells: {
      control: 'Your code. There is no flow: one call in, one answer out.',
      state: 'None kept between calls. Anything the model needs goes into the prompt each time.',
      failure: 'One wrong answer or one error. The lowest cost and delay, and easy to predict.',
      resume: 'Nothing to resume. If a person must approve, your app shows the answer and waits.',
      test: 'The easiest. Run a fixed set of inputs, score the outputs, compare prompts. A trace is one request and one reply.',
      pick: 'Summaries, labels, extraction and answers from documents, when your evals show one call with good context passes.',
      avoid: 'When the model must fetch facts in an order it cannot know up front, or must act in the world.',
    },
  },
  workflow: {
    id: 'workflow',
    name: 'Fixed workflow',
    what: 'Your code runs a set sequence of model calls: a chain, a router that sends work down one branch, or calls in parallel.',
    modelSteers: 1,
    cells: {
      control: 'Your code. It sets the order, the branches and the loops. The model fills in each step.',
      state: 'Whatever your code passes from step to step: variables, a database row, a queue message. You own it.',
      failure: 'Predictable. Each step fails alone, so you can retry or fall back per step. The number of calls is known, so cost is bounded. An early mistake flows on.',
      resume: 'Not built in. To wait for a person, you save the state and write the code that picks it up again.',
      test: 'Good. Test each step alone, then the chain. The same input takes the same path.',
      pick: 'You can write the steps on paper and they rarely change: classify then reply, extract then check, review in parallel.',
      avoid: 'When inputs vary so much that no fixed list covers them, or the next step depends on what the last one found.',
    },
  },
  loop: {
    id: 'loop',
    name: 'Agent loop',
    what: 'The model picks a tool, your code runs it, the result goes back, and this repeats until the model answers or a limit is hit.',
    modelSteers: 3,
    cells: {
      control: 'The model. Your code sets the tools and the limits, not the order.',
      state: 'The growing message history. It sits in memory for the run and fills the context window.',
      failure: 'Runs differ: wandering, repeated calls, stopping early. The number of calls is not known in advance, and each turn resends a longer history, so cost grows.',
      resume: 'Only if you add it. A bare loop in memory is lost when the process stops, and an approval needs a pause point you build.',
      test: 'Harder. The path changes between runs, so grade the outcome over several trials and read transcripts.',
      pick: 'Open-ended work where you cannot predict the number of steps, and a fixed workflow keeps failing on cases you cannot list.',
      avoid: 'When a workflow would do, when cost or delay is tightly bounded, or when a wrong action cannot be undone and nothing checks it.',
    },
  },
  graph: {
    id: 'graph',
    name: 'Graph or state machine',
    what: 'You draw steps (nodes) and which step may follow which (edges). A runtime saves the state as it goes, so a run can pause, resume or recover.',
    modelSteers: 2,
    cells: {
      control: 'Shared. You draw the allowed paths. At a branch, your code or the model can choose.',
      state: 'One explicit state object, saved as checkpoints under a thread id. You choose what goes in it.',
      failure: 'A run can restart from its last saved point, not from the top (check which step your runtime repeats). Cost follows the paths you drew, plus storage that grows on long runs.',
      resume: 'Built for it. A run can stop at an interrupt, wait, and continue when a person answers. A durable store is needed to survive a restart.',
      test: 'Good. Each node is testable alone and a run leaves a record of its states. More set-up than a plain function.',
      pick: 'Approvals that may take hours or days, runs that must survive a crash or a deploy, or a mix of fixed and model-chosen steps.',
      avoid: 'A short task that ends in seconds, where saving state adds machinery and one function would do.',
    },
  },
  multi: {
    id: 'multi',
    name: 'Multi-agent',
    what: 'Several agents, each with its own instructions, tools and context, run by a lead agent or by hand-offs between them.',
    modelSteers: 4,
    cells: {
      control: 'A lead model (orchestrator-workers) or each agent in turn (hand-offs). Your code sets the limits.',
      state: 'Each agent has its own context. Results come back as summaries or by reference. Shared state is the hard part.',
      failure: 'The most calls and tokens, and errors can compound across agents. A wrong worker result travels on unless something checks it.',
      resume: 'Only as good as what runs underneath: a graph runtime, or a harness with saved sessions.',
      test: 'The hardest. Test each worker alone, then the whole against a one-agent baseline.',
      pick: 'Parallel breadth, separate contexts, or different tools or permissions for different parts of the work.',
      avoid: 'Because it looks tidy. If one agent with the right tools passes your evals, stop there.',
    },
  },
  harness: {
    id: 'harness',
    name: 'Agent harness',
    what: 'The whole scaffold around the model that makes it a working agent: the loop, tools, permissions, context management, notes, a sandbox, approvals, tracing and limits.',
    modelSteers: 3,
    cells: {
      control: 'The model steers inside rules the harness enforces: allowed tools, permission modes, turn and spend caps, hooks.',
      state: 'Looked after for you: session history, compaction when the context fills, and notes or progress files outside the window.',
      failure: 'Limits, retries and permissions are handled, but the loop is still open-ended unless you cap turns or spend. A harness bakes in guesses about the model that can go stale.',
      resume: 'Often resumable sessions, plus approval callbacks and hooks. Whether a pause survives a restart depends on the harness.',
      test: 'Test outcomes with evals and use the harness trace. Re-run the evals when the harness or the model changes.',
      pick: 'Long, tool-heavy work such as coding, research or computer tasks, where you would rather start from a working scaffold.',
      avoid: 'A narrow task a few lines of code can do, or when you need exact control of every step.',
    },
  },
};

/* ---------------- the chooser ---------------- */

export type QuestionId = 'shape' | 'irreversible' | 'pause' | 'isolation' | 'long' | 'bounded';
export type Shape = 'single' | 'fixed' | 'open';
export type Answers = {
  shape: Shape;
  irreversible: boolean;
  pause: boolean;
  isolation: boolean;
  long: boolean;
  bounded: boolean;
};

export interface Question {
  id: QuestionId;
  q: string;
  help: string;
  options: { value: string; label: string }[];
}

export const QUESTIONS: Question[] = [
  {
    id: 'shape',
    q: 'What does the task look like?',
    help: 'Pick the closest. If you can write the steps down, say so: it is the strongest signal.',
    options: [
      { value: 'single', label: 'One answer from one prompt' },
      { value: 'fixed', label: 'I can list the steps in advance' },
      { value: 'open', label: 'Open-ended: the steps depend on what it finds' },
    ],
  },
  {
    id: 'irreversible',
    q: 'Can an action be hard to undo?',
    help: 'Money moved, an email sent, a record deleted.',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'pause',
    q: 'Must a run wait for hours or days, or survive a restart?',
    help: 'A person approves later, or a deploy must not lose work in progress.',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'isolation',
    q: 'Do parts of the work need separate contexts or different permissions?',
    help: 'One part reads large amounts of text, or one part may touch money and the others may not.',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'long',
    q: 'Does one run outlast a context window, or need files, code or a sandbox?',
    help: 'Coding, research or computer tasks that take many tool calls.',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'bounded',
    q: 'Are cost and delay tightly bounded for each request?',
    help: 'A phone call, a checkout page, a fixed price per task.',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
];

export interface Recommendation {
  style: StyleId;
  /** One line: why this style. */
  why: string;
  /** What to add next, and only if a named failure calls for it. */
  next: string;
  /** Lesson to read, as a site path. */
  link: { label: string; href: string };
  /** Plain-language flags for the answers that pull the other way. Empty when nothing conflicts. */
  cautions: string[];
}

const LINKS: Record<StyleId, { label: string; href: string }> = {
  single: { label: 'RAG from scratch', href: '/learn/rag-agents/rag-from-scratch/' },
  workflow: { label: 'Prompt patterns and optimisation', href: '/learn/llm/prompt-patterns-and-optimisation/' },
  loop: { label: 'Agents and tool use', href: '/learn/rag-agents/agents-and-tool-use/' },
  graph: { label: 'LangChain and LangGraph', href: '/learn/rag-agents/langchain-and-langgraph/' },
  multi: { label: 'Multi-agent systems', href: '/learn/rag-agents/multi-agent-systems/' },
  harness: { label: 'What an agent harness is', href: '/learn/rag-agents/choosing-an-agent-architecture/#what-an-agent-harness-is' },
};

/** The default answers: the simplest task. */
export const DEFAULT_ANSWERS: Answers = { shape: 'single', irreversible: false, pause: false, isolation: false, long: false, bounded: false };

export function recommend(a: Answers): Recommendation {
  const cautions: string[] = [];
  let style: StyleId;
  let why: string;
  let next: string;

  if (a.shape === 'single') {
    if (a.pause || a.irreversible) {
      style = 'workflow';
      why = a.pause
        ? 'One call cannot wait for a person. A short fixed sequence (model, then a saved wait, then the action) can.'
        : 'One call should not act on its own when the action is hard to undo. A fixed sequence puts a check between the answer and the action.';
      next = 'If the wait must survive a restart and you do not want to write the saving yourself, move the sequence onto a graph runtime.';
    } else {
      style = 'single';
      why = 'One call with the right context does the job. More structure would cost more without fixing a failure you have.';
      next = 'Improve the prompt and the retrieved text first. Add a second step only when your evals show a named case that one call fails.';
    }
  } else if (a.shape === 'fixed') {
    if (a.pause) {
      style = 'graph';
      why = 'You know the steps, and the run must wait or survive a restart. A graph runtime saves the state and resumes for you.';
      next = 'Keep the steps as fixed edges. Let the model choose only where you cannot write the rule.';
    } else {
      style = 'workflow';
      why = a.isolation
        ? 'You can list the steps, so your code can give each step its own prompt, context and permissions. No model needs to steer.'
        : 'You can list the steps, so your code should run them. It is cheaper, steadier and easier to test than a model choosing.';
      next = a.irreversible
        ? 'Put an approval step in code before the irreversible action. Move to a graph runtime if the wait gets long.'
        : a.long
          ? 'If one step turns out to be open-ended, run just that step as an agent loop or a harness.'
          : 'Add retries per step. Add a router or parallel calls only when a measured failure calls for them.';
    }
  } else {
    // open-ended
    if (a.long) {
      style = 'harness';
      why = 'Open-ended work over many tool calls needs the whole scaffold: context management, notes, a sandbox, permissions and limits.';
      next = a.isolation
        ? 'Use the harness’s sub-agent feature for the separate contexts, if it has one, before building your own multi-agent setup.'
        : 'Start from an existing harness and cap turns and spend. Build your own only when you can name what it cannot do.';
    } else if (a.isolation) {
      style = 'multi';
      why = 'The work is open-ended and parts need separate contexts or permissions. That is a reason for more than one agent.';
      next = 'Compare it with a single agent on the same tasks. Keep the extra agents only if the cost per solved task is worth it.';
    } else if (a.pause) {
      style = 'graph';
      why = 'The model can choose steps, but the run must wait or survive a restart. A graph runtime holds the agent and saves its state.';
      next = 'Put the agent loop inside one node and add approvals as interrupts. Add more nodes only when you can name why.';
    } else {
      style = 'loop';
      why = 'You cannot list the steps, so let the model pick tools in a loop, with limits your code enforces.';
      next = 'Cap turns, tokens and time in code. Add a graph runtime only if you need to pause or resume, and a harness only if runs outgrow the context window.';
    }
  }

  if (a.bounded && (style === 'loop' || style === 'multi' || style === 'harness')) {
    cautions.push('You said cost and delay are tightly bounded, but this style has an open-ended number of calls. Set hard caps in code, and ask whether a fixed workflow can cover the common cases.');
  }
  if (a.irreversible && (style === 'loop' || style === 'multi' || style === 'harness')) {
    cautions.push('A model chooses the actions here, so make the irreversible one a tool that needs a person’s approval, and keep it idempotent.');
  }
  if (a.irreversible && (style === 'graph' || style === 'workflow') && a.shape !== 'single') {
    cautions.push('Put the approval before the irreversible step, not after it, and make the step safe to repeat.');
  }
  if (a.isolation && a.shape === 'single') {
    cautions.push('One call has one context. If a second part really needs its own permissions, you have more than one step.');
  }

  return { style, why, next, link: LINKS[style], cautions };
}

/** Every answer combination, for tests. */
export function allAnswers(): Answers[] {
  const out: Answers[] = [];
  for (const shape of ['single', 'fixed', 'open'] as Shape[])
    for (const irreversible of [false, true])
      for (const pause of [false, true])
        for (const isolation of [false, true])
          for (const long of [false, true])
            for (const bounded of [false, true]) out.push({ shape, irreversible, pause, isolation, long, bounded });
  return out;
}

/** Turn the raw option values of the question flow into Answers. */
export function toAnswers(values: Partial<Record<QuestionId, string>>): Answers {
  return {
    shape: (values.shape as Shape) ?? 'single',
    irreversible: values.irreversible === 'yes',
    pause: values.pause === 'yes',
    isolation: values.isolation === 'yes',
    long: values.long === 'yes',
    bounded: values.bounded === 'yes',
  };
}
