import { z } from 'zod';

export const lockNoteSchema = z.object({
  content: z.string().min(1),
  contentEncryptionSalt: z.string().min(1),
  contentEncryptionIv: z.string().min(1),
});

export const unlockNoteSchema = z.object({
  content: z.string().min(1),
});

export type LockNote = z.infer<typeof lockNoteSchema>;
export type UnlockNote = z.infer<typeof unlockNoteSchema>;
