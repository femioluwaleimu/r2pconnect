<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;
use App\Services\AIProvider;

class FunctionController extends Controller {
    private AIProvider $aiProvider;

    public function __construct() {
        parent::__construct();
        $this->aiProvider = new AIProvider();
    }

    public function invoke(string $name): void {
        $payload = $this->all();

        switch ($name) {
            case 'ai-research':
                $this->aiResearch($payload);
                return;

            case 'ai-chapter-review':
                $this->aiChapterReview($payload);
                return;

            case 'preview-training-preset':
                $this->previewTrainingPreset($payload);
                return;

            case 'research-integrity-check':
                $this->researchIntegrityCheck($payload);
                return;

            case 'ai-collab-matcher':
                $this->aiCollabMatcher();
                return;

            case 'ai-match-challenge':
                $this->aiMatchChallenge($payload);
                return;

            case 'send-email':
            case 'send-verification-code':
            case 'send-collaboration-invite':
            case 'send-job-feedback-notification':
            case 'send-job-application-notification':
                Response::json(['data' => ['queued' => true], 'error' => null]);
                return;

            case 'validate-institution-code':
                $code = $payload['code'] ?? $payload['verification_code'] ?? '';
                $row = $this->db->getOne(
                    'SELECT * FROM institution_verification_codes WHERE verification_code = ? AND used_at IS NULL',
                    [$code]
                );
                Response::json(['data' => ['valid' => (bool)$row, 'code' => $row], 'error' => null]);
                return;

            case 'mark-code-used':
                $code = $payload['code'] ?? $payload['verification_code'] ?? '';
                $this->db->execute(
                    'UPDATE institution_verification_codes SET used_at = ? WHERE verification_code = ?',
                    [date('Y-m-d H:i:s'), $code]
                );
                Response::json(['data' => ['success' => true], 'error' => null]);
                return;

            case 'currency-convert':
                Response::json(['data' => ['rate' => 1, 'converted' => $payload['amount'] ?? 0], 'error' => null]);
                return;

            default:
                Response::json([
                    'data' => null,
                    'error' => "PHP function '{$name}' is not implemented yet",
                ], 501);
        }
    }

    private function aiResearch(array $payload): void {
        $this->requireAuth();

        $type = (string)($payload['type'] ?? '');
        $content = trim((string)($payload['content'] ?? ''));
        if ($type === '' || $content === '') {
            Response::json(['data' => ['error' => 'AI type and content are required'], 'error' => null], 400);
            return;
        }

        $prompt = $this->researchPrompt($type, $content);
        $result = $this->chatText(
            'You are an academic research assistant for R2P Connect. Give practical, structured, Nigeria-aware research guidance.',
            $prompt,
            ['temperature' => 0.35, 'max_tokens' => 1800]
        );

        Response::json(['data' => [
            'result' => $result['content'],
            'credits_remaining' => $this->decrementUserAICredit(),
            'provider' => $result['provider'],
        ], 'error' => null]);
    }

    private function aiChapterReview(array $payload): void {
        $this->requireAuth();
        $user = $this->getUser();

        $researchId = (string)($payload['research_id'] ?? '');
        $chapterName = (string)($payload['chapter_name'] ?? 'Chapter');
        $chapterNumber = isset($payload['chapter_number']) ? (int)$payload['chapter_number'] : null;
        $chapterContent = trim((string)($payload['chapter_content'] ?? ''));
        $reviewMode = (string)($payload['review_mode'] ?? 'quick');

        if ($researchId === '' || $chapterContent === '') {
            Response::json(['data' => null, 'error' => ['error' => 'research_id and chapter_content are required']], 400);
            return;
        }

        $prompt = "Review this research chapter in {$reviewMode} mode. Return only valid JSON with these keys: chapter_name, rating, academic_clarity_score, summary, strengths, weak_areas, recommendations, required_fixes, optional_improvements, examiner_readiness, ai_confidence_score.\n\nChapter: {$chapterName}\n\nContent:\n{$chapterContent}";
        $response = $this->chatText(
            'You are a strict but helpful academic supervisor. Return JSON only. Ratings are 1-5. examiner_readiness must be one of not_ready, needs_revision, supervisor_ready.',
            $prompt,
            ['temperature' => 0.2, 'max_tokens' => 2200]
        );

        $review = $this->jsonFromText($response['content']) ?: [];
        $review = array_merge([
            'chapter_name' => $chapterName,
            'chapter_number' => $chapterNumber,
            'rating' => 3,
            'academic_clarity_score' => 3,
            'summary' => $response['content'],
            'strengths' => [],
            'weak_areas' => [],
            'recommendations' => [],
            'required_fixes' => [],
            'optional_improvements' => [],
            'examiner_readiness' => 'needs_revision',
            'ai_confidence_score' => 75,
            'review_mode' => $reviewMode,
            'created_at' => date('Y-m-d H:i:s'),
        ], $review);

        $this->storeChapterReview($researchId, $user['sub'], $review);
        Response::json(['data' => ['review' => $review, 'provider' => $response['provider']], 'error' => null]);
    }

    private function previewTrainingPreset(array $payload): void {
        $excerpt = trim((string)($payload['excerpt'] ?? $payload['content'] ?? ''));
        if ($excerpt === '') {
            Response::json(['data' => ['error' => 'Excerpt is required'], 'error' => null], 400);
            return;
        }

        $result = $this->chatText(
            'You are an AI research supervisor giving concise feedback previews.',
            "Return a short preview under 180 words showing how you would review this excerpt:\n\n{$excerpt}",
            ['temperature' => 0.35, 'max_tokens' => 500]
        );

        Response::json(['data' => ['preview' => $result['content'], 'provider' => $result['provider']], 'error' => null]);
    }

    private function researchIntegrityCheck(array $payload): void {
        $this->requireAuth();

        $researchId = (string)($payload['research_id'] ?? '');
        $title = (string)($payload['title'] ?? '');
        $abstract = (string)($payload['abstract'] ?? '');
        if ($researchId === '' || trim($title . $abstract) === '') {
            Response::json(['data' => ['error' => 'Research title or abstract is required'], 'error' => null], 400);
            return;
        }

        $result = $this->chatText(
            'You are an academic integrity analyst. Return only JSON.',
            "Analyze for plagiarism risk and AI content risk. Return JSON with plagiarism_score, ai_content_risk, summary, recommendations.\n\nTitle: {$title}\nAbstract: {$abstract}",
            ['temperature' => 0.2, 'max_tokens' => 1200]
        );

        $analysis = $this->jsonFromText($result['content']) ?: [];
        $plagiarismScore = (float)($analysis['plagiarism_score'] ?? 0);
        $aiRisk = (string)($analysis['ai_content_risk'] ?? 'low');

        if ($researchId !== '') {
            $this->db->execute(
                'UPDATE research_papers SET plagiarism_score = ?, ai_content_risk = ?, plagiarism_checked_at = ? WHERE id = ?',
                [$plagiarismScore, $aiRisk, date('Y-m-d H:i:s'), $researchId]
            );
        }

        Response::json(['data' => [
            'plagiarism_score' => $plagiarismScore,
            'ai_content_risk' => $aiRisk,
            'summary' => $analysis['summary'] ?? $result['content'],
            'recommendations' => $analysis['recommendations'] ?? [],
            'document_analyzed' => false,
            'provider' => $result['provider'],
        ], 'error' => null]);
    }

    private function aiCollabMatcher(): void {
        $this->requireAuth();
        Response::json(['data' => ['matches' => [], 'total_matches' => 0, 'provider' => null], 'error' => null]);
    }

    private function aiMatchChallenge(array $payload): void {
        $this->requireAuth();
        $challengeId = (string)($payload['challengeId'] ?? $payload['challenge_id'] ?? '');
        if ($challengeId === '') {
            Response::json(['data' => ['error' => 'challengeId is required'], 'error' => null], 400);
            return;
        }

        Response::json(['data' => [
            'matches' => [],
            'new_matches' => 0,
            'total_matches' => 0,
        ], 'error' => null]);
    }

    private function researchPrompt(string $type, string $content): string {
        return match ($type) {
            'summarize' => "Summarize this research content clearly:\n\n{$content}",
            'abstract' => "Write a strong academic abstract from this research content:\n\n{$content}",
            'gap_analysis' => "Identify research gaps, unresolved questions, and possible next studies from this content:\n\n{$content}",
            'keywords' => "Extract 8-12 academic keywords and short phrases from this content:\n\n{$content}",
            'topic_refine' => "Refine this research topic. Suggest improved title options, scope, objectives, and research questions:\n\n{$content}",
            'topic_suggestions' => "Generate research topic suggestions based on this field or interest:\n\n{$content}",
            'applications' => "Identify practical and industrial applications for this research:\n\n{$content}",
            'literature' => "Suggest literature review angles, themes, and search keywords for this research:\n\n{$content}",
            'funding' => "Create a concise funding pitch for this research:\n\n{$content}",
            'comprehensive_analysis' => "Provide a comprehensive academic analysis of this research:\n\n{$content}",
            'supervisor_review' => "Review this as an academic supervisor and give actionable feedback:\n\n{$content}",
            'version_comparison' => "Compare these research document versions or notes and summarize changes:\n\n{$content}",
            default => $content,
        };
    }

    private function chatText(string $system, string $user, array $options = []): array {
        return $this->aiProvider->chat([
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $user],
        ], $options);
    }

    private function jsonFromText(string $text): ?array {
        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/\{.*\}/s', $text, $matches)) {
            $decoded = json_decode($matches[0], true);
            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }

    private function decrementUserAICredit(): int {
        $user = $this->getUser();
        if (!$user) {
            return 0;
        }

        $subscription = $this->db->getOne(
            'SELECT id, ai_credits_remaining FROM subscriptions WHERE user_id = ?',
            [$user['sub']]
        );
        if (!$subscription) {
            return 0;
        }

        $remaining = max(0, (int)$subscription['ai_credits_remaining'] - 1);
        $this->db->execute('UPDATE subscriptions SET ai_credits_remaining = ? WHERE id = ?', [$remaining, $subscription['id']]);

        return $remaining;
    }

    private function storeChapterReview(string $researchId, string $userId, array &$review): void {
        $review['id'] = $review['id'] ?? generateUUID();
        $review['research_id'] = $researchId;
        $review['user_id'] = $userId;

        try {
            $this->db->execute(
                'INSERT INTO research_chapter_reviews (id, research_id, user_id, chapter_name, chapter_number, rating, summary, strengths, weak_areas, required_fixes, optional_improvements, ai_confidence_score, review_mode, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $review['id'],
                    $researchId,
                    $userId,
                    $review['chapter_name'],
                    $review['chapter_number'],
                    (int)($review['rating'] ?? 3),
                    (string)($review['summary'] ?? ''),
                    json_encode($review['strengths'] ?? []),
                    json_encode($review['weak_areas'] ?? []),
                    json_encode($review['required_fixes'] ?? []),
                    json_encode($review['optional_improvements'] ?? []),
                    (int)($review['ai_confidence_score'] ?? 75),
                    (string)($review['review_mode'] ?? 'quick'),
                    date('Y-m-d H:i:s'),
                    date('Y-m-d H:i:s'),
                ]
            );
        } catch (\Throwable $e) {
            error_log('Chapter review store failed: ' . $e->getMessage());
        }
    }
}
