<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE"); // Added PUT, DELETE for completeness
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require 'vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// --- JWT Configuration ---
$secretKey = 'faec25dba0f91960ba96309f39622702b6a9b5a96eedba789974029c5f3c2eaa3e988a9216e79236e3cf2b5ffc10b831276c4cbc35a88c4a38a9d70aad77343a'; // CHANGE THIS
$algorithm = 'HS256';

// --- Database Configuration ---
$dbHost = 'localhost';
$dbName = 'nathnahz_shop';
$dbUser = 'nathnahz_shop';
$dbPass = 'FAzVMbbAjTBpG64NPGqD';

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// --- Helper Functions ---
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

function recordActivity($pdo, $userId, $activityType, $description, $organizationId = null) { // Added $organizationId
    $ip = getClientIp();
    $stmt = $pdo->prepare("INSERT INTO user_activity (user_id, activity_type, description, ip_address, organization_id)
                           VALUES (:user_id, :activity_type, :description, :ip_address, :organization_id)");
    $stmt->execute([
        ':user_id' => $userId,
        ':activity_type' => $activityType,
        ':description' => $description,
        ':ip_address' => $ip,
        ':organization_id' => $organizationId
    ]);
}

function recordLoginAttempt($pdo, $username, $success, $organizationId = null) { // Added optional $organizationId
    $ip = getClientIp();
    $userAgent = getUserAgent();

    $stmt = $pdo->prepare("INSERT INTO login_attempts (username, success, ip_address, user_agent, organization_id)
                           VALUES (:username, :success, :ip_address, :user_agent, :organization_id)");
    $stmt->execute([
        ':username' => $username,
        ':success' => $success,
        ':ip_address' => $ip,
        ':user_agent' => $userAgent,
        ':organization_id' => $organizationId
    ]);
}

// --- Main API Handler ---
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? '';

// Initialize user and organization variables
$user = null;
$loggedInUserId = null;
$organizationId = null;

// --- Authentication Check for Protected Routes ---
$protectedRoutes = ['addProduct', 'updateProduct', 'updateProductStatus', 'getProducts', 'getProductDetails', 'sellProduct', 'add_spending', 'get_reports','change_password','register_user'];
if (in_array($action, $protectedRoutes)) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = null;

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
    }

    if (!$token) {
        http_response_code(401);
        echo json_encode(['message' => 'No token provided']);
        exit;
    }

    try {
        $decoded = JWT::decode($token, new Key($secretKey, $algorithm));
        // Get user from database to ensure they still exist, are active, and get their organization_id
        $stmt = $pdo->prepare("SELECT id, username, role, is_active, organization_id FROM users WHERE id = :id");
        $stmt->execute([':id' => $decoded->sub]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !$user['is_active']) {
            http_response_code(401);
            echo json_encode(['message' => 'Invalid or inactive user']);
            exit;
        }
        // Set global user and organization identifiers for protected routes
        $loggedInUserId = $user['id'];
        $organizationId = $user['organization_id']; // Crucial for data scoping

        if (!$organizationId && $action !== 'some_global_admin_action') { // Example for future global admin
             http_response_code(403);
             echo json_encode(['message' => 'User not associated with an organization.']);
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
            if (empty($input['username']) || empty($input['password'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Username and password are required']);
                exit;
            }

            $username = trim($input['username']);
            $password = $input['password'];

            // Fetch user including organization_id
            $stmt = $pdo->prepare("SELECT id, username, password, role, is_active, organization_id FROM users WHERE username = :username");
            $stmt->execute([':username' => $username]);
            $loginUser = $stmt->fetch(PDO::FETCH_ASSOC); // Renamed to loginUser to avoid conflict with global $user

            if (!$loginUser || !password_verify($password, $loginUser['password'])) {
                recordLoginAttempt($pdo, $username, 0); // Org ID might not be known here yet
                http_response_code(401);
                echo json_encode(['message' => 'Invalid username or password']);
                exit;
            }

            if (!$loginUser['is_active']) {
                recordLoginAttempt($pdo, $username, 0, $loginUser['organization_id'] ?? null);
                http_response_code(403);
                echo json_encode(['message' => 'Account is deactivated']);
                exit;
            }
            
            if (empty($loginUser['organization_id'])) {
                recordLoginAttempt($pdo, $username, 0, $loginUser['organization_id'] ?? null);
                http_response_code(403); // Or a different code indicating setup is needed
                echo json_encode(['message' => 'User is not associated with an organization. Login denied.']);
                exit;
            }


            $payload = [
                'sub' => $loginUser['id'],
                'username' => $loginUser['username'],
                'role' => $loginUser['role'],
                'organization_id' => $loginUser['organization_id'], // Include organization_id
                'iat' => time(),
                'exp' => time() + (60 * 60 * 24 * 7) // 1 week expiration
            ];
            $token = JWT::encode($payload, $secretKey, $algorithm);

            recordLoginAttempt($pdo, $username, 1, $loginUser['organization_id']);
            recordActivity($pdo, $loginUser['id'], 'login', 'User logged in', $loginUser['organization_id']);

            $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
            $stmt->execute([':id' => $loginUser['id']]);

            http_response_code(200);
            echo json_encode([
                'message' => 'Login successful',
                'user' => [
                    'id' => $loginUser['id'],
                    'username' => $loginUser['username'],
                    'role' => $loginUser['role'],
                    'organization_id' => $loginUser['organization_id'] // Include organization_id in response
                ],
                'token' => $token
            ]);
            break;

        case 'register':
            $required = ['username', 'email', 'password', 'organization_name'];
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
            $organizationName = trim($input['organization_name']);

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid email format']);
                exit;
            }

            // Check existing user (globally unique username/email assumed)
            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :username OR email = :email");
            $stmt->execute([':username' => $username, ':email' => $email]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['message' => 'Username or email already exists']);
                exit;
            }

            // Check if organization name is globally unique (optional, but good practice)
            $stmt = $pdo->prepare("SELECT id FROM organizations WHERE name = :name");
            $stmt->execute([':name' => $organizationName]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['message' => 'Organization name already exists. Please choose a different name.']);
                exit;
            }

            $pdo->beginTransaction();
            try {
                // Create new organization
                $stmt = $pdo->prepare("INSERT INTO organizations (name) VALUES (:name)");
                $stmt->execute([':name' => $organizationName]);
                $newOrganizationId = $pdo->lastInsertId();

                // Create user and link to the new organization
                $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("INSERT INTO users (username, email, password, organization_id, role, is_active)
                                       VALUES (:username, :email, :password, :organization_id, :role, 1)"); // Default role 'admin' for creator
                $stmt->execute([
                    ':username' => $username,
                    ':email' => $email,
                    ':password' => $hashedPassword,
                    ':organization_id' => $newOrganizationId,
                    ':role' => 'admin' // First user of an org is often admin
                ]);
                $newUserId = $pdo->lastInsertId();

                // Update organization with owner_user_id
                $stmt = $pdo->prepare("UPDATE organizations SET owner_user_id = :user_id WHERE id = :organization_id");
                $stmt->execute([':user_id' => $newUserId, ':organization_id' => $newOrganizationId]);

                recordActivity($pdo, $newUserId, 'registration', "User registered and created organization '$organizationName'", $newOrganizationId);

                $pdo->commit();
                http_response_code(201);
                echo json_encode(['message' => 'User and organization registered successfully']);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['message' => 'Registration failed: ' . $e->getMessage()]);
            }
            break;

        case 'reset':
            // ... (No direct organization_id change here unless for activity logging)
            if (empty($input['email'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Email is required']);
                exit;
            }
            $email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
            $stmt = $pdo->prepare("SELECT id, organization_id FROM users WHERE email = :email"); // Fetch org_id if exists
            $stmt->execute([':email' => $email]);
            $resetUser = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($resetUser) {
                $token = bin2hex(random_bytes(32));
                $tokenHash = hash('sha256', $token);
                $expiry = date('Y-m-d H:i:s', time() + 3600);

                $stmt = $pdo->prepare("INSERT INTO password_reset_tokens (user_id, token_hash, expiry)
                                       VALUES (:user_id, :token_hash, :expiry)");
                $stmt->execute([
                    ':user_id' => $resetUser['id'],
                    ':token_hash' => $tokenHash,
                    ':expiry' => $expiry
                ]);
                recordActivity($pdo, $resetUser['id'], 'password_reset_request', 'Password reset requested', $resetUser['organization_id']);
            }
            http_response_code(200);
            echo json_encode(['message' => 'If the email exists, a reset link has been sent']);
            break;

        case 'add_spending':
            // $loggedInUserId and $organizationId are already set from auth check
            $data = $input; // Use $input directly as it's already decoded

            if (!isset($data['amount'], $data['category'], $data['reason'])) {
                echo json_encode(['success' => false, 'message' => 'Missing required fields: amount, category, reason']);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO spendings (user_id, amount, category, reason, comment, organization_id)
                                  VALUES (:user_id, :amount, :category, :reason, :comment, :organization_id)");
            try {
                $result = $stmt->execute([
                    ':user_id' => $loggedInUserId, // Use the ID of the authenticated user
                    ':amount' => $data['amount'],
                    ':category' => $data['category'],
                    ':reason' => $data['reason'],
                    ':comment' => $data['comment'] ?? null,
                    ':organization_id' => $organizationId // Use authenticated user's org ID
                ]);

                if ($result) {
                    recordActivity($pdo, $loggedInUserId, 'spending_record',
                                 "Recorded {$data['category']} spending of {$data['amount']}", $organizationId);
                    echo json_encode(['success' => true, 'message' => 'Spending recorded successfully']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to record spending']);
                }
            } catch (PDOException $e) {
                echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
            }
            break;

        case 'addProduct':
            // $loggedInUserId, $organizationId, $user (role) are set
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['message' => 'Unauthorized access']);
                exit;
            }
            $required = ['name', 'import_price', 'selling_price', 'quantity', 'status']; // status for inventory
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['message' => "$field is required"]);
                    exit;
                }
            }
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("INSERT INTO products (name, description, category, import_price, selling_price, organization_id)
                                       VALUES (:name, :description, :category, :import_price, :selling_price, :organization_id)");
                $stmt->execute([
                    ':name' => $input['name'],
                    ':description' => $input['description'] ?? '',
                    ':category' => $input['category'] ?? '',
                    ':import_price' => $input['import_price'],
                    ':selling_price' => $input['selling_price'],
                    ':organization_id' => $organizationId
                ]);
                $productId = $pdo->lastInsertId();

                $stmt = $pdo->prepare("INSERT INTO product_inventory (product_id, quantity, status)
                                       VALUES (:product_id, :quantity, :status)");
                $stmt->execute([
                    ':product_id' => $productId,
                    ':quantity' => $input['quantity'],
                    ':status' => $input['status']
                ]);

                $stmt = $pdo->prepare("INSERT INTO product_transactions (product_id, quantity, previous_status, new_status, user_id, organization_id)
                                       VALUES (:product_id, :quantity, 'new', :status, :user_id, :organization_id)");
                $stmt->execute([
                    ':product_id' => $productId,
                    ':quantity' => $input['quantity'],
                    ':status' => $input['status'],
                    ':user_id' => $loggedInUserId,
                    ':organization_id' => $organizationId
                ]);
                
                recordActivity($pdo, $loggedInUserId, 'product_add', "Added product '{$input['name']}' (ID: $productId)", $organizationId);
                $pdo->commit();
                http_response_code(201);
                echo json_encode(['message' => 'Product added successfully', 'product_id' => $productId]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['message' => 'Failed to add product: ' . $e->getMessage()]);
            }
            break;

        case 'updateProduct':
            // $loggedInUserId, $organizationId, $user (role) are set
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['message' => 'Unauthorized access']);
                exit;
            }
            $required = ['product_id', 'name', 'import_price', 'selling_price', 'quantity', 'status'];
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['message' => "$field is required"]);
                    exit;
                }
            }
            $pdo->beginTransaction();
            try {
                // Ensure product belongs to the organization
                $stmt = $pdo->prepare("SELECT id FROM products WHERE id = :product_id AND organization_id = :organization_id");
                $stmt->execute([':product_id' => $input['product_id'], ':organization_id' => $organizationId]);
                if (!$stmt->fetch()) {
                    http_response_code(404);
                    echo json_encode(['message' => 'Product not found or not part of your organization.']);
                    $pdo->rollBack();
                    exit;
                }

                $stmt = $pdo->prepare("UPDATE products SET
                  name = :name, description = :description, import_price = :import_price, selling_price = :selling_price
                  WHERE id = :product_id AND organization_id = :organization_id"); // Scoped update
                $stmt->execute([
                  ':name' => $input['name'],
                  ':description' => $input['description'] ?? '',
                  ':import_price' => $input['import_price'],
                  ':selling_price' => $input['selling_price'],
                  ':product_id' => $input['product_id'],
                  ':organization_id' => $organizationId
                ]);

                $stmt = $pdo->prepare("UPDATE product_inventory SET
                  quantity = :quantity, status = :status, status_changed_at = NOW()
                  WHERE product_id = :product_id");
                $stmt->execute([
                  ':quantity' => $input['quantity'],
                  ':status' => $input['status'],
                  ':product_id' => $input['product_id']
                ]);
                
                recordActivity($pdo, $loggedInUserId, 'product_update', "Updated product ID: {$input['product_id']}", $organizationId);
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Product updated']);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['message' => 'Update failed: ' . $e->getMessage()]);
            }
            break;

        case 'updateProductStatus':
             // $loggedInUserId, $organizationId, $user (role) are set
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['message' => 'Unauthorized access']);
                exit;
            }
            if (!isset($input['product_id']) || !isset($input['new_status']) || !isset($input['quantity'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Product ID, new status and quantity are required']);
                exit;
            }
             // Ensure product belongs to the organization
            $stmt = $pdo->prepare("SELECT pi.status FROM product_inventory pi JOIN products p ON pi.product_id = p.id WHERE p.id = :product_id AND p.organization_id = :organization_id");
            $stmt->execute([':product_id' => $input['product_id'], ':organization_id' => $organizationId]);
            $currentInventory = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$currentInventory) {
                http_response_code(404);
                echo json_encode(['message' => 'Product not found or not part of your organization.']);
                exit;
            }
            $currentStatus = $currentInventory['status'];

            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("UPDATE product_inventory SET status = :status, quantity = :quantity, status_changed_at = NOW()
                                       WHERE product_id = :product_id");
                $stmt->execute([
                    ':status' => $input['new_status'],
                    ':quantity' => $input['quantity'],
                    ':product_id' => $input['product_id']
                ]);

                $stmt = $pdo->prepare("INSERT INTO product_transactions (product_id, quantity, previous_status, new_status, user_id, organization_id)
                                       VALUES (:product_id, :quantity, :previous_status, :new_status, :user_id, :organization_id)");
                $stmt->execute([
                    ':product_id' => $input['product_id'],
                    ':quantity' => $input['quantity'],
                    ':previous_status' => $currentStatus,
                    ':new_status' => $input['new_status'],
                    ':user_id' => $loggedInUserId,
                    ':organization_id' => $organizationId
                ]);
                
                recordActivity($pdo, $loggedInUserId, 'product_status_update', "Updated status for product ID: {$input['product_id']} to {$input['new_status']}", $organizationId);
                $pdo->commit();
                http_response_code(200);
                echo json_encode(['message' => 'Product status updated successfully']);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update product status: ' . $e->getMessage()]);
            }
            break;

        case 'getProducts':
            // $organizationId is set
            $stmt = $pdo->prepare("SELECT p.*, pi.quantity, pi.status
                                   FROM products p
                                   JOIN product_inventory pi ON p.id = pi.product_id
                                   WHERE p.organization_id = :organization_id");
            $stmt->execute([':organization_id' => $organizationId]);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode(['products' => $products]);
            break;

        case 'getProductDetails':
            // $organizationId is set
            if (!isset($_GET['productId'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Product ID is required']);
                exit;
            }
            $productIdParam = $_GET['productId'];
            $stmt = $pdo->prepare("SELECT p.*, pi.quantity, pi.status
                                   FROM products p
                                   JOIN product_inventory pi ON p.id = pi.product_id
                                   WHERE p.id = :product_id AND p.organization_id = :organization_id");
            $stmt->execute([':product_id' => $productIdParam, ':organization_id' => $organizationId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($product) {
                http_response_code(200);
                echo json_encode(['product' => $product]);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Product not found or not part of your organization.']);
            }
            break;

        case 'sellProduct':
            // $loggedInUserId, $organizationId are set
            $required = ['product_id', 'quantity_sold', 'sold_price', 'payment_method'];
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['message' => "$field is required"]);
                    exit;
                }
            }
            $validMethods = ['cash', 'credit', 'account_transfer'];
            if (!in_array($input['payment_method'], $validMethods)) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid payment method']);
                exit;
            }

            $pdo->beginTransaction();
            try {
                // Get current inventory and verify product belongs to organization
                $stmt = $pdo->prepare("SELECT pi.quantity, pi.status FROM product_inventory pi
                                       JOIN products p ON pi.product_id = p.id
                                       WHERE pi.product_id = :product_id AND p.organization_id = :organization_id");
                $stmt->execute([':product_id' => $input['product_id'], ':organization_id' => $organizationId]);
                $inventory = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$inventory) {
                    http_response_code(404);
                    echo json_encode(['message' => 'Product not found or not part of your organization.']);
                    $pdo->rollBack();
                    exit;
                }
                if ($inventory['status'] !== 'in_store') {
                    http_response_code(400);
                    echo json_encode(['message' => 'Product is not available for sale']);
                    $pdo->rollBack();
                    exit;
                }
                if ($inventory['quantity'] < $input['quantity_sold']) {
                    http_response_code(400);
                    echo json_encode(['message' => 'Insufficient quantity in stock']);
                    $pdo->rollBack();
                    exit;
                }

                $newQuantity = $inventory['quantity'] - $input['quantity_sold'];
                $newStatus = $newQuantity > 0 ? 'in_store' : 'sold'; // If 0, status becomes 'sold'

                $stmt = $pdo->prepare("UPDATE product_inventory SET quantity = :quantity, status = :status, status_changed_at = NOW()
                                       WHERE product_id = :product_id");
                $stmt->execute([
                    ':quantity' => $newQuantity,
                    ':status' => $newStatus,
                    ':product_id' => $input['product_id']
                ]);

                $stmt = $pdo->prepare("
                    INSERT INTO product_transactions
                      (product_id, quantity, previous_status, new_status, user_id, comment, Sold_Price, payment_method, organization_id)
                    VALUES
                      (:product_id, :quantity, :previous_status, :new_status, :user_id, :comment, :sold_price, :payment_method, :organization_id)
                ");
                $stmt->execute([
                    ':product_id'     => $input['product_id'],
                    ':quantity'       => $input['quantity_sold'],
                    ':previous_status'=> 'in_store',
                    ':new_status'     => $newStatus,
                    ':user_id'        => $loggedInUserId,
                    ':comment'        => $input['comment'] ?? '',
                    ':sold_price'     => $input['sold_price'],
                    ':payment_method' => $input['payment_method'],
                    ':organization_id'=> $organizationId
                ]);

                recordActivity($pdo, $loggedInUserId, 'product_sale', "Sold {$input['quantity_sold']} units of product {$input['product_id']}", $organizationId);
                $pdo->commit();
                http_response_code(200);
                echo json_encode(['message' => 'Product sold successfully', 'remaining_quantity' => $newQuantity]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['message' => 'Failed to sell product: ' . $e->getMessage()]);
            }
            break;

       case 'get_reports':
    try {
        $dateField = 'transaction_date';
        $now       = date('Y-m-d H:i:s');

        //
        // 1) DETERMINE $filter and build DEFAULT $start/$end based on it
        //
        $filter = $_GET['filter'] ?? 'daily';

        if ($filter === 'daily') {
            $start = date('Y-m-d 00:00:00');
            $end   = date('Y-m-d 23:59:59');

            $salesQuery = "
                SELECT HOUR($dateField) AS label,
                       SUM(Sold_Price * quantity) AS total
                FROM product_transactions
                WHERE organization_id = :orgId
                  AND $dateField BETWEEN :start AND :end
                GROUP BY HOUR($dateField)
                ORDER BY label ASC
            ";
            $spendingQuery = "
                SELECT HOUR(transaction_date) AS label,
                       SUM(amount) AS total
                FROM spendings
                WHERE organization_id = :orgId
                  AND transaction_date BETWEEN :start AND :end
                GROUP BY HOUR(transaction_date)
                ORDER BY label ASC
            ";
            $paymentQuery = "
                SELECT payment_method AS pm,
                       SUM(Sold_Price * quantity) AS total
                FROM product_transactions
                WHERE organization_id = :orgId
                  AND $dateField BETWEEN :start AND :end
                GROUP BY payment_method
                ORDER BY payment_method ASC
            ";
            $labels = range(0, 23);

        } elseif ($filter === 'weekly') {
            $start = date('Y-m-d 00:00:00', strtotime('-6 days'));
            $end   = date('Y-m-d 23:59:59');

            $salesQuery = "
                SELECT DATE($dateField) AS label,
                       SUM(Sold_Price * quantity) AS total
                FROM product_transactions
                WHERE organization_id = :orgId
                  AND $dateField BETWEEN :start AND :end
                GROUP BY DATE($dateField)
                ORDER BY label ASC
            ";
            $spendingQuery = "
                SELECT DATE(transaction_date) AS label,
                       SUM(amount) AS total
                FROM spendings
                WHERE organization_id = :orgId
                  AND transaction_date BETWEEN :start AND :end
                GROUP BY DATE(transaction_date)
                ORDER BY label ASC
            ";
            $paymentQuery = "
                SELECT payment_method AS pm,
                       SUM(Sold_Price * quantity) AS total
                FROM product_transactions
                WHERE organization_id = :orgId
                  AND $dateField BETWEEN :start AND :end
                GROUP BY payment_method
                ORDER BY payment_method ASC
            ";
            $labels = [];
            for ($i = 6; $i >= 0; $i--) {
                $labels[] = date('Y-m-d', strtotime("-$i days"));
            }

        } elseif ($filter === 'monthly') {
            $start = date('Y-m-d 00:00:00', strtotime('-1 month'));
            $end   = date('Y-m-d 23:59:59');

            $salesQuery = "
                SELECT YEARWEEK($dateField, 1) AS label,
                       SUM(Sold_Price * quantity) AS total
                FROM product_transactions
                WHERE organization_id = :orgId
                  AND $dateField BETWEEN :start AND :end
                GROUP BY YEARWEEK($dateField, 1)
                ORDER BY label ASC
            ";
            $spendingQuery = "
                SELECT YEARWEEK(transaction_date, 1) AS label,
                       SUM(amount) AS total
                FROM spendings
                WHERE organization_id = :orgId
                  AND transaction_date BETWEEN :start AND :end
                GROUP BY YEARWEEK(transaction_date, 1)
                ORDER BY label ASC
            ";
            $paymentQuery = "
                SELECT payment_method AS pm,
                       SUM(Sold_Price * quantity) AS total
                FROM product_transactions
                WHERE organization_id = :orgId
                  AND $dateField BETWEEN :start AND :end
                GROUP BY payment_method
                ORDER BY payment_method ASC
            ";
            $labels      = [];
            $week        = (int)date('W', strtotime($start));
            $year        = (int)date('o', strtotime($start));
            $currentWeek = (int)date('W');
            $currentYear = (int)date('o');
            while ($year < $currentYear || ($year == $currentYear && $week <= $currentWeek)) {
                $labels[] = sprintf('%d%02d', $year, $week);
                $week++;
                if ($week > 53) { $week = 1; $year++; }
            }

        } else {
            // Annual or fallback
            $start = date('Y-01-01 00:00:00');
            $end   = date('Y-12-31 23:59:59');

            $salesQuery = "
                SELECT MONTH($dateField) AS label,
                       SUM(Sold_Price * quantity) AS total
                FROM product_transactions
                WHERE organization_id = :orgId
                  AND $dateField BETWEEN :start AND :end
                GROUP BY MONTH($dateField)
                ORDER BY label ASC
            ";
            $spendingQuery = "
                SELECT MONTH(transaction_date) AS label,
                       SUM(amount) AS total
                FROM spendings
                WHERE organization_id = :orgId
                  AND transaction_date BETWEEN :start AND :end
                GROUP BY MONTH(transaction_date)
                ORDER BY label ASC
            ";
            $paymentQuery = "
                SELECT payment_method AS pm,
                       SUM(Sold_Price * quantity) AS total
                FROM product_transactions
                WHERE organization_id = :orgId
                  AND $dateField BETWEEN :start AND :end
                GROUP BY payment_method
                ORDER BY payment_method ASC
            ";
            $labels = range(1, 12);
        }

        //
        // 2) OVERRIDE $start/$end IF passed explicitly
        //
        if (!empty($_GET['start'])) {
            $rawStart = $_GET['start'];
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawStart)) {
                $start = $rawStart . ' 00:00:00';
            } else {
                $start = $rawStart;
            }
            if (!empty($_GET['end'])) {
                $rawEnd = $_GET['end'];
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawEnd)) {
                    $end = $rawEnd . ' 23:59:59';
                } else {
                    $end = $rawEnd;
                }
            } else {
                $end = substr($start, 0, 10) . ' 23:59:59';
            }
        }

        //
        // 3) EXECUTE SALES, SPENDING, PAYMENT QUERIES
        //
        $salesStmt = $pdo->prepare($salesQuery);
        $salesStmt->execute([
            ':orgId' => $organizationId,
            ':start' => $start,
            ':end'   => $end
        ]);
        $salesData = $salesStmt->fetchAll(PDO::FETCH_ASSOC);

        $spendingStmt = $pdo->prepare($spendingQuery);
        $spendingStmt->execute([
            ':orgId' => $organizationId,
            ':start' => $start,
            ':end'   => $end
        ]);
        $spendingData = $spendingStmt->fetchAll(PDO::FETCH_ASSOC);

        $paymentStmt = $pdo->prepare($paymentQuery);
        $paymentStmt->execute([
            ':orgId' => $organizationId,
            ':start' => $start,
            ':end'   => $end
        ]);
        $paymentRows = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);

        //
        // 4) MAP RESULTS TO ARRAYS
        //
        $salesMap    = [];
        foreach ($salesData as $row) {
            $salesMap[(string)$row['label']] = (float)$row['total'];
        }
        $spendingMap = [];
        foreach ($spendingData as $row) {
            $spendingMap[(string)$row['label']] = (float)$row['total'];
        }

        $salesArr    = [];
        $spendingArr = [];
        foreach ($labels as $label) {
            $key           = (string)$label;
            $salesArr[]    = $salesMap[$key] ?? 0;
            $spendingArr[] = $spendingMap[$key] ?? 0;
        }

        $paymentMap = [
            'cash'             => 0.0,
            'credit'           => 0.0,
            'account_transfer' => 0.0
        ];
        foreach ($paymentRows as $row) {
            $pm = $row['pm'];
            if (isset($paymentMap[$pm])) {
                $paymentMap[$pm] = (float)$row['total'];
            }
        }
        $pmLabels = ['cash','credit','account_transfer'];
        $pmData   = [
            $paymentMap['cash'],
            $paymentMap['credit'],
            $paymentMap['account_transfer']
        ];

        //
        // 5) LOW STOCK (<= 5)
        //
        $lowStockThreshold = 5;
        $lowStockQuery = "
            SELECT p.id, p.name, pi.quantity
            FROM products p
            JOIN product_inventory pi ON p.id = pi.product_id
            WHERE p.organization_id = :orgId
              AND pi.quantity <= :threshold
            ORDER BY pi.quantity ASC
        ";
        $lowStockStmt = $pdo->prepare($lowStockQuery);
        $lowStockStmt->execute([
            ':orgId'     => $organizationId,
            ':threshold' => $lowStockThreshold
        ]);
        $lowStockRows = $lowStockStmt->fetchAll(PDO::FETCH_ASSOC);

        //
        // 6) TRENDING PRODUCTS (top 5)
        //
        $trendingQuery = "
            SELECT p.id, p.name, SUM(pt.quantity) AS sold_qty
            FROM product_transactions pt
            JOIN products p ON pt.product_id = p.id
            WHERE pt.organization_id = :orgId
              AND pt.transaction_date BETWEEN :start AND :end
            GROUP BY pt.product_id
            ORDER BY sold_qty DESC
            LIMIT 5
        ";
        $trendingStmt = $pdo->prepare($trendingQuery);
        $trendingStmt->execute([
            ':orgId' => $organizationId,
            ':start' => $start,
            ':end'   => $end
        ]);
        $trendingRows = $trendingStmt->fetchAll(PDO::FETCH_ASSOC);

        //
        // 7) RAW PRODUCT TRANSACTIONS
        //
        $prodTxQuery = "
            SELECT
              pt.id,
              p.id        AS product_id,
              p.name      AS product_name,
              pt.quantity AS quantity_sold,
              pt.Sold_Price,
              pt.payment_method,
              pt.transaction_date
            FROM product_transactions pt
            JOIN products p ON pt.product_id = p.id
            WHERE pt.organization_id = :orgId
              AND pt.transaction_date BETWEEN :start AND :end
            ORDER BY pt.transaction_date ASC
        ";
        $prodTxStmt = $pdo->prepare($prodTxQuery);
        $prodTxStmt->execute([
            ':orgId' => $organizationId,
            ':start' => $start,
            ':end'   => $end
        ]);
        $productRows = $prodTxStmt->fetchAll(PDO::FETCH_ASSOC);

        //
        // 8) RAW SPENDING TRANSACTIONS (use reason → description)
        //
        $spendTxQuery = "
            SELECT
              s.id,
              s.amount,
              s.reason AS description,
              s.transaction_date
            FROM spendings s
            WHERE s.organization_id = :orgId
              AND s.transaction_date BETWEEN :start AND :end
            ORDER BY s.transaction_date ASC
        ";
        $spendTxStmt = $pdo->prepare($spendTxQuery);
        $spendTxStmt->execute([
            ':orgId' => $organizationId,
            ':start' => $start,
            ':end'   => $end
        ]);
        $spendingRows = $spendTxStmt->fetchAll(PDO::FETCH_ASSOC);

        //
        // 9) AUDIT TRAIL
        //
        recordActivity(
            $pdo,
            $loggedInUserId,
            'reports_view',
            "Viewed reports & transactions from $start to $end",
            $organizationId
        );

        //
        // 10) BUILD & SEND JSON RESPONSE
        //
        $response = [
            'chartData'           => [
                'labels'   => $labels,
                'datasets' => [['data' => $salesArr]]
            ],
            'totals'              => [
                'sales'     => array_sum($salesArr),
                'spendings' => array_sum($spendingArr)
            ],
            'paymentData'         => [
                'labels'   => $pmLabels,
                'datasets' => [['data' => $pmData]]
            ],
            'lowStock'            => $lowStockRows,       // [{id, name, quantity}, …]
            'trendingProducts'    => $trendingRows,       // [{id, name, sold_qty}, …]
            'productTransactions' => $productRows,        // [{…product tx…}, …]
            'spendingTransactions'=> $spendingRows        // [{…spending tx…}, …]
        ];
        http_response_code(200);
        echo json_encode($response);

    } catch (PDOException $e) {
        error_log('get_reports PDOException: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['message' => 'Database error: ' . $e->getMessage()]);
    }
    break;
              // 1) Change own password
        case 'change_password':
            // Ensure both fields are present
            if (empty($input['current_password']) || empty($input['new_password'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Both current_password and new_password are required']);
                exit;
            }

            // Fetch existing hash
            $stmt = $pdo->prepare("SELECT password FROM users WHERE id = :id");
            $stmt->execute([':id' => $loggedInUserId]);
            $userRow = $stmt->fetch(PDO::FETCH_ASSOC);

            // Verify current password
            if (!password_verify($input['current_password'], $userRow['password'])) {
                http_response_code(401);
                echo json_encode(['message' => 'Current password is incorrect']);
                exit;
            }

            // Update to new hash
            $newHash = password_hash($input['new_password'], PASSWORD_DEFAULT);
            $stmt   = $pdo->prepare("UPDATE users SET password = :pw WHERE id = :id");
            $stmt->execute([':pw' => $newHash, ':id' => $loggedInUserId]);

            // Record activity
            recordActivity(
                $pdo,
                $loggedInUserId,
                'password_change',
                'User changed own password',
                $organizationId
            );

            http_response_code(200);
            echo json_encode(['message' => 'Password changed successfully']);
            break;


        // 2) Register a new user under your organization (admin-only)
        case 'register_user':
            // Only admins can create users
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['message' => 'Unauthorized: admin role required']);
                exit;
            }

            // Required fields
            foreach (['username','email','password'] as $f) {
                if (empty($input[$f])) {
                    http_response_code(400);
                    echo json_encode(['message' => "$f is required"]);
                    exit;
                }
            }

            // Sanitize & validate
            $username = trim($input['username']);
            $email    = filter_var(trim($input['email']), FILTER_VALIDATE_EMAIL);
            if (!$email) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid email format']);
                exit;
            }
            $password = $input['password'];

            // Check for duplicate username/email within same org
            $stmt = $pdo->prepare(
                "SELECT id FROM users
                 WHERE (username = :u OR email = :e)
                   AND organization_id = :orgId"
            );
            $stmt->execute([
                ':u'     => $username,
                ':e'     => $email,
                ':orgId' => $organizationId,
            ]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['message' => 'Username or email already exists in your organization']);
                exit;
            }

            // Insert new user
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare(
                "INSERT INTO users (username, email, password, role, is_active, organization_id)
                 VALUES (:u, :e, :pw, 'user', 1, :orgId)"
            );
            $stmt->execute([
                ':u'     => $username,
                ':e'     => $email,
                ':pw'    => $hash,
                ':orgId' => $organizationId,
            ]);

            // Record activity
            $newId = $pdo->lastInsertId();
            recordActivity(
                $pdo,
                $loggedInUserId,
                'user_registration',
                "Admin created user ID {$newId}",
                $organizationId
            );

            http_response_code(201);
            echo json_encode(['message' => 'User registered successfully']);
            break;



        default:
            http_response_code(404);
            echo json_encode(['message' => 'Invalid action']);
    }
} catch (Exception $e) {
    // General error logging
    error_log("Server Error: " . $e->getMessage() . " in action: " . $action); // Log to server error log
    http_response_code(500);
    echo json_encode(['message' => 'Server error: ' . $e->getMessage()]);
}
?>


