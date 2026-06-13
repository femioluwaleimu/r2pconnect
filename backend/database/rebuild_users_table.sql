-- Rebuild/upgrade users table for imported auth JSON data.
-- Run this on an existing MySQL database before importing users.
-- It preserves current rows and adds the fields used by Supabase-style exports.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(255) NULL AFTER id,
    ADD COLUMN IF NOT EXISTS email_data JSON NULL AFTER email,
    ADD COLUMN IF NOT EXISTS phone_data JSON NULL AFTER email_data,
    ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP NULL AFTER email_confirmed_at,
    ADD COLUMN IF NOT EXISTS is_sso_user BOOLEAN DEFAULT FALSE AFTER last_sign_in_at,
    ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE AFTER is_sso_user,
    ADD COLUMN IF NOT EXISTS providers JSON NULL AFTER is_anonymous;

ALTER TABLE users
    MODIFY COLUMN email VARCHAR(255) NULL,
    MODIFY COLUMN password_hash VARCHAR(255) NULL;

UPDATE users
SET email = JSON_UNQUOTE(JSON_EXTRACT(email_data, '$.email'))
WHERE (email IS NULL OR email = '')
  AND email_data IS NOT NULL
  AND JSON_VALID(email_data);

UPDATE users
SET email_data = JSON_OBJECT(
        'email', email,
        'email_verified', IF(email_confirmed = 1, true, false),
        'confirmation_sent_at', NULL,
        'confirmed_at', IF(email_confirmed_at IS NULL, NULL, DATE_FORMAT(email_confirmed_at, '%Y-%m-%dT%H:%i:%sZ'))
    )
WHERE email_data IS NULL
  AND email IS NOT NULL;

UPDATE users
SET providers = JSON_ARRAY('email')
WHERE providers IS NULL;
