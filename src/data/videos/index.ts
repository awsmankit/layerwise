import { videosCore } from './core';
import { videosOps } from './ops';
import { videosW1StartA } from './w1-start-a';
import { videosW1RespA } from './w1-resp-a';
import { videosW1RespB } from './w1-resp-b';
import { videosW1Skills } from './w1-skills';
import { videosW1DlA } from './w1-dl-a';
import { videosW1DlB } from './w1-dl-b';
import { videosW1MlA } from './w1-ml-a';
import { videosW1MlB } from './w1-ml-b';
import { videosW1Audio } from './w1-audio';
import { videosW2AgentsA } from './w2-agents-a';
import { videosW2AgentsB } from './w2-agents-b';
import { videosW2Product } from './w2-product';
import { videosW2Evals } from './w2-evals';
import { videosW2Docs } from './w2-docs';
import { videosW2DlA } from './w2-dl-a';
import { videosW2DlB } from './w2-dl-b';
import { videosW2Resp } from './w2-resp';
import type { LessonVideo, LessonVideos } from './types';

export type { LessonVideo } from './types';

export const videosChecked = '2026-11-01';

/** Every video file by name, so tests and tools can check each one. */
export const videoFiles: Record<string, LessonVideos> = {
  core: videosCore,
  ops: videosOps,
  'w1-start-a': videosW1StartA,
  'w1-resp-a': videosW1RespA,
  'w1-resp-b': videosW1RespB,
  'w1-skills': videosW1Skills,
  'w1-dl-a': videosW1DlA,
  'w1-dl-b': videosW1DlB,
  'w1-ml-a': videosW1MlA,
  'w1-ml-b': videosW1MlB,
  'w1-audio': videosW1Audio,
  'w2-agents-a': videosW2AgentsA,
  'w2-agents-b': videosW2AgentsB,
  'w2-product': videosW2Product,
  'w2-evals': videosW2Evals,
  'w2-docs': videosW2Docs,
  'w2-dl-a': videosW2DlA,
  'w2-dl-b': videosW2DlB,
  'w2-resp': videosW2Resp,
};

const all: LessonVideos = Object.assign({}, ...Object.values(videoFiles));

export function videosFor(key: string): LessonVideo[] {
  return all[key] ?? [];
}

export const lessonVideos = all;
