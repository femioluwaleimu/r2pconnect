<?php
/**
 * Research Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;
use App\Models\Research;
use App\Models\User;

class ResearchController extends Controller {
    private Research $researchModel;
    private User $userModel;

    public function __construct() {
        parent::__construct();
        $this->researchModel = new Research();
        $this->userModel = new User();
    }

    /**
     * Create new research paper
     */
    public function create(): void {
        $this->requireAuth();

        if (!$this->validate([
            'title' => 'required',
            'description' => 'required|min:10',
        ])) {
            return;
        }

        try {
            $user = $this->getUser();
            $data = $this->all();

            $paper = $this->researchModel->createPaper([
                'author_id' => $user['sub'],
                'title' => $data['title'],
                'description' => $data['description'],
                'keywords' => $data['keywords'] ?? null,
                'category' => $data['category'] ?? null,
                'status' => 'draft',
                'file_url' => $data['file_url'] ?? null,
            ]);

            Response::created($paper);
        } catch (\Exception $e) {
            error_log("Create research error: " . $e->getMessage());
            Response::error('Failed to create research paper', 500);
        }
    }

    /**
     * Get research paper details
     */
    public function show(string $paperId): void {
        try {
            $paper = $this->researchModel->getWithDetails($paperId);

            if (!$paper) {
                Response::notFound('Research paper not found');
                return;
            }

            // Track view (if user authenticated)
            $user = $this->getUser();
            if ($user) {
                $sql = "
                    INSERT INTO research_views (id, research_id, user_id, created_at)
                    VALUES (?, ?, ?, ?)
                ";
                $this->db->execute($sql, [generateUUID(), $paperId, $user['sub'], date('Y-m-d H:i:s')]);
            }

            Response::success($paper);
        } catch (\Exception $e) {
            error_log("Get research error: " . $e->getMessage());
            Response::error('Failed to get research paper', 500);
        }
    }

    /**
     * Get user's research papers
     */
    public function getUserPapers(string $userId): void {
        try {
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $papers = $this->researchModel->getUserPapers($userId, $limit, $offset);

            Response::success($papers);
        } catch (\Exception $e) {
            error_log("Get user papers error: " . $e->getMessage());
            Response::error('Failed to get user papers', 500);
        }
    }

    /**
     * Get current user's research papers
     */
    public function myPapers(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $papers = $this->researchModel->getUserPapers($user['sub'], $limit, $offset);

            Response::success($papers);
        } catch (\Exception $e) {
            error_log("Get my papers error: " . $e->getMessage());
            Response::error('Failed to get your papers', 500);
        }
    }

    /**
     * Search research papers
     */
    public function search(): void {
        $query = $this->input('q', '');
        $limit = (int)$this->input('limit', 20);
        $offset = (int)$this->input('offset', 0);

        if (strlen($query) < 2) {
            Response::error('Search query must be at least 2 characters', 400);
            return;
        }

        try {
            $results = $this->researchModel->search($query, $limit, $offset);
            Response::success($results);
        } catch (\Exception $e) {
            error_log("Search research error: " . $e->getMessage());
            Response::error('Search failed', 500);
        }
    }

    /**
     * Get trending research papers
     */
    public function trending(): void {
        try {
            $limit = (int)$this->input('limit', 10);
            $papers = $this->researchModel->getTrending($limit);

            Response::success($papers);
        } catch (\Exception $e) {
            error_log("Get trending research error: " . $e->getMessage());
            Response::error('Failed to get trending papers', 500);
        }
    }

    /**
     * Update research paper
     */
    public function update(string $paperId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $paper = $this->researchModel->find($paperId);

            if (!$paper) {
                Response::notFound('Research paper not found');
                return;
            }

            // Check if user is author
            if ($paper['author_id'] !== $user['sub']) {
                Response::forbidden('You can only edit your own papers');
                return;
            }

            $data = $this->all();
            $updateData = [];

            // Allowed fields to update
            $allowedFields = ['title', 'description', 'keywords', 'category', 'file_url'];
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateData[$field] = $data[$field];
                }
            }

            $updateData['updated_at'] = date('Y-m-d H:i:s');

            $this->researchModel->update($paperId, $updateData);

            $updated = $this->researchModel->find($paperId);
            Response::success($updated, 'Research paper updated successfully');
        } catch (\Exception $e) {
            error_log("Update research error: " . $e->getMessage());
            Response::error('Failed to update research paper', 500);
        }
    }

    /**
     * Submit research for review
     */
    public function submit(string $paperId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $paper = $this->researchModel->find($paperId);

            if (!$paper) {
                Response::notFound('Research paper not found');
                return;
            }

            if ($paper['author_id'] !== $user['sub']) {
                Response::forbidden('You can only submit your own papers');
                return;
            }

            $supervisor = $this->input('supervisor_id', null);

            if ($supervisor) {
                // Assign supervisor
                $updateData = [
                    'supervisor_id' => $supervisor,
                    'status' => 'submitted',
                    'submitted_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
            } else {
                // Mark as published if no supervisor required
                $updateData = [
                    'status' => 'published',
                    'published_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
            }

            $this->researchModel->update($paperId, $updateData);

            $updated = $this->researchModel->find($paperId);
            Response::success($updated, 'Research paper submitted successfully');
        } catch (\Exception $e) {
            error_log("Submit research error: " . $e->getMessage());
            Response::error('Failed to submit research paper', 500);
        }
    }

    /**
     * Add comment to research
     */
    public function addComment(string $paperId): void {
        $this->requireAuth();

        if (!$this->validate(['content' => 'required|min:5'])) {
            return;
        }

        try {
            $user = $this->getUser();
            $content = $this->input('content');

            $comment = [
                'id' => generateUUID(),
                'research_id' => $paperId,
                'user_id' => $user['sub'],
                'content' => $content,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $sql = "
                INSERT INTO research_comments (id, research_id, user_id, content, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ";

            $this->db->execute($sql, [
                $comment['id'],
                $comment['research_id'],
                $comment['user_id'],
                $comment['content'],
                $comment['created_at'],
                $comment['updated_at'],
            ]);

            Response::created($comment);
        } catch (\Exception $e) {
            error_log("Add comment error: " . $e->getMessage());
            Response::error('Failed to add comment', 500);
        }
    }

    /**
     * Get research comments
     */
    public function getComments(string $paperId): void {
        try {
            $limit = (int)$this->input('limit', 50);
            $offset = (int)$this->input('offset', 0);

            $sql = "
                SELECT 
                    rc.*,
                    up.first_name,
                    up.last_name,
                    up.display_name,
                    up.avatar_url
                FROM research_comments rc
                LEFT JOIN user_profiles up ON rc.user_id = up.user_id
                WHERE rc.research_id = ?
                ORDER BY rc.created_at DESC
                LIMIT ? OFFSET ?
            ";

            $comments = $this->db->getAll($sql, [$paperId, $limit, $offset]);

            Response::success($comments);
        } catch (\Exception $e) {
            error_log("Get comments error: " . $e->getMessage());
            Response::error('Failed to get comments', 500);
        }
    }

    /**
     * Download research paper
     */
    public function download(string $paperId): void {
        try {
            $paper = $this->researchModel->find($paperId);

            if (!$paper || !$paper['file_url']) {
                Response::notFound('Research file not found');
                return;
            }

            // Track download
            $user = $this->getUser();
            if ($user) {
                $sql = "
                    INSERT INTO research_downloads (id, research_id, user_id, created_at)
                    VALUES (?, ?, ?, ?)
                ";
                $this->db->execute($sql, [generateUUID(), $paperId, $user['sub'], date('Y-m-d H:i:s')]);
            }

            // Redirect to file or return download URL
            Response::success([
                'download_url' => $paper['file_url'],
                'title' => $paper['title'],
            ]);
        } catch (\Exception $e) {
            error_log("Download research error: " . $e->getMessage());
            Response::error('Failed to download research paper', 500);
        }
    }

    /**
     * Delete research paper
     */
    public function delete(string $paperId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $paper = $this->researchModel->find($paperId);

            if (!$paper) {
                Response::notFound('Research paper not found');
                return;
            }

            // Check if user is author or admin
            if ($paper['author_id'] !== $user['sub']) {
                $this->requireRole('admin', 'super_admin');
            }

            $this->researchModel->delete($paperId);

            Response::success(null, 'Research paper deleted successfully');
        } catch (\Exception $e) {
            error_log("Delete research error: " . $e->getMessage());
            Response::error('Failed to delete research paper', 500);
        }
    }
}
