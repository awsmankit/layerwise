import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "build-c" batch. */
export const extrasW4BuildC: Record<string, Extra> = {
  'rag-agents/text-to-sql-and-data-agents': {
    takeaways: [
      'The model translates the question into SQL and the database does the computing. The danger is a query that runs fine but means something else: a wrong join, a missing filter, the wrong grain.',
      'Quality comes from context: descriptions, sample values, curated views or a semantic layer, and retrieved example queries. A fixed, verified query beats a generated one for the questions that matter most.',
      'Score by running both queries and comparing rows, preferably on more than one database, and check the gold queries too. Public benchmark scores are not a forecast for your warehouse.',
      'Safety lives outside the model: a role that can only read approved views, the user\'s own row permissions, time and row limits, and a guard that fails closed. Show the SQL and cap repair attempts.',
    ],
    prereq: ['rag-agents/agents-and-tool-use', 'evals/llm-security'],
    quiz: [
      { q: 'A model answers "How many customers have never ordered?" with an inner JOIN of customers and orders, then WHERE orders.id IS NULL. What does the query return?', options: ['The right count', 'An error, because the join is invalid', 'A count of 0, with no error, because the inner join discards exactly those customers', 'The count of all customers'], answer: 2, why: 'An inner join keeps only customers that have orders, so none can have a NULL order id. The query runs and gives a plausible but wrong number.' },
      { q: 'A generated query returns the same rows as the gold query on your test database, but it filters on customer_id <= 3 instead of on region. How do you catch it?', options: ['Run both on a second database with different data and require the same rows', 'Compare the SQL text with the gold query', 'Ask the model whether it is sure', 'Add a LIMIT to the query'], answer: 0, why: 'A query that got lucky with one database usually fails on another, which is the idea behind test-suite accuracy. Comparing text would also reject correct queries that are written differently.' },
      { q: 'Which protection still works if the model writes a harmful query?', options: ['A system prompt telling it never to write DELETE', 'Asking the model to review its own SQL', 'Showing the SQL to the user afterwards', 'A database role that can only SELECT from approved views, with a time limit and a row limit'], answer: 3, why: 'A prompt and a self-review depend on the model behaving. A role enforced by the database holds whatever SQL arrives.' },
      { q: 'A text-to-SQL method scores 80% execution accuracy on a public benchmark. What can you safely conclude about your own warehouse?', options: ['It will score about 80%', 'Nothing reliable: your schema, questions and gold queries differ, so build an evaluation set from real questions', 'It will score higher, because yours has fewer tables', 'The benchmark is useless and should be ignored'], answer: 1, why: 'Benchmarks measure something real but use cleaner schemas than most warehouses, and audits have found annotation errors in their gold queries. Your own questions are the only fair test.' },
    ],
  },
  'rag-agents/computer-use-and-browser-agents': {
    takeaways: [
      'A screen agent is the agent loop with screenshots in and mouse and keyboard actions out. The model only proposes actions; your harness performs them in an environment you control.',
      'Long tasks compound small error rates: with an example 95% success per step, a 20-step task finishes about 36% of the time. Use checkpoints and a person to take over at logins.',
      'Web pages are untrusted input and the attacker\'s text reaches the model through screenshots and page outlines alike. Training and classifiers lower the risk, and no vendor says they remove it.',
      'Controls that do not depend on the model: a clean sandbox with no credentials, a domain allow-list, confirmation for irreversible actions, and step, time and cost caps. Prefer an API or tool before a screen agent.',
    ],
    prereq: ['rag-agents/agents-and-tool-use', 'evals/llm-security', 'foundations/multimodal-models'],
    quiz: [
      { q: 'In a computer-use loop, what actually performs the click?', options: ['The model, directly on your machine', 'Your harness, after it checks the action the model proposed', 'The browser vendor\'s servers', 'The user, by hand each time'], answer: 1, why: 'Every provider\'s documentation describes the same split: the model returns an action, and your application runs it in an environment you control.' },
      { q: 'Suppose each step succeeds with probability 95%, independently. About how likely is a 20-step task to succeed?', options: ['About 95%', 'About 77%', 'About 8%', 'About 36%'], answer: 3, why: '0.95 to the power 20 is about 0.36. Real errors are not independent, but small per-step failure rates add up over long tasks.' },
      { q: 'A review on a shop page hides text telling the agent to post the user\'s saved address as a public review on the same site. Which control helps most?', options: ['A clean sandbox with no saved details, plus a person approving any post', 'An allow-list containing the shop\'s own domain', 'A stronger instruction in the system prompt', 'A page filter that caught a different attack last week'], answer: 0, why: 'The allow-list permits the shop\'s own site, and filters and prompts can miss a disguised instruction. Removing the data and gating the outbound action works whatever the model does.' },
      { q: 'You need to read order data from a system that has a documented API. What is the best first choice?', options: ['A screenshot-based desktop agent', 'A browser agent using the accessibility outline', 'A screen agent in a virtual machine', 'Call the API, directly or through a tool'], answer: 3, why: 'An API is faster, cheaper, structured, auditable and permission-scoped. A screen agent is the last resort for software that has no better interface.' },
    ],
  },
};
