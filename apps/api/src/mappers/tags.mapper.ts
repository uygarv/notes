import { Prisma } from '@prisma/client';
import type { Tag, TagWithNotes } from '@notes/schemas';

import { toNoteResponses } from './notes.mapper';

// payloads for both response types
type TagPayload = Prisma.TagGetPayload<{}>;
type TagWithNotesPayload = Prisma.TagGetPayload<{
  include: {
    notes: {
      include: {
        tags: true;
      };
    };
  };
}>;

// converters for tags with no notes field
export function toTagResponse(tag: TagPayload): Tag {
  const { userId: _, ...response } = tag;

  return response;
}
export function toTagResponses(tags: TagPayload[]): Tag[] {
  return tags.map((tag) => toTagResponse(tag));
}

//converter for tags with a notes field
export function toTagWithNotesResponse(tag: TagWithNotesPayload): TagWithNotes {
  return {
    ...tag,
    notes: toNoteResponses(tag.notes),
  };
}