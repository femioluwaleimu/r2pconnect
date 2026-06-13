<?php
/**
 * Search & Browse Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;
use App\Models\Research;
use App\Models\UserProfile;

class SearchController extends Controller {
    private Research $researchModel;
    private UserProfile $userModel;

    public function __construct() {
        parent::__construct();
        $this->researchModel = new Research();
        $this->userModel = new UserProfile();
    }

    /**
     * Global search (research + users)
     */
    public function search(): void {
        $query = $this->input('q', '');
        $type = $this->input('type', 'all'); // all, research, users
        $limit = (int)$this->input('limit', 20);
        $offset = (int)$this->input('offset', 0);

        if (strlen($query) < 2) {
            Response::error('Search query must be at least 2 characters', 400);
            return;
        }

        try {
            $results = [];

            if ($type === 'all' || $type === 'research') {
                $results['research'] = $this->researchModel->search($query, $limit, $offset);
            }

            if ($type === 'all' || $type === 'users') {
                $results['users'] = $this->userModel->search($query, $limit);
            }

            Response::success($results);
        } catch (\Exception $e) {
            error_log("Global search error: " . $e->getMessage());
            Response::error('Search failed', 500);
        }
    }

    /**
     * Browse research by category
     */
    public function browseByCategory(string $category): void {
        try {
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);
            $sort = $this->input('sort', 'recent'); // recent, trending, popular

            $orderBy = 'rp.created_at DESC';
            if ($sort === 'trending') {
                $orderBy = '(SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) DESC';
            } elseif ($sort === 'popular') {
                $orderBy = '(SELECT COUNT(*) FROM research_downloads WHERE research_id = rp.id) DESC';
            }

            $sql = "
                SELECT 
                    rp.*,
                    ap.first_name as author_first_name,
                    ap.last_name as author_last_name,
                    (SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) as views_count,
                    (SELECT COUNT(*) FROM research_downloads WHERE research_id = rp.id) as downloads_count
                FROM research_papers rp
                LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
                WHERE rp.category = ? AND rp.status = 'published'
                ORDER BY " . $orderBy . "
                LIMIT ? OFFSET ?
            ";

            $papers = $this->db->getAll($sql, [$category, $limit, $offset]);

            Response::success($papers);
        } catch (\Exception $e) {
            error_log("Browse category error: " . $e->getMessage());
            Response::error('Failed to browse category', 500);
        }
    }

    /**
     * Get all categories with count
     */
    public function getCategories(): void {
        try {
            $sql = "
                SELECT 
                    category,
                    COUNT(*) as count
                FROM research_papers
                WHERE status = 'published' AND category IS NOT NULL
                GROUP BY category
                ORDER BY count DESC
            ";

            $categories = $this->db->getAll($sql);

            Response::success($categories);
        } catch (\Exception $e) {
            error_log("Get categories error: " . $e->getMessage());
            Response::error('Failed to get categories', 500);
        }
    }

    /**
     * Get featured/trending research
     */
    public function getFeatured(): void {
        try {
            $limit = (int)$this->input('limit', 10);

            $sql = "
                SELECT 
                    rp.*,
                    ap.first_name as author_first_name,
                    ap.last_name as author_last_name,
                    (SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) as views_count
                FROM research_papers rp
                LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
                WHERE rp.status = 'published'
                ORDER BY 
                    rp.published_at DESC,
                    views_count DESC
                LIMIT ?
            ";

            $papers = $this->db->getAll($sql, [$limit]);

            Response::success($papers);
        } catch (\Exception $e) {
            error_log("Get featured error: " . $e->getMessage());
            Response::error('Failed to get featured research', 500);
        }
    }

    /**
     * Get recommendations for user
     */
    public function getRecommendations(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $limit = (int)$this->input('limit', 10);

            // Get user's research interests
            $sql = "SELECT research_interests FROM user_profiles WHERE user_id = ?";
            $profile = $this->db->getOne($sql, [$user['sub']]);

            $interests = $profile['research_interests'] ?? '';

            // Find similar research papers
            $sql = "
                SELECT 
                    rp.*,
                    ap.first_name as author_first_name,
                    ap.last_name as author_last_name,
                    (SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) as views_count
                FROM research_papers rp
                LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
                WHERE rp.status = 'published' 
                AND rp.author_id != ?
                AND (rp.keywords LIKE ? OR rp.category LIKE ?)
                ORDER BY rp.published_at DESC
                LIMIT ?
            ";

            $keyword_pattern = "%$interests%";
            $papers = $this->db->getAll($sql, [$user['sub'], $keyword_pattern, $keyword_pattern, $limit]);

            Response::success($papers);
        } catch (\Exception $e) {
            error_log("Get recommendations error: " . $e->getMessage());
            Response::error('Failed to get recommendations', 500);
        }
    }

    /**
     * Get similar research papers
     */
    public function getSimilar(string $paperId): void {
        try {
            $limit = (int)$this->input('limit', 5);

            // Get original paper
            $sql = "SELECT * FROM research_papers WHERE id = ?";
            $paper = $this->db->getOne($sql, [$paperId]);

            if (!$paper) {
                Response::notFound('Research paper not found');
                return;
            }

            // Find similar papers
            $sql = "
                SELECT 
                    rp.*,
                    ap.first_name as author_first_name,
                    ap.last_name as author_last_name
                FROM research_papers rp
                LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
                WHERE rp.id != ?
                AND rp.status = 'published'
                AND (
                    rp.category = ? 
                    OR rp.keywords LIKE ?
                )
                ORDER BY rp.published_at DESC
                LIMIT ?
            ";

            $keyword_pattern = "%{$paper['keywords']}%";
            $papers = $this->db->getAll($sql, [$paperId, $paper['category'], $keyword_pattern, $limit]);

            Response::success($papers);
        } catch (\Exception $e) {
            error_log("Get similar research error: " . $e->getMessage());
            Response::error('Failed to get similar research', 500);
        }
    }

    /**
     * Advanced search with filters
     */
    public function advancedSearch(): void {
        try {
            $query = $this->input('query', '');
            $category = $this->input('category', null);
            $minDate = $this->input('from_date', null);
            $maxDate = $this->input('to_date', null);
            $sortBy = $this->input('sort_by', 'recent'); // recent, views, downloads
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $where = ['rp.status = "published"'];
            $params = [];

            if (!empty($query)) {
                $where[] = '(rp.title LIKE ? OR rp.description LIKE ? OR rp.keywords LIKE ?)';
                $query_pattern = "%$query%";
                array_push($params, $query_pattern, $query_pattern, $query_pattern);
            }

            if ($category) {
                $where[] = 'rp.category = ?';
                $params[] = $category;
            }

            if ($minDate) {
                $where[] = 'rp.published_at >= ?';
                $params[] = $minDate;
            }

            if ($maxDate) {
                $where[] = 'rp.published_at <= ?';
                $params[] = $maxDate;
            }

            $orderBy = 'rp.published_at DESC';
            if ($sortBy === 'views') {
                $orderBy = '(SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) DESC';
            } elseif ($sortBy === 'downloads') {
                $orderBy = '(SELECT COUNT(*) FROM research_downloads WHERE research_id = rp.id) DESC';
            }

            $whereClause = implode(' AND ', $where);
            $sql = "
                SELECT 
                    rp.*,
                    ap.first_name as author_first_name,
                    ap.last_name as author_last_name,
                    (SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) as views_count,
                    (SELECT COUNT(*) FROM research_downloads WHERE research_id = rp.id) as downloads_count
                FROM research_papers rp
                LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
                WHERE $whereClause
                ORDER BY $orderBy
                LIMIT ? OFFSET ?
            ";

            array_push($params, $limit, $offset);
            $papers = $this->db->getAll($sql, $params);

            Response::success($papers);
        } catch (\Exception $e) {
            error_log("Advanced search error: " . $e->getMessage());
            Response::error('Advanced search failed', 500);
        }
    }

    /**
     * Get research statistics
     */
    public function getStatistics(): void {
        try {
            $stats = [];

            // Total papers
            $sql = "SELECT COUNT(*) as count FROM research_papers WHERE status = 'published'";
            $stats['total_papers'] = (int)$this->db->getOne($sql)['count'];

            // Total authors
            $sql = "SELECT COUNT(DISTINCT author_id) as count FROM research_papers WHERE status = 'published'";
            $stats['total_authors'] = (int)$this->db->getOne($sql)['count'];

            // Total views
            $sql = "SELECT COUNT(*) as count FROM research_views";
            $stats['total_views'] = (int)$this->db->getOne($sql)['count'];

            // Total downloads
            $sql = "SELECT COUNT(*) as count FROM research_downloads";
            $stats['total_downloads'] = (int)$this->db->getOne($sql)['count'];

            Response::success($stats);
        } catch (\Exception $e) {
            error_log("Get statistics error: " . $e->getMessage());
            Response::error('Failed to get statistics', 500);
        }
    }
}
