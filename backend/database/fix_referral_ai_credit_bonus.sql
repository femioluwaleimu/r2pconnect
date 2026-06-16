-- Backfill and enforce the 5 AI-credit referral bonus for existing referral rows.
-- Safe to rerun: once referral_usages rows are marked as awarded, later runs add 0 credits.

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
    pending.user_id,
    'free',
    0,
    'NGN',
    NOW(),
    DATE_ADD(NOW(), INTERVAL 1 MONTH),
    0,
    0,
    0,
    0,
    1,
    NOW(),
    NOW()
FROM (
    SELECT referrer_id AS user_id
    FROM referral_usages
    WHERE COALESCE(credits_awarded, 0) < 5
    UNION
    SELECT referred_user_id AS user_id
    FROM referral_usages
    WHERE COALESCE(referred_credits_awarded, 0) < 5
) pending
LEFT JOIN subscriptions s ON s.user_id = pending.user_id
WHERE s.id IS NULL;

UPDATE subscriptions s
JOIN (
    SELECT referrer_id AS user_id, SUM(GREATEST(0, 5 - COALESCE(credits_awarded, 0))) AS bonus
    FROM referral_usages
    GROUP BY referrer_id
) bonuses ON bonuses.user_id = s.user_id
SET
    s.ai_credits_remaining = COALESCE(s.ai_credits_remaining, 0) + bonuses.bonus,
    s.is_active = 1,
    s.updated_at = NOW()
WHERE bonuses.bonus > 0;

UPDATE subscriptions s
JOIN (
    SELECT referred_user_id AS user_id, SUM(GREATEST(0, 5 - COALESCE(referred_credits_awarded, 0))) AS bonus
    FROM referral_usages
    GROUP BY referred_user_id
) bonuses ON bonuses.user_id = s.user_id
SET
    s.ai_credits_remaining = COALESCE(s.ai_credits_remaining, 0) + bonuses.bonus,
    s.is_active = 1,
    s.updated_at = NOW()
WHERE bonuses.bonus > 0;

UPDATE referral_codes rc
JOIN (
    SELECT referral_code_id, SUM(GREATEST(0, 5 - COALESCE(credits_awarded, 0))) AS bonus
    FROM referral_usages
    GROUP BY referral_code_id
) bonuses ON bonuses.referral_code_id = rc.id
SET
    rc.credits_earned = COALESCE(rc.credits_earned, 0) + bonuses.bonus,
    rc.updated_at = NOW()
WHERE bonuses.bonus > 0;

UPDATE referral_usages
SET
    credits_awarded = GREATEST(COALESCE(credits_awarded, 0), 5),
    referred_credits_awarded = GREATEST(COALESCE(referred_credits_awarded, 0), 5)
WHERE COALESCE(credits_awarded, 0) < 5
   OR COALESCE(referred_credits_awarded, 0) < 5;

COMMIT;
