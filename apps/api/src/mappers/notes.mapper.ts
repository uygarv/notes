import { Prisma } from '@prisma/client';
import type { Note, NoteAccess } from '@notes/schemas';

import { toTagResponses } from './tags.mapper';

type NoteWithRelations = Prisma.NoteGetPayload<{
  include: {
    user: { select: { id: true; username: true; profileImageUrl: true } };
    tags: true;
    collaborators: { include: { user: { select: { id: true; username: true; profileImageUrl: true } } } };
    shareLink: true;
  };
}>;

export function toNoteResponse(note: NoteWithRelations, access: NoteAccess): Note {
  const {
    userId: _,
    user,
    tags,
    contentEncryptionSalt,
    contentEncryptionIv,
    collaborators: __,
    shareLink: ___,
    collaborationState: ____,
    ...response
  } = note;

  return {
    ...response,
    ...(note.isLocked && contentEncryptionSalt && contentEncryptionIv
      ? { contentEncryptionSalt, contentEncryptionIv }
      : {}),
    tags: access.role === 'owner' ? toTagResponses(tags) : [],
    access,
    ...(access.role !== 'owner' && { owner: user }),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export function toNoteResponses(
  notes: NoteWithRelations[],
  userId: number,
  accessFor: (note: NoteWithRelations, userId: number) => NoteAccess,
): Note[] {
  return notes.map((note) => toNoteResponse(note, accessFor(note, userId)));
}
