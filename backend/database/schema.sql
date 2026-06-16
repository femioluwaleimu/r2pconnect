-- R2P Connect MySQL Database Schema
-- Comprehensive schema for research-to-practice platform

SET FOREIGN_KEY_CHECKS = 0;

-- Users table (replacement for Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    display_name VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    email_data JSON NULL,
    phone_data JSON NULL,
    password_hash VARCHAR(255) NULL,
    status ENUM('active', 'suspended') DEFAULT 'active',
    email_confirmed BOOLEAN DEFAULT FALSE,
    email_confirmed_at TIMESTAMP NULL,
    last_sign_in_at TIMESTAMP NULL,
    is_sso_user BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    providers JSON NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY users_email_unique (email),
    INDEX idx_email (email),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    role ENUM('admin', 'researcher', 'supervisor', 'industry', 'reviewer', 'ipn_user') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 

-- Verification Codes (for email verification, password reset)
CREATE TABLE IF NOT EXISTS verification_codes (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type ENUM('email_verification', 'password_reset', 'phone_verification') NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email_code (email, code, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    avatar_url TEXT NULL,
    bio TEXT NULL,
    phone_number VARCHAR(20) NULL,
    cv_url TEXT NULL,
    department VARCHAR(255) NULL,
    level ENUM('100', '200', '300', '400', '500') NULL COMMENT 'Student level',
    matric_number VARCHAR(50) NULL,
    institution_id CHAR(36) NULL,
    fields_of_interest JSON NULL COMMENT 'Array of research fields',
    skills JSON NULL COMMENT 'Array of skills',
    preferred_job_type JSON NULL COMMENT 'Array of job types',
    researcher_type VARCHAR(100) NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    verified_by CHAR(36) NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    availability VARCHAR(100) NULL,
    company_address TEXT NULL,
    account_name VARCHAR(255) NULL,
    account_number VARCHAR(50) NULL,
    bank_name VARCHAR(100) NULL,
    assigned_supervisor_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_institution (institution_id),
    INDEX idx_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Institutions
CREATE TABLE IF NOT EXISTS institutions (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255) NULL,
    logo_url TEXT NULL,
    description TEXT NULL,
    admin_user_id CHAR(36) NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    download_credit_cost INT DEFAULT 0,
    plagiarism_threshold DECIMAL(5,2) NULL,
    ai_content_threshold VARCHAR(50) NULL,
    available_balance DECIMAL(15,2) DEFAULT 0,
    total_commission DECIMAL(15,2) DEFAULT 0,
    onboarding_type VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    institution_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    onboarding_status VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
    INDEX idx_institution (institution_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Institution Verification Codes
CREATE TABLE IF NOT EXISTS institution_verification_codes (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    institution_id CHAR(36) NOT NULL,
    verification_code VARCHAR(50) NOT NULL UNIQUE,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
    INDEX idx_code (verification_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supervisors
CREATE TABLE IF NOT EXISTS supervisors (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    institution_id CHAR(36) NULL,
    department_id CHAR(36) NULL,
    department VARCHAR(255) NULL,
    academic_rank VARCHAR(100) NULL,
    specialization JSON NULL COMMENT 'Array of specializations',
    staff_id VARCHAR(50) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_external BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) NULL,
    current_students INT DEFAULT 0,
    max_students INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    INDEX idx_institution (institution_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- External supervisor invites
CREATE TABLE IF NOT EXISTS external_supervisor_invites (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    student_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NULL,
    institution_name VARCHAR(255) NULL,
    invite_code VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('pending', 'accepted', 'cancelled', 'expired') DEFAULT 'pending',
    accepted_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student AI style reference metadata
CREATE TABLE IF NOT EXISTS student_style_references (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NULL,
    source_description TEXT NULL,
    declaration_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Research Papers
CREATE TABLE IF NOT EXISTS research_papers (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    author_id CHAR(36) NOT NULL,
    supervisor_id CHAR(36) NULL,
    co_supervisor_id CHAR(36) NULL,
    reviewer_id CHAR(36) NULL,
    institution_id CHAR(36) NULL,
    department_id CHAR(36) NULL,
    title VARCHAR(500) NOT NULL,
    description LONGTEXT NULL,
    abstract LONGTEXT NULL,
    methodology LONGTEXT NULL,
    problem_statement LONGTEXT NULL,
    solution_approach LONGTEXT NULL,
    key_findings LONGTEXT NULL,
    keywords JSON NULL COMMENT 'Array of keywords',
    author_names JSON NULL COMMENT 'Array of author names',
    research_field VARCHAR(255) NULL,
    category VARCHAR(255) NULL,
    research_level VARCHAR(100) NULL COMMENT '100, 200, 300, 400, 500',
    research_purpose VARCHAR(255) NULL,
    research_type VARCHAR(100) NULL COMMENT 'student, professional, etc.',
    research_stage VARCHAR(100) NULL,
    supervision_type VARCHAR(100) NULL,
    supervision_mode VARCHAR(100) NULL,
    status ENUM('draft', 'ongoing', 'submitted', 'under_review', 'revision_requested', 'approved', 'published', 'archived', 'rejected', 'removed') DEFAULT 'draft',
    file_url TEXT NULL,
    file_name VARCHAR(255) NULL,
    views_count INT DEFAULT 0,
    downloads_count INT DEFAULT 0,
    citation_count INT DEFAULT 0,
    download_credit_cost INT DEFAULT 0,
    allow_download BOOLEAN DEFAULT TRUE,
    ai_usage_declared BOOLEAN DEFAULT FALSE,
    ai_tools_used VARCHAR(500) NULL,
    ai_style_source VARCHAR(255) NULL,
    ai_summary LONGTEXT NULL,
    ai_content_risk VARCHAR(100) NULL,
    plagiarism_score DECIMAL(5,2) NULL,
    plagiarism_status VARCHAR(50) NULL,
    plagiarism_checked_at TIMESTAMP NULL,
    is_published_journal BOOLEAN DEFAULT FALSE,
    journal_name VARCHAR(255) NULL,
    journal_url TEXT NULL,
    is_patented BOOLEAN DEFAULT FALSE,
    patent_number VARCHAR(100) NULL,
    funding_required DECIMAL(15,2) NULL,
    funding_currency VARCHAR(10) NULL,
    funding_status VARCHAR(50) NULL,
    practical_applications JSON NULL COMMENT 'Array of applications',
    industry_tags JSON NULL COMMENT 'Array of industry tags',
    sdg_category VARCHAR(100) NULL,
    supervisor_comments LONGTEXT NULL,
    feedback LONGTEXT NULL,
    supervisor_approved_at TIMESTAMP NULL,
    supervisor_approval_status VARCHAR(50) NULL,
    supervisor_reviewed_at TIMESTAMP NULL,
    reviewer_comments LONGTEXT NULL,
    resubmission_count INT DEFAULT 0,
    last_resubmitted_at TIMESTAMP NULL,
    year_completed INT NULL,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (co_supervisor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    INDEX idx_author (author_id),
    INDEX idx_supervisor (supervisor_id),
    INDEX idx_status (status),
    INDEX idx_field (research_field),
    INDEX idx_published (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI Credits
CREATE TABLE IF NOT EXISTS ai_credits (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    credits_limit INT DEFAULT 10,
    credits_used INT DEFAULT 0,
    reset_date DATE,
    reset_month VARCHAR(7) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Saved AI Responses
CREATE TABLE IF NOT EXISTS ai_saved_responses (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    tool_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    prompt LONGTEXT NULL,
    response LONGTEXT NOT NULL,
    metadata JSON NULL,
    tier_at_save VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_tool_type (tool_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    tier ENUM('free', 'basic', 'pro', 'enterprise') DEFAULT 'free',
    amount DECIMAL(15,2) NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    current_period_start TIMESTAMP NULL,
    current_period_end TIMESTAMP NULL,
    ai_credits_remaining INT DEFAULT 0,
    ai_matchers_remaining INT DEFAULT 0,
    max_challenges_per_month INT DEFAULT 0,
    ai_matches_per_challenge INT DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    paystack_customer_id VARCHAR(100) NULL,
    paystack_subscription_code VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tier (tier),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    plan_id VARCHAR(100) NOT NULL UNIQUE,
    user_type VARCHAR(50) NOT NULL COMMENT 'researcher, industry, supervisor',
    name VARCHAR(255) NOT NULL,
    period VARCHAR(50) DEFAULT 'monthly',
    amount_ngn DECIMAL(15,2) NOT NULL,
    ai_credits_per_day INT DEFAULT 10,
    ai_matches_per_challenge INT DEFAULT 10,
    max_challenges INT DEFAULT 5,
    max_research_uploads INT DEFAULT 5,
    description TEXT NULL,
    features JSON NULL COMMENT 'Array of features',
    is_active BOOLEAN DEFAULT TRUE,
    is_popular BOOLEAN DEFAULT FALSE,
    sort_order INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_plan_id (plan_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Coupon Codes
CREATE TABLE IF NOT EXISTS coupon_codes (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percentage INT NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP NULL,
    valid_until TIMESTAMP NULL,
    max_uses INT NULL,
    current_uses INT DEFAULT 0,
    max_uses_per_user INT NULL,
    plan_id VARCHAR(100) NULL COMMENT 'Specific plan ID if applicable',
    institution_id CHAR(36) NULL,
    user_type VARCHAR(50) NULL,
    created_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Coupon Usages
CREATE TABLE IF NOT EXISTS coupon_usages (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    coupon_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    subscription_id CHAR(36) NULL,
    original_amount DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) NOT NULL,
    final_amount DECIMAL(15,2) NOT NULL,
    activation_month DATE,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupon_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    INDEX idx_user_coupon (user_id, coupon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Referral Codes
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

-- Referral Usages
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

-- Payment History
CREATE TABLE IF NOT EXISTS payment_history (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    plan_name VARCHAR(255) NOT NULL,
    tier VARCHAR(100) NOT NULL,
    reference VARCHAR(255) NOT NULL UNIQUE,
    status ENUM('pending', 'success', 'failed', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(100) NULL COMMENT 'paystack, coupon, system',
    coupon_code VARCHAR(50) NULL,
    discount_amount DECIMAL(15,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_reference (reference),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student Wallet
CREATE TABLE IF NOT EXISTS student_wallet (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    balance DECIMAL(15,2) DEFAULT 0,
    total_earned DECIMAL(15,2) DEFAULT 0,
    total_withdrawn DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'NGN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supervisor Wallet
CREATE TABLE IF NOT EXISTS supervisor_wallet (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    balance DECIMAL(15,2) DEFAULT 0,
    total_earned DECIMAL(15,2) DEFAULT 0,
    total_withdrawn DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'NGN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Industry Wallet
CREATE TABLE IF NOT EXISTS industry_wallet (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    balance DECIMAL(15,2) DEFAULT 0,
    total_funded DECIMAL(15,2) DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'NGN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IPN Wallet
CREATE TABLE IF NOT EXISTS ipn_wallet (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    balance DECIMAL(15,2) DEFAULT 0,
    total_earned DECIMAL(15,2) DEFAULT 0,
    total_withdrawn DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'NGN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    transaction_type ENUM('payment', 'withdrawal', 'refund', 'earning', 'adjustment', 'credit', 'debit') NULL,
    type ENUM('payment', 'withdrawal', 'refund', 'earning', 'adjustment', 'credit', 'debit') NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    description TEXT,
    reference VARCHAR(255) UNIQUE,
    source VARCHAR(100) NULL,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_reference (reference),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Commission Earnings
CREATE TABLE IF NOT EXISTS commission_earnings (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    beneficiary_id CHAR(36) NOT NULL,
    beneficiary_type VARCHAR(50) NOT NULL COMMENT 'supervisor, referrer, download_supervisor, etc.',
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

-- Job Postings
CREATE TABLE IF NOT EXISTS job_postings (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    industry_id CHAR(36) NOT NULL,
    institution_id CHAR(36) NULL,
    title VARCHAR(500) NOT NULL,
    description LONGTEXT NOT NULL,
    requirements JSON NULL COMMENT 'Array of requirements',
    responsibilities JSON NULL COMMENT 'Array of responsibilities',
    required_level JSON NULL COMMENT 'Array of levels (100-500)',
    job_type ENUM('internship', 'full-time', 'part-time', 'contract', 'freelance') NOT NULL,
    work_mode VARCHAR(100) NULL COMMENT 'remote, on-site, hybrid',
    duration VARCHAR(100) NULL,
    department VARCHAR(255) NULL,
    company_name VARCHAR(255) NULL,
    company_location VARCHAR(255) NULL,
    company_city VARCHAR(100) NULL,
    company_region VARCHAR(100) NULL,
    payment_amount DECIMAL(15,2) NULL,
    payment_currency VARCHAR(10) DEFAULT 'NGN',
    is_paid BOOLEAN DEFAULT FALSE,
    application_fee_ngn DECIMAL(15,2) DEFAULT 0,
    requires_cv BOOLEAN DEFAULT FALSE,
    deadline TIMESTAMP NULL,
    slots_available INT DEFAULT 1,
    slots_filled INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (industry_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
    INDEX idx_industry (industry_id),
    INDEX idx_active (is_active),
    INDEX idx_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    job_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'hired', 'completed') DEFAULT 'pending',
    cover_letter LONGTEXT NULL,
    cv_url TEXT NULL,
    student_name VARCHAR(255) NULL,
    student_level VARCHAR(100) NULL,
    student_institution_id CHAR(36) NULL,
    student_institution_name VARCHAR(255) NULL,
    student_avatar_url TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    rejected_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    hired_at TIMESTAMP NULL,
    employer_feedback TEXT NULL,
    FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_job (job_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Job Feedback Messages
CREATE TABLE IF NOT EXISTS job_feedback_messages (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    application_id CHAR(36) NOT NULL,
    application_type VARCHAR(50) DEFAULT 'direct' COMMENT 'direct or ipn',
    sender_id CHAR(36) NOT NULL,
    sender_role VARCHAR(50) COMMENT 'employer or student',
    message LONGTEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_application (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Industry Job Payments
CREATE TABLE IF NOT EXISTS industry_job_payments (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    job_id CHAR(36) NOT NULL,
    applicant_id CHAR(36) NOT NULL,
    application_id CHAR(36) NULL,
    amount_ngn DECIMAL(15,2) NOT NULL,
    industry_share_ngn DECIMAL(15,2) NOT NULL,
    platform_share_ngn DECIMAL(15,2) NOT NULL,
    paystack_reference VARCHAR(255) NULL,
    status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
    FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE SET NULL,
    INDEX idx_job (job_id),
    INDEX idx_reference (paystack_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    industry_id CHAR(36) NULL,
    creator_id CHAR(36) NULL,
    title VARCHAR(500) NOT NULL,
    description LONGTEXT NOT NULL,
    rules LONGTEXT NULL,
    prize DECIMAL(15,2) NULL,
    status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'active',
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    category VARCHAR(255) NULL,
    reward_amount DECIMAL(15,2) NULL,
    reward_currency VARCHAR(10) DEFAULT 'NGN',
    deadline TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (industry_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_industry (industry_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Challenge Matches
CREATE TABLE IF NOT EXISTS challenge_matches (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    challenge_id CHAR(36) NOT NULL,
    paper_id CHAR(36) NOT NULL,
    researcher_id CHAR(36) NOT NULL,
    relevance_score DECIMAL(5,2) NOT NULL,
    match_reason TEXT NULL,
    is_contacted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (paper_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (researcher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_challenge (challenge_id),
    INDEX idx_researcher (researcher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Challenge Submissions
CREATE TABLE IF NOT EXISTS challenge_submissions (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    challenge_id CHAR(36) NOT NULL,
    researcher_id CHAR(36) NULL,
    user_id CHAR(36) NULL,
    proposal LONGTEXT NULL,
    submission_text LONGTEXT NULL,
    file_url TEXT NULL,
    vote_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (researcher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_challenge (challenge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message LONGTEXT NULL,
    type VARCHAR(50) NULL COMMENT 'info, warning, error, success',
    link VARCHAR(500) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NULL,
    type VARCHAR(50) NULL COMMENT 'string, integer, json, boolean',
    updated_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_key (key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Research Chapter Reviews
CREATE TABLE IF NOT EXISTS research_chapter_reviews (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    chapter_name VARCHAR(255) NOT NULL,
    chapter_number INT NULL,
    rating INT NULL COMMENT '1-5 stars',
    academic_clarity_score INT NULL COMMENT '1-5 stars',
    summary LONGTEXT NULL,
    strengths JSON NULL,
    weak_areas JSON NULL,
    recommendations JSON NULL,
    required_fixes JSON NULL,
    optional_improvements JSON NULL,
    examiner_readiness VARCHAR(50) NULL COMMENT 'not_ready, needs_revision, supervisor_ready',
    why_it_matters JSON NULL,
    examiner_expectations JSON NULL,
    generic_examples JSON NULL,
    methodology_alignment INT NULL,
    style_match_score INT NULL,
    ai_confidence_score INT NULL,
    ai_confidence_explanation LONGTEXT NULL,
    review_mode VARCHAR(50) NULL COMMENT 'quick, advanced, learning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_research (research_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chapter Review Comments
CREATE TABLE IF NOT EXISTS chapter_review_comments (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    review_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    author_role VARCHAR(50) NOT NULL COMMENT 'student, supervisor, admin',
    comment LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES research_chapter_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_research (research_id),
    INDEX idx_review (review_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Documentaries
CREATE TABLE IF NOT EXISTS documentaries (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT NULL,
    uploaded_by CHAR(36) NOT NULL,
    researcher_id CHAR(36) NULL,
    views_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (researcher_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_uploaded (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Documentary Comments
CREATE TABLE IF NOT EXISTS documentary_comments (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    documentary_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    content LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (documentary_id) REFERENCES documentaries(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_documentary (documentary_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Researcher Collaborations
CREATE TABLE IF NOT EXISTS researcher_collaborations (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    requester_id CHAR(36) NOT NULL,
    recipient_id CHAR(36) NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'blocked') DEFAULT 'pending',
    message TEXT NULL,
    match_reason TEXT NULL,
    match_score DECIMAL(5,2) NULL,
    research_overlap JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_recipient (recipient_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collaboration Messages
CREATE TABLE IF NOT EXISTS collaboration_messages (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    collaboration_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    message LONGTEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (collaboration_id) REFERENCES researcher_collaborations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_collaboration (collaboration_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supervisor AI Credits
CREATE TABLE IF NOT EXISTS supervisor_ai_credits (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    supervisor_id CHAR(36) NOT NULL UNIQUE,
    credits_limit INT DEFAULT 10,
    credits_remaining INT DEFAULT 10,
    last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IPN Profiles
CREATE TABLE IF NOT EXISTS ipn_profiles (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    company_name VARCHAR(255),
    bio TEXT NULL,
    location VARCHAR(255) NULL,
    phone VARCHAR(20) NULL,
    website VARCHAR(255) NULL,
    logo_url TEXT NULL,
    what_do_you_do TEXT NULL,
    means_of_identification VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IPN Companies
CREATE TABLE IF NOT EXISTS ipn_companies (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    ipn_user_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    industry VARCHAR(100) NULL,
    location VARCHAR(255) NULL,
    state VARCHAR(100) NULL,
    logo_url TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ipn_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (ipn_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IPN Opportunities
CREATE TABLE IF NOT EXISTS ipn_opportunities (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    ipn_user_id CHAR(36) NOT NULL,
    company_id CHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description LONGTEXT NOT NULL,
    job_type VARCHAR(100),
    work_mode VARCHAR(100) NULL,
    duration VARCHAR(100) NULL,
    location VARCHAR(255) NULL,
    requirements JSON NULL,
    responsibilities JSON NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    application_fee_ngn DECIMAL(15,2) DEFAULT 0,
    requires_cv BOOLEAN DEFAULT FALSE,
    deadline TIMESTAMP NULL,
    slots_available INT DEFAULT 1,
    slots_filled INT DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ipn_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES ipn_companies(id) ON DELETE CASCADE,
    INDEX idx_user (ipn_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IPN Applications
CREATE TABLE IF NOT EXISTS ipn_applications (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    opportunity_id CHAR(36) NOT NULL,
    applicant_id CHAR(36) NOT NULL,
    applicant_name VARCHAR(255) NULL,
    applicant_email VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'pending',
    cover_letter LONGTEXT NULL,
    cv_url TEXT NULL,
    payment_reference VARCHAR(255) NULL,
    profile_snapshot JSON NULL,
    employer_feedback TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES ipn_opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_opportunity (opportunity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IPN Payments
CREATE TABLE IF NOT EXISTS ipn_payments (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    opportunity_id CHAR(36) NOT NULL,
    applicant_id CHAR(36) NOT NULL,
    application_id CHAR(36) NULL,
    amount_ngn DECIMAL(15,2) NOT NULL,
    ipn_share_ngn DECIMAL(15,2) NOT NULL,
    platform_share_ngn DECIMAL(15,2) NOT NULL,
    paystack_reference VARCHAR(255) NULL,
    status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES ipn_opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES ipn_applications(id) ON DELETE SET NULL,
    INDEX idx_reference (paystack_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IPN Activations
CREATE TABLE IF NOT EXISTS ipn_activations (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, pending_review, approved, rejected',
    id_document_url TEXT NULL,
    payment_reference VARCHAR(255) NULL,
    payment_amount DECIMAL(15,2) NULL,
    rejection_reason TEXT NULL,
    activated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IPN Payout Requests
CREATE TABLE IF NOT EXISTS ipn_payout_requests (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student Withdrawals
CREATE TABLE IF NOT EXISTS student_withdrawals (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    student_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    processed_at TIMESTAMP NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Institution Commissions
CREATE TABLE IF NOT EXISTS institution_commissions (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    institution_id CHAR(36) NOT NULL,
    researcher_id CHAR(36) NOT NULL,
    subscription_id CHAR(36) NULL,
    amount DECIMAL(15,2) NOT NULL,
    commission_rate INT DEFAULT 20,
    currency VARCHAR(10) DEFAULT 'NGN',
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
    FOREIGN KEY (researcher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    INDEX idx_institution (institution_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Credit Topup Packages
CREATE TABLE IF NOT EXISTS credit_topup_packages (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    name VARCHAR(255) NOT NULL,
    credits INT NOT NULL,
    amount_ngn DECIMAL(15,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Credit Topup Purchases
CREATE TABLE IF NOT EXISTS credit_topup_purchases (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    package_id CHAR(36) NULL,
    credits INT NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'NGN',
    reference VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES credit_topup_packages(id) ON DELETE SET NULL,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Frequently Asked Questions
CREATE TABLE IF NOT EXISTS faq (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    question VARCHAR(500) NOT NULL,
    answer LONGTEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    display_location VARCHAR(100) DEFAULT 'full_page',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compatibility tables used by the PHP API layer
CREATE TABLE IF NOT EXISTS user_profiles (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    first_name VARCHAR(150) NULL,
    last_name VARCHAR(150) NULL,
    display_name VARCHAR(255) NULL,
    avatar_url TEXT NULL,
    bio TEXT NULL,
    institution VARCHAR(255) NULL,
    research_interests JSON NULL,
    phone VARCHAR(50) NULL,
    location VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallets (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'NGN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    plan_id VARCHAR(100) NULL,
    credits INT DEFAULT 0,
    amount DECIMAL(15,2) DEFAULT 0,
    status ENUM('active', 'cancelled', 'expired', 'pending') DEFAULT 'active',
    expiry_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    email VARCHAR(255) NULL,
    reference VARCHAR(255) NOT NULL UNIQUE,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS research_views (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_research (research_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS research_downloads (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_research (research_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS research_comments (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    content LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_research (research_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    sender_id CHAR(36) NOT NULL,
    recipient_id CHAR(36) NOT NULL,
    content LONGTEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sender_recipient (sender_id, recipient_id),
    INDEX idx_recipient_read (recipient_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collaborations (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    creator_id CHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description LONGTEXT NULL,
    status ENUM('active', 'archived', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator (creator_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collaboration_members (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    collaboration_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role ENUM('creator', 'admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_collaboration_user (collaboration_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collaboration_projects (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    collaboration_id CHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description LONGTEXT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_collaboration (collaboration_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS challenge_votes (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    challenge_id CHAR(36) NULL,
    submission_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (submission_id) REFERENCES challenge_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_challenge (challenge_id),
    UNIQUE KEY uniq_submission_user (submission_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_reviews (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    review_text LONGTEXT NULL,
    score DECIMAL(5,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    INDEX idx_research (research_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plagiarism_checks (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    similarity_score DECIMAL(5,2) NULL,
    matches JSON NULL,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    INDEX idx_research_created (research_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supervisor_feedbacks (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    supervisor_id CHAR(36) NOT NULL,
    feedback_text LONGTEXT NULL,
    rating INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_research (research_id),
    INDEX idx_supervisor (supervisor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supervisor_reviews (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    supervisor_id CHAR(36) NOT NULL,
    author_id CHAR(36) NULL,
    rating INT NULL,
    review_text LONGTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_supervisor (supervisor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supervisor_assignments (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    supervisor_id CHAR(36) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_research (research_id),
    INDEX idx_supervisor (supervisor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_flags (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    research_id CHAR(36) NOT NULL,
    reason LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    INDEX idx_research (research_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id CHAR(36) NOT NULL UNIQUE,
    email_on_research_comment BOOLEAN DEFAULT TRUE,
    email_on_review_received BOOLEAN DEFAULT TRUE,
    email_on_new_message BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
