import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { trackIds, levelIds } from './data/tracks';

const source = z.object({ label: z.string(), url: z.url() });

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    track: z.enum(trackIds),
    level: z.enum(levelIds),
    order: z.number(),
    summary: z.string(),
    updated: z.coerce.date(),
    sources: z.array(source).default([]),
  }),
});

const pulse = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pulse' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    source: source.optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons, pulse };
