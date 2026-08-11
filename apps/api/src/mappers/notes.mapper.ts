import { Prisma } from '@prisma/client';
import type { Note } from '@notes/schemas';

type NoteWithTags = Prisma.NoteGetPayload<{
  include: {
    tags: true;
  };
}>;

export function toNoteResponse(note: NoteWithTags): Note {
  const { userId: _, ...response } = note;

  return {
    ...response,
    createdAt: note.createdAt.toISOString(),
  };
}

export function toNoteResponses(notes: NoteWithTags[]): Note[] {
  return notes.map(toNoteResponse);
}