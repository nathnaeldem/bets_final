-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jun 03, 2025 at 07:41 PM
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
  `attempt_time` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `login_attempts`
--

INSERT INTO `login_attempts` (`id`, `username`, `success`, `ip_address`, `user_agent`, `attempt_time`) VALUES
(1, 'hello', 1, '102.208.97.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 07:27:50'),
(2, 'hello', 1, '102.208.96.67', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 07:29:25'),
(3, 'hello', 1, '102.208.96.67', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 07:34:09'),
(4, 'hello', 1, '102.208.97.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 07:38:27'),
(5, 'hello', 1, '102.208.97.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 07:38:38'),
(6, 'hello', 1, '102.208.97.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 07:39:09'),
(7, 'hello', 0, '102.208.96.94', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 07:49:06'),
(8, 'hello', 1, '102.208.96.94', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 07:49:17'),
(9, 'hello', 1, '102.208.97.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 07:59:08'),
(10, 'user', 1, '102.208.96.94', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 08:00:54'),
(11, 'hello', 1, '102.208.97.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 08:45:11'),
(12, 'hello', 1, '102.208.96.47', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 08:47:11'),
(13, 'hello', 1, '102.208.96.47', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 08:48:40'),
(14, 'hello', 1, '102.208.97.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 08:58:48'),
(15, 'hello', 1, '102.208.96.47', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 09:00:04'),
(16, 'hello', 1, '102.208.96.126', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 09:40:02'),
(17, 'hello', 1, '102.208.97.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 09:44:23'),
(18, 'hello', 1, '102.208.96.126', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 09:47:07'),
(19, 'hello', 1, '102.208.96.126', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-01 09:51:31'),
(20, 'hello', 1, '102.208.97.169', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 07:03:38'),
(21, 'hello', 0, '102.208.97.169', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 07:37:49'),
(22, 'hello', 1, '102.208.97.169', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 07:38:00'),
(23, 'hello', 1, '102.208.96.245', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 07:45:03'),
(24, 'hello', 1, '102.208.97.169', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 07:47:12'),
(25, 'hello', 1, '102.208.97.169', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 07:48:14'),
(26, 'hello', 1, '102.208.97.169', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 08:24:29'),
(27, 'hello', 1, '102.208.96.245', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 09:17:42'),
(28, 'hello', 1, '102.208.97.76', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 10:08:47'),
(29, 'hello', 0, '102.208.96.40', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 10:17:41'),
(30, 'hello', 1, '102.208.96.40', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 10:17:50'),
(31, 'hello', 1, '102.208.97.59', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 10:48:12'),
(32, 'user', 1, '102.208.96.70', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 13:35:41'),
(33, 'user', 1, '102.208.97.23', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 13:39:13'),
(34, 'user', 1, '102.208.96.70', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 13:40:17'),
(35, 'user', 1, '102.208.96.70', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 13:44:15'),
(36, 'hello', 1, '102.208.97.23', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 13:45:58'),
(37, 'user', 1, '102.208.96.70', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 13:49:34'),
(38, 'user', 1, '102.208.97.23', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 13:54:28'),
(39, 'user', 1, '102.208.96.56', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 14:06:34'),
(40, 'user', 1, '102.208.97.23', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 14:10:20'),
(41, 'user', 1, '102.208.96.36', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 14:11:53'),
(42, 'user', 1, '102.208.96.36', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 14:24:49'),
(43, 'hello', 1, '102.208.97.136', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 19:12:57'),
(44, 'admin', 0, '102.208.96.251', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 19:14:49'),
(45, 'user', 1, '102.208.96.251', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-02 19:15:02'),
(46, 'user', 1, '102.218.51.209', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 05:59:04'),
(47, 'hello', 1, '102.218.51.209', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 06:13:35'),
(48, 'user', 1, '102.218.50.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 06:27:06'),
(49, 'user', 1, '102.218.51.236', 'okhttp/4.12.0', '2025-06-03 06:27:35'),
(50, 'hello', 1, '102.218.50.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 07:32:31'),
(51, 'hello', 1, '102.218.50.162', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 09:35:00'),
(52, 'hello', 1, '102.218.50.162', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 09:59:20'),
(53, 'hello', 1, '102.218.50.162', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 10:17:24'),
(54, 'betse', 1, '197.156.124.107', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 13:26:34'),
(55, 'user', 1, '196.188.254.17', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 14:36:59'),
(56, 'user', 1, '196.188.254.17', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 14:39:18'),
(57, 'betse', 1, '196.188.254.17', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 14:41:58'),
(58, 'betse', 1, '196.188.254.17', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 14:44:58'),
(59, 'user', 1, '196.188.254.17', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 14:47:36'),
(60, 'user', 0, '196.188.254.17', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 14:48:33'),
(61, 'user', 1, '196.188.254.17', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 14:48:42'),
(62, 'betse', 1, '196.188.254.17', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 14:51:07'),
(63, 'betse', 1, '196.188.254.17', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 15:17:02'),
(64, 'betse', 1, '196.188.254.17', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 15:18:30'),
(65, 'betse', 1, '102.213.68.72', 'Expo/1017697 CFNetwork/1333.0.4 Darwin/21.5.0', '2025-06-03 18:29:47');

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
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `description`, `category`, `import_price`, `selling_price`, `created_at`, `updated_at`) VALUES
(5, 'የሲኖ-ጎማ(ቀይ)', 'ጀ', '', 2000.00, 2200.00, '2025-06-02 10:57:44', NULL),
(8, 'ብሪማ', '', '', 3900.00, 4400.00, '2025-06-03 14:47:00', NULL);

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
(5, 5, 45, 'in_store', '2025-06-03 14:40:38', '2025-06-02 10:57:44'),
(8, 8, 7, 'in_store', '2025-06-03 14:48:02', '2025-06-03 14:47:00');

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
  `transaction_date` timestamp NULL DEFAULT current_timestamp(),
  `comment` varchar(100) NOT NULL,
  `Sold_Price` int(100) NOT NULL,
  `payment_method` enum('cash','credit','account_transfer') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_transactions`
--

INSERT INTO `product_transactions` (`id`, `product_id`, `quantity`, `previous_status`, `new_status`, `user_id`, `transaction_date`, `comment`, `Sold_Price`, `payment_method`) VALUES
(14, 5, 50, 'new', 'in_store', 1, '2025-06-02 10:57:44', '', 0, ''),
(23, 5, 5, 'in_store', 'in_store', 3, '2025-06-03 14:40:38', '', 2100, 'credit'),
(24, 8, 10, 'new', 'in_store', 1, '2025-06-03 14:47:00', '', 0, 'cash'),
(25, 8, 3, 'in_store', 'in_store', 3, '2025-06-03 14:48:02', 'Gh', 4400, 'account_transfer');

-- --------------------------------------------------------

--
-- Table structure for table `spendings`
--

CREATE TABLE `spendings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `category` enum('purchase','logistics','consumption') NOT NULL,
  `reason` varchar(255) NOT NULL,
  `comment` text DEFAULT NULL,
  `transaction_date` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `spendings`
--

INSERT INTO `spendings` (`id`, `user_id`, `amount`, `category`, `reason`, `comment`, `transaction_date`) VALUES
(1, 1, 200.00, 'logistics', 'hey', '', '2025-06-03 09:36:55'),
(2, 1, 3000.00, 'purchase', 'balstera', '', '2025-06-03 13:27:14'),
(3, 3, 20000.00, 'purchase', 'balestragzhi', '', '2025-06-03 14:50:04'),
(4, 3, 500.00, 'consumption', 'lunch', '', '2025-06-03 14:50:46');

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
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `is_active`, `created_at`, `last_login`) VALUES
(1, 'betse', 'hhh@ji.cvb', '$2y$10$brbyNiDMfO6s6aY3kL0dWOnCYTrn8rEENMJYjkfm18EOQHl86k01O', 'admin', 1, '2025-05-30 19:27:50', '2025-06-03 18:29:47'),
(2, 'oooo', 'gg@hh.cc', '$2y$10$7bIjHrhOTgwhPEAex3v/zujbcdFGcKvqzXZ46nD36BBYkxn2coyNC', 'user', 1, '2025-05-30 19:30:27', NULL),
(3, 'user', 'nathnaeldem@gm.c', '$2y$10$T5nBIyXIUQNEDpZGHek9u.QKaoL/OC3ESOWHAZedIP8jiO1XQItyK', 'user', 1, '2025-06-01 08:00:41', '2025-06-03 14:48:42');

-- --------------------------------------------------------

--
-- Table structure for table `user_activity`
--

CREATE TABLE `user_activity` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `activity_type` varchar(50) NOT NULL,
  `description` mediumtext NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `activity_time` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_activity`
--

INSERT INTO `user_activity` (`id`, `user_id`, `activity_type`, `description`, `ip_address`, `activity_time`) VALUES
(1, 1, 'registration', 'User registered', '102.213.68.181', '2025-05-30 19:27:50'),
(2, 2, 'registration', 'User registered', '102.213.68.181', '2025-05-30 19:30:27'),
(3, 1, 'login', 'User logged in', '102.208.97.107', '2025-06-01 07:27:50'),
(4, 1, 'login', 'User logged in', '102.208.96.67', '2025-06-01 07:29:25'),
(5, 1, 'login', 'User logged in', '102.208.96.67', '2025-06-01 07:34:09'),
(6, 1, 'login', 'User logged in', '102.208.97.107', '2025-06-01 07:38:27'),
(7, 1, 'login', 'User logged in', '102.208.97.107', '2025-06-01 07:38:38'),
(8, 1, 'login', 'User logged in', '102.208.97.107', '2025-06-01 07:39:09'),
(9, 1, 'login', 'User logged in', '102.208.96.94', '2025-06-01 07:49:17'),
(10, 1, 'login', 'User logged in', '102.208.97.107', '2025-06-01 07:59:08'),
(11, 3, 'registration', 'User registered', '102.208.96.94', '2025-06-01 08:00:41'),
(12, 3, 'login', 'User logged in', '102.208.96.94', '2025-06-01 08:00:54'),
(13, 1, 'login', 'User logged in', '102.208.97.107', '2025-06-01 08:45:11'),
(14, 1, 'login', 'User logged in', '102.208.96.47', '2025-06-01 08:47:11'),
(15, 1, 'login', 'User logged in', '102.208.96.47', '2025-06-01 08:48:40'),
(16, 1, 'login', 'User logged in', '102.208.97.107', '2025-06-01 08:58:48'),
(17, 1, 'login', 'User logged in', '102.208.96.47', '2025-06-01 09:00:04'),
(18, 1, 'login', 'User logged in', '102.208.96.126', '2025-06-01 09:40:02'),
(19, 1, 'login', 'User logged in', '102.208.97.107', '2025-06-01 09:44:23'),
(20, 1, 'login', 'User logged in', '102.208.96.126', '2025-06-01 09:47:07'),
(21, 1, 'login', 'User logged in', '102.208.96.126', '2025-06-01 09:51:32'),
(22, 1, 'login', 'User logged in', '102.208.97.169', '2025-06-02 07:03:38'),
(23, 1, 'login', 'User logged in', '102.208.97.169', '2025-06-02 07:38:00'),
(24, 1, 'login', 'User logged in', '102.208.96.245', '2025-06-02 07:45:03'),
(25, 1, 'login', 'User logged in', '102.208.97.169', '2025-06-02 07:47:12'),
(26, 1, 'login', 'User logged in', '102.208.97.169', '2025-06-02 07:48:14'),
(27, 1, 'login', 'User logged in', '102.208.97.169', '2025-06-02 08:24:29'),
(28, 1, 'login', 'User logged in', '102.208.96.245', '2025-06-02 09:17:42'),
(29, 1, 'login', 'User logged in', '102.208.97.76', '2025-06-02 10:08:47'),
(30, 1, 'login', 'User logged in', '102.208.96.40', '2025-06-02 10:17:50'),
(31, 1, 'login', 'User logged in', '102.208.97.59', '2025-06-02 10:48:12'),
(32, 3, 'login', 'User logged in', '102.208.96.70', '2025-06-02 13:35:41'),
(33, 3, 'login', 'User logged in', '102.208.97.23', '2025-06-02 13:39:13'),
(34, 3, 'login', 'User logged in', '102.208.96.70', '2025-06-02 13:40:17'),
(35, 3, 'login', 'User logged in', '102.208.96.70', '2025-06-02 13:44:16'),
(36, 3, 'product_sale', 'Sold 20 units of product 4', '102.208.97.23', '2025-06-02 13:45:29'),
(37, 1, 'login', 'User logged in', '102.208.97.23', '2025-06-02 13:45:58'),
(38, 3, 'login', 'User logged in', '102.208.96.70', '2025-06-02 13:49:34'),
(39, 3, 'login', 'User logged in', '102.208.97.23', '2025-06-02 13:54:28'),
(40, 3, 'product_sale', 'Sold 5 units of product 4', '102.208.97.23', '2025-06-02 13:54:45'),
(41, 3, 'login', 'User logged in', '102.208.96.56', '2025-06-02 14:06:34'),
(42, 3, 'login', 'User logged in', '102.208.97.23', '2025-06-02 14:10:20'),
(43, 3, 'login', 'User logged in', '102.208.96.36', '2025-06-02 14:11:53'),
(44, 3, 'login', 'User logged in', '102.208.96.36', '2025-06-02 14:24:49'),
(45, 3, 'product_sale', 'Sold 3 units of product 4', '102.208.96.36', '2025-06-02 14:25:15'),
(46, 3, 'product_sale', 'Sold 2 units of product 4', '102.208.97.136', '2025-06-02 19:12:27'),
(47, 1, 'login', 'User logged in', '102.208.97.136', '2025-06-02 19:12:57'),
(48, 1, 'product_sale', 'Sold 5 units of product 4', '102.208.96.251', '2025-06-02 19:14:17'),
(49, 1, 'product_sale', 'Sold 3 units of product 4', '102.208.96.251', '2025-06-02 19:14:35'),
(50, 3, 'login', 'User logged in', '102.208.96.251', '2025-06-02 19:15:02'),
(51, 3, 'login', 'User logged in', '102.218.51.209', '2025-06-03 05:59:04'),
(52, 1, 'login', 'User logged in', '102.218.51.209', '2025-06-03 06:13:35'),
(53, 3, 'login', 'User logged in', '102.218.50.107', '2025-06-03 06:27:06'),
(54, 3, 'login', 'User logged in', '102.218.51.236', '2025-06-03 06:27:35'),
(55, 1, 'login', 'User logged in', '102.218.50.107', '2025-06-03 07:32:31'),
(56, 1, 'login', 'User logged in', '102.218.50.162', '2025-06-03 09:35:00'),
(57, 1, 'spending_record', 'Recorded logistics spending of 200', '102.218.50.162', '2025-06-03 09:36:55'),
(58, 1, 'login', 'User logged in', '102.218.50.162', '2025-06-03 09:59:20'),
(59, 1, 'login', 'User logged in', '102.218.50.162', '2025-06-03 10:17:24'),
(60, 1, 'login', 'User logged in', '197.156.124.107', '2025-06-03 13:26:34'),
(61, 1, 'spending_record', 'Recorded purchase spending of 3000', '197.156.124.107', '2025-06-03 13:27:14'),
(62, 3, 'login', 'User logged in', '196.188.254.17', '2025-06-03 14:36:59'),
(63, 3, 'login', 'User logged in', '196.188.254.17', '2025-06-03 14:39:18'),
(64, 3, 'product_sale', 'Sold 5 units of product 5', '196.188.254.17', '2025-06-03 14:40:38'),
(65, 1, 'login', 'User logged in', '196.188.254.17', '2025-06-03 14:41:58'),
(66, 1, 'login', 'User logged in', '196.188.254.17', '2025-06-03 14:44:58'),
(67, 3, 'login', 'User logged in', '196.188.254.17', '2025-06-03 14:47:36'),
(68, 3, 'product_sale', 'Sold 3 units of product 8', '196.188.254.17', '2025-06-03 14:48:02'),
(69, 3, 'login', 'User logged in', '196.188.254.17', '2025-06-03 14:48:42'),
(70, 3, 'spending_record', 'Recorded purchase spending of 20000', '196.188.254.17', '2025-06-03 14:50:04'),
(71, 3, 'spending_record', 'Recorded consumption spending of 500', '196.188.254.17', '2025-06-03 14:50:46'),
(72, 1, 'login', 'User logged in', '196.188.254.17', '2025-06-03 14:51:07'),
(73, 1, 'login', 'User logged in', '196.188.254.17', '2025-06-03 15:17:02'),
(74, 1, 'login', 'User logged in', '196.188.254.17', '2025-06-03 15:18:30'),
(75, 1, 'login', 'User logged in', '102.213.68.72', '2025-06-03 18:29:47');

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
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

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
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `spendings`
--
ALTER TABLE `spendings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_activity`
--
ALTER TABLE `user_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `product_inventory`
--
ALTER TABLE `product_inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `product_transactions`
--
ALTER TABLE `product_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `spendings`
--
ALTER TABLE `spendings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user_activity`
--
ALTER TABLE `user_activity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_inventory`
--
ALTER TABLE `product_inventory`
  ADD CONSTRAINT `product_inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_transactions`
--
ALTER TABLE `product_transactions`
  ADD CONSTRAINT `product_transactions_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_transactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `spendings`
--
ALTER TABLE `spendings`
  ADD CONSTRAINT `spendings_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_activity`
--
ALTER TABLE `user_activity`
  ADD CONSTRAINT `user_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
