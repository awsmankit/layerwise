import type { FigureName } from '../components/viz/HairFigure';

/** Which hairline figure stands for each track. */
export const trackFigure: Record<string, FigureName> = {
  start: 'query',
  foundations: 'terrain',
  llm: 'keyboard',
  'rag-agents': 'sieve',
  evals: 'loupe',
  serving: 'slow',
  cloud: 'dish',
  systems: 'hub',
  cost: 'plot',
  edge: 'phone',
  infra: 'cabinet',
  local: 'laptop',
};

export const figureFor = (trackId: string): FigureName => trackFigure[trackId] ?? 'hub';
