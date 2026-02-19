-- AlterTable
ALTER TABLE "business_videos" ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "processingFinishedAt" TIMESTAMP(3),
ADD COLUMN     "processingStartedAt" TIMESTAMP(3),
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reels" ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "processedUrl" TEXT,
ADD COLUMN     "processingFinishedAt" TIMESTAMP(3),
ADD COLUMN     "processingStartedAt" TIMESTAMP(3),
ADD COLUMN     "processingStatus" "VideoProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "width" INTEGER;

-- CreateIndex
CREATE INDEX "reels_processingStatus_idx" ON "reels"("processingStatus");
