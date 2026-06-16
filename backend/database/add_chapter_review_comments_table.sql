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

ALTER TABLE chapter_review_comments
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
