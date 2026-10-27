import type { Extra } from '../lesson-extras';

export const extras_frameworks: Record<string, Extra> = {
  'rag-agents/langchain-and-langgraph': {
    takeaways: [
      'LangChain is the high-level layer (models, tools, structured output, create_agent); LangGraph is the runtime underneath that runs a graph of state, nodes and edges.',
      'In a graph, every node reads one shared state and returns an update; a conditional edge uses a function to pick the next node.',
      'interrupt() pauses a run and the checkpointer saves state under a thread id, so a person can decide later and the run resumes with the same thread id.',
      'Short-term memory is the checkpointer, per thread; long-term memory is the store, shared across threads.',
      'Use plain code when a few calls or one tool loop will do; add a framework for saved state, approval steps and long runs.',
    ],
    prereq: ['rag-agents/agents-and-tool-use', 'rag-agents/the-tools-and-ecosystem'],
    quiz: [
      {
        q: 'In a LangGraph graph, what does a conditional edge do?',
        options: [
          'It uses a function that reads the state to choose which node runs next',
          'It always runs every connected node at the same time',
          'It saves the state to a database',
          'I don’t know',
        ],
        answer: 0,
        why: 'A conditional edge calls a routing function on the state and follows the edge it picks. Saving state is the checkpointer’s job.',
      },
      {
        q: 'A run paused at interrupt() while a person decides. What must you do to resume the same run?',
        options: [
          'Start a new run with a new thread id',
          'Run the graph again with the decision and the same thread id',
          'Wait for the model to answer on its own',
          'I don’t know',
        ],
        answer: 1,
        why: 'The checkpointer finds the saved state by thread id. A new thread id would start an empty thread instead of the paused one.',
      },
      {
        q: 'Which statement about frameworks is the most accurate?',
        options: [
          'Every agent needs LangGraph',
          'A framework removes the need to test the agent',
          'Plain code is often enough; add a framework when you need saved state, approval steps or long runs',
          'I don’t know',
        ],
        answer: 2,
        why: 'A framework adds a layer to learn and upgrade. It pays off when you need durable state, human approval or long-running work, not for every agent.',
      },
    ],
  },
};
