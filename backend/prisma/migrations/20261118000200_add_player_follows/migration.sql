-- Registered-only social graph: follow / favourite / match-live notifications
CREATE TABLE "PlayerFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isFavourite" BOOLEAN NOT NULL DEFAULT false,
    "notifyLive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerFollow_followerId_playerId_key" ON "PlayerFollow"("followerId", "playerId");

CREATE INDEX "PlayerFollow_playerId_notifyLive_idx" ON "PlayerFollow"("playerId", "notifyLive");

ALTER TABLE "PlayerFollow" ADD CONSTRAINT "PlayerFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerFollow" ADD CONSTRAINT "PlayerFollow_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
