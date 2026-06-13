<?php
/**
 * Wallet Model
 */

namespace App\Models;

use App\Core\Model;

class Wallet extends Model {
    protected string $table = 'wallets';

    /**
     * Get user wallet
     */
    public function getUserWallet(string $userId): ?array {
        $sql = "SELECT * FROM {$this->table} WHERE user_id = ? LIMIT 1";
        return $this->db->getOne($sql, [$userId]);
    }

    /**
     * Get wallet balance
     */
    public function getBalance(string $userId): float {
        $sql = "SELECT COALESCE(SUM(amount), 0) as balance FROM {$this->table} WHERE user_id = ?";
        $result = $this->db->getOne($sql, [$userId]);
        return (float)($result['balance'] ?? 0);
    }

    /**
     * Add funds to wallet
     */
    public function addFunds(string $userId, float $amount, string $reference, string $source = 'topup'): bool {
        $wallet = $this->getUserWallet($userId);

        if (!$wallet) {
            $this->create([
                'id' => generateUUID(),
                'user_id' => $userId,
                'amount' => $amount,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }

        // Create transaction record
        $sql = "
            INSERT INTO wallet_transactions (id, user_id, type, amount, reference, source, status, created_at)
            VALUES (?, ?, 'credit', ?, ?, ?, 'completed', ?)
        ";
        
        return $this->db->execute($sql, [
            generateUUID(),
            $userId,
            $amount,
            $reference,
            $source,
            date('Y-m-d H:i:s')
        ]) > 0;
    }

    /**
     * Deduct funds from wallet
     */
    public function deductFunds(string $userId, float $amount, string $reference, string $source = 'purchase'): bool {
        $balance = $this->getBalance($userId);

        if ($balance < $amount) {
            return false;
        }

        // Create transaction record
        $sql = "
            INSERT INTO wallet_transactions (id, user_id, type, amount, reference, source, status, created_at)
            VALUES (?, ?, 'debit', ?, ?, ?, 'completed', ?)
        ";
        
        return $this->db->execute($sql, [
            generateUUID(),
            $userId,
            $amount,
            $reference,
            $source,
            date('Y-m-d H:i:s')
        ]) > 0;
    }

    /**
     * Get wallet transactions
     */
    public function getTransactions(string $userId, int $limit = 50, int $offset = 0): array {
        $sql = "
            SELECT * FROM wallet_transactions
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ";
        return $this->db->getAll($sql, [$userId, $limit, $offset]);
    }
}
