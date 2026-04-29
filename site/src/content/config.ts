import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const specRoot = defineCollection({
  loader: glob({ pattern: 'SPEC.md', base: '../' }),
  schema: z.object({}).passthrough(),
});

const spec = defineCollection({
  loader: glob({ pattern: '*.md', base: '../spec' }),
  schema: z.object({}).passthrough(),
});

const docs = defineCollection({
  loader: glob({ pattern: '*.md', base: '../docs' }),
  schema: z.object({}).passthrough(),
});

export const collections = { specRoot, spec, docs };
