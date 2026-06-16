<?php
/**
 * AI Service Controller
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;
use App\Services\AIProvider;

class AIController extends Controller {
    private AIProvider $aiProvider;

    public function __construct() {
        parent::__construct();
        $this->aiProvider = new AIProvider();
    }

    /**
     * AI Research Review
     */
    public function reviewResearch(string $paperId): void {
        $this->requireAuth();

        try {
            // Get research paper
            $sql = "SELECT * FROM research_papers WHERE id = ?";
            $paper = $this->db->getOne($sql, [$paperId]);

            if (!$paper) {
                Response::notFound('Research paper not found');
                return;
            }

            // Call AI service
            $review = $this->callAIReview($paper);

            if (!$review) {
                Response::error('Failed to generate review', 500);
                return;
            }

            // Store review in database
            $reviewId = generateUUID();
            $sql = "
                INSERT INTO ai_reviews (id, research_id, review_text, score, created_at)
                VALUES (?, ?, ?, ?, ?)
            ";

            $this->db->execute($sql, [
                $reviewId,
                $paperId,
                $review['text'],
                $review['score'],
                date('Y-m-d H:i:s')
            ]);

            Response::success([
                'review_id' => $reviewId,
                'review' => $review
            ], 'Review generated successfully');
        } catch (\Exception $e) {
            error_log("AI review error: " . $e->getMessage());
            Response::error('Failed to generate review', 500);
        }
    }

    /**
     * AI Research Summarization
     */
    public function summarizeResearch(string $paperId): void {
        $this->requireAuth();

        try {
            // Get research paper
            $sql = "SELECT * FROM research_papers WHERE id = ?";
            $paper = $this->db->getOne($sql, [$paperId]);

            if (!$paper) {
                Response::notFound('Research paper not found');
                return;
            }

            // Call AI service
            $summary = $this->callAISummarize($paper);

            if (!$summary) {
                Response::error('Failed to generate summary', 500);
                return;
            }

            Response::success($summary, 'Summary generated successfully');
        } catch (\Exception $e) {
            error_log("AI summarize error: " . $e->getMessage());
            Response::error('Failed to generate summary', 500);
        }
    }

    /**
     * AI Chat (Research Assistant)
     */
    public function chat(): void {
        $this->requireAuth();

        if (!$this->validate(['message' => 'required|min:5'])) {
            return;
        }

        try {
            $message = $this->input('message');
            $context = $this->input('context', null); // Optional: research paper ID or topic

            // Call AI service
            $response = $this->callAIChat($message, $context);

            if (!$response) {
                Response::error('Failed to get AI response', 500);
                return;
            }

            Response::success(['response' => $response]);
        } catch (\Exception $e) {
            error_log("AI chat error: " . $e->getMessage());
            Response::error('Failed to process chat message', 500);
        }
    }

    /**
     * AI Topic Generation (Research Ideas)
     */
    public function generateTopics(): void {
        $this->requireAuth();

        if (!$this->validate(['field' => 'required'])) {
            return;
        }

        try {
            $field = $this->input('field');
            $count = (int)$this->input('count', 5);

            // Call AI service
            $topics = $this->callAIGenerateTopics($field, $count);

            if (!$topics) {
                Response::error('Failed to generate topics', 500);
                return;
            }

            Response::success(['topics' => $topics]);
        } catch (\Exception $e) {
            error_log("AI topic generation error: " . $e->getMessage());
            Response::error('Failed to generate research topics', 500);
        }
    }

    /**
     * AI Plagiarism Check
     */
    public function checkPlagiarism(string $paperId): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            // Get research paper
            $sql = "SELECT * FROM research_papers WHERE id = ?";
            $paper = $this->db->getOne($sql, [$paperId]);

            if (!$paper) {
                Response::notFound('Research paper not found');
                return;
            }

            // Check if user is author
            if ($paper['author_id'] !== $user['sub']) {
                Response::forbidden('You can only check plagiarism for your own papers');
                return;
            }

            // Check if already checked recently
            $sql = "SELECT * FROM plagiarism_checks WHERE research_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)";
            $recent = $this->db->getOne($sql, [$paperId]);

            if ($recent) {
                Response::success($recent, 'Using recent plagiarism check result');
                return;
            }

            // Call plagiarism check service
            $result = $this->callPlagiarismCheck($paper);

            if (!$result) {
                Response::error('Failed to check plagiarism', 500);
                return;
            }

            // Store result
            $checkId = generateUUID();
            $sql = "
                INSERT INTO plagiarism_checks (id, research_id, similarity_score, matches, status, created_at)
                VALUES (?, ?, ?, ?, 'completed', ?)
            ";

            $this->db->execute($sql, [
                $checkId,
                $paperId,
                $result['similarity_score'],
                json_encode($result['matches']),
                date('Y-m-d H:i:s')
            ]);

            Response::success([
                'check_id' => $checkId,
                'similarity_score' => $result['similarity_score'],
                'matches' => $result['matches']
            ], 'Plagiarism check completed');
        } catch (\Exception $e) {
            error_log("Plagiarism check error: " . $e->getMessage());
            Response::error('Failed to check plagiarism', 500);
        }
    }

    /**
     * Get AI credits balance
     */
    public function getCredits(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();

            // Get active subscription
            $sql = "
                SELECT SUM(credits) as total_credits FROM user_subscriptions
                WHERE user_id = ? AND status = 'active' AND expiry_date > NOW()
            ";

            $result = $this->db->getOne($sql, [$user['sub']]);
            $credits = (int)($result['total_credits'] ?? 0);

            Response::success(['credits' => $credits]);
        } catch (\Exception $e) {
            error_log("Get credits error: " . $e->getMessage());
            Response::error('Failed to get credits', 500);
        }
    }

    /**
     * Call AI Review service
     */
    private function callAIReview(array $paper): ?array {
        $prompt = "Please review this academic research paper:\n\n";
        $prompt .= "Title: " . ($paper['title'] ?? '') . "\n";
        $prompt .= "Description: " . ($paper['description'] ?? '') . "\n";
        $prompt .= "Keywords: " . ($paper['keywords'] ?? '') . "\n\n";
        $prompt .= "Provide a detailed review with scores for: methodology, originality, clarity, and significance (1-10 for each).";

        return $this->callAIService($prompt);
    }

    /**
     * Call AI Summarize service
     */
    private function callAISummarize(array $paper): ?string {
        $prompt = "Please provide a concise summary (2-3 paragraphs) of this research paper:\n\n";
        $prompt .= "Title: " . ($paper['title'] ?? '') . "\n";
        $prompt .= "Description: " . ($paper['description'] ?? '') . "\n";
        $prompt .= "Keywords: " . ($paper['keywords'] ?? '');

        $response = $this->callAIService($prompt);
        return $response ? ($response['text'] ?? null) : null;
    }

    /**
     * Call AI Chat service
     */
    private function callAIChat(string $message, ?string $context): ?string {
        $prompt = $message;
        if ($context) {
            $prompt = "Context: " . $context . "\n\nUser: " . $message;
        }

        $response = $this->callAIService($prompt);
        return $response ? ($response['text'] ?? null) : null;
    }

    /**
     * Call AI Generate Topics service
     */
    private function callAIGenerateTopics(string $field, int $count): ?array {
        $prompt = "Generate $count interesting research topics in the field of $field. ";
        $prompt .= "Format as JSON array with 'title' and 'description' for each topic.";

        $response = $this->callAIService($prompt);
        return $response ? ($response['topics'] ?? null) : null;
    }

    /**
     * Call Plagiarism Check service
     */
    private function callPlagiarismCheck(array $paper): ?array {
        // This would integrate with a plagiarism detection service
        // For now, return mock data
        return [
            'similarity_score' => rand(0, 15), // Mock score
            'matches' => []
        ];
    }

    /**
     * Generic AI Service Call
     */
    private function callAIService(string $prompt): ?array {
        log_message('info', "AI Service Call: " . substr($prompt, 0, 100) . "...");

        $response = $this->aiProvider->chat([
            ['role' => 'system', 'content' => 'You are a helpful academic research assistant.'],
            ['role' => 'user', 'content' => $prompt],
        ]);

        $text = $response['content'];
        $topics = null;
        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            $topics = $this->isList($decoded) ? $decoded : ($decoded['topics'] ?? null);
        }

        return [
            'text' => $text,
            'topics' => $topics,
            'score' => 0,
            'tokens_used' => $response['usage']['total_tokens'] ?? null,
            'success' => true,
        ];
    }

    private function isList(array $value): bool {
        if ($value === []) {
            return true;
        }

        return array_keys($value) === range(0, count($value) - 1);
    }
}
