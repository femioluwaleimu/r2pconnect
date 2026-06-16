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

INSERT INTO faq (id, question, answer, category, display_location, is_active, sort_order, created_at, updated_at)
SELECT UUID(), 'Can I save AI-generated responses and come back to them later?',
       'Yes. Topic Refiner, Gap Detector, and AI Research Assistant include a History area where you can save generated AI responses, open them later, restore them back into the tool, or delete them when you no longer need them.',
       'ai_tools', 'full_page', 1, 10, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = 'Can I save AI-generated responses and come back to them later?');

INSERT INTO faq (id, question, answer, category, display_location, is_active, sort_order, created_at, updated_at)
SELECT UUID(), 'How many AI responses can I save on the free plan?',
       'Free plan users can save up to 3 AI responses. Users on an active paid subscription can save unlimited AI responses. If a paid subscription expires, saving is paused until the user subscribes again.',
       'ai_tools', 'full_page', 1, 11, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = 'How many AI responses can I save on the free plan?');

INSERT INTO faq (id, question, answer, category, display_location, is_active, sort_order, created_at, updated_at)
SELECT UUID(), 'What can the Topic Refiner and Gap Detector do for me?',
       'Topic Refiner helps turn rough ideas into researchable topics with scope, objectives, research questions, methods, and practical guidance. Gap Detector helps identify underexplored research opportunities in a field so students can choose stronger, more original work.',
       'ai_tools', 'full_page', 1, 12, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = 'What can the Topic Refiner and Gap Detector do for me?');

INSERT INTO faq (id, question, answer, category, display_location, is_active, sort_order, created_at, updated_at)
SELECT UUID(), 'Do new students get free AI credits?',
       'Yes. New researcher/student accounts on the free plan receive 3 AI credits for the month. Free monthly credits renew for free-plan researchers when their free period resets.',
       'students', 'full_page', 1, 20, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = 'Do new students get free AI credits?');

INSERT INTO faq (id, question, answer, category, display_location, is_active, sort_order, created_at, updated_at)
SELECT UUID(), 'Is there a referral bonus?',
       'Yes. When a new user signs up with another user''s referral link, both users receive a 5 AI credit bonus after the referral is processed.',
       'students', 'full_page', 1, 21, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = 'Is there a referral bonus?');

INSERT INTO faq (id, question, answer, category, display_location, is_active, sort_order, created_at, updated_at)
SELECT UUID(), 'Can research owners earn when people download their papers?',
       'Yes. When a paid download uses credits, the platform can share the download value among the student/research owner, supervisor, institution, and platform according to the configured commission settings.',
       'payments', 'full_page', 1, 30, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = 'Can research owners earn when people download their papers?');

INSERT INTO faq (id, question, answer, category, display_location, is_active, sort_order, created_at, updated_at)
SELECT UUID(), 'What happens when a supervisor registers?',
       'Supervisor accounts are created pending verification. The institution admin and platform admin are notified by email so they can confirm and verify the supervisor before full access is granted.',
       'supervisors', 'full_page', 1, 40, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = 'What happens when a supervisor registers?');

INSERT INTO faq (id, question, answer, category, display_location, is_active, sort_order, created_at, updated_at)
SELECT UUID(), 'Can students join through a supervisor invite link?',
       'Yes. When a student opens a supervisor invite link, the registration page shows the supervisor''s name so the student can confirm they are joining under the right supervisor.',
       'students', 'full_page', 1, 41, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = 'Can students join through a supervisor invite link?');

INSERT INTO faq (id, question, answer, category, display_location, is_active, sort_order, created_at, updated_at)
SELECT UUID(), 'Can I install R2P Connect on my phone?',
       'Yes. R2P Connect supports app installation from the login page on supported mobile browsers. On iPhone, users can use Safari''s Share menu and choose Add to Home Screen.',
       'general', 'full_page', 1, 50, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = 'Can I install R2P Connect on my phone?');

INSERT INTO faq (id, question, answer, category, display_location, is_active, sort_order, created_at, updated_at)
SELECT UUID(), 'Can anyone access an institution dashboard?',
       'No. Institution dashboard access is restricted to the institution account and authorized platform administrators. Admin impersonation is limited to platform admins for support and verification workflows.',
       'institutions', 'full_page', 1, 51, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = 'Can anyone access an institution dashboard?');
