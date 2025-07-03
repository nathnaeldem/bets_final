-- Migration to add organization_id column to transactions table
ALTER TABLE `transactions` 
ADD COLUMN `organization_id` INT NOT NULL AFTER `user_id`,
ADD INDEX `organization_id` (`organization_id`);

-- Update existing records with default organization_id (1)
UPDATE `transactions` SET `organization_id` = 1;

-- Add foreign key constraint (optional)
-- ALTER TABLE `transactions`
-- ADD CONSTRAINT `fk_transactions_organization` 
-- FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);
