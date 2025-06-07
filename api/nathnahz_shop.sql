-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jun 06, 2025 at 09:03 AM
-- Server version: 10.11.10-MariaDB-cll-lve
-- PHP Version: 8.1.31

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `nathnahz_shop`
--

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

--
-- Dumping data for table `login_attempts`
--

INSERT INTO `login_attempts` (`id`, `username`, `success`, `ip_address`, `user_agent`, `organization_id`, `attempt_time`) VALUES
(120, 'betse', 1, '102.208.96.103', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', 1, '2025-06-05 19:37:29'),
(121, 'betse', 1, '102.208.96.103', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', 1, '2025-06-05 19:39:51'),
(122, 'betse', 1, '102.208.97.62', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', 1, '2025-06-05 19:42:26'),
(123, 'mihretu', 1, '102.208.97.62', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', 2, '2025-06-05 19:45:16'),
(124, 'mihretu', 1, '102.208.97.62', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', 2, '2025-06-05 19:46:32'),
(125, 'betse', 1, '102.208.97.62', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', 1, '2025-06-05 19:53:12'),
(126, 'betse', 1, '102.208.97.33', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', 1, '2025-06-05 20:07:41'),
(127, 'mihretu', 0, '102.208.96.103', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', NULL, '2025-06-05 20:35:20'),
(128, 'mihretu', 1, '102.208.96.103', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', 2, '2025-06-05 20:35:34'),
(129, 'betse', 1, '102.213.69.206', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', 1, '2025-06-06 06:47:37'),
(130, 'mihretu', 1, '102.213.69.206', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', 2, '2025-06-06 07:46:07');

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

--
-- Dumping data for table `organizations`
--

INSERT INTO `organizations` (`id`, `name`, `created_at`, `owner_user_id`) VALUES
(1, 'Betse Spare Parts', '2025-06-05 19:32:15', 4),
(2, 'sol imports', '2025-06-05 19:44:46', 5);

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

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `description`, `category`, `import_price`, `selling_price`, `organization_id`, `created_at`, `updated_at`) VALUES
(9, 'Sino ባልስተራ', 'ባልስተራ', '', 100.00, 200.00, 1, '2025-06-05 19:43:24', NULL),
(10, 'balstera', 'Sol imports', '', 200.00, 300.00, 2, '2025-06-05 19:45:42', NULL),
(11, 'Goma', 'የባጃጅ', '', 3800.00, 4500.00, 1, '2025-06-05 20:08:34', NULL),
(12, 'Goma bajaj', 'የባጃጅ', '', 3800.00, 4500.00, 1, '2025-06-05 20:18:07', NULL);

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

--
-- Dumping data for table `product_inventory`
--

INSERT INTO `product_inventory` (`id`, `product_id`, `quantity`, `status`, `status_changed_at`, `created_at`) VALUES
(9, 9, 12, 'in_store', '2025-06-06 07:23:37', '2025-06-05 19:43:24'),
(10, 10, 4, 'in_store', '2025-06-06 07:59:59', '2025-06-05 19:45:42'),
(11, 11, 32, 'in_store', '2025-06-05 20:08:34', '2025-06-05 20:08:34'),
(12, 12, 32, 'in_store', '2025-06-05 20:18:07', '2025-06-05 20:18:07');

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
  `comment` varchar(100) NOT NULL,
  `Sold_Price` int(100) NOT NULL,
  `payment_method` enum('cash','credit','account_transfer') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_transactions`
--

INSERT INTO `product_transactions` (`id`, `product_id`, `quantity`, `previous_status`, `new_status`, `user_id`, `organization_id`, `transaction_date`, `comment`, `Sold_Price`, `payment_method`) VALUES
(34, 9, 20, 'new', 'in_store', 4, 1, '2025-06-05 19:43:24', '', 0, 'cash'),
(35, 10, 20, 'new', 'in_store', 5, 2, '2025-06-05 19:45:42', '', 0, 'cash'),
(36, 11, 32, 'new', 'in_store', 4, 1, '2025-06-05 20:08:34', '', 0, 'cash'),
(37, 12, 32, 'new', 'in_store', 4, 1, '2025-06-05 20:18:07', '', 0, 'cash'),
(38, 9, 5, 'in_store', 'in_store', 4, 1, '2025-06-06 07:21:01', '', 200, 'credit'),
(39, 9, 3, 'in_store', 'in_store', 4, 1, '2025-06-06 07:23:37', '', 200, 'account_transfer'),
(40, 10, 10, 'in_store', 'in_store', 5, 2, '2025-06-06 07:46:49', '', 300, 'credit'),
(41, 10, 2, 'in_store', 'in_store', 5, 2, '2025-06-06 07:59:51', '', 300, 'account_transfer'),
(42, 10, 4, 'in_store', 'in_store', 5, 2, '2025-06-06 07:59:59', '', 300, 'cash');

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

--
-- Dumping data for table `spendings`
--

INSERT INTO `spendings` (`id`, `user_id`, `organization_id`, `amount`, `category`, `reason`, `comment`, `transaction_date`) VALUES
(8, 5, 2, 200.00, 'logistics', 'nothing', 'Nuba', '2025-06-05 19:46:14'),
(9, 4, 1, 300.00, 'purchase', '50 balstera', '', '2025-06-06 07:21:24');

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

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `is_active`, `organization_id`, `created_at`, `last_login`) VALUES
(4, 'betse', 'nathnaeldem@gmail.com', '$2y$10$f/21BHsRSmF5sReeMvWkuuR7b25qPOMmFurBYfRUvUec.4OHb/5ue', 'admin', 1, 1, '2025-06-05 19:32:15', '2025-06-06 06:47:37'),
(5, 'mihretu', 'nathnaeldem@yahoo.com', '$2y$10$mkj.acZdvzqZF1kOhp87YeY7o1m.QY2bTN/Nv.8qpEgd7nHdqQZTK', 'admin', 1, 2, '2025-06-05 19:44:46', '2025-06-06 07:46:07');

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

--
-- Dumping data for table `user_activity`
--

INSERT INTO `user_activity` (`id`, `user_id`, `organization_id`, `activity_type`, `description`, `ip_address`, `activity_time`) VALUES
(131, 4, 1, 'registration', 'User registered and created organization \'Betse Spare Parts\'', '102.208.96.177', '2025-06-05 19:32:15'),
(132, 4, 1, 'login', 'User logged in', '102.208.96.103', '2025-06-05 19:37:29'),
(133, 4, 1, 'login', 'User logged in', '102.208.96.103', '2025-06-05 19:39:51'),
(134, 4, 1, 'login', 'User logged in', '102.208.97.62', '2025-06-05 19:42:26'),
(135, 4, 1, 'product_add', 'Added product \'Sino ባልስተራ\' (ID: 9)', '102.208.96.103', '2025-06-05 19:43:24'),
(136, 5, 2, 'registration', 'User registered and created organization \'sol imports\'', '102.208.96.177', '2025-06-05 19:44:46'),
(137, 5, 2, 'login', 'User logged in', '102.208.97.62', '2025-06-05 19:45:16'),
(138, 5, 2, 'product_add', 'Added product \'balstera\' (ID: 10)', '102.208.97.62', '2025-06-05 19:45:42'),
(139, 5, 2, 'spending_record', 'Recorded logistics spending of 200', '102.208.97.62', '2025-06-05 19:46:14'),
(140, 5, 2, 'login', 'User logged in', '102.208.97.62', '2025-06-05 19:46:32'),
(141, 4, 1, 'login', 'User logged in', '102.208.97.62', '2025-06-05 19:53:12'),
(142, 4, 1, 'login', 'User logged in', '102.208.97.33', '2025-06-05 20:07:41'),
(143, 4, 1, 'product_add', 'Added product \'Goma\' (ID: 11)', '102.208.97.33', '2025-06-05 20:08:34'),
(144, 4, 1, 'product_add', 'Added product \'Goma bajaj\' (ID: 12)', '102.208.97.33', '2025-06-05 20:18:07'),
(145, 5, 2, 'login', 'User logged in', '102.208.96.103', '2025-06-05 20:35:34'),
(146, 4, 1, 'login', 'User logged in', '102.213.69.206', '2025-06-06 06:47:37'),
(147, 4, 1, 'product_sale', 'Sold 5 units of product 9', '102.213.69.206', '2025-06-06 07:21:01'),
(148, 4, 1, 'spending_record', 'Recorded purchase spending of 300', '102.213.69.206', '2025-06-06 07:21:24'),
(149, 4, 1, 'product_sale', 'Sold 3 units of product 9', '102.213.69.206', '2025-06-06 07:23:37'),
(150, 5, 2, 'login', 'User logged in', '102.213.69.206', '2025-06-06 07:46:07'),
(151, 5, 2, 'product_sale', 'Sold 10 units of product 10', '102.213.69.206', '2025-06-06 07:46:49'),
(152, 5, 2, 'product_sale', 'Sold 2 units of product 10', '102.213.69.206', '2025-06-06 07:59:51'),
(153, 5, 2, 'product_sale', 'Sold 4 units of product 10', '102.213.69.206', '2025-06-06 07:59:59');

--
-- Indexes for dumped tables
--

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
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ip_blocks`
--
ALTER TABLE `ip_blocks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `login_attempts`
--
ALTER TABLE `login_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=131;

--
-- AUTO_INCREMENT for table `organizations`
--
ALTER TABLE `organizations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `product_inventory`
--
ALTER TABLE `product_inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `product_transactions`
--
ALTER TABLE `product_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `spendings`
--
ALTER TABLE `spendings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `user_activity`
--
ALTER TABLE `user_activity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=154;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `organizations`
--
ALTER TABLE `organizations`
  ADD CONSTRAINT `organizations_ibfk_1` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
