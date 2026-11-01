import type { Question } from './types';
import { questionsFoundations } from './foundations';
import { questionsApplied } from './applied';
import { questionsPlatform } from './platform';
import { questionsMlAudioEdge } from './ml-audio-edge';
import { questionsBuilderRisk } from './builder-risk';

export * from './types';

/** Every question, in a stable order. */
export const questions: Question[] = [...questionsFoundations, ...questionsApplied, ...questionsPlatform, ...questionsMlAudioEdge, ...questionsBuilderRisk];

export const questionById = (id: string) => questions.find((q) => q.id === id);

export const allTopics = (): string[] => [...new Set(questions.flatMap((q) => q.topics))].sort();
