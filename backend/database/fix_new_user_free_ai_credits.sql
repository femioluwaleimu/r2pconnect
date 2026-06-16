-- Backfill the initial 3 AI credits for free researcher accounts that were created with 0.
-- Safe to rerun: it only repairs free researchers with no recorded AI-credit usage.

START TRANSACTION;

INSERT INTO subscriptions (
    id,
    user_id,
    tier,
    amount,
    currency,
    current_period_start,
    current_period_end,
    ai_credits_remaining,
    ai_matchers_remaining,
    max_challenges_per_month,
    ai_matches_per_challenge,
    is_active,
    created_at,
    updated_at
)
SELECT
    UUID(),
    ur.user_id,
    'free',
    0,
    'NGN',
    NOW(),
    DATE_ADD(NOW(), INTERVAL 1 MONTH),
    3,
    0,
    0,
    0,
    1,
    NOW(),
    NOW()
FROM user_roles ur
LEFT JOIN subscriptions s ON s.user_id = ur.user_id
LEFT JOIN ai_credits ac ON ac.user_id = ur.user_id
WHERE ur.role = 'researcher'
  AND s.id IS NULL
  AND COALESCE(ac.credits_used, 0) = 0;

UPDATE subscriptions s
JOIN user_roles ur ON ur.user_id = s.user_id
LEFT JOIN ai_credits ac ON ac.user_id = s.user_id
SET
    s.current_period_start = COALESCE(s.current_period_start, NOW()),
    s.current_period_end = COALESCE(s.current_period_end, DATE_ADD(NOW(), INTERVAL 1 MONTH)),
    s.ai_credits_remaining = 3,
    s.is_active = 1,
    s.updated_at = NOW()
WHERE ur.role = 'researcher'
  AND s.tier = 'free'
  AND COALESCE(s.ai_credits_remaining, 0) < 3
  AND COALESCE(ac.credits_used, 0) = 0;

COMMIT;
