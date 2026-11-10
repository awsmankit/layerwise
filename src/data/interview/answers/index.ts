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

import { answers as more_llm_basics_1 } from './more-llm-basics-1';
import { answers as more_training_1 } from './more-training-1';
import { answers as more_training_2 } from './more-training-2';
import { answers as more_rag_search_1 } from './more-rag-search-1';
import { answers as more_agents_tools_1 } from './more-agents-tools-1';
import { answers as more_agents_tools_2 } from './more-agents-tools-2';
import { answers as more_evals_testing_1 } from './more-evals-testing-1';
import { answers as more_evals_testing_2 } from './more-evals-testing-2';
import { answers as more_serving_cost_1 } from './more-serving-cost-1';
import { answers as more_system_design_1 } from './more-system-design-1';
import { answers as more_ml_stats_1 } from './more-ml-stats-1';
import { answers as more_ml_stats_2 } from './more-ml-stats-2';
import { answers as more_data_mlops_1 } from './more-data-mlops-1';
import { answers as more_data_mlops_2 } from './more-data-mlops-2';
import { answers as more_security_safety_1 } from './more-security-safety-1';
import { answers as more_security_safety_2 } from './more-security-safety-2';
import { answers as more_security_safety_3 } from './more-security-safety-3';
import { answers as more_edge_audio_1 } from './more-edge-audio-1';
import { answers as more_edge_audio_2 } from './more-edge-audio-2';
import { answers as more_product_teams_1 } from './more-product-teams-1';
import { answers as more_product_teams_2 } from './more-product-teams-2';

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
  ...more_llm_basics_1,
  ...more_training_1,
  ...more_training_2,
  ...more_rag_search_1,
  ...more_agents_tools_1,
  ...more_agents_tools_2,
  ...more_evals_testing_1,
  ...more_evals_testing_2,
  ...more_serving_cost_1,
  ...more_system_design_1,
  ...more_ml_stats_1,
  ...more_ml_stats_2,
  ...more_data_mlops_1,
  ...more_data_mlops_2,
  ...more_security_safety_1,
  ...more_security_safety_2,
  ...more_security_safety_3,
  ...more_edge_audio_1,
  ...more_edge_audio_2,
  ...more_product_teams_1,
  ...more_product_teams_2,
};

export const answerFor = (id: string): Answer | undefined => answers[id];
