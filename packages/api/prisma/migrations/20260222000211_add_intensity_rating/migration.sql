-- CreateEnum
CREATE TYPE "Intensity" AS ENUM ('LIGHT', 'MODERATE', 'HARD', 'VERY_HARD');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "intensity" "Intensity",
ADD COLUMN     "rating" INTEGER;
