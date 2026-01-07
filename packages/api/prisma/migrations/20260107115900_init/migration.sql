-- Initial schema migration for Herdbook.
-- Creates core tables and enums needed by the API.

-- Create enum used by Session.workType
CREATE TYPE "WorkType" AS ENUM (
  'FLATWORK',
  'JUMPING',
  'GROUNDWORK',
  'IN_HAND',
  'TRAIL',
  'OTHER'
);

-- Create Horse table
CREATE TABLE "Horse" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Horse_pkey" PRIMARY KEY ("id")
);

-- Create Rider table
CREATE TABLE "Rider" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "password" TEXT NOT NULL,

  CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Rider_email_key" ON "Rider"("email");

-- Create Session table
CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "horseId" TEXT NOT NULL,
  "riderId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "workType" "WorkType" NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Relations
ALTER TABLE "Session"
ADD CONSTRAINT "Session_horseId_fkey"
FOREIGN KEY ("horseId") REFERENCES "Horse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Session"
ADD CONSTRAINT "Session_riderId_fkey"
FOREIGN KEY ("riderId") REFERENCES "Rider"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

