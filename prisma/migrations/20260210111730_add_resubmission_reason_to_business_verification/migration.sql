-- AlterEnum
ALTER TYPE "BusinessVerificationStatus" ADD VALUE 'RESUBMISSION';

-- DropIndex
DROP INDEX "business_name_trgm_idx";

-- AlterTable
ALTER TABLE "business_verifications" ADD COLUMN     "resubmissionReason" TEXT;
