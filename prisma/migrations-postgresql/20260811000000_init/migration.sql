-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'CS', 'TECHNICIAN', 'STAFF');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'BOTH');

-- CreateEnum
CREATE TYPE "IncomeSource" AS ENUM ('CUSTOMER_PAYMENT', 'MANUAL');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL DEFAULT 0,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(191) NOT NULL,
    "password_hash" VARCHAR(255),
    "google_id" VARCHAR(191),
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL,
    "auth_provider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "address" TEXT NOT NULL,
    "package_name" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_payments" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "payment_month" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(255),
    "received_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incomes" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "customer_payment_id" INTEGER,
    "source" "IncomeSource" NOT NULL DEFAULT 'MANUAL',
    "description" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "income_date" DATE NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_parent_id_idx" ON "users"("parent_id");

-- CreateIndex
CREATE INDEX "users_parent_id_role_idx" ON "users"("parent_id", "role");

-- CreateIndex
CREATE INDEX "customers_owner_id_idx" ON "customers"("owner_id");

-- CreateIndex
CREATE INDEX "customers_owner_id_name_idx" ON "customers"("owner_id", "name");

-- CreateIndex
CREATE INDEX "customer_payments_owner_id_payment_month_idx" ON "customer_payments"("owner_id", "payment_month");

-- CreateIndex
CREATE UNIQUE INDEX "customer_payments_customer_id_payment_month_key" ON "customer_payments"("customer_id", "payment_month");

-- CreateIndex
CREATE UNIQUE INDEX "incomes_customer_payment_id_key" ON "incomes"("customer_payment_id");

-- CreateIndex
CREATE INDEX "incomes_owner_id_income_date_idx" ON "incomes"("owner_id", "income_date");

-- CreateIndex
CREATE INDEX "incomes_owner_id_source_idx" ON "incomes"("owner_id", "source");

-- CreateIndex
CREATE INDEX "expenses_owner_id_expense_date_idx" ON "expenses"("owner_id", "expense_date");

-- AddForeignKey
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_customer_payment_id_fkey" FOREIGN KEY ("customer_payment_id") REFERENCES "customer_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
