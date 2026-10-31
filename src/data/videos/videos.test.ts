import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { videoFiles, videosChecked } from './index';

const files = videoFiles;
const youtube = /^https:\/\/www\.youtube\.com\/(watch\?v=[\w-]{11}|playlist\?list=[\w-]+)$/;

describe('lesson videos', () => {
  it('only use keys that are real lessons, and no key appears in two files', () => {
    for (const [name, map] of Object.entries(files))
      for (const key of Object.keys(map))
        expect(existsSync(join(process.cwd(), 'src/content/lessons', `${key}.mdx`)), `${name}: ${key}`).toBe(true);
    const seen = new Map<string, string>();
    for (const [name, map] of Object.entries(files))
      for (const key of Object.keys(map)) {
        expect(seen.has(key), `${key} is in both ${seen.get(key)} and ${name}`).toBe(false);
        seen.set(key, name);
      }
  });

  it('link only to YouTube videos or playlists', () => {
    for (const map of Object.values(files))
      for (const list of Object.values(map))
        for (const v of list) expect(v.url, v.title).toMatch(youtube);
  });

  it('give each lesson one to three videos, none repeated, each with a creator and title', () => {
    for (const map of Object.values(files))
      for (const [key, list] of Object.entries(map)) {
        expect(list.length, key).toBeGreaterThanOrEqual(1);
        expect(list.length, key).toBeLessThanOrEqual(3);
        expect(new Set(list.map((v) => v.url)).size, `${key} repeats a url`).toBe(list.length);
        for (const v of list) {
          expect(v.creator.trim().length, `${key}: ${v.url}`).toBeGreaterThan(1);
          expect(v.title.trim().length, `${key}: ${v.url}`).toBeGreaterThan(3);
          if (v.minutes !== undefined) expect(v.minutes, `${key}: ${v.title}`).toBeGreaterThan(0);
        }
      }
  });

  it('records when the videos were checked', () => {
    expect(videosChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
