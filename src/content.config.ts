import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const journal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/journal" }),
  schema: z.object({
    day: z.number(),
    title: z.string(),
    location: z.string(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    mile: z.number().nullable(),
    photos: z.array(z.string()).default([]),
  }),
});

export const collections = { journal };
