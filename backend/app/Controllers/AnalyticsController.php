<?php
/**
 * Analytics Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class AnalyticsController extends Controller {

    /**
     * Get user analytics
     */
    public function getUserAnalytics(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            // Papers authored
            $sql = "SELECT COUNT(*) as count FROM research_papers WHERE author_id = ?";
            $papers_count = (int)$this->db->getOne($sql, [$user['sub']])['count'];

            // Papers supervised
            $sql = "SELECT COUNT(*) as count FROM research_papers WHERE supervisor_id = ?";
            $supervised_count = (int)$this->db->getOne($sql, [$user['sub']])['count'];

            // Total views
            $sql = "SELECT COUNT(*) as count FROM research_views WHERE user_id = ?";
            $views_count = (int)$this->db->getOne($sql, [$user['sub']])['count'];

            // Total downloads
            $sql = "SELECT COUNT(*) as count FROM research_downloads WHERE user_id = ?";
            $downloads_count = (int)$this->db->getOne($sql, [$user['sub']])['count'];

            // Wallet balance
            $sql = "SELECT COALESCE(SUM(amount), 0) as balance FROM wallets WHERE user_id = ?";
            $wallet_balance = (float)$this->db->getOne($sql, [$user['sub']])['balance'];

            // Active subscriptions
            $sql = "SELECT COUNT(*) as count FROM user_subscriptions WHERE user_id = ? AND status = 'active'";
            $subscriptions_count = (int)$this->db->getOne($sql, [$user['sub']])['count'];

            Response::success([
                'papers_authored' => $papers_count,
                'papers_supervised' => $supervised_count,
                'total_views' => $views_count,
                'total_downloads' => $downloads_count,
                'wallet_balance' => $wallet_balance,
                'active_subscriptions' => $subscriptions_count,
            ]);
        } catch (\Exception $e) {
            error_log("Get user analytics error: " . $e->getMessage());
            Response::error('Failed to get analytics', 500);
        }
    }

    /**
     * Get paper analytics
     */
    public function getPaperAnalytics(string $paperId): void {
        try {
            $sql = "SELECT * FROM research_papers WHERE id = ?";
            $paper = $this->db->getOne($sql, [$paperId]);

            if (!$paper) {
                Response::notFound('Paper not found');
                return;
            }

            // Views over time
            $sql = "
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM research_views
                WHERE research_id = ?
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            ";
            $views = $this->db->getAll($sql, [$paperId]);

            // Downloads
            $sql = "
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM research_downloads
                WHERE research_id = ?
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            ";
            $downloads = $this->db->getAll($sql, [$paperId]);

            // Comments
            $sql = "SELECT COUNT(*) as count FROM research_comments WHERE research_id = ?";
            $comments_count = (int)$this->db->getOne($sql, [$paperId])['count'];

            // Total views
            $sql = "SELECT COUNT(*) as count FROM research_views WHERE research_id = ?";
            $total_views = (int)$this->db->getOne($sql, [$paperId])['count'];

            // Total downloads
            $sql = "SELECT COUNT(*) as count FROM research_downloads WHERE research_id = ?";
            $total_downloads = (int)$this->db->getOne($sql, [$paperId])['count'];

            Response::success([
                'paper_id' => $paperId,
                'total_views' => $total_views,
                'total_downloads' => $total_downloads,
                'total_comments' => $comments_count,
                'views_timeline' => $views,
                'downloads_timeline' => $downloads,
            ]);
        } catch (\Exception $e) {
            error_log("Get paper analytics error: " . $e->getMessage());
            Response::error('Failed to get paper analytics', 500);
        }
    }

    /**
     * Get platform statistics
     */
    public function getPlatformStats(): void {
        try {
            // Total users
            $sql = "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL";
            $total_users = (int)$this->db->getOne($sql)['count'];

            // Total papers
            $sql = "SELECT COUNT(*) as count FROM research_papers WHERE status = 'published'";
            $total_papers = (int)$this->db->getOne($sql)['count'];

            // Total views
            $sql = "SELECT COUNT(*) as count FROM research_views";
            $total_views = (int)$this->db->getOne($sql)['count'];

            // Total downloads
            $sql = "SELECT COUNT(*) as count FROM research_downloads";
            $total_downloads = (int)$this->db->getOne($sql)['count'];

            // Active challenges
            $sql = "SELECT COUNT(*) as count FROM challenges WHERE status = 'active'";
            $active_challenges = (int)$this->db->getOne($sql)['count'];

            // Total collaborations
            $sql = "SELECT COUNT(*) as count FROM collaborations WHERE status = 'active'";
            $total_collaborations = (int)$this->db->getOne($sql)['count'];

            // Revenue
            $sql = "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'";
            $total_revenue = (float)$this->db->getOne($sql)['total'];

            // New users this month
            $sql = "SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND deleted_at IS NULL";
            $new_users_month = (int)$this->db->getOne($sql)['count'];

            // New papers this month
            $sql = "SELECT COUNT(*) as count FROM research_papers WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            $new_papers_month = (int)$this->db->getOne($sql)['count'];

            Response::success([
                'total_users' => $total_users,
                'total_papers' => $total_papers,
                'total_views' => $total_views,
                'total_downloads' => $total_downloads,
                'active_challenges' => $active_challenges,
                'total_collaborations' => $total_collaborations,
                'total_revenue' => $total_revenue,
                'new_users_this_month' => $new_users_month,
                'new_papers_this_month' => $new_papers_month,
            ]);
        } catch (\Exception $e) {
            error_log("Get platform stats error: " . $e->getMessage());
            Response::error('Failed to get platform statistics', 500);
        }
    }

    /**
     * Get popular papers
     */
    public function getPopularPapers(): void {
        try {
            $limit = (int)$this->input('limit', 10);
            $timeframe = $this->input('timeframe', '30d'); // 7d, 30d, 90d, all

            $dateFilter = "";
            if ($timeframe === '7d') {
                $dateFilter = "AND rp.published_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            } elseif ($timeframe === '30d') {
                $dateFilter = "AND rp.published_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            } elseif ($timeframe === '90d') {
                $dateFilter = "AND rp.published_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
            }

            $sql = "
                SELECT 
                    rp.*,
                    ap.first_name as author_first_name,
                    ap.last_name as author_last_name,
                    (SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) as view_count
                FROM research_papers rp
                LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
                WHERE rp.status = 'published' $dateFilter
                ORDER BY view_count DESC
                LIMIT ?
            ";

            $papers = $this->db->getAll($sql, [$limit]);

            Response::success($papers);
        } catch (\Exception $e) {
            error_log("Get popular papers error: " . $e->getMessage());
            Response::error('Failed to get popular papers', 500);
        }
    }

    /**
     * Get top authors
     */
    public function getTopAuthors(): void {
        try {
            $limit = (int)$this->input('limit', 10);

            $sql = "
                SELECT 
                    u.id,
                    p.first_name,
                    p.last_name,
                    p.avatar_url,
                    COUNT(DISTINCT rp.id) as papers_count,
                    (SELECT COUNT(*) FROM research_views rv LEFT JOIN research_papers rp2 ON rv.research_id = rp2.id WHERE rp2.author_id = u.id) as total_views
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN research_papers rp ON u.id = rp.author_id
                WHERE rp.status = 'published'
                GROUP BY u.id
                ORDER BY papers_count DESC
                LIMIT ?
            ";

            $authors = $this->db->getAll($sql, [$limit]);

            Response::success($authors);
        } catch (\Exception $e) {
            error_log("Get top authors error: " . $e->getMessage());
            Response::error('Failed to get top authors', 500);
        }
    }

    /**
     * Get growth metrics
     */
    public function getGrowthMetrics(): void {
        try {
            $months = (int)$this->input('months', 12);

            $sql = "
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    (SELECT COUNT(*) FROM users WHERE DATE_FORMAT(created_at, '%Y-%m') = month) as new_users,
                    (SELECT COUNT(*) FROM research_papers WHERE DATE_FORMAT(created_at, '%Y-%m') = month) as new_papers,
                    (SELECT SUM(amount) FROM payments WHERE DATE_FORMAT(created_at, '%Y-%m') = month AND status = 'completed') as revenue
                FROM users
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month ASC
            ";

            $metrics = $this->db->getAll($sql, [$months]);

            Response::success($metrics);
        } catch (\Exception $e) {
            error_log("Get growth metrics error: " . $e->getMessage());
            Response::error('Failed to get growth metrics', 500);
        }
    }

    /**
     * Get user engagement
     */
    public function getUserEngagement(): void {
        try {
            $sql = "
                SELECT 
                    u.id,
                    p.first_name,
                    p.last_name,
                    (SELECT COUNT(*) FROM research_papers WHERE author_id = u.id) as papers_authored,
                    (SELECT COUNT(*) FROM research_views WHERE user_id = u.id) as papers_viewed,
                    (SELECT COUNT(*) FROM research_downloads WHERE user_id = u.id) as papers_downloaded,
                    (SELECT COUNT(*) FROM messages WHERE sender_id = u.id OR recipient_id = u.id) as messages_count,
                    u.created_at,
                    u.updated_at
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                ORDER BY (papers_authored + papers_viewed + papers_downloaded) DESC
                LIMIT 50
            ";

            $engagement = $this->db->getAll($sql);

            Response::success($engagement);
        } catch (\Exception $e) {
            error_log("Get user engagement error: " . $e->getMessage());
            Response::error('Failed to get user engagement', 500);
        }
    }
}
