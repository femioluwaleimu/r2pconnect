<?php
/**
 * Challenge Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class ChallengeController extends Controller {

    /**
     * Get all challenges
     */
    public function listChallenges(): void {
        try {
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);
            $status = $this->input('status', null);

            $sql = "
                SELECT 
                    c.*,
                    cp.first_name as creator_first_name,
                    cp.last_name as creator_last_name,
                    (SELECT COUNT(*) FROM challenge_submissions WHERE challenge_id = c.id) as submission_count,
                    (SELECT COUNT(DISTINCT user_id) FROM challenge_submissions WHERE challenge_id = c.id) as participant_count
                FROM challenges c
                LEFT JOIN user_profiles cp ON c.creator_id = cp.user_id
            ";

            $params = [];
            if ($status) {
                $sql .= " WHERE c.status = ?";
                $params[] = $status;
            }

            $sql .= " ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
            array_push($params, $limit, $offset);

            $challenges = $this->db->getAll($sql, $params);

            Response::success($challenges);
        } catch (\Exception $e) {
            error_log("List challenges error: " . $e->getMessage());
            Response::error('Failed to list challenges', 500);
        }
    }

    /**
     * Get challenge details
     */
    public function getChallenge(string $challengeId): void {
        try {
            $sql = "
                SELECT 
                    c.*,
                    cp.first_name as creator_first_name,
                    cp.last_name as creator_last_name,
                    cp.avatar_url as creator_avatar,
                    (SELECT COUNT(*) FROM challenge_submissions WHERE challenge_id = c.id) as submission_count,
                    (SELECT COUNT(DISTINCT user_id) FROM challenge_submissions WHERE challenge_id = c.id) as participant_count,
                    (SELECT COUNT(*) FROM challenge_votes WHERE challenge_id = c.id) as vote_count
                FROM challenges c
                LEFT JOIN user_profiles cp ON c.creator_id = cp.user_id
                WHERE c.id = ?
            ";

            $challenge = $this->db->getOne($sql, [$challengeId]);

            if (!$challenge) {
                Response::notFound('Challenge not found');
                return;
            }

            Response::success($challenge);
        } catch (\Exception $e) {
            error_log("Get challenge error: " . $e->getMessage());
            Response::error('Failed to get challenge', 500);
        }
    }

    /**
     * Create new challenge
     */
    public function createChallenge(): void {
        $this->requireAuth();

        if (!$this->validate([
            'title' => 'required|min:5',
            'description' => 'required|min:20',
        ])) {
            return;
        }

        try {
            $user = $this->getUser();
            $data = $this->all();

            $challenge = [
                'id' => generateUUID(),
                'creator_id' => $user['sub'],
                'title' => $data['title'],
                'description' => $data['description'],
                'rules' => $data['rules'] ?? null,
                'prize' => (float)($data['prize'] ?? 0),
                'status' => 'active',
                'start_date' => $data['start_date'] ?? date('Y-m-d H:i:s'),
                'end_date' => $data['end_date'] ?? date('Y-m-d H:i:s', strtotime('+30 days')),
                'category' => $data['category'] ?? 'general',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $sql = "
                INSERT INTO challenges (id, creator_id, title, description, rules, prize, status, start_date, end_date, category, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";

            $this->db->execute($sql, [
                $challenge['id'],
                $challenge['creator_id'],
                $challenge['title'],
                $challenge['description'],
                $challenge['rules'],
                $challenge['prize'],
                $challenge['status'],
                $challenge['start_date'],
                $challenge['end_date'],
                $challenge['category'],
                $challenge['created_at'],
                $challenge['updated_at'],
            ]);

            Response::created($challenge);
        } catch (\Exception $e) {
            error_log("Create challenge error: " . $e->getMessage());
            Response::error('Failed to create challenge', 500);
        }
    }

    /**
     * Update challenge
     */
    public function updateChallenge(string $challengeId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $challenge = $this->db->getOne("SELECT * FROM challenges WHERE id = ?", [$challengeId]);

            if (!$challenge) {
                Response::notFound('Challenge not found');
                return;
            }

            if ($challenge['creator_id'] !== $user['sub']) {
                Response::forbidden('You can only edit your own challenges');
                return;
            }

            $data = $this->all();
            $updateData = [];

            $allowedFields = ['title', 'description', 'rules', 'prize', 'status', 'end_date', 'category'];
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
                $values[] = $challengeId;

                $sql = "UPDATE challenges SET " . implode(', ', $sets) . " WHERE id = ?";
                $this->db->execute($sql, $values);
            }

            $updated = $this->db->getOne("SELECT * FROM challenges WHERE id = ?", [$challengeId]);
            Response::success($updated, 'Challenge updated successfully');
        } catch (\Exception $e) {
            error_log("Update challenge error: " . $e->getMessage());
            Response::error('Failed to update challenge', 500);
        }
    }

    /**
     * Submit to challenge
     */
    public function submitEntry(): void {
        $this->requireAuth();

        if (!$this->validate([
            'challenge_id' => 'required',
            'submission_text' => 'required|min:10',
        ])) {
            return;
        }

        try {
            $user = $this->getUser();
            $challengeId = $this->input('challenge_id');
            $submissionText = $this->input('submission_text');
            $fileUrl = $this->input('file_url', null);

            // Check challenge exists and is active
            $challenge = $this->db->getOne("SELECT * FROM challenges WHERE id = ? AND status = 'active'", [$challengeId]);

            if (!$challenge) {
                Response::notFound('Challenge not found or not active');
                return;
            }

            // Check if already submitted
            $existing = $this->db->getOne(
                "SELECT id FROM challenge_submissions WHERE challenge_id = ? AND user_id = ?",
                [$challengeId, $user['sub']]
            );

            if ($existing) {
                Response::error('You have already submitted to this challenge', 400);
                return;
            }

            $submission = [
                'id' => generateUUID(),
                'challenge_id' => $challengeId,
                'user_id' => $user['sub'],
                'submission_text' => $submissionText,
                'file_url' => $fileUrl,
                'vote_count' => 0,
                'status' => 'submitted',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $sql = "
                INSERT INTO challenge_submissions (id, challenge_id, user_id, submission_text, file_url, vote_count, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";

            $this->db->execute($sql, array_values($submission));

            Response::created($submission);
        } catch (\Exception $e) {
            error_log("Submit entry error: " . $e->getMessage());
            Response::error('Failed to submit entry', 500);
        }
    }

    /**
     * Vote on submission
     */
    public function voteOnEntry(): void {
        $this->requireAuth();

        if (!$this->validate([
            'submission_id' => 'required',
        ])) {
            return;
        }

        try {
            $user = $this->getUser();
            $submissionId = $this->input('submission_id');
            $submission = $this->db->getOne(
                "SELECT challenge_id FROM challenge_submissions WHERE id = ?",
                [$submissionId]
            );

            if (!$submission) {
                Response::notFound('Submission not found');
                return;
            }

            // Check if already voted
            $existing = $this->db->getOne(
                "SELECT id FROM challenge_votes WHERE submission_id = ? AND user_id = ?",
                [$submissionId, $user['sub']]
            );

            if ($existing) {
                Response::error('You have already voted for this submission', 400);
                return;
            }

            $voteId = generateUUID();
            $sql = "
                INSERT INTO challenge_votes (id, challenge_id, submission_id, user_id, created_at)
                VALUES (?, ?, ?, ?, ?)
            ";

            $this->db->execute($sql, [$voteId, $submission['challenge_id'], $submissionId, $user['sub'], date('Y-m-d H:i:s')]);

            // Update vote count
            $sql = "UPDATE challenge_submissions SET vote_count = vote_count + 1 WHERE id = ?";
            $this->db->execute($sql, [$submissionId]);

            Response::success(['vote_id' => $voteId], 'Vote recorded successfully');
        } catch (\Exception $e) {
            error_log("Vote on entry error: " . $e->getMessage());
            Response::error('Failed to vote', 500);
        }
    }

    /**
     * Get challenge submissions
     */
    public function getSubmissions(string $challengeId): void {
        try {
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);
            $sortBy = $this->input('sort_by', 'recent');

            $orderBy = 'cs.created_at DESC';
            if ($sortBy === 'votes') {
                $orderBy = 'cs.vote_count DESC';
            }

            $sql = "
                SELECT 
                    cs.*,
                    up.first_name,
                    up.last_name,
                    up.avatar_url,
                    (SELECT COUNT(*) FROM challenge_votes WHERE submission_id = cs.id) as current_vote_count
                FROM challenge_submissions cs
                LEFT JOIN user_profiles up ON cs.user_id = up.user_id
                WHERE cs.challenge_id = ?
                ORDER BY $orderBy
                LIMIT ? OFFSET ?
            ";

            $submissions = $this->db->getAll($sql, [$challengeId, $limit, $offset]);

            Response::success($submissions);
        } catch (\Exception $e) {
            error_log("Get submissions error: " . $e->getMessage());
            Response::error('Failed to get submissions', 500);
        }
    }

    /**
     * Get user's challenge submissions
     */
    public function getUserSubmissions(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $sql = "
                SELECT 
                    cs.*,
                    c.title as challenge_title,
                    (SELECT COUNT(*) FROM challenge_votes WHERE submission_id = cs.id) as vote_count
                FROM challenge_submissions cs
                LEFT JOIN challenges c ON cs.challenge_id = c.id
                WHERE cs.user_id = ?
                ORDER BY cs.created_at DESC
                LIMIT ? OFFSET ?
            ";

            $submissions = $this->db->getAll($sql, [$user['sub'], $limit, $offset]);

            Response::success($submissions);
        } catch (\Exception $e) {
            error_log("Get user submissions error: " . $e->getMessage());
            Response::error('Failed to get submissions', 500);
        }
    }

    /**
     * Finalize challenge and select winners
     */
    public function finalizeChallenge(string $challengeId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $challenge = $this->db->getOne("SELECT * FROM challenges WHERE id = ?", [$challengeId]);

            if (!$challenge) {
                Response::notFound('Challenge not found');
                return;
            }

            if ($challenge['creator_id'] !== $user['sub']) {
                Response::forbidden();
                return;
            }

            // Get top submissions
            $sql = "
                SELECT 
                    cs.*,
                    (SELECT COUNT(*) FROM challenge_votes WHERE submission_id = cs.id) as final_votes
                FROM challenge_submissions cs
                WHERE cs.challenge_id = ?
                ORDER BY final_votes DESC
                LIMIT 3
            ";

            $winners = $this->db->getAll($sql, [$challengeId]);

            // Update challenge status
            $sql = "UPDATE challenges SET status = 'completed', updated_at = ? WHERE id = ?";
            $this->db->execute($sql, [date('Y-m-d H:i:s'), $challengeId]);

            Response::success([
                'challenge_id' => $challengeId,
                'winners' => $winners
            ], 'Challenge finalized');
        } catch (\Exception $e) {
            error_log("Finalize challenge error: " . $e->getMessage());
            Response::error('Failed to finalize challenge', 500);
        }
    }

    /**
     * Delete challenge
     */
    public function deleteChallenge(string $challengeId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $challenge = $this->db->getOne("SELECT * FROM challenges WHERE id = ?", [$challengeId]);

            if (!$challenge) {
                Response::notFound('Challenge not found');
                return;
            }

            if ($challenge['creator_id'] !== $user['sub']) {
                Response::forbidden();
                return;
            }

            $sql = "DELETE FROM challenges WHERE id = ?";
            $this->db->execute($sql, [$challengeId]);

            Response::success(null, 'Challenge deleted');
        } catch (\Exception $e) {
            error_log("Delete challenge error: " . $e->getMessage());
            Response::error('Failed to delete challenge', 500);
        }
    }
}
