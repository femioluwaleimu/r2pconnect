-- Queue table for batch email delivery from cron jobs.
CREATE TABLE IF NOT EXISTS email_queue (
    id CHAR(36) PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NULL,
    subject VARCHAR(255) NOT NULL,
    html LONGTEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    dedupe_key VARCHAR(191) NULL,
    status ENUM('queued', 'processing', 'sent', 'failed') NOT NULL DEFAULT 'queued',
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT NULL,
    available_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_email_queue_dedupe (dedupe_key),
    INDEX idx_status_available (status, available_at),
    INDEX idx_recipient_created (recipient_email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
