<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE"); // Added PUT, DELETE for completeness
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require 'vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// --- JWT Configuration ---
$secretKey = 'faec25dba0f91960ba96309f39622702b6a9b5a96eedba789974029c5f3c2eaa3e988a9216e79236e3cf2b5ffc10b831276c4cbc35a88c4a38a9d70aad77343a'; // CHANGE THIS
$algorithm = 'HS256';

// --- Database Configuration ---
$dbHost = 'localhost';
$dbName = 'nyvjzrsb_shopmgmt';
$dbUser = 'nyvjzrsb_shopmgmt';
$dbPass = '69rLztX2x4R6bmPAUbxY';

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
$action = $_GET['action'] ?? ($input['action'] ?? '');

// Initialize user and organization variables
$user = null;
$loggedInUserId = null;
$organizationId = null;

// --- Authentication Check for Protected Routes ---
$protectedRoutes = ['addProduct', 'updateProduct', 'updateProductStatus','manageProduct', 'getProducts', 'getProductDetails', 'sellProduct', 'add_spending','add_car_spending', 'get_reports','change_password','register_user','create_worker','update_vehicle','get_vehicless','create_vehicle','get_unpaid_workers','get_carwash_spendings',
    'get_vehicles',               // ← make sure this is here
    'create_carwash_transaction',
    'pay_commission',
    'create_vehicle',
    'get_unpaid_transactions', 'pay_unpaid_amount',
    'update_vehicle','get_commission_summary',
  'get_carwash_transactions',
  'get_paid_commissions',
  'checkout']; // Added checkout here
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
    // 1) Required fields
    $required = ['username', 'email', 'password'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['message' => "$field is required"]);
            exit;
        }
    }

    $username = trim($input['username']);
    $email    = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
    $password = $input['password'];

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['message' => 'Invalid email format']);
        exit;
    }

    // 2) Make sure username/email aren't already taken
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :username OR email = :email");
    $stmt->execute([':username' => $username, ':email' => $email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['message' => 'Username or email already exists']);
        exit;
    }

    // 3) Begin a transaction so that org + user either both succeed or both roll back
    $pdo->beginTransaction();
    try {
        // 4) If no organization_id provided, create a new org
        if (empty($input['organization_id'])) {
            // make sure they gave us a name for the new org
            if (empty($input['organization_name'])) {
                throw new Exception('organization_name is required when organization_id is empty');
            }
            $orgName = trim($input['organization_name']);
            
            // Insert new organization
            $orgStmt = $pdo->prepare(
                "INSERT INTO organizations (name, created_at) 
                 VALUES (:name, NOW())"
            );
            $orgStmt->execute([':name' => $orgName]);
            $organizationId = $pdo->lastInsertId();
        } else {
            // or use the one they gave us
            $organizationId = (int) $input['organization_id'];
        }

        // 5) Create the new user
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $userStmt = $pdo->prepare(
            "INSERT INTO users 
                (username, email, password, organization_id, role, is_active, created_at) 
             VALUES 
                (:username, :email, :password, :org_id, :role, 1, NOW())"
        );
        $userStmt->execute([
            ':username' => $username,
            ':email'    => $email,
            ':password' => $hashedPassword,
            ':org_id'   => $organizationId,
            ':role'     => 'admin'   // first user becomes the org admin
        ]);
        $newUserId = $pdo->lastInsertId();

        // 6) Set the owner_user_id on the org if we just created it
        if (empty($input['organization_id'])) {
            $updateOrg = $pdo->prepare(
                "UPDATE organizations 
                    SET owner_user_id = :owner_id 
                  WHERE id = :org_id"
            );
            $updateOrg->execute([
                ':owner_id' => $newUserId,
                ':org_id'   => $organizationId
            ]);
        }

        // 7) Record activity and commit
        recordActivity($pdo, $newUserId, 'registration', "User registered", $organizationId);
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
             case 'add_car_spending':
            // $loggedInUserId and $organizationId are already set from auth check
            $data = $input; // Use $input directly as it's already decoded

            if (!isset($data['amount'], $data['category'], $data['reason'])) {
                echo json_encode(['success' => false, 'message' => 'Missing required fields: amount, category, reason']);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO car_spendings (user_id, amount, category, reason, comment, organization_id)
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

       // ... existing code ...

case 'addProduct':
    // Authorization check
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['message' => 'Unauthorized access']);
        exit;
    }
    
    // Required fields (without 'category')
    $required = ['name', 'import_price', 'selling_price', 'quantity', 'status']; 
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            http_response_code(400);
            echo json_encode(['message' => "$field is required"]);
            exit;
        }
    }
    
    // Set default category if not provided
    $category = $input['category'] ?? 'Uncategorized'; // Default: 'Uncategorized'
    
    $pdo->beginTransaction();
    try {
        // Insert into products table
        $stmt = $pdo->prepare("INSERT INTO products (name, description, category, import_price, selling_price, organization_id)
                                VALUES (:name, :description, :category, :import_price, :selling_price, :organization_id)");
        $stmt->execute([
            ':name' => $input['name'],
            ':description' => $input['description'] ?? '',
            ':category' => $category, // Uses input or default
            ':import_price' => $input['import_price'],
            ':selling_price' => $input['selling_price'],
            ':organization_id' => $organizationId
        ]);
        $productId = $pdo->lastInsertId();

        // Insert into inventory
        $stmt = $pdo->prepare("INSERT INTO product_inventory (product_id, quantity, status)
                                VALUES (:product_id, :quantity, :status)");
        $stmt->execute([
            ':product_id' => $productId,
            ':quantity' => $input['quantity'],
            ':status' => $input['status']
        ]);

        $pdo->commit();
        http_response_code(201);
        echo json_encode(['message' => 'Product added successfully', 'product_id' => $productId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['message' => 'Failed to add product: ' . $e->getMessage()]);
    }
    break;

// ... existing code ...

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
            $required = ['products', 'payment_method'];
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['message' => "$field is required"]);
                    exit;
                }
            }
            
            // Validate products array
            if (!is_array($input['products']) || empty($input['products'])) {
                http_response_code(400);
                echo json_encode(['message' => "Products must be a non-empty array"]);
                exit;
            }
            
            $validMethods = ['cash', 'credit', 'account_transfer'];
            if (!in_array($input['payment_method'], $validMethods)) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid payment method']);
                exit;
            }

            $pdo->beginTransaction();
            try {
                // Create parent transaction record
                $stmt = $pdo->prepare("
                    INSERT INTO transactions 
                        (user_id, organization_id, payment_method, bank_name, comment, unpaid_amount, customer_name, transaction_date)
                    VALUES 
                        (:user_id, :organization_id, :payment_method, :bank_name, :comment, :unpaid_amount, :customer_name, NOW())
                ");
                $bankName = $input['bank_name'] ?? '';
                $unpaidAmount = $input['unpaid_amount'] ?? 0;
                $customerName = $input['to_whom'] ?? '';
                $stmt->execute([
                    ':user_id' => $loggedInUserId,
                    ':organization_id' => $organizationId,
                    ':payment_method' => $input['payment_method'],
                    ':bank_name' => $bankName,
                    ':comment' => ($input['payment_method'] === 'credit') ? $customerName : ($input['comment'] ?? ''),
                    ':unpaid_amount' => $unpaidAmount,
                    ':customer_name' => $customerName
                ]);
                $transactionId = $pdo->lastInsertId();

                // Process each product
                foreach ($input['products'] as $product) {
                    // Validate product data
                    if (!isset($product['product_id'], $product['quantity_sold'], $product['sold_price'])) {
                        throw new Exception("Each product must have product_id, quantity_sold, and sold_price");
                    }

                    // Get current inventory and verify product belongs to organization
                    $stmt = $pdo->prepare("SELECT pi.quantity, pi.status FROM product_inventory pi
                                           JOIN products p ON pi.product_id = p.id
                                           WHERE pi.product_id = :product_id AND p.organization_id = :organization_id");
                    $stmt->execute([':product_id' => $product['product_id'], ':organization_id' => $organizationId]);
                    $inventory = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$inventory) {
                        throw new Exception("Product {$product['product_id']} not found or not part of your organization");
                    }
                    if ($inventory['status'] !== 'in_store') {
                        throw new Exception("Product {$product['product_id']} is not available for sale");
                    }
                    if ($inventory['quantity'] < $product['quantity_sold']) {
                        throw new Exception("Insufficient quantity in stock for product {$product['product_id']}");
                    }

                    // Update inventory
                    $newQuantity = $inventory['quantity'] - $product['quantity_sold'];
                    $newStatus = $newQuantity > 0 ? 'in_store' : 'sold';
                    $stmt = $pdo->prepare("UPDATE product_inventory SET quantity = :quantity, status = :status, status_changed_at = NOW()
                                           WHERE product_id = :product_id");
                    $stmt->execute([
                        ':quantity' => $newQuantity,
                        ':status' => $newStatus,
                        ':product_id' => $product['product_id']
                    ]);

                    // Add to transaction_items
                    $stmt = $pdo->prepare("
                        INSERT INTO transaction_items 
                            (transaction_id, product_id, quantity, unit_price)
                        VALUES 
                            (:transaction_id, :product_id, :quantity, :unit_price)
                    ");
                    $stmt->execute([
                        ':transaction_id' => $transactionId,
                        ':product_id' => $product['product_id'],
                        ':quantity' => $product['quantity_sold'],
                        ':unit_price' => $product['sold_price']
                    ]);

                    // Record in product_transactions (for backward compatibility)
                    $stmt = $pdo->prepare("
                        INSERT INTO product_transactions 
                            (product_id, quantity, previous_status, new_status, user_id, comment, Sold_Price, payment_method, organization_id, bank_name, unpaid_amount) 
                        VALUES 
                            (:product_id, :quantity, :previous_status, :new_status, :user_id, :comment, :sold_price, :payment_method, :organization_id, :bank_name, :unpaid_amount) 
                    ");
                    $stmt->execute([
                        ':product_id' => $product['product_id'],
                        ':quantity' => $product['quantity_sold'],
                        ':previous_status' => 'in_store',
                        ':new_status' => $newStatus,
                        ':user_id' => $loggedInUserId,
                        ':comment' => ($input['payment_method'] === 'credit') ? $customerName : ($input['comment'] ?? ''),
                        ':sold_price' => $product['sold_price'],
                        ':payment_method' => $input['payment_method'],
                        ':organization_id' => $organizationId,
                        ':bank_name' => $bankName,
                        ':unpaid_amount' => $unpaidAmount
                    ]);
                }

                $pdo->commit();
                http_response_code(200);
                echo json_encode(['message' => 'Transaction completed successfully', 'transaction_id' => $transactionId]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['message' => 'Transaction failed: ' . $e->getMessage()]);
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
            $labels        = [];
            $week          = (int)date('W', strtotime($start));
            $year          = (int)date('o', strtotime($start));
            $currentWeek   = (int)date('W');
            $currentYear   = (int)date('o');
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
              p.id          AS product_id,
              p.name        AS product_name,
              pt.quantity   AS quantity_sold,
              pt.Sold_Price,
              pt.payment_method,
              DATE_ADD(pt.transaction_date, INTERVAL 1 HOUR) AS transaction_date,
              HOUR(DATE_ADD(pt.transaction_date, INTERVAL 1 HOUR)) AS transaction_hour
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
              DATE_ADD(s.transaction_date, INTERVAL 1 HOUR) AS transaction_date,
              HOUR(DATE_ADD(s.transaction_date, INTERVAL 1 HOUR)) AS transaction_hour
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
            'productTransactions' => $productRows,         // [{…product tx…}, …]
            'spendingTransactions'=> $spendingRows         // [{…spending tx…}, …]
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

case 'create_worker':
            // validate
            if (empty($input['name'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Worker name is required.'
                ]);
                exit;
            }

            // insert
            $stmt = $pdo->prepare("
                INSERT INTO workers (organization_id, name, paid_commission, unpaid_commission)
                VALUES (:org, :name, 0, 0)
            ");
            $stmt->execute([
                ':org'  => $organizationId,
                ':name' => trim($input['name'])
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Worker created successfully.'
            ]);
            break;

case 'get_vehicles':
    $stmt = $pdo->prepare("SELECT id, name, tariff FROM vehicles WHERE organization_id = :org");
    $stmt->execute([':org' => $organizationId]);
    $vehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'vehicles' => $vehicles]);
    break;

case 'create_vehicle':
    if (empty($input['name']) || !isset($input['tariff'])) {
        http_response_code(400);
        echo json_encode(['success'=>false,'message'=>'Name and tariff required.']);
        exit;
    }
    $stmt = $pdo->prepare("
      INSERT INTO vehicles (organization_id, name, tariff, partial_tariff)
      VALUES (:org, :name, :tariff, :partial_tariff)
    ");
    $stmt->execute([
      ':org'    => $organizationId,
      ':name'   => trim($input['name']),
      ':tariff' => floatval($input['tariff']),
      ':partial_tariff' => floatval($input['partial_tariff'] ?? 0)
    ]);
    echo json_encode(['success'=>true,'message'=>'Vehicle added.']);
    break;

case 'update_vehicle':
    if (empty($input['id']) || empty($input['name']) || !isset($input['tariff'])) {
        http_response_code(400);
        echo json_encode(['success'=>false,'message'=>'ID, name and tariff required.']);
        exit;
    }
    $stmt = $pdo->prepare("
      UPDATE vehicles
      SET name = :name, tariff = :tariff, partial_tariff = :partial_tariff
      WHERE id = :id AND organization_id = :org
    ");
    $stmt->execute([
      ':id'     => intval($input['id']),
      ':org'    => $organizationId,
      ':name'   => trim($input['name']),
      ':tariff' => floatval($input['tariff']),
      ':partial_tariff' => floatval($input['partial_tariff'] ?? 0)
    ]);
    echo json_encode(['success'=>true,'message'=>'Vehicle updated.']);
    break;





case 'get_unpaid_workers':
        $stmt = $pdo->prepare("
          SELECT id, name, unpaid_commission 
            FROM workers 
           WHERE organization_id = :org 
             AND unpaid_commission >= 0
        ");
        $stmt->execute([':org'=>$organizationId]);
        echo json_encode(['success'=>true,'workers'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // 2) List vehicles (includes full and partial tariffs)
    case 'get_vehicless':
        $stmt = $pdo->prepare("
          SELECT id, name, tariff, partial_tariff 
            FROM vehicles 
           WHERE organization_id = :org
        ");
        $stmt->execute([':org'=>$organizationId]);
        echo json_encode(['success'=>true,'vehicles'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // 3) Record a carwash transaction
    case 'create_carwash_transaction':
    if (empty($input['worker_ids']) || !is_array($input['worker_ids']) || 
        empty($input['vehicle_id']) || !isset($input['wash_type']) || 
        empty($input['payment_method'])) {
        
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All fields required.']);
        exit;
    }

    $workerIds = $input['worker_ids'];
    $vehicleId = intval($input['vehicle_id']);
    $washType = $input['wash_type'];
    $paymentMethod = trim($input['payment_method']);
    $numWorkers = count($workerIds);
    $bankName = $input['bank_name'] ?? '';

    // Validate bank selection for bank payments
    if ($paymentMethod === 'Bank' && empty($bankName)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Bank selection required for bank payments.']);
        exit;
    }

    // Fetch vehicle tariff
    $stmt = $pdo->prepare("SELECT tariff, partial_tariff FROM vehicles 
                          WHERE id = :vid AND organization_id = :org");
    $stmt->execute([':vid' => $vehicleId, ':org' => $organizationId]);
    $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$vehicle) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Vehicle not found.']);
        exit;
    }
    $tariff = ($washType === 'partial') ? $vehicle['partial_tariff'] : $vehicle['tariff'];
    $totalCommission = $tariff * 0.35;
    $commissionPerWorker = $totalCommission / $numWorkers;

    $pdo->beginTransaction();

    try {
        // Encode the worker IDs array into a JSON string
        $workerIdsJson = json_encode($workerIds);

        // Create transaction record with bank name
        $stmt = $pdo->prepare("INSERT INTO carwash_transactions
                              (organization_id, user_id, vehicle_id, tariff, commission_amount,
                              transaction_date, payment_method, worker_id, worker_ids, bank_name)
                              VALUES (:org, :uid, :vid, :tariff, :commission, NOW(), :pm, :main_worker_id, :all_worker_ids, :bank_name)");
        $stmt->execute([
            ':org' => $organizationId,
            ':uid' => $loggedInUserId,
            ':vid' => $vehicleId,
            ':tariff' => $tariff,
            ':commission' => $totalCommission,
            ':pm' => $paymentMethod,
            ':main_worker_id' => $workerIds[0],
            ':all_worker_ids' => $workerIdsJson,
            ':bank_name' => $bankName
        ]);

        // Update each worker's commission
        foreach ($workerIds as $workerId) {
            $stmt = $pdo->prepare("UPDATE workers
                                  SET unpaid_commission = unpaid_commission + :commission
                                  WHERE id = :wid AND organization_id = :org");
            $stmt->execute([
                ':commission' => $commissionPerWorker,
                ':wid' => $workerId,
                ':org' => $organizationId
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Transaction recorded.']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    break;

    // 4) Pay out a worker’s unpaid commission
    case 'pay_commission':
        if (empty($input['worker_id'])) {
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>'Worker ID required.']);
            exit;
        }
        $w = intval($input['worker_id']);
        // fetch unpaid amount
        $stmt = $pdo->prepare("
          SELECT unpaid_commission 
            FROM workers 
           WHERE id = :wid AND organization_id = :org
        ");
        $stmt->execute([':wid'=>$w,':org'=>$organizationId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || $row['unpaid_commission'] <= 0) {
            echo json_encode(['success'=>false,'message'=>'Nothing to pay.']);
            exit;
        }
        $amt = $row['unpaid_commission'];
        $pdo->beginTransaction();
        // zero unpaid, add to paid
        $upd = $pdo->prepare("
          UPDATE workers
             SET paid_commission   = paid_commission + :amt,
                 unpaid_commission = 0
           WHERE id = :wid AND organization_id = :org
        ");
        $upd->execute([':amt'=>$amt,':wid'=>$w,':org'=>$organizationId]);
        // record in paid_commissions
        $ins = $pdo->prepare("
          INSERT INTO paid_commissions
            (organization_id,worker_id,amount,paid_at)
          VALUES
            (:org,:wid,:amt,NOW())
        ");
        $ins->execute([':org'=>$organizationId,':wid'=>$w,':amt'=>$amt]);
        $pdo->commit();

        echo json_encode(['success'=>true,'message'=>'Commission paid.']);
        break;




case 'get_commission_summary':
    $filter = $_GET['filter'] ?? $input['filter'] ?? 'daily';
    // decide date window
    if ($filter === 'weekly') {
        $start = "DATE_SUB(CURDATE(), INTERVAL 6 DAY)";          // 7-day window
        $end   = "NOW()";
        $between = " BETWEEN $start AND $end";
    } elseif ($filter === 'monthly') {
        $start = "CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m'), '-01 00:00:00')";
        $end   = "NOW()";
        $between = " BETWEEN $start AND $end";
    } else {
        // daily: use passed start/end
        $start = $input['start'] ?? $_GET['start'];
        $end   = $input['end']   ?? $_GET['end'];
        $between = " BETWEEN :start AND :end";
    }

    // summary of workers
    $w = $pdo->prepare("
      SELECT
        COALESCE(SUM(unpaid_commission),0) AS total_unpaid,
        COALESCE(SUM(paid_commission),0)   AS total_paid
      FROM workers
     WHERE organization_id = :org
    ");
    $w->execute([':org'=>$organizationId]);
    $resW = $w->fetch(PDO::FETCH_ASSOC);

    // tariff sum in carwash_transactions
    $t = $pdo->prepare("
      SELECT COALESCE(SUM(tariff),0) AS tariff_sum
        FROM carwash_transactions
       WHERE organization_id = :org
         AND transaction_date $between
    ");
    // bind parameters only for daily
    if ($filter === 'daily') {
      $t->execute([':org'=>$organizationId, ':start'=>$start, ':end'=>$end]);
    } else {
      $t->execute([':org'=>$organizationId]);
    }
    $resT = $t->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
      'success'     => true,
      'total_unpaid'=> $resW['total_unpaid'],
      'total_paid'  => $resW['total_paid'],
      'tariff_sum'  => $resT['tariff_sum']
    ]);
    break;

case 'get_carwash_transactions':
    $filter = $_GET['filter'] ?? 'daily';
    // same date logic…
    if ($filter==='weekly') {
      $whereDate = "cw.transaction_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND NOW()";
    } elseif ($filter==='monthly') {
      $whereDate = "cw.transaction_date BETWEEN CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m'), '-01 00:00:00') AND NOW()";
    } else {
      $whereDate = "cw.transaction_date BETWEEN :start AND :end";
    }
    $sql = "
      SELECT cw.id, w.name AS worker_name, v.name AS vehicle_name,
             cw.tariff, cw.commission_amount, cw.transaction_date, cw.payment_method
        FROM carwash_transactions cw
        JOIN workers w ON cw.worker_id = w.id
        JOIN vehicles v ON cw.vehicle_id = v.id
       WHERE cw.organization_id = :org
         AND $whereDate
       ORDER BY cw.transaction_date DESC
    ";
    $q = $pdo->prepare($sql);
    if ($filter==='daily') {
      $q->execute([':org'=>$organizationId, ':start'=>$_GET['start'], ':end'=>$_GET['end']]);
    } else {
      $q->execute([':org'=>$organizationId]);
    }
    echo json_encode(['success'=>true,'transactions'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
    break;

case 'get_paid_commissions':
    $filter = $_GET['filter'] ?? 'daily';
    if ($filter==='weekly') {
      $whereDate = "pc.paid_at BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND NOW()";
    } elseif ($filter==='monthly') {
      $whereDate = "pc.paid_at BETWEEN CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m'), '-01 00:00:00') AND NOW()";
    } else {
      $whereDate = "pc.paid_at BETWEEN :start AND :end";
    }
    $sql = "
      SELECT pc.id, w.name AS worker_name, pc.amount, pc.paid_at
        FROM paid_commissions pc
        JOIN workers w ON pc.worker_id = w.id
       WHERE pc.organization_id = :org
         AND $whereDate
       ORDER BY pc.paid_at DESC
    ";
    $q = $pdo->prepare($sql);
    if ($filter==='daily') {
      $q->execute([':org'=>$organizationId, ':start'=>$_GET['start'], ':end'=>$_GET['end']]);
    } else {
      $q->execute([':org'=>$organizationId]);
    }
    echo json_encode(['success'=>true,'commissions'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
    break;

case 'get_carwash_spendings':
    $filter = $_GET['filter'] ?? 'daily';
    if ($filter==='weekly') {
      $whereDate = "cs.transaction_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND NOW()";
    } elseif ($filter==='monthly') {
      $whereDate = "cs.transaction_date BETWEEN CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m'), '-01 00:00:00') AND NOW()";
    } else {
      $whereDate = "cs.transaction_date BETWEEN :start AND :end";
    }
    $sql = "
      SELECT cs.id,
             w.name       AS worker_name,
             cs.amount,
             cs.category,
             cs.reason,
             cs.transaction_date
        FROM car_spendings cs
        JOIN workers w ON cs.user_id = w.id
       WHERE cs.organization_id = :org
         AND $whereDate
       ORDER BY cs.transaction_date DESC
    ";
    $q = $pdo->prepare($sql);
    if ($filter==='daily') {
      $q->execute([':org'=>$organizationId, ':start'=>$_GET['start'], ':end'=>$_GET['end']]);
    } else {
      $q->execute([':org'=>$organizationId]);
    }
    echo json_encode(['success'=>true,'spendings'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
    break;

case 'get_unpaid_transactions':
    $stmt = $pdo->prepare("SELECT * FROM product_transactions WHERE unpaid_amount > 0 AND organization_id = :org_id");
    $stmt->execute([':org_id' => $organizationId]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    break;

case 'pay_unpaid_amount':
    $data = $input;
    $stmt = $pdo->prepare("UPDATE product_transactions SET unpaid_amount = unpaid_amount - :amount WHERE id = :id");
    $stmt->execute([':amount' => $data['amount'], ':id' => $data['transaction_id']]);
    echo json_encode(['success' => true]);
    break;

    // … previous cases …

       case 'manageProduct':
        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['message' => 'Unauthorized']);
            exit;
        }
        // Decide insert vs. update
        if (isset($input['product_id']) && $input['product_id']) {
            // === UPDATE ===
            // (Copy your updateProduct logic here)
            $required = ['product_id','name','import_price','selling_price','quantity','status'];
            foreach ($required as $f) {
                if (!isset($input[$f])) {
                    http_response_code(400);
                    echo json_encode(['message'=>"$f is required"]);
                    exit;
                }
            }
            $pdo->beginTransaction();
            try {
                // Scoped product update
                $stmt = $pdo->prepare(
                  "UPDATE products SET
                     name=?, description=?, import_price=?, selling_price=?
                   WHERE id=? AND organization_id=?"
                );
                $stmt->execute([
                  $input['name'], $input['description'] ?? '',
                  $input['import_price'], $input['selling_price'],
                  $input['product_id'], $organizationId
                ]);
                $stmt = $pdo->prepare(
                  "UPDATE product_inventory
                     SET quantity=?, status=?, status_changed_at=NOW()
                   WHERE product_id=?"
                );
                $stmt->execute([
                  $input['quantity'], $input['status'], $input['product_id']
                ]);
                recordActivity($pdo, $loggedInUserId, 'product_update',
                               "Updated product ID: {$input['product_id']}", $organizationId);
                $pdo->commit();
                echo json_encode(['message'=>'Product updated']);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['message'=>'Update failed: '.$e->getMessage()]);
            }
        } else {
            // === INSERT ===
            $required = ['name','category','import_price','selling_price','quantity','status'];
            foreach ($required as $f) {
                if (empty($input[$f])) {
                    http_response_code(400);
                    echo json_encode(['message'=>"$f is required"]);
                    exit;
                }
            }
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare(
                  "INSERT INTO products
                   (name, description, category, import_price, selling_price, organization_id)
                   VALUES (:name, :description, :category, :import_price, :selling_price, :org)"
                );
                $stmt->execute([
                  ':name' => $input['name'],
                  ':description' => $input['description'] ?? '',
                  ':category' => $input['category'],
                  ':import_price' => $input['import_price'],
                  ':selling_price' => $input['selling_price'],
                  ':org' => $organizationId
                ]);
                $pid = $pdo->lastInsertId();
                $stmt = $pdo->prepare(
                  "INSERT INTO product_inventory
                   (product_id, quantity, status)
                   VALUES (:pid, :quantity, :status)"
                );
                $stmt->execute([
                  ':pid' => $pid,
                  ':quantity' => $input['quantity'],
                  ':status'   => $input['status']
                ]);
                $pdo->commit();
                http_response_code(201);
                echo json_encode(['message'=>'Product added','product_id'=>$pid]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['message'=>'Add failed: '.$e->getMessage()]);
            }
        }
        break;

    

    // … existing getProducts, getProductDetails …  

        case 'checkout':
            try {
                // Validate cart data
                if (empty($input['cart'])) {
                    throw new Exception("Cart data is required");
                }
                
                $cart = json_decode($input['cart'], true);
                $paymentMethod = $input['payment_method'] ?? 'cash';
                $bankName = $input['bank_name'] ?? '';
                $customerName = $input['customer_name'] ?? '';
                $unpaidAmount = floatval($input['unpaid_amount'] ?? 0);
                $comment = $input['comment'] ?? '';

                // Begin transaction
                $pdo->beginTransaction();

                // 1. Create transaction record
                $stmt = $pdo->prepare("INSERT INTO transactions 
                    (user_id, organization_id, payment_method, bank_name, comment, unpaid_amount, customer_name, transaction_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
                $stmt->execute([
                    $loggedInUserId, 
                    $organizationId,
                    $paymentMethod, 
                    $bankName, 
                    $comment, 
                    $unpaidAmount, 
                    $customerName
                ]);
                $transactionId = $pdo->lastInsertId();

                // 2. Process each cart item
                foreach ($cart as $item) {
                    if (empty($item['product_id']) || empty($item['quantity']) || empty($item['price'])) {
                        throw new Exception("Invalid cart item format");
                    }

                    // Insert transaction item
                    $stmt = $pdo->prepare("INSERT INTO transaction_items 
                        (transaction_id, product_id, quantity, unit_price)
                        VALUES (?, ?, ?, ?)");
                    $stmt->execute([
                        $transactionId,
                        $item['product_id'],
                        $item['quantity'],
                        $item['price']
                    ]);

                    // Update inventory
                    $stmt = $pdo->prepare("UPDATE product_inventory 
                        SET quantity = quantity - ? 
                        WHERE product_id = ? AND quantity >= ?");
                    $stmt->execute([$item['quantity'], $item['product_id'], $item['quantity']]);

                    if ($stmt->rowCount() === 0) {
                        throw new Exception("Insufficient inventory for product ID: " . $item['product_id']);
                    }
                }

                // Commit transaction
                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Checkout completed',
                    'transaction_id' => $transactionId
                ]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
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
