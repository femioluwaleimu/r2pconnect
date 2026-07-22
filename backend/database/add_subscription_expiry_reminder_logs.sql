-- Tracks subscription expiry reminder emails so the cron can run safely more than once per day.
CREATE TABLE IF NOT EXISTS subscription_expiry_reminder_logs (
    id CHAR(36) PRIMARY KEY,
    subscription_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    reminder_day TINYINT NOT NULL COMMENT '0 = expiration day, 1 = one day before, 2 = two days before',
    expiry_date DATE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_subscription_expiry_reminder (subscription_id, reminder_day, expiry_date),
    INDEX idx_user_sent_at (user_id, sent_at),
    INDEX idx_expiry_date (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
