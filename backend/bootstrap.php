<?php
/**
 * Application Bootstrap and Configuration
 */

// Define base path
define('BASE_PATH', __DIR__);
define('APP_PATH', BASE_PATH . '/app');

function sendCorsHeaders(?array $allowedOrigins = null): void {
    if (PHP_SAPI === 'cli' || headers_sent()) {
        return;
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedOrigins = $allowedOrigins ?: ['*'];
    $allowedOrigin = in_array('*', $allowedOrigins, true)
        ? '*'
        : (in_array($origin, $allowedOrigins, true) ? $origin : ($allowedOrigins[0] ?? '*'));

    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
    header('Access-Control-Max-Age: 86400');
}

sendCorsHeaders();
if (PHP_SAPI !== 'cli' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Load environment variables
require_once BASE_PATH . '/config/environment.php';

// Error reporting
if (getenv('APP_DEBUG') === 'true') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
}

// Set timezone
date_default_timezone_set('UTC');

if (PHP_SAPI !== 'cli') {
    $allowedOrigins = array_filter(array_map('trim', explode(',', getenv('CORS_ALLOWED_ORIGINS') ?: '')));
    sendCorsHeaders($allowedOrigins ?: ['*']);
}

// Load helper functions
require_once BASE_PATH . '/utils/helpers.php';

// Autoload classes
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $base_dir = APP_PATH . '/';

    $len = strlen($prefix);
    if (strncmp($class, $prefix, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

return true;
