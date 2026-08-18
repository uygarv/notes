import { z } from 'zod';

export const noteVisibilitySchema = z.enum(['private', 'public']);
export const noteRoleSchema = z.enum(['owner', 'editor', 'viewer']);

export const noteAccessSchema = z.object({
  role: noteRoleSchema,
  isShared: z.boolean(),
  isCollaborative: z.boolean(),
});

export const shareLinkSchema = z.object({
  url: z.string().url().optional(),
  visibility: noteVisibilitySchema,
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const createShareLinkSchema = z.object({
  visibility: noteVisibilitySchema,
  expiresAt: z.string().datetime().optional(),
}).superRefine((value, context) => {
  if (value.visibility === 'private' && !value.expiresAt) {
    context.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Private links need an expiration.' });
  }
});

export const collaboratorSchema = z.object({
  userId: z.number().int(),
  username: z.string(),
  profileImageUrl: z.string().url().nullable(),
  role: z.enum(['viewer', 'editor']),
  createdAt: z.string().datetime(),
});

export const addCollaboratorSchema = z.object({
  username: z.string().trim().min(2).max(64),
  role: z.enum(['viewer', 'editor']),
});

export const updateCollaboratorSchema = z.object({
  role: z.enum(['viewer', 'editor']),
});

export const sharingSettingsSchema = z.object({
  visibility: noteVisibilitySchema,
  link: shareLinkSchema.nullable(),
  collaborators: z.array(collaboratorSchema),
});

export const usernameSearchResultSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  profileImageUrl: z.string().url().nullable(),
});

export const publicSharedNoteSchema = z.object({
  title: z.string(),
  content: z.string(),
  updatedAt: z.string().datetime(),
  visibility: noteVisibilitySchema,
  expiresAt: z.string().datetime().nullable(),
});

export type NoteVisibility = z.infer<typeof noteVisibilitySchema>;
export type NoteRole = z.infer<typeof noteRoleSchema>;
export type NoteAccess = z.infer<typeof noteAccessSchema>;
export type CreateShareLink = z.infer<typeof createShareLinkSchema>;
export type AddCollaborator = z.infer<typeof addCollaboratorSchema>;
export type UpdateCollaborator = z.infer<typeof updateCollaboratorSchema>;
