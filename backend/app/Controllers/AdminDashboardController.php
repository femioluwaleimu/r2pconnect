<?php
/**
 * Admin Dashboard Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class AdminDashboardController extends Controller {

    /**
     * Get dashboard overview
     */
    public function getDashboardOverview(): void {
        $this->requireRole('admin', 'super_admin');

        try {
            // Total users
            $sql = "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL";
            $total_users = (int)$this->db->getOne($sql)['count'];

            // Active users (past 30 days)
            $sql = "SELECT COUNT(DISTINCT user_id) as count FROM research_views WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            $active_users = (int)$this->db->getOne($sql)['count'];

            // Total papers
            $sql = "SELECT COUNT(*) as count FROM research_papers";
            $total_papers = (int)$this->db->getOne($sql)['count'];

            // Pending papers
            $sql = "SELECT COUNT(*) as count FROM research_papers WHERE status IN ('draft', 'submitted')";
            $pending_papers = (int)$this->db->getOne($sql)['count'];

            // Total revenue
            $sql = "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'";
            $total_revenue = (float)$this->db->getOne($sql)['total'];

            // This month revenue
            $sql = "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            $monthly_revenue = (float)$this->db->getOne($sql)['total'];

            Response::success([
                'total_users' => $total_users,
                'active_users' => $active_users,
                'total_papers' => $total_papers,
                'pending_papers' => $pending_papers,
                'total_revenue' => $total_revenue,
                'monthly_revenue' => $monthly_revenue,
            ]);
        } catch (\Exception $e) {
            error_log("Get dashboard overview error: " . $e->getMessage());
            Response::error('Failed to get dashboard overview', 500);
        }
    }

    /**
     * Get system health
     */
    public function getSystemHealth(): void {
        $this->requireRole('admin', 'super_admin');

        try {
            $health = [
                'database' => 'connected',
                'uptime' => round(microtime(true)),
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true),
            ];

            // Check database connection
            try {
                $sql = "SELECT 1";
                $this->db->getOne($sql);
            } catch (\Exception $e) {
                $health['database'] = 'disconnected';
            }

            Response::success($health);
        } catch (\Exception $e) {
            error_log("Get system health error: " . $e->getMessage());
            Response::error('Failed to get system health', 500);
        }
    }

    /**
     * Get recent activities
     */
    public function getRecentActivities(): void {
        $this->requireRole('admin', 'super_admin');

        try {
            $limit = (int)$this->input('limit', 50);

            $activities = [];

            // Recent users
            $sql = "
                SELECT 'user_created' as type, u.id as entity_id, u.email as description, u.created_at
                FROM users u
                WHERE u.deleted_at IS NULL
                ORDER BY u.created_at DESC
                LIMIT ?
            ";
            $user_activities = $this->db->getAll($sql, [$limit]);
            $activities = array_merge($activities, $user_activities);

            // Recent papers
            $sql = "
                SELECT 'paper_created' as type, rp.id as entity_id, rp.title as description, rp.created_at
                FROM research_papers rp
                ORDER BY rp.created_at DESC
                LIMIT ?
            ";
            $paper_activities = $this->db->getAll($sql, [$limit]);
            $activities = array_merge($activities, $paper_activities);

            // Recent payments
            $sql = "
                SELECT 'payment' as type, p.id as entity_id, CONCAT('Payment: ', p.amount) as description, p.created_at
                FROM payments p
                ORDER BY p.created_at DESC
                LIMIT ?
            ";
            $payment_activities = $this->db->getAll($sql, [$limit]);
            $activities = array_merge($activities, $payment_activities);

            // Sort by time
            usort($activities, function($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });

            // Limit final result
            $activities = array_slice($activities, 0, $limit);

            Response::success($activities);
        } catch (\Exception $e) {
            error_log("Get recent activities error: " . $e->getMessage());
            Response::error('Failed to get recent activities', 500);
        }
    }

    /**
     * List all users for management
     */
    public function manageUsers(): void {
        $this->requireRole('admin', 'super_admin');

        try {
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);
            $search = $this->input('search', null);

            $sql = "
                SELECT 
                    u.id,
                    u.email,
                    u.created_at,
                    u.updated_at,
                    p.first_name,
                    p.last_name,
                    ur.role,
                    (SELECT COUNT(*) FROM research_papers WHERE author_id = u.id) as papers_count
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                WHERE u.deleted_at IS NULL
            ";

            $params = [];

            if ($search) {
                $sql .= " AND (u.email LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)";
                $search_pattern = "%$search%";
                array_push($params, $search_pattern, $search_pattern, $search_pattern);
            }

            $sql .= " ORDER BY u.created_at DESC LIMIT ? OFFSET ?";
            array_push($params, $limit, $offset);

            $users = $this->db->getAll($sql, $params);

            Response::success($users);
        } catch (\Exception $e) {
            error_log("Manage users error: " . $e->getMessage());
            Response::error('Failed to manage users', 500);
        }
    }

    /**
     * Suspend user account
     */
    public function suspendUser(string $userId): void {
        $this->requireRole('admin', 'super_admin');

        try {
            $sql = "UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?";
            $this->db->execute($sql, [date('Y-m-d H:i:s'), $userId]);

            Response::success(null, 'User suspended');
        } catch (\Exception $e) {
            error_log("Suspend user error: " . $e->getMessage());
            Response::error('Failed to suspend user', 500);
        }
    }

    /**
     * Activate user account
     */
    public function activateUser(string $userId): void {
        $this->requireRole('admin', 'super_admin');

        try {
            $sql = "UPDATE users SET status = 'active', updated_at = ? WHERE id = ?";
            $this->db->execute($sql, [date('Y-m-d H:i:s'), $userId]);

            Response::success(null, 'User activated');
        } catch (\Exception $e) {
            error_log("Activate user error: " . $e->getMessage());
            Response::error('Failed to activate user', 500);
        }
    }

    /**
     * Moderate content (papers)
     */
    public function moderateContent(): void {
        $this->requireRole('admin', 'super_admin');

        try {
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);
            $flagged = $this->input('flagged_only', 'false') === 'true';

            $sql = "
                SELECT 
                    rp.*,
                    ap.first_name as author_first_name,
                    ap.last_name as author_last_name,
                    (SELECT COUNT(*) FROM content_flags WHERE research_id = rp.id) as flag_count
                FROM research_papers rp
                LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
            ";

            $params = [];

            if ($flagged) {
                $sql .= " WHERE rp.id IN (SELECT research_id FROM content_flags)";
            }

            $sql .= " ORDER BY rp.created_at DESC LIMIT ? OFFSET ?";
            array_push($params, $limit, $offset);

            $content = $this->db->getAll($sql, $params);

            Response::success($content);
        } catch (\Exception $e) {
            error_log("Moderate content error: " . $e->getMessage());
            Response::error('Failed to moderate content', 500);
        }
    }

    /**
     * Flag content for review
     */
    public function flagContent(): void {
        $this->requireRole('admin', 'super_admin');

        if (!$this->validate([
            'research_id' => 'required',
            'reason' => 'required',
        ])) {
            return;
        }

        try {
            $researchId = $this->input('research_id');
            $reason = $this->input('reason');

            $sql = "
                INSERT INTO content_flags (id, research_id, reason, created_at)
                VALUES (?, ?, ?, ?)
            ";

            $this->db->execute($sql, [
                generateUUID(),
                $researchId,
                $reason,
                date('Y-m-d H:i:s')
            ]);

            Response::created(['research_id' => $researchId], 'Content flagged');
        } catch (\Exception $e) {
            error_log("Flag content error: " . $e->getMessage());
            Response::error('Failed to flag content', 500);
        }
    }

    /**
     * Remove flagged content
     */
    public function removeContent(string $researchId): void {
        $this->requireRole('admin', 'super_admin');

        try {
            $sql = "UPDATE research_papers SET status = 'removed', updated_at = ? WHERE id = ?";
            $this->db->execute($sql, [date('Y-m-d H:i:s'), $researchId]);

            Response::success(null, 'Content removed');
        } catch (\Exception $e) {
            error_log("Remove content error: " . $e->getMessage());
            Response::error('Failed to remove content', 500);
        }
    }

    /**
     * Get system logs
     */
    public function getSystemLogs(): void {
        $this->requireRole('admin', 'super_admin');

        try {
            $limit = (int)$this->input('limit', 100);
            $type = $this->input('type', 'all');

            $logFile = env('LOG_PATH', BASE_PATH . '/logs') . '/' . date('Y-m-d') . '.log';

            if (!file_exists($logFile)) {
                Response::success(['logs' => []]);
                return;
            }

            $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            $lines = array_reverse($lines);
            $logs = array_slice($lines, 0, $limit);

            Response::success(['logs' => $logs]);
        } catch (\Exception $e) {
            error_log("Get system logs error: " . $e->getMessage());
            Response::error('Failed to get system logs', 500);
        }
    }

    /**
     * Get database statistics
     */
    public function getDatabaseStats(): void {
        $this->requireRole('admin', 'super_admin');

        try {
            $sql = "SELECT table_name, table_rows, avg_row_length FROM information_schema.TABLES WHERE table_schema = DATABASE()";
            $tables = $this->db->getAll($sql);

            $total_rows = 0;
            foreach ($tables as $table) {
                $total_rows += (int)$table['table_rows'];
            }

            Response::success([
                'total_tables' => count($tables),
                'total_rows' => $total_rows,
                'tables' => $tables,
            ]);
        } catch (\Exception $e) {
            error_log("Get database stats error: " . $e->getMessage());
            Response::error('Failed to get database statistics', 500);
        }
    }
}
