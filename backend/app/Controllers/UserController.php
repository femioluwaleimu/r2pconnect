<?php
/**
 * User Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Subscription;
use App\Models\Wallet;

class UserController extends Controller {
    private User $userModel;
    private UserProfile $profileModel;
    private Subscription $subscriptionModel;
    private Wallet $walletModel;

    public function __construct() {
        parent::__construct();
        $this->userModel = new User();
        $this->profileModel = new UserProfile();
        $this->subscriptionModel = new Subscription();
        $this->walletModel = new Wallet();
    }

    /**
     * Get current user profile
     */
    public function getProfile(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $profile = $this->profileModel->getProfileWithData($user['sub']);

            if (!$profile) {
                Response::notFound('User profile not found');
                return;
            }

            Response::success($profile);
        } catch (\Exception $e) {
            error_log("Get profile error: " . $e->getMessage());
            Response::error('Failed to get profile', 500);
        }
    }

    /**
     * Get user profile by ID
     */
    public function getProfileById(string $userId): void {
        try {
            $profile = $this->profileModel->getProfileWithData($userId);

            if (!$profile) {
                Response::notFound('User profile not found');
                return;
            }

            Response::success($profile);
        } catch (\Exception $e) {
            error_log("Get user profile error: " . $e->getMessage());
            Response::error('Failed to get user profile', 500);
        }
    }

    /**
     * Update user profile
     */
    public function updateProfile(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $data = $this->all();

            // Update email if provided
            if (isset($data['email']) && $data['email'] !== $user['email']) {
                // Check if email already exists
                $existing = $this->userModel->findByEmail($data['email']);
                if ($existing) {
                    Response::error('Email already in use', 400);
                    return;
                }

                $sql = "UPDATE users SET email = ?, updated_at = ? WHERE id = ?";
                $this->db->execute($sql, [$data['email'], date('Y-m-d H:i:s'), $user['sub']]);
            }

            // Update profile
            $this->profileModel->updateProfile($user['sub'], $data);

            // Get updated profile
            $profile = $this->profileModel->getProfileWithData($user['sub']);
            Response::success($profile, 'Profile updated successfully');
        } catch (\Exception $e) {
            error_log("Update profile error: " . $e->getMessage());
            Response::error('Failed to update profile', 500);
        }
    }

    /**
     * Search users
     */
    public function search(): void {
        $query = $this->input('q', '');
        $limit = (int)$this->input('limit', 10);

        if (strlen($query) < 2) {
            Response::error('Search query must be at least 2 characters', 400);
            return;
        }

        try {
            $results = $this->profileModel->search($query, $limit);
            Response::success($results);
        } catch (\Exception $e) {
            error_log("Search users error: " . $e->getMessage());
            Response::error('Search failed', 500);
        }
    }

    /**
     * Get user subscriptions
     */
    public function getSubscriptions(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $subscriptions = $this->subscriptionModel->getUserHistory($user['sub']);

            Response::success($subscriptions);
        } catch (\Exception $e) {
            error_log("Get subscriptions error: " . $e->getMessage());
            Response::error('Failed to get subscriptions', 500);
        }
    }

    /**
     * Get active subscription
     */
    public function getActiveSubscription(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $subscription = $this->subscriptionModel->getUserActiveSubscription($user['sub']);

            if (!$subscription) {
                Response::success(null, 'No active subscription');
                return;
            }

            Response::success($subscription);
        } catch (\Exception $e) {
            error_log("Get active subscription error: " . $e->getMessage());
            Response::error('Failed to get subscription', 500);
        }
    }

    /**
     * Get wallet balance
     */
    public function getWallet(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $wallet = $this->walletModel->getUserWallet($user['sub']);
            $balance = $this->walletModel->getBalance($user['sub']);

            Response::success([
                'wallet' => $wallet,
                'balance' => $balance
            ]);
        } catch (\Exception $e) {
            error_log("Get wallet error: " . $e->getMessage());
            Response::error('Failed to get wallet', 500);
        }
    }

    /**
     * Get wallet transactions
     */
    public function getWalletTransactions(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $limit = (int)$this->input('limit', 50);
            $offset = (int)$this->input('offset', 0);

            $transactions = $this->walletModel->getTransactions($user['sub'], $limit, $offset);

            Response::success($transactions);
        } catch (\Exception $e) {
            error_log("Get wallet transactions error: " . $e->getMessage());
            Response::error('Failed to get wallet transactions', 500);
        }
    }

    /**
     * Update user role (Admin only)
     */
    public function updateRole(string $userId): void {
        $this->requireRole('admin', 'super_admin');

        if (!$this->validate(['role' => 'required'])) {
            return;
        }

        try {
            $role = $this->input('role');
            $validRoles = ['user', 'supervisor', 'researcher', 'admin'];

            if (!in_array($role, $validRoles)) {
                Response::error('Invalid role', 400);
                return;
            }

            // Delete existing role
            $sql = "DELETE FROM user_roles WHERE user_id = ?";
            $this->db->execute($sql, [$userId]);

            // Insert new role
            $sql = "INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, ?)";
            $this->db->execute($sql, [generateUUID(), $userId, $role, date('Y-m-d H:i:s')]);

            Response::success(['role' => $role], 'Role updated successfully');
        } catch (\Exception $e) {
            error_log("Update role error: " . $e->getMessage());
            Response::error('Failed to update role', 500);
        }
    }

    /**
     * List all users (Admin only)
     */
    public function listUsers(): void {
        $this->requireRole('admin', 'super_admin');

        try {
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $sql = "
                SELECT 
                    u.id,
                    u.email,
                    u.created_at,
                    p.first_name,
                    p.last_name,
                    p.display_name,
                    ur.role,
                    (SELECT COUNT(*) FROM research_papers WHERE author_id = u.id) as papers_count
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                ORDER BY u.created_at DESC
                LIMIT ? OFFSET ?
            ";

            $users = $this->db->getAll($sql, [$limit, $offset]);

            Response::success($users);
        } catch (\Exception $e) {
            error_log("List users error: " . $e->getMessage());
            Response::error('Failed to list users', 500);
        }
    }

    /**
     * Delete user account (Admin or self)
     */
    public function deleteAccount(string $userId): void {
        $currentUser = $this->getUser();
        
        // Only allow self-deletion or admin
        if ($currentUser['sub'] !== $userId) {
            $this->requireRole('admin', 'super_admin');
        }

        try {
            $this->requireAuth();

            // Soft delete - set deleted_at
            $sql = "UPDATE users SET deleted_at = ? WHERE id = ?";
            $this->db->execute($sql, [date('Y-m-d H:i:s'), $userId]);

            Response::success(null, 'Account deleted successfully');
        } catch (\Exception $e) {
            error_log("Delete account error: " . $e->getMessage());
            Response::error('Failed to delete account', 500);
        }
    }

    /**
     * Change password
     */
    public function changePassword(): void {
        $this->requireAuth();

        if (!$this->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8',
        ])) {
            return;
        }

        try {
            $user = $this->getUser();
            $currentPassword = $this->input('current_password');
            $newPassword = $this->input('new_password');

            // Get user from database
            $dbUser = $this->userModel->find($user['sub']);

            if (!$dbUser || !$this->userModel->verifyPassword($currentPassword, $dbUser['password_hash'] ?? $dbUser['password'] ?? '')) {
                Response::error('Current password is incorrect', 401);
                return;
            }

            // Update password
            $hashedPassword = password_hash($newPassword, PASSWORD_ARGON2ID);
            $sql = "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?";
            $this->db->execute($sql, [$hashedPassword, date('Y-m-d H:i:s'), $user['sub']]);

            Response::success(null, 'Password changed successfully');
        } catch (\Exception $e) {
            error_log("Change password error: " . $e->getMessage());
            Response::error('Failed to change password', 500);
        }
    }
}
