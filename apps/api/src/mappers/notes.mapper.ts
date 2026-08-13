import { Prisma } from '@prisma/client';
import type { Note } from '@notes/schemas';

import { toTagResponses } from './tags.mapper';

type NoteWithTags = Prisma.NoteGetPayload<{
  include: {
    tags: true;
  };
}>;

export function toNoteResponse(note: NoteWithTags): Note {
  const { userId: _, tags, ...response } = note;

  return {
    ...response,
    tags: toTagResponses(tags),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export function toNoteResponses(notes: NoteWithTags[]): Note[] {
  return notes.map(toNoteResponse);
}
