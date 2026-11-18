-- Watch / Spectator support: room visibility policy and spectator capacity.
-- Existing rooms keep their current privacy semantics (PRIVATE stays private).
ALTER TABLE "Room" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Room" ADD COLUMN "allowSpectators" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Room" ADD COLUMN "spectatorLimit" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "Room" ADD COLUMN "spectatorAccessCodeHash" TEXT;

-- Preserve privacy for rooms that were already password protected.
UPDATE "Room" SET "visibility" = 'PRIVATE' WHERE "isPrivate" = true;
