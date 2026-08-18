'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collaboratorSchema, identityProviderSchema, noteSchema, profileImageUploadSchema, publicSharedNoteSchema, sharingSettingsSchema, tagSchema, userSchema, usernameSearchResultSchema, type AddCollaborator, type ChangePassword, type CreateNote, type CreateProfileImageUpload, type CreateShareLink, type CreateTag, type LockNote, type Note, type Tag, type UnlockNote, type UpdateCollaborator, type UpdateNote, type UpdateTag, type UpdateUser, type User } from '@notes/schemas';
import { api, ApiError, unwrap } from '@/lib/api';

export const queryKeys = {
  me: ['me'] as const,
  identityProviders: ['identity-providers'] as const,
  notes: ['notes'] as const,
  note: (noteId: number) => ['notes', noteId] as const,
  tags: ['tags'] as const,
  sharing: (noteId: number) => ['notes', noteId, 'sharing'] as const,
  sharedNote: (token: string) => ['share', token] as const,
  usernameSearch: (query: string) => ['users', 'search', query] as const,
};

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => userSchema.parse(unwrap(await api.users.getMe())),
    enabled,
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 1,
  });
}

export function useIdentityProviders() {
  return useQuery({
    queryKey: queryKeys.identityProviders,
    queryFn: async () => identityProviderSchema.array().parse(unwrap(await api.users.getIdentityProviders())),
  });
}

export function useNotes() {
  return useQuery({ queryKey: queryKeys.notes, queryFn: async () => noteSchema.array().parse(unwrap(await api.notes.findAll())) });
}

export function useNote(noteId: number | null) {
  return useQuery({
    queryKey: queryKeys.note(noteId ?? 0),
    queryFn: async () =>
      noteSchema.parse(unwrap(await api.notes.findOne({ params: { id: noteId! } }))),
    enabled: noteId !== null,
    refetchOnMount: 'always',
    retry: false,
  });
}

export function useTags() {
  return useQuery({ queryKey: queryKeys.tags, queryFn: async () => tagSchema.array().parse(unwrap(await api.tags.findAll())) });
}

export function useSharing(noteId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.sharing(noteId ?? 0),
    queryFn: async () => sharingSettingsSchema.parse(unwrap(await api.notes.getSharing({ params: { id: noteId! } }))),
    enabled: Boolean(noteId),
  });
}

export function useUsernameSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.usernameSearch(query),
    queryFn: async () => usernameSearchResultSchema.array().parse(unwrap(await api.users.searchByUsername({ query: { query } }))),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 15_000,
  });
}

export function useSharedNote(token: string) {
  return useQuery({
    queryKey: queryKeys.sharedNote(token),
    queryFn: async () => publicSharedNoteSchema.parse(unwrap(await api.shares.getByToken({ params: { token } }))),
    retry: (count, error) => !(error instanceof ApiError && [401, 403, 404, 410].includes(error.status)) && count < 1,
  });
}

export function useCreateShareLink(noteId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateShareLink) => sharingSettingsSchema.parse(unwrap(await api.notes.createShareLink({ params: { id: noteId }, body }))),
    onSuccess: (settings) => client.setQueryData(queryKeys.sharing(noteId), settings),
  });
}

export function useDeleteShareLink(noteId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => sharingSettingsSchema.parse(unwrap(await api.notes.deleteShareLink({ params: { id: noteId } }))),
    onSuccess: (settings) => client.setQueryData(queryKeys.sharing(noteId), settings),
  });
}

export function useAddCollaborator(noteId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: AddCollaborator) => collaboratorSchema.parse(unwrap(await api.notes.addCollaborator({ params: { id: noteId }, body }))),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.sharing(noteId) });
      client.invalidateQueries({ queryKey: queryKeys.notes });
    },
  });
}

export function useUpdateCollaborator(noteId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, body }: { userId: number; body: UpdateCollaborator }) => collaboratorSchema.parse(unwrap(await api.notes.updateCollaborator({ params: { id: noteId, userId }, body }))),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.sharing(noteId) });
      client.invalidateQueries({ queryKey: queryKeys.notes });
    },
  });
}

export function useDeleteCollaborator(noteId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => unwrap(await api.notes.deleteCollaborator({ params: { id: noteId, userId } })),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.sharing(noteId) });
      client.invalidateQueries({ queryKey: queryKeys.notes });
    },
  });
}

export function useCreateNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateNote) => noteSchema.parse(unwrap(await api.notes.create({ body }))),
    onSuccess: (note) => client.setQueryData<Note[]>(queryKeys.notes, (notes = []) => [note, ...notes]),
  });
}

export function useChangePassword() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: ChangePassword) => unwrap(await api.auth.changePassword({ body })),
    onSuccess: () => client.setQueryData<User>(queryKeys.me, (user) => user
      ? { ...user, hasPassword: true }
      : user),
  });
}

export function useUpdateNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: UpdateNote }) => noteSchema.parse(unwrap(await api.notes.update({ params: { id }, body }))),
    onMutate: async ({ id, body }) => {
      await client.cancelQueries({ queryKey: queryKeys.notes });
      const previous = client.getQueryData<Note[]>(queryKeys.notes);
      const availableTags = client.getQueryData<Tag[]>(queryKeys.tags) ?? [];
      client.setQueryData<Note[]>(queryKeys.notes, (notes = []) => notes.map((note) => note.id === id ? {
        ...note,
        ...body,
        updatedAt: new Date().toISOString(),
        tags: body.tags === undefined ? note.tags : availableTags.filter((tag) => body.tags?.includes(tag.id)),
      } : note));
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(queryKeys.notes, context?.previous),
    onSuccess: (note) => client.setQueryData<Note[]>(queryKeys.notes, (notes = []) => notes.map((item) => item.id === note.id ? note : item)),
  });
}

export function useLockNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: LockNote }) => noteSchema.parse(unwrap(await api.notes.lock({ params: { id }, body }))),
    onSuccess: (note) => client.setQueryData<Note[]>(queryKeys.notes, (notes = []) => notes.map((item) => item.id === note.id ? note : item)),
  });
}

export function useUnlockNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: UnlockNote }) => noteSchema.parse(unwrap(await api.notes.unlock({ params: { id }, body }))),
    onSuccess: (note) => client.setQueryData<Note[]>(queryKeys.notes, (notes = []) => notes.map((item) => item.id === note.id ? note : item)),
  });
}

export function useDeleteNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => noteSchema.parse(unwrap(await api.notes.delete({ params: { id } }))),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: queryKeys.notes });
      const previous = client.getQueryData<Note[]>(queryKeys.notes);
      client.setQueryData<Note[]>(queryKeys.notes, (notes = []) => notes.filter((note) => note.id !== id));
      return { previous };
    },
    onError: (_error, _id, context) => client.setQueryData(queryKeys.notes, context?.previous),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.notes }),
  });
}

export function useCreateTag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTag) => tagSchema.parse(unwrap(await api.tags.create({ body }))),
    onSuccess: (tag) => client.setQueryData<Tag[]>(queryKeys.tags, (tags = []) => [...tags, tag]),
  });
}

export function useUpdateTag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: UpdateTag }) => tagSchema.parse(unwrap(await api.tags.update({ params: { id }, body }))),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.tags });
      client.invalidateQueries({ queryKey: queryKeys.notes });
    },
  });
}

export function useDeleteTag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => tagSchema.parse(unwrap(await api.tags.delete({ params: { id } }))),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.tags });
      client.invalidateQueries({ queryKey: queryKeys.notes });
    },
  });
}

export function useUpdateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateUser) => userSchema.parse(unwrap(await api.users.updateMe({ body }))),
    onSuccess: (user: User) => client.setQueryData(queryKeys.me, user),
  });
}

export function useUploadProfileImage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) => {
      const contentType = file.type as CreateProfileImageUpload['contentType'];
      const upload = profileImageUploadSchema.parse(unwrap(await api.users.createProfileImageUpload({ body: { contentType } })));
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', upload.uploadUrl);
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
        };
        request.onload = () => request.status >= 200 && request.status < 300
          ? resolve()
          : reject(new Error('Profile image upload failed.'));
        request.onerror = () => reject(new Error('Profile image upload failed.'));
        const form = new FormData();
        Object.entries(upload.uploadFields).forEach(([name, value]) => form.append(name, value));
        form.append('file', file);
        request.send(form);
      });
      return userSchema.parse(unwrap(await api.users.completeProfileImageUpload({ body: { key: upload.key } })));
    },
    onSuccess: (user) => client.setQueryData(queryKeys.me, user),
  });
}

export function useDeleteProfileImage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => userSchema.parse(unwrap(await api.users.deleteProfileImage())),
    onSuccess: (user) => client.setQueryData(queryKeys.me, user),
  });
}
