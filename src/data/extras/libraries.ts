import type { Extra } from '../lesson-extras';

export const extras_libraries: Record<string, Extra> = {
  'rag-agents/choosing-ai-libraries': {
    takeaways: [
      'Libraries sit at layers of an LLM app: agent logic, prompts and output shape, your data, a gateway, and the model, with evaluation, guardrails and observability cutting across all of them.',
      'Ask four questions before adding one: do I have this problem today, is it maintained, how much does it hide, and can I leave.',
      'Frameworks cost churn and hidden behaviour: projects get archived, renamed or rewritten, and a library’s default prompts still shape your answers.',
      'Check the licence file, not the badge: some projects keep directories under a separate enterprise licence, or use source-available terms.',
      'For one model, a few tools and a clear flow, plain code is often cheaper than a framework.',
    ],
    prereq: ['rag-agents/the-tools-and-ecosystem', 'rag-agents/agents-and-tool-use'],
    quiz: [
      {
        q: 'You want answers drawn from your own documents. Which kind of library do you look at first?',
        options: ['RAG and vector search', 'Fine-tuning', 'A model gateway', 'I don’t know'],
        answer: 0,
        why: 'Answers from your own documents is retrieval: a RAG library to load and chunk them, and a vector store to search them. Fine-tuning changes the model, and a gateway only routes calls.',
      },
      {
        q: 'A project’s README says it is archived and names a successor. What should a new project do?',
        options: ['Start with the successor', 'Start with it anyway, it still works today', 'Fork it and keep patching it yourself', 'I don’t know'],
        answer: 0,
        why: 'An archived project gets no fixes, including security fixes. A new project should start with the named successor and treat the archived one as reading material.',
      },
      {
        q: 'Why read a project’s LICENSE file instead of trusting the badge on its README?',
        options: [
          'Different directories can be under different licences, and some terms are source-available only',
          'Badges are always out of date by a year',
          'A licence file is the only place to find the install command',
          'I don’t know',
        ],
        answer: 0,
        why: 'Some repositories, such as Weaviate, Langfuse and LiteLLM, keep certain directories under an enterprise licence, and Arize Phoenix uses the source-available Elastic License 2.0. One badge hides that.',
      },
      {
        q: 'You are about to add a library, and rewriting your code to plain provider calls would take about a month. What does the lesson say that means?',
        options: [
          'Nothing: the cost of leaving is not a selection criterion',
          'You are safe, because the library is widely used',
          'You should add a second framework to spread the risk',
          'You are locked in: keep the library at the edge of your code so leaving would take about a day',
        ],
        answer: 3,
        why: 'The lesson\'s test is "can I leave?": a day to rewrite means you are safe, a month means you are locked in. Keeping the library at the edge of your code is what keeps leaving cheap.',
      },
    ],
  },
};
