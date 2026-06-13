<?php
/**
 * Supervisor Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class SupervisorController extends Controller {

    /**
     * Get supervisor profile
     */
    public function getProfile(string $supervisorId): void {
        try {
            $sql = "
                SELECT 
                    u.id,
                    u.email,
                    u.created_at,
                    p.first_name,
                    p.last_name,
                    p.avatar_url,
                    p.bio,
                    p.institution,
                    (SELECT COUNT(*) FROM research_papers WHERE supervisor_id = u.id) as supervised_count,
                    (SELECT COUNT(*) FROM supervisor_feedbacks WHERE supervisor_id = u.id) as feedback_count,
                    (SELECT AVG(rating) FROM supervisor_reviews WHERE supervisor_id = u.id) as avg_rating
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                WHERE u.id = ? AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = u.id AND role = 'supervisor')
            ";

            $supervisor = $this->db->getOne($sql, [$supervisorId]);

            if (!$supervisor) {
                Response::notFound('Supervisor not found');
                return;
            }

            Response::success($supervisor);
        } catch (\Exception $e) {
            error_log("Get supervisor error: " . $e->getMessage());
            Response::error('Failed to get supervisor profile', 500);
        }
    }

    /**
     * Get assigned papers
     */
    public function getAssignedPapers(): void {
        $this->requireRole('supervisor');

        try {
            $user = $this->getUser();
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);
            $status = $this->input('status', null);

            $sql = "
                SELECT 
                    rp.*,
                    ap.first_name as author_first_name,
                    ap.last_name as author_last_name
                FROM research_papers rp
                LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
                WHERE rp.supervisor_id = ?
            ";

            $params = [$user['sub']];

            if ($status) {
                $sql .= " AND rp.status = ?";
                $params[] = $status;
            }

            $sql .= " ORDER BY rp.created_at DESC LIMIT ? OFFSET ?";
            array_push($params, $limit, $offset);

            $papers = $this->db->getAll($sql, $params);

            Response::success($papers);
        } catch (\Exception $e) {
            error_log("Get assigned papers error: " . $e->getMessage());
            Response::error('Failed to get assigned papers', 500);
        }
    }

    /**
     * Submit feedback on paper
     */
    public function submitFeedback(): void {
        $this->requireRole('supervisor');

        if (!$this->validate([
            'research_id' => 'required',
            'feedback_text' => 'required|min:10',
        ])) {
            return;
        }

        try {
            $user = $this->getUser();
            $researchId = $this->input('research_id');
            $feedbackText = $this->input('feedback_text');
            $rating = (int)($this->input('rating', 5) ?? 5);
            $status = $this->input('status', 'pending_revision');

            // Check if paper is assigned to supervisor
            $paper = $this->db->getOne(
                "SELECT * FROM research_papers WHERE id = ? AND supervisor_id = ?",
                [$researchId, $user['sub']]
            );

            if (!$paper) {
                Response::forbidden('This paper is not assigned to you');
                return;
            }

            $feedback = [
                'id' => generateUUID(),
                'research_id' => $researchId,
                'supervisor_id' => $user['sub'],
                'feedback_text' => $feedbackText,
                'rating' => $rating,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $sql = "
                INSERT INTO supervisor_feedbacks (id, research_id, supervisor_id, feedback_text, rating, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ";

            $this->db->execute($sql, array_values($feedback));

            // Update paper status
            $sql = "UPDATE research_papers SET status = ?, updated_at = ? WHERE id = ?";
            $this->db->execute($sql, [$status, date('Y-m-d H:i:s'), $researchId]);

            Response::created($feedback);
        } catch (\Exception $e) {
            error_log("Submit feedback error: " . $e->getMessage());
            Response::error('Failed to submit feedback', 500);
        }
    }

    /**
     * Get feedback history on paper
     */
    public function getFeedback(string $researchId): void {
        try {
            $sql = "
                SELECT 
                    sf.*,
                    sp.first_name,
                    sp.last_name,
                    sp.avatar_url
                FROM supervisor_feedbacks sf
                LEFT JOIN user_profiles sp ON sf.supervisor_id = sp.user_id
                WHERE sf.research_id = ?
                ORDER BY sf.created_at DESC
            ";

            $feedbacks = $this->db->getAll($sql, [$researchId]);

            Response::success($feedbacks);
        } catch (\Exception $e) {
            error_log("Get feedback error: " . $e->getMessage());
            Response::error('Failed to get feedback', 500);
        }
    }

    /**
     * Approve paper
     */
    public function approvePaper(string $researchId): void {
        $this->requireRole('supervisor');

        try {
            $user = $this->getUser();

            // Check if paper is assigned to supervisor
            $paper = $this->db->getOne(
                "SELECT * FROM research_papers WHERE id = ? AND supervisor_id = ?",
                [$researchId, $user['sub']]
            );

            if (!$paper) {
                Response::forbidden();
                return;
            }

            $sql = "UPDATE research_papers SET status = 'approved', updated_at = ? WHERE id = ?";
            $this->db->execute($sql, [date('Y-m-d H:i:s'), $researchId]);

            Response::success(null, 'Paper approved');
        } catch (\Exception $e) {
            error_log("Approve paper error: " . $e->getMessage());
            Response::error('Failed to approve paper', 500);
        }
    }

    /**
     * Reject paper
     */
    public function rejectPaper(string $researchId): void {
        $this->requireRole('supervisor');

        if (!$this->validate(['reason' => 'required'])) {
            return;
        }

        try {
            $user = $this->getUser();
            $reason = $this->input('reason');

            // Check if paper is assigned to supervisor
            $paper = $this->db->getOne(
                "SELECT * FROM research_papers WHERE id = ? AND supervisor_id = ?",
                [$researchId, $user['sub']]
            );

            if (!$paper) {
                Response::forbidden();
                return;
            }

            $sql = "UPDATE research_papers SET status = 'rejected', feedback = ?, updated_at = ? WHERE id = ?";
            $this->db->execute($sql, [$reason, date('Y-m-d H:i:s'), $researchId]);

            Response::success(null, 'Paper rejected');
        } catch (\Exception $e) {
            error_log("Reject paper error: " . $e->getMessage());
            Response::error('Failed to reject paper', 500);
        }
    }

    /**
     * Request revision
     */
    public function requestRevision(string $researchId): void {
        $this->requireRole('supervisor');

        if (!$this->validate(['revision_notes' => 'required|min:10'])) {
            return;
        }

        try {
            $user = $this->getUser();
            $revisionNotes = $this->input('revision_notes');

            // Check if paper is assigned to supervisor
            $paper = $this->db->getOne(
                "SELECT * FROM research_papers WHERE id = ? AND supervisor_id = ?",
                [$researchId, $user['sub']]
            );

            if (!$paper) {
                Response::forbidden();
                return;
            }

            $sql = "UPDATE research_papers SET status = 'revision_requested', feedback = ?, updated_at = ? WHERE id = ?";
            $this->db->execute($sql, [$revisionNotes, date('Y-m-d H:i:s'), $researchId]);

            Response::success(null, 'Revision requested');
        } catch (\Exception $e) {
            error_log("Request revision error: " . $e->getMessage());
            Response::error('Failed to request revision', 500);
        }
    }

    /**
     * Get supervisor reviews
     */
    public function getReviews(): void {
        $this->requireRole('supervisor');

        try {
            $user = $this->getUser();
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $sql = "
                SELECT 
                    sr.*,
                    rp.title as paper_title,
                    ap.first_name as author_first_name,
                    ap.last_name as author_last_name
                FROM supervisor_reviews sr
                LEFT JOIN research_papers rp ON sr.research_id = rp.id
                LEFT JOIN user_profiles ap ON rp.author_id = ap.user_id
                WHERE sr.supervisor_id = ?
                ORDER BY sr.created_at DESC
                LIMIT ? OFFSET ?
            ";

            $reviews = $this->db->getAll($sql, [$user['sub'], $limit, $offset]);

            Response::success($reviews);
        } catch (\Exception $e) {
            error_log("Get reviews error: " . $e->getMessage());
            Response::error('Failed to get reviews', 500);
        }
    }

    /**
     * List supervisors
     */
    public function listSupervisors(): void {
        try {
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $sql = "
                SELECT 
                    u.id,
                    u.email,
                    p.first_name,
                    p.last_name,
                    p.avatar_url,
                    p.institution,
                    (SELECT COUNT(*) FROM research_papers WHERE supervisor_id = u.id) as supervised_count,
                    (SELECT AVG(rating) FROM supervisor_reviews WHERE supervisor_id = u.id) as avg_rating
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.role = 'supervisor'
                WHERE ur.id IS NOT NULL
                ORDER BY avg_rating DESC
                LIMIT ? OFFSET ?
            ";

            $supervisors = $this->db->getAll($sql, [$limit, $offset]);

            Response::success($supervisors);
        } catch (\Exception $e) {
            error_log("List supervisors error: " . $e->getMessage());
            Response::error('Failed to list supervisors', 500);
        }
    }

    /**
     * Request supervisor assignment
     */
    public function requestAssignment(string $supervisorId): void {
        $this->requireAuth();

        if (!$this->validate(['research_id' => 'required'])) {
            return;
        }

        try {
            $user = $this->getUser();
            $researchId = $this->input('research_id');

            // Check if paper belongs to user
            $paper = $this->db->getOne(
                "SELECT * FROM research_papers WHERE id = ? AND author_id = ?",
                [$researchId, $user['sub']]
            );

            if (!$paper) {
                Response::forbidden();
                return;
            }

            // Check if supervisor exists
            $supervisor = $this->db->getOne(
                "SELECT id FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id WHERE u.id = ? AND ur.role = 'supervisor'",
                [$supervisorId]
            );

            if (!$supervisor) {
                Response::notFound('Supervisor not found');
                return;
            }

            // Create request
            $request = [
                'id' => generateUUID(),
                'research_id' => $researchId,
                'supervisor_id' => $supervisorId,
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s'),
            ];

            $sql = "
                INSERT INTO supervisor_assignments (id, research_id, supervisor_id, status, created_at)
                VALUES (?, ?, ?, ?, ?)
            ";

            $this->db->execute($sql, array_values($request));

            Response::created($request);
        } catch (\Exception $e) {
            error_log("Request assignment error: " . $e->getMessage());
            Response::error('Failed to request assignment', 500);
        }
    }
}
