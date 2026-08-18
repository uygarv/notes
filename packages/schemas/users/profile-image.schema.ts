import { z } from 'zod';

export const profileImageContentTypeSchema = z.enum([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const createProfileImageUploadSchema = z.object({
  contentType: profileImageContentTypeSchema,
});

export const profileImageUploadSchema = z.object({
  key: z.string().min(1),
  uploadUrl: z.string().url(),
  uploadFields: z.record(z.string(), z.string()),
});

export const completeProfileImageUploadSchema = z.object({
  key: z.string().min(1),
});

export type CreateProfileImageUpload = z.infer<
  typeof createProfileImageUploadSchema
>;
export type CompleteProfileImageUpload = z.infer<
  typeof completeProfileImageUploadSchema
>;
