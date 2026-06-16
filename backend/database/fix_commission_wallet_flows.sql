-- Fix wallet/commission support tables for paid downloads, subscriptions, and referrals.

CREATE TABLE IF NOT EXISTS referral_codes (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    total_referrals INT DEFAULT 0,
    credits_earned INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_usages (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    referral_code_id CHAR(36) NOT NULL,
    referrer_id CHAR(36) NOT NULL,
    referred_user_id CHAR(36) NOT NULL UNIQUE,
    credits_awarded INT DEFAULT 0,
    referred_credits_awarded INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_referrer (referrer_id),
    INDEX idx_referred (referred_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commission_earnings (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    beneficiary_id CHAR(36) NOT NULL,
    beneficiary_type VARCHAR(50) NOT NULL,
    student_id CHAR(36) NOT NULL,
    subscription_id CHAR(36) NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'NGN',
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (beneficiary_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    INDEX idx_beneficiary (beneficiary_id),
    INDEX idx_student (student_id),
    INDEX idx_subscription (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
