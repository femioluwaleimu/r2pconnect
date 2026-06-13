<?php
/**
 * User Model
 */

namespace App\Models;

use App\Core\Model;

class User extends Model {
    protected string $table = 'users';

    /**
     * Find user by email
     */
    public function findByEmail(string $email): ?array {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE email = ?";
            $user = $this->db->getOne($sql, [$email]);
            if ($user) {
                return $this->normalizeUserRow($user);
            }
        } catch (\Throwable $e) {
            error_log("User email lookup failed: " . $e->getMessage());
        }

        try {
            $sql = "SELECT * FROM {$this->table} WHERE JSON_UNQUOTE(JSON_EXTRACT(email_data, '$.email')) = ?";
            $user = $this->db->getOne($sql, [$email]);
            return $user ? $this->normalizeUserRow($user) : null;
        } catch (\Throwable $e) {
            error_log("User email_data lookup failed: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Create new user
     */
    public function createUser(array $data): ?array {
        // Hash password
        if (isset($data['password'])) {
            $data['password_hash'] = password_hash($data['password'], PASSWORD_ARGON2ID);
            unset($data['password']);
        }

        // Set default values
        $data['id'] = $data['id'] ?? $this->generateUUID();
        $data['email_data'] = $data['email_data'] ?? json_encode([
            'email' => $data['email'] ?? null,
            'email_verified' => false,
            'confirmation_sent_at' => null,
            'confirmed_at' => null,
        ], JSON_UNESCAPED_SLASHES);
        $data['providers'] = $data['providers'] ?? json_encode(['email']);
        $data['is_sso_user'] = $data['is_sso_user'] ?? 0;
        $data['is_anonymous'] = $data['is_anonymous'] ?? 0;
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');

        return parent::create($data);
    }

    private function normalizeUserRow(array $user): array {
        if (empty($user['email']) && !empty($user['email_data'])) {
            $emailData = is_array($user['email_data'])
                ? $user['email_data']
                : json_decode((string)$user['email_data'], true);

            if (is_array($emailData) && !empty($emailData['email'])) {
                $user['email'] = $emailData['email'];
            }
        }

        return $user;
    }

    /**
     * Verify password
     */
    public function verifyPassword(string $plainPassword, string $hashedPassword): bool {
        if ($hashedPassword === '') {
            return false;
        }

        if (password_verify($plainPassword, $hashedPassword)) {
            return true;
        }

        if (strncmp($hashedPassword, '$2a$', 4) === 0) {
            $normalizedHash = '$2y$' . substr($hashedPassword, 4);
            if (password_verify($plainPassword, $normalizedHash)) {
                return true;
            }
        }

        if (strncmp($hashedPassword, '$2b$', 4) === 0) {
            $normalizedHash = '$2y$' . substr($hashedPassword, 4);
            if (password_verify($plainPassword, $normalizedHash)) {
                return true;
            }
        }

        if ((password_get_info($hashedPassword)['algoName'] ?? 'unknown') !== 'unknown') {
            return false;
        }

        return hash_equals($hashedPassword, $plainPassword);
    }

    public function needsPasswordRehash(string $hashedPassword): bool {
        if ($hashedPassword === '') {
            return false;
        }

        if ((password_get_info($hashedPassword)['algoName'] ?? 'unknown') !== 'unknown') {
            return password_needs_rehash($hashedPassword, PASSWORD_ARGON2ID);
        }

        if (preg_match('/^\$2[aby]\$\d{2}\$/', $hashedPassword) === 1) {
            return true;
        }

        return false;
    }

    public function updatePasswordHash(string $userId, string $plainPassword): bool {
        $sql = "UPDATE {$this->table} SET password_hash = ?, updated_at = ? WHERE id = ?";
        return $this->db->execute($sql, [
            password_hash($plainPassword, PASSWORD_ARGON2ID),
            date('Y-m-d H:i:s'),
            $userId,
        ]);
    }

    /**
     * Generate UUID v4
     */
    public function generateUUID(): string {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Get user with profile
     */
    public function getUserWithProfile(string $userId): ?array {
        $user = $this->find($userId);
        if (!$user) {
            return null;
        }
        $user = $this->normalizeUserRow($user);

        $sql = "
            SELECT 
                u.*,
                p.first_name,
                p.last_name,
                p.display_name,
                p.avatar_url,
                p.bio,
                p.institution,
                p.research_interests
            FROM {$this->table} u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = ?
        ";
        try {
            return $this->db->getOne($sql, [$userId]) ?: $user;
        } catch (\Throwable $e) {
            error_log("User profile join failed: " . $e->getMessage());
        }

        try {
            $sql = "
                SELECT
                    u.*,
                    p.full_name,
                    p.avatar_url,
                    p.bio,
                    p.department,
                    p.phone_number,
                    p.researcher_type,
                    p.is_verified
                FROM {$this->table} u
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE u.id = ?
            ";
            return $this->db->getOne($sql, [$userId]) ?: $user;
        } catch (\Throwable $e) {
            error_log("Legacy profile join failed: " . $e->getMessage());
        }

        return $user;
    }
}
