-- Ensure supervisor invite links are active by default and older null rows work.
-- Run this on the deployed MySQL database if invite links show "Inactive".

ALTER TABLE supervisor_student_invites
  MODIFY COLUMN id CHAR(36) NOT NULL,
  MODIFY COLUMN is_active BOOLEAN DEFAULT TRUE,
  MODIFY COLUMN used_count INT DEFAULT 0,
  MODIFY COLUMN max_students INT DEFAULT 10;

UPDATE supervisor_student_invites
SET is_active = TRUE
WHERE is_active IS NULL;

UPDATE supervisor_student_invites
SET used_count = 0
WHERE used_count IS NULL;

UPDATE supervisor_student_invites
SET max_students = 10
WHERE max_students IS NULL OR max_students <= 0;
