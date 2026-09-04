ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "amount" DECIMAL(15, 2);

UPDATE "customers" AS customer
SET "amount" = COALESCE(latest_payment."amount", 0)
FROM (
  SELECT DISTINCT ON ("customer_id")
    "customer_id",
    "amount"
  FROM "customer_payments"
  ORDER BY "customer_id", "payment_month" DESC, "paid_at" DESC
) AS latest_payment
WHERE customer."id" = latest_payment."customer_id"
  AND customer."amount" IS NULL;

UPDATE "customers"
SET "amount" = 0
WHERE "amount" IS NULL;

ALTER TABLE "customers"
  ALTER COLUMN "amount" SET NOT NULL;

ALTER TABLE "customers"
  DROP CONSTRAINT IF EXISTS "customers_amount_non_negative";

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_amount_non_negative" CHECK ("amount" >= 0);
