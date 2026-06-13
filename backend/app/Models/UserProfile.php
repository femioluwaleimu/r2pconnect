<?php
/**
 * User Profile Model
 */

namespace App\Models;

use App\Core\Model;

class UserProfile extends Model {
    protected string $table = 'user_profiles';

    /**
     * Get user profile with related data
     */
    public function getProfileWithData(string $userId): ?array {
        $sql = "
            SELECT 
                u.id,
                u.email,
                u.created_at,
                u.updated_at,
                p.first_name,
                p.last_name,
                p.display_name,
                p.avatar_url,
                p.bio,
                p.institution,
                p.research_interests,
                p.phone,
                p.location,
                (SELECT COUNT(*) FROM research_papers WHERE author_id = u.id) as papers_count,
                (SELECT COUNT(*) FROM research_papers WHERE supervisor_id = u.id) as supervising_count,
                (SELECT SUM(amount) FROM wallets WHERE user_id = u.id) as wallet_balance,
                (SELECT SUM(credits) FROM user_subscriptions WHERE user_id = u.id AND status = 'active') as active_credits
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = ?
        ";
        return $this->db->getOne($sql, [$userId]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(string $userId, array $data): bool {
        $profileData = [];
        $fields = ['first_name', 'last_name', 'display_name', 'avatar_url', 'bio', 'institution', 'research_interests', 'phone', 'location'];
        
        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $profileData[$field] = $data[$field];
            }
        }

        if (empty($profileData)) {
            return true;
        }

        $profileData['updated_at'] = date('Y-m-d H:i:s');

        // Check if profile exists
        $sql = "SELECT id FROM user_profiles WHERE user_id = ?";
        $profile = $this->db->getOne($sql, [$userId]);

        if ($profile) {
            // Update existing profile
            return $this->update($profile['id'], $profileData);
        } else {
            // Create new profile
            $profileData['id'] = generateUUID();
            $profileData['user_id'] = $userId;
            $profileData['created_at'] = date('Y-m-d H:i:s');
            $this->create($profileData);
            return true;
        }
    }

    /**
     * Search users by name or email
     */
    public function search(string $query, int $limit = 10): array {
        $query = "%$query%";
        $sql = "
            SELECT 
                u.id,
                u.email,
                p.first_name,
                p.last_name,
                p.display_name,
                p.avatar_url,
                p.institution
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE p.first_name LIKE ? 
               OR p.last_name LIKE ?
               OR p.display_name LIKE ?
               OR u.email LIKE ?
            LIMIT ?
        ";
        return $this->db->getAll($sql, [$query, $query, $query, $query, $limit]);
    }
}
