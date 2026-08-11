CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parent_id` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `google_id` VARCHAR(191) NULL,
    `avatar_url` TEXT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'CS', 'TECHNICIAN', 'STAFF') NOT NULL,
    `auth_provider` ENUM('EMAIL', 'GOOGLE', 'BOTH') NOT NULL DEFAULT 'EMAIL',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_google_id_key`(`google_id`),
    INDEX `users_parent_id_idx`(`parent_id`),
    INDEX `users_parent_id_role_idx`(`parent_id`, `role`),
    CONSTRAINT `users_owner_parent_check` CHECK (
      (`role` = 'OWNER' AND `parent_id` = 0)
      OR (`role` <> 'OWNER' AND `parent_id` > 0)
    ),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;
