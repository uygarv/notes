import { z } from 'zod';
import { tagSchema } from '../tags/tag.schema.js';

export const noteSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  createdAt: z.string(),
  userId: z.number(),
  tags: z.array(tagSchema),
});

export type Note = z.infer<typeof noteSchema>;