-- CreateEnum
CREATE TYPE "BusinessVideoVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESUBMISSION');

-- CreateEnum
CREATE TYPE "VideoProcessingStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');

-- AlterEnum
ALTER TYPE "FileType" ADD VALUE 'BUSINESS_VIDEO';

-- AlterEnum
ALTER TYPE "UploadItemKind" ADD VALUE 'VIDEO';

-- CreateTable
CREATE TABLE "business_videos" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "videoFileId" TEXT NOT NULL,
    "processingStatus" "VideoProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
    "processedUrl" TEXT,
    "thumbnailUrl" TEXT,
    "durationSeconds" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "status" "BusinessVideoVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "rejectionReason" TEXT,
    "resubmissionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_videos_businessId_key" ON "business_videos"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "business_videos_videoFileId_key" ON "business_videos"("videoFileId");

-- CreateIndex
CREATE INDEX "business_videos_status_idx" ON "business_videos"("status");

-- CreateIndex
CREATE INDEX "business_videos_processingStatus_idx" ON "business_videos"("processingStatus");

-- AddForeignKey
ALTER TABLE "business_videos" ADD CONSTRAINT "business_videos_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_videos" ADD CONSTRAINT "business_videos_videoFileId_fkey" FOREIGN KEY ("videoFileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
