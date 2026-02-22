-- CreateEnum
CREATE TYPE "RiderRole" AS ENUM ('RIDER', 'TRAINER');

-- AlterTable
ALTER TABLE "Rider" ADD COLUMN     "role" "RiderRole" NOT NULL DEFAULT 'RIDER';
