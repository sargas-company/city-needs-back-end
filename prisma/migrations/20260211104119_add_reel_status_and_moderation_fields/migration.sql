-- CreateEnum
CREATE TYPE "ReelStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "reels" ADD COLUMN     "cleanupAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByAdminId" TEXT,
ADD COLUMN     "status" "ReelStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "reels_status_idx" ON "reels"("status");

-- CreateIndex
CREATE INDEX "reels_cleanupAt_idx" ON "reels"("cleanupAt");

-- CreateIndex
CREATE INDEX "reels_status_cleanupAt_idx" ON "reels"("status", "cleanupAt");
