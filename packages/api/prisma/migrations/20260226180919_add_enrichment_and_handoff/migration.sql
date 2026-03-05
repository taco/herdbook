-- AlterTable
ALTER TABLE "Horse" ADD COLUMN     "handoffContent" TEXT,
ADD COLUMN     "handoffGeneratedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "aiMetadata" JSONB;
