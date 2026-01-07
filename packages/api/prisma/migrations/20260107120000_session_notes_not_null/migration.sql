-- Make Session.notes non-null to match GraphQL (String!)
-- Backfill existing NULL values to empty string before enforcing NOT NULL.

UPDATE "Session"
SET "notes" = ''
WHERE "notes" IS NULL;

ALTER TABLE "Session"
ALTER COLUMN "notes" SET DEFAULT '';

ALTER TABLE "Session"
ALTER COLUMN "notes" SET NOT NULL;

