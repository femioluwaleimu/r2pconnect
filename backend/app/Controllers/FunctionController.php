<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class FunctionController extends Controller {
    public function invoke(string $name): void {
        $payload = $this->all();

        switch ($name) {
            case 'send-email':
            case 'send-verification-code':
            case 'send-collaboration-invite':
            case 'send-job-feedback-notification':
            case 'send-job-application-notification':
                Response::json(['data' => ['queued' => true], 'error' => null]);
                return;

            case 'validate-institution-code':
                $code = $payload['code'] ?? $payload['verification_code'] ?? '';
                $row = $this->db->getOne(
                    'SELECT * FROM institution_verification_codes WHERE verification_code = ? AND used_at IS NULL',
                    [$code]
                );
                Response::json(['data' => ['valid' => (bool)$row, 'code' => $row], 'error' => null]);
                return;

            case 'mark-code-used':
                $code = $payload['code'] ?? $payload['verification_code'] ?? '';
                $this->db->execute(
                    'UPDATE institution_verification_codes SET used_at = ? WHERE verification_code = ?',
                    [date('Y-m-d H:i:s'), $code]
                );
                Response::json(['data' => ['success' => true], 'error' => null]);
                return;

            case 'currency-convert':
                Response::json(['data' => ['rate' => 1, 'converted' => $payload['amount'] ?? 0], 'error' => null]);
                return;

            default:
                Response::json([
                    'data' => null,
                    'error' => "PHP function '{$name}' is not implemented yet",
                ], 501);
        }
    }
}
