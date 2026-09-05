ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "due_day" SMALLINT NOT NULL DEFAULT 10;

ALTER TABLE "customers"
  DROP CONSTRAINT IF EXISTS "customers_due_day_range";

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_due_day_range" CHECK ("due_day" BETWEEN 1 AND 31);
