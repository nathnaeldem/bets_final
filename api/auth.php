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
$protectedRoutes = ['addProduct','add_bank_deposit', 'updateProduct', 'updateProductStatus','manageProduct', 'getProducts', 'getProductDetails', 'sellProduct', 'add_spending','add_car_spending', 'get_reports','change_password','register_user','create_worker','update_vehicle','get_vehicless','create_vehicle','get_unpaid_workers','get_carwash_spendings',
    'get_vehicles',               // ← make sure this is here
    'create_carwash_transaction',
    'pay_commission',
    'create_vehicle',
    'getAnalyticsAndReports',
    'get_unpaid_transactions', 'pay_unpaid_amount',
    'update_vehicle','get_commission_summary',
  'get_carwash_transactions',
  'get_paid_commissions',
  'checkout','orderProduct', 'receiveOrder', 'payOrderCredit', 'getProductOrders']; // Added checkout here
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
