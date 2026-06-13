<?php
/**
 * Collaboration Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class CollaborationController extends Controller {

    /**
     * Get user collaborations
     */
    public function getCollaborations(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $sql = "
                SELECT 
                    c.*,
                    cp.first_name as creator_first_name,
                    cp.last_name as creator_last_name,
                    (SELECT COUNT(*) FROM collaboration_members WHERE collaboration_id = c.id) as member_count,
                    (SELECT COUNT(*) FROM collaboration_projects WHERE collaboration_id = c.id) as project_count
                FROM collaborations c
                LEFT JOIN user_profiles cp ON c.creator_id = cp.user_id
                LEFT JOIN collaboration_members cm ON c.id = cm.collaboration_id
                WHERE cm.user_id = ? OR c.creator_id = ?
                GROUP BY c.id
                ORDER BY c.created_at DESC
                LIMIT ? OFFSET ?
            ";

            $collaborations = $this->db->getAll($sql, [$user['sub'], $user['sub'], $limit, $offset]);

            Response::success($collaborations);
        } catch (\Exception $e) {
            error_log("Get collaborations error: " . $e->getMessage());
            Response::error('Failed to get collaborations', 500);
        }
    }

    /**
     * Get collaboration details
     */
    public function getCollaboration(string $collaborationId): void {
        try {
            $sql = "
                SELECT 
                    c.*,
                    cp.first_name as creator_first_name,
                    cp.last_name as creator_last_name,
                    (SELECT COUNT(*) FROM collaboration_members WHERE collaboration_id = c.id) as member_count,
                    (SELECT COUNT(*) FROM collaboration_projects WHERE collaboration_id = c.id) as project_count
                FROM collaborations c
                LEFT JOIN user_profiles cp ON c.creator_id = cp.user_id
                WHERE c.id = ?
            ";

            $collaboration = $this->db->getOne($sql, [$collaborationId]);

            if (!$collaboration) {
                Response::notFound('Collaboration not found');
                return;
            }

            Response::success($collaboration);
        } catch (\Exception $e) {
            error_log("Get collaboration error: " . $e->getMessage());
            Response::error('Failed to get collaboration', 500);
        }
    }

    /**
     * Create new collaboration
     */
    public function createCollaboration(): void {
        $this->requireAuth();

        if (!$this->validate([
            'title' => 'required|min:5',
            'description' => 'required|min:10',
        ])) {
            return;
        }

        try {
            $user = $this->getUser();
            $data = $this->all();

            $collaboration = [
                'id' => generateUUID(),
                'creator_id' => $user['sub'],
                'title' => $data['title'],
                'description' => $data['description'],
                'status' => 'active',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $sql = "
                INSERT INTO collaborations (id, creator_id, title, description, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ";

            $this->db->execute($sql, array_values($collaboration));

            // Add creator as member
            $this->db->execute(
                "INSERT INTO collaboration_members (id, collaboration_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)",
                [generateUUID(), $collaboration['id'], $user['sub'], 'creator', date('Y-m-d H:i:s')]
            );

            Response::created($collaboration);
        } catch (\Exception $e) {
            error_log("Create collaboration error: " . $e->getMessage());
            Response::error('Failed to create collaboration', 500);
        }
    }

    /**
     * Invite member to collaboration
     */
    public function inviteMember(string $collaborationId): void {
        $this->requireAuth();

        if (!$this->validate(['user_id' => 'required'])) {
            return;
        }

        try {
            $user = $this->getUser();
            $userId = $this->input('user_id');

            // Check if user is collaboration creator/admin
            $sql = "SELECT * FROM collaboration_members WHERE collaboration_id = ? AND user_id = ? AND role IN ('creator', 'admin')";
            $member = $this->db->getOne($sql, [$collaborationId, $user['sub']]);

            if (!$member) {
                Response::forbidden('Only admins can invite members');
                return;
            }

            // Check if user is already a member
            $existing = $this->db->getOne(
                "SELECT id FROM collaboration_members WHERE collaboration_id = ? AND user_id = ?",
                [$collaborationId, $userId]
            );

            if ($existing) {
                Response::error('User is already a member', 400);
                return;
            }

            // Add member
            $sql = "
                INSERT INTO collaboration_members (id, collaboration_id, user_id, role, joined_at)
                VALUES (?, ?, ?, ?, ?)
            ";

            $this->db->execute($sql, [
                generateUUID(),
                $collaborationId,
                $userId,
                'member',
                date('Y-m-d H:i:s')
            ]);

            Response::success(['user_id' => $userId], 'Member invited successfully');
        } catch (\Exception $e) {
            error_log("Invite member error: " . $e->getMessage());
            Response::error('Failed to invite member', 500);
        }
    }

    /**
     * Remove member from collaboration
     */
    public function removeMember(string $collaborationId, string $userId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            // Check if user is collaboration creator/admin
            $sql = "SELECT * FROM collaboration_members WHERE collaboration_id = ? AND user_id = ? AND role IN ('creator', 'admin')";
            $member = $this->db->getOne($sql, [$collaborationId, $user['sub']]);

            if (!$member) {
                Response::forbidden();
                return;
            }

            $sql = "DELETE FROM collaboration_members WHERE collaboration_id = ? AND user_id = ?";
            $this->db->execute($sql, [$collaborationId, $userId]);

            Response::success(null, 'Member removed');
        } catch (\Exception $e) {
            error_log("Remove member error: " . $e->getMessage());
            Response::error('Failed to remove member', 500);
        }
    }

    /**
     * Get collaboration members
     */
    public function getMembers(string $collaborationId): void {
        try {
            $sql = "
                SELECT 
                    cm.*,
                    up.first_name,
                    up.last_name,
                    up.avatar_url,
                    up.institution
                FROM collaboration_members cm
                LEFT JOIN user_profiles up ON cm.user_id = up.user_id
                WHERE cm.collaboration_id = ?
                ORDER BY cm.joined_at ASC
            ";

            $members = $this->db->getAll($sql, [$collaborationId]);

            Response::success($members);
        } catch (\Exception $e) {
            error_log("Get members error: " . $e->getMessage());
            Response::error('Failed to get members', 500);
        }
    }

    /**
     * Create collaboration project
     */
    public function createProject(string $collaborationId): void {
        $this->requireAuth();

        if (!$this->validate([
            'title' => 'required',
            'description' => 'required',
        ])) {
            return;
        }

        try {
            $user = $this->getUser();
            $data = $this->all();

            // Check if user is member
            $member = $this->db->getOne(
                "SELECT id FROM collaboration_members WHERE collaboration_id = ? AND user_id = ?",
                [$collaborationId, $user['sub']]
            );

            if (!$member) {
                Response::forbidden();
                return;
            }

            $project = [
                'id' => generateUUID(),
                'collaboration_id' => $collaborationId,
                'title' => $data['title'],
                'description' => $data['description'],
                'status' => 'active',
                'created_by' => $user['sub'],
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $sql = "
                INSERT INTO collaboration_projects (id, collaboration_id, title, description, status, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ";

            $this->db->execute($sql, array_values($project));

            Response::created($project);
        } catch (\Exception $e) {
            error_log("Create project error: " . $e->getMessage());
            Response::error('Failed to create project', 500);
        }
    }

    /**
     * Get collaboration projects
     */
    public function getProjects(string $collaborationId): void {
        try {
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $sql = "
                SELECT 
                    cp.*,
                    up.first_name,
                    up.last_name
                FROM collaboration_projects cp
                LEFT JOIN user_profiles up ON cp.created_by = up.user_id
                WHERE cp.collaboration_id = ?
                ORDER BY cp.created_at DESC
                LIMIT ? OFFSET ?
            ";

            $projects = $this->db->getAll($sql, [$collaborationId, $limit, $offset]);

            Response::success($projects);
        } catch (\Exception $e) {
            error_log("Get projects error: " . $e->getMessage());
            Response::error('Failed to get projects', 500);
        }
    }

    /**
     * Leave collaboration
     */
    public function leaveCollaboration(string $collaborationId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            $sql = "DELETE FROM collaboration_members WHERE collaboration_id = ? AND user_id = ?";
            $this->db->execute($sql, [$collaborationId, $user['sub']]);

            Response::success(null, 'You have left the collaboration');
        } catch (\Exception $e) {
            error_log("Leave collaboration error: " . $e->getMessage());
            Response::error('Failed to leave collaboration', 500);
        }
    }

    /**
     * Delete collaboration
     */
    public function deleteCollaboration(string $collaborationId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            // Check if user is creator
            $collaboration = $this->db->getOne("SELECT creator_id FROM collaborations WHERE id = ?", [$collaborationId]);

            if (!$collaboration || $collaboration['creator_id'] !== $user['sub']) {
                Response::forbidden();
                return;
            }

            $sql = "DELETE FROM collaborations WHERE id = ?";
            $this->db->execute($sql, [$collaborationId]);

            Response::success(null, 'Collaboration deleted');
        } catch (\Exception $e) {
            error_log("Delete collaboration error: " . $e->getMessage());
            Response::error('Failed to delete collaboration', 500);
        }
    }
}
