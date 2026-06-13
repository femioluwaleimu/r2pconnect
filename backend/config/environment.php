<?php
/**
 * Environment Configuration Loader
 */

function loadEnvFile($path = '.env') {
    if (!file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        // Parse key=value
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // Remove quotes
            if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
                (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)) {
                $value = substr($value, 1, -1);
            }

            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

// Load example defaults first, then root/backend .env values override them.
$env_files = [
    BASE_PATH . '/.env.example',
    dirname(BASE_PATH) . '/.env',
    BASE_PATH . '/.env',
];

foreach ($env_files as $env_file) {
    if (file_exists($env_file)) {
        loadEnvFile($env_file);
    }
}

// Helper function to get env variables
if (!function_exists('env')) {
    function env($key, $default = null) {
        $value = getenv($key);
        if ($value === false) {
            return $default;
        }
        return $value;
    }
}

// Helper function for configuration
if (!function_exists('config')) {
    function config($key, $default = null) {
        $parts = explode('.', $key);
        $config_name = array_shift($parts);
        
        $config_file = BASE_PATH . '/config/' . $config_name . '.php';
        if (!file_exists($config_file)) {
            return $default;
        }

        $config = require $config_file;
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
