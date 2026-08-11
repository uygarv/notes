import { z } from 'zod';
import { createTagSchema } from './create-tag.schema';

export const updateTagSchema = createTagSchema.partial();

export type UpdateTag = z.infer<typeof updateTagSchema>;