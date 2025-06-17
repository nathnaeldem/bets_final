-- phpMyAdmin SQL Dump
-- version 4.9.5
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jun 17, 2025 at 02:35 AM
-- Server version: 10.6.16-MariaDB-cll-lve
-- PHP Version: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `nyvjzrsb_shopmgmt`
--

-- --------------------------------------------------------

--
-- Table structure for table `carwash_transactions`
--

CREATE TABLE `carwash_transactions` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `worker_id` int(11) NOT NULL,
  `worker_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`worker_ids`)),
  `vehicle_id` int(11) NOT NULL,
  `tariff` decimal(10,2) NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `transaction_date` datetime NOT NULL,
  `payment_method` varchar(40) NOT NULL,
  `bank_name` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `car_spendings`
--

CREATE TABLE `car_spendings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `category` enum('purchase','logistics','consumption') NOT NULL,
  `reason` varchar(255) NOT NULL,
  `comment` text DEFAULT NULL,
  `transaction_date` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ip_blocks`
--

CREATE TABLE `ip_blocks` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `organization_id` int(11) DEFAULT NULL,
  `blocked_until` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `login_attempts`
--

CREATE TABLE `login_attempts` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 0,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` mediumtext DEFAULT NULL,
  `organization_id` int(11) DEFAULT NULL,
  `attempt_time` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organizations`
--

CREATE TABLE `organizations` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `owner_user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `paid_commissions`
--

CREATE TABLE `paid_commissions` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `worker_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `paid_commission_transactions`
--

CREATE TABLE `paid_commission_transactions` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `worker_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid_date` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(64) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expiry` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` mediumtext DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `import_price` decimal(10,2) NOT NULL,
  `selling_price` decimal(10,2) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_inventory`
--

CREATE TABLE `product_inventory` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `status` enum('ordered','in_store','sold') NOT NULL DEFAULT 'ordered',
  `status_changed_at` timestamp NULL DEFAULT current_timestamp(),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_transactions`
--

CREATE TABLE `product_transactions` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `previous_status` enum('ordered','in_store','sold','new') NOT NULL,
  `new_status` enum('ordered','in_store','sold') NOT NULL,
  `user_id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `transaction_date` timestamp NULL DEFAULT current_timestamp(),
  `comment` varchar(100) NOT NULL DEFAULT 'none',
  `Sold_Price` int(100) NOT NULL DEFAULT 0,
  `payment_method` enum('cash','credit','account_transfer') NOT NULL,
  `bank_name` varchar(20) NOT NULL,
  `unpaid_amount` int(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `spendings`
--

CREATE TABLE `spendings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `category` enum('purchase','logistics','consumption') NOT NULL,
  `reason` varchar(255) NOT NULL,
  `comment` text DEFAULT NULL,
  `transaction_date` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `organization_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_activity`
--

CREATE TABLE `user_activity` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `organization_id` int(11) DEFAULT NULL,
  `activity_type` varchar(50) NOT NULL,
  `description` mediumtext NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `activity_time` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `tariff` decimal(10,2) NOT NULL,
  `partial_tariff` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workers`
--

CREATE TABLE `workers` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `paid_commission` decimal(10,2) NOT NULL DEFAULT 0.00,
  `unpaid_commission` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `carwash_transactions`
--
ALTER TABLE `carwash_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cwt_organization` (`organization_id`),
  ADD KEY `fk_cwt_user` (`user_id`),
  ADD KEY `fk_cwt_worker` (`worker_id`),
  ADD KEY `fk_cwt_vehicle` (`vehicle_id`);

--
-- Indexes for table `car_spendings`
--
ALTER TABLE `car_spendings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_car_spendings_organization` (`organization_id`);

--
-- Indexes for table `ip_blocks`
--
ALTER TABLE `ip_blocks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ip_address` (`ip_address`);

--
-- Indexes for table `login_attempts`
--
ALTER TABLE `login_attempts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `organizations`
--
ALTER TABLE `organizations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name_UNIQUE` (`name`),
  ADD KEY `owner_user_id` (`owner_user_id`);

--
-- Indexes for table `paid_commissions`
--
ALTER TABLE `paid_commissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pc_organization` (`organization_id`),
  ADD KEY `fk_pc_worker` (`worker_id`);

--
-- Indexes for table `paid_commission_transactions`
--
ALTER TABLE `paid_commission_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`),
  ADD KEY `worker_id` (`worker_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_products_organization` (`organization_id`);

--
-- Indexes for table `product_inventory`
--
ALTER TABLE `product_inventory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `product_transactions`
--
ALTER TABLE `product_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_product_transactions_organization` (`organization_id`);

--
-- Indexes for table `spendings`
--
ALTER TABLE `spendings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_spendings_organization` (`organization_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_users_organization` (`organization_id`);

--
-- Indexes for table `user_activity`
--
ALTER TABLE `user_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_user_activity_organization` (`organization_id`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_vehicles_organization` (`organization_id`);

--
-- Indexes for table `workers`
--
ALTER TABLE `workers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_workers_organization` (`organization_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `carwash_transactions`
--
ALTER TABLE `carwash_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `car_spendings`
--
ALTER TABLE `car_spendings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ip_blocks`
--
ALTER TABLE `ip_blocks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `login_attempts`
--
ALTER TABLE `login_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations`
--
ALTER TABLE `organizations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `paid_commissions`
--
ALTER TABLE `paid_commissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `paid_commission_transactions`
--
ALTER TABLE `paid_commission_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_inventory`
--
ALTER TABLE `product_inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_transactions`
--
ALTER TABLE `product_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `spendings`
--
ALTER TABLE `spendings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_activity`
--
ALTER TABLE `user_activity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `workers`
--
ALTER TABLE `workers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `carwash_transactions`
--
ALTER TABLE `carwash_transactions`
  ADD CONSTRAINT `fk_cwt_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cwt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cwt_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  ADD CONSTRAINT `fk_cwt_worker` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `car_spendings`
--
ALTER TABLE `car_spendings`
  ADD CONSTRAINT `car_spendings_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_car_spendings_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organizations`
--
ALTER TABLE `organizations`
  ADD CONSTRAINT `organizations_ibfk_1` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `paid_commissions`
--
ALTER TABLE `paid_commissions`
  ADD CONSTRAINT `fk_pc_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pc_worker` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `paid_commission_transactions`
--
ALTER TABLE `paid_commission_transactions`
  ADD CONSTRAINT `paid_commission_transactions_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `paid_commission_transactions_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `paid_commission_transactions_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_inventory`
--
ALTER TABLE `product_inventory`
  ADD CONSTRAINT `product_inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_transactions`
--
ALTER TABLE `product_transactions`
  ADD CONSTRAINT `fk_product_transactions_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_transactions_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_transactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `spendings`
--
ALTER TABLE `spendings`
  ADD CONSTRAINT `fk_spendings_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `spendings_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_activity`
--
ALTER TABLE `user_activity`
  ADD CONSTRAINT `fk_user_activity_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `user_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `fk_vehicles_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `workers`
--
ALTER TABLE `workers`
  ADD CONSTRAINT `fk_workers_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
