<?php 
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require 'vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secretKey = 'your_strong_secret_key_here'; // CHANGE THIS
$algorithm = 'HS256';

$dbHost = 'localhost';
$dbName = 'nathnahz_shop';
$dbUser = 'nathnahz_shop';
$dbPass = 'pass';

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Database connection failed']);
    exit;
}

function getClientIp() {
    $ip = '';
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
}

function getUserAgent() {
    return $_SERVER['HTTP_USER_AGENT'] ?? '';
}

function recordActivity($pdo, $userId, $activityType, $description) {
    $ip = getClientIp();
    $stmt = $pdo->prepare("INSERT INTO user_activity (user_id, activity_type, description, ip_address) 
                           VALUES (:user_id, :activity_type, :description, :ip_address)");
    $stmt->execute([
        ':user_id' => $userId,
        ':activity_type' => $activityType,
        ':description' => $description,
        ':ip_address' => $ip
    ]);
}

function recordLoginAttempt($pdo, $username, $success) {
    $ip = getClientIp();
    $userAgent = getUserAgent();
    
    $stmt = $pdo->prepare("INSERT INTO login_attempts (username, success, ip_address, user_agent) 
                           VALUES (:username, :success, :ip_address, :user_agent)");
    $stmt->execute([
        ':username' => $username,
        ':success' => $success,
        ':ip_address' => $ip,
        ':user_agent' => $userAgent
    ]);
}

// Main API Handler
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? '';

// Initialize user variable
$user = null;

// Check for protected routes that require authentication
if (in_array($action, ['addProduct', 'updateProduct', 'updateProductStatus', 'getProducts', 'getProductDetails', 'sellProduct'])) {
    // Get token from Authorization header
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = null;

    // Extract the token
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
    }

    if (!$token) {
        http_response_code(401);
        echo json_encode(['message' => 'No token provided']);
        exit;
    }

    try {
        // Decode the token
        $decoded = JWT::decode($token, new Key($secretKey, $algorithm));

        // Get user from database to ensure they still exist and have proper permissions
        $stmt = $pdo->prepare("SELECT id, username, role, is_active FROM users WHERE id = :id");
        $stmt->execute([':id' => $decoded->sub]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !$user['is_active']) {
            http_response_code(401);
            echo json_encode(['message' => 'Invalid or inactive user']);
            exit;
        }
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['message' => 'Invalid token: ' . $e->getMessage()]);
        exit;
    }
}

try {
    switch ($action) {
        case 'login':
            // Validate input
            if (empty($input['username']) || empty($input['password'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Username and password are required']);
                exit;
            }
            
            $username = trim($input['username']);
            $password = $input['password'];
            
            // Fetch user
            $stmt = $pdo->prepare("SELECT id, username, password, role, is_active FROM users WHERE username = :username");
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user || !password_verify($password, $user['password'])) {
                recordLoginAttempt($pdo, $username, 0);
                http_response_code(401);
                echo json_encode(['message' => 'Invalid username or password']);
                exit;
            }
            
            if (!$user['is_active']) {
                recordLoginAttempt($pdo, $username, 0);
                http_response_code(403);
                echo json_encode(['message' => 'Account is deactivated']);
                exit;
            }
            
            // Generate JWT token
            $payload = [
                'sub' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'iat' => time(),
                'exp' => time() + (60 * 60 * 24 * 7) // 1 week expiration
            ];
            
            $token = JWT::encode($payload, $secretKey, $algorithm);
            
            // Record activities
            recordLoginAttempt($pdo, $username, 1);
            recordActivity($pdo, $user['id'], 'login', 'User logged in');
            
            // Update last login
            $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
            $stmt->execute([':id' => $user['id']]);
            
            // Return response
            http_response_code(200);
            echo json_encode([
                'message' => 'Login successful',
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role']
                ],
                'token' => $token
            ]);
            break;
            
        case 'register':
            // Validate input
            $required = ['username', 'email', 'password'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['message' => "$field is required"]);
                    exit;
                }
            }
            
            $username = trim($input['username']);
            $email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
            $password = $input['password'];
            
            // Validate email
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid email format']);
                exit;
            }
            
            // Check existing user
            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :username OR email = :email");
            $stmt->execute([':username' => $username, ':email' => $email]);
            $existing = $stmt->fetch();
            
            if ($existing) {
                http_response_code(409);
                echo json_encode(['message' => 'Username or email already exists']);
                exit;
            }
            
            // Create user
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            
            $stmt = $pdo->prepare("INSERT INTO users (username, email, password, transaction_date) 
                                   VALUES (:username, :email, :password, NOW())");
            $stmt->execute([
                ':username' => $username,
                ':email' => $email,
                ':password' => $hashedPassword
            ]);
            
            $userId = $pdo->lastInsertId();
            recordActivity($pdo, $userId, 'registration', 'User registered');
            
            http_response_code(201);
            echo json_encode(['message' => 'User registered successfully']);
            break;
            
        case 'reset':
            // Validate input
            if (empty($input['email'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Email is required']);
                exit;
            }
            
            $email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
            
            // Find user
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
            $stmt->execute([':email' => $email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                // Generate reset token
                $token = bin2hex(random_bytes(32));
                $tokenHash = hash('sha256', $token);
                $expiry = date('Y-m-d H:i:s', time() + 3600); // 1 hour expiration
                
                // Store token
                $stmt = $pdo->prepare("INSERT INTO password_reset_tokens (user_id, token_hash, expiry) 
                                       VALUES (:user_id, :token_hash, :expiry)");
                $stmt->execute([
                    ':user_id' => $user['id'],
                    ':token_hash' => $tokenHash,
                    ':expiry' => $expiry
                ]);
                
                recordActivity($pdo, $user['id'], 'password_reset_request', 'Password reset requested');
                
                // In production: Send email with reset link
                // mail($email, "Password Reset", "Use this token: $token");
            }
            
            // Always return success
            http_response_code(200);
            echo json_encode(['message' => 'If the email exists, a reset link has been sent']);
            break;

        case 'add_spending':
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['user_id'], $data['amount'], $data['category'], $data['reason'])) {
                echo json_encode(['success' => false, 'message' => 'Missing required fields']);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO spendings (user_id, amount, category, reason, comment) 
                                  VALUES (:user_id, :amount, :category, :reason, :comment)");

            try {
                $result = $stmt->execute([
                    ':user_id' => $data['user_id'],
                    ':amount' => $data['amount'],
                    ':category' => $data['category'],
                    ':reason' => $data['reason'],
                    ':comment' => $data['comment'] ?? null
                ]);

                if ($result) {
                    recordActivity($pdo, $data['user_id'], 'spending_record', 
                                 "Recorded {$data['category']} spending of {$data['amount']}");
                    echo json_encode(['success' => true, 'message' => 'Spending recorded successfully']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to record spending']);
                }
            } catch (PDOException $e) {
                echo json_encode(['success' => false, 'message' => 'Database error']);
            }
            break;
            
        // Product management endpoints
        case 'addProduct':
            // Validate admin role
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['message' => 'Unauthorized access']);
                exit;
            }
            
            // Validate input
            $required = ['name', 'import_price', 'selling_price', 'quantity', 'status'];
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['message' => "$field is required"]);
                    exit;
                }
            }
            
            // Add product
            $stmt = $pdo->prepare("INSERT INTO products (name, description, category, import_price, selling_price) 
                                   VALUES (:name, :description, :category, :import_price, :selling_price)");
            $stmt->execute([
                ':name' => $input['name'],
                ':description' => $input['description'] ?? '',
                ':category' => $input['category'] ?? '',
                ':import_price' => $input['import_price'],
                ':selling_price' => $input['selling_price']
            ]);
            
            $productId = $pdo->lastInsertId();
            
            // Add inventory entry
            $stmt = $pdo->prepare("INSERT INTO product_inventory (product_id, quantity, status) 
                                   VALUES (:product_id, :quantity, :status)");
            $stmt->execute([
                ':product_id' => $productId,
                ':quantity' => $input['quantity'],
                ':status' => $input['status']
            ]);
            
            // Record transaction
            $stmt = $pdo->prepare("INSERT INTO product_transactions (product_id, quantity, previous_status, new_status, user_id) 
                                   VALUES (:product_id, :quantity, 'new', :status, :user_id)");
            $stmt->execute([
                ':product_id' => $productId,
                ':quantity' => $input['quantity'],
                ':status' => $input['status'],
                ':user_id' => $user['id']
            ]);
            
            http_response_code(201);
            echo json_encode(['message' => 'Product added successfully', 'product_id' => $productId]);
            break;

        case 'updateProduct':
            // Ensure only admins can update products
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['message' => 'Unauthorized access']);
                exit;
            }

            // Check required fields
            $required = ['product_id', 'name', 'import_price', 'selling_price', 'quantity', 'status'];
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['message' => "$field is required"]);
                    exit;
                }
            }

            try {
                // Update product details
                $stmt = $pdo->prepare("UPDATE products SET 
                  name = :name,
                  description = :description,
                  import_price = :import_price,
                  selling_price = :selling_price
                  WHERE id = :product_id");
                
                $stmt->execute([
                  ':name' => $input['name'],
                  ':description' => $input['description'] ?? '',
                  ':import_price' => $input['import_price'],
                  ':selling_price' => $input['selling_price'],
                  ':product_id' => $input['product_id']
                ]);

                // Update inventory
                $stmt = $pdo->prepare("UPDATE product_inventory SET 
                  quantity = :quantity,
                  status = :status
                  WHERE product_id = :product_id");
                
                $stmt->execute([
                  ':quantity' => $input['quantity'],
                  ':status' => $input['status'],
                  ':product_id' => $input['product_id']
                ]);

                echo json_encode(['success' => true, 'message' => 'Product updated']);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['message' => 'Update failed: ' . $e->getMessage()]);
            }
            break;
    
        case 'updateProductStatus':
            // Validate admin role
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['message' => 'Unauthorized access']);
                exit;
            }
            
            // Validate input
            if (!isset($input['product_id']) || !isset($input['new_status']) || !isset($input['quantity'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Product ID, new status and quantity are required']);
                exit;
            }
            
            // Get current status
            $stmt = $pdo->prepare("SELECT status FROM product_inventory WHERE product_id = :product_id");
            $stmt->execute([':product_id' => $input['product_id']]);
            $currentStatus = $stmt->fetchColumn();
            
            if (!$currentStatus) {
                http_response_code(404);
                echo json_encode(['message' => 'Product not found']);
                exit;
            }
            
            // Update status
            $stmt = $pdo->prepare("UPDATE product_inventory SET status = :status, quantity = :quantity, status_changed_at = NOW() 
                                   WHERE product_id = :product_id");
            $stmt->execute([
                ':status' => $input['new_status'],
                ':quantity' => $input['quantity'],
                ':product_id' => $input['product_id']
            ]);
            
            // Record transaction
            $stmt = $pdo->prepare("INSERT INTO product_transactions (product_id, quantity, previous_status, new_status, user_id) 
                                   VALUES (:product_id, :quantity, :previous_status, :new_status, :user_id)");
            $stmt->execute([
                ':product_id' => $input['product_id'],
                ':quantity' => $input['quantity'],
                ':previous_status' => $currentStatus,
                ':new_status' => $input['new_status'],
                ':user_id' => $user['id']
            ]);
            
            http_response_code(200);
            echo json_encode(['message' => 'Product status updated successfully']);
            break;
    
        case 'getProducts':
            // Get all products with their inventory status
            $stmt = $pdo->prepare("SELECT p.*, pi.quantity, pi.status 
                                   FROM products p 
                                   JOIN product_inventory pi ON p.id = pi.product_id");
            $stmt->execute();
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            http_response_code(200);
            echo json_encode(['products' => $products]);
            break;

        case 'getProductDetails':
            // Validate product_id
            if (!isset($_GET['productId'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Product ID is required']);
                exit;
            }
            $productId = $_GET['productId'];

            // Fetch product details along with inventory status
            $stmt = $pdo->prepare("SELECT p.*, pi.quantity, pi.status 
                                   FROM products p 
                                   JOIN product_inventory pi ON p.id = pi.product_id 
                                   WHERE p.id = :product_id");
            $stmt->execute([':product_id' => $productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($product) {
                http_response_code(200);
                echo json_encode(['product' => $product]);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Product not found']);
            }
            break;
    
        case 'sellProduct':
            // Validate input (including payment method)
            $required = ['product_id', 'quantity_sold', 'sold_price', 'payment_method'];
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['message' => "$field is required"]);
                    exit;
                }
            }

            // Validate payment method
            $validMethods = ['cash', 'credit', 'account_transfer'];
            if (!in_array($input['payment_method'], $validMethods)) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid payment method']);
                exit;
            }
            
            // Get current inventory
            $stmt = $pdo->prepare("SELECT quantity, status FROM product_inventory WHERE product_id = :product_id");
            $stmt->execute([':product_id' => $input['product_id']]);
            $inventory = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$inventory) {
                http_response_code(404);
                echo json_encode(['message' => 'Product not found']);
                exit;
            }
            
            if ($inventory['status'] !== 'in_store') {
                http_response_code(400);
                echo json_encode(['message' => 'Product is not available for sale']);
                exit;
            }
            
            if ($inventory['quantity'] < $input['quantity_sold']) {
                http_response_code(400);
                echo json_encode(['message' => 'Insufficient quantity in stock']);
                exit;
            }
            
            // Calculate new quantity
            $newQuantity = $inventory['quantity'] - $input['quantity_sold'];
            $newStatus = $newQuantity > 0 ? 'in_store' : 'sold';
            
            // Update inventory
            $stmt = $pdo->prepare("UPDATE product_inventory SET quantity = :quantity, status = :status, status_changed_at = NOW() WHERE product_id = :product_id");
            $stmt->execute([
                ':quantity' => $newQuantity,
                ':status' => $newStatus,
                ':product_id' => $input['product_id']
            ]);
            
            // Record transaction (including payment method)
            $stmt = $pdo->prepare("
                INSERT INTO product_transactions 
                  (product_id, quantity, previous_status, new_status, user_id, comment, Sold_Price, payment_method) 
                VALUES 
                  (:product_id, :quantity, :previous_status, :new_status, :user_id, :comment, :sold_price, :payment_method)
            ");
            $stmt->execute([
                ':product_id'     => $input['product_id'],
                ':quantity'       => $input['quantity_sold'],
                ':previous_status'=> 'in_store',
                ':new_status'     => $newStatus,
                ':user_id'        => $user['id'],
                ':comment'        => $input['comment'] ?? '',
                ':sold_price'     => $input['sold_price'],
                ':payment_method' => $input['payment_method']
            ]);
            
            // Record activity
            recordActivity($pdo, $user['id'], 'product_sale', "Sold {$input['quantity_sold']} units of product {$input['product_id']}");
            
            http_response_code(200);
            echo json_encode([
                'message' => 'Product sold successfully',
                'remaining_quantity' => $newQuantity
            ]);
            break;

       case 'get_reports':
            if (!isset($input['timeframe'])) {
                echo json_encode(['success' => false, 'message' => 'Timeframe is required']);
                exit;
            }
        
            $timeframe = $input['timeframe'];
            $timeframeSQL = '';
            
            switch($timeframe) {
                case 'daily':
                    $timeframeSQL = 'DATE(pt.transaction_date) = CURDATE()'; // Added pt.
                    break;
                case 'weekly':
                    $timeframeSQL = 'YEARWEEK(pt.transaction_date) = YEARWEEK(CURDATE())'; // Added pt.
                    break;
                case 'monthly':
                    $timeframeSQL = 'YEAR(pt.transaction_date) = YEAR(CURDATE()) AND MONTH(pt.transaction_date) = MONTH(CURDATE())'; // Added pt.
                    break;
                case 'annual':
                    $timeframeSQL = 'YEAR(pt.transaction_date) = YEAR(CURDATE())'; // Added pt.
                    break;
                default:
                    echo json_encode(['success' => false, 'message' => 'Invalid timeframe']);
                    exit;
            }
        
            try {
                // Get total sales (separate query for total)
                $stmt = $pdo->prepare(
                    "SELECT COALESCE(SUM(pt.Sold_Price * pt.quantity), 0) as total_sales
                     FROM product_transactions pt -- Aliased product_transactions as pt
                     WHERE $timeframeSQL"
                );
                $stmt->execute();
                $totalSales = $stmt->fetchColumn();
        
                // Get sales by hour and payment method
                // Modified query to join with products table and select product name
                $stmt = $pdo->prepare(
                    "SELECT COALESCE(SUM(pt.Sold_Price * pt.quantity), 0) as total,
                            HOUR(pt.transaction_date) as hour,
                            pt.payment_method,
                            COUNT(*) as count,
                            p.name as product_name, -- Select product name here
                            pt.quantity,
                            pt.Sold_Price as amount,
                            pt.comment,
                            pt.transaction_date
                     FROM product_transactions pt
                     JOIN products p ON pt.product_id = p.id -- Join with products table
                     WHERE $timeframeSQL AND pt.payment_method != ''
                     GROUP BY HOUR(pt.transaction_date), pt.payment_method, p.name, pt.quantity, pt.Sold_Price, pt.comment, pt.transaction_date
                     ORDER BY pt.transaction_date ASC"
                );
                $stmt->execute();
                $salesData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
                // Get total spending (separate query for total)
                $stmt = $pdo->prepare(
                    "SELECT COALESCE(SUM(s.amount), 0) as total_spending
                     FROM spendings s -- Aliased spendings as s
                     WHERE " . str_replace('pt.transaction_date', 's.transaction_date', $timeframeSQL) // Adjusted for spendings table
                );
                $stmt->execute();
                $totalSpending = $stmt->fetchColumn();
        
                // Get spending by category and detailed spending
                $stmt = $pdo->prepare(
                    "SELECT category,
                            COALESCE(SUM(amount), 0) as total,
                            GROUP_CONCAT(reason) as reasons,
                            amount,
                            reason,
                            comment,
                            transaction_date
                     FROM spendings
                     WHERE " . str_replace('pt.transaction_date', 'transaction_date', $timeframeSQL) . " -- Adjusted for spendings table
                     GROUP BY category, amount, reason, comment, transaction_date
                     ORDER BY transaction_date ASC"
                );
                $stmt->execute();
                $spendingData = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Process hourly data for sales chart
                $hourlyData = [];
                foreach ($salesData as $sale) {
                    $hour = intval($sale['hour']);
                    if (!isset($hourlyData[$hour])) {
                        $hourlyData[$hour] = ['hour' => $hour, 'amount' => 0];
                    }
                    $hourlyData[$hour]['amount'] += floatval($sale['total']);
                }

                // Convert to array and sort by hour
                $hourlyData = array_values($hourlyData);
                usort($hourlyData, function($a, $b) {
                    return $a['hour'] - $b['hour'];
                });
        
                $paymentMethods = [];
                foreach ($salesData as $sale) {
                    if (!empty($sale['payment_method'])) {
                        if (!isset($paymentMethods[$sale['payment_method']])) {
                            $paymentMethods[$sale['payment_method']] = 0;
                        }
                        $paymentMethods[$sale['payment_method']] += floatval($sale['total']);
                    }
                }

                // Prepare detailed transactions
                $spendingDetails = [];
                foreach ($spendingData as $item) {
                    $spendingDetails[] = [
                        'transaction_date' => $item['transaction_date'],
                        'category' => $item['category'],
                        'reason' => $item['reason'],
                        'comment' => $item['comment'],
                        'amount' => floatval($item['amount'])
                    ];
                }

                $salesDetails = [];
                foreach ($salesData as $sale) {
                    $salesDetails[] = [
                        'transaction_date' => $sale['transaction_date'],
                        'product_name' => $sale['product_name'], // Use product_name here
                        'quantity' => intval($sale['quantity']),
                        'amount' => floatval($sale['amount']),
                        'payment_method' => $sale['payment_method'],
                        'comment' => $sale['comment']
                    ];
                }
        
                $response = [
                    'success' => true,
                    'sales' => [
                        'total' => floatval($totalSales),
                        'hourlyData' => $hourlyData,
                        'paymentMethods' => array_map(function($method, $amount) {
                            return ['method' => $method, 'amount' => floatval($amount)];
                        }, array_keys($paymentMethods), array_values($paymentMethods))
                    ],
                    'spending' => [
                        'total' => floatval($totalSpending),
                        'categories' => array_map(function($item) {
                            return [
                                'name' => $item['category'],
                                'amount' => floatval($item['total']),
                                'reasons' => explode(',', $item['reasons'])
                            ];
                        }, $spendingData)
                    ],
                    'netIncome' => floatval($totalSales) - floatval($totalSpending),
                    'transactions' => [
                        'spending' => $spendingDetails,
                        'sales' => $salesDetails
                    ]
                ];
        
                echo json_encode($response);
            } catch (PDOException $e) {
                echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
            }
            break;
        default:
            http_response_code(404);
            echo json_encode(['message' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Server error: ' . $e->getMessage()]);
}
