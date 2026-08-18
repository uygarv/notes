import { z } from 'zod';
import { tagSchema } from '../tags/tag.schema.js';
import { noteAccessSchema } from './sharing.schema.js';

export const noteSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  isLocked: z.boolean(),
  contentEncryptionSalt: z.string().optional(),
  contentEncryptionIv: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(tagSchema),
  access: noteAccessSchema,
  owner: z
    .object({
      id: z.number(),
      username: z.string().nullable(),
      profileImageUrl: z.string().url().nullable(),
    })
    .optional(),
});

export type Note = z.infer<typeof noteSchema>;
