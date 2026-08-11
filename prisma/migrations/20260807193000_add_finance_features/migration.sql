CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `owner_id` INTEGER NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `address` TEXT NOT NULL,
    `package_name` VARCHAR(120) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customers_owner_id_idx`(`owner_id`),
    INDEX `customers_owner_id_name_idx`(`owner_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

CREATE TABLE `customer_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `owner_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `payment_month` DATE NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `paid_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(255) NULL,
    `received_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `customer_payments_customer_id_payment_month_key`(`customer_id`, `payment_month`),
    INDEX `customer_payments_owner_id_payment_month_idx`(`owner_id`, `payment_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

CREATE TABLE `incomes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `owner_id` INTEGER NOT NULL,
    `customer_payment_id` INTEGER NULL,
    `source` ENUM('CUSTOMER_PAYMENT', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
    `description` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `income_date` DATE NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `incomes_customer_payment_id_key`(`customer_payment_id`),
    INDEX `incomes_owner_id_income_date_idx`(`owner_id`, `income_date`),
    INDEX `incomes_owner_id_source_idx`(`owner_id`, `source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

CREATE TABLE `expenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `owner_id` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `expense_date` DATE NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `expenses_owner_id_expense_date_idx`(`owner_id`, `expense_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

ALTER TABLE `customer_payments`
  ADD CONSTRAINT `customer_payments_customer_id_fkey`
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `incomes`
  ADD CONSTRAINT `incomes_customer_payment_id_fkey`
  FOREIGN KEY (`customer_payment_id`) REFERENCES `customer_payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
