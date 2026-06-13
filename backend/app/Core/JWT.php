<?php
/**
 * JWT Authentication Handler
 */

namespace App\Core;

class JWT {
    private static string $algorithm = 'HS256';
    private static string $secret = '';

    public static function init(): void {
        self::$secret = env('JWT_SECRET', 'default-secret-change-me');
        self::$algorithm = env('JWT_ALGORITHM', 'HS256');
    }

    /**
     * Generate JWT token
     */
    public static function generate(array $payload, int $expiresIn = null): string {
        if (!self::$secret) {
            self::init();
        }

        $expiresIn = $expiresIn ?? (int)env('JWT_EXPIRATION', 86400);
        
        $header = [
            'alg' => self::$algorithm,
            'typ' => 'JWT'
        ];

        $payload['iat'] = time();
        $payload['exp'] = time() + $expiresIn;

        $headerEncoded = self::base64UrlEncode(json_encode($header));
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", self::$secret, true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return "$headerEncoded.$payloadEncoded.$signatureEncoded";
    }

    /**
     * Verify JWT token
     */
    public static function verify(string $token): ?array {
        if (!self::$secret) {
            self::init();
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

        // Verify signature
        $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", self::$secret, true);
        $signatureEncoded_calculated = self::base64UrlEncode($signature);

        if ($signatureEncoded !== $signatureEncoded_calculated) {
            return null;
        }

        // Decode payload
        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);

        if (!is_array($payload)) {
            return null;
        }

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    /**
     * Get token from Authorization header
     */
    public static function getTokenFromRequest(): ?string {
        $headers = getallheaders();
        
        if (!isset($headers['Authorization'])) {
            return null;
        }

        $authHeader = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Get current user from token
     */
    public static function getCurrentUser(): ?array {
        $token = self::getTokenFromRequest();
        
        if (!$token) {
            return null;
        }

        return self::verify($token);
    }

    /**
     * Base64 URL encode
     */
    private static function base64UrlEncode($data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     */
    private static function base64UrlDecode($data): string {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 4 - strlen($data) % 4));
    }
}

// Initialize on load
JWT::init();
