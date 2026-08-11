import { z } from 'zod';
import { createNoteSchema } from './create-note.schema';

export const updateNoteSchema = createNoteSchema.partial();

export type UpdateNote = z.infer<typeof updateNoteSchema>;