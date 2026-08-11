import { z } from 'zod';
import { noteSchema } from '../notes';

export const tagSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const tagWithNotesSchema = tagSchema.extend({
  notes: z.array(noteSchema),
});

export type Tag = z.infer<typeof tagSchema>;
export type TagWithNotes = z.infer<typeof tagWithNotesSchema>;