<?php
/**
 * Subscription Model
 */

namespace App\Models;

use App\Core\Model;

class Subscription extends Model {
    protected string $table = 'user_subscriptions';

    /**
     * Get user active subscription
     */
    public function getUserActiveSubscription(string $userId): ?array {
        $sql = "
            SELECT * FROM {$this->table}
            WHERE user_id = ? AND status = 'active' AND expiry_date > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        ";
        return $this->db->getOne($sql, [$userId]);
    }

    /**
     * Get user subscription history
     */
    public function getUserHistory(string $userId, int $limit = 20): array {
        $sql = "
            SELECT * FROM {$this->table}
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ";
        return $this->db->getAll($sql, [$userId, $limit]);
    }

    /**
     * Create subscription
     */
    public function createSubscription(array $data): ?array {
        $data['id'] = $data['id'] ?? generateUUID();
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['status'] = $data['status'] ?? 'active';

        return $this->create($data);
    }

    /**
     * Deactivate subscription
     */
    public function deactivate(string $subscriptionId): bool {
        $sql = "UPDATE {$this->table} SET status = 'cancelled', updated_at = ? WHERE id = ?";
        return $this->db->execute($sql, [date('Y-m-d H:i:s'), $subscriptionId]) > 0;
    }
}
