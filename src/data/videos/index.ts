import { videosCore } from './core';
import { videosOps } from './ops';
import type { LessonVideo } from './types';

export type { LessonVideo } from './types';

export const videosChecked = '2026-10-29';

const all = { ...videosCore, ...videosOps };

export function videosFor(key: string): LessonVideo[] {
  return all[key] ?? [];
}

export const lessonVideos = all;
