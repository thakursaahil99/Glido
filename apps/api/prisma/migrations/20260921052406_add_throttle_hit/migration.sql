-- CreateTable
CREATE TABLE "ThrottleHit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),

    CONSTRAINT "ThrottleHit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "ThrottleHit_expiresAt_idx" ON "ThrottleHit"("expiresAt");
