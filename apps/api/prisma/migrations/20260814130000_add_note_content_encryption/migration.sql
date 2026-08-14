ALTER TABLE "Note"
ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "contentEncryptionSalt" TEXT,
ADD COLUMN "contentEncryptionIv" TEXT;
