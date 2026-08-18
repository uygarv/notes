UPDATE "Note"
SET "collaborationState" = decode('0000', 'hex')
WHERE "collaborationState" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "NoteCollaborator"
    WHERE "NoteCollaborator"."noteId" = "Note"."id"
      AND "NoteCollaborator"."role" = 'EDITOR'
  );
