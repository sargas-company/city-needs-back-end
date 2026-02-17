-- CreateEnum
CREATE TYPE "workflow_execution_status" AS ENUM ('started', 'in_progress', 'failed', 'succeeded');

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "formattedAddress" VARCHAR(255);

-- CreateIndex
CREATE INDEX "business_name_trgm_idx" ON "businesses" USING GIN ("name" gin_trgm_ops);
