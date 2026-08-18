import { Prisma } from '@prisma/client';
import type { Tag, TagWithNotes } from '@notes/schemas';

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
    notes: tag.notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      isLocked: note.isLocked,
      ...(note.isLocked && note.contentEncryptionSalt && note.contentEncryptionIv
        ? { contentEncryptionSalt: note.contentEncryptionSalt, contentEncryptionIv: note.contentEncryptionIv }
        : {}),
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      tags: toTagResponses(note.tags),
      access: { role: 'owner', isShared: false, isCollaborative: Boolean(note.collaborationState) },
    })),
  };
}
