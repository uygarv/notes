import { z } from 'zod';
import { createNoteSchema } from './create-note.schema';

export const updateNoteSchema = createNoteSchema.partial().extend({
  contentEncryptionIv: z.string().min(1).optional(),
});

export type UpdateNote = z.infer<typeof updateNoteSchema>;
