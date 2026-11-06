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
import { videosW3EdgeA } from './w3-edge-a';
import { videosW3EdgeB } from './w3-edge-b';
import { videosW3EdgeC } from './w3-edge-c';
import { videosW3AudioA } from './w3-audio-a';
import { videosW3AudioB } from './w3-audio-b';
import { videosW3MlopsA } from './w3-mlops-a';
import { videosW3MlopsB } from './w3-mlops-b';
import { videosW3MlopsC } from './w3-mlops-c';
import { videosW3AppliedA } from './w3-applied-a';
import { videosW3AppliedB } from './w3-applied-b';
import { videosW4DlA } from './w4-dl-a';
import { videosW4DlB } from './w4-dl-b';
import { videosW4DlC } from './w4-dl-c';
import { videosW4Skills } from './w4-skills';
import { videosW4StartA } from './w4-start-a';
import { videosW4StartB } from './w4-start-b';
import { videosW4RespA } from './w4-resp-a';
import { videosW4RespB } from './w4-resp-b';
import { videosW4RespC } from './w4-resp-c';
import { videosW4RespD } from './w4-resp-d';
import { videosW4BuildA } from './w4-build-a';
import { videosW4BuildB } from './w4-build-b';
import { videosW4BuildC } from './w4-build-c';
import { videosW4BuildD } from './w4-build-d';
import { videosW4BuildE } from './w4-build-e';
import { videosW4Misc } from './w4-misc';
import { videosW5LessonsA } from './w5-lessons-a';
import { videosW5LessonsB } from './w5-lessons-b';
import { videosW6Arch } from './w6-arch';
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
  'w3-edge-a': videosW3EdgeA,
  'w3-edge-b': videosW3EdgeB,
  'w3-edge-c': videosW3EdgeC,
  'w3-audio-a': videosW3AudioA,
  'w3-audio-b': videosW3AudioB,
  'w3-mlops-a': videosW3MlopsA,
  'w3-mlops-b': videosW3MlopsB,
  'w3-mlops-c': videosW3MlopsC,
  'w3-applied-a': videosW3AppliedA,
  'w3-applied-b': videosW3AppliedB,
  'w4-dl-a': videosW4DlA,
  'w4-dl-b': videosW4DlB,
  'w4-dl-c': videosW4DlC,
  'w4-skills': videosW4Skills,
  'w4-start-a': videosW4StartA,
  'w4-start-b': videosW4StartB,
  'w4-resp-a': videosW4RespA,
  'w4-resp-b': videosW4RespB,
  'w4-resp-c': videosW4RespC,
  'w4-resp-d': videosW4RespD,
  'w4-build-a': videosW4BuildA,
  'w4-build-b': videosW4BuildB,
  'w4-build-c': videosW4BuildC,
  'w4-build-d': videosW4BuildD,
  'w4-build-e': videosW4BuildE,
  'w4-misc': videosW4Misc,
  'w5-lessons-a': videosW5LessonsA,
  'w5-lessons-b': videosW5LessonsB,
  'w6-arch': videosW6Arch,
};

const all: LessonVideos = Object.assign({}, ...Object.values(videoFiles));

export function videosFor(key: string): LessonVideo[] {
  return all[key] ?? [];
}

export const lessonVideos = all;
