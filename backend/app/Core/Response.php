<?php
/**
 * HTTP Response Handler
 */

namespace App\Core;

class Response {
    /**
     * Send JSON response
     */
    public static function json(mixed $data, int $status = 200): void {
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Send error response
     */
    public static function error(string $message, int $status = 400, ?array $errors = null): void {
        $data = ['error' => $message];
        if ($errors) {
            $data['errors'] = $errors;
        }
        self::json($data, $status);
    }

    /**
     * Send success response
     */
    public static function success(mixed $data = null, string $message = 'Success'): void {
        $response = ['success' => true, 'message' => $message];
        if ($data !== null) {
            $response['data'] = $data;
        }
        self::json($response);
    }

    /**
     * Send created response
     */
    public static function created(mixed $data): void {
        self::json(['success' => true, 'data' => $data], 201);
    }

    /**
     * Send not found response
     */
    public static function notFound(string $message = 'Not found'): void {
        self::error($message, 404);
    }

    /**
     * Send unauthorized response
     */
    public static function unauthorized(string $message = 'Unauthorized'): void {
        self::error($message, 401);
    }

    /**
     * Send forbidden response
     */
    public static function forbidden(string $message = 'Forbidden'): void {
        self::error($message, 403);
    }

    /**
     * Send validation error response
     */
    public static function validationError(array $errors): void {
        self::json([
            'success' => false,
            'message' => 'Validation error',
            'errors' => $errors
        ], 422);
    }

    /**
     * Send server error response
     */
    public static function serverError(string $message = 'Internal server error'): void {
        self::error($message, 500);
    }
}
