<?php
/**
 * Notification Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class NotificationController extends Controller {

    /**
     * Get user notifications
     */
    public function getNotifications(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);
            $unreadOnly = $this->input('unread_only', 'false') === 'true';

            $sql = "SELECT * FROM notifications WHERE user_id = ?";
            $params = [$user['sub']];

            if ($unreadOnly) {
                $sql .= " AND is_read = false";
            }

            $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
            array_push($params, $limit, $offset);

            $notifications = $this->db->getAll($sql, $params);

            Response::success($notifications);
        } catch (\Exception $e) {
            error_log("Get notifications error: " . $e->getMessage());
            Response::error('Failed to get notifications', 500);
        }
    }

    /**
     * Get unread count
     */
    public function getUnreadCount(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            $sql = "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false";
            $result = $this->db->getOne($sql, [$user['sub']]);

            Response::success(['unread_count' => (int)$result['count']]);
        } catch (\Exception $e) {
            error_log("Get unread count error: " . $e->getMessage());
            Response::error('Failed to get unread count', 500);
        }
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(string $notificationId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            // Verify ownership
            $sql = "SELECT user_id FROM notifications WHERE id = ?";
            $notification = $this->db->getOne($sql, [$notificationId]);

            if (!$notification || $notification['user_id'] !== $user['sub']) {
                Response::forbidden();
                return;
            }

            $sql = "UPDATE notifications SET is_read = true, read_at = ? WHERE id = ?";
            $this->db->execute($sql, [date('Y-m-d H:i:s'), $notificationId]);

            Response::success(null, 'Notification marked as read');
        } catch (\Exception $e) {
            error_log("Mark as read error: " . $e->getMessage());
            Response::error('Failed to mark notification as read', 500);
        }
    }

    /**
     * Mark all as read
     */
    public function markAllAsRead(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            $sql = "UPDATE notifications SET is_read = true, read_at = ? WHERE user_id = ? AND is_read = false";
            $this->db->execute($sql, [date('Y-m-d H:i:s'), $user['sub']]);

            Response::success(null, 'All notifications marked as read');
        } catch (\Exception $e) {
            error_log("Mark all as read error: " . $e->getMessage());
            Response::error('Failed to mark all notifications as read', 500);
        }
    }

    /**
     * Delete notification
     */
    public function delete(string $notificationId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            // Verify ownership
            $sql = "SELECT user_id FROM notifications WHERE id = ?";
            $notification = $this->db->getOne($sql, [$notificationId]);

            if (!$notification || $notification['user_id'] !== $user['sub']) {
                Response::forbidden();
                return;
            }

            $sql = "DELETE FROM notifications WHERE id = ?";
            $this->db->execute($sql, [$notificationId]);

            Response::success(null, 'Notification deleted');
        } catch (\Exception $e) {
            error_log("Delete notification error: " . $e->getMessage());
            Response::error('Failed to delete notification', 500);
        }
    }

    /**
     * Delete all notifications
     */
    public function deleteAll(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            $sql = "DELETE FROM notifications WHERE user_id = ?";
            $this->db->execute($sql, [$user['sub']]);

            Response::success(null, 'All notifications deleted');
        } catch (\Exception $e) {
            error_log("Delete all notifications error: " . $e->getMessage());
            Response::error('Failed to delete all notifications', 500);
        }
    }

    /**
     * Get notification preferences
     */
    public function getPreferences(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            $sql = "SELECT * FROM notification_preferences WHERE user_id = ?";
            $preferences = $this->db->getOne($sql, [$user['sub']]);

            if (!$preferences) {
                // Return defaults if not set
                $preferences = [
                    'email_on_research_comment' => true,
                    'email_on_review_received' => true,
                    'email_on_new_message' => true,
                    'push_notifications' => true,
                ];
            }

            Response::success($preferences);
        } catch (\Exception $e) {
            error_log("Get preferences error: " . $e->getMessage());
            Response::error('Failed to get preferences', 500);
        }
    }

    /**
     * Update notification preferences
     */
    public function updatePreferences(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $data = $this->all();

            // Check if preferences exist
            $sql = "SELECT id FROM notification_preferences WHERE user_id = ?";
            $existing = $this->db->getOne($sql, [$user['sub']]);

            if ($existing) {
                // Update existing
                $updateData = [];
                $allowedFields = [
                    'email_on_research_comment',
                    'email_on_review_received',
                    'email_on_new_message',
                    'push_notifications',
                    'digest_frequency'
                ];

                foreach ($allowedFields as $field) {
                    if (isset($data[$field])) {
                        $updateData[$field] = $data[$field];
                    }
                }

                if (!empty($updateData)) {
                    $updateData['updated_at'] = date('Y-m-d H:i:s');
                    
                    $sets = [];
                    $values = [];
                    foreach ($updateData as $key => $value) {
                        $sets[] = "$key = ?";
                        $values[] = $value;
                    }
                    $values[] = $user['sub'];

                    $sql = "UPDATE notification_preferences SET " . implode(', ', $sets) . " WHERE user_id = ?";
                    $this->db->execute($sql, $values);
                }
            } else {
                // Create new preferences
                $sql = "
                    INSERT INTO notification_preferences (id, user_id, email_on_research_comment, email_on_review_received, email_on_new_message, push_notifications, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ";

                $this->db->execute($sql, [
                    generateUUID(),
                    $user['sub'],
                    $data['email_on_research_comment'] ?? true,
                    $data['email_on_review_received'] ?? true,
                    $data['email_on_new_message'] ?? true,
                    $data['push_notifications'] ?? true,
                    date('Y-m-d H:i:s'),
                    date('Y-m-d H:i:s')
                ]);
            }

            Response::success(null, 'Preferences updated successfully');
        } catch (\Exception $e) {
            error_log("Update preferences error: " . $e->getMessage());
            Response::error('Failed to update preferences', 500);
        }
    }
}
