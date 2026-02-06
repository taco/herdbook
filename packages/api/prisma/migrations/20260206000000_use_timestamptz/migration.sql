-- AlterTable: Convert all TIMESTAMP(3) columns to TIMESTAMPTZ(3)
-- This is a metadata-only change in PostgreSQL; existing values are
-- reinterpreted as UTC (which is what Prisma already sends).
ALTER TABLE "Horse" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);
ALTER TABLE "Horse" ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

ALTER TABLE "Rider" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

ALTER TABLE "Session" ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3);
ALTER TABLE "Session" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);
ALTER TABLE "Session" ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);
