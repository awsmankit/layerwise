import type { Answer } from './types';
import { answers as llmBasics } from './llm-basics';
import { answers as training } from './training';
import { answers as ragSearch } from './rag-search';
import { answers as agentsTools } from './agents-tools';
import { answers as evalsTesting } from './evals-testing';
import { answers as servingCost } from './serving-cost';
import { answers as systemDesign } from './system-design';
import { answers as mlStats } from './ml-stats';
import { answers as dataMlops } from './data-mlops';
import { answers as securitySafety } from './security-safety';
import { answers as edgeAudio } from './edge-audio';
import { answers as productTeams } from './product-teams';

export * from './types';

/** One file per category. A question is written once and keeps its id, so a link to it never changes. */
export const answers: Record<string, Answer> = {
  ...llmBasics,
  ...training,
  ...ragSearch,
  ...agentsTools,
  ...evalsTesting,
  ...servingCost,
  ...systemDesign,
  ...mlStats,
  ...dataMlops,
  ...securitySafety,
  ...edgeAudio,
  ...productTeams,
};

export const answerFor = (id: string): Answer | undefined => answers[id];
