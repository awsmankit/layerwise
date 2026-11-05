import type { Question } from './types';
import { questionsFoundations } from './foundations';
import { questionsApplied } from './applied';
import { questionsPlatform } from './platform';
import { questionsMlAudioEdge } from './ml-audio-edge';
import { questionsBuilderRisk } from './builder-risk';
import { questionsAgenticTest } from './roles-agentic-test';
import { questionsSecurityResponsible } from './roles-security-responsible';
import { questionsCustomerLead } from './roles-customer-lead';
import { questionsProductData } from './roles-product-data';
import { questionsEdgeResearchTools } from './roles-edge-research-tools';

export * from './types';

/** Every question, in a stable order. */
export const questions: Question[] = [...questionsFoundations, ...questionsApplied, ...questionsPlatform, ...questionsMlAudioEdge, ...questionsBuilderRisk, ...questionsAgenticTest, ...questionsSecurityResponsible, ...questionsCustomerLead, ...questionsProductData, ...questionsEdgeResearchTools];

export const questionById = (id: string) => questions.find((q) => q.id === id);

export const allTopics = (): string[] => [...new Set(questions.flatMap((q) => q.topics))].sort();
