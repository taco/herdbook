-- CreateTable
CREATE TABLE "Barn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Barn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Barn_inviteCode_key" ON "Barn"("inviteCode");

-- Insert default barn and backfill all existing rows in one step via CTE
-- Prisma uses cuid (no hyphens), so strip hyphens from the UUID
ALTER TABLE "Horse" ADD COLUMN "barnId" TEXT;
ALTER TABLE "Rider" ADD COLUMN "barnId" TEXT;

WITH default_barn AS (
  INSERT INTO "Barn" ("id", "name", "inviteCode")
  VALUES (replace(gen_random_uuid()::text, '-', ''), 'Field Hunter Farm', upper(substr(md5(random()::text), 1, 8)))
  RETURNING "id"
),
backfill_horses AS (
  UPDATE "Horse" SET "barnId" = (SELECT "id" FROM default_barn) WHERE "barnId" IS NULL
)
UPDATE "Rider" SET "barnId" = (SELECT "id" FROM default_barn) WHERE "barnId" IS NULL;

-- Make barnId non-nullable
ALTER TABLE "Horse" ALTER COLUMN "barnId" SET NOT NULL;
ALTER TABLE "Rider" ALTER COLUMN "barnId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Horse" ADD CONSTRAINT "Horse_barnId_fkey" FOREIGN KEY ("barnId") REFERENCES "Barn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_barnId_fkey" FOREIGN KEY ("barnId") REFERENCES "Barn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index barnId for RLS policy performance (avoids seq scan on every query)
CREATE INDEX "Horse_barnId_idx" ON "Horse"("barnId");
CREATE INDEX "Rider_barnId_idx" ON "Rider"("barnId");

-- Enable Row-Level Security
ALTER TABLE "Horse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;

-- RLS policies: filter by app.current_barn_id session variable
-- The second arg `true` makes current_setting return NULL instead of erroring
-- when the variable is not set. Owner role bypasses RLS by default.
CREATE POLICY barn_isolation ON "Horse"
  USING ("barnId" = current_setting('app.current_barn_id', true));

CREATE POLICY barn_isolation ON "Rider"
  USING ("barnId" = current_setting('app.current_barn_id', true));

CREATE POLICY barn_isolation ON "Session"
  USING ("riderId" IN (
    SELECT id FROM "Rider"
    WHERE "barnId" = current_setting('app.current_barn_id', true)
  ));
