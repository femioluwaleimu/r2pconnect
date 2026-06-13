<?php
/**
 * Research Paper Model
 */

namespace App\Models;

use App\Core\Model;

class Research extends Model {
    protected string $table = 'research_papers';

    /**
     * Get research paper with author and supervisor info
     */
    public function getWithDetails(string $paperId): ?array {
        $sql = "
            SELECT 
                rp.*,
                author.email as author_email,
                ap.first_name as author_first_name,
                ap.last_name as author_last_name,
                ap.display_name as author_display_name,
                supervisor.email as supervisor_email,
                sp.first_name as supervisor_first_name,
                sp.last_name as supervisor_last_name,
                sp.display_name as supervisor_display_name,
                (SELECT COUNT(*) FROM research_downloads WHERE research_id = rp.id) as downloads_count,
                (SELECT COUNT(*) FROM research_comments WHERE research_id = rp.id) as comments_count,
                (SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) as views_count
            FROM {$this->table} rp
            LEFT JOIN users author ON rp.author_id = author.id
            LEFT JOIN user_profiles ap ON author.id = ap.user_id
            LEFT JOIN users supervisor ON rp.supervisor_id = supervisor.id
            LEFT JOIN user_profiles sp ON supervisor.id = sp.user_id
            WHERE rp.id = ?
        ";
        return $this->db->getOne($sql, [$paperId]);
    }

    /**
     * Get user's research papers
     */
    public function getUserPapers(string $userId, int $limit = 20, int $offset = 0): array {
        $sql = "
            SELECT 
                rp.*,
                sp.first_name as supervisor_first_name,
                sp.last_name as supervisor_last_name,
                (SELECT COUNT(*) FROM research_downloads WHERE research_id = rp.id) as downloads_count,
                (SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) as views_count
            FROM {$this->table} rp
            LEFT JOIN user_profiles sp ON rp.supervisor_id = sp.user_id
            WHERE rp.author_id = ?
            ORDER BY rp.created_at DESC
            LIMIT ? OFFSET ?
        ";
        return $this->db->getAll($sql, [$userId, $limit, $offset]);
    }

    /**
     * Search research papers
     */
    public function search(string $query, int $limit = 20, int $offset = 0): array {
        $query = "%$query%";
        $sql = "
            SELECT 
                rp.*,
                ap.first_name as author_first_name,
                ap.last_name as author_last_name,
                (SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) as views_count
            FROM {$this->table} rp
            LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
            WHERE rp.title LIKE ?
               OR rp.description LIKE ?
               OR rp.keywords LIKE ?
            ORDER BY rp.created_at DESC
            LIMIT ? OFFSET ?
        ";
        return $this->db->getAll($sql, [$query, $query, $query, $limit, $offset]);
    }

    /**
     * Get trending research papers
     */
    public function getTrending(int $limit = 10): array {
        $sql = "
            SELECT 
                rp.*,
                ap.first_name as author_first_name,
                ap.last_name as author_last_name,
                (SELECT COUNT(*) FROM research_views WHERE research_id = rp.id) as views_count
            FROM {$this->table} rp
            LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
            WHERE rp.status = 'published'
            ORDER BY views_count DESC
            LIMIT ?
        ";
        return $this->db->getAll($sql, [$limit]);
    }

    /**
     * Create research paper
     */
    public function createPaper(array $data): ?array {
        $data['id'] = $data['id'] ?? generateUUID();
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['status'] = $data['status'] ?? 'draft';

        return $this->create($data);
    }

    /**
     * Update research paper status
     */
    public function updateStatus(string $paperId, string $status, ?string $feedback = null): bool {
        $sql = "UPDATE {$this->table} SET status = ?, feedback = ?, updated_at = ? WHERE id = ?";
        return $this->db->execute($sql, [$status, $feedback, date('Y-m-d H:i:s'), $paperId]) > 0;
    }
}
