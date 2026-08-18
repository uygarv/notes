CREATE TYPE "NoteVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
CREATE TYPE "NoteCollaboratorRole" AS ENUM ('VIEWER', 'EDITOR');

ALTER TABLE "Note"
  ADD COLUMN "visibility" "NoteVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "collaborationState" BYTEA;

CREATE TABLE "NoteShareLink" (
  "id" SERIAL NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "noteId" INTEGER NOT NULL,
  CONSTRAINT "NoteShareLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NoteCollaborator" (
  "noteId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "role" "NoteCollaboratorRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NoteCollaborator_pkey" PRIMARY KEY ("noteId", "userId")
);

CREATE UNIQUE INDEX "NoteShareLink_tokenHash_key" ON "NoteShareLink"("tokenHash");
CREATE UNIQUE INDEX "NoteShareLink_noteId_key" ON "NoteShareLink"("noteId");
CREATE INDEX "NoteCollaborator_userId_idx" ON "NoteCollaborator"("userId");

ALTER TABLE "NoteShareLink"
  ADD CONSTRAINT "NoteShareLink_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteCollaborator"
  ADD CONSTRAINT "NoteCollaborator_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteCollaborator"
  ADD CONSTRAINT "NoteCollaborator_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
