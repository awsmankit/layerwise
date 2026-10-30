import { getCollection, type CollectionEntry } from 'astro:content';
import { tracks } from '../data/tracks';
import { shortDay } from './dates';

export type Lesson = CollectionEntry<'lessons'>;

const trackIndex = (id: string) => tracks.findIndex((t) => t.id === id);

/** The URL segment for a lesson: the file name without its track folder. */
export const slugOf = (l: Lesson) => l.id.split('/').pop()!;

export const lessonPath = (l: Lesson) => `/learn/${l.data.track}/${slugOf(l)}/`;

/** All lessons in curriculum order: by track, then by `order`. */
export async function getLessons(): Promise<Lesson[]> {
  const all = await getCollection('lessons');
  return all.sort(
    (a, b) => trackIndex(a.data.track) - trackIndex(b.data.track) || a.data.order - b.data.order,
  );
}

/**
 * Reading time: prose at about 200 words a minute, code at half that, and
 * about a minute for each interactive part, since those are meant to be used.
 */
export function readingMinutes(body = ''): number {
  const noImports = body.replace(/^import .*$/gm, '');
  const code = (noImports.match(/```[\s\S]*?```/g) ?? []).join(' ');
  const prose = noImports.replace(/```[\s\S]*?```/g, ' ');
  const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const interactive = (noImports.match(/client:(visible|load|idle)/g) ?? []).length;
  return Math.max(1, Math.round(words(prose) / 200 + words(code) / 100 + interactive));
}

export async function getPulse() {
  const all = await getCollection('pulse', (e) => import.meta.env.DEV || !e.data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** "14 Sep 2025", the same in pages and in islands */
export const formatDate = (d: Date) => shortDay(d.toISOString());
