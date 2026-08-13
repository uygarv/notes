'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { identityProviderSchema, noteSchema, tagSchema, userSchema, type CreateNote, type CreateTag, type Note, type Tag, type UpdateNote, type UpdateTag, type UpdateUser, type User } from '@notes/schemas';
import { api, ApiError, unwrap } from '@/lib/api';

export const queryKeys = {
  me: ['me'] as const,
  identityProviders: ['identity-providers'] as const,
  notes: ['notes'] as const,
  tags: ['tags'] as const,
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

export function useTags() {
  return useQuery({ queryKey: queryKeys.tags, queryFn: async () => tagSchema.array().parse(unwrap(await api.tags.findAll())) });
}

export function useCreateNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateNote) => noteSchema.parse(unwrap(await api.notes.create({ body }))),
    onSuccess: (note) => client.setQueryData<Note[]>(queryKeys.notes, (notes = []) => [note, ...notes]),
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
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.notes }),
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
