import type { QuickQuestion } from './types';
import type { CategoryId } from '../categories';
import { quickLlmBasics } from './llm-basics';
import { quickTraining } from './training';
import { quickRagSearch } from './rag-search';
import { quickAgentsTools } from './agents-tools';
import { quickEvalsTesting } from './evals-testing';
import { quickServingCost } from './serving-cost';
import { quickSystemDesign } from './system-design';
import { quickMlStats } from './ml-stats';
import { quickDataMlops } from './data-mlops';
import { quickSecuritySafety } from './security-safety';
import { quickEdgeAudio } from './edge-audio';
import { quickProductTeams } from './product-teams';

export * from './types';

/** Every quick question, in a stable order. Add a category file and list it here. */
export const quickQuestions: QuickQuestion[] = [
  ...quickLlmBasics,
  ...quickTraining,
  ...quickRagSearch,
  ...quickAgentsTools,
  ...quickEvalsTesting,
  ...quickServingCost,
  ...quickSystemDesign,
  ...quickMlStats,
  ...quickDataMlops,
  ...quickSecuritySafety,
  ...quickEdgeAudio,
  ...quickProductTeams,
];

/** The quick questions of one category, in the order they were written (simplest first). */
export const quickFor = (category: CategoryId) => quickQuestions.filter((q) => q.category === category);
