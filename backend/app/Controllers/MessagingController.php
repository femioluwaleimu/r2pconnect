<?php
/**
 * Messaging Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class MessagingController extends Controller {

    /**
     * Send message
     */
    public function sendMessage(): void {
        $this->requireAuth();

        if (!$this->validate([
            'recipient_id' => 'required',
            'message' => 'required|min:1',
        ])) {
            return;
        }

        try {
            $user = $this->getUser();
            $recipientId = $this->input('recipient_id');
            $message = $this->input('message');

            // Validate recipient exists
            $sql = "SELECT id FROM users WHERE id = ?";
            $recipient = $this->db->getOne($sql, [$recipientId]);

            if (!$recipient) {
                Response::notFound('Recipient not found');
                return;
            }

            // Create message
            $messageId = generateUUID();
            $sql = "
                INSERT INTO messages (id, sender_id, recipient_id, content, is_read, created_at)
                VALUES (?, ?, ?, ?, false, ?)
            ";

            $this->db->execute($sql, [
                $messageId,
                $user['sub'],
                $recipientId,
                $message,
                date('Y-m-d H:i:s')
            ]);

            Response::created([
                'message_id' => $messageId,
                'sender_id' => $user['sub'],
                'recipient_id' => $recipientId,
                'content' => $message,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            error_log("Send message error: " . $e->getMessage());
            Response::error('Failed to send message', 500);
        }
    }

    /**
     * Get conversation with user
     */
    public function getConversation(string $userId): void {
        $this->requireAuth();

        try {
            $currentUser = $this->getUser();
            $limit = (int)$this->input('limit', 50);
            $offset = (int)$this->input('offset', 0);

            $sql = "
                SELECT 
                    m.*,
                    sp.first_name as sender_first_name,
                    sp.last_name as sender_last_name,
                    sp.avatar_url as sender_avatar
                FROM messages m
                LEFT JOIN user_profiles sp ON m.sender_id = sp.user_id
                WHERE (
                    (m.sender_id = ? AND m.recipient_id = ?)
                    OR (m.sender_id = ? AND m.recipient_id = ?)
                )
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
            ";

            $messages = $this->db->getAll($sql, [
                $currentUser['sub'],
                $userId,
                $userId,
                $currentUser['sub'],
                $limit,
                $offset
            ]);

            // Mark as read
            $sql = "UPDATE messages SET is_read = true, read_at = ? WHERE recipient_id = ? AND sender_id = ? AND is_read = false";
            $this->db->execute($sql, [date('Y-m-d H:i:s'), $currentUser['sub'], $userId]);

            Response::success($messages);
        } catch (\Exception $e) {
            error_log("Get conversation error: " . $e->getMessage());
            Response::error('Failed to get conversation', 500);
        }
    }

    /**
     * Get conversations list
     */
    public function getConversations(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $sql = "
                SELECT 
                    CASE 
                        WHEN sender_id = ? THEN recipient_id
                        ELSE sender_id
                    END as other_user_id,
                    (SELECT MAX(id) FROM messages m2 WHERE 
                        (m2.sender_id = ? AND m2.recipient_id = m1.other_user_id)
                        OR (m2.sender_id = m1.other_user_id AND m2.recipient_id = ?)
                    ) as last_message_id,
                    (SELECT created_at FROM messages m3 WHERE id = last_message_id LIMIT 1) as last_message_time,
                    (SELECT content FROM messages m4 WHERE id = last_message_id LIMIT 1) as last_message_content,
                    (SELECT COUNT(*) FROM messages m5 
                        WHERE m5.recipient_id = ? AND m5.sender_id = m1.other_user_id AND m5.is_read = false
                    ) as unread_count,
                    (SELECT CONCAT(p.first_name, ' ', p.last_name) FROM user_profiles p WHERE p.user_id = m1.other_user_id) as other_user_name,
                    (SELECT avatar_url FROM user_profiles p WHERE p.user_id = m1.other_user_id) as other_user_avatar
                FROM messages m1
                WHERE sender_id = ? OR recipient_id = ?
                GROUP BY other_user_id
                ORDER BY last_message_time DESC
                LIMIT ? OFFSET ?
            ";

            $conversations = $this->db->getAll($sql, [
                $user['sub'],
                $user['sub'],
                $user['sub'],
                $user['sub'],
                $user['sub'],
                $user['sub'],
                $limit,
                $offset
            ]);

            Response::success($conversations);
        } catch (\Exception $e) {
            error_log("Get conversations error: " . $e->getMessage());
            Response::error('Failed to get conversations', 500);
        }
    }

    /**
     * Mark message as read
     */
    public function markAsRead(string $messageId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            // Verify recipient
            $sql = "SELECT recipient_id FROM messages WHERE id = ?";
            $message = $this->db->getOne($sql, [$messageId]);

            if (!$message || $message['recipient_id'] !== $user['sub']) {
                Response::forbidden();
                return;
            }

            $sql = "UPDATE messages SET is_read = true, read_at = ? WHERE id = ?";
            $this->db->execute($sql, [date('Y-m-d H:i:s'), $messageId]);

            Response::success(null, 'Message marked as read');
        } catch (\Exception $e) {
            error_log("Mark as read error: " . $e->getMessage());
            Response::error('Failed to mark message as read', 500);
        }
    }

    /**
     * Delete message
     */
    public function deleteMessage(string $messageId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            // Verify sender or recipient
            $sql = "SELECT sender_id, recipient_id FROM messages WHERE id = ?";
            $message = $this->db->getOne($sql, [$messageId]);

            if (!$message || ($message['sender_id'] !== $user['sub'] && $message['recipient_id'] !== $user['sub'])) {
                Response::forbidden();
                return;
            }

            $sql = "DELETE FROM messages WHERE id = ?";
            $this->db->execute($sql, [$messageId]);

            Response::success(null, 'Message deleted');
        } catch (\Exception $e) {
            error_log("Delete message error: " . $e->getMessage());
            Response::error('Failed to delete message', 500);
        }
    }

    /**
     * Search messages
     */
    public function searchMessages(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $query = $this->input('q', '');
            $userId = $this->input('user_id', null);
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            if (strlen($query) < 2) {
                Response::error('Search query must be at least 2 characters', 400);
                return;
            }

            $query = "%$query%";
            $sql = "
                SELECT * FROM messages
                WHERE (sender_id = ? OR recipient_id = ?)
                AND content LIKE ?
            ";
            $params = [$user['sub'], $user['sub'], $query];

            if ($userId) {
                $sql .= " AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))";
                array_push($params, $user['sub'], $userId, $userId, $user['sub']);
            }

            $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
            array_push($params, $limit, $offset);

            $messages = $this->db->getAll($sql, $params);

            Response::success($messages);
        } catch (\Exception $e) {
            error_log("Search messages error: " . $e->getMessage());
            Response::error('Search failed', 500);
        }
    }

    /**
     * Get unread message count
     */
    public function getUnreadCount(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            $sql = "SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = false";
            $result = $this->db->getOne($sql, [$user['sub']]);

            Response::success(['unread_count' => (int)$result['count']]);
        } catch (\Exception $e) {
            error_log("Get unread count error: " . $e->getMessage());
            Response::error('Failed to get unread count', 500);
        }
    }
}
