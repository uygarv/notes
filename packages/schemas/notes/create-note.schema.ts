import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.number().int()).optional(),
});

export type CreateNote = z.infer<typeof createNoteSchema>;