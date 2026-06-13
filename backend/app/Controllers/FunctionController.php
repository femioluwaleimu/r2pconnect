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

            case 'paystack':
                $this->paystack($payload);
                return;

            case 'ai-collab-matcher':
                $this->aiCollabMatcher();
                return;

            case 'ai-match-challenge':
                $this->aiMatchChallenge($payload);
                return;

            case 'send-email':
                $this->sendEmailFunction($payload);
                return;

            case 'send-verification-code':
                $this->sendVerificationCode($payload);
                return;

            case 'send-collaboration-invite':
                $this->sendCollaborationInvite($payload);
                return;

            case 'send-job-feedback-notification':
                $this->sendJobFeedbackNotification($payload);
                return;

            case 'send-job-application-notification':
                $this->sendJobApplicationNotification($payload);
                return;

            case 'verify-code':
                $this->verifyCode($payload);
                return;

            case 'reset-password':
                $this->resetPassword($payload);
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

        try {
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
        } catch (\Throwable $e) {
            $this->aiErrorResponse('AI research request failed', $e);
        }
    }

    private function aiChapterReview(array $payload): void {
        $this->requireAuth();
        $user = $this->getUser();

        try {
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
        } catch (\Throwable $e) {
            $this->aiErrorResponse('AI chapter review failed', $e);
        }
    }

    private function previewTrainingPreset(array $payload): void {
        try {
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
        } catch (\Throwable $e) {
            $this->aiErrorResponse('AI training preview failed', $e);
        }
    }

    private function researchIntegrityCheck(array $payload): void {
        $this->requireAuth();

        try {
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
        } catch (\Throwable $e) {
            $this->aiErrorResponse('Research integrity check failed', $e);
        }
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

    private function sendEmailFunction(array $payload): void {
        $to = trim((string)($payload['to'] ?? $payload['email'] ?? ''));
        $type = (string)($payload['type'] ?? 'generic');
        $data = $payload['data'] ?? [];
        if (!is_array($data)) {
            $data = [];
        }
        $data = array_merge($payload, $data);

        if (!$this->isEmail($to)) {
            Response::json(['data' => null, 'error' => 'Recipient email is required'], 400);
            return;
        }

        $template = $this->emailTemplate($type, $data);
        $recipientName = (string)($data['name'] ?? $data['supervisorName'] ?? $data['reviewerName'] ?? $data['studentName'] ?? $data['adminName'] ?? '');
        $result = $this->sendZeptoMail($to, $recipientName, $template['subject'], $template['html']);
        Response::json(['data' => ['success' => true, 'message' => 'Email sent successfully', 'result' => $result], 'error' => null]);
    }

    private function sendVerificationCode(array $payload): void {
        $email = strtolower(trim((string)($payload['email'] ?? '')));
        $type = (string)($payload['type'] ?? 'email_verification');
        if (!$this->isEmail($email)) {
            Response::json(['data' => null, 'error' => 'A valid email is required'], 400);
            return;
        }

        if (!in_array($type, ['email_verification', 'password_reset', 'phone_verification'], true)) {
            Response::json(['data' => null, 'error' => 'Invalid verification type'], 400);
            return;
        }

        if ($type === 'password_reset') {
            $user = $this->db->getOne('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1', [$email]);
            if (!$user) {
                Response::json(['data' => ['success' => true, 'message' => 'If an account exists, a code will be sent'], 'error' => null]);
                return;
            }
        }

        $code = (string)random_int(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', time() + 15 * 60);

        $this->db->execute(
            'UPDATE verification_codes SET used = 1 WHERE email = ? AND type = ? AND used = 0',
            [$email, $type]
        );
        $this->db->execute(
            'INSERT INTO verification_codes (id, email, code, type, used, expires_at, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
            [generateUUID(), $email, $code, $type, $expiresAt, date('Y-m-d H:i:s')]
        );

        $subject = $type === 'password_reset' ? 'Reset Your R2P Connect Password' : 'Verify Your R2P Connect Email';
        $heading = $type === 'password_reset' ? 'Reset your password' : 'Verify your email';
        $message = $type === 'password_reset'
            ? 'Use the code below to continue resetting your password.'
            : 'Use the code below to verify your email address.';

        $html = $this->baseEmailHtml($heading, "
            <p style=\"font-size:16px;color:#334155;\">{$this->escape($message)}</p>
            <div style=\"text-align:center;margin:28px 0;\">
              <div style=\"display:inline-block;background:#f8fafc;border:2px dashed #2563eb;border-radius:12px;padding:18px 32px;\">
                <span style=\"font-size:34px;font-weight:700;letter-spacing:8px;color:#2563eb;\">{$code}</span>
              </div>
            </div>
            <p style=\"font-size:14px;color:#64748b;text-align:center;\">This code expires in 15 minutes.</p>
        ");

        $this->sendZeptoMail($email, '', $subject, $html);
        Response::json(['data' => ['success' => true, 'message' => 'Verification code sent'], 'error' => null]);
    }

    private function verifyCode(array $payload): void {
        $email = strtolower(trim((string)($payload['email'] ?? '')));
        $code = trim((string)($payload['code'] ?? ''));
        $type = (string)($payload['type'] ?? 'email_verification');

        if (!$this->isEmail($email) || $code === '') {
            Response::json(['data' => ['valid' => false, 'error' => 'Email and code are required'], 'error' => null], 400);
            return;
        }

        $row = $this->db->getOne(
            'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
            [$email, $code, $type]
        );

        if (!$row) {
            Response::json(['data' => ['valid' => false, 'error' => 'Invalid or expired verification code'], 'error' => null], 400);
            return;
        }

        if (strtotime((string)$row['expires_at']) < time()) {
            Response::json(['data' => ['valid' => false, 'error' => 'Verification code has expired'], 'error' => null], 400);
            return;
        }

        $role = null;
        if ($type === 'email_verification') {
            $this->db->execute('UPDATE verification_codes SET used = 1 WHERE id = ?', [$row['id']]);
            $user = $this->db->getOne('SELECT id FROM users WHERE email = ? LIMIT 1', [$email]);
            if ($user) {
                $this->db->execute('UPDATE users SET email_confirmed = 1, email_confirmed_at = ?, updated_at = ? WHERE id = ?', [date('Y-m-d H:i:s'), date('Y-m-d H:i:s'), $user['id']]);
                $this->db->execute('UPDATE profiles SET email_verified = 1 WHERE user_id = ?', [$user['id']]);
                $roleRow = $this->db->getOne('SELECT role FROM user_roles WHERE user_id = ? LIMIT 1', [$user['id']]);
                $role = $roleRow['role'] ?? null;
            }
        }

        Response::json(['data' => ['valid' => true, 'message' => 'Code verified successfully', 'role' => $role], 'error' => null]);
    }

    private function resetPassword(array $payload): void {
        $email = strtolower(trim((string)($payload['email'] ?? '')));
        $code = trim((string)($payload['code'] ?? ''));
        $password = (string)($payload['new_password'] ?? $payload['password'] ?? '');

        if (!$this->isEmail($email) || $code === '' || $password === '') {
            Response::json(['data' => ['success' => false, 'error' => 'Email, code, and new password are required'], 'error' => null], 400);
            return;
        }

        if (strlen($password) < 6) {
            Response::json(['data' => ['success' => false, 'error' => 'Password must be at least 6 characters'], 'error' => null], 400);
            return;
        }

        $row = $this->db->getOne(
            'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND expires_at >= ? ORDER BY created_at DESC LIMIT 1',
            [$email, $code, 'password_reset', date('Y-m-d H:i:s')]
        );
        if (!$row) {
            Response::json(['data' => ['success' => false, 'error' => 'Invalid or expired verification code'], 'error' => null], 400);
            return;
        }

        $user = $this->db->getOne('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1', [$email]);
        if (!$user) {
            Response::json(['data' => ['success' => false, 'error' => 'User not found'], 'error' => null], 404);
            return;
        }

        $this->db->execute('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [hashPassword($password), date('Y-m-d H:i:s'), $user['id']]);
        $this->db->execute('UPDATE verification_codes SET used = 1 WHERE id = ?', [$row['id']]);

        Response::json(['data' => ['success' => true, 'message' => 'Password reset successfully'], 'error' => null]);
    }

    private function sendCollaborationInvite(array $payload): void {
        $recipientEmail = trim((string)($payload['recipientEmail'] ?? $payload['to'] ?? ''));
        $recipientName = (string)($payload['recipientName'] ?? 'Researcher');
        $senderName = (string)($payload['senderName'] ?? 'A researcher');
        $message = (string)($payload['message'] ?? 'I would like to collaborate with you on research.');

        if (!$this->isEmail($recipientEmail)) {
            Response::json(['data' => null, 'error' => 'Recipient email is required'], 400);
            return;
        }

        $html = $this->baseEmailHtml('Research collaboration request', "
            <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($recipientName)},</p>
            <p style=\"font-size:16px;color:#334155;\"><strong>{$this->escape($senderName)}</strong> sent you a collaboration request on R2P Connect.</p>
            <div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:18px 0;color:#334155;white-space:pre-wrap;\">{$this->escape($message)}</div>
            {$this->buttonHtml('/dashboard/collaborations', 'View Collaboration Request')}
        ");

        $this->sendZeptoMail($recipientEmail, $recipientName, "Research Collaboration Request from {$senderName}", $html);
        $recipient = $this->db->getOne('SELECT user_id FROM profiles WHERE email = ? LIMIT 1', [$recipientEmail]);
        if ($recipient) {
            $this->createNotification($recipient['user_id'], 'New Collaboration Request', "{$senderName} wants to collaborate with you on research.", 'collaboration_invite', '/dashboard/collaborations');
        }

        Response::json(['data' => ['success' => true], 'error' => null]);
    }

    private function sendJobApplicationNotification(array $payload): void {
        $this->requireAuth();
        $applicationId = (string)($payload['applicationId'] ?? $payload['application_id'] ?? '');
        if ($applicationId === '') {
            Response::json(['data' => null, 'error' => 'applicationId is required'], 400);
            return;
        }

        $app = $this->db->getOne('SELECT * FROM job_applications WHERE id = ? LIMIT 1', [$applicationId]);
        if (!$app) {
            Response::json(['data' => null, 'error' => 'Application not found'], 404);
            return;
        }

        $job = $this->db->getOne('SELECT * FROM job_postings WHERE id = ? LIMIT 1', [$app['job_id']]);
        if (!$job) {
            Response::json(['data' => null, 'error' => 'Job not found'], 404);
            return;
        }

        $industry = $this->db->getOne('SELECT email, full_name FROM profiles WHERE user_id = ? LIMIT 1', [$job['industry_id']]);
        $student = $this->db->getOne('SELECT email, full_name FROM profiles WHERE user_id = ? LIMIT 1', [$app['student_id']]);
        $jobTitle = (string)$job['title'];
        $companyName = (string)($job['company_name'] ?: ($industry['full_name'] ?? 'Company'));
        $studentName = (string)($app['student_name'] ?: ($student['full_name'] ?? 'A student'));

        if (!empty($industry['email']) && $this->isEmail($industry['email'])) {
            $html = $this->baseEmailHtml('New job application', "
                <p style=\"font-size:16px;color:#334155;\">You received a new application for <strong>{$this->escape($jobTitle)}</strong>.</p>
                <p style=\"font-size:16px;color:#334155;\">Applicant: <strong>{$this->escape($studentName)}</strong></p>
                {$this->buttonHtml('/industry/applications', 'View Applications')}
            ");
            $this->sendZeptoMail($industry['email'], (string)($industry['full_name'] ?? $companyName), "New application for {$jobTitle}", $html);
            $this->createNotification($job['industry_id'], 'New Job Application', "{$studentName} applied for {$jobTitle}", 'info', '/industry/applications');
        }

        if (!empty($student['email']) && $this->isEmail($student['email'])) {
            $html = $this->baseEmailHtml('Application submitted', "
                <p style=\"font-size:16px;color:#334155;\">Your application for <strong>{$this->escape($jobTitle)}</strong> at {$this->escape($companyName)} was submitted successfully.</p>
                {$this->buttonHtml('/dashboard/job-board', 'View My Applications')}
            ");
            $this->sendZeptoMail($student['email'], (string)($student['full_name'] ?? $studentName), "Application submitted - {$jobTitle}", $html);
            $this->createNotification($app['student_id'], 'Application Submitted', "Your application for {$jobTitle} has been submitted.", 'success', '/dashboard/job-board');
        }

        Response::json(['data' => ['success' => true], 'error' => null]);
    }

    private function sendJobFeedbackNotification(array $payload): void {
        $this->requireAuth();
        $feedbackId = (string)($payload['feedbackId'] ?? $payload['feedback_id'] ?? '');
        if ($feedbackId === '') {
            Response::json(['data' => null, 'error' => 'feedbackId is required'], 400);
            return;
        }

        $feedback = $this->db->getOne('SELECT * FROM job_feedback_messages WHERE id = ? LIMIT 1', [$feedbackId]);
        if (!$feedback) {
            Response::json(['data' => null, 'error' => 'Feedback not found'], 404);
            return;
        }

        $recipientId = null;
        $jobTitle = 'Job';
        $link = '/dashboard/job-board';
        if (($feedback['application_type'] ?? 'direct') === 'ipn') {
            $app = $this->db->getOne('SELECT * FROM ipn_applications WHERE id = ? LIMIT 1', [$feedback['application_id']]);
            if ($app) {
                $opportunity = $this->db->getOne('SELECT title, ipn_user_id FROM ipn_opportunities WHERE id = ? LIMIT 1', [$app['opportunity_id']]);
                $jobTitle = (string)($opportunity['title'] ?? 'Opportunity');
                $recipientId = $feedback['sender_role'] === 'employer' ? $app['applicant_id'] : ($opportunity['ipn_user_id'] ?? null);
                $link = $feedback['sender_role'] === 'employer' ? '/dashboard/job-board' : '/ipn/applicants';
            }
        } else {
            $app = $this->db->getOne('SELECT * FROM job_applications WHERE id = ? LIMIT 1', [$feedback['application_id']]);
            if ($app) {
                $job = $this->db->getOne('SELECT title, industry_id FROM job_postings WHERE id = ? LIMIT 1', [$app['job_id']]);
                $jobTitle = (string)($job['title'] ?? 'Job');
                $recipientId = $feedback['sender_role'] === 'employer' ? $app['student_id'] : ($job['industry_id'] ?? null);
                $link = $feedback['sender_role'] === 'employer' ? '/dashboard/job-board' : '/industry/applications';
            }
        }

        if (!$recipientId) {
            Response::json(['data' => ['success' => true, 'note' => 'No recipient found'], 'error' => null]);
            return;
        }

        $sender = $this->db->getOne('SELECT full_name FROM profiles WHERE user_id = ? LIMIT 1', [$feedback['sender_id']]);
        $senderName = (string)($sender['full_name'] ?? 'Someone');
        $recipient = $this->db->getOne('SELECT email, full_name FROM profiles WHERE user_id = ? LIMIT 1', [$recipientId]);

        $this->createNotification($recipientId, 'New Feedback Message', "{$senderName} sent feedback regarding \"{$jobTitle}\"", 'info', $link);

        if (!empty($recipient['email']) && $this->isEmail($recipient['email'])) {
            $html = $this->baseEmailHtml('New feedback message', "
                <p style=\"font-size:16px;color:#334155;\">{$this->escape($senderName)} sent you a message regarding <strong>{$this->escape($jobTitle)}</strong>.</p>
                <div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:18px 0;color:#334155;white-space:pre-wrap;\">{$this->escape((string)$feedback['message'])}</div>
                {$this->buttonHtml($link, 'View and Reply')}
            ");
            $this->sendZeptoMail($recipient['email'], (string)($recipient['full_name'] ?? 'User'), "New feedback on {$jobTitle}", $html);
        }

        Response::json(['data' => ['success' => true], 'error' => null]);
    }

    private function paystack(array $payload): void {
        $action = (string)($payload['action'] ?? '');

        try {
            switch ($action) {
                case 'initialize':
                    $this->initializeSubscriptionPayment($payload);
                    return;

                case 'verify':
                    $this->verifySubscriptionPayment($payload);
                    return;

                case 'activate_free_subscription':
                    $this->activateFreeSubscription($payload);
                    return;

                case 'initialize_wallet':
                    $this->initializeWalletPayment($payload);
                    return;

                case 'verify_wallet':
                    $this->verifyWalletPayment($payload);
                    return;

                case 'initialize_topup':
                    $this->initializeTopupPayment($payload);
                    return;

                case 'verify_topup':
                    $this->verifyTopupPayment($payload);
                    return;

                case 'initialize_ipn_activation':
                    $this->initializeIpnActivationPayment($payload);
                    return;

                case 'verify_ipn_activation':
                    $this->verifyIpnActivationPayment($payload);
                    return;

                case 'initialize_job_application':
                    $this->initializeJobApplicationPayment($payload);
                    return;

                case 'verify_job_application':
                    $this->verifyJobApplicationPayment($payload);
                    return;

                default:
                    Response::json(['data' => null, 'error' => 'Unknown Paystack action'], 400);
                    return;
            }
        } catch (\Exception $e) {
            error_log('Paystack function error: ' . $e->getMessage());
            Response::json(['data' => null, 'error' => $e->getMessage()], 500);
        }
    }

    private function initializeSubscriptionPayment(array $payload): void {
        $user = $this->currentUserOrFail();
        $tier = $this->normalizeTier((string)($payload['planId'] ?? ''));
        $userType = (string)($payload['userType'] ?? $this->roleForUser($user['sub']) ?? 'researcher');
        $planId = "{$userType}_{$tier}";

        $plan = $this->db->getOne('SELECT * FROM subscription_plans WHERE plan_id = ? AND is_active = 1', [$planId]);
        if (!$plan) {
            throw new \RuntimeException('Subscription plan not found');
        }

        if ($tier === 'free' || (float)$plan['amount_ngn'] <= 0) {
            $subscription = $this->upsertSubscription($user['sub'], $plan, 0, null);
            Response::json(['data' => [
                'success' => true,
                'tier' => $tier,
                'subscription_id' => $subscription['id'],
                'aiCredits' => (int)($plan['ai_credits_per_day'] ?? 0),
            ], 'error' => null]);
            return;
        }

        $coupon = $this->couponFromPayload($payload);
        $amount = $this->discountedAmount((float)$plan['amount_ngn'], $coupon);
        $reference = $this->makeReference('sub');
        $callback = $this->callbackUrlFor($userType, $payload, $reference);

        $this->db->execute(
            'INSERT INTO payment_history (id, user_id, amount, currency, plan_name, tier, reference, status, payment_method, coupon_code, discount_amount, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                generateUUID(),
                $user['sub'],
                $amount,
                'NGN',
                $plan['name'] ?? $planId,
                $tier,
                $reference,
                'pending',
                'paystack',
                $coupon['code'] ?? null,
                $coupon ? ((float)$plan['amount_ngn'] - $amount) : null,
                date('Y-m-d H:i:s'),
            ]
        );

        $paystack = $this->paystackInitialize($user['email'] ?? $this->emailForUser($user['sub']), $amount, $reference, $callback, [
            'type' => 'subscription',
            'user_id' => $user['sub'],
            'plan_id' => $planId,
            'tier' => $tier,
            'user_type' => $userType,
            'coupon_id' => $coupon['id'] ?? null,
        ]);

        Response::json(['data' => [
            'authorization_url' => $paystack['authorization_url'],
            'reference' => $paystack['reference'],
            'access_code' => $paystack['access_code'] ?? null,
        ], 'error' => null]);
    }

    private function verifySubscriptionPayment(array $payload): void {
        $reference = $this->validatedReference($payload);
        $payment = $this->paymentByReference($reference);
        $verify = $this->paystackVerify($reference);

        if (($verify['status'] ?? '') !== 'success') {
            $this->markPaymentFailed($reference);
            Response::json(['data' => ['success' => false, 'message' => 'Payment was not successful'], 'error' => null]);
            return;
        }

        if (($payment['status'] ?? '') !== 'success') {
            $tier = $this->normalizeTier((string)($payment['tier'] ?? ''));
            $userType = $this->subscriptionUserTypeForPayment($payment);
            $planId = "{$userType}_{$tier}";
            $plan = $this->db->getOne('SELECT * FROM subscription_plans WHERE plan_id = ?', [$planId]);
            if (!$plan) {
                throw new \RuntimeException('Subscription plan not found');
            }

            $subscription = $this->upsertSubscription($payment['user_id'], $plan, (float)$payment['amount'], $reference);
            $this->completePayment($reference);
            $couponId = $this->couponIdFromCode($payment['coupon_code'] ?? null);
            $this->recordCouponUsage($couponId, $payment['user_id'], $subscription['id'], (float)$plan['amount_ngn'], (float)$payment['amount']);
        }

        Response::json(['data' => [
            'success' => true,
            'status' => 'success',
            'tier' => $payment['tier'] ?? null,
            'aiCredits' => isset($plan) ? (int)($plan['ai_credits_per_day'] ?? 0) : null,
        ], 'error' => null]);
    }

    private function activateFreeSubscription(array $payload): void {
        $user = $this->currentUserOrFail();
        $tier = $this->normalizeTier((string)($payload['planId'] ?? ''));
        $userType = (string)($payload['userType'] ?? $this->roleForUser($user['sub']) ?? 'researcher');
        $planId = "{$userType}_{$tier}";
        $coupon = $this->couponFromPayload($payload);

        if (!$coupon || (int)$coupon['discount_percentage'] < 100) {
            Response::json(['data' => null, 'error' => 'A valid 100% coupon is required'], 400);
            return;
        }

        $plan = $this->db->getOne('SELECT * FROM subscription_plans WHERE plan_id = ? AND is_active = 1', [$planId]);
        if (!$plan) {
            throw new \RuntimeException('Subscription plan not found');
        }

        $subscription = $this->upsertSubscription($user['sub'], $plan, 0, null);
        $this->recordCouponUsage($coupon['id'], $user['sub'], $subscription['id'], (float)$plan['amount_ngn'], 0);

        $reference = $this->makeReference('coupon');
        $this->db->execute(
            'INSERT INTO payment_history (id, user_id, amount, currency, plan_name, tier, reference, status, payment_method, coupon_code, discount_amount, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateUUID(), $user['sub'], 0, 'NGN', $plan['name'] ?? $planId, $tier, $reference, 'success', 'coupon', $coupon['code'], (float)$plan['amount_ngn'], date('Y-m-d H:i:s')]
        );

        Response::json(['data' => ['success' => true, 'tier' => $tier], 'error' => null]);
    }

    private function initializeWalletPayment(array $payload): void {
        $user = $this->currentUserOrFail();
        $amount = (float)($payload['amount'] ?? 0);
        if ($amount < 100) {
            Response::json(['data' => null, 'error' => 'Minimum amount is NGN 100'], 400);
            return;
        }

        $reference = $this->makeReference('wallet');
        $callback = (string)($payload['callback_url'] ?? '');
        $this->insertPayment($user['sub'], $amount, $reference, 'Wallet Funding', 'wallet');

        $paystack = $this->paystackInitialize($user['email'] ?? $this->emailForUser($user['sub']), $amount, $reference, $callback, [
            'type' => 'wallet_funding',
            'user_id' => $user['sub'],
            'amount_ngn' => $amount,
        ]);

        Response::json(['data' => ['authorization_url' => $paystack['authorization_url'], 'reference' => $paystack['reference']], 'error' => null]);
    }

    private function verifyWalletPayment(array $payload): void {
        $reference = $this->validatedReference($payload);
        $payment = $this->paymentByReference($reference);
        $verify = $this->paystackVerify($reference);
        if (($verify['status'] ?? '') !== 'success') {
            Response::json(['data' => ['success' => false, 'message' => 'Payment verification failed'], 'error' => null]);
            return;
        }

        if (($payment['status'] ?? '') !== 'success') {
            $this->upsertIndustryWallet($payment['user_id'], (float)$payment['amount'], 'fund');
            $this->recordWalletTransaction($payment['user_id'], 'funding', (float)$payment['amount'], 'Wallet funding via Paystack', $reference);
            $this->completePayment($reference);
        }

        Response::json(['data' => ['success' => true, 'status' => 'success', 'amount' => (float)$payment['amount']], 'error' => null]);
    }

    private function initializeTopupPayment(array $payload): void {
        $user = $this->currentUserOrFail();
        $packageId = (string)($payload['package_id'] ?? '');
        $package = $this->db->getOne('SELECT * FROM credit_topup_packages WHERE id = ? AND is_active = 1', [$packageId]);
        if (!$package) {
            Response::json(['data' => null, 'error' => 'Top-up package not found'], 404);
            return;
        }

        $reference = $this->makeReference('topup');
        $callback = (string)($payload['callback_url'] ?? '');
        $amount = (float)$package['amount_ngn'];
        $this->insertPayment($user['sub'], $amount, $reference, (string)($package['name'] ?? 'AI Credit Top-up'), 'credit_topup');
        $this->db->execute(
            'INSERT INTO credit_topup_purchases (id, user_id, package_id, credits, amount, currency, reference, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateUUID(), $user['sub'], $packageId, (int)$package['credits'], $amount, 'NGN', $reference, 'pending', date('Y-m-d H:i:s')]
        );

        $paystack = $this->paystackInitialize($user['email'] ?? $this->emailForUser($user['sub']), $amount, $reference, $callback, [
            'type' => 'credit_topup',
            'user_id' => $user['sub'],
            'package_id' => $packageId,
            'credits' => (int)$package['credits'],
        ]);

        Response::json(['data' => ['authorization_url' => $paystack['authorization_url'], 'reference' => $paystack['reference']], 'error' => null]);
    }

    private function verifyTopupPayment(array $payload): void {
        $reference = $this->validatedReference($payload);
        $payment = $this->paymentByReference($reference);
        $verify = $this->paystackVerify($reference);
        if (($verify['status'] ?? '') !== 'success') {
            Response::json(['data' => ['success' => false, 'message' => 'Payment verification failed'], 'error' => null]);
            return;
        }

        $purchase = $this->db->getOne('SELECT * FROM credit_topup_purchases WHERE reference = ?', [$reference]);
        if (!$purchase) {
            throw new \RuntimeException('Top-up purchase not found');
        }

        if (($purchase['status'] ?? '') !== 'completed') {
            $this->db->execute('UPDATE credit_topup_purchases SET status = ? WHERE reference = ?', ['completed', $reference]);
            $this->db->execute('UPDATE subscriptions SET ai_credits_remaining = COALESCE(ai_credits_remaining, 0) + ? WHERE user_id = ?', [(int)$purchase['credits'], $payment['user_id']]);
        }

        if (($payment['status'] ?? '') !== 'success') {
            $this->completePayment($reference);
        }

        Response::json(['data' => ['success' => true, 'credits' => (int)$purchase['credits']], 'error' => null]);
    }

    private function initializeIpnActivationPayment(array $payload): void {
        $user = $this->currentUserOrFail();
        $amount = (float)($payload['amount'] ?? 0);
        if ($amount <= 0) {
            Response::json(['data' => null, 'error' => 'Invalid activation amount'], 400);
            return;
        }

        $reference = $this->makeReference('ipn_activation');
        $callback = (string)($payload['callback_url'] ?? '');
        $this->insertPayment($user['sub'], $amount, $reference, 'IPN Activation', 'ipn_activation');

        $this->db->execute(
            'UPDATE ipn_activations SET payment_reference = ?, payment_amount = ?, status = ? WHERE user_id = ?',
            [$reference, $amount, 'pending_payment', $user['sub']]
        );

        $paystack = $this->paystackInitialize($user['email'] ?? $this->emailForUser($user['sub']), $amount, $reference, $callback, [
            'type' => 'ipn_activation',
            'user_id' => $user['sub'],
        ]);

        Response::json(['data' => ['authorization_url' => $paystack['authorization_url'], 'reference' => $paystack['reference']], 'error' => null]);
    }

    private function verifyIpnActivationPayment(array $payload): void {
        $reference = $this->validatedReference($payload);
        $payment = $this->paymentByReference($reference);
        $verify = $this->paystackVerify($reference);
        if (($verify['status'] ?? '') !== 'success') {
            Response::json(['data' => ['success' => false, 'message' => 'Payment verification failed'], 'error' => null]);
            return;
        }

        if (($payment['status'] ?? '') !== 'success') {
            $this->db->execute(
                'UPDATE ipn_activations SET status = ?, payment_reference = ?, payment_amount = ? WHERE user_id = ?',
                ['pending_review', $reference, (float)$payment['amount'], $payment['user_id']]
            );
            $this->completePayment($reference);
        }

        Response::json(['data' => ['success' => true, 'amount' => (float)$payment['amount']], 'error' => null]);
    }

    private function initializeJobApplicationPayment(array $payload): void {
        $user = $this->currentUserOrFail();
        $jobId = (string)($payload['job_id'] ?? '');
        $amount = (float)($payload['amount'] ?? 0);
        if ($jobId === '' || $amount <= 0) {
            Response::json(['data' => null, 'error' => 'Job and payment amount are required'], 400);
            return;
        }

        $reference = $this->makeReference('job');
        $callback = (string)($payload['callback_url'] ?? '');
        $this->insertPayment($user['sub'], $amount, $reference, 'Job Application', 'job_application');

        $platformShare = round($amount * 0.2, 2);
        $ownerShare = $amount - $platformShare;
        $directJob = $this->db->getOne('SELECT id FROM job_postings WHERE id = ? LIMIT 1', [$jobId]);
        if ($directJob) {
            $this->db->execute(
                'INSERT INTO industry_job_payments (id, job_id, applicant_id, amount_ngn, industry_share_ngn, platform_share_ngn, paystack_reference, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [generateUUID(), $jobId, $user['sub'], $amount, $ownerShare, $platformShare, $reference, 'pending', date('Y-m-d H:i:s')]
            );
        } else {
            $ipnOpportunity = $this->db->getOne('SELECT id FROM ipn_opportunities WHERE id = ? LIMIT 1', [$jobId]);
            if (!$ipnOpportunity) {
                throw new \RuntimeException('Job or opportunity not found');
            }

            $this->db->execute(
                'INSERT INTO ipn_payments (id, opportunity_id, applicant_id, amount_ngn, ipn_share_ngn, platform_share_ngn, paystack_reference, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [generateUUID(), $jobId, $user['sub'], $amount, $ownerShare, $platformShare, $reference, 'pending', date('Y-m-d H:i:s')]
            );
        }

        $paystack = $this->paystackInitialize($user['email'] ?? $this->emailForUser($user['sub']), $amount, $reference, $callback, [
            'type' => 'job_application',
            'user_id' => $user['sub'],
            'job_id' => $jobId,
        ]);

        Response::json(['data' => ['authorization_url' => $paystack['authorization_url'], 'reference' => $paystack['reference']], 'error' => null]);
    }

    private function verifyJobApplicationPayment(array $payload): void {
        $reference = $this->validatedReference($payload);
        $payment = $this->paymentByReference($reference);
        $verify = $this->paystackVerify($reference);
        if (($verify['status'] ?? '') !== 'success') {
            Response::json(['data' => ['success' => false, 'message' => 'Payment verification failed'], 'error' => null]);
            return;
        }

        if (($payment['status'] ?? '') !== 'success') {
            $this->db->execute('UPDATE industry_job_payments SET status = ? WHERE paystack_reference = ?', ['success', $reference]);
            $this->db->execute('UPDATE ipn_payments SET status = ? WHERE paystack_reference = ?', ['success', $reference]);
            $this->completePayment($reference);
        }

        Response::json(['data' => ['success' => true, 'status' => 'success', 'amount' => (float)$payment['amount']], 'error' => null]);
    }

    private function currentUserOrFail(): array {
        $this->requireAuth();
        $user = $this->getUser();
        if (!$user || empty($user['sub'])) {
            throw new \RuntimeException('Unauthorized');
        }
        if (empty($user['email'])) {
            $user['email'] = $this->emailForUser($user['sub']);
        }
        return $user;
    }

    private function paystackSecret(): string {
        $secret = trim((string)env('PAYSTACK_SECRET_KEY', ''));
        if ($secret === '' || strpos($secret, 'xxxxxxxx') !== false || strpos($secret, 'sk_test_xxx') === 0) {
            throw new \RuntimeException('Paystack is not configured');
        }
        return $secret;
    }

    private function paystackInitialize(string $email, float $amount, string $reference, string $callbackUrl, array $metadata): array {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('A valid email is required for payment');
        }

        $body = [
            'email' => $email,
            'amount' => (int)round($amount * 100),
            'currency' => 'NGN',
            'reference' => $reference,
            'metadata' => $metadata,
        ];

        if ($callbackUrl !== '') {
            $body['callback_url'] = $callbackUrl;
        }

        $response = $this->paystackRequest('POST', 'https://api.paystack.co/transaction/initialize', $body);
        if (!($response['status'] ?? false) || empty($response['data']['authorization_url'])) {
            throw new \RuntimeException((string)($response['message'] ?? 'Failed to initialize payment'));
        }

        return $response['data'];
    }

    private function paystackVerify(string $reference): array {
        $response = $this->paystackRequest('GET', 'https://api.paystack.co/transaction/verify/' . rawurlencode($reference));
        if (!($response['status'] ?? false)) {
            throw new \RuntimeException((string)($response['message'] ?? 'Payment verification failed'));
        }
        return $response['data'];
    }

    private function paystackRequest(string $method, string $url, ?array $body = null): array {
        if (!function_exists('curl_init')) {
            throw new \RuntimeException('PHP cURL extension is required for Paystack');
        }

        $curl = curl_init();
        $headers = [
            'Authorization: Bearer ' . $this->paystackSecret(),
            'Content-Type: application/json',
        ];

        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
        ]);

        if ($body !== null) {
            curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $raw = curl_exec($curl);
        $error = curl_error($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($error) {
            throw new \RuntimeException('Paystack request failed: ' . $error);
        }

        $decoded = json_decode((string)$raw, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid response from Paystack');
        }

        if ($status >= 400) {
            throw new \RuntimeException((string)($decoded['message'] ?? 'Paystack request failed'));
        }

        return $decoded;
    }

    private function insertPayment(string $userId, float $amount, string $reference, string $planName, string $tier): void {
        $this->db->execute(
            'INSERT INTO payment_history (id, user_id, amount, currency, plan_name, tier, reference, status, payment_method, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                generateUUID(),
                $userId,
                $amount,
                'NGN',
                $planName,
                $tier,
                $reference,
                'pending',
                'paystack',
                date('Y-m-d H:i:s'),
            ]
        );
    }

    private function completePayment(string $reference): void {
        $this->db->execute('UPDATE payment_history SET status = ? WHERE reference = ?', ['success', $reference]);
    }

    private function markPaymentFailed(string $reference): void {
        $this->db->execute('UPDATE payment_history SET status = ? WHERE reference = ?', ['failed', $reference]);
    }

    private function paymentByReference(string $reference): array {
        $payment = $this->db->getOne('SELECT * FROM payment_history WHERE reference = ?', [$reference]);
        if (!$payment) {
            throw new \RuntimeException('Payment record not found');
        }
        return $payment;
    }

    private function validatedReference(array $payload): string {
        $reference = (string)($payload['reference'] ?? '');
        if ($reference === '' || !preg_match('/^[a-zA-Z0-9_-]+$/', $reference)) {
            throw new \RuntimeException('Invalid payment reference');
        }
        return $reference;
    }

    private function makeReference(string $prefix): string {
        $safePrefix = preg_replace('/[^a-zA-Z0-9_]/', '_', $prefix) ?: 'pay';
        return $safePrefix . '_' . bin2hex(random_bytes(8)) . '_' . time();
    }

    private function normalizeTier(string $planId): string {
        $tier = preg_replace('/^(researcher|industry|supervisor)_/', '', $planId);
        $tier = strtolower((string)$tier);
        return in_array($tier, ['free', 'basic', 'pro', 'enterprise'], true) ? $tier : 'free';
    }

    private function tierFromPlanId(string $planId): string {
        return $this->normalizeTier($planId);
    }

    private function subscriptionUserTypeForPayment(array $payment): string {
        $role = $this->roleForUser((string)$payment['user_id']);
        if ($role === 'industry') {
            return 'industry';
        }
        if ($role === 'supervisor') {
            return 'supervisor';
        }
        return 'researcher';
    }

    private function couponIdFromCode(?string $code): ?string {
        $code = trim((string)$code);
        if ($code === '') {
            return null;
        }

        $coupon = $this->db->getOne('SELECT id FROM coupon_codes WHERE code = ? LIMIT 1', [$code]);
        return $coupon['id'] ?? null;
    }

    private function roleForUser(string $userId): ?string {
        $row = $this->db->getOne('SELECT role FROM user_roles WHERE user_id = ? LIMIT 1', [$userId]);
        return $row['role'] ?? null;
    }

    private function emailForUser(string $userId): string {
        $row = $this->db->getOne('SELECT email FROM users WHERE id = ? LIMIT 1', [$userId]);
        return (string)($row['email'] ?? '');
    }

    private function callbackUrlFor(string $userType, array $payload, string $reference): string {
        $callback = (string)($payload['callback_url'] ?? '');
        if ($callback !== '') {
            return $callback;
        }

        $base = rtrim((string)env('APP_URL', ''), '/');
        if ($base === '') {
            return '';
        }

        $path = $userType === 'industry' ? '/industry/subscriptions' : '/dashboard/subscriptions';
        return $base . $path . '?verify=true&reference=' . rawurlencode($reference);
    }

    private function couponFromPayload(array $payload): ?array {
        $couponId = (string)($payload['couponId'] ?? '');
        if ($couponId === '') {
            return null;
        }

        $coupon = $this->db->getOne('SELECT * FROM coupon_codes WHERE id = ? AND is_active = 1', [$couponId]);
        if (!$coupon) {
            throw new \RuntimeException('Invalid coupon');
        }

        if (!empty($coupon['valid_until']) && strtotime((string)$coupon['valid_until']) < time()) {
            throw new \RuntimeException('This coupon has expired');
        }

        if (!empty($coupon['max_uses']) && (int)$coupon['current_uses'] >= (int)$coupon['max_uses']) {
            throw new \RuntimeException('This coupon has reached its usage limit');
        }

        return $coupon;
    }

    private function discountedAmount(float $amount, ?array $coupon): float {
        if (!$coupon) {
            return $amount;
        }
        $discount = max(0, min(100, (int)$coupon['discount_percentage']));
        return max(0, round($amount - (($amount * $discount) / 100), 2));
    }

    private function upsertSubscription(string $userId, array $plan, float $amount, ?string $reference): array {
        $tier = $this->tierFromPlanId((string)$plan['plan_id']);
        $now = date('Y-m-d H:i:s');
        $end = date('Y-m-d H:i:s', strtotime('+1 month'));
        $credits = (int)($plan['ai_credits_per_day'] ?? 0);
        $matches = (int)($plan['ai_matches_per_challenge'] ?? 0);
        $maxChallenges = (int)($plan['max_challenges'] ?? 0);

        $existing = $this->db->getOne('SELECT id FROM subscriptions WHERE user_id = ?', [$userId]);
        if ($existing) {
            $this->db->execute(
                'UPDATE subscriptions
                 SET tier = ?, amount = ?, currency = ?, current_period_start = ?, current_period_end = ?, ai_credits_remaining = ?, ai_matchers_remaining = ?, max_challenges_per_month = ?, ai_matches_per_challenge = ?, is_active = 1, updated_at = ?
                 WHERE user_id = ?',
                [$tier, $amount, 'NGN', $now, $end, $credits, $matches, $maxChallenges, $matches, $now, $userId]
            );
            return ['id' => $existing['id']];
        }

        $id = generateUUID();
        $this->db->execute(
            'INSERT INTO subscriptions (id, user_id, tier, amount, currency, current_period_start, current_period_end, ai_credits_remaining, ai_matchers_remaining, max_challenges_per_month, ai_matches_per_challenge, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
            [$id, $userId, $tier, $amount, 'NGN', $now, $end, $credits, $matches, $maxChallenges, $matches, $now, $now]
        );

        return ['id' => $id];
    }

    private function recordCouponUsage(?string $couponId, string $userId, string $subscriptionId, float $originalAmount, float $finalAmount): void {
        if (!$couponId) {
            return;
        }

        $coupon = $this->db->getOne('SELECT code FROM coupon_codes WHERE id = ?', [$couponId]);
        $discount = max(0, $originalAmount - $finalAmount);
        $this->db->execute(
            'INSERT INTO coupon_usages (id, coupon_id, user_id, subscription_id, original_amount, discount_amount, final_amount, activation_month, used_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateUUID(), $couponId, $userId, $subscriptionId, $originalAmount, $discount, $finalAmount, date('Y-m-01'), date('Y-m-d H:i:s')]
        );
        $this->db->execute('UPDATE coupon_codes SET current_uses = COALESCE(current_uses, 0) + 1 WHERE id = ?', [$couponId]);
    }

    private function upsertIndustryWallet(string $userId, float $amount, string $mode): void {
        $wallet = $this->db->getOne('SELECT id, balance, total_funded FROM industry_wallet WHERE user_id = ?', [$userId]);
        if ($wallet) {
            $this->db->execute(
                'UPDATE industry_wallet SET balance = COALESCE(balance, 0) + ?, total_funded = COALESCE(total_funded, 0) + ? WHERE user_id = ?',
                [$amount, $amount, $userId]
            );
            return;
        }

        $this->db->execute(
            'INSERT INTO industry_wallet (id, user_id, balance, total_funded, currency, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [generateUUID(), $userId, $amount, $amount, 'NGN', date('Y-m-d H:i:s'), date('Y-m-d H:i:s')]
        );
    }

    private function recordWalletTransaction(string $userId, string $type, float $amount, string $description, string $reference): void {
        $this->db->execute(
            'INSERT INTO wallet_transactions (id, user_id, transaction_type, type, amount, currency, description, reference, source, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateUUID(), $userId, $type, 'credit', $amount, 'NGN', $description, $reference, 'paystack', 'completed', date('Y-m-d H:i:s')]
        );
    }

    private function sendZeptoMail(string $to, string $toName, string $subject, string $html): array {
        if (!function_exists('curl_init')) {
            throw new \RuntimeException('PHP cURL extension is required for email sending');
        }

        $apiKey = trim((string)env('ZEPTOMAIL_API_KEY', ''));
        if ($apiKey === '' || strpos($apiKey, 'xxxxxxxx') !== false) {
            throw new \RuntimeException('ZeptoMail is not configured');
        }

        $auth = strpos($apiKey, 'Zoho-enczapikey') === 0 ? $apiKey : 'Zoho-enczapikey ' . $apiKey;
        $fromAddress = (string)env('MAIL_FROM_ADDRESS', 'noreply@r2pconnect.com');
        $fromName = (string)env('MAIL_FROM_NAME', 'R2P Connect');

        $payload = [
            'from' => [
                'address' => $fromAddress,
                'name' => $fromName,
            ],
            'to' => [[
                'email_address' => [
                    'address' => $to,
                    'name' => $toName !== '' ? $toName : $to,
                ],
            ]],
            'subject' => $subject,
            'htmlbody' => $html,
        ];

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => 'https://api.zeptomail.com/v1.1/email',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $auth,
                'Content-Type: application/json',
            ],
        ]);

        $raw = curl_exec($curl);
        $error = curl_error($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($error) {
            throw new \RuntimeException('ZeptoMail request failed: ' . $error);
        }

        $decoded = json_decode((string)$raw, true);
        if ($status >= 400) {
            $message = is_array($decoded) ? (string)($decoded['message'] ?? 'Failed to send email') : 'Failed to send email';
            throw new \RuntimeException($message);
        }

        return is_array($decoded) ? $decoded : ['status' => 'sent'];
    }

    private function emailTemplate(string $type, array $data): array {
        $title = (string)($data['title'] ?? 'Notification');
        $message = (string)($data['message'] ?? '');
        $subject = (string)($data['subject'] ?? 'Notification from R2P Connect');

        switch ($type) {
            case 'welcome':
                $name = (string)($data['name'] ?? 'Researcher');
                return [
                    'subject' => 'Welcome to R2P Connect',
                    'html' => $this->baseEmailHtml('Welcome to R2P Connect', "
                        <p style=\"font-size:16px;color:#334155;\">Hi {$this->escape($name)},</p>
                        <p style=\"font-size:16px;color:#334155;\">Thank you for joining R2P Connect. You can now upload research, discover opportunities, and collaborate across the platform.</p>
                        {$this->buttonHtml('/dashboard', 'Go to Dashboard')}
                    "),
                ];

            case 'subscription_activated':
                $planName = (string)($data['planName'] ?? $data['plan'] ?? 'Your');
                return [
                    'subject' => "{$planName} Subscription Activated",
                    'html' => $this->baseEmailHtml('Subscription activated', "
                        <p style=\"font-size:16px;color:#334155;\">Your {$this->escape($planName)} subscription is now active.</p>
                        <p style=\"font-size:16px;color:#334155;\">Amount: NGN {$this->escape((string)($data['amount'] ?? '0'))}</p>
                        {$this->buttonHtml('/dashboard/subscriptions', 'View Subscription')}
                    "),
                ];

            case 'research_published':
                $paperTitle = (string)($data['title'] ?? 'Your research');
                return [
                    'subject' => "Your research is now published",
                    'html' => $this->baseEmailHtml('Research published', "
                        <p style=\"font-size:16px;color:#334155;\">Congratulations. Your research paper is now published on R2P Connect.</p>
                        <div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:18px 0;\"><strong>{$this->escape($paperTitle)}</strong></div>
                        {$this->buttonHtml('/dashboard/research', 'View Research')}
                    "),
                ];

            case 'ipn_activation_submitted':
                return [
                    'subject' => 'New IPN Activation Request',
                    'html' => $this->baseEmailHtml('New IPN activation request', "
                        <p style=\"font-size:16px;color:#334155;\">An IPN activation request has been submitted.</p>
                        <p style=\"font-size:16px;color:#334155;\">Company: {$this->escape((string)($data['companyName'] ?? 'Unknown'))}</p>
                        <p style=\"font-size:16px;color:#334155;\">Email: {$this->escape((string)($data['email'] ?? ''))}</p>
                        {$this->buttonHtml('/admin/ipn', 'Review Request')}
                    "),
                ];

            case 'ipn_id_accepted':
                $name = (string)($data['name'] ?? 'IPN partner');
                return [
                    'subject' => 'Your IPN account has been activated',
                    'html' => $this->baseEmailHtml('IPN account activated', "
                        <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($name)},</p>
                        <p style=\"font-size:16px;color:#334155;\">Your IPN account has been verified and activated. You now have full access to R2P Connect.</p>
                        {$this->buttonHtml('/ipn', 'Go to IPN Dashboard')}
                    "),
                ];

            case 'ipn_id_rejected':
                $name = (string)($data['name'] ?? 'IPN partner');
                $reason = (string)($data['reason'] ?? 'ID document not valid');
                return [
                    'subject' => 'IPN ID verification update',
                    'html' => $this->baseEmailHtml('ID verification rejected', "
                        <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($name)},</p>
                        <p style=\"font-size:16px;color:#334155;\">Your ID document could not be approved.</p>
                        <div style=\"background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin:18px 0;color:#9a3412;\">{$this->escape($reason)}</div>
                        {$this->buttonHtml('/ipn/activation', 'Upload New ID')}
                    "),
                ];

            case 'documentary_tagged':
                $name = (string)($data['name'] ?? 'Researcher');
                $documentaryTitle = (string)($data['documentaryTitle'] ?? 'a documentary');
                return [
                    'subject' => 'You were tagged in a documentary',
                    'html' => $this->baseEmailHtml('Documentary feature', "
                        <p style=\"font-size:16px;color:#334155;\">Hi {$this->escape($name)},</p>
                        <p style=\"font-size:16px;color:#334155;\">You have been featured in <strong>{$this->escape($documentaryTitle)}</strong>.</p>
                        {$this->buttonHtml('/dashboard/documentaries', 'View Documentary')}
                    "),
                ];

            case 'supervisor_invite':
            case 'external_supervisor_invite':
                $supervisorName = (string)($data['supervisorName'] ?? 'Supervisor');
                $institutionName = (string)($data['institutionName'] ?? 'R2P Connect');
                $inviteLink = (string)($data['inviteLink'] ?? '/supervisor-invite');
                $inviteCode = (string)($data['inviteCode'] ?? '');
                $studentName = (string)($data['studentName'] ?? '');
                $intro = $type === 'external_supervisor_invite' && $studentName !== ''
                    ? "{$this->escape($studentName)} invited you to supervise research on R2P Connect."
                    : "{$this->escape($institutionName)} invited you to join R2P Connect as a supervisor.";
                return [
                    'subject' => 'Supervisor invitation',
                    'html' => $this->baseEmailHtml('Supervisor invitation', "
                        <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($supervisorName)},</p>
                        <p style=\"font-size:16px;color:#334155;\">{$intro}</p>
                        " . ($inviteCode !== '' ? "<p style=\"font-size:16px;color:#334155;\">Invite code: <strong>{$this->escape($inviteCode)}</strong></p>" : '') . "
                        {$this->buttonHtml($inviteLink, 'Accept Invitation')}
                    "),
                ];

            case 'reviewer_invite':
                $reviewerName = (string)($data['reviewerName'] ?? 'Reviewer');
                $institutionName = (string)($data['institutionName'] ?? 'R2P Connect');
                $inviteLink = (string)($data['inviteLink'] ?? '/reviewer-invite');
                $verificationCode = (string)($data['verificationCode'] ?? '');
                return [
                    'subject' => 'Reviewer invitation',
                    'html' => $this->baseEmailHtml('Reviewer invitation', "
                        <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($reviewerName)},</p>
                        <p style=\"font-size:16px;color:#334155;\">{$this->escape($institutionName)} invited you to review research on R2P Connect.</p>
                        " . ($verificationCode !== '' ? "<p style=\"font-size:16px;color:#334155;\">Verification code: <strong>{$this->escape($verificationCode)}</strong></p>" : '') . "
                        {$this->buttonHtml($inviteLink, 'Accept Invitation')}
                    "),
                ];

            case 'supervisor_registered':
                $adminName = (string)($data['adminName'] ?? 'Admin');
                $supervisorName = (string)($data['supervisorName'] ?? 'A supervisor');
                $supervisorEmail = (string)($data['supervisorEmail'] ?? '');
                return [
                    'subject' => 'Supervisor registration completed',
                    'html' => $this->baseEmailHtml('Supervisor registered', "
                        <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($adminName)},</p>
                        <p style=\"font-size:16px;color:#334155;\">{$this->escape($supervisorName)} has completed supervisor registration.</p>
                        " . ($supervisorEmail !== '' ? "<p style=\"font-size:16px;color:#334155;\">Email: {$this->escape($supervisorEmail)}</p>" : '') . "
                        {$this->buttonHtml('/institution/supervisors', 'View Supervisors')}
                    "),
                ];

            case 'reviewer_registered':
                $adminName = (string)($data['adminName'] ?? 'Admin');
                $reviewerName = (string)($data['reviewerName'] ?? 'A reviewer');
                $reviewerEmail = (string)($data['reviewerEmail'] ?? '');
                return [
                    'subject' => 'Reviewer registration completed',
                    'html' => $this->baseEmailHtml('Reviewer registered', "
                        <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($adminName)},</p>
                        <p style=\"font-size:16px;color:#334155;\">{$this->escape($reviewerName)} has completed reviewer registration.</p>
                        " . ($reviewerEmail !== '' ? "<p style=\"font-size:16px;color:#334155;\">Email: {$this->escape($reviewerEmail)}</p>" : '') . "
                        {$this->buttonHtml('/institution/reviewers', 'View Reviewers')}
                    "),
                ];

            case 'new_student_submission':
                $supervisorName = (string)($data['supervisorName'] ?? 'Supervisor');
                $studentName = (string)($data['studentName'] ?? 'A student');
                $paperTitle = (string)($data['title'] ?? 'Research Paper');
                return [
                    'subject' => 'New research submission',
                    'html' => $this->baseEmailHtml('New research submission', "
                        <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($supervisorName)},</p>
                        <p style=\"font-size:16px;color:#334155;\">{$this->escape($studentName)} submitted <strong>{$this->escape($paperTitle)}</strong> for your review.</p>
                        {$this->buttonHtml('/supervisor/pending', 'Review Submission')}
                    "),
                ];

            case 'research_resubmitted':
                $reviewerName = (string)($data['reviewerName'] ?? 'Reviewer');
                $researcherName = (string)($data['researcherName'] ?? 'A researcher');
                $paperTitle = (string)($data['title'] ?? 'Research Paper');
                return [
                    'subject' => 'Research resubmitted for review',
                    'html' => $this->baseEmailHtml('Research resubmitted', "
                        <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($reviewerName)},</p>
                        <p style=\"font-size:16px;color:#334155;\">{$this->escape($researcherName)} has resubmitted <strong>{$this->escape($paperTitle)}</strong> after revisions.</p>
                        {$this->buttonHtml('/reviewer/pending', 'Review Research')}
                    "),
                ];

            case 'research_approved':
            case 'research_rejected':
                $studentName = (string)($data['studentName'] ?? 'Student');
                $supervisorName = (string)($data['supervisorName'] ?? 'Your supervisor');
                $paperTitle = (string)($data['title'] ?? 'Research Paper');
                $comments = (string)($data['comments'] ?? '');
                $approved = $type === 'research_approved';
                return [
                    'subject' => $approved ? 'Research approved' : 'Research update',
                    'html' => $this->baseEmailHtml($approved ? 'Research approved' : 'Research needs attention', "
                        <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($studentName)},</p>
                        <p style=\"font-size:16px;color:#334155;\">{$this->escape($supervisorName)} " . ($approved ? 'approved' : 'did not approve') . " <strong>{$this->escape($paperTitle)}</strong>.</p>
                        " . ($comments !== '' ? "<div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:18px 0;color:#334155;white-space:pre-wrap;\">{$this->escape($comments)}</div>" : '') . "
                        {$this->buttonHtml('/dashboard/research', 'View Research')}
                    "),
                ];

            case 'supervisor_message':
                $studentName = (string)($data['studentName'] ?? 'Student');
                $supervisorName = (string)($data['supervisorName'] ?? 'Your supervisor');
                $preview = (string)($data['messagePreview'] ?? 'You have a new message.');
                return [
                    'subject' => 'New message from your supervisor',
                    'html' => $this->baseEmailHtml('New supervisor message', "
                        <p style=\"font-size:16px;color:#334155;\">Hello {$this->escape($studentName)},</p>
                        <p style=\"font-size:16px;color:#334155;\">{$this->escape($supervisorName)} sent you a message.</p>
                        <div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:18px 0;color:#334155;white-space:pre-wrap;\">{$this->escape($preview)}</div>
                        {$this->buttonHtml('/dashboard', 'Open Dashboard')}
                    "),
                ];

            case 'generic':
            default:
                if ($message === '' && isset($data['html'])) {
                    $html = (string)$data['html'];
                } else {
                    $html = $this->baseEmailHtml($title, "
                        <p style=\"font-size:16px;color:#334155;white-space:pre-wrap;\">{$this->escape($message)}</p>
                        " . (!empty($data['ctaUrl']) ? $this->buttonHtml((string)$data['ctaUrl'], (string)($data['ctaText'] ?? 'View Details')) : '') . "
                    ");
                }
                return ['subject' => $subject, 'html' => $html];
        }
    }

    private function baseEmailHtml(string $heading, string $body): string {
        $year = date('Y');
        $safeHeading = $this->escape($heading);
        return "<!DOCTYPE html>
<html>
<head><meta charset=\"UTF-8\"></head>
<body style=\"font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#ffffff;\">
  <div style=\"background:#0f172a;padding:28px;border-radius:14px;text-align:center;\">
    <h1 style=\"color:#ffffff;margin:0;font-size:24px;\">{$safeHeading}</h1>
  </div>
  <div style=\"padding:28px 0;\">{$body}</div>
  <div style=\"border-top:1px solid #e2e8f0;padding-top:18px;text-align:center;color:#64748b;font-size:13px;\">
    <p style=\"margin:0;\">Copyright {$year} R2P Connect. All rights reserved.</p>
  </div>
</body>
</html>";
    }

    private function buttonHtml(string $pathOrUrl, string $label): string {
        $url = $this->absoluteAppUrl($pathOrUrl);
        return "<p style=\"margin-top:22px;\"><a href=\"{$this->escape($url)}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;\">{$this->escape($label)}</a></p>";
    }

    private function absoluteAppUrl(string $pathOrUrl): string {
        if (preg_match('/^https?:\/\//i', $pathOrUrl)) {
            return $pathOrUrl;
        }
        $base = rtrim((string)env('APP_URL', 'http://localhost:3000'), '/');
        return $base . '/' . ltrim($pathOrUrl, '/');
    }

    private function createNotification(string $userId, string $title, string $message, string $type = 'info', ?string $link = null): void {
        try {
            $this->db->execute(
                'INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
                [generateUUID(), $userId, $title, $message, $type, $link, date('Y-m-d H:i:s')]
            );
        } catch (\Throwable $e) {
            error_log('Notification insert failed: ' . $e->getMessage());
        }
    }

    private function isEmail(string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    private function escape(string $value): string {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
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

    private function aiErrorResponse(string $context, \Throwable $e): void {
        error_log($context . ': ' . $e->getMessage());

        $message = $e->getMessage();
        if (preg_match('/invalid_api_key|incorrect api key|unauthorized|missing API key/i', $message)) {
            $message = 'AI provider API key is missing or invalid. Please check the AI settings.';
        } elseif (preg_match('/insufficient_quota|quota|credit|billing/i', $message)) {
            $message = 'Not Available, Please try again later, our team are working on this issue';
        } elseif (preg_match('/model|not found|does not exist/i', $message)) {
            $message = 'The selected AI model is not available for the configured provider. Please choose another model in admin settings.';
        } elseif (preg_match('/timed out|timeout|could not resolve|connection|HTTP request failed/i', $message)) {
            $message = 'AI provider connection failed. Please try again shortly.';
        } else {
            $message = 'AI service is temporarily unavailable. Please check your provider settings or try again.';
        }

        Response::json(['data' => ['error' => $message], 'error' => null]);
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
