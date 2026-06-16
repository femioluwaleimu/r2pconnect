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
