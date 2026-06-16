<?php
/**
 * Authentication Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;
use App\Core\JWT;
use App\Models\User;

class Auth extends Controller {
    private User $userModel;
    private array $tableColumns = [];

    public function __construct() {
        parent::__construct();
        $this->userModel = new User();
    }

    private function getTableColumns(string $table): array {
        if (!isset($this->tableColumns[$table])) {
            $rows = $this->db->getAll("SHOW COLUMNS FROM `{$table}`");
            $this->tableColumns[$table] = array_column($rows, 'Field');
        }

        return $this->tableColumns[$table];
    }

    private function insertExistingColumns(string $table, array $values): void {
        $columns = $this->getTableColumns($table);
        $filtered = array_filter(
            $values,
            fn($_value, $key) => in_array($key, $columns, true),
            ARRAY_FILTER_USE_BOTH
        );

        if (empty($filtered)) {
            return;
        }

        $columnSql = implode(', ', array_map(fn($column) => "`{$column}`", array_keys($filtered)));
        $placeholders = implode(', ', array_fill(0, count($filtered), '?'));
        $this->db->execute(
            "INSERT INTO `{$table}` ({$columnSql}) VALUES ({$placeholders})",
            array_values($filtered)
        );
    }

    /**
     * Register user
     */
    public function register(): void {
        // Validate input
        if (!$this->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8',
        ])) {
            return;
        }

        $email = $this->input('email');
        $password = $this->input('password');
        if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
            Response::validationError([
                'password' => ['Password is too weak. Use at least 8 characters with one letter and one number.'],
            ]);
            return;
        }
        $firstName = $this->input('first_name', '');
        $lastName = $this->input('last_name', '');
        $fullName = trim((string)$this->input('full_name', ''));
        if ($fullName === '') {
            $fullName = trim($firstName . ' ' . $lastName);
        }
        if ($fullName === '') {
            $fullName = explode('@', $email)[0] ?? $email;
        }
        $role = (string)$this->input('role', 'researcher');
        $institutionId = $this->input('institution_id');
        $department = trim((string)$this->input('department', ''));
        $phoneNumber = trim((string)$this->input('phone_number', ''));
        $researcherType = $this->input('researcher_type');
        $assignedSupervisorId = $this->input('assigned_supervisor_id');
        $academicRank = trim((string)$this->input('academic_rank', ''));
        $staffId = trim((string)$this->input('staff_id', ''));

        try {
            $this->db->beginTransaction();

            // Create user
            $user = $this->userModel->createUser([
                'email' => $email,
                'password' => $password,
                'display_name' => $fullName,
            ]);

            if (!$user) {
                $this->db->rollback();
                Response::error('Failed to create user', 500);
                return;
            }

            // Create profile
            $userId = $user['id'];
            $this->insertExistingColumns('profiles', [
                'id' => generateUUID(),
                'user_id' => $userId,
                'full_name' => $fullName,
                'email' => $email,
                'phone_number' => $phoneNumber !== '' ? $phoneNumber : null,
                'institution_id' => $institutionId ?: null,
                'department' => $department !== '' ? $department : null,
                'researcher_type' => $researcherType ?: null,
                'assigned_supervisor_id' => $assignedSupervisorId ?: null,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            // Assign role
            $this->insertExistingColumns('user_roles', [
                'id' => generateUUID(),
                'user_id' => $userId,
                'role' => $role,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            // Create supervisor record immediately for supervisor registrations.
            if ($role === 'supervisor') {
                $this->insertExistingColumns('supervisors', [
                    'id' => generateUUID(),
                    'user_id' => $userId,
                    'institution_id' => $institutionId ?: null,
                    'department' => $department !== '' ? $department : null,
                    'academic_rank' => $academicRank !== '' ? $academicRank : null,
                    'staff_id' => $staffId !== '' ? $staffId : null,
                    'is_active' => 0,
                    'verification_status' => 'pending_verification',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
            }

            // Generate token
            $token = JWT::generate([
                'sub' => $userId,
                'email' => $email,
                'type' => 'access'
            ]);

            $this->db->commit();

            $user['full_name'] = $fullName;
            $user['role'] = $role;
            $user['institution_id'] = $institutionId ?: null;
            $user['department'] = $department !== '' ? $department : null;

            Response::created([
                'user' => $user,
                'token' => $token
            ]);
        } catch (\Exception $e) {
            try {
                $this->db->rollback();
            } catch (\Throwable $rollbackError) {
                error_log("Registration rollback error: " . $rollbackError->getMessage());
            }
            error_log("Registration error: " . $e->getMessage());
            Response::error(
                getenv('APP_DEBUG') === 'true' ? 'Registration failed: ' . $e->getMessage() : 'Registration failed',
                500
            );
        }
    }

    /**
     * Login user
     */
    public function login(): void {
        // Validate input
        if (!$this->validate([
            'email' => 'required|email',
            'password' => 'required',
        ])) {
            return;
        }

        $email = $this->input('email');
        $password = $this->input('password');

        try {
            // Find user
            $user = $this->userModel->findByEmail($email);
            if (!$user) {
                Response::error('Invalid credentials', 401);
                return;
            }

            // Verify password
            if (!$this->userModel->verifyPassword($password, $user['password_hash'] ?? $user['password'] ?? '')) {
                Response::error('Invalid credentials', 401);
                return;
            }

            if ($this->userModel->needsPasswordRehash($user['password_hash'] ?? $user['password'] ?? '')) {
                try {
                    $this->userModel->updatePasswordHash($user['id'], $password);
                } catch (\Throwable $e) {
                    error_log("Password rehash failed: " . $e->getMessage());
                }
            }

            // Generate token
            $token = JWT::generate([
                'sub' => $user['id'],
                'email' => $user['email'],
                'type' => 'access'
            ]);

            // Get user profile
            $userWithProfile = $this->userModel->getUserWithProfile($user['id']);

            Response::success([
                'user' => $userWithProfile,
                'token' => $token
            ], 'Login successful');
        } catch (\Exception $e) {
            error_log("Login error: " . $e->getMessage());
            Response::error(
                getenv('APP_DEBUG') === 'true' ? 'Login failed: ' . $e->getMessage() : 'Login failed',
                500
            );
        }
    }

    /**
     * Get current user
     */
    public function me(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $userWithProfile = $this->userModel->getUserWithProfile($user['sub']);

            if (!$userWithProfile) {
                Response::notFound('User not found');
                return;
            }

            Response::success($userWithProfile);
        } catch (\Exception $e) {
            error_log("Get user error: " . $e->getMessage());
            Response::error('Failed to get user', 500);
        }
    }

    /**
     * Logout user (client-side token removal)
     */
    public function logout(): void {
        $this->requireAuth();

        // Token invalidation can be handled client-side
        // Optionally store token in blacklist table
        
        Response::success(null, 'Logout successful');
    }

    /**
     * Refresh token
     */
    public function refreshToken(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            $newToken = JWT::generate([
                'sub' => $user['sub'],
                'email' => $user['email'],
                'type' => 'access'
            ]);

            Response::success(['token' => $newToken]);
        } catch (\Exception $e) {
            error_log("Token refresh error: " . $e->getMessage());
            Response::error('Failed to refresh token', 500);
        }
    }

    /**
     * Request password reset
     */
    public function requestPasswordReset(): void {
        if (!$this->validate(['email' => 'required|email'])) {
            return;
        }

        $email = $this->input('email');

        try {
            $user = $this->userModel->findByEmail($email);
            if (!$user) {
                // Don't reveal if email exists (security best practice)
                Response::success(null, 'If email exists, reset link has been sent');
                return;
            }

            // Generate reset token
            $resetToken = JWT::generate([
                'sub' => $user['id'],
                'type' => 'password_reset'
            ], 3600); // 1 hour expiry

            // Store token in database
            $sql = "INSERT INTO password_resets (user_id, token, created_at) VALUES (?, ?, ?)";
            $this->db->execute($sql, [
                $user['id'],
                $resetToken,
                date('Y-m-d H:i:s')
            ]);

            // TODO: Send email with reset link
            // Email body should contain: frontend_url/reset-password?token=$resetToken

            Response::success(null, 'If email exists, reset link has been sent');
        } catch (\Exception $e) {
            error_log("Password reset request error: " . $e->getMessage());
            Response::error('Failed to request password reset', 500);
        }
    }

    /**
     * Reset password
     */
    public function resetPassword(): void {
        if (!$this->validate([
            'token' => 'required',
            'password' => 'required|min:8',
        ])) {
            return;
        }

        $token = $this->input('token');
        $newPassword = $this->input('password');

        try {
            // Verify token
            $payload = JWT::verify($token);
            if (!$payload || $payload['type'] !== 'password_reset') {
                Response::error('Invalid reset token', 401);
                return;
            }

            $userId = $payload['sub'];

            // Check if token still exists in database
            $sql = "SELECT * FROM password_resets WHERE user_id = ? AND token = ?";
            $reset = $this->db->getOne($sql, [$userId, $token]);
            
            if (!$reset) {
                Response::error('Reset token not found', 401);
                return;
            }

            // Update password
            $hashedPassword = password_hash($newPassword, PASSWORD_ARGON2ID);
            $sql = "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?";
            $this->db->execute($sql, [
                $hashedPassword,
                date('Y-m-d H:i:s'),
                $userId
            ]);

            // Delete used reset token
            $sql = "DELETE FROM password_resets WHERE user_id = ? AND token = ?";
            $this->db->execute($sql, [$userId, $token]);

            Response::success(null, 'Password reset successfully');
        } catch (\Exception $e) {
            error_log("Password reset error: " . $e->getMessage());
            Response::error('Failed to reset password', 500);
        }
    }
}
