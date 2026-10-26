import { getCollection, type CollectionEntry } from 'astro:content';
import { tracks } from '../data/tracks';

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

export const readingMinutes = (body = '') =>
  Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220));

export async function getPulse() {
  const all = await getCollection('pulse', (e) => import.meta.env.DEV || !e.data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
