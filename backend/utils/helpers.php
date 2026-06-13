<?php
/**
 * Helper Functions
 */

/**
 * Get environment variable
 */
if (!function_exists('env')) {
    function env($key, $default = null) {
        $value = getenv($key);
        return $value !== false ? $value : $default;
    }
}

/**
 * Get configuration value
 */
if (!function_exists('config')) {
    function config($key, $default = null) {
        $parts = explode('.', $key);
        $configName = array_shift($parts);

        $configFile = BASE_PATH . '/config/' . $configName . '.php';
        if (!file_exists($configFile)) {
            return $default;
        }

        $config = require $configFile;
        foreach ($parts as $part) {
            if (is_array($config) && isset($config[$part])) {
                $config = $config[$part];
            } else {
                return $default;
            }
        }

        return $config;
    }
}

/**
 * Generate UUID v4
 */
if (!function_exists('generateUUID')) {
    function generateUUID(): string {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}

/**
 * Hash password
 */
if (!function_exists('hashPassword')) {
    function hashPassword(string $password): string {
        return password_hash($password, PASSWORD_ARGON2ID);
    }
}

/**
 * Verify password
 */
if (!function_exists('verifyPassword')) {
    function verifyPassword(string $password, string $hash): bool {
        return password_verify($password, $hash);
    }
}

/**
 * Log message
 */
if (!function_exists('log_message')) {
    function log_message(string $level, string $message): void {
        $timestamp = date('Y-m-d H:i:s');
        $logFile = env('LOG_PATH', BASE_PATH . '/logs') . '/' . date('Y-m-d') . '.log';

        // Create logs directory if it doesn't exist
        $logDir = dirname($logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        $logEntry = "[$timestamp] [$level] $message\n";
        error_log($logEntry, 3, $logFile);
    }
}

/**
 * Get current request IP
 */
if (!function_exists('getClientIP')) {
    function getClientIP(): string {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        }
        return trim($ip);
    }
}

/**
 * Sanitize string
 */
if (!function_exists('sanitize')) {
    function sanitize(string $string): string {
        return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
    }
}

/**
 * Validate email
 */
if (!function_exists('isValidEmail')) {
    function isValidEmail(string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}

/**
 * Format file size
 */
if (!function_exists('formatFileSize')) {
    function formatFileSize(int $bytes): string {
        $units = ['B', 'KB', 'MB', 'GB'];
        $size = $bytes;
        $unitIndex = 0;

        while ($size >= 1024 && $unitIndex < count($units) - 1) {
            $size /= 1024;
            $unitIndex++;
        }

        return round($size, 2) . ' ' . $units[$unitIndex];
    }
}
